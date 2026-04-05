/**
 * Supabase Edge Function: process-pending-emails
 *
 * Reads pending rows from email_log and dispatches each one by invoking
 * the send-email edge function sequentially. Triggered every 15 minutes
 * by a pg_cron job.
 *
 * Deploy:
 *   supabase functions deploy process-pending-emails
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   INTERNAL_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BATCH_SIZE   = 50
const MAX_ATTEMPTS = 3

// ─── TYPES ────────────────────────────────────────────────────────────────────

// id is uuid in the database (string in TypeScript)
interface EmailLogRow {
  id:              string
  user_id:         string
  email_type:      string
  idempotency_key: string
  attempt_count:   number
  status:          string
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── Internal secret guard ──────────────────────────────────────────────────
  const internalSecret = Deno.env.get('INTERNAL_SECRET') ?? ''
  const providedSecret = req.headers.get('x-internal-secret') ?? ''

  if (!internalSecret || providedSecret !== internalSecret) {
    return respond({ error: 'Unauthorized' }, 401)
  }

  // ── Read secrets ───────────────────────────────────────────────────────────
  const supabaseUrl        = Deno.env.get('SUPABASE_URL')              ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[process-pending-emails] FATAL: missing Supabase env secrets')
    return respond({ error: 'Server misconfiguration' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // ── Query pending email_log rows ───────────────────────────────────────────
  let rows: EmailLogRow[]

  try {
    const { data, error } = await supabase
      .from('email_log')
      .select('id, user_id, email_type, idempotency_key, attempt_count, status')
      .eq('status', 'pending')
      .lt('attempt_count', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      console.error('[process-pending-emails] failed to query email_log:', error.message)
      return respond({ error: 'Database query failed' }, 500)
    }

    rows = (data ?? []) as EmailLogRow[]
  } catch (err) {
    console.error('[process-pending-emails] unexpected error querying email_log:', err)
    return respond({ error: 'Unexpected database error' }, 500)
  }

  if (rows.length === 0) {
    console.log('[process-pending-emails] no pending emails found — nothing to do')
    return respond({ processed: 0, errors: 0 })
  }

  console.log(`[process-pending-emails] found ${rows.length} pending email(s) to dispatch`)

  // ── Dispatch each row sequentially ────────────────────────────────────────
  // Sequential (not parallel) to avoid overwhelming Sender.net rate limits.
  let processedCount = 0
  let errorCount     = 0

  for (const row of rows) {
    try {
      console.log(
        `[process-pending-emails] invoking send-email: ` +
        `id=${row.id} type=${row.email_type} user=${row.user_id} attempt=${row.attempt_count + 1}`,
      )

      const { error: invokeError } = await supabase.functions.invoke('send-email', {
        body: {
          user_id:         row.user_id,
          email_type:      row.email_type,
          idempotency_key: row.idempotency_key,
        },
        headers: {
          'x-internal-secret': internalSecret,
        },
      })

      if (invokeError) {
        // send-email returned an application-level error response.
        // send-email manages its own email_log updates for these cases —
        // we just count it as an error for this batch's summary.
        console.warn(
          `[process-pending-emails] send-email returned error for id=${row.id}: `,
          invokeError.message ?? JSON.stringify(invokeError),
        )
        errorCount++
      } else {
        // Success: send-email has already updated email_log status to 'sent'
        processedCount++
      }
    } catch (err) {
      // send-email was unreachable, timed out, or threw at the network level.
      // Do NOT mark as failed — only send-email marks permanent failures.
      // Increment attempt_count so we back off if the function stays down.
      const msg = err instanceof Error ? err.message : String(err)
      console.error(
        `[process-pending-emails] invoke threw for id=${row.id} (${row.email_type}): ${msg}`,
      )
      errorCount++

      await incrementAttemptCount(supabase, row.id, row.attempt_count, msg)
    }
  }

  console.log(
    `[process-pending-emails] batch complete — processed=${processedCount} errors=${errorCount}`,
  )

  return respond({ processed: processedCount, errors: errorCount })
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Increments attempt_count on a specific email_log row.
 * Called ONLY when the send-email function was unreachable at the network/
 * invocation level — not for normal send failures (send-email handles those).
 */
async function incrementAttemptCount(
  supabase:      ReturnType<typeof createClient>,
  id:            string,
  currentCount:  number,
  errorMessage:  string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_log')
      .update({
        attempt_count: currentCount + 1,
        last_error:    `send-email function unreachable: ${errorMessage}`,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error(
        `[process-pending-emails] failed to increment attempt_count for id=${id}:`,
        error.message,
      )
    }
  } catch (err) {
    console.error(
      `[process-pending-emails] unexpected error incrementing attempt_count for id=${id}:`,
      err,
    )
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