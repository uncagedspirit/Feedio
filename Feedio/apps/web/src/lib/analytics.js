/**
 * analytics.js — unified analytics layer
 *
 * Wraps Plausible (page views, goals) and PostHog (user behaviour,
 * funnels, session recordings). Import this everywhere you need to
 * track something. Never call Plausible or PostHog directly.
 *
 * Plausible:  auto-tracks page views via script tag; we use it for
 *             custom goal events (board created, post submitted, etc.)
 * PostHog:    full product analytics — identity, funnels, sessions.
 *
 * Both are no-ops when their env vars are absent (demo mode).
 */

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN ?? ''
const POSTHOG_KEY      = import.meta.env.VITE_POSTHOG_KEY      ?? ''
const POSTHOG_HOST     = import.meta.env.VITE_POSTHOG_HOST     ?? 'https://app.posthog.com'

// ─── PLAUSIBLE ────────────────────────────────────────────────────────────────

/**
 * Fires a Plausible custom event (goal).
 * window.plausible is injected by the <script> tag in index.html.
 * Safe to call even if the script hasn't loaded yet.
 *
 * @param {string} goal   - name of the goal/event, e.g. 'Board Created'
 * @param {object} [props] - up to 10 custom properties (strings/numbers)
 */
export function trackGoal(goal, props = {}) {
  if (!PLAUSIBLE_DOMAIN) return
  try {
    window.plausible?.(goal, { props })
  } catch (err) {
    console.warn('[analytics] plausible trackGoal error:', err)
  }
}

// ─── POSTHOG ──────────────────────────────────────────────────────────────────

let _ph = null

/**
 * Initialises PostHog. Called once from main.jsx.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initPostHog() {
  if (!POSTHOG_KEY) return
  if (_ph) return

  try {
    const { default: posthog } = await import('posthog-js')
    posthog.init(POSTHOG_KEY, {
      api_host:                POSTHOG_HOST,
      // Don't capture page views automatically — we handle them in the router
      // so we can fire them with custom properties (page title, board slug, etc.)
      capture_pageview:        false,
      // Session recordings — opt in explicitly
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,         // never capture passwords/emails in recordings
        maskInputOptions: { password: true, email: true },
      },
      // Respect DNT headers
      respect_dnt: true,
      // Batch events for performance
      batch_requests: true,
      // Don't track bots
      opt_out_capturing_by_default: false,
      bootstrap: {
        distinctID: undefined,
      },
    })
    _ph = posthog
  } catch (err) {
    console.warn('[analytics] posthog init error:', err)
  }
}

/** Returns the PostHog client (may be null if not initialised). */
export function getPostHog() {
  return _ph
}

/**
 * Identifies the current user in PostHog.
 * Call this after login/signup and on app boot when a session exists.
 *
 * @param {object} user - currentUser from AppContext
 */
export function identifyUser(user) {
  if (!_ph || !user?.id) return
  try {
    _ph.identify(user.id, {
      name:   user.name,
      email:  user.email,
      plan:   user.plan,
    })
  } catch (err) {
    console.warn('[analytics] posthog identify error:', err)
  }
}

/**
 * Resets PostHog identity (call on logout).
 */
export function resetIdentity() {
  if (!_ph) return
  try {
    _ph.reset()
  } catch (err) {
    console.warn('[analytics] posthog reset error:', err)
  }
}

/**
 * Fires a PostHog event.
 *
 * @param {string} event      - snake_case event name, e.g. 'board_created'
 * @param {object} [properties] - arbitrary properties
 */
export function track(event, properties = {}) {
  if (!_ph) return
  try {
    _ph.capture(event, properties)
  } catch (err) {
    console.warn('[analytics] posthog capture error:', err)
  }
}

/**
 * Fires a page view in PostHog.
 * Call this from the router whenever the path changes.
 *
 * @param {string} path  - current pathname
 * @param {string} title - human-readable page title
 */
export function trackPageView(path, title) {
  if (!_ph) return
  try {
    _ph.capture('$pageview', {
      $current_url: window.location.href,
      $pathname:    path,
      title,
    })
  } catch (err) {
    console.warn('[analytics] posthog pageview error:', err)
  }
}

// ─── COMBINED EVENTS ──────────────────────────────────────────────────────────
// These helpers fire both Plausible (for aggregated goal counts) and PostHog
// (for per-user funnel analysis). Import these in components instead of calling
// trackGoal/track individually.

export const Analytics = {
  /** User signed up */
  signup(user) {
    trackGoal('Signup', { plan: user.plan })
    track('user_signed_up', { plan: user.plan })
  },

  /** User logged in */
  login(user) {
    identifyUser(user)
    track('user_logged_in', { plan: user.plan })
  },

  /** User logged out */
  logout() {
    track('user_logged_out')
    resetIdentity()
  },

  /** User created a board */
  boardCreated(board) {
    trackGoal('Board Created', { visibility: board.visibility })
    track('board_created', {
      board_id:   board.id,
      visibility: board.visibility,
      tags_count: board.tags?.length ?? 0,
    })
  },

  /** User submitted a feedback post */
  postSubmitted(board, post) {
    trackGoal('Post Submitted', { tag: post.tag, board_slug: board.slug })
    track('post_submitted', {
      board_id:   board.id,
      board_slug: board.slug,
      tag:        post.tag,
      anonymous:  !post.authorEmail,
    })
  },

  /** User upvoted a post */
  postUpvoted(post, board) {
    track('post_upvoted', {
      post_id:    post.id,
      board_id:   board.id,
      board_slug: board.slug,
      post_tag:   post.tag,
    })
  },

  /** User opened the upgrade/checkout flow */
  upgradeStarted(source) {
    trackGoal('Upgrade Started', { source })
    track('upgrade_started', { source })
  },

  /** User completed checkout (Dodo webhook fires first, but we track UI too) */
  upgradeCompleted() {
    trackGoal('Upgrade Completed')
    track('upgrade_completed')
  },

  /** Admin changed a post status */
  postStatusChanged(post, newStatus) {
    track('post_status_changed', {
      post_id:    post.id,
      old_status: post.status,
      new_status: newStatus,
    })
  },

  /** User shared / copied a board link */
  boardLinkCopied(board) {
    trackGoal('Board Link Copied', { board_slug: board.slug })
    track('board_link_copied', { board_id: board.id, board_slug: board.slug })
  },

  /** Board page view (includes board metadata) */
  boardViewed(board) {
    track('board_viewed', {
      board_id:     board.id,
      board_slug:   board.slug,
      owner_plan:   'unknown', // filled from context if needed
      post_count:   'unknown',
    })
  },
}