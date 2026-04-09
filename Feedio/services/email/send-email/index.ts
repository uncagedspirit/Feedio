/**
 * Supabase Edge Function: send-email
 *
 * Sends transactional emails via Sender.com API.
 * Called internally by the cron job — not exposed to the frontend.
 *
 * Deploy:
 *   supabase functions deploy send-email
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   SENDER_API_KEY
 *   SENDER_FROM_EMAIL
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   INTERNAL_SECRET
 *
 * Optional secrets:
 *   ALERT_WEBHOOK_URL   — Slack / Discord webhook for max-attempt alerts
 *   APP_URL             — base URL for dashboard links (defaults to https://app.feedio.app)
 *
 * Invocation body:
 *   { user_id: string, email_type: string, idempotency_key: string }
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SENDER_API_BASE   = 'https://api.sender.net/v2'
const MAX_ATTEMPTS      = 3

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface InvocationBody {
  user_id:         string
  email_type:      string
  idempotency_key: string
}

interface EmailLogRow {
  id:              string
  user_id:         string
  email_type:      string
  idempotency_key: string
  status:          string
  attempt_count:   number
  last_error:      string | null
  sent_at:         string | null
}

interface ProfileRow {
  id:    string
  name:  string
  email: string | null
}

interface BuiltEmail {
  subject: string
  html:    string
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Internal secret guard ──────────────────────────────────────────────────
  // This function is never called by the frontend. Require an internal secret
  // header so it cannot be triggered by arbitrary external requests.
  const internalSecret = Deno.env.get('INTERNAL_SECRET') ?? ''
  const providedSecret = req.headers.get('x-internal-secret') ?? ''

  if (!internalSecret || providedSecret !== internalSecret) {
    return respond({ error: 'Unauthorized' }, 401)
  }

  // ── Read secrets ───────────────────────────────────────────────────────────
  const senderApiKey        = Deno.env.get('SENDER_API_KEY')            ?? ''
  const senderFromEmail     = Deno.env.get('SENDER_FROM_EMAIL')         ?? ''
  const supabaseUrl         = Deno.env.get('SUPABASE_URL')              ?? ''
  const supabaseServiceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const alertWebhookUrl     = Deno.env.get('ALERT_WEBHOOK_URL')         ?? ''
  const appUrl              = Deno.env.get('APP_URL')                   ?? 'https://app.feedio.app'

  if (!senderApiKey || !senderFromEmail) {
    console.error('[send-email] FATAL: SENDER_API_KEY or SENDER_FROM_EMAIL not set')
    return respond({ error: 'Email service misconfigured' }, 500)
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[send-email] FATAL: Supabase env secrets not set')
    return respond({ error: 'Database misconfigured' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // ── Parse invocation body ──────────────────────────────────────────────────
  let body: InvocationBody

  try {
    body = await req.json() as InvocationBody

    if (!body.user_id || !body.email_type || !body.idempotency_key) {
      return respond(
        { error: 'user_id, email_type, and idempotency_key are all required' },
        400,
      )
    }
  } catch (err) {
    console.error('[send-email] failed to parse request body:', err)
    return respond({ error: 'Invalid JSON body' }, 400)
  }

  const { user_id, email_type, idempotency_key } = body

  console.log(`[send-email] processing: type=${email_type} user=${user_id} key=${idempotency_key}`)

  // ── Idempotency check — skip if already sent ───────────────────────────────
  let emailLogRow: EmailLogRow | null = null

  try {
    const { data, error } = await supabase
      .from('email_log')
      .select('id, user_id, email_type, idempotency_key, status, attempt_count, last_error, sent_at')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle()

    if (error) {
      console.error('[send-email] failed to query email_log:', error.message)
      return respond({ error: 'Database error during idempotency check' }, 500)
    }

    emailLogRow = data as EmailLogRow | null
  } catch (err) {
    console.error('[send-email] unexpected error querying email_log:', err)
    return respond({ error: 'Database error during idempotency check' }, 500)
  }

  if (emailLogRow?.status === 'sent') {
    console.log(`[send-email] already sent — skipping (key: ${idempotency_key})`)
    return respond({ ok: true, skipped: true, reason: 'already_sent' })
  }

  // ── Max attempts guard ─────────────────────────────────────────────────────
  const currentAttempts = emailLogRow?.attempt_count ?? 0

  if (currentAttempts >= MAX_ATTEMPTS) {
    console.warn(
      `[send-email] max attempts (${MAX_ATTEMPTS}) reached for key: ${idempotency_key} — not retrying`,
    )
    // Ensure status is permanently 'failed' in case it wasn't set
    await updateEmailLog(supabase, idempotency_key, {
      status:        'failed',
      attempt_count: currentAttempts,
      last_error:    emailLogRow?.last_error ?? 'Max attempts reached',
    })
    return respond({
      ok:     false,
      reason: 'max_attempts_reached',
      attempts: currentAttempts,
    })
  }

  // ── Fetch user profile ─────────────────────────────────────────────────────
  let profile: ProfileRow

  try {
    // Profiles table stores name; auth.users stores email
    // We join via the service-role client which can read auth.users
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', user_id)
      .single()

    if (profileError || !profileData) {
      console.error('[send-email] profile not found for user:', user_id, profileError?.message)
      await markFailed(supabase, idempotency_key, currentAttempts, 'Profile not found')
      return respond({ error: 'User profile not found' }, 404)
    }

    // Fetch email from auth.users via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(user_id)

    if (authError || !authData.user?.email) {
      console.error('[send-email] auth user not found or has no email:', user_id, authError?.message)
      await markFailed(supabase, idempotency_key, currentAttempts, 'Auth user not found or missing email')
      return respond({ error: 'Auth user not found' }, 404)
    }

    profile = {
      id:    profileData.id,
      name:  profileData.name ?? '',
      email: authData.user.email,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-email] unexpected error fetching user:', msg)
    await markFailed(supabase, idempotency_key, currentAttempts, `User fetch error: ${msg}`)
    return respond({ error: 'Failed to fetch user data' }, 500)
  }

  // ── Build email content ────────────────────────────────────────────────────
  let email: BuiltEmail

  try {
    email = buildEmail(email_type, profile.name, appUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-email] unknown email_type:', email_type)
    await markFailed(supabase, idempotency_key, currentAttempts, `Unknown email_type: ${msg}`)
    return respond({ error: `Unknown email_type: ${email_type}` }, 400)
  }

  // ── Send via Sender API ────────────────────────────────────────────────────
  let sendError: string | null = null

  try {
    const senderResponse = await fetch(`${SENDER_API_BASE}/emails`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${senderApiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        from: {
          email: senderFromEmail,
          name:  'Feedio',
        },
        to: [
          {
            email: profile.email,
            name:  profile.name,
          },
        ],
        subject: email.subject,
        html:    email.html,
      }),
    })

    if (!senderResponse.ok) {
      let errorDetail = `HTTP ${senderResponse.status}`
      try {
        const errorBody = await senderResponse.json()
        errorDetail = JSON.stringify(errorBody)
      } catch {
        // Response body was not JSON — use status code only
      }
      console.error(`[send-email] Sender API error for user ${user_id}:`, errorDetail)
      sendError = `Sender API error: ${errorDetail}`
    } else {
      console.log(
        `[send-email] sent successfully: type=${email_type} to=${profile.email} user=${user_id}`,
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-email] network error calling Sender API:', msg)
    sendError = `Network error: ${msg}`
  }

  // ── Update email_log with outcome ──────────────────────────────────────────
  const newAttemptCount = currentAttempts + 1

  if (sendError) {
    const permanentlyFailed = newAttemptCount >= MAX_ATTEMPTS

    await updateEmailLog(supabase, idempotency_key, {
      status:        permanentlyFailed ? 'failed' : 'pending',
      attempt_count: newAttemptCount,
      last_error:    sendError,
    })

    if (permanentlyFailed) {
      console.warn(
        `[send-email] permanently failed after ${MAX_ATTEMPTS} attempts — ` +
        `user=${user_id} type=${email_type} key=${idempotency_key}`,
      )
      await fireAlert(alertWebhookUrl, {
        user_id,
        email_type,
        idempotency_key,
        last_error: sendError,
      })
    }

    return respond({
      ok:               false,
      error:            sendError,
      attempt_count:    newAttemptCount,
      permanently_failed: permanentlyFailed,
    })
  }

  // Success path
  await updateEmailLog(supabase, idempotency_key, {
    status:        'sent',
    attempt_count: newAttemptCount,
    last_error:    null,
    sent_at:       new Date().toISOString(),
  })

  return respond({ ok: true, attempt_count: newAttemptCount })
})

// ─── EMAIL BUILDER ────────────────────────────────────────────────────────────

/**
 * Builds the subject and HTML body for a given email_type.
 * Throws if the email_type is not recognised.
 */
function buildEmail(emailType: string, fullName: string, appUrl: string): BuiltEmail {
  const firstName  = fullName.split(' ')[0] || 'there'
  const dashboard  = `${appUrl}/dashboard`
  const resubscribe = `${appUrl}/dashboard` // adjust if there's a dedicated billing/upgrade page

  switch (emailType) {

    // ── 1. Welcome ───────────────────────────────────────────────────────────
    case 'welcome':
      return {
        subject: 'Welcome to Feedio Pro 🎉',
        html: layout(`
          <h1>You're on Pro, ${firstName}!</h1>
          <p>
            Your Feedio account has been upgraded to <strong>Pro</strong>.
            You now have access to:
          </p>
          <ul>
            <li>Unlimited feedback boards</li>
            <li>Unlimited posts and interactions</li>
            <li>Private boards</li>
            <li>Priority support</li>
          </ul>
          <p>Head over to your dashboard to start building.</p>
          ${button('Go to Dashboard', dashboard)}
        `),
      }

    // ── 2. Payment failed ─────────────────────────────────────────────────────
    case 'payment_failed':
      return {
        subject: 'Your Feedio payment failed',
        html: layout(`
          <h1>Payment issue, ${firstName}</h1>
          <p>
            We were unable to process your most recent Feedio payment.
            <strong>Your Pro access is still active for now</strong> — we'll try again soon.
          </p>
          <p>
            To avoid any interruption, please update your payment method by going to
            your dashboard and clicking <strong>Manage Billing</strong>.
          </p>
          ${button('Update Payment Method', dashboard)}
          <p style="color:#6B7280;font-size:13px;margin-top:24px;">
            If you continue to see this message, please reply to this email and we'll help you out.
          </p>
        `),
      }

    // ── 3. Cancellation confirmed ─────────────────────────────────────────────
    case 'cancellation_confirmed':
      return {
        subject: 'Your Feedio Pro subscription has been cancelled',
        html: layout(`
          <h1>Subscription cancelled, ${firstName}</h1>
          <p>
            We've confirmed your Feedio Pro cancellation. Here's what happens next:
          </p>
          <ul>
            <li>You keep full Pro access until your current billing period ends.</li>
            <li>After that, you get <strong>7 more days of full access</strong> (grace period).</li>
            <li>Once the grace period ends, your account moves to the free plan.</li>
          </ul>
          <p>
            Changed your mind? You can resubscribe any time and everything will be
            instantly restored.
          </p>
          ${button('Resubscribe', resubscribe)}
        `),
      }

    // ── 4. Grace period — day 5 (2 days left) ────────────────────────────────
    case 'grace_day5':
      return {
        subject: 'Your Feedio access ends in 2 days',
        html: layout(`
          <h1>2 days left, ${firstName}</h1>
          <p>
            Your Feedio grace period ends in <strong>2 days</strong>.
            After that, your account will move to the <strong>free plan</strong>:
          </p>
          <ul>
            <li>1 public feedback board</li>
            <li>Up to 50 posts</li>
          </ul>
          <p>
            <strong>Your other boards won't be deleted</strong> — they'll be frozen and
            restored instantly the moment you resubscribe.
          </p>
          ${button('Resubscribe Now', resubscribe)}
        `),
      }

    // ── 5. Grace period — day 7 (last day) ────────────────────────────────────
    case 'grace_day7':
      return {
        subject: 'Last day of your Feedio Pro access',
        html: layout(`
          <h1>Today is your last day, ${firstName}</h1>
          <p>
            Your Feedio grace period ends <strong>tonight at midnight</strong>.
            After that, your extra boards will be <strong>frozen</strong> (not deleted)
            and your account will move to the free plan.
          </p>
          <p>
            Resubscribe before midnight to keep everything exactly as it is.
          </p>
          ${button('Resubscribe Now', resubscribe)}
          <p style="color:#6B7280;font-size:13px;margin-top:24px;">
            If you resubscribe at any point in the future, all your frozen boards
            and data will be restored instantly.
          </p>
        `),
      }

    // ── 6. Downgraded to free ─────────────────────────────────────────────────
    case 'downgraded':
      return {
        subject: 'Your Feedio account is now on the free plan',
        html: layout(`
          <h1>You're now on the free plan, ${firstName}</h1>
          <p>
            Your Feedio account has moved to the <strong>free plan</strong>.
            Your extra boards have been <strong>frozen</strong> — not deleted.
          </p>
          <p>
            If you resubscribe, everything is <strong>restored instantly</strong> —
            all your boards, posts, and settings will be exactly as you left them.
          </p>
          ${button('Resubscribe', resubscribe)}
          <p style="color:#6B7280;font-size:13px;margin-top:24px;">
            On the free plan you can still use 1 public board with up to 50 posts.
          </p>
        `),
      }

    // ── 7. Inactivity warning (60 days inactive, 30 days left) ───────────────
    case 'inactive_warning':
      return {
        subject: "We miss you on Feedio — your data is safe for 30 more days",
        html: layout(`
          <h1>We miss you, ${firstName}</h1>
          <p>
            It's been a while since you last logged in to Feedio.
            <strong>Your boards and posts are completely safe</strong> and waiting for you.
          </p>
          <p>
            Just a heads-up: if we don't see any activity within the next
            <strong>30 days</strong>, your account will be scheduled for deletion.
          </p>
          <p>
            Simply logging in is enough to keep your account active.
          </p>
          ${button('Log In Now', appUrl)}
        `),
      }

    // ── 8. Deletion warning (7 days until deletion) ───────────────────────────
    case 'deletion_warning':
      return {
        subject: 'Feedio account scheduled for deletion',
        html: layout(`
          <h1>Your account will be deleted in 7 days, ${firstName}</h1>
          <p>
            Due to extended inactivity, your Feedio account and all associated data
            will be <strong>permanently deleted in 7 days</strong>.
          </p>
          <p>
            <strong>To keep your account</strong>, just log in before then — that's all it takes.
          </p>
          ${button('Log In and Save My Account', appUrl)}
          <p style="color:#6B7280;font-size:13px;margin-top:24px;">
            If you'd like a copy of your data before deletion, simply
            <strong>reply to this email</strong> and we'll prepare an export for you.
          </p>
        `),
      }

    // ── 9. Reactivation (resubscribed) ────────────────────────────────────────
    case 'reactivation':
      return {
        subject: 'Welcome back to Feedio Pro!',
        html: layout(`
          <h1>Welcome back, ${firstName}!</h1>
          <p>
            Your Feedio Pro subscription is active again.
            <strong>All your frozen boards and posts have been instantly restored</strong> —
            everything is exactly as you left it.
          </p>
          <p>You're back to unlimited boards, unlimited posts, and private boards.</p>
          ${button('Go to Dashboard', dashboard)}
        `),
      }

    default:
      throw new Error(`Unrecognised email_type: "${emailType}"`)
  }
}

// ─── EMAIL LAYOUT ──────────────────────────────────────────────────────────────

/**
 * Wraps email body content in a clean, minimal HTML shell.
 * Plain-text-friendly: short lines, system fonts, no images.
 */
function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Feedio</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / brand -->
          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-size:18px;font-weight:800;color:#0D2B24;letter-spacing:-0.02em;">
                feedio
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EB;padding:36px 40px;">
              <div style="font-size:15px;line-height:1.7;color:#374151;">
                ${content}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="font-size:12px;color:#9CA3AF;margin:0;">
                You're receiving this email because you have a Feedio account.<br />
                &copy; ${new Date().getFullYear()} Feedio. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Renders a styled CTA button.
 */
function button(label: string, href: string): string {
  return `
    <p style="margin:28px 0;">
      <a href="${href}"
         style="display:inline-block;background:#0D9488;color:#FFFFFF;
                font-size:14px;font-weight:600;text-decoration:none;
                padding:12px 24px;border-radius:10px;
                box-shadow:0 1px 4px rgba(13,148,136,0.3);">
        ${label}
      </a>
    </p>`
}

// ─── DATABASE HELPERS ─────────────────────────────────────────────────────────

interface EmailLogUpdate {
  status:        string
  attempt_count: number
  last_error:    string | null
  sent_at?:      string | null
}

/**
 * Upserts the email_log row for a given idempotency_key.
 * Uses upsert so this works whether the row was pre-created by the
 * payment-webhook or is being written for the first time here.
 */
async function updateEmailLog(
  supabase:        SupabaseClient,
  idempotencyKey:  string,
  updates:         EmailLogUpdate,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_log')
      .update(updates)
      .eq('idempotency_key', idempotencyKey)

    if (error) {
      console.error(
        `[send-email] failed to update email_log for key ${idempotencyKey}:`,
        error.message,
      )
    }
  } catch (err) {
    console.error('[send-email] unexpected error updating email_log:', err)
  }
}

/**
 * Convenience wrapper: increment attempt_count and record an error,
 * but keep status='pending' so the cron will retry next cycle.
 * If we've hit MAX_ATTEMPTS, flip to 'failed' instead.
 */
async function markFailed(
  supabase:       SupabaseClient,
  idempotencyKey: string,
  currentAttempts: number,
  errorMessage:   string,
): Promise<void> {
  const newAttemptCount = currentAttempts + 1
  await updateEmailLog(supabase, idempotencyKey, {
    status:        newAttemptCount >= MAX_ATTEMPTS ? 'failed' : 'pending',
    attempt_count: newAttemptCount,
    last_error:    errorMessage,
  })
}

// ─── ALERTING ─────────────────────────────────────────────────────────────────

/**
 * Fires an alert to a Slack-compatible webhook when an email permanently fails.
 * Compatible with Slack incoming webhooks and Discord webhooks.
 * Silently skips if ALERT_WEBHOOK_URL is not configured.
 */
async function fireAlert(
  webhookUrl: string,
  context: {
    user_id:         string
    email_type:      string
    idempotency_key: string
    last_error:      string
  },
): Promise<void> {
  if (!webhookUrl) return

  const text =
    `⚠️ Feedio email failed after ${MAX_ATTEMPTS} attempts. ` +
    `user_id: ${context.user_id}, ` +
    `email_type: ${context.email_type}, ` +
    `idempotency_key: ${context.idempotency_key}, ` +
    `last_error: ${context.last_error}`

  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    })

    if (!res.ok) {
      console.warn(`[send-email] alert webhook returned ${res.status} — alert may not have delivered`)
    } else {
      console.log('[send-email] alert fired successfully')
    }
  } catch (err) {
    // Alert failure must never propagate — it's a best-effort side channel
    console.warn('[send-email] failed to fire alert webhook:', err)
  }
}

// ─── RESPONSE HELPER ──────────────────────────────────────────────────────────

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}