/**
 * TrialPage — handles /trial/:token
 *
 * Three states:
 *   1. User is not logged in  → show sign-up prompt, store token, redirect after auth
 *   2. User is logged in      → auto-redeem, redirect to dashboard
 *   3. Token is invalid/used  → show a clear error message
 */
import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useRouter } from '../router'
import { invokeRedeemTrial } from '../lib/api'
import { Button } from '../components/ui/index'
import { IlluRocket, IlluSuccess, IlluAccessDenied } from '../components/illustrations'

const PENDING_TRIAL_KEY = 'feedio_pending_trial'

const ERROR_MESSAGES = {
  invalid_token:        'This trial link is invalid or has been removed.',
  token_expired:        'This trial link has expired.',
  token_exhausted:      'This trial link has reached its maximum number of uses.',
  already_redeemed:     'You have already redeemed this trial link.',
  already_on_paid_plan: "You're already on a paid plan — no trial needed!",
}

export default function TrialPage({ params }) {
  const token = params?.token ?? ''
  const { currentUser, refreshCurrentUser } = useApp()
  const { navigate } = useRouter()

  const [status, setStatus]   = useState('idle')  // idle | redeeming | success | error
  const [errorKey, setErrorKey] = useState('')
  const [trialDays, setTrialDays] = useState(30)

  // ── If user is already logged in, redeem immediately ──────────────────────
  useEffect(() => {
    if (!token) return
    if (!currentUser) {
      // Stash the token so we can redeem after sign-in/sign-up
      sessionStorage.setItem(PENDING_TRIAL_KEY, token)
      return
    }
    redeem(token)
  }, [currentUser, token])

  async function redeem(t) {
    setStatus('redeeming')
    const { data, error } = await invokeRedeemTrial(t)

    if (error || !data?.ok) {
      const key = error?.message ?? 'invalid_token'
      setErrorKey(ERROR_MESSAGES[key] ? key : 'invalid_token')
      setStatus('error')
      return
    }

    sessionStorage.removeItem(PENDING_TRIAL_KEY)
    setTrialDays(data.trial_days ?? 30)
    setStatus('success')

    // Refresh the user profile so the dashboard shows the Pro badge immediately
    if (refreshCurrentUser) await refreshCurrentUser()

    // Redirect to dashboard after a short pause so the user sees the success message
    setTimeout(() => navigate('/dashboard'), 2800)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!token) {
    return <PageShell><ErrorCard message="No trial token found in this URL." /></PageShell>
  }

  if (status === 'error') {
    return (
      <PageShell>
        <ErrorCard message={ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.invalid_token} />
      </PageShell>
    )
  }

  if (status === 'success') {
    return (
      <PageShell>
        <div className="text-center">
          <div className="flex justify-center mb-4"><IlluSuccess size={88} /></div>
          <h1 className="text-[22px] font-extrabold text-[#111827] mb-2"
            style={{ fontFamily: "'Fraunces', serif" }}>
            You're on Pro!
          </h1>
          <p className="text-[14px] text-[#6B7280] mb-1">
            Your {trialDays}-day free trial is now active.
          </p>
          <p className="text-[13px] text-[#9CA3AF]">Taking you to the dashboard…</p>
        </div>
      </PageShell>
    )
  }

  if (status === 'redeeming') {
    return (
      <PageShell>
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-[#1a2e28] flex items-center justify-center
            mx-auto mb-5 animate-pulse">
            <IlluRocket size={22} />
          </div>
          <p className="text-[14px] font-semibold text-[#374151]">Activating your trial…</p>
        </div>
      </PageShell>
    )
  }

  // idle state — user is not logged in yet
  return (
    <PageShell>
      <div className="text-center">
        <div className="flex justify-center mb-5"><IlluRocket size={88} /></div>
        <div className="inline-flex items-center gap-2 bg-[#CCFBF1] text-teal-700
          text-[11px] font-semibold px-3 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Early access — free trial
        </div>
        <h1 className="text-[26px] font-extrabold text-[#111827] mb-3 leading-tight"
          style={{ fontFamily: "'Fraunces', serif" }}>
          You've been invited to try Feedio Pro free for 30 days
        </h1>
        <p className="text-[14px] text-[#6B7280] mb-7 max-w-sm mx-auto">
          Unlimited boards, unlimited feedback, private boards — no credit card needed.
          Just create an account and your trial activates instantly.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate(`/#signup?trial=${token}`)}
          >
            Create free account →
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="outline"
            onClick={() => navigate(`/#login?trial=${token}`)}
          >
            I already have an account
          </Button>
        </div>
        <p className="text-[11px] text-[#D1D5DB] mt-6">
          No credit card required. Cancel any time.
        </p>
      </div>
    </PageShell>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center pt-14 px-6">
      <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm
        max-w-md w-full px-8 py-10">
        {children}
      </div>
    </div>
  )
}

function ErrorCard({ message }) {
  const { navigate } = useRouter()
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4"><IlluAccessDenied size={80} /></div>
      <h2 className="text-[18px] font-bold text-[#111827] mb-2">Trial link issue</h2>
      <p className="text-[13px] text-[#6B7280] mb-6">{message}</p>
      <Button variant="outline" onClick={() => navigate('/')}>Go home</Button>
    </div>
  )
}