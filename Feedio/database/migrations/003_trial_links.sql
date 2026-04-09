-- ═══════════════════════════════════════════════════════════════════════════
-- feedio — migration 003: magic trial links
-- Run AFTER 002_subscription_fields.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── trial_links TABLE ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trial_links (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  token        text         NOT NULL UNIQUE,   -- the secret slug in the URL
  label        text         NOT NULL DEFAULT '', -- e.g. "ProductHunt launch"
  created_by   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  max_uses     integer      NOT NULL DEFAULT 100,
  use_count    integer      NOT NULL DEFAULT 0,
  trial_days   integer      NOT NULL DEFAULT 30,
  expires_at   timestamptz  NOT NULL DEFAULT now() + INTERVAL '90 days',
  is_active    boolean      NOT NULL DEFAULT true,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trial_links_token_idx
  ON public.trial_links (token)
  WHERE is_active = true;

-- ─── trial_redemptions TABLE — audit who redeemed what ───────────────────────

CREATE TABLE IF NOT EXISTS public.trial_redemptions (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_link_id   uuid         NOT NULL REFERENCES public.trial_links(id) ON DELETE CASCADE,
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at     timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (trial_link_id, user_id)  -- one redemption per user per link
);

CREATE INDEX IF NOT EXISTS trial_redemptions_user_idx
  ON public.trial_redemptions (user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.trial_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_redemptions ENABLE ROW LEVEL SECURITY;

-- Both tables are service-role only — edge functions use the service role key.
-- Users never read/write these directly.
CREATE POLICY "No direct user access to trial_links"
  ON public.trial_links FOR ALL USING (false);

CREATE POLICY "No direct user access to trial_redemptions"
  ON public.trial_redemptions FOR ALL USING (false);

-- ─── activate_trial() DB FUNCTION ────────────────────────────────────────────
-- Sets the user to an active trial without a payment_subscription_id.
-- The existing cron job handles expiry naturally via subscription_ends_at.

CREATE OR REPLACE FUNCTION public.activate_trial(
  p_user_id    uuid,
  p_trial_days integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    plan                    = 'pro',
    subscription_state      = 'active',
    -- No payment_subscription_id — cron will check subscription_ends_at
    subscription_ends_at    = now() + (p_trial_days || ' days')::interval,
    grace_ends_at           = NULL,
    deletion_scheduled_at   = NULL,
    updated_at              = now()
  WHERE id = p_user_id;

  -- Restore any archived boards from a previous expiry
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
    'trial_activated',
    jsonb_build_object(
      'user_id',    p_user_id,
      'trial_days', p_trial_days,
      'ends_at',    now() + (p_trial_days || ' days')::interval
    )
  );
END;
$$;

-- ─── generate_trial_token() helper ───────────────────────────────────────────
-- Creates a cryptographically random URL-safe token.
-- Call this from the SQL editor or a script to mint new links:
--   SELECT public.generate_trial_token('ProductHunt launch', 500, 30);

CREATE OR REPLACE FUNCTION public.generate_trial_token(
  p_label      text    DEFAULT '',
  p_max_uses   integer DEFAULT 100,
  p_trial_days integer DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  -- 32 random bytes → 64 hex chars; trim to 24 for a clean URL slug
  v_token := left(encode(gen_random_bytes(32), 'hex'), 24);

  INSERT INTO public.trial_links (token, label, max_uses, trial_days)
  VALUES (v_token, p_label, p_max_uses, p_trial_days);

  RETURN v_token;
END;
$$;


-- -- Run this in the Supabase SQL Editor whenever you need a new batch:

-- -- A batch for a ProductHunt launch (up to 500 redemptions, 30-day trial)
-- SELECT public.generate_trial_token('ProductHunt April 2026', 500, 30);

-- -- A single-use personal invite
-- SELECT public.generate_trial_token('Personal invite - Jane', 1, 30);

-- -- See all active links
-- SELECT token, label, use_count, max_uses, expires_at
-- FROM public.trial_links
-- WHERE is_active = true
-- ORDER BY created_at DESC;

-- -- Deactivate a link (e.g. after a campaign ends)
-- UPDATE public.trial_links SET is_active = false WHERE token = 'abc123...';