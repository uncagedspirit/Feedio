/**
 * Navbar — glassmorphism header with a gradient accent stripe.
 *
 * Design:
 *   - 2 px rainbow-teal gradient line at the very top
 *   - bg-white/70 + backdrop-blur-2xl (glass panel)
 *   - Teal-tinted shadow line at bottom
 *   - Logo mark with hover glow
 *   - Active route pill: soft teal tint
 *   - CTA: gradient fill button
 */
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useRouter, Link } from '../../router'
import { Icons } from '../ui/Icons'
import { Avatar } from '../ui/index'

export default function Navbar({ onAuthClick }) {
  const { currentUser, logout } = useApp()
  const { path, navigate }      = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const active = (p) => path === p || path.startsWith(p + '/')

  return (
    <nav className="fixed top-0 left-0 right-0 z-40">
      {/* ── Gradient accent stripe (top 2 px) ── */}
      <div
        aria-hidden="true"
        style={{
          height: 2,
          background: 'linear-gradient(90deg, #2DD4BF 0%, #14B8A6 30%, #34D399 60%, #6EE7B7 100%)',
        }}
      />

      {/* ── Glass panel ── */}
      <div
        className="backdrop-blur-2xl border-b"
        style={{
          background: 'rgba(255,255,255,0.72)',
          borderBottomColor: 'rgba(20,184,166,0.12)',
          boxShadow: '0 1px 24px rgba(20,184,166,0.07), 0 0 0 0.5px rgba(20,184,166,0.08)',
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-13 flex items-center justify-between" style={{ height: 52 }}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300
                group-hover:shadow-[0_0_12px_rgba(20,184,166,0.5)] group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' }}
            >
              <Icons.Inbox size={14} className="text-white" />
            </div>
            <span
              className="text-[15px] font-extrabold tracking-tight text-[#0D2B24]
                group-hover:text-teal-700 transition-colors"
            >
              feedio
            </span>
          </Link>

          {/* Centre nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            <NavPill
              label="Boards"
              active={active('/boards')}
              onClick={() => navigate('/boards')}
            />
            {currentUser && (
              <NavPill
                label="Dashboard"
                active={active('/dashboard')}
                onClick={() => navigate('/dashboard')}
              />
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <UserMenu
                user={currentUser}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                navigate={navigate}
                logout={logout}
              />
            ) : (
              <>
                <button
                  onClick={() => onAuthClick('login')}
                  className="text-[13px] font-medium text-[#6B7280] hover:text-[#111827]
                    px-3 py-1.5 rounded-xl hover:bg-teal-50 transition-all"
                >
                  Sign in
                </button>
                <GradientButton onClick={() => onAuthClick('signup')}>
                  Get started
                </GradientButton>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// ─── NAV PILL ────────────────────────────────────────────────────────────────
function NavPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-xl transition-all duration-200
        ${active
          ? 'bg-teal-50 text-teal-700 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.2)]'
          : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
        }`}
    >
      {label}
    </button>
  )
}

// ─── GRADIENT CTA BUTTON ─────────────────────────────────────────────────────
function GradientButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-[13px] font-semibold text-white px-4 py-1.5 rounded-xl
        transition-all duration-200 hover:-translate-y-px
        hover:shadow-[0_4px_14px_rgba(13,148,136,0.4)]"
      style={{
        background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 60%, #34D399 100%)',
        boxShadow: '0 1px 6px rgba(13,148,136,0.25)',
      }}
    >
      {children}
    </button>
  )
}

// ─── USER MENU ───────────────────────────────────────────────────────────────
function UserMenu({ user, menuOpen, setMenuOpen, navigate, logout }) {
  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-teal-50 transition-colors group"
      >
        <Avatar initials={user.avatarInitials} color={user.avatarColor} size="sm" />
        <span className="hidden md:block text-[13px] font-semibold text-[#374151] max-w-[110px] truncate group-hover:text-teal-700 transition-colors">
          {user.name}
        </span>
        <Icons.ChevronDown size={13} className="text-[#9CA3AF] transition-transform duration-200"
          style={{ transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-20"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(20,184,166,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(20,184,166,0.08)',
            }}
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-[#F3F4F6]">
              <p className="text-[13px] font-bold text-[#111827] truncate">{user.name}</p>
              <p className="text-[11px] text-[#9CA3AF] truncate">{user.email}</p>
              <span
                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={user.plan === 'pro'
                  ? { background: '#EDE9FE', color: '#6D28D9' }
                  : { background: '#F3F4F6', color: '#6B7280' }
                }
              >
                {user.plan === 'pro' ? <><Icons.Crown size={9} /> Pro</> : 'Free plan'}
              </span>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <DropItem icon={<Icons.LayoutGrid size={14} />}
                onClick={() => { navigate('/dashboard'); setMenuOpen(false) }}>
                Dashboard
              </DropItem>
              <DropItem icon={<Icons.Settings size={14} />}
                onClick={() => setMenuOpen(false)}>
                Settings
              </DropItem>
            </div>
            <div className="py-1 border-t border-[#F9FAFB]">
              <DropItem icon={<Icons.LogOut size={14} />}
                onClick={() => { logout(); setMenuOpen(false) }} danger>
                Sign out
              </DropItem>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DropItem({ icon, onClick, children, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-colors
        ${danger
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-[#374151] hover:bg-teal-50 hover:text-teal-700'
        }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {children}
    </button>
  )
}
