import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { useRouter } from '../../router'
import { Modal, Input, Button } from '../ui/index'
import { Icons } from '../ui/Icons'

export default function AuthModal({ open, onClose, initialTab = 'login', onSuccess }) {
  const { login, signup } = useApp()
  const { navigate }      = useRouter()

  const [tab,     setTab]     = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Login
  const [loginEmail,    setLoginEmail]    = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw,   setShowLoginPw]   = useState(false)

  // Signup
  const [signupName,     setSignupName]     = useState('')
  const [signupEmail,    setSignupEmail]    = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [showSignupPw,   setShowSignupPw]   = useState(false)

  // Sync tab when prop changes
  useEffect(() => { setTab(initialTab) }, [initialTab])

  const reset = () => {
    setError(''); setLoading(false)
    setLoginEmail(''); setLoginPassword('')
    setSignupName(''); setSignupEmail(''); setSignupPassword('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginEmail) return setError('Email is required')
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 350))
    const result = login(loginEmail, loginPassword)
    setLoading(false)
    if (result.ok) {
      onSuccess?.(result.user)
      handleClose()
      navigate('/dashboard')
    } else {
      setError('Invalid credentials')
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!signupName)  return setError('Name is required')
    if (!signupEmail) return setError('Email is required')
    if (signupPassword.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 450))
    const result = signup(signupName, signupEmail, signupPassword)
    setLoading(false)
    if (result.ok) {
      onSuccess?.(result.user)
      handleClose()
      navigate('/dashboard')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-sm">
      {/* Logo */}
      <div className="flex justify-center mb-5 -mt-1">
        <div className="w-9 h-9 rounded-xl bg-[#1a2e28] flex items-center justify-center">
          <Icons.Inbox size={16} className="text-[#CCFBF1]" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[#F3F4F6] rounded-xl mb-5">
        {['login', 'signup'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all
              ${tab === t ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}
          >
            {t === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[12px] text-rose-600">
          {error}
        </div>
      )}

      {tab === 'login' ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="Email" type="email" placeholder="you@example.com"
            value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required
          />
          <Input
            label="Password" type={showLoginPw ? 'text' : 'password'} placeholder="Your password"
            value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
            rightElement={
              <button type="button" onClick={() => setShowLoginPw(v => !v)} className="text-[#9CA3AF] hover:text-[#374151]">
                {showLoginPw ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
              </button>
            }
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-[11px] text-[#9CA3AF]">
            No account?{' '}
            <button type="button" onClick={() => setTab('signup')} className="text-teal-600 font-semibold hover:underline">
              Create one
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <Input
            label="Your name" type="text" placeholder="Jane Smith"
            value={signupName} onChange={e => setSignupName(e.target.value)} required
          />
          <Input
            label="Email" type="email" placeholder="you@example.com"
            value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required
          />
          <Input
            label="Password" type={showSignupPw ? 'text' : 'password'} placeholder="Min. 6 characters"
            value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
            rightElement={
              <button type="button" onClick={() => setShowSignupPw(v => !v)} className="text-[#9CA3AF] hover:text-[#374151]">
                {showSignupPw ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
              </button>
            }
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
          <p className="text-center text-[11px] text-[#9CA3AF]">
            Already have an account?{' '}
            <button type="button" onClick={() => setTab('login')} className="text-teal-600 font-semibold hover:underline">
              Sign in
            </button>
          </p>
        </form>
      )}

      <div className="mt-5 pt-4 border-t border-[#F3F4F6] text-center">
        <p className="text-[10px] text-[#D1D5DB]">Demo — any email & password works</p>
      </div>
    </Modal>
  )
}
