/**
 * Supabase Edge Function: payment-webhook
 *
 * Receives and processes webhook events from Dodo Payments.
 * Maintains subscription state in the database and queues emails
 * via email_log for a separate cron-based sender.
 *
 * Deploy:
 *   supabase functions deploy payment-webhook
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   DODO_WEBHOOK_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Register this webhook URL in Dodo Payments Dashboard:
 *   https://<your-project>.supabase.co/functions/v1/payment-webhook
 *
 * Events handled:
 *   subscription.activated  → upgrade_user_to_pro()
 *   subscription.cancelled  → schedule_cancellation()
 *   subscription.expired    → begin_grace_period()
 *   payment.failed          → queue payment_failed email, no state change
 *
 * Design principles:
 *   - Idempotent: duplicate events with processed=true are silently skipped
 *   - Atomic: write event row (processed=false) → update state → mark processed=true
 *   - Always return 200 to Dodo except on bad signatures (400)
 *   - Never send email inline — insert into email_log for cron pickup
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// TODO: Confirm the exact header name from Dodo Payments official documentation.
//       https://docs.dodopayments.com — look for "webhook signature" or "webhook verification".
//       'dodo-signature' is used here based on available information.
const DODO_SIGNATURE_HEADER = 'dodo-signature'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DodoEventMetadata {
  supabase_user_id?: string
  [key: string]: unknown
}

interface DodoSubscriptionData {
  subscription_id?:    string
  customer_id?:        string
  price_id?:           string
  current_period_end?: string
}

interface DodoPaymentData {
  subscription_id?: string
}

interface DodoEvent {
  id:         string
  type:       string
  created_at?: string
  metadata?:  DodoEventMetadata
  data:       DodoSubscriptionData & DodoPaymentData & Record<string, unknown>
}

interface ProfileRow {
  id:                      string
  name:                    string
  email?:                  string
  payment_customer_id?:    string | null
  payment_subscription_id?: string | null
  subscription_state?:     string | null
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── CORS preflight ─────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // ── Read secrets ───────────────────────────────────────────────────────────
  const webhookSecret          = Deno.env.get('DODO_WEBHOOK_SECRET')          ?? ''
  const supabaseUrl            = Deno.env.get('SUPABASE_URL')                 ?? ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')    ?? ''

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Cannot proceed without DB access — but we still return 200 so Dodo
    // does not flood us with retries for a misconfiguration issue.
    console.error('[payment-webhook] FATAL: missing Supabase env secrets')
    return ok('misconfiguration logged')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })

  // ── Read raw body (needed for signature verification) ─────────────────────
  let rawBody: string

  try {
    rawBody = await req.text()
  } catch (err) {
    console.error('[payment-webhook] failed to read request body:', err)
    return ok('body read error logged')
  }

  // ── Verify webhook signature ───────────────────────────────────────────────
  // Bad signatures get 400, not 200. We do not acknowledge requests we cannot
  // verify — returning 200 would tell Dodo "received OK" for potentially
  // forged payloads.
  if (!webhookSecret) {
    console.error('[payment-webhook] DODO_WEBHOOK_SECRET is not set — cannot verify signature')
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const incomingSignature = req.headers.get(DODO_SIGNATURE_HEADER)

  if (!incomingSignature) {
    console.warn(`[payment-webhook] missing ${DODO_SIGNATURE_HEADER} header`)
    return new Response(JSON.stringify({ error: 'Missing webhook signature' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const signatureValid = await verifySignature(rawBody, incomingSignature, webhookSecret)

  if (!signatureValid) {
    console.warn('[payment-webhook] signature verification failed — possible forged request')
    return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ── Parse event payload ────────────────────────────────────────────────────
  let event: DodoEvent

  try {
    event = JSON.parse(rawBody) as DodoEvent

    if (!event.id || !event.type) {
      console.error('[payment-webhook] event missing id or type:', rawBody.slice(0, 500))
      return ok('malformed event logged')
    }
  } catch (err) {
    console.error('[payment-webhook] failed to parse event JSON:', err)
    return ok('parse error logged')
  }

  console.log(`[payment-webhook] received event: ${event.type} (${event.id})`)

  // ── Idempotency check ──────────────────────────────────────────────────────
  // If this event was already fully processed, return 200 immediately.
  // This handles Dodo retries and double-delivery safely.
  try {
    const { data: existingEvent, error: lookupError } = await supabase
      .from('payment_events')
      .select('id, processed')
      .eq('event_id', event.id)
      .maybeSingle()

    if (lookupError) {
      console.error('[payment-webhook] error checking idempotency:', lookupError.message)
      // Proceed anyway — safer to risk double-processing than to drop the event
    }

    if (existingEvent?.processed === true) {
      console.log(`[payment-webhook] event ${event.id} already processed — skipping`)
      return ok('already processed')
    }
  } catch (err) {
    console.error('[payment-webhook] unexpected error during idempotency check:', err)
    // Proceed — do not silently drop the event
  }

  // ── Write payment_events row (processed=false) — atomic step 1 ────────────
  // We write this before doing anything else. If the function crashes mid-way,
  // the processed=false row signals that the event needs to be retried.
  let paymentEventRowId: string | null = null

  try {
    const { data: insertedEvent, error: insertError } = await supabase
      .from('payment_events')
      .upsert(
        {
          provider:   'dodo',
          event_id:   event.id,
          event_type: event.type,
          user_id:    event.metadata?.supabase_user_id ?? null,
          payload:    event,
          processed:  false,
        },
        { onConflict: 'event_id' },
      )
      .select('id')
      .single()

    if (insertError) {
      console.error('[payment-webhook] failed to insert payment_events row:', insertError.message)
      // Continue processing — we log the problem but do not drop the event
    } else {
      paymentEventRowId = insertedEvent?.id ?? null
    }
  } catch (err) {
    console.error('[payment-webhook] unexpected error inserting payment_events row:', err)
  }

  // ── Route to event handler — atomic step 2 ────────────────────────────────
  let processingError: string | null = null

  try {
    switch (event.type) {
      case 'subscription.activated':
        await handleSubscriptionActivated(supabase, event)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(supabase, event)
        break

      case 'subscription.expired':
        await handleSubscriptionExpired(supabase, event)
        break

      case 'payment.failed':
        await handlePaymentFailed(supabase, event)
        break

      default:
        console.log(`[payment-webhook] unhandled event type: ${event.type} — ignoring`)
    }
  } catch (err) {
    processingError = err instanceof Error ? err.message : String(err)
    console.error(
      `[payment-webhook] error processing event ${event.id} (${event.type}):`,
      processingError,
    )
    // Do not re-throw — we must return 200 below
  }

  // ── Mark payment_events as processed=true — atomic step 3 ─────────────────
  // Only mark processed if there was no error in step 2. A processed=false row
  // with a logged error signals that manual intervention or a retry is needed.
  if (paymentEventRowId && !processingError) {
    try {
      const { error: markError } = await supabase
        .from('payment_events')
        .update({ processed: true })
        .eq('id', paymentEventRowId)

      if (markError) {
        console.error(
          '[payment-webhook] failed to mark event as processed:',
          markError.message,
          '— will be retried on next delivery',
        )
      }
    } catch (err) {
      console.error('[payment-webhook] unexpected error marking event as processed:', err)
    }
  }

  if (processingError) {
    console.error(
      `[payment-webhook] event ${event.id} left in processed=false state due to error — reconcile manually or wait for retry`,
    )
  }

  // Always acknowledge to Dodo
  return ok('received')
})

// ─── EVENT HANDLERS ───────────────────────────────────────────────────────────

/**
 * subscription.activated
 * User successfully subscribed. Upgrade their profile to Pro and queue
 * a welcome email.
 */
async function handleSubscriptionActivated(
  supabase: SupabaseClient,
  event:    DodoEvent,
): Promise<void> {
  const userId          = event.metadata?.supabase_user_id
  const customerId      = event.data.customer_id
  const subscriptionId  = event.data.subscription_id
  const priceId         = event.data.price_id
  const currentPeriodEnd = event.data.current_period_end

  if (!userId) {
    throw new Error(`subscription.activated event ${event.id} missing metadata.supabase_user_id`)
  }
  if (!subscriptionId) {
    throw new Error(`subscription.activated event ${event.id} missing data.subscription_id`)
  }

  // Upgrade the user's plan in the database
  const { error: rpcError } = await supabase.rpc('upgrade_user_to_pro', {
    p_user_id:               userId,
    p_customer_id:           customerId       ?? null,
    p_subscription_id:       subscriptionId,
    p_price_id:              priceId          ?? null,
    p_current_period_end:    currentPeriodEnd ?? null,
  })

  if (rpcError) {
    throw new Error(`upgrade_user_to_pro RPC failed: ${rpcError.message}`)
  }

  console.log(`[payment-webhook] upgraded user ${userId} to Pro (sub: ${subscriptionId})`)

  // Queue welcome email — never send inline
  await insertEmailLog(supabase, {
    userId,
    emailType:      'welcome',
    idempotencyKey: `${userId}:welcome:${event.id}`,
  })
}

/**
 * subscription.cancelled
 * User cancelled. They retain access until current_period_end.
 * Sets subscription_state to 'cancel_scheduled'.
 */
async function handleSubscriptionCancelled(
  supabase: SupabaseClient,
  event:    DodoEvent,
): Promise<void> {
  const subscriptionId   = event.data.subscription_id
  const currentPeriodEnd = event.data.current_period_end

  if (!subscriptionId) {
    throw new Error(`subscription.cancelled event ${event.id} missing data.subscription_id`)
  }

  // Look up the user by subscription ID so we can queue the email
  const profile = await lookupUserBySubscriptionId(supabase, subscriptionId)

  if (!profile) {
    throw new Error(
      `subscription.cancelled: no profile found for subscription_id ${subscriptionId}`,
    )
  }

  const { error: rpcError } = await supabase.rpc('schedule_cancellation', {
    p_subscription_id:    subscriptionId,
    p_current_period_end: currentPeriodEnd ?? null,
  })

  if (rpcError) {
    throw new Error(`schedule_cancellation RPC failed: ${rpcError.message}`)
  }

  console.log(
    `[payment-webhook] cancellation scheduled for user ${profile.id} ` +
    `(sub: ${subscriptionId}, ends: ${currentPeriodEnd ?? 'unknown'})`,
  )

  // Queue cancellation confirmation email
  await insertEmailLog(supabase, {
    userId:         profile.id,
    emailType:      'cancellation_confirmed',
    idempotencyKey: `${profile.id}:cancellation_confirmed:${event.id}`,
  })
}

/**
 * subscription.expired
 * Current period ended after cancellation. Begin 7-day grace period.
 * No email sent here — cron detects in_grace state and sends day-5 / day-7 emails.
 */
async function handleSubscriptionExpired(
  supabase: SupabaseClient,
  event:    DodoEvent,
): Promise<void> {
  const userId         = event.metadata?.supabase_user_id
  const subscriptionId = event.data.subscription_id

  if (!userId) {
    // Fall back to subscription ID lookup if metadata is missing
    if (subscriptionId) {
      const profile = await lookupUserBySubscriptionId(supabase, subscriptionId)
      if (!profile) {
        throw new Error(
          `subscription.expired: could not resolve user from metadata or subscription_id ${subscriptionId}`,
        )
      }
      return handleSubscriptionExpiredForUser(supabase, profile.id, event.id)
    }
    throw new Error(
      `subscription.expired event ${event.id} missing metadata.supabase_user_id and data.subscription_id`,
    )
  }

  await handleSubscriptionExpiredForUser(supabase, userId, event.id)
}

async function handleSubscriptionExpiredForUser(
  supabase: SupabaseClient,
  userId:   string,
  eventId:  string,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('begin_grace_period', {
    p_user_id: userId,
  })

  if (rpcError) {
    throw new Error(`begin_grace_period RPC failed for user ${userId}: ${rpcError.message}`)
  }

  console.log(
    `[payment-webhook] grace period started for user ${userId} ` +
    `— cron will send day-5 and day-7 emails`,
  )

  // Intentionally no email_log insert here.
  // The cron job monitors subscription_state='in_grace' and handles
  // day-5 and day-7 emails independently.
}

/**
 * payment.failed
 * Recurring charge failed. Do NOT change subscription_state — Dodo may retry.
 * Only queue a payment_failed email so the user knows to update their card.
 */
async function handlePaymentFailed(
  supabase: SupabaseClient,
  event:    DodoEvent,
): Promise<void> {
  const userId = event.metadata?.supabase_user_id

  if (!userId) {
    // Try to resolve via subscription_id as a fallback
    const subscriptionId = event.data.subscription_id
    if (subscriptionId) {
      const profile = await lookupUserBySubscriptionId(supabase, subscriptionId)
      if (profile) {
        await queuePaymentFailedEmail(supabase, profile.id, event.id)
        return
      }
    }
    // Log but do not throw — we don't want Dodo to retry over a missing user
    console.warn(
      `[payment-webhook] payment.failed event ${event.id}: ` +
      `could not resolve user — no email queued`,
    )
    return
  }

  await queuePaymentFailedEmail(supabase, userId, event.id)
}

async function queuePaymentFailedEmail(
  supabase: SupabaseClient,
  userId:   string,
  eventId:  string,
): Promise<void> {
  // subscription_state is intentionally NOT changed here.
  // Dodo may retry the payment. State will change only if
  // subscription.cancelled or subscription.expired arrives.

  console.log(`[payment-webhook] payment failed for user ${userId} — queueing email`)

  await insertEmailLog(supabase, {
    userId,
    emailType:      'payment_failed',
    idempotencyKey: `${userId}:payment_failed:${eventId}`,
  })
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Looks up a profile by its stored payment_subscription_id.
 * Returns the profile row or null if not found.
 */
async function lookupUserBySubscriptionId(
  supabase:       SupabaseClient,
  subscriptionId: string,
): Promise<ProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, payment_customer_id, payment_subscription_id, subscription_state')
      .eq('payment_subscription_id', subscriptionId)
      .maybeSingle()

    if (error) {
      console.error(
        `[payment-webhook] lookupUserBySubscriptionId error for ${subscriptionId}:`,
        error.message,
      )
      return null
    }

    return (data as ProfileRow) ?? null
  } catch (err) {
    console.error(
      `[payment-webhook] unexpected error in lookupUserBySubscriptionId for ${subscriptionId}:`,
      err,
    )
    return null
  }
}

/**
 * Inserts a row into email_log for the cron-based email sender to pick up.
 * Uses an idempotency_key unique constraint to prevent duplicate emails
 * if this function runs more than once for the same event.
 *
 * Never throws — email queueing failures are logged but must not abort
 * the payment state update that already succeeded.
 */
async function insertEmailLog(
  supabase: SupabaseClient,
  opts: {
    userId:         string
    emailType:      string
    idempotencyKey: string
  },
): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_log')
      .upsert(
        {
          user_id:         opts.userId,
          email_type:      opts.emailType,
          idempotency_key: opts.idempotencyKey,
          status:          'pending',
        },
        { onConflict: 'idempotency_key' },
      )

    if (error) {
      console.error(
        `[payment-webhook] failed to insert email_log ` +
        `(type: ${opts.emailType}, user: ${opts.userId}):`,
        error.message,
      )
      // Do not throw — email failure must not roll back a payment state change
    } else {
      console.log(
        `[payment-webhook] queued ${opts.emailType} email for user ${opts.userId}`,
      )
    }
  } catch (err) {
    console.error(
      `[payment-webhook] unexpected error inserting email_log ` +
      `(type: ${opts.emailType}, user: ${opts.userId}):`,
      err,
    )
  }
}

/**
 * Verifies a Dodo Payments webhook signature using HMAC-SHA256.
 *
 * Uses Deno's built-in crypto.subtle — no external crypto library needed.
 *
 * TODO: Confirm from Dodo docs whether the signature is:
 *   (a) a plain hex-encoded HMAC-SHA256 of the raw body, or
 *   (b) a prefixed format like "sha256=<hex>" (similar to GitHub/Stripe), or
 *   (c) a base64-encoded value.
 * Adjust the comparison logic below accordingly once confirmed.
 */
async function verifySignature(
  rawBody:   string,
  signature: string,
  secret:    string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()

    // Import the secret as an HMAC-SHA256 key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )

    // Compute HMAC-SHA256 of the raw request body
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(rawBody),
    )

    // Convert to lowercase hex string
    const computedHex = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // TODO: If Dodo sends "sha256=<hex>", strip the prefix before comparing:
    //   const incomingHex = signature.startsWith('sha256=')
    //     ? signature.slice(7)
    //     : signature
    // For now we compare the raw signature value directly.
    const incomingHex = signature

    // Constant-time comparison to prevent timing attacks
    return constantTimeEqual(computedHex, incomingHex)
  } catch (err) {
    console.error('[payment-webhook] signature verification threw:', err)
    return false
  }
}

/**
 * Constant-time string comparison.
 * Prevents timing-based attacks on signature verification.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    // XOR char codes — accumulates any difference without early exit
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return mismatch === 0
}

/**
 * Returns a 200 JSON response to acknowledge the webhook.
 * Dodo expects 200 for all successfully received events.
 */
function ok(message: string): Response {
  return new Response(
    JSON.stringify({ received: true, message }),
    {
      status:  200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    },
  )
}