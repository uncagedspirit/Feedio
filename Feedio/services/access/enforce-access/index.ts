/**
 * Supabase Edge Function: enforce-access
 *
 * Safety-net reconciliation layer. Called after login and after a checkout
 * success redirect. Cross-checks the user's subscription state in our DB
 * against the Dodo Payments API and fixes any mismatch caused by missed
 * webhooks or failed cron jobs.
 *
 * Deploy:
 *   supabase functions deploy enforce-access
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   DODO_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * TODO: Add 1-hour cache using Supabase KV or a cache_checked_at column on
 *       profiles to avoid calling Dodo on every login when state hasn't
 *       changed. Until then, every login that has a subscription_id will
 *       make one outbound API call to Dodo.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TODO: Verify the exact subscriptions endpoint from Dodo Payments documentation.
// Check https://docs.dodopayments.com for the correct path and response shape.
const DODO_API_BASE = 'https://api.dodopayments.com'

// Dodo subscription status values — verify against their API docs.
const DODO_STATUS_ACTIVE    = 'active'
const DODO_STATUS_CANCELLED = 'cancelled'

// Our internal subscription_state values
const STATE_FREE        = 'free'
const STATE_ACTIVE      = 'active'
const STATE_CANCEL_SCHED = 'cancel_scheduled'
const STATE_IN_GRACE    = 'in_grace'
const STATE_EXPIRED     = 'expired'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  subscription_state:       string | null
  payment_subscription_id:  string | null
  payment_customer_id:      string | null
  subscription_ends_at:     string | null   // ISO timestamp
  grace_ends_at:            string | null   // ISO timestamp
}

interface DodoSubscription {
  id:                  string
  status:              string              // e.g. 'active' | 'cancelled' | ...
  current_period_end?: string              // ISO timestamp
  customer_id?:        string
  price_id?:           string
  [key: string]: unknown
}

interface DodoErrorResponse {
  error?:   string
  message?: string
  [key: string]: unknown
}

type DodoCheckResult =
  | { ok: true;  subscription: DodoSubscription }
  | { ok: false; notFound: true }
  | { ok: false; notFound: false; unreachable: true }
  | { ok: false; notFound: false; unreachable: false; errorDetail: string }

interface EnforceResult {
  subscription_state: string
  dodo_unreachable?:  true
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── 1. CORS preflight ──────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // ── Read environment secrets ───────────────────────────────────────────────
  const supabaseUrl            = Deno.env.get('SUPABASE_URL')              ?? ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const dodoSecretKey          = Deno.env.get('DODO_SECRET_KEY')           ?? ''

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[enforce-access] FATAL: missing Supabase env secrets')
    return json({ error: 'Server misconfiguration: missing Supabase secrets' }, 500)
  }

  if (!dodoSecretKey) {
    console.error('[enforce-access] FATAL: missing DODO_SECRET_KEY env secret')
    return json({ error: 'Server misconfiguration: missing Dodo Payments secret' }, 500)
  }

  // ── 2. Authenticate the requesting user ────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json(
      { error: 'Unauthorized: missing or malformed Authorization header' },
      401,
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })

  let userId: string

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      console.warn('[enforce-access] auth.getUser failed:', error?.message)
      return json({ error: 'Unauthorized: invalid or expired token' }, 401)
    }

    userId = data.user.id
  } catch (err) {
    console.error('[enforce-access] unexpected error during auth:', err)
    return json({ error: 'Unauthorized: could not verify token' }, 401)
  }

  // ── 3. Read user's profile from DB ────────────────────────────────────────
  let profile: ProfileRow

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'subscription_state, payment_subscription_id, payment_customer_id, subscription_ends_at, grace_ends_at',
      )
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('[enforce-access] profile lookup failed for user', userId, ':', error?.message)
      return json({ error: 'Could not retrieve user profile' }, 500)
    }

    profile = data as ProfileRow
  } catch (err) {
    console.error('[enforce-access] unexpected error fetching profile for user', userId, ':', err)
    return json({ error: 'Could not retrieve user profile' }, 500)
  }

  // ── 4. Update last_active_at immediately (fire-and-forget) ────────────────
  // We deliberately do not await this — it must never block the response.
  supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) {
        console.warn(
          '[enforce-access] failed to update last_active_at for user',
          userId,
          ':',
          error.message,
        )
      }
    })

  const currentState = profile.subscription_state ?? STATE_FREE

  // ── 5. Determine if a Dodo check is needed ─────────────────────────────────
  // Pure free users (no subscription history) skip the external API call
  // entirely — there's nothing to reconcile.
  if (currentState === STATE_FREE && !profile.payment_subscription_id) {
    console.log(`[enforce-access] user ${userId} is a pure free user — skipping Dodo check`)
    return json({ subscription_state: STATE_FREE })
  }

  // ── 6. Call Dodo Payments API to get the subscription status ──────────────
  const dodoResult = await fetchDodoSubscription(
    profile.payment_subscription_id!,
    dodoSecretKey,
    userId,
  )

  // Provider unreachable — safe fallback: return current DB state, never downgrade.
  if (!dodoResult.ok && 'unreachable' in dodoResult && dodoResult.unreachable) {
    console.warn(
      `[enforce-access] Dodo unreachable for user ${userId} — returning current DB state (${currentState}) as-is`,
    )
    return json({ subscription_state: currentState, dodo_unreachable: true } as EnforceResult)
  }

  // Subscription not found in Dodo — treat as expired.
  if (!dodoResult.ok && 'notFound' in dodoResult && dodoResult.notFound) {
    console.warn(
      `[enforce-access] subscription ${profile.payment_subscription_id} not found in Dodo for user ${userId} — expiring`,
    )
    await callExpireUser(supabase, userId)
    return json({ subscription_state: STATE_EXPIRED } as EnforceResult)
  }

  // Unrecoverable API error (non-5xx, non-404) — safe fallback.
  if (!dodoResult.ok) {
    const detail = 'errorDetail' in dodoResult ? dodoResult.errorDetail : 'unknown error'
    console.error(
      `[enforce-access] unrecoverable Dodo API error for user ${userId}: ${detail} — returning current DB state`,
    )
    return json({ subscription_state: currentState } as EnforceResult)
  }

  // ── 7. Reconcile Dodo state against DB state ───────────────────────────────
  const dodoSub         = dodoResult.subscription
  const dodoStatus      = dodoSub.status
  const now             = new Date()

  console.log(
    `[enforce-access] reconciling user ${userId}: DB state=${currentState}, Dodo status=${dodoStatus}`,
  )

  let resolvedState = currentState

  // ── Case A: Dodo says active but DB is behind (resubscription webhook missed)
  if (
    dodoStatus === DODO_STATUS_ACTIVE &&
    (currentState === STATE_IN_GRACE || currentState === STATE_EXPIRED)
  ) {
    console.log(
      `[enforce-access] resubscription detected for user ${userId} — upgrading to pro`,
    )
    await callUpgradeUserToPro(supabase, userId, dodoSub)
    resolvedState = STATE_ACTIVE
  }

  // ── Case B: Dodo says cancelled, current period has passed, DB still 'active'
  else if (
    dodoStatus === DODO_STATUS_CANCELLED &&
    currentState === STATE_ACTIVE &&
    isPast(dodoSub.current_period_end ?? profile.subscription_ends_at)
  ) {
    console.log(
      `[enforce-access] cancelled subscription past period end for user ${userId} — beginning grace period`,
    )
    await callBeginGracePeriod(supabase, userId)
    resolvedState = STATE_IN_GRACE
  }

  // ── Case C: Dodo says cancelled, grace period has passed, DB still 'in_grace'
  else if (
    dodoStatus === DODO_STATUS_CANCELLED &&
    currentState === STATE_IN_GRACE &&
    isPast(profile.grace_ends_at)
  ) {
    console.log(
      `[enforce-access] grace period expired for user ${userId} — expiring account`,
    )
    await callExpireUser(supabase, userId)
    resolvedState = STATE_EXPIRED
  }

  // ── Case D: States are consistent — nothing to do
  else {
    console.log(
      `[enforce-access] no reconciliation needed for user ${userId} (DB=${currentState}, Dodo=${dodoStatus})`,
    )
  }

  // ── 8. Return the resolved subscription state ──────────────────────────────
  return json({ subscription_state: resolvedState } as EnforceResult)
})

// ─── DODO API HELPER ──────────────────────────────────────────────────────────

/**
 * Fetches a subscription record from the Dodo Payments API.
 *
 * Returns a discriminated union:
 *   { ok: true,  subscription }          — success
 *   { ok: false, notFound: true }         — 404: subscription does not exist
 *   { ok: false, unreachable: true }      — network error or 5xx: provider down
 *   { ok: false, errorDetail: string }    — other non-retriable error
 */
async function fetchDodoSubscription(
  subscriptionId: string,
  dodoSecretKey:  string,
  userId:         string,
): Promise<DodoCheckResult> {
  const url = `${DODO_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`

  try {
    const response = await fetch(url, {
      method:  'GET',
      headers: {
        'Authorization': `Bearer ${dodoSecretKey}`,
        'Content-Type':  'application/json',
      },
    })

    // 404 — subscription not found in Dodo
    if (response.status === 404) {
      console.warn(
        `[enforce-access] Dodo returned 404 for subscription ${subscriptionId} (user ${userId})`,
      )
      return { ok: false, notFound: true }
    }

    // 5xx — provider is down; safe fallback
    if (response.status >= 500) {
      console.error(
        `[enforce-access] Dodo returned ${response.status} for subscription ${subscriptionId} (user ${userId}) — treating as unreachable`,
      )
      return { ok: false, notFound: false, unreachable: true }
    }

    // Other non-OK responses
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`
      try {
        const body = await response.json() as DodoErrorResponse
        errorDetail = body?.message ?? body?.error ?? errorDetail
      } catch {
        // Response body was not JSON — use status code only
      }
      console.error(
        `[enforce-access] Dodo non-OK response (${response.status}) for subscription ${subscriptionId} (user ${userId}): ${errorDetail}`,
      )
      return { ok: false, notFound: false, unreachable: false, errorDetail }
    }

    // Success path
    const subscription = await response.json() as DodoSubscription
    return { ok: true, subscription }

  } catch (err) {
    // Network-level error (DNS failure, timeout, connection refused, etc.)
    // Treat as provider unreachable — safe fallback.
    console.error(
      `[enforce-access] network error calling Dodo for subscription ${subscriptionId} (user ${userId}):`,
      err,
    )
    return { ok: false, notFound: false, unreachable: true }
  }
}

// ─── DATABASE RPC HELPERS ─────────────────────────────────────────────────────

/**
 * Calls the upgrade_user_to_pro DB function.
 * Passes data reconciled from the Dodo subscription object.
 * Mirrors the call pattern in the payment-webhook edge function.
 */
async function callUpgradeUserToPro(
  supabase: SupabaseClient,
  userId:   string,
  dodoSub:  DodoSubscription,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('upgrade_user_to_pro', {
      p_user_id:             userId,
      p_customer_id:         dodoSub.customer_id        ?? null,
      p_subscription_id:     dodoSub.id,
      p_price_id:            dodoSub.price_id            ?? null,
      p_current_period_end:  dodoSub.current_period_end ?? null,
    })

    if (error) {
      console.error(
        `[enforce-access] upgrade_user_to_pro RPC failed for user ${userId}:`,
        error.message,
      )
    } else {
      console.log(`[enforce-access] upgrade_user_to_pro succeeded for user ${userId}`)
    }
  } catch (err) {
    console.error(
      `[enforce-access] unexpected error calling upgrade_user_to_pro for user ${userId}:`,
      err,
    )
  }
}

/**
 * Calls the begin_grace_period DB function.
 */
async function callBeginGracePeriod(
  supabase: SupabaseClient,
  userId:   string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('begin_grace_period', {
      p_user_id: userId,
    })

    if (error) {
      console.error(
        `[enforce-access] begin_grace_period RPC failed for user ${userId}:`,
        error.message,
      )
    } else {
      console.log(`[enforce-access] begin_grace_period succeeded for user ${userId}`)
    }
  } catch (err) {
    console.error(
      `[enforce-access] unexpected error calling begin_grace_period for user ${userId}:`,
      err,
    )
  }
}

/**
 * Calls the expire_user DB function.
 */
async function callExpireUser(
  supabase: SupabaseClient,
  userId:   string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('expire_user', {
      p_user_id: userId,
    })

    if (error) {
      console.error(
        `[enforce-access] expire_user RPC failed for user ${userId}:`,
        error.message,
      )
    } else {
      console.log(`[enforce-access] expire_user succeeded for user ${userId}`)
    }
  } catch (err) {
    console.error(
      `[enforce-access] unexpected error calling expire_user for user ${userId}:`,
      err,
    )
  }
}

// ─── UTILITY HELPERS ──────────────────────────────────────────────────────────

/**
 * Returns true if the given ISO timestamp is in the past (or null/undefined).
 * A null timestamp is treated as "already past" to err on the side of
 * downgrading rather than leaving a user on a lapsed plan indefinitely.
 */
function isPast(isoTimestamp: string | null | undefined): boolean {
  if (!isoTimestamp) return true
  try {
    return new Date(isoTimestamp).getTime() < Date.now()
  } catch {
    // Unparseable timestamp — treat as past to be safe
    console.warn(`[enforce-access] could not parse timestamp: ${isoTimestamp} — treating as past`)
    return true
  }
}

/**
 * Returns a JSON Response with CORS headers attached.
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}