import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────
   SVG ICON LIBRARY
   All icons share the same stroke style:
   strokeWidth=1.6, strokeLinecap=round,
   strokeLinejoin=round, no fill
───────────────────────────────────────── */
const Icon = ({ children, size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

const Icons = {
  Link: (p) => (
    <Icon {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Icon>
  ),
  Users: (p) => (
    <Icon {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  BarChart: (p) => (
    <Icon {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </Icon>
  ),
  ArrowUp: (p) => (
    <Icon {...p}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </Icon>
  ),
  Check: (p) => (
    <Icon {...p}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  ),
  Zap: (p) => (
    <Icon {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Icon>
  ),
  Inbox: (p) => (
    <Icon {...p}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </Icon>
  ),
  Target: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Icon>
  ),
  ExternalLink: (p) => (
    <Icon {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </Icon>
  ),
  Grid: (p) => (
    <Icon {...p}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </Icon>
  ),
  Flame: (p) => (
    <Icon {...p}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Icon>
  ),
};

/* ─────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────── */
const feedbackItems = [
  {
    id: 1,
    title: "Dark mode support",
    description:
      "Would love an option to switch to dark theme across the dashboard.",
    votes: 142,
    tag: "Feature",
    trending: true,
    status: "planned",
  },
  {
    id: 2,
    title: "CSV export for all reports",
    description:
      "Need to export billing and usage reports as CSV files monthly.",
    votes: 98,
    tag: "Feature",
    trending: false,
    status: "considering",
  },
  {
    id: 3,
    title: "Webhook support for new signups",
    description: "Fire a webhook event whenever a new user registers.",
    votes: 76,
    tag: "Integration",
    trending: false,
    status: "considering",
  },
  {
    id: 4,
    title: "Login page throws 500 on OAuth",
    description:
      "Google login fails intermittently, shows a server error page.",
    votes: 54,
    tag: "Bug",
    trending: false,
    status: "in-progress",
  },
];

const statusConfig = {
  planned: { label: "Planned", color: "bg-teal-50 text-teal-700" },
  considering: { label: "Considering", color: "bg-amber-50 text-amber-700" },
  "in-progress": { label: "In Progress", color: "bg-blue-50 text-blue-700" },
};

const tagConfig = {
  Feature: "bg-violet-50 text-violet-600",
  Integration: "bg-sky-50 text-sky-600",
  Bug: "bg-rose-50 text-rose-600",
};

/* ─────────────────────────────────────────
   CUSTOM HOOK — fade-in on scroll
───────────────────────────────────────── */
function useFadeIn(delay = 0) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
  return [ref, visible];
}

/* ─────────────────────────────────────────
   UPVOTE BUTTON (interactive)
───────────────────────────────────────── */
function UpvoteButton({ count }) {
  const [votes, setVotes] = useState(count);
  const [voted, setVoted] = useState(false);
  return (
    <button
      onClick={() => {
        setVoted((v) => !v);
        setVotes((v) => (voted ? v - 1 : v + 1));
      }}
      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all duration-200 min-w-[52px] select-none
        ${
          voted
            ? "border-[#4f7c6e] bg-[#4f7c6e]/8 text-[#4f7c6e]"
            : "border-[#e2ddd6] bg-white text-[#8a8279] hover:border-[#4f7c6e]/50 hover:text-[#4f7c6e]"
        }`}
    >
      <Icons.ArrowUp size={13} />
      <span className="text-xs font-semibold leading-none">{votes}</span>
    </button>
  );
}

/* ─────────────────────────────────────────
   FEEDBACK CARD
───────────────────────────────────────── */
function FeedbackCard({ item, delay = 0 }) {
  const [ref, visible] = useFadeIn(delay);
  const s = statusConfig[item.status];
  const t = tagConfig[item.tag];
  return (
    <div
      ref={ref}
      className={`group flex items-start gap-4 bg-white rounded-2xl border border-[#ede9e3] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] 
        hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{
        transition:
          "opacity 0.5s ease, transform 0.5s ease, box-shadow 0.3s ease",
      }}
    >
      <UpvoteButton count={item.votes} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[13px] font-semibold text-[#1d1a16] leading-snug">
            {item.title}
          </span>
          {item.trending && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
              <Icons.Flame size={10} /> Trending
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#8a8279] leading-relaxed mb-2 line-clamp-2">
          {item.description}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t}`}
          >
            {item.tag}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}
          >
            {s.label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PRODUCT MOCK — hero inline
───────────────────────────────────────── */
function HeroMock() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow */}
      <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-[#d4ede5]/60 via-[#f0ece5]/30 to-[#e8d5c4]/40 blur-2xl scale-110" />
      {/* Browser chrome */}
      <div className="rounded-2xl border border-[#ede9e3] bg-[#faf8f5] shadow-[0_8px_40px_rgba(0,0,0,0.10)] overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#ede9e3] bg-[#f5f2ed]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#e8b4a0]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#e8d4a0]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#a0c8b4]" />
          </div>
          <div className="flex-1 mx-4">
            <div className="h-5 rounded-md bg-[#ede9e3] flex items-center px-2.5 gap-1.5">
              <Icons.Grid size={10} className="text-[#b0a89e]" />
              <span className="text-[10px] text-[#b0a89e] font-medium">
                acme.feedio.io/board
              </span>
            </div>
          </div>
        </div>
        {/* Board header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#ede9e3]">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-sm font-bold text-[#1d1a16]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Acme — Feedback Board
            </span>
            <span className="text-[10px] text-[#4f7c6e] font-semibold bg-[#4f7c6e]/10 px-2 py-0.5 rounded-full">
              12 open
            </span>
          </div>
          <div className="flex gap-1.5">
            {["All", "Features", "Bugs", "Planned"].map((f, i) => (
              <button
                key={f}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors
                  ${i === 0 ? "bg-[#1d1a16] text-white" : "bg-[#ede9e3] text-[#8a8279] hover:bg-[#e2ddd6]"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {/* Cards */}
        <div className="p-3 space-y-2.5 max-h-[280px] overflow-hidden">
          {feedbackItems.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 bg-white rounded-xl border border-[#ede9e3] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border border-[#e2ddd6] text-[#8a8279] min-w-[38px]">
                <Icons.ArrowUp size={10} />
                <span className="text-[10px] font-bold leading-none">
                  {item.votes}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold text-[#1d1a16] truncate">
                    {item.title}
                  </span>
                  {item.trending && (
                    <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full shrink-0">
                      Trending
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#b0a89e] line-clamp-1 leading-relaxed">
                  {item.description}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${tagConfig[item.tag]}`}
                  >
                    {item.tag}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusConfig[item.status].color}`}
                  >
                    {statusConfig[item.status].label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#ede9e3] bg-[#f5f2ed] flex items-center justify-between">
          <span className="text-[10px] text-[#b0a89e]">Powered by Feedio</span>
          <button className="text-[10px] font-semibold text-[#4f7c6e] flex items-center gap-1 hover:opacity-70 transition-opacity">
            Add request <Icons.ExternalLink size={9} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   AVATAR ROW (social proof)
───────────────────────────────────────── */
function AvatarRow() {
  const initials = ["AR", "MK", "JS", "PL", "TW"];
  const colors = [
    "bg-[#d4ede5]",
    "bg-[#e8d5c4]",
    "bg-[#dde4f0]",
    "bg-[#f0dde8]",
    "bg-[#e8e8d0]",
  ];
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {initials.map((i, idx) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full ${colors[idx]} border-2 border-[#faf8f5] flex items-center justify-center`}
          >
            <span className="text-[9px] font-semibold text-[#4a4540]">{i}</span>
          </div>
        ))}
      </div>
      <span className="text-[12px] text-[#8a8279]">
        Used by{" "}
        <span className="text-[#4a4540] font-medium">indie founders</span> &
        early SaaS teams
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   SECTION FADE WRAPPER
───────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = "" }) {
  const [ref, visible] = useFadeIn(delay);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────── */
export default function FeedbackBoardLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

        * { box-sizing: border-box;}
        html { scroll-behavior: smooth; }

        body {
          background: #faf8f5;
          color: #1d1a16;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        ::selection {
          background: #d4ede5;
          color: #1d1a16;
        }

        .display {
          font-family: 'Cormorant Garamond', serif;
        }
      `}</style>

      <div
        className="min-h-screen bg-[#faf8f5] text-[#1d1a16]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── NAV ── */}
        <nav
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md border-b border-[#4f7c6e]/20 bg-[#4f7c6e]/8 shadow-[0_1px_12px_rgba(79,124,110,0.10)]`}
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#4f7c6e] flex items-center justify-center">
                <Icons.Inbox size={14} className="text-white" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-[#1d1a16]">
                feedio
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {["How it works", "Preview", "Pricing"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="text-[13px] text-[#8a8279] hover:text-[#1d1a16] transition-colors font-medium"
                >
                  {item}
                </a>
              ))}
            </div>
            <button className="bg-[#1d1a16] text-white text-[13px] font-medium px-4 py-2 rounded-xl hover:bg-[#2d2920] transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:-translate-y-px">
              Create board
            </button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="pt-32 pb-20 px-6 overflow-hidden relative">
          <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-32 right-[-120px] w-[900px] h-[900px] rounded-full bg-[#d4ede5]/70 blur-[140px]" />
          <div className="absolute top-[120px] right-[10%] w-[500px] h-[500px] rounded-full bg-[#e8d5c4]/50 blur-[120px]" />
          <div className="absolute top-[200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-[#dde8f0]/25 blur-[120px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#faf8f5]/30 to-[#faf8f5]" />
        </div>
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left */}
              <div>
                {/* Badge */}
                <FadeIn delay={0}>
                  <div className="inline-flex items-center gap-2 bg-white border border-[#ede9e3] rounded-full px-3 py-1.5 mb-8 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4f7c6e] animate-pulse" />
                    <span className="text-[11px] font-medium text-[#6a6259]">
                      Instant setup. No credit card needed.
                    </span>
                  </div>
                </FadeIn>

                {/* Headline */}
                <FadeIn delay={80}>
                  <h1 className="display text-[52px] md:text-[60px] leading-[1.08] tracking-tight text-[#1d1a16] mb-6">
                    Know exactly
                    <span className="block text-[#4f7c6e] italic">
                      what to build
                    </span>
                    next.
                  </h1>
                </FadeIn>

                <FadeIn delay={160}>
                  <p className="text-[16px] text-[#6a6259] leading-relaxed mb-8 max-w-[420px] font-light">
                    One shareable link. Your users post ideas, report bugs, and
                    vote on what matters most. You get signal, not noise.
                  </p>
                </FadeIn>

                <FadeIn delay={240}>
                  <div className="flex flex-wrap items-center gap-3 mb-10">
                    <button className="bg-[#1d1a16] text-white text-[14px] font-medium px-6 py-3 rounded-xl hover:bg-[#2d2920] transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 flex items-center gap-2">
                      Create your board
                      <Icons.ExternalLink size={14} />
                    </button>
                    <button className="bg-white text-[#4a4540] text-[14px] font-medium px-6 py-3 rounded-xl border border-[#ede9e3] hover:border-[#d4ede5] hover:bg-[#f5fbf8] transition-all duration-200 flex items-center gap-2">
                      View demo
                      <Icons.ExternalLink
                        size={14}
                        className="text-[#8a8279]"
                      />
                    </button>
                  </div>
                </FadeIn>

                <FadeIn delay={320}>
                  <AvatarRow />
                </FadeIn>
              </div>

              {/* Right — product mock */}
              <FadeIn delay={200} className="w-full">
                <HeroMock />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4f7c6e] mb-3">
                  Simple by design
                </p>
                <h2 className="display text-[38px] md:text-[44px] text-[#1d1a16] leading-tight">
                  Up and running in under a minute
                </h2>
              </div>
            </FadeIn>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  icon: Icons.Zap,
                  title: "Create",
                  body: "Sign up and generate a public feedback board. No setup wizard, no onboarding flow — just a link.",
                },
                {
                  step: "02",
                  icon: Icons.Link,
                  title: "Share",
                  body: "Drop the link in your app, docs, or email. Your users land on a clean board instantly.",
                },
                {
                  step: "03",
                  icon: Icons.BarChart,
                  title: "Decide",
                  body: "Votes bubble up the most-wanted items. You see clearly what to build, not just what was asked.",
                },
              ].map((item, i) => (
                <FadeIn key={item.step} delay={i * 100}>
                  <div className="relative group bg-white rounded-2xl border border-[#ede9e3] p-7 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                    {/* Connector line — desktop only */}
                    {i < 2 && (
                      <div className="hidden md:block absolute top-10 -right-3 w-6 border-t border-dashed border-[#ddd8d0] z-10" />
                    )}
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-10 h-10 rounded-xl bg-[#f0ece5] flex items-center justify-center text-[#4f7c6e] group-hover:bg-[#d4ede5] transition-colors duration-200">
                        <item.icon size={18} />
                      </div>
                      <span className="text-[11px] font-bold text-[#d0cbc3] tracking-wider">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-[17px] font-semibold text-[#1d1a16] mb-2">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-[#8a8279] leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT PREVIEW ── */}
        <section id="preview" className="py-24 px-6 bg-[#f5f2ed]">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center mb-14">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4f7c6e] mb-3">
                  Live board
                </p>
                <h2 className="display text-[38px] md:text-[44px] text-[#1d1a16] leading-tight mb-3">
                  This is what your users see
                </h2>
                <p className="text-[14px] text-[#8a8279] max-w-sm mx-auto">
                  A focused, distraction-free space where feedback actually
                  lands.
                </p>
              </div>
            </FadeIn>

            {/* Full board mock */}
            <FadeIn delay={100}>
              <div className="bg-white rounded-3xl border border-[#ede9e3] shadow-[0_8px_48px_rgba(0,0,0,0.08)] overflow-hidden max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#1d1a16] to-[#2d2820] px-7 py-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3
                        className="text-white font-semibold text-[17px] mb-0.5"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        Acme — Feature Requests
                      </h3>
                      <p className="text-[#b0a89e] text-[12px]">
                        Vote for what you want us to build next
                      </p>
                    </div>
                    <button className="bg-white/10 text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/10 flex items-center gap-1.5">
                      <Icons.Zap size={12} />
                      Add request
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {["All (12)", "Features", "Bugs"].map((f, i) => (
                      <button
                        key={f}
                        className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          i === 0
                            ? "bg-white/15 text-white border border-white/20"
                            : "text-[#b0a89e] hover:text-white"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Feedback list */}
                <div className="p-5 space-y-3">
                  {feedbackItems.map((item, i) => (
                    <FeedbackCard key={item.id} item={item} delay={i * 60} />
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-[#ede9e3] bg-[#faf8f5] text-center">
                  <span className="text-[11px] text-[#b0a89e]">
                    Powered by{" "}
                    <span className="font-medium text-[#8a8279]">feedio</span>
                  </span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── VALUE PROPS ── */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="text-center mb-14">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4f7c6e] mb-3">
                  Why it works
                </p>
                <h2 className="display text-[38px] md:text-[44px] text-[#1d1a16] leading-tight">
                  Built for outcomes, not process
                </h2>
              </div>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: Icons.Target,
                  title: "Stop guessing what to build",
                  body: "Votes don't lie. The most-wanted features float to the top automatically, giving you honest, unfiltered signal.",
                },
                {
                  icon: Icons.Inbox,
                  title: "All feedback in one place",
                  body: "No more sifting through emails, Slack threads, and support tickets. One URL captures everything.",
                },
                {
                  icon: Icons.Users,
                  title: "Let your users co-author the roadmap",
                  body: "When users feel heard, they stick around. Transparent voting builds trust before you've shipped a thing.",
                },
              ].map((item, i) => (
                <FadeIn key={item.title} delay={i * 100}>
                  <div className="group p-7 rounded-2xl border border-[#ede9e3] bg-white hover:border-[#c8e0d8] hover:shadow-[0_6px_24px_rgba(79,124,110,0.08)] transition-all duration-300">
                    <div className="w-10 h-10 rounded-xl bg-[#f0ece5] flex items-center justify-center text-[#4f7c6e] mb-5 group-hover:bg-[#d4ede5] transition-colors duration-200">
                      <item.icon size={18} />
                    </div>
                    <h3 className="text-[15px] font-semibold text-[#1d1a16] mb-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-[#8a8279] leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON / DIFFERENTIATION ── */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4f7c6e] mb-3">
                  Why switch
                </p>
                <h2 className="display text-[38px] md:text-[44px] text-[#1d1a16] leading-tight mb-3">
                  Built for speed. Not complexity.
                </h2>
                <p className="text-[14px] text-[#8a8279] max-w-sm mx-auto">
                  Most tools try to do everything. This one focuses on what actually matters.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={80}>
              <div className="max-w-2xl mx-auto">
                {/* Column headers */}
                <div className="grid grid-cols-2 gap-4 mb-5 px-5">
                  <p className="text-[11px] font-semibold tracking-[0.10em] uppercase text-[#c8c4be]">
                    Typical tools
                  </p>
                  <p className="text-[11px] font-semibold tracking-[0.10em] uppercase text-[#4f7c6e]">
                    feedio
                  </p>
                </div>

                {/* Rows */}
                <div className="bg-white rounded-2xl border border-[#ede9e3] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  {[
                    ["Setup takes time", "Live in seconds"],
                    ["Requires integrations", "Just share a link"],
                    ["Feature-heavy dashboards", "Focused, minimal interface"],
                    ["Scattered feedback", "All feedback in one place"],
                    ["Hard to prioritize", "Clear top requests instantly"],
                    ["Built for teams", "Built for speed"],
                  ].map(([before, after], i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-2 gap-4 px-5 py-4 items-center
                        ${i !== 0 ? "border-t border-[#f0ece7]" : ""}`}
                    >
                      {/* Left — muted */}
                      <div className="flex items-center gap-2.5">
                        <span className="w-1 h-1 rounded-full bg-[#d0cbc3] flex-shrink-0" />
                        <span className="text-[13px] text-[#b0a89e] leading-snug">
                          {before}
                        </span>
                      </div>
                      {/* Right — emphasized */}
                      <div className="flex items-center gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-[#f0ece5] flex items-center justify-center flex-shrink-0">
                          <Icons.Check size={10} className="text-[#4f7c6e]" />
                        </span>
                        <span className="text-[13px] font-semibold text-[#1d1a16] leading-snug">
                          {after}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer line */}
                <p className="text-center text-[12px] text-[#b0a89e] mt-6 leading-relaxed">
                  Simple enough to start instantly. Powerful enough to make better decisions.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── DIFFERENTIATION STRIP ── */}
        <section className="py-16 px-6 bg-[#1d1a16] overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <FadeIn>
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <p className="display text-[28px] md:text-[36px] text-white leading-snug mb-4">
                Most tools{" "}
                <span className="italic text-[#a0c8b4]">collect</span> feedback.
                <br />
                This one helps you{" "}
                <span className="italic text-[#a0c8b4]">decide.</span>
              </p>
              <p className="text-[#8a8279] text-[14px] max-w-md mx-auto">
                No dashboard clutter, no AI summaries you won't read. Just
                signal, ranked by the people who matter.
              </p>
            </div>
          </FadeIn>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="py-24 px-6 bg-[#f5f2ed]">
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="text-center mb-14">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4f7c6e] mb-3">
                  Pricing
                </p>
                <h2 className="display text-[38px] md:text-[44px] text-[#1d1a16] leading-tight mb-2">
                  Simple. Fair. No surprises.
                </h2>
              </div>
            </FadeIn>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Free */}
              <FadeIn delay={0}>
                <div className="bg-white rounded-2xl border border-[#ede9e3] p-7 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                  <div className="mb-6">
                    <p className="text-[12px] font-semibold text-[#8a8279] uppercase tracking-wider mb-2">
                      Free
                    </p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="display text-[42px] leading-none text-[#1d1a16]">
                        $0
                      </span>
                      <span className="text-[13px] text-[#b0a89e] mb-1">
                        / forever
                      </span>
                    </div>
                    <p className="text-[13px] text-[#8a8279]">
                      For founders just getting started.
                    </p>
                  </div>
                  <ul className="space-y-3 mb-7">
                    {[
                      "1 feedback board",
                      "Up to 50 posts",
                      "Unlimited voters",
                      "Public board link",
                    ].map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2.5 text-[13px] text-[#4a4540]"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#f0ece5] flex items-center justify-center flex-shrink-0">
                          <Icons.Check size={10} className="text-[#4f7c6e]" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className="w-full py-3 rounded-xl border border-[#ede9e3] text-[13px] font-medium text-[#4a4540] hover:border-[#d4ede5] hover:bg-[#f5fbf8] transition-all duration-200">
                    Get started free
                  </button>
                </div>
              </FadeIn>

              {/* Pro */}
              <FadeIn delay={100}>
                <div className="relative bg-[#1d1a16] rounded-2xl p-7 shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 70% 20%, #a0c8b4 0%, transparent 60%)",
                    }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-[12px] font-semibold text-[#8a8279] uppercase tracking-wider mb-2">
                          Pro
                        </p>
                        <div className="flex items-end gap-1 mb-1">
                          <span className="display text-[42px] leading-none text-white">
                            $19
                          </span>
                          <span className="text-[13px] text-[#8a8279] mb-1">
                            / month
                          </span>
                        </div>
                        <p className="text-[13px] text-[#8a8279]">
                          For teams ready to scale.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-[#4f7c6e] bg-[#4f7c6e]/15 px-2.5 py-1 rounded-full border border-[#4f7c6e]/20">
                        Popular
                      </span>
                    </div>
                    <ul className="space-y-3 mb-7">
                      {[
                        "Unlimited boards",
                        "Unlimited posts",
                        "Status updates to voters",
                        "Custom domain",
                        "Private boards",
                        "Priority support",
                      ].map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2.5 text-[13px] text-[#c8c4be]"
                        >
                          <span className="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0">
                            <Icons.Check size={10} className="text-[#a0c8b4]" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full py-3 rounded-xl bg-white text-[#1d1a16] text-[13px] font-semibold hover:bg-[#f0ece5] transition-all duration-200 shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                      Start free trial
                    </button>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-28 px-6 overflow-hidden relative">
          {/* Subtle bg gradient */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-[#d4ede5]/40 via-[#f0ece5]/20 to-[#e8d5c4]/30 rounded-full blur-3xl" />
          </div>
          <FadeIn>
            <div className="max-w-2xl mx-auto text-center relative z-10">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#4f7c6e] mb-5">
                Start listening
              </p>
              <h2 className="display text-[42px] md:text-[52px] text-[#1d1a16] leading-[1.1] mb-5 tracking-tight">
                Your users already have{" "}
                <span className="italic text-[#4f7c6e]">opinions.</span>
                <br />
                Time to hear them.
              </h2>
              <p className="text-[15px] text-[#8a8279] mb-10 max-w-sm mx-auto leading-relaxed">
                Set up your feedback board in seconds. No integrations. No
                onboarding. Just a link that works.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button className="w-full sm:w-auto bg-[#1d1a16] text-white text-[14px] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#2d2920] transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.26)] hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  Create your board
                  <Icons.ExternalLink size={14} />
                </button>
                <p className="text-[12px] text-[#b0a89e]">
                  Free forever. No card needed.
                </p>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-[#4f7c6e]/20 py-8 px-6 bg-[#4f7c6e]/8 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#4f7c6e] flex items-center justify-center">
                <Icons.Inbox size={10} className="text-white" />
              </div>
              <span className="text-[13px] font-semibold text-[#1d1a16]">
                feedio
              </span>
            </div>
            <p className="text-[12px] text-[#b0a89e]">
              Built for founders who ship.
            </p>
            <div className="flex items-center gap-6">
              {["Privacy", "Terms", "Contact"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-[12px] text-[#b0a89e] hover:text-[#6a6259] transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
