/**
 * Supabase Edge Function: billing-portal
 *
 * Creates a Dodo Payments billing portal session so users can manage
 * their subscription (cancel, update payment method, view invoices).
 *
 * Deploy:
 *   supabase functions deploy billing-portal
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   DODO_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * TODO: Confirm the exact Dodo Payments billing portal endpoint from their
 *       official documentation at https://docs.dodopayments.com
 *       'https://api.dodopayments.com/billing-portal/sessions' is used here
 *       as a best-guess — verify before deploying to production.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TODO: Verify the exact billing portal endpoint from Dodo Payments documentation.
// Check https://docs.dodopayments.com for the correct path.
const DODO_API_BASE = 'https://api.dodopayments.com'
const DODO_PORTAL_ENDPOINT = `${DODO_API_BASE}/billing-portal/sessions`

// Subscription states that indicate an active paid subscription
const ACTIVE_SUBSCRIPTION_STATES = ['active', 'cancel_scheduled']

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface RequestBody {
  returnUrl: string
}

interface ProfileRow {
  payment_customer_id:  string | null
  subscription_state:   string | null
}

interface DodoPortalRequest {
  customer_id: string
  return_url:  string
}

interface DodoPortalResponse {
  portal_url: string
  [key: string]: unknown
}

interface DodoErrorResponse {
  error?:   string
  message?: string
  [key: string]: unknown
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── 1. CORS preflight ──────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // ── 2. Read environment secrets ────────────────────────────────────────────
  const supabaseUrl            = Deno.env.get('SUPABASE_URL')            ?? ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const dodoSecretKey          = Deno.env.get('DODO_SECRET_KEY')          ?? ''

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[billing-portal] FATAL: missing Supabase env secrets')
    return json({ error: 'Server misconfiguration: missing Supabase secrets' }, 500)
  }

  if (!dodoSecretKey) {
    console.error('[billing-portal] FATAL: missing DODO_SECRET_KEY env secret')
    return json({ error: 'Server misconfiguration: missing Dodo Payments secret' }, 500)
  }

  // ── 3. Authenticate the requesting user ────────────────────────────────────
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
      console.warn('[billing-portal] auth.getUser failed:', error?.message)
      return json({ error: 'Unauthorized: invalid or expired token' }, 401)
    }

    userId = data.user.id
  } catch (err) {
    console.error('[billing-portal] unexpected error during auth:', err)
    return json({ error: 'Unauthorized: could not verify token' }, 401)
  }

  // ── 4. Look up the user's profile ──────────────────────────────────────────
  let profile: ProfileRow

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('payment_customer_id, subscription_state')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('[billing-portal] profile lookup failed:', error?.message)
      return json({ error: 'Could not retrieve user profile' }, 500)
    }

    profile = data as ProfileRow
  } catch (err) {
    console.error('[billing-portal] unexpected error fetching profile:', err)
    return json({ error: 'Could not retrieve user profile' }, 500)
  }

  // ── 5. Validate subscription state ────────────────────────────────────────
  if (
    !profile.subscription_state ||
    !ACTIVE_SUBSCRIPTION_STATES.includes(profile.subscription_state)
  ) {
    console.warn(
      `[billing-portal] user ${userId} has no active subscription ` +
      `(state: ${profile.subscription_state ?? 'null'})`,
    )
    return json({ error: 'No active subscription to manage' }, 400)
  }

  // ── 6. Validate payment_customer_id ───────────────────────────────────────
  if (!profile.payment_customer_id) {
    console.warn(`[billing-portal] user ${userId} has no payment_customer_id on record`)
    return json({ error: 'No billing account found' }, 400)
  }

  // ── 7. Parse request body ──────────────────────────────────────────────────
  let returnUrl: string

  try {
    const body: RequestBody = await req.json()
    returnUrl = body?.returnUrl

    if (!returnUrl) {
      return json({ error: 'returnUrl is required in the request body' }, 400)
    }
  } catch (err) {
    console.error('[billing-portal] failed to parse request body:', err)
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // ── 8. Call Dodo Payments API to create a billing portal session ───────────
  let portalUrl: string

  const portalPayload: DodoPortalRequest = {
    customer_id: profile.payment_customer_id,
    return_url:  returnUrl,
  }

  try {
    const dodoResponse = await fetch(DODO_PORTAL_ENDPOINT, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${dodoSecretKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(portalPayload),
    })

    const responseBody = await dodoResponse.json()

    if (!dodoResponse.ok) {
      const dodoError = responseBody as DodoErrorResponse
      console.error(
        `[billing-portal] Dodo API error ${dodoResponse.status} for user ${userId}:`,
        JSON.stringify(dodoError),
      )
      return json(
        {
          error:
            dodoError?.message ??
            dodoError?.error ??
            'Dodo Payments billing portal creation failed',
        },
        500,
      )
    }

    const portalSession = responseBody as DodoPortalResponse

    if (!portalSession.portal_url) {
      console.error(
        '[billing-portal] Dodo response missing portal_url for user',
        userId,
        ':',
        JSON.stringify(portalSession),
      )
      return json(
        { error: 'Dodo Payments returned an incomplete portal session response' },
        500,
      )
    }

    portalUrl = portalSession.portal_url
  } catch (err) {
    console.error(
      '[billing-portal] network or parse error calling Dodo API for user',
      userId,
      ':',
      err,
    )
    return json({ error: 'Failed to reach Dodo Payments API' }, 500)
  }

  // ── 9. Return the portal URL to the frontend ───────────────────────────────
  console.log(
    `[billing-portal] billing portal session created for user ${userId}`,
  )

  return json({ url: portalUrl })
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}