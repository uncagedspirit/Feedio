-- ═══════════════════════════════════════════════════════════════════════════
-- feedio — migration 002: subscription columns, cron tables, and functions
-- Run this in Supabase Dashboard → SQL Editor AFTER 001_initial.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — NEW COLUMNS ON profiles
-- ═══════════════════════════════════════════════════════════════════════════

-- Dodo Payments identity columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_customer_id      text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_subscription_id  text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_price_id         text;

-- Subscription lifecycle columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_state       text NOT NULL DEFAULT 'free'
    CHECK (subscription_state IN (
      'free', 'active', 'cancel_scheduled', 'in_grace', 'expired'
    )),
  ADD COLUMN IF NOT EXISTS subscription_ends_at     timestamptz,
  ADD COLUMN IF NOT EXISTS grace_ends_at            timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at           timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at    timestamptz;

-- Drop the old Stripe-specific columns if they exist from migration 001.
-- Comment these out if you have not run 001 yet or want to keep them.
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;

-- Index for cron queries (avoids sequential scans on large tables)
CREATE INDEX IF NOT EXISTS profiles_subscription_state_idx
  ON public.profiles (subscription_state);

CREATE INDEX IF NOT EXISTS profiles_last_active_at_idx
  ON public.profiles (last_active_at)
  WHERE deletion_scheduled_at IS NULL;

CREATE INDEX IF NOT EXISTS profiles_deletion_scheduled_at_idx
  ON public.profiles (deletion_scheduled_at)
  WHERE deletion_scheduled_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — NEW COLUMNS ON boards AND posts (archival support)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS boards_archived_owner_idx
  ON public.boards (owner_id)
  WHERE is_archived = false;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — cron_runs TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id             bigserial    PRIMARY KEY,
  job_name       text         NOT NULL,
  started_at     timestamptz  NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  status         text         NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'success', 'failed')),
  rows_affected  integer,
  error_message  text
);

CREATE INDEX IF NOT EXISTS cron_runs_job_name_idx
  ON public.cron_runs (job_name, started_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4 — audit_log TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          bigserial    PRIMARY KEY,
  user_id     uuid,        -- nullable: some events are not user-scoped
  action      text         NOT NULL,
  payload     jsonb        NOT NULL DEFAULT '{}',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_user_id_idx
  ON public.audit_log (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_log_action_idx
  ON public.audit_log (action, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5 — email_log TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_log (
  id               bigserial    PRIMARY KEY,
  user_id          uuid         NOT NULL,
  email_type       text         NOT NULL,
  idempotency_key  text         NOT NULL,
  status           text         NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count    integer      NOT NULL DEFAULT 0,
  last_error       text,
  sent_at          timestamptz,
  created_at       timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT email_log_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS email_log_status_idx
  ON public.email_log (status, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS email_log_user_id_idx
  ON public.email_log (user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6 — payment_events TABLE
-- (referenced by create-checkout and payment-webhook edge functions)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.payment_events (
  id          bigserial    PRIMARY KEY,
  provider    text         NOT NULL DEFAULT 'dodo',
  event_id    text         NOT NULL,
  event_type  text         NOT NULL,
  user_id     uuid,
  payload     jsonb        NOT NULL DEFAULT '{}',
  processed   boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT payment_events_event_id_unique UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS payment_events_user_id_idx
  ON public.payment_events (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_events_processed_idx
  ON public.payment_events (processed, created_at DESC)
  WHERE processed = false;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7 — RLS POLICIES for new tables
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.cron_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- cron_runs: service-role only (no user-facing reads)
CREATE POLICY "No direct user access to cron_runs"
  ON public.cron_runs FOR ALL
  USING (false);

-- audit_log: service-role only
CREATE POLICY "No direct user access to audit_log"
  ON public.audit_log FOR ALL
  USING (false);

-- email_log: service-role only
CREATE POLICY "No direct user access to email_log"
  ON public.email_log FOR ALL
  USING (false);

-- payment_events: service-role only
CREATE POLICY "No direct user access to payment_events"
  ON public.payment_events FOR ALL
  USING (false);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8 — HELPER DB FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── set_updated_at trigger function ─────────────────────────────────────────
-- Already defined in 001 but included with IF NOT EXISTS guard for safety.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── begin_grace_period ──────────────────────────────────────────────────────
-- Sets subscription_state = 'in_grace' and stamps a 7-day grace window.
-- Idempotent: no-op if already in_grace.
-- Called by: cron job (step 2), enforce-access edge function.
CREATE OR REPLACE FUNCTION public.begin_grace_period(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    subscription_state = 'in_grace',
    grace_ends_at      = now() + INTERVAL '7 days',
    updated_at         = now()
  WHERE id = p_user_id
    AND subscription_state != 'in_grace';
END;
$$;

-- ─── expire_user ─────────────────────────────────────────────────────────────
-- Downgrades a user to the free plan after their grace period ends.
-- Archives all their extra boards/posts rather than deleting them so that
-- a future resubscription can restore everything instantly.
-- Called by: cron job (step 5), enforce-access edge function.
CREATE OR REPLACE FUNCTION public.expire_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Downgrade plan and clear subscription fields
  UPDATE public.profiles
  SET
    plan               = 'free',
    subscription_state = 'expired',
    updated_at         = now()
  WHERE id = p_user_id;

  -- Archive all boards owned by this user (preserves data for resubscription)
  UPDATE public.boards
  SET is_archived = true
  WHERE owner_id  = p_user_id
    AND is_archived = false;

  -- Archive posts that belong to those boards
  UPDATE public.posts
  SET is_archived = true
  WHERE board_id IN (
    SELECT id FROM public.boards WHERE owner_id = p_user_id
  )
    AND is_archived = false;

  -- Audit trail
  INSERT INTO public.audit_log (user_id, action, payload)
  VALUES (
    p_user_id,
    'user_expired',
    jsonb_build_object('user_id', p_user_id, 'expired_at', now())
  );
END;
$$;

-- ─── mark_user_for_deletion ───────────────────────────────────────────────────
-- Stamps deletion_scheduled_at = now() + 7 days on the profile.
-- The hard delete is performed by the cron job 7 days later (step 8).
-- Called by: cron job (step 7).
CREATE OR REPLACE FUNCTION public.mark_user_for_deletion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    deletion_scheduled_at = now() + INTERVAL '7 days',
    updated_at            = now()
  WHERE id = p_user_id
    AND deletion_scheduled_at IS NULL;  -- idempotent: skip if already scheduled

  INSERT INTO public.audit_log (user_id, action, payload)
  VALUES (
    p_user_id,
    'deletion_scheduled',
    jsonb_build_object(
      'user_id',               p_user_id,
      'deletion_scheduled_at', now() + INTERVAL '7 days'
    )
  );
END;
$$;

-- ─── upgrade_user_to_pro ─────────────────────────────────────────────────────
-- Replaces the Stripe version from migration 001 with the Dodo Payments
-- equivalent. Also un-archives all boards/posts so data is instantly restored
-- when a user resubscribes.
-- Called by: payment-webhook edge function, enforce-access edge function.
CREATE OR REPLACE FUNCTION public.upgrade_user_to_pro(
  p_user_id              uuid,
  p_customer_id          text,
  p_subscription_id      text,
  p_price_id             text,
  p_current_period_end   text   -- ISO 8601 string from Dodo
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    plan                     = 'pro',
    subscription_state       = 'active',
    payment_customer_id      = COALESCE(p_customer_id,     payment_customer_id),
    payment_subscription_id  = p_subscription_id,
    payment_price_id         = COALESCE(p_price_id,        payment_price_id),
    subscription_ends_at     = CASE
                                 WHEN p_current_period_end IS NOT NULL
                                 THEN p_current_period_end::timestamptz
                                 ELSE subscription_ends_at
                               END,
    grace_ends_at            = NULL,
    deletion_scheduled_at    = NULL,
    updated_at               = now()
  WHERE id = p_user_id;

  -- Restore archived boards and posts (resubscription recovery)
  UPDATE public.boards
  SET is_archived = false
  WHERE owner_id  = p_user_id
    AND is_archived = true;

  UPDATE public.posts
  SET is_archived = false
  WHERE board_id IN (
    SELECT id FROM public.boards WHERE owner_id = p_user_id
  )
    AND is_archived = true;

  INSERT INTO public.audit_log (user_id, action, payload)
  VALUES (
    p_user_id,
    'upgraded_to_pro',
    jsonb_build_object(
      'user_id',         p_user_id,
      'subscription_id', p_subscription_id,
      'upgraded_at',     now()
    )
  );
END;
$$;

-- ─── schedule_cancellation ───────────────────────────────────────────────────
-- Called by payment-webhook when subscription.cancelled arrives from Dodo.
-- User retains Pro access until subscription_ends_at; cron picks up from there.
CREATE OR REPLACE FUNCTION public.schedule_cancellation(
  p_subscription_id      text,
  p_current_period_end   text   -- ISO 8601 string from Dodo, nullable
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    subscription_state = 'cancel_scheduled',
    subscription_ends_at = CASE
                             WHEN p_current_period_end IS NOT NULL
                             THEN p_current_period_end::timestamptz
                             ELSE subscription_ends_at
                           END,
    updated_at = now()
  WHERE payment_subscription_id = p_subscription_id
    AND subscription_state IN ('active');   -- only downgrade from active

  INSERT INTO public.audit_log (user_id, action, payload)
  SELECT
    id,
    'cancellation_scheduled',
    jsonb_build_object(
      'subscription_id',    p_subscription_id,
      'subscription_ends_at', p_current_period_end
    )
  FROM public.profiles
  WHERE payment_subscription_id = p_subscription_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9 — run_daily_subscription_jobs (cron master function)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.run_daily_subscription_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id          bigint;
  v_total_affected  integer := 0;
  v_step_count      integer;
  v_boards_count    integer;
  v_profile         record;
BEGIN

  -- ───────────────────────────────────────────────────────────────────────
  -- STEP 1 — Record cron run start
  -- ───────────────────────────────────────────────────────────────────────
  INSERT INTO public.cron_runs (job_name, started_at, status)
  VALUES ('daily_subscription_check', now(), 'running')
  RETURNING id INTO v_run_id;

  BEGIN  -- inner block for exception handling

    -- ─────────────────────────────────────────────────────────────────────
    -- STEP 2 — Safety-net: begin grace period for cancel_scheduled users
    --          whose subscription_ends_at has already passed.
    --
    --          Primary trigger is the Dodo subscription.expired webhook.
    --          This step catches any users the webhook missed.
    -- ─────────────────────────────────────────────────────────────────────
    v_step_count := 0;

    FOR v_profile IN
      SELECT id
      FROM   public.profiles
      WHERE  subscription_state  = 'cancel_scheduled'
        AND  subscription_ends_at < now()
    LOOP
      PERFORM public.begin_grace_period(v_profile.id);

      INSERT INTO public.audit_log (user_id, action, payload)
      VALUES (
        v_profile.id,
        'grace_period_started_by_cron',
        jsonb_build_object(
          'user_id',     v_profile.id,
          'reason',      'cancel_scheduled past subscription_ends_at',
          'cron_run_id', v_run_id
        )
      );

      v_step_count     := v_step_count     + 1;
      v_total_affected := v_total_affected + 1;
    END LOOP;

    RAISE LOG '[cron:step2] grace period started for % user(s)', v_step_count;

    -- ─────────────────────────────────────────────────────────────────────
    -- STEP 3 — Queue grace_day5 email (grace ends in exactly 2 days)
    -- ─────────────────────────────────────────────────────────────────────
    v_step_count := 0;

    FOR v_profile IN
      SELECT id
      FROM   public.profiles
      WHERE  subscription_state = 'in_grace'
        AND  grace_ends_at::date = (now() + INTERVAL '2 days')::date
    LOOP
      INSERT INTO public.email_log (user_id, email_type, idempotency_key, status)
      VALUES (
        v_profile.id,
        'grace_day5',
        v_profile.id || ':grace_day5:' || to_char(now(), 'YYYY-MM-DD'),
        'pending'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      v_step_count     := v_step_count     + 1;
      v_total_affected := v_total_affected + 1;
    END LOOP;

    RAISE LOG '[cron:step3] grace_day5 emails queued for % user(s)', v_step_count;

    -- ─────────────────────────────────────────────────────────────────────
    -- STEP 4 — Queue grace_day7 email (grace ends today)
    -- ─────────────────────────────────────────────────────────────────────
    v_step_count := 0;

    FOR v_profile IN
      SELECT id
      FROM   public.profiles
      WHERE  subscription_state = 'in_grace'
        AND  grace_ends_at::date = now()::date
    LOOP
      INSERT INTO public.email_log (user_id, email_type, idempotency_key, status)
      VALUES (
        v_profile.id,
        'grace_day7',
        v_profile.id || ':grace_day7:' || to_char(now(), 'YYYY-MM-DD'),
        'pending'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      v_step_count     := v_step_count     + 1;
      v_total_affected := v_total_affected + 1;
    END LOOP;

    RAISE LOG '[cron:step4] grace_day7 emails queued for % user(s)', v_step_count;

    -- ─────────────────────────────────────────────────────────────────────
    -- STEP 5 — Expire users whose grace period has ended
    -- ─────────────────────────────────────────────────────────────────────
    v_step_count := 0;

    FOR v_profile IN
      SELECT id
      FROM   public.profiles
      WHERE  subscription_state = 'in_grace'
        AND  grace_ends_at < now()
    LOOP
      PERFORM public.expire_user(v_profile.id);

      INSERT INTO public.email_log (user_id, email_type, idempotency_key, status)
      VALUES (
        v_profile.id,
        'downgraded',
        v_profile.id || ':downgraded:' || to_char(now(), 'YYYY-MM-DD'),
        'pending'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      v_step_count     := v_step_count     + 1;
      v_total_affected := v_total_affected + 1;
    END LOOP;

    RAISE LOG '[cron:step5] % user(s) expired (grace period ended)', v_step_count;

    -- ─────────────────────────────────────────────────────────────────────
    -- STEP 6 — Warn inactive free users (60 days no login)
    -- ─────────────────────────────────────────────────────────────────────
    v_step_count := 0;

    FOR v_profile IN
      SELECT id
      FROM   public.profiles
      WHERE  plan                  = 'free'
        AND  subscription_state    = 'free'
        AND  last_active_at        < now() - INTERVAL '60 days'
        AND  deletion_scheduled_at IS NULL
    LOOP
      INSERT INTO public.email_log (user_id, email_type, idempotency_key, status)
      VALUES (
        v_profile.id,
        'inactive_warning',
        v_profile.id || ':inactive_warning:' || to_char(now(), 'YYYY-MM-DD'),
        'pending'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      v_step_count     := v_step_count     + 1;
      v_total_affected := v_total_affected + 1;
    END LOOP;

    RAISE LOG '[cron:step6] inactive_warning emails queued for % user(s)', v_step_count;

    -- ─────────────────────────────────────────────────────────────────────
    -- STEP 7 — Schedule deletion (90 days no login)
    -- ─────────────────────────────────────────────────────────────────────
    v_step_count := 0;

    FOR v_profile IN
      SELECT id
      FROM   public.profiles
      WHERE  plan                  = 'free'
        AND  last_active_at        < now() - INTERVAL '90 days'
        AND  deletion_scheduled_at IS NULL
    LOOP
      PERFORM public.mark_user_for_deletion(v_profile.id);

      INSERT INTO public.email_log (user_id, email_type, idempotency_key, status)
      VALUES (
        v_profile.id,
        'deletion_warning',
        v_profile.id || ':deletion_warning:' || to_char(now(), 'YYYY-MM-DD'),
        'pending'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      v_step_count     := v_step_count     + 1;
      v_total_affected := v_total_affected + 1;
    END LOOP;

    RAISE LOG '[cron:step7] % user(s) scheduled for deletion', v_step_count;

    -- ─────────────────────────────────────────────────────────────────────
    -- STEP 8 — Hard-delete accounts past their deletion date
    --
    --          GDPR NOTE: A GDPR data export should be generated and sent
    --          to the user BEFORE this step executes. See the gdpr-export
    --          edge function (Prompt 10) which should be invoked in the
    --          days leading up to deletion_scheduled_at, not inline here.
    --
    --          Deleting from auth.users cascades to profiles, boards,
    --          posts, upvotes, email_log, and all other FK-linked rows.
    -- ─────────────────────────────────────────────────────────────────────
    v_step_count := 0;

    FOR v_profile IN
      SELECT id
      FROM   public.profiles
      WHERE  deletion_scheduled_at < now()
    LOOP
      SELECT COUNT(*)
      INTO   v_boards_count
      FROM   public.boards
      WHERE  owner_id = v_profile.id;

      -- Write audit record before deletion so it survives cascade
      INSERT INTO public.audit_log (user_id, action, payload)
      VALUES (
        v_profile.id,
        'account_deleted',
        jsonb_build_object(
          'user_id',      v_profile.id,
          'reason',       'inactivity',
          'boards_count', v_boards_count,
          'cron_run_id',  v_run_id,
          'deleted_at',   now()
        )
      );

      DELETE FROM auth.users WHERE id = v_profile.id;

      v_step_count     := v_step_count     + 1;
      v_total_affected := v_total_affected + 1;
    END LOOP;

    RAISE LOG '[cron:step8] % account(s) hard-deleted', v_step_count;

    -- ─────────────────────────────────────────────────────────────────────
    -- STEP 9 — Mark run as successful
    -- ─────────────────────────────────────────────────────────────────────
    UPDATE public.cron_runs
    SET
      status        = 'success',
      finished_at   = now(),
      rows_affected = v_total_affected
    WHERE id = v_run_id;

    RAISE LOG '[cron] daily_subscription_check done — % total row(s) affected', v_total_affected;

  EXCEPTION WHEN OTHERS THEN

    UPDATE public.cron_runs
    SET
      status        = 'failed',
      finished_at   = now(),
      error_message = SQLERRM,
      rows_affected = v_total_affected
    WHERE id = v_run_id;

    RAISE LOG '[cron] daily_subscription_check FAILED: %', SQLERRM;
    RAISE;  -- re-raise so pg_cron logs the failure

  END;

END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10 — dispatch_pending_emails (called by the email-dispatch cron)
-- ═══════════════════════════════════════════════════════════════════════════
-- This function is the SQL side of email dispatch.
-- It does NOT call the edge function directly — it simply marks rows as
-- 'processing' and returns them so the pg_cron command (or edge function
-- poller) can call send-email for each one.
--
-- The actual dispatch cron is defined below and calls the
-- dispatch-pending-emails edge function instead, keeping SQL and HTTP
-- concerns cleanly separated.

CREATE OR REPLACE FUNCTION public.claim_pending_emails(p_batch_size integer DEFAULT 50)
RETURNS TABLE (
  id               bigint,
  user_id          uuid,
  email_type       text,
  idempotency_key  text,
  attempt_count    integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atomically claim a batch of pending emails using FOR UPDATE SKIP LOCKED
  -- so concurrent invocations never double-process the same row.
  RETURN QUERY
  UPDATE public.email_log el
  SET    status = 'processing'
  FROM (
    SELECT el2.id
    FROM   public.email_log el2
    WHERE  el2.status        = 'pending'
      AND  el2.attempt_count < 3
    ORDER  BY el2.created_at ASC
    LIMIT  p_batch_size
    FOR UPDATE SKIP LOCKED
  ) claimed
  WHERE  el.id = claimed.id
  RETURNING
    el.id,
    el.user_id,
    el.email_type,
    el.idempotency_key,
    el.attempt_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 11 — pg_cron schedules
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove existing schedules before re-creating (idempotent re-run safety)
SELECT cron.unschedule('daily-subscription-check')
WHERE  EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-subscription-check'
);

SELECT cron.unschedule('dispatch-pending-emails')
WHERE  EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'dispatch-pending-emails'
);

-- ── Job 1: Daily subscription lifecycle check ────────────────────────────────
-- Runs at 01:00 UTC every day.
SELECT cron.schedule(
  'daily-subscription-check',
  '0 1 * * *',
  'SELECT run_daily_subscription_jobs()'
);

-- ── Job 2: Email dispatch poller ─────────────────────────────────────────────
-- Runs every 5 minutes and invokes the dispatch-pending-emails edge function
-- via pg_net (Supabase's HTTP extension) to flush the email_log queue.
--
-- Prerequisites:
--   CREATE EXTENSION IF NOT EXISTS pg_net;
--   Set DISPATCH_EMAIL_SECRET in Supabase Edge Function secrets.
--   Replace <your-project-ref> with your actual Supabase project reference.
--
-- NOTE: pg_net.http_post is fire-and-forget from the SQL side. The edge
-- function is responsible for claiming rows, calling Sender.net, and
-- updating email_log.status to 'sent' or 'failed'.

SELECT cron.schedule(
  'dispatch-pending-emails',
  '*/5 * * * *',
  $$
    SELECT pg_net.http_post(
      url     := 'https://<your-project-ref>.supabase.co/functions/v1/dispatch-pending-emails',
      headers := jsonb_build_object(
        'Content-Type',      'application/json',
        'x-internal-secret', current_setting('app.dispatch_email_secret', true)
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- ─── To verify schedules are registered: ─────────────────────────────────────
-- SELECT jobid, jobname, schedule, command FROM cron.job;

-- ─── To view recent run history: ─────────────────────────────────────────────
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- SELECT * FROM public.cron_runs      ORDER BY started_at  DESC LIMIT 20;