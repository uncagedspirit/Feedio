/**
 * Supabase Edge Function: redeem-trial
 *
 * Validates a magic trial link token and activates a 30-day (or configured)
 * free Pro trial for the authenticated user. No payment details required.
 *
 * Deploy:
 *   supabase functions deploy redeem-trial
 *
 * Required secrets:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Request body: { token: string }
 * Auth: Bearer <supabase JWT> — user must be signed in
 *
 * Possible responses:
 *   200 { ok: true,  trial_days: number, ends_at: string }
 *   400 { error: 'invalid_token' | 'token_expired' | 'token_exhausted' | 'already_redeemed' | 'already_on_paid_plan' }
 *   401 { error: 'Unauthorized' }
 *   500 { error: string }
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// States that already have paid access — don't overwrite with a trial
const PAID_STATES = ['active', 'cancel_scheduled']

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface RequestBody {
  token: string
}

interface TrialLinkRow {
  id:         string
  trial_days: number
  max_uses:   number
  use_count:  number
  expires_at: string
  is_active:  boolean
}

interface ProfileRow {
  subscription_state:      string | null
  payment_subscription_id: string | null
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')              ?? ''
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceKey) {
    console.error('[redeem-trial] missing Supabase env secrets')
    return json({ error: 'Server misconfiguration' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  let userId: string

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return json({ error: 'Unauthorized' }, 401)
    }
    userId = data.user.id
  } catch {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let trialToken: string

  try {
    const body: RequestBody = await req.json()
    trialToken = (body?.token ?? '').trim()
    if (!trialToken) {
      return json({ error: 'token is required' }, 400)
    }
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // ── Guard: user shouldn't overwrite a real paid subscription ──────────────
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('subscription_state, payment_subscription_id')
    .eq('id', userId)
    .single()

  if (profileErr || !profile) {
    console.error('[redeem-trial] profile lookup failed:', profileErr?.message)
    return json({ error: 'Could not retrieve user profile' }, 500)
  }

  const profileRow = profile as ProfileRow

  if (
    profileRow.payment_subscription_id &&
    PAID_STATES.includes(profileRow.subscription_state ?? '')
  ) {
    // Already on a real paid plan — no need for a trial
    return json({ error: 'already_on_paid_plan' }, 400)
  }

  // ── Look up the trial link ─────────────────────────────────────────────────
  const { data: link, error: linkErr } = await supabase
    .from('trial_links')
    .select('id, trial_days, max_uses, use_count, expires_at, is_active')
    .eq('token', trialToken)
    .maybeSingle()

  if (linkErr) {
    console.error('[redeem-trial] trial_links lookup error:', linkErr.message)
    return json({ error: 'Database error' }, 500)
  }

  if (!link) {
    return json({ error: 'invalid_token' }, 400)
  }

  const row = link as TrialLinkRow

  if (!row.is_active) {
    return json({ error: 'invalid_token' }, 400)
  }

  if (new Date(row.expires_at) < new Date()) {
    return json({ error: 'token_expired' }, 400)
  }

  if (row.use_count >= row.max_uses) {
    return json({ error: 'token_exhausted' }, 400)
  }

  // ── Idempotency: has this user already redeemed this link? ─────────────────
  const { data: existing } = await supabase
    .from('trial_redemptions')
    .select('id')
    .eq('trial_link_id', row.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Already redeemed — return success silently so the frontend can redirect
    // without showing an error to a user who double-clicked.
    const endsAt = new Date(
      Date.now() + row.trial_days * 24 * 60 * 60 * 1000,
    ).toISOString()
    return json({ ok: true, trial_days: row.trial_days, ends_at: endsAt })
  }

  // ── Activate the trial (DB function) ──────────────────────────────────────
  const { error: activateErr } = await supabase.rpc('activate_trial', {
    p_user_id:    userId,
    p_trial_days: row.trial_days,
  })

  if (activateErr) {
    console.error('[redeem-trial] activate_trial RPC failed:', activateErr.message)
    return json({ error: 'Failed to activate trial' }, 500)
  }

  // ── Record redemption + increment use_count atomically ────────────────────
  // Insert redemption first (UNIQUE constraint prevents races)
  const { error: redemptionErr } = await supabase
    .from('trial_redemptions')
    .insert({ trial_link_id: row.id, user_id: userId })

  if (redemptionErr) {
    // Unique violation means a race — another request just beat us.
    // activate_trial is idempotent so no rollback needed; just return success.
    if (redemptionErr.code === '23505') {
      console.warn('[redeem-trial] race condition on redemption insert — ignoring')
    } else {
      console.error('[redeem-trial] redemption insert failed:', redemptionErr.message)
      // Trial is already active — don't return an error to the user.
    }
  } else {
    // Only increment use_count if we successfully inserted the redemption row
    await supabase
      .from('trial_links')
      .update({ use_count: row.use_count + 1 })
      .eq('id', row.id)
  }

  // ── Queue a welcome email ──────────────────────────────────────────────────
  await supabase
    .from('email_log')
    .upsert(
      {
        user_id:         userId,
        email_type:      'welcome',
        idempotency_key: `${userId}:welcome:trial:${row.id}`,
        status:          'pending',
      },
      { onConflict: 'idempotency_key' },
    )

  const endsAt = new Date(
    Date.now() + row.trial_days * 24 * 60 * 60 * 1000,
  ).toISOString()

  console.log(
    `[redeem-trial] trial activated: user=${userId} days=${row.trial_days} link=${row.id}`,
  )

  return json({ ok: true, trial_days: row.trial_days, ends_at: endsAt })
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}