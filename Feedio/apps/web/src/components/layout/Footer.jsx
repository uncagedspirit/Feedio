/**
 * Footer — distinctive dark editorial footer.
 *
 * Design:
 *   - Deep forest-green canvas (#0b1d16)
 *   - Radial teal glow from bottom-centre
 *   - Dot-grid texture overlay (pure CSS, no images)
 *   - Giant "feedio" watermark — outlined, ultra-low opacity
 *   - Curved SVG wave at top to break the straight border
 *   - Three-column layout: brand | nav | tagline
 *   - Gradient rule separator before copyright strip
 */
import { Link, useRouter } from '../../router'
import { Icons } from '../ui/Icons'

const BG      = '#0b1d16'
const TEAL    = '#14B8A6'
const TEAL_DIM = 'rgba(20,184,166,0.08)'

export default function Footer() {
  const { navigate } = useRouter()
  const year = new Date().getFullYear()

  return (
    <footer style={{ backgroundColor: BG, position: 'relative', overflow: 'hidden' }}>

      {/* ── Wave top border ── */}
      <div aria-hidden="true" style={{ marginBottom: -2 }}>
        <svg
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: 64 }}
        >
          <path
            d="M0 40 C240 80 480 0 720 32 C960 64 1200 8 1440 40 L1440 0 L0 0 Z"
            fill="#FAFAFA"
          />
        </svg>
      </div>

      {/* ── Dot grid overlay (CSS only) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(20,184,166,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ── Radial teal glow ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 800, height: 400,
          background: 'radial-gradient(ellipse at bottom, rgba(20,184,166,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Giant watermark wordmark ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: -10, left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 180,
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: 'transparent',
          WebkitTextStroke: '1px rgba(20,184,166,0.06)',
          whiteSpace: 'nowrap',
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        feedio
      </div>

      {/* ── Main content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Column 1 — brand */}
            <div>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 mb-4 group"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center
                    transition-all duration-300 group-hover:scale-105
                    group-hover:shadow-[0_0_16px_rgba(20,184,166,0.5)]"
                  style={{ background: 'linear-gradient(135deg,#0D9488,#14B8A6)' }}
                >
                  <Icons.Inbox size={15} className="text-white" />
                </div>
                <span
                  className="text-[18px] font-extrabold tracking-tight group-hover:text-teal-400 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  feedio
                </span>
              </button>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 1.65 }} className="max-w-[220px]">
                Collect feedback from your users. Build what actually matters.
              </p>

              {/* Accent bar */}
              <div
                className="mt-6 h-px w-16 rounded-full"
                style={{ background: 'linear-gradient(90deg, #14B8A6, transparent)' }}
              />
            </div>

            {/* Column 2 — navigation */}
            <div>
              <p
                className="text-[10px] font-extrabold tracking-widest uppercase mb-4"
                style={{ color: 'rgba(20,184,166,0.6)' }}
              >
                Navigate
              </p>
              <nav className="flex flex-col gap-2.5">
                {[
                  { label: 'Home',      to: '/'          },
                  { label: 'Boards',    to: '/boards'    },
                  { label: 'Dashboard', to: '/dashboard' },
                  { label: 'Pricing',   to: '/'          },
                ].map(({ label, to }) => (
                  <Link
                    key={label}
                    to={to}
                    className="text-[13px] font-medium w-fit transition-all duration-200
                      hover:translate-x-1 cursor-pointer"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#14B8A6' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Column 3 — built-with / tagline */}
            <div>
              <p
                className="text-[10px] font-extrabold tracking-widest uppercase mb-4"
                style={{ color: 'rgba(20,184,166,0.6)' }}
              >
                Product
              </p>
              <nav className="flex flex-col gap-2.5">
                {['Privacy', 'Terms', 'Contact'].map(label => (
                  <Link
                    key={label}
                    to="/"
                    className="text-[13px] font-medium w-fit transition-all duration-200 hover:translate-x-1"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#14B8A6' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Built-for badge */}
              <div
                className="mt-8 inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(20,184,166,0.06)',
                  border: '1px solid rgba(20,184,166,0.14)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: TEAL }}
                />
                <span className="text-[11px] font-semibold" style={{ color: 'rgba(20,184,166,0.8)' }}>
                  Built for indie founders
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Gradient separator ── */}
        <div className="max-w-6xl mx-auto px-6">
          <div
            className="h-px w-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(20,184,166,0.3) 30%, rgba(20,184,166,0.3) 70%, transparent 100%)',
            }}
          />
        </div>

        {/* ── Copyright strip ── */}
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            © {year} feedio — all rights reserved
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Made with care · Powered by Supabase &amp; Stripe
          </p>
        </div>
      </div>
    </footer>
  )
}
