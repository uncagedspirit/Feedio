/**
 * Supabase Edge Function: admin-api
 *
 * Internal admin-only API for the Feedio owner dashboard.
 * Guarded by ADMIN_USER_IDS secret — only listed user IDs can call this.
 *
 * Deploy:
 *   supabase functions deploy admin-api
 *
 * Required secrets:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_USER_IDS  — comma-separated list of allowed Supabase user UUIDs
 *                     e.g. "abc-123,def-456"
 *
 * Request body: { action: string, ...params }
 *
 * Actions:
 *   get_stats
 *   get_users        { page?, per_page?, search? }
 *   get_trial_links
 *   create_trial_link { label, max_uses, trial_days, expires_days? }
 *   deactivate_trial_link { link_id }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // ── Secrets ────────────────────────────────────────────────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')              ?? ''
  const serviceKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const adminUserIds   = (Deno.env.get('ADMIN_USER_IDS') ?? '').split(',').map(s => s.trim()).filter(Boolean)

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfiguration' }, 500)
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  let userId: string
  try {
    const { data, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (error || !data.user) return json({ error: 'Unauthorized' }, 401)
    userId = data.user.id
  } catch {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── Admin guard ────────────────────────────────────────────────────────────
  if (adminUserIds.length > 0 && !adminUserIds.includes(userId)) {
    return json({ error: 'Forbidden: not an admin' }, 403)
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const action = body?.action as string
  if (!action) return json({ error: 'action is required' }, 400)

  // ── Route ──────────────────────────────────────────────────────────────────

  // ── get_stats ──────────────────────────────────────────────────────────────
  if (action === 'get_stats') {
    const { data, error } = await supabase.rpc('admin_get_stats')
    if (error) {
      console.error('[admin-api] admin_get_stats:', error.message)
      return json({ error: 'Failed to fetch stats' }, 500)
    }
    return json({ stats: data })
  }

  // ── get_users ──────────────────────────────────────────────────────────────
  if (action === 'get_users') {
    const page     = Math.max(1, Number(body.page)     || 1)
    const perPage  = Math.min(100, Number(body.per_page) || 20)
    const search   = (body.search as string) || null
    const offset   = (page - 1) * perPage

    const { data, error } = await supabase.rpc('admin_get_users', {
      p_limit:  perPage,
      p_offset: offset,
      p_search: search,
    })

    if (error) {
      console.error('[admin-api] admin_get_users:', error.message)
      return json({ error: 'Failed to fetch users' }, 500)
    }

    // Get total count for pagination
    const { count, error: countErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    return json({ users: data ?? [], total: count ?? 0, page, per_page: perPage })
  }

  // ── get_trial_links ────────────────────────────────────────────────────────
  if (action === 'get_trial_links') {
    const { data, error } = await supabase
      .from('trial_links')
      .select(`
        id, token, label, max_uses, use_count, trial_days,
        expires_at, is_active, created_at,
        trial_redemptions ( count )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[admin-api] get_trial_links:', error.message)
      return json({ error: 'Failed to fetch trial links' }, 500)
    }
    return json({ trial_links: data ?? [] })
  }

  // ── create_trial_link ──────────────────────────────────────────────────────
  if (action === 'create_trial_link') {
    const label       = (body.label as string)   || ''
    const maxUses     = Math.max(1, Math.min(10000, Number(body.max_uses)   || 100))
    const trialDays   = Math.max(1, Math.min(365,   Number(body.trial_days) || 30))
    const expiresDays = Math.max(1, Math.min(730,   Number(body.expires_days) || 90))

    // Generate a 24-char hex token
    const tokenBytes  = new Uint8Array(16)
    crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24)

    const { data, error } = await supabase
      .from('trial_links')
      .insert({
        token,
        label,
        created_by:  userId,
        max_uses:    maxUses,
        trial_days:  trialDays,
        expires_at:  new Date(Date.now() + expiresDays * 86400000).toISOString(),
        is_active:   true,
        use_count:   0,
      })
      .select()
      .single()

    if (error) {
      console.error('[admin-api] create_trial_link:', error.message)
      return json({ error: 'Failed to create trial link' }, 500)
    }

    console.log(`[admin-api] trial link created by ${userId}: token=${token} max_uses=${maxUses}`)
    return json({ trial_link: data })
  }

  // ── deactivate_trial_link ──────────────────────────────────────────────────
  if (action === 'deactivate_trial_link') {
    const linkId = body.link_id as string
    if (!linkId) return json({ error: 'link_id is required' }, 400)

    const { error } = await supabase
      .from('trial_links')
      .update({ is_active: false })
      .eq('id', linkId)

    if (error) {
      console.error('[admin-api] deactivate_trial_link:', error.message)
      return json({ error: 'Failed to deactivate link' }, 500)
    }

    return json({ ok: true })
  }

  return json({ error: `Unknown action: ${action}` }, 400)
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}