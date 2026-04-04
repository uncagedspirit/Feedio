/**
 * AppContext — single source of truth for auth + data.
 *
 * When VITE_SUPABASE_URL is set:  uses real Supabase auth + database.
 * When it is not set (demo mode): falls back to localStorage mock data.
 */
import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
} from 'react'
import { supabase, SUPABASE_ENABLED } from '../lib/supabase'
import { openProCheckout } from '../lib/stripe'
import { MOCK_BOARDS, MOCK_POSTS, MOCK_USERS } from '../data/mockData'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

// ─── LOCAL STORAGE KEYS (demo mode) ─────────────────────────────────────────
const LS = {
  USER: 'feedio_user', BOARDS: 'feedio_boards',
  POSTS: 'feedio_posts', VOTES: 'feedio_votes', FP: 'feedio_fingerprint',
}
const ls_get = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch { return fb } }
const ls_set = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

function getFingerprint() {
  let fp = localStorage.getItem(LS.FP)
  if (!fp) { fp = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2); localStorage.setItem(LS.FP, fp) }
  return fp
}

// ─── GRADIENT LOOKUP ─────────────────────────────────────────────────────────
const GRADIENT_MAP = {
  '#14B8A6': 'from-teal-600 to-emerald-500',   '#8B5CF6': 'from-violet-600 to-purple-500',
  '#F97316': 'from-orange-500 to-amber-400',   '#EF4444': 'from-rose-500 to-red-400',
  '#3B82F6': 'from-blue-600 to-sky-500',       '#EC4899': 'from-pink-500 to-rose-400',
  '#22C55E': 'from-green-500 to-emerald-400',  '#EAB308': 'from-yellow-500 to-amber-400',
}
const toGradient = (c) => GRADIENT_MAP[c] ?? 'from-teal-600 to-emerald-500'

// ─── ROW CONVERTERS ───────────────────────────────────────────────────────────
const dbBoard = (r) => ({
  id: r.id, slug: r.slug, name: r.name, tagline: r.tagline,
  description: r.description, website: r.website,
  accentColor: r.accent_color, headerGradient: r.header_gradient,
  visibility: r.visibility, ownerId: r.owner_id,
  ownerName: r.owner_name, ownerAvatarInitials: r.owner_avatar_initials,
  ownerAvatarColor: r.owner_avatar_color, tags: r.tags, settings: r.settings,
  totalInteractions: r.total_interactions, createdAt: r.created_at?.slice(0, 10) ?? '',
})

const dbPost = (r) => ({
  id: r.id, boardId: r.board_id, title: r.title, description: r.description,
  authorName: r.author_name, authorEmail: r.author_email, upvotes: r.upvotes,
  status: r.status, tag: r.tag, pinned: r.pinned, trending: r.trending,
  createdAt: r.created_at?.slice(0, 10) ?? '',
})

const dbProfile = (p, email) => ({
  id: p.id, name: p.name, email: email ?? '',
  plan: p.plan, avatarInitials: p.avatar_initials, avatarColor: p.avatar_color,
})

// ─── PROVIDER ────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [boards,  setBoards]  = useState(() => SUPABASE_ENABLED ? [] : ls_get(LS.BOARDS, MOCK_BOARDS))
  const [posts,   setPosts]   = useState(() => SUPABASE_ENABLED ? [] : ls_get(LS.POSTS,  MOCK_POSTS))
  const [myVotes, setMyVotes] = useState(() => new Set(ls_get(LS.VOTES, [])))
  const fp = useRef(getFingerprint())

  useEffect(() => { if (!SUPABASE_ENABLED) ls_set(LS.BOARDS, boards) }, [boards])
  useEffect(() => { if (!SUPABASE_ENABLED) ls_set(LS.POSTS,  posts)  }, [posts])
  useEffect(() => { ls_set(LS.VOTES, [...myVotes]) }, [myVotes])

  // ── Fetch Supabase profile ───────────────────────────────────────────────
  const fetchProfile = useCallback(async (authUser) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    return data ? dbProfile(data, authUser.email) : null
  }, [])

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!SUPABASE_ENABLED) {
      setCurrentUser(ls_get(LS.USER, null))
      setAuthLoading(false)
      return
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) setCurrentUser(await fetchProfile(session.user))
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        setCurrentUser(await fetchProfile(session.user))
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // Re-fetch profile (call after Stripe redirect to pick up plan upgrade)
  const refreshCurrentUser = useCallback(async () => {
    if (!SUPABASE_ENABLED || !currentUser) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { const u = await fetchProfile(user); if (u) setCurrentUser(u) }
  }, [currentUser, fetchProfile])

  // ══ AUTH ══════════════════════════════════════════════════════════════════
  const login = useCallback(async (email, password) => {
    if (!SUPABASE_ENABLED) {
      const found = MOCK_USERS.find(u => u.email === email)
      const u = found ?? { id: `user-${Date.now()}`, name: email.split('@')[0], email,
        plan: 'free', avatarInitials: email.slice(0, 2).toUpperCase(), avatarColor: '#E0F2FE' }
      setCurrentUser(u); ls_set(LS.USER, u)
      return { ok: true, user: u }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }
    return { ok: true, user: await fetchProfile(data.user) }
  }, [fetchProfile])

  const signup = useCallback(async (name, email, password) => {
    if (!SUPABASE_ENABLED) {
      const initials = (name[0] + (name.split(' ')[1]?.[0] ?? name[1] ?? '')).toUpperCase()
      const u = { id: `user-${Date.now()}`, name, email, plan: 'free', avatarInitials: initials, avatarColor: '#CCFBF1' }
      setCurrentUser(u); ls_set(LS.USER, u)
      return { ok: true, user: u }
    }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) return { ok: false, error: error.message }
    await new Promise(r => setTimeout(r, 600)) // let trigger run
    const user = data.user ? await fetchProfile(data.user) : null
    return { ok: true, user }
  }, [fetchProfile])

  const logout = useCallback(async () => {
    if (!SUPABASE_ENABLED) { setCurrentUser(null); localStorage.removeItem(LS.USER); return }
    await supabase.auth.signOut()
    setCurrentUser(null)
  }, [])

  const upgradePlan = useCallback(async () => {
    if (!SUPABASE_ENABLED) {
      setCurrentUser(u => u ? { ...u, plan: 'pro' } : u)
      return { ok: true }
    }
    const { error } = await openProCheckout()
    return error ? { ok: false, error } : { ok: true }
  }, [])

  // ══ BOARDS ════════════════════════════════════════════════════════════════
  const loadBoards = useCallback(async () => {
    if (!SUPABASE_ENABLED) return
    const { data, error } = await supabase.from('boards').select('*').order('created_at', { ascending: false })
    if (!error) setBoards((data ?? []).map(dbBoard))
  }, [])

  useEffect(() => { if (SUPABASE_ENABLED) loadBoards() }, [loadBoards])

  const getBoardBySlug  = useCallback((slug) => boards.find(b => b.slug === slug) ?? null, [boards])
  const getUserBoards   = useCallback((uid)  => boards.filter(b => b.ownerId === uid),     [boards])
  const getPublicBoards = useCallback(()     => boards.filter(b => b.visibility === 'public'), [boards])

  const createBoard = useCallback(async (data) => {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 40)
      + '-' + Date.now().toString(36)
    const row = {
      slug, name: data.name, tagline: data.tagline ?? '', description: data.description ?? '',
      website: data.website ?? '', accent_color: data.accentColor ?? '#14B8A6',
      header_gradient: toGradient(data.accentColor), visibility: data.visibility ?? 'public',
      owner_id: data.ownerId, owner_name: data.ownerName,
      owner_avatar_initials: data.ownerAvatarInitials, owner_avatar_color: data.ownerAvatarColor,
      tags: data.tags ?? ['Feature', 'Bug', 'Other'],
      settings: { requireName: data.settings?.requireName ?? true, requireEmail: data.settings?.requireEmail ?? false,
        allowAnonymous: data.settings?.allowAnonymous ?? false, showVoterCount: data.settings?.showVoterCount ?? true },
      total_interactions: 0,
    }
    if (!SUPABASE_ENABLED) {
      const board = dbBoard({ ...row, id: `board-${Date.now()}`, created_at: new Date().toISOString() })
      setBoards(prev => [board, ...prev]); return board
    }
    const { data: ins, error } = await supabase.from('boards').insert(row).select().single()
    if (error) { console.error('[boards] create:', error); return null }
    const board = dbBoard(ins)
    setBoards(prev => [board, ...prev]); return board
  }, [])

  const updateBoard = useCallback(async (boardId, updates) => {
    const row = {}
    if (updates.settings          != null) row.settings           = updates.settings
    if (updates.name              != null) row.name               = updates.name
    if (updates.visibility        != null) row.visibility         = updates.visibility
    if (updates.totalInteractions != null) row.total_interactions = updates.totalInteractions
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b))
    if (!SUPABASE_ENABLED) return
    const { error } = await supabase.from('boards').update(row).eq('id', boardId)
    if (error) { console.error('[boards] update:', error); loadBoards() }
  }, [loadBoards])

  const deleteBoard = useCallback(async (boardId) => {
    setBoards(prev => prev.filter(b => b.id !== boardId))
    setPosts(prev => prev.filter(p => p.boardId !== boardId))
    if (!SUPABASE_ENABLED) return
    await supabase.from('boards').delete().eq('id', boardId)
  }, [])

  // ══ POSTS ═════════════════════════════════════════════════════════════════
  const loadBoardPosts = useCallback(async (boardId) => {
    if (!SUPABASE_ENABLED) return
    const { data, error } = await supabase.from('posts').select('*').eq('board_id', boardId).order('created_at', { ascending: false })
    if (!error) setPosts(prev => [...prev.filter(p => p.boardId !== boardId), ...(data ?? []).map(dbPost)])
  }, [])

  const getBoardPosts = useCallback((boardId) => posts.filter(p => p.boardId === boardId), [posts])

  const addPost = useCallback(async (boardId, data) => {
    const row = {
      board_id: boardId, title: data.title, description: data.description ?? '',
      author_name: data.authorName ?? 'Anonymous', author_email: data.authorEmail ?? '',
      tag: data.tag ?? 'Feature', status: 'open',
    }
    if (!SUPABASE_ENABLED) {
      const post = dbPost({ ...row, id: `post-${Date.now()}`, upvotes: 0, pinned: false, trending: false, created_at: new Date().toISOString() })
      setPosts(prev => [post, ...prev])
      setBoards(prev => prev.map(b => b.id === boardId ? { ...b, totalInteractions: (b.totalInteractions ?? 0) + 1 } : b))
      return post
    }
    const { data: ins, error } = await supabase.from('posts').insert(row).select().single()
    if (error) { console.error('[posts] add:', error); return null }
    const post = dbPost(ins)
    setPosts(prev => [post, ...prev])
    // Increment board counter (using Supabase RPC or manual update)
    await supabase.from('boards').update({ total_interactions: (getBoardBySlug('') || {}).totalInteractions }).eq('id', boardId)
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, totalInteractions: (b.totalInteractions ?? 0) + 1 } : b))
    return post
  }, [getBoardBySlug])

  const updatePost = useCallback(async (postId, updates) => {
    const row = {}
    if (updates.status      != null) row.status      = updates.status
    if (updates.pinned      != null) row.pinned      = updates.pinned
    if (updates.trending    != null) row.trending    = updates.trending
    if (updates.title       != null) row.title       = updates.title
    if (updates.description != null) row.description = updates.description
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p))
    if (!SUPABASE_ENABLED) return
    await supabase.from('posts').update(row).eq('id', postId)
  }, [])

  const deletePost = useCallback(async (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
    if (!SUPABASE_ENABLED) return
    await supabase.from('posts').delete().eq('id', postId)
  }, [])

  // ══ UPVOTES ═══════════════════════════════════════════════════════════════
  const loadMyVotes = useCallback(async (boardId) => {
    if (!SUPABASE_ENABLED) return
    const { data } = await supabase.from('upvotes').select('post_id').eq('board_id', boardId).eq('fingerprint', fp.current)
    if (data?.length) setMyVotes(prev => { const next = new Set(prev); data.forEach(r => next.add(r.post_id)); return next })
  }, [])

  const hasVoted = useCallback((postId) => myVotes.has(postId), [myVotes])

  const toggleUpvote = useCallback(async (postId, boardId) => {
    const voted = myVotes.has(postId)
    const delta = voted ? -1 : 1
    setMyVotes(prev => { const next = new Set(prev); voted ? next.delete(postId) : next.add(postId); return next })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: p.upvotes + delta } : p))
    // NOTE: upvote toggles do NOT increment totalInteractions.
    // Interactions are counted as: number of posts submitted to this board.
    // This prevents gaming the free-plan limit by upvote-toggling.

    if (!SUPABASE_ENABLED) return

    if (voted) {
      await supabase.from('upvotes').delete().eq('post_id', postId).eq('fingerprint', fp.current)
    } else {
      await supabase.from('upvotes').insert({ post_id: postId, board_id: boardId, fingerprint: fp.current })
    }
    // Sync real upvote count from DB
    const { data: post } = await supabase.from('posts').select('upvotes').eq('id', postId).single()
    if (post) setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: post.upvotes } : p))
  }, [myVotes])

  /**
   * canInteract — returns true if a consumer can submit a new request on this board.
   * Limit is based solely on the number of posts (submissions) on the board,
   * not upvote toggles. Free boards allow 25 submitted posts.
   */
  const canInteract = useCallback((board) => {
    if (!board) return false
    let ownerPlan = 'free'
    if (currentUser?.id === board.ownerId) ownerPlan = currentUser.plan ?? 'free'
    else ownerPlan = MOCK_USERS.find(u => u.id === board.ownerId)?.plan ?? 'free'
    if (ownerPlan === 'pro') return true
    // Count actual posts instead of the running totalInteractions counter
    const boardPostCount = posts.filter(p => p.boardId === board.id).length
    return boardPostCount < 25
  }, [currentUser, posts])

  const value = {
    currentUser, authLoading,
    login, signup, logout, upgradePlan, refreshCurrentUser,
    boards, getBoardBySlug, getUserBoards, getPublicBoards,
    createBoard, updateBoard, deleteBoard, loadBoards,
    posts, getBoardPosts, addPost, updatePost, deletePost, loadBoardPosts,
    toggleUpvote, hasVoted, canInteract, loadMyVotes,
    isDemo: !SUPABASE_ENABLED,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
