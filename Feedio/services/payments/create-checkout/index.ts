/**
 * Supabase Edge Function: create-checkout
 *
 * Creates a Dodo Payments checkout session for the Pro plan and returns
 * the checkout URL. The frontend redirects the user to that URL.
 *
 * Deploy:
 *   supabase functions deploy create-checkout
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   DODO_SECRET_KEY
 *   DODO_PRO_PRODUCT_ID
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * TODO: Confirm the Dodo Payments API base URL from their official docs.
 *       https://api.dodopayments.com is used here as documented at time of
 *       writing — verify at https://docs.dodopayments.com before deploying.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

// TODO: Confirm this base URL from Dodo Payments official documentation.
const DODO_API_BASE = 'https://api.dodopayments.com'
const DODO_CHECKOUT_ENDPOINT = `${DODO_API_BASE}/checkout/sessions`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DodoCheckoutSessionRequest {
  customer_email: string
  customer_name:  string
  product_id:     string
  quantity:       number
  success_url:    string
  cancel_url:     string
  metadata:       Record<string, string>
}

interface DodoCheckoutSessionResponse {
  id:           string
  checkout_url: string
  customer_id?: string
  status?:      string
  [key: string]: unknown
}

interface DodoErrorResponse {
  error?:   string
  message?: string
  [key: string]: unknown
}

interface ProfileRow {
  payment_customer_id: string | null
  name:                string
  subscription_state:  string | null
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── 1. CORS preflight ──────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // ── 2. Authenticate the requesting user ────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized: missing or malformed Authorization header' }, 401)
  }

  const supabaseUrl            = Deno.env.get('SUPABASE_URL')            ?? ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const dodoSecretKey          = Deno.env.get('DODO_SECRET_KEY')          ?? ''
  const dodoProProductId       = Deno.env.get('DODO_PRO_PRODUCT_ID')      ?? ''

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[create-checkout] missing Supabase env secrets')
    return json({ error: 'Server misconfiguration: missing Supabase secrets' }, 500)
  }

  if (!dodoSecretKey || !dodoProProductId) {
    console.error('[create-checkout] missing Dodo Payments env secrets')
    return json({ error: 'Server misconfiguration: missing Dodo Payments secrets' }, 500)
  }

  // Service-role client for DB writes (bypasses RLS where needed)
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })

  // Verify the user's JWT
  let user: { id: string; email?: string }

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      console.warn('[create-checkout] auth.getUser failed:', error?.message)
      return json({ error: 'Unauthorized: invalid or expired token' }, 401)
    }

    user = data.user
  } catch (err) {
    console.error('[create-checkout] unexpected error during auth:', err)
    return json({ error: 'Unauthorized: could not verify token' }, 401)
  }

  // ── 3. Look up the user's profile ──────────────────────────────────────────
  let profile: ProfileRow

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('payment_customer_id, name, subscription_state')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      console.error('[create-checkout] profile lookup failed:', error?.message)
      return json({ error: 'Could not retrieve user profile' }, 500)
    }

    profile = data as ProfileRow
  } catch (err) {
    console.error('[create-checkout] unexpected error fetching profile:', err)
    return json({ error: 'Could not retrieve user profile' }, 500)
  }

  // Guard: already subscribed
  const activeStates = ['active', 'cancel_scheduled']
  if (profile.subscription_state && activeStates.includes(profile.subscription_state)) {
    return json({ error: 'Already subscribed' }, 400)
  }

  // ── 4. Parse request body ──────────────────────────────────────────────────
  let successUrl: string
  let cancelUrl:  string

  try {
    const body = await req.json()
    successUrl = body?.successUrl
    cancelUrl  = body?.cancelUrl

    if (!successUrl || !cancelUrl) {
      return json({ error: 'successUrl and cancelUrl are required in the request body' }, 400)
    }
  } catch (err) {
    console.error('[create-checkout] failed to parse request body:', err)
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // ── 5. Call Dodo Payments API to create a checkout session ─────────────────
  let dodoSession: DodoCheckoutSessionResponse

  const checkoutPayload: DodoCheckoutSessionRequest = {
    customer_email: user.email ?? '',
    customer_name:  profile.name ?? '',
    product_id:     dodoProProductId,
    quantity:       1,
    success_url:    successUrl,
    cancel_url:     cancelUrl,
    metadata: {
      supabase_user_id: user.id,
    },
  }

  try {
    const dodoResponse = await fetch(DODO_CHECKOUT_ENDPOINT, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${dodoSecretKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    })

    const responseBody = await dodoResponse.json()

    if (!dodoResponse.ok) {
      const dodoError = responseBody as DodoErrorResponse
      console.error(
        `[create-checkout] Dodo API error ${dodoResponse.status}:`,
        JSON.stringify(dodoError),
      )
      return json(
        { error: dodoError?.message ?? dodoError?.error ?? 'Dodo Payments checkout creation failed' },
        500,
      )
    }

    dodoSession = responseBody as DodoCheckoutSessionResponse

    if (!dodoSession.checkout_url) {
      console.error('[create-checkout] Dodo response missing checkout_url:', JSON.stringify(dodoSession))
      return json({ error: 'Dodo Payments returned an incomplete session response' }, 500)
    }
  } catch (err) {
    console.error('[create-checkout] network or parse error calling Dodo API:', err)
    return json({ error: 'Failed to reach Dodo Payments API' }, 500)
  }

  // ── 6. Backfill payment_customer_id if not yet stored ─────────────────────
  // DB writes from here are best-effort — failures are logged but do NOT
  // block returning the checkout URL to the user.
  if (!profile.payment_customer_id && dodoSession.customer_id) {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ payment_customer_id: dodoSession.customer_id })
        .eq('id', user.id)

      if (updateError) {
        console.warn(
          '[create-checkout] failed to backfill payment_customer_id — will reconcile via webhook:',
          updateError.message,
        )
      } else {
        console.log(`[create-checkout] saved payment_customer_id for user ${user.id}`)
      }
    } catch (err) {
      console.warn('[create-checkout] unexpected error backfilling payment_customer_id:', err)
    }
  }

  // ── 7. Insert a payment_events audit row ───────────────────────────────────
  try {
    const { error: eventError } = await supabase
      .from('payment_events')
      .insert({
        provider:   'dodo',
        event_id:   dodoSession.id,
        event_type: 'checkout.created',
        user_id:    user.id,
        payload:    dodoSession,
        processed:  true,
      })

    if (eventError) {
      console.warn(
        '[create-checkout] failed to insert payment_events row — will reconcile via webhook:',
        eventError.message,
      )
    }
  } catch (err) {
    console.warn('[create-checkout] unexpected error inserting payment_events:', err)
  }

  // ── 8. Return the checkout URL ─────────────────────────────────────────────
  console.log(`[create-checkout] checkout session created for user ${user.id}, session ${dodoSession.id}`)
  return json({ url: dodoSession.checkout_url })
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