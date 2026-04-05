/**
 * Supabase Edge Function: dispatch-pending-emails
 *
 * Called every 5 minutes by the pg_cron 'dispatch-pending-emails' job.
 * Claims a batch of pending rows from email_log, calls the send-email
 * edge function for each one, and updates the outcome back to email_log.
 *
 * This function is the bridge between the SQL queue and the HTTP email API.
 * It is intentionally separate from send-email so that:
 *   - send-email can be tested and called independently (e.g. from webhooks)
 *   - batch logic lives in one place
 *   - a single crashing send does not abort the entire batch
 *
 * Deploy:
 *   supabase functions deploy dispatch-pending-emails
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   INTERNAL_SECRET          ← shared with send-email; guards both functions
 *
 * Called by pg_cron via pg_net.http_post every 5 minutes.
 * The request must include header: x-internal-secret: <INTERNAL_SECRET>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BATCH_SIZE    = 50    // rows claimed per invocation
const SEND_TIMEOUT  = 8000  // ms before we consider a send-email call timed out

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface EmailRow {
  id:               number
  user_id:          string
  email_type:       string
  idempotency_key:  string
  attempt_count:    number
}

interface SendEmailResult {
  ok:                 boolean
  skipped?:           boolean
  attempt_count?:     number
  permanently_failed?: boolean
  error?:             string
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Internal secret guard ──────────────────────────────────────────────────
  const internalSecret  = Deno.env.get('INTERNAL_SECRET')     ?? ''
  const providedSecret  = req.headers.get('x-internal-secret') ?? ''

  if (!internalSecret || providedSecret !== internalSecret) {
    return respond({ error: 'Unauthorized' }, 401)
  }

  // ── Read secrets ───────────────────────────────────────────────────────────
  const supabaseUrl        = Deno.env.get('SUPABASE_URL')              ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[dispatch] FATAL: missing Supabase env secrets')
    return respond({ error: 'Server misconfiguration' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // ── Claim a batch of pending rows ──────────────────────────────────────────
  // claim_pending_emails() uses FOR UPDATE SKIP LOCKED so concurrent
  // invocations never process the same row twice.
  let rows: EmailRow[]

  try {
    const { data, error } = await supabase.rpc('claim_pending_emails', {
      p_batch_size: BATCH_SIZE,
    })

    if (error) {
      console.error('[dispatch] failed to claim pending emails:', error.message)
      return respond({ error: 'Failed to claim email batch' }, 500)
    }

    rows = (data ?? []) as EmailRow[]
  } catch (err) {
    console.error('[dispatch] unexpected error claiming emails:', err)
    return respond({ error: 'Unexpected error claiming email batch' }, 500)
  }

  if (rows.length === 0) {
    console.log('[dispatch] no pending emails — nothing to do')
    return respond({ dispatched: 0, failed: 0, skipped: 0 })
  }

  console.log(`[dispatch] claimed ${rows.length} email(s) for dispatch`)

  // ── Derive the send-email function URL ────────────────────────────────────
  // send-email lives in the same Supabase project so we build its URL from
  // SUPABASE_URL: https://<ref>.supabase.co → https://<ref>.supabase.co/functions/v1/send-email
  const sendEmailUrl = supabaseUrl.replace(/\/$/, '') + '/functions/v1/send-email'

  // ── Dispatch each row ─────────────────────────────────────────────────────
  let dispatchedCount = 0
  let failedCount     = 0
  let skippedCount    = 0

  for (const row of rows) {
    const result = await callSendEmail(sendEmailUrl, internalSecret, row)

    if (result.skipped) {
      // send-email reported the email was already sent (idempotency guard)
      skippedCount++
      await markEmailStatus(supabase, row.id, 'sent', null, row.attempt_count)
      continue
    }

    if (result.ok) {
      dispatchedCount++
      // send-email already updated email_log internally — no double-write needed.
      // We log success here for observability.
      console.log(
        `[dispatch] sent: id=${row.id} type=${row.email_type} user=${row.user_id}`,
      )
      continue
    }

    // Send failed
    failedCount++
    const permanently = result.permanently_failed ?? false
    console.warn(
      `[dispatch] failed: id=${row.id} type=${row.email_type} user=${row.user_id}` +
      ` permanent=${permanently} error=${result.error ?? 'unknown'}`,
    )

    if (permanently) {
      // send-email already set status='failed' — nothing more to do here.
      continue
    }

    // Transient failure: reset status back to 'pending' so the next cron
    // cycle picks it up again (send-email increments attempt_count).
    await markEmailStatus(supabase, row.id, 'pending', result.error ?? 'send failed', row.attempt_count + 1)
  }

  console.log(
    `[dispatch] batch complete — sent=${dispatchedCount} failed=${failedCount} skipped=${skippedCount}`,
  )

  return respond({ dispatched: dispatchedCount, failed: failedCount, skipped: skippedCount })
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Calls the send-email edge function for a single email_log row.
 * Never throws — all errors are caught and returned as a result object.
 */
async function callSendEmail(
  url:            string,
  internalSecret: string,
  row:            EmailRow,
): Promise<SendEmailResult> {
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), SEND_TIMEOUT)

  try {
    const response = await fetch(url, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':      'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        user_id:         row.user_id,
        email_type:      row.email_type,
        idempotency_key: row.idempotency_key,
      }),
    })

    const body = await response.json() as SendEmailResult

    if (!response.ok) {
      return {
        ok:    false,
        error: body?.error ?? `HTTP ${response.status}`,
      }
    }

    return body
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isTimeout = msg.includes('aborted') || msg.includes('timeout')

    console.error(
      `[dispatch] callSendEmail error for row ${row.id}: ${msg}`,
    )

    return {
      ok:    false,
      error: isTimeout ? 'send-email timed out' : `Network error: ${msg}`,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Directly updates email_log status for a given row id.
 * Used only for rows that need status reset after a transient failure
 * or that were already-sent (skipped). send-email handles its own
 * email_log updates for all other outcomes.
 */
async function markEmailStatus(
  supabase:      ReturnType<typeof createClient>,
  id:            number,
  status:        string,
  lastError:     string | null,
  attemptCount:  number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_log')
      .update({
        status,
        last_error:    lastError,
        attempt_count: attemptCount,
        ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
      })
      .eq('id', id)

    if (error) {
      console.error(`[dispatch] failed to update email_log id=${id}:`, error.message)
    }
  } catch (err) {
    console.error(`[dispatch] unexpected error updating email_log id=${id}:`, err)
  }
}

/**
 * Returns a JSON response.
 */
function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}