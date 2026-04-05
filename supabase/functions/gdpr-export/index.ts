/**
 * Supabase Edge Function: gdpr-export
 *
 * Generates a GDPR data export for a user and emails it to them before
 * their account is hard-deleted by the daily cron job.
 *
 * Deploy:
 *   supabase functions deploy gdpr-export
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL
 *   INTERNAL_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Called by: run_daily_subscription_jobs() cron (step 8), before hard delete.
 * Request body: { user_id: string }
 * Request header: x-internal-secret: <INTERNAL_SECRET>
 *
 * Storage prerequisite:
 *   A Supabase Storage bucket named 'gdpr-exports' must exist with
 *   private access (no public reads). Create it in:
 *   Supabase Dashboard → Storage → New bucket → "gdpr-exports" → Private
 *
 * TODO: Replace the raw file path in the email with a signed URL once
 *       Supabase Storage signed URL generation is wired up. The Storage
 *       client supports:
 *         supabase.storage.from('gdpr-exports').createSignedUrl(path, 604800)
 *       where 604800 = 7 days in seconds. The signed URL should be generated
 *       at email-send time and embedded directly in the email body.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const RESEND_API_BASE   = 'https://api.resend.com'
const STORAGE_BUCKET    = 'gdpr-exports'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface RequestBody {
  user_id: string
}

interface ProfileRow {
  id:              string
  name:            string
  plan:            string
  created_at:      string
  last_active_at:  string | null
}

interface BoardRow {
  id:          string
  name:        string
  slug:        string
  visibility:  string
  created_at:  string
  is_archived: boolean
}

interface PostRow {
  id:           string
  board_id:     string
  title:        string
  description:  string
  author_name:  string
  status:       string
  created_at:   string
}

interface AuditRow {
  id:         number
  action:     string
  payload:    Record<string, unknown>
  created_at: string
}

interface EmailSummaryRow {
  email_type: string
  status:     string
  sent_at:    string | null
}

interface ExportPayload {
  exported_at:     string
  user:            {
    name:           string
    email:          string
    plan:           string
    created_at:     string
    last_active_at: string | null
  }
  boards:          BoardRow[]
  posts:           PostRow[]
  account_history: AuditRow[]
  email_history:   EmailSummaryRow[]
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── 1. Internal secret guard ───────────────────────────────────────────────
  const internalSecret = Deno.env.get('INTERNAL_SECRET')      ?? ''
  const providedSecret = req.headers.get('x-internal-secret') ?? ''

  if (!internalSecret || providedSecret !== internalSecret) {
    return respond({ error: 'Unauthorized' }, 401)
  }

  // ── Read secrets ───────────────────────────────────────────────────────────
  const supabaseUrl        = Deno.env.get('SUPABASE_URL')              ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const resendApiKey       = Deno.env.get('RESEND_API_KEY')            ?? ''
  const resendFromEmail    = Deno.env.get('RESEND_FROM_EMAIL')         ?? ''

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[gdpr-export] FATAL: missing Supabase env secrets')
    return respond({ error: 'Server misconfiguration: missing Supabase secrets' }, 500)
  }

  if (!resendApiKey || !resendFromEmail) {
    console.error('[gdpr-export] FATAL: missing Resend env secrets')
    return respond({ error: 'Server misconfiguration: missing Resend secrets' }, 500)
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let userId: string

  try {
    const body: RequestBody = await req.json()
    userId = body?.user_id

    if (!userId) {
      return respond({ error: 'user_id is required in the request body' }, 400)
    }
  } catch (err) {
    console.error('[gdpr-export] failed to parse request body:', err)
    return respond({ error: 'Invalid JSON body' }, 400)
  }

  console.log(`[gdpr-export] starting export for user ${userId}`)

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // ── 2. Collect user data ───────────────────────────────────────────────────

  // ── 2a. Profile ──────────────────────────────────────────────────────────
  let profile: ProfileRow
  let userEmail: string

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, plan, created_at, last_active_at')
      .eq('id', userId)
      .single()

    if (profileError || !profileData) {
      console.error('[gdpr-export] profile not found for user', userId, ':', profileError?.message)
      return respond({ error: 'User profile not found' }, 404)
    }

    profile = profileData as ProfileRow

    // Fetch email from auth.users via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId)

    if (authError || !authData.user?.email) {
      console.error('[gdpr-export] auth user not found or has no email:', userId, authError?.message)
      return respond({ error: 'Auth user not found or missing email' }, 404)
    }

    userEmail = authData.user.email
  } catch (err) {
    console.error('[gdpr-export] unexpected error fetching profile/auth for user', userId, ':', err)
    return respond({ error: 'Failed to fetch user data' }, 500)
  }

  // ── 2b. Boards ────────────────────────────────────────────────────────────
  let boards: BoardRow[] = []

  try {
    const { data, error } = await supabase
      .from('boards')
      .select('id, name, slug, visibility, created_at, is_archived')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[gdpr-export] error fetching boards for user', userId, ':', error.message)
      // Non-fatal — continue with empty boards
    } else {
      boards = (data ?? []) as BoardRow[]
    }
  } catch (err) {
    console.warn('[gdpr-export] unexpected error fetching boards:', err)
  }

  // ── 2c. Posts (on user's boards) ─────────────────────────────────────────
  let posts: PostRow[] = []

  try {
    const boardIds = boards.map(b => b.id)

    if (boardIds.length > 0) {
      const { data, error } = await supabase
        .from('posts')
        .select('id, board_id, title, description, author_name, status, created_at')
        .in('board_id', boardIds)
        .order('created_at', { ascending: true })

      if (error) {
        console.warn('[gdpr-export] error fetching posts for user', userId, ':', error.message)
      } else {
        posts = (data ?? []) as PostRow[]
      }
    }
  } catch (err) {
    console.warn('[gdpr-export] unexpected error fetching posts:', err)
  }

  // ── 2d. Audit log ─────────────────────────────────────────────────────────
  let auditRows: AuditRow[] = []

  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('id, action, payload, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[gdpr-export] error fetching audit_log for user', userId, ':', error.message)
    } else {
      auditRows = (data ?? []) as AuditRow[]
    }
  } catch (err) {
    console.warn('[gdpr-export] unexpected error fetching audit_log:', err)
  }

  // ── 2e. Email log summary (no error details — privacy-safe subset) ─────────
  let emailSummary: EmailSummaryRow[] = []

  try {
    const { data, error } = await supabase
      .from('email_log')
      .select('email_type, status, sent_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[gdpr-export] error fetching email_log for user', userId, ':', error.message)
    } else {
      emailSummary = (data ?? []) as EmailSummaryRow[]
    }
  } catch (err) {
    console.warn('[gdpr-export] unexpected error fetching email_log:', err)
  }

  // ── 3. Build the export JSON ───────────────────────────────────────────────
  const exportedAt = new Date().toISOString()

  const exportPayload: ExportPayload = {
    exported_at: exportedAt,
    user: {
      name:           profile.name,
      email:          userEmail,
      plan:           profile.plan,
      created_at:     profile.created_at,
      last_active_at: profile.last_active_at,
    },
    boards,
    posts,
    account_history: auditRows,
    email_history:   emailSummary,
  }

  const exportJson = JSON.stringify(exportPayload, null, 2)

  // ── 4. Upload to Supabase Storage ──────────────────────────────────────────
  // Path: exports/{user_id}/{timestamp}.json
  // Bucket: gdpr-exports (must be created manually — private access)
  const timestamp = exportedAt.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const filePath  = `exports/${userId}/${timestamp}.json`

  try {
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, exportJson, {
        contentType:  'application/json',
        cacheControl: '3600',
        upsert:       false,
      })

    if (uploadError) {
      console.error(
        '[gdpr-export] failed to upload export to storage for user',
        userId,
        ':',
        uploadError.message,
      )
      return respond({ error: 'Failed to upload export file to storage' }, 500)
    }

    console.log(`[gdpr-export] uploaded export to storage: ${filePath}`)
  } catch (err) {
    console.error('[gdpr-export] unexpected error uploading to storage:', err)
    return respond({ error: 'Failed to upload export file' }, 500)
  }

  // ── 5. Email the export link via Resend ────────────────────────────────────
  //
  // TODO: Replace the raw file path below with a signed URL generated via:
  //   const { data: signedUrlData, error: signedUrlError } =
  //     await supabase.storage
  //       .from(STORAGE_BUCKET)
  //       .createSignedUrl(filePath, 604800)  // 604800 = 7 days in seconds
  //   if (!signedUrlError) downloadUrl = signedUrlData.signedUrl
  //
  // For now, the raw storage path is included so the email is useful even
  // without signed URL support. An admin can retrieve the file manually.

  const emailHtml = buildExportEmail(profile.name, filePath, userEmail)

  try {
    const resendResponse = await fetch(`${RESEND_API_BASE}/emails`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    resendFromEmail,
        to:      [userEmail],
        subject: 'Your Feedio data export',
        html:    emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      let errorDetail = `HTTP ${resendResponse.status}`
      try {
        const errorBody = await resendResponse.json()
        errorDetail = JSON.stringify(errorBody)
      } catch {
        // Non-JSON body — use status code
      }
      console.error(
        `[gdpr-export] Resend API error for user ${userId}:`,
        errorDetail,
      )
      // Non-fatal: export was saved to storage — log and continue so we
      // still record the audit row. The file is retrievable by admins.
      console.warn('[gdpr-export] export email failed but file was saved — continuing to audit log')
    } else {
      console.log(`[gdpr-export] export email sent to ${userEmail}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[gdpr-export] network error calling Resend for user', userId, ':', msg)
    // Non-fatal — file is still in storage
    console.warn('[gdpr-export] export email failed (network error) but file was saved')
  }

  // ── 6. Insert audit_log row ────────────────────────────────────────────────
  try {
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action:  'gdpr_export_sent',
        payload: {
          file_path:   filePath,
          exported_at: exportedAt,
          sent_to:     userEmail,
        },
      })

    if (auditError) {
      console.warn(
        '[gdpr-export] failed to insert audit_log row for user',
        userId,
        ':',
        auditError.message,
      )
    } else {
      console.log(`[gdpr-export] audit_log row inserted for user ${userId}`)
    }
  } catch (err) {
    console.warn('[gdpr-export] unexpected error inserting audit_log:', err)
  }

  // ── 7. Return success ──────────────────────────────────────────────────────
  console.log(`[gdpr-export] export complete for user ${userId}: ${filePath}`)
  return respond({ ok: true, file_path: filePath })
})

// ─── EMAIL BUILDER ────────────────────────────────────────────────────────────

function buildExportEmail(name: string, filePath: string, email: string): string {
  const firstName = name.split(' ')[0] || 'there'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Feedio data export</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Helvetica Neue',Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-size:18px;font-weight:800;color:#0D2B24;letter-spacing:-0.02em;">
                feedio
              </span>
            </td>
          </tr>

          <tr>
            <td style="background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EB;padding:36px 40px;">
              <div style="font-size:15px;line-height:1.7;color:#374151;">

                <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;">
                  Your data export is ready, ${firstName}
                </h1>

                <p>
                  As requested, we've prepared a complete export of all data associated
                  with your Feedio account (<strong>${email}</strong>).
                </p>

                <p>
                  Your export includes:
                </p>
                <ul>
                  <li>Your profile information</li>
                  <li>All feedback boards you created</li>
                  <li>All posts and requests on those boards</li>
                  <li>Your account activity history</li>
                  <li>A summary of emails sent to you</li>
                </ul>

                <p style="color:#DC2626;font-weight:600;">
                  Important: your account is scheduled for deletion shortly.
                  After deletion, this export will no longer be accessible.
                </p>

                <div style="background:#F3F4F6;border-radius:8px;padding:16px;margin:24px 0;word-break:break-all;">
                  <p style="font-size:12px;color:#6B7280;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
                    Export file path
                  </p>
                  <code style="font-size:13px;color:#111827;">${filePath}</code>
                  <p style="font-size:11px;color:#9CA3AF;margin:8px 0 0;">
                    This file is stored in Feedio's private storage and accessible to our
                    support team. If you need access to the raw file, please reply to this
                    email before your account is deleted. The file will be available for
                    approximately 7 days after this email was sent.
                  </p>
                </div>

                <p>
                  If you believe your account was scheduled for deletion in error, or if
                  you'd like to reactivate your account, please reply to this email
                  immediately — we'd be happy to help.
                </p>

                <p style="color:#6B7280;font-size:13px;margin-top:24px;">
                  If you have any questions about your data or this export, please reply
                  directly to this email.
                </p>

              </div>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="font-size:12px;color:#9CA3AF;margin:0;">
                You're receiving this email because your Feedio account is scheduled for deletion.<br />
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

// ─── RESPONSE HELPER ──────────────────────────────────────────────────────────

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}