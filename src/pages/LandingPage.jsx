import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useRouter } from '../router'
import { useFadeIn } from '../hooks/useFadeIn'
import { Icons } from '../components/ui/Icons'
import { Button } from '../components/ui/index'
import BoardCard from '../components/boards/BoardCard'

/* ─────────────────────────────────────────────────────────────────────────
   HERO MOCKUP — mini preview of a live board
───────────────────────────────────────────────────────────────────────── */
function HeroMockup() {
  const cards = [
    { id: 'h1', title: 'Dark mode support',       votes: 142, tag: 'Feature',     color: '#CCFBF1', border: '#5EEAD4', voted: false },
    { id: 'h2', title: 'CSV export for reports',  votes: 98,  tag: 'Feature',     color: '#EDE9FE', border: '#C4B5FD', voted: true  },
    { id: 'h3', title: 'Login 500 on OAuth flow', votes: 54,  tag: 'Bug',         color: '#FFE4E6', border: '#FDA4AF', voted: false },
  ]
  const [voted, setVoted] = useState('h2')

  return (
    <div className="relative w-full max-w-[460px] mx-auto select-none">
      <div className="absolute -inset-8 -z-10 bg-gradient-to-br from-teal-100/60 via-emerald-50/30 to-transparent rounded-full blur-3xl" />
      <div className="bg-white rounded-2xl shadow-xl border border-[#F3F4F6] overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a2e28] px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-bold text-[14px]">Acma AI — Feedback</p>
              <p className="text-teal-300/70 text-[11px]">Vote for what to build next</p>
            </div>
            <span className="text-[10px] font-bold text-teal-300 bg-teal-800/50 px-2 py-1 rounded-full">3 open</span>
          </div>
        </div>
        {/* Cards */}
        <div className="p-3 flex flex-col gap-2.5">
          {cards.map(c => (
            <div
              key={c.id}
              className="flex items-stretch rounded-xl border overflow-hidden transition-all hover:shadow-sm"
              style={{ backgroundColor: c.color, borderColor: c.border }}
            >
              <button
                onClick={() => setVoted(v => v === c.id ? null : c.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 min-w-[44px] border-r transition-colors
                  ${voted === c.id ? 'bg-teal-500/20 text-teal-700' : 'text-gray-500'}`}
                style={{ borderColor: c.border }}
              >
                <Icons.ArrowUp size={11} />
                <span className="text-[11px] font-bold">{voted === c.id ? c.votes + 1 : c.votes}</span>
              </button>
              <div className="flex-1 px-3 py-2.5">
                <p className="text-[12px] font-semibold text-[#111827] mb-1">{c.title}</p>
                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-white/50 rounded-full text-gray-500">{c.tag}</span>
              </div>
            </div>
          ))}
          <button className="w-full py-2 text-[12px] font-medium text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors">
            + Submit a request
          </button>
        </div>
        <div className="px-4 py-2.5 border-t border-[#F3F4F6] bg-[#FAFAFA] text-center">
          <span className="text-[10px] text-[#D1D5DB]">Powered by <span className="font-semibold text-[#9CA3AF]">feedio</span></span>
        </div>
      </div>
    </div>
  )
}

/* ─── SECTION FADE WRAPPER ──────────────────────────────────────────────── */
function Fade({ children, delay = 0, className = '' }) {
  const [ref, visible] = useFadeIn(delay)
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── LANDING PAGE ──────────────────────────────────────────────────────── */
export default function LandingPage({ onAuthClick }) {
  const { getPublicBoards, currentUser } = useApp()
  const { navigate } = useRouter()
  const publicBoards = getPublicBoards()

  return (
    <div className="min-h-screen bg-white text-[#111827]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-28 pb-20 px-6">
        {/* Gradient blobs */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-teal-50 via-emerald-50/40 to-transparent rounded-full -translate-y-1/3 translate-x-1/4 -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-violet-50/50 to-transparent rounded-full translate-y-1/2 -translate-x-1/4 -z-10" />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#CCFBF1] text-teal-700 text-[11px] font-semibold px-3 py-1.5 rounded-full mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              Free to start — no credit card needed
            </div>

            <h1
              className="text-[48px] md:text-[58px] font-extrabold leading-[1.05] tracking-tight text-[#111827] mb-5"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Build what your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
                users actually want.
              </span>
            </h1>

            <p className="text-[16px] text-[#6B7280] leading-relaxed mb-8 max-w-[440px]">
              A shareable feedback board where your users vote on features, report bugs,
              and shape your roadmap. Noise-free signal, in minutes.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Button size="lg" onClick={() => currentUser ? navigate('/dashboard') : onAuthClick('signup')}>
                Create your board free
                <Icons.ArrowUp size={15} style={{ transform: 'rotate(45deg)' }} />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/boards')}>
                See live examples
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {['#CCFBF1', '#EDE9FE', '#FFEDD5', '#FFE4E6', '#E0F2FE'].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-semibold text-[#374151]" style={{ backgroundColor: c }}>
                    {['AR', 'MK', 'JS', 'PL', 'TW'][i]}
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#9CA3AF]">
                Trusted by <span className="font-semibold text-[#374151]">indie founders</span> & early SaaS teams
              </p>
            </div>
          </div>

          {/* Right — hero mockup */}
          <HeroMockup />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          <Fade>
            <div className="text-center mb-14">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-teal-600 mb-3">Simple by design</p>
              <h2 className="text-[36px] font-extrabold text-[#111827] leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                Live in under 60 seconds
              </h2>
            </div>
          </Fade>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { n: '01', icon: Icons.Zap,      title: 'Create',  body: 'Sign up and instantly get a shareable feedback board. No setup wizard, no long onboarding.' },
              { n: '02', icon: Icons.Link,     title: 'Share',   body: 'Drop the link in your app, docs, or email footer. Users land on a clean, focused board.' },
              { n: '03', icon: Icons.BarChart, title: 'Decide',  body: 'Votes surface the most-wanted items. You see clearly what to build next — not just what was asked.' },
            ].map((item, i) => (
              <Fade key={item.n} delay={i * 80}>
                <div className="bg-white rounded-2xl border border-[#F3F4F6] p-7 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] flex items-center justify-center text-teal-600">
                      <item.icon size={18} />
                    </div>
                    <span className="text-[11px] font-extrabold text-[#E5E7EB] tracking-wider">{item.n}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#111827] mb-2">{item.title}</h3>
                  <p className="text-[13px] text-[#6B7280] leading-relaxed">{item.body}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PUBLIC BOARDS (free marketing) ── */}
      {publicBoards.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <Fade>
              <div className="text-center mb-4">
                <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-violet-600 mb-3">Made with feedio</p>
                <h2 className="text-[36px] font-extrabold text-[#111827] leading-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
                  Discover great products
                </h2>
                <p className="text-[14px] text-[#9CA3AF] max-w-sm mx-auto">
                  These teams use feedio to collect feedback publicly. Your board will appear here too.
                </p>
              </div>
            </Fade>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {publicBoards.slice(0, 3).map((board, i) => (
                <Fade key={board.id} delay={i * 80}>
                  <BoardCard board={board} />
                </Fade>
              ))}
            </div>
            <Fade delay={200}>
              <div className="text-center mt-8">
                <Button variant="outline" onClick={() => navigate('/boards')}>
                  View all public boards <Icons.ArrowUp size={13} style={{ transform: 'rotate(45deg)' }} />
                </Button>
              </div>
            </Fade>
          </div>
        </section>
      )}

      {/* ── PRICING ── */}
      <section className="py-24 px-6 bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto">
          <Fade>
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-teal-600 mb-3">Pricing</p>
              <h2 className="text-[36px] font-extrabold text-[#111827] leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                Simple. Fair. No surprises.
              </h2>
            </div>
          </Fade>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <Fade delay={0}>
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#9CA3AF] mb-4">Free</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-[42px] font-extrabold text-[#111827] leading-none" style={{ fontFamily: "'Fraunces', serif" }}>$0</span>
                  <span className="text-[13px] text-[#9CA3AF] mb-1">/ forever</span>
                </div>
                <p className="text-[13px] text-[#6B7280] mb-6">For founders just getting started.</p>
                <ul className="flex flex-col gap-2.5 mb-7">
                  {['1 public feedback board', '25 consumer interactions', 'Unlimited voters', 'Public board listing'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-[#374151]">
                      <span className="w-4 h-4 rounded-full bg-[#CCFBF1] flex items-center justify-center flex-shrink-0">
                        <Icons.Check size={10} className="text-teal-600" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" fullWidth onClick={() => onAuthClick('signup')}>Get started free</Button>
              </div>
            </Fade>
            {/* Pro */}
            <Fade delay={100}>
              <div className="relative bg-[#1a2e28] rounded-2xl p-8 overflow-hidden shadow-xl">
                <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(ellipse_at_70%_20%,#CCFBF1,transparent_60%)]" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-teal-400">Pro</p>
                    <span className="text-[10px] font-bold text-teal-300 bg-teal-800/50 px-2 py-1 rounded-full">Most popular</span>
                  </div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-[42px] font-extrabold text-white leading-none" style={{ fontFamily: "'Fraunces', serif" }}>$19</span>
                    <span className="text-[13px] text-teal-300/70 mb-1">/ month</span>
                  </div>
                  <p className="text-[13px] text-teal-200/70 mb-6">For teams ready to scale.</p>
                  <ul className="flex flex-col gap-2.5 mb-7">
                    {['Unlimited boards (public & private)', 'Unlimited interactions', 'Custom board domain', 'Status update notifications', 'Email export & analytics', 'Priority support'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-[13px] text-teal-100">
                        <span className="w-4 h-4 rounded-full bg-teal-700/50 flex items-center justify-center flex-shrink-0">
                          <Icons.Check size={10} className="text-teal-300" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className="w-full py-3 rounded-xl bg-teal-400 text-[#1a2e28] text-[14px] font-bold hover:bg-teal-300 transition-colors"
                    onClick={() => onAuthClick('signup')}>
                    Start free trial
                  </button>
                </div>
              </div>
            </Fade>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <Fade>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-[40px] font-extrabold text-[#111827] leading-tight mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
              Your users already have opinions.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
                Time to hear them.
              </span>
            </h2>
            <p className="text-[15px] text-[#9CA3AF] mb-8">
              Set up in seconds. No integrations. No onboarding. Just a link.
            </p>
            <Button size="lg" onClick={() => onAuthClick('signup')}>
              Create your board — it's free
            </Button>
          </div>
        </Fade>
      </section>
    </div>
  )
}
