/**
 * Spot illustrations — custom SVG components that replace every emoji in the UI.
 *
 * Design language:
 *   - 96 × 96 viewBox (default), scalable via `size` prop
 *   - 1.75 px stroke-width on main shapes, 1.25 on details
 *   - strokeLinecap / strokeLinejoin: round throughout
 *   - Fills drawn from the app's pastel "Light Spring" palette
 *   - No external font or image dependencies
 *
 * Usage:
 *   import { IlluSuccess, IlluRocket } from '../illustrations'
 *   <IlluSuccess size={64} />
 */

// ─── BASE WRAPPER ─────────────────────────────────────────────────────────────
const Illu = ({ size = 96, children, viewBox = '0 0 96 96', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
)

// ─── SUCCESS (form submitted / request sent) ──────────────────────────────────
export function IlluSuccess({ size = 80 }) {
  return (
    <Illu size={size}>
      {/* Outer glow ring */}
      <circle cx="48" cy="48" r="40" fill="#CCFBF1" opacity="0.5" />
      {/* Mid ring */}
      <circle cx="48" cy="48" r="30" fill="#99F6E4" opacity="0.35" />
      {/* Main circle */}
      <circle cx="48" cy="48" r="22" fill="#CCFBF1" stroke="#14B8A6" strokeWidth="1.75" />
      {/* Checkmark */}
      <polyline
        points="36,48 44,56 60,36"
        stroke="#0D9488"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Radiating lines — 8 directions */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad   = (deg * Math.PI) / 180
        const inner = 27
        const outer = 34
        const x1    = 48 + inner * Math.cos(rad)
        const y1    = 48 + inner * Math.sin(rad)
        const x2    = 48 + outer * Math.cos(rad)
        const y2    = 48 + outer * Math.sin(rad)
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={i % 2 === 0 ? '#14B8A6' : '#5EEAD4'}
            strokeWidth="1.5" strokeLinecap="round"
          />
        )
      })}
      {/* Small accent dots */}
      <circle cx="48" cy="6"  r="2" fill="#14B8A6" />
      <circle cx="82" cy="22" r="1.5" fill="#5EEAD4" />
      <circle cx="82" cy="74" r="1.5" fill="#5EEAD4" />
      <circle cx="14" cy="22" r="1.5" fill="#14B8A6" />
      <circle cx="14" cy="74" r="1.5" fill="#5EEAD4" />
    </Illu>
  )
}

// ─── CELEBRATION (board created success) ──────────────────────────────────────
export function IlluCelebration({ size = 88 }) {
  return (
    <Illu size={size}>
      {/* Center star burst */}
      <circle cx="48" cy="48" r="18" fill="#CCFBF1" stroke="#14B8A6" strokeWidth="1.75" />
      {/* Inner check */}
      <polyline points="38,48 45,55 59,37" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Confetti pieces */}
      {/* Top-left: small square */}
      <rect x="14" y="12" width="7" height="7" rx="1.5"
        fill="#FEF9C3" stroke="#EAB308" strokeWidth="1.25" transform="rotate(15 17.5 15.5)" />
      {/* Top-right: circle */}
      <circle cx="74" cy="16" r="4" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.25" />
      {/* Right: diamond */}
      <path d="M82 42 L86 48 L82 54 L78 48 Z"
        fill="#FFE4E6" stroke="#F43F5E" strokeWidth="1.25" />
      {/* Bottom-right: circle */}
      <circle cx="72" cy="76" r="3.5" fill="#CCFBF1" stroke="#14B8A6" strokeWidth="1.25" />
      {/* Bottom-left: square */}
      <rect x="18" y="72" width="6" height="6" rx="1.5"
        fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.25" transform="rotate(-20 21 75)" />
      {/* Left: triangle */}
      <path d="M10 44 L14 50 L6 50 Z"
        fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1.25" />
      {/* Scattered dots */}
      <circle cx="30" cy="22" r="2" fill="#5EEAD4" />
      <circle cx="65" cy="28" r="2" fill="#C4B5FD" />
      <circle cx="22" cy="55" r="1.5" fill="#FCD34D" />
      <circle cx="76" cy="60" r="1.5" fill="#FB7185" />
      <circle cx="48" cy="14" r="2" fill="#14B8A6" />
      <circle cx="48" cy="82" r="2" fill="#8B5CF6" />
      {/* Star shapes */}
      <path d="M36 14 L37.5 10 L39 14 L43 14 L39.5 16.5 L41 20.5 L37.5 18 L34 20.5 L35.5 16.5 L32 14 Z"
        fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.75" />
      <path d="M60 72 L61.2 68.5 L62.4 72 L66 72 L63 74 L64.2 77.5 L61.2 75.5 L58.2 77.5 L59.4 74 L56.4 72 Z"
        fill="#A5F3FC" stroke="#06B6D4" strokeWidth="0.75" />
    </Illu>
  )
}

// ─── AUTH REQUIRED (sign-in gate) ────────────────────────────────────────────
export function IlluAuthRequired({ size = 88 }) {
  return (
    <Illu size={size}>
      {/* Background circle */}
      <circle cx="48" cy="48" r="40" fill="#F0FDF4" />
      {/* Door frame */}
      <rect x="24" y="18" width="48" height="62" rx="4" fill="#CCFBF1" stroke="#14B8A6" strokeWidth="1.75" />
      {/* Door panel detail */}
      <rect x="30" y="24" width="36" height="26" rx="2" fill="white" stroke="#5EEAD4" strokeWidth="1.25" />
      <rect x="30" y="56" width="36" height="18" rx="2" fill="white" stroke="#5EEAD4" strokeWidth="1.25" />
      {/* Keyhole */}
      <circle cx="48" cy="64" r="4.5" fill="#14B8A6" />
      <path d="M45.5 64 L42 74 L54 74 L50.5 64" fill="#14B8A6" />
      {/* Key floating top-right */}
      <g transform="translate(62, 14) rotate(45)">
        <circle cx="0" cy="0" r="5.5" stroke="#0D9488" strokeWidth="1.75" fill="#CCFBF1" />
        <line x1="5.5" y1="0" x2="14" y2="0" stroke="#0D9488" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="11" y1="0" x2="11" y2="3" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="0" x2="14" y2="3" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      {/* Small stars */}
      <circle cx="18" cy="30" r="2" fill="#5EEAD4" />
      <circle cx="78" cy="58" r="1.5" fill="#99F6E4" />
      <circle cx="20" cy="70" r="1.5" fill="#14B8A6" />
    </Illu>
  )
}

// ─── NO BOARDS (empty dashboard) ─────────────────────────────────────────────
export function IlluNoBoards({ size = 88 }) {
  return (
    <Illu size={size}>
      {/* Background */}
      <rect x="8" y="8" width="80" height="80" rx="12" fill="#F9FAFB" />
      {/* Card grid – top left */}
      <rect x="16" y="16" width="30" height="30" rx="4"
        fill="white" stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="4 2.5" />
      {/* Card grid – top right */}
      <rect x="50" y="16" width="30" height="30" rx="4"
        fill="white" stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="4 2.5" />
      {/* Card grid – bottom left */}
      <rect x="16" y="50" width="30" height="30" rx="4"
        fill="white" stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="4 2.5" />
      {/* Card grid – bottom right: highlighted, with plus */}
      <rect x="50" y="50" width="30" height="30" rx="4"
        fill="#CCFBF1" stroke="#14B8A6" strokeWidth="1.75" />
      <line x1="65" y1="60" x2="65" y2="72" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
      <line x1="59" y1="66" x2="71" y2="66" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />
      {/* Shimmer lines inside dashed cards */}
      {[22, 28, 34].map(y => (
        <line key={y} x1="22" y1={y} x2="40" y2={y}
          stroke="#F3F4F6" strokeWidth="3" strokeLinecap="round" />
      ))}
      {[22, 28, 34].map(y => (
        <line key={y} x1="56" y1={y} x2="74" y2={y}
          stroke="#F3F4F6" strokeWidth="3" strokeLinecap="round" />
      ))}
      {[56, 62, 68].map(y => (
        <line key={y} x1="22" y1={y} x2="40" y2={y}
          stroke="#F3F4F6" strokeWidth="3" strokeLinecap="round" />
      ))}
    </Illu>
  )
}

// ─── NOT FOUND (board not found / 404) ───────────────────────────────────────
export function IlluNotFound({ size = 88 }) {
  return (
    <Illu size={size}>
      {/* Magnifying glass handle */}
      <line x1="62" y1="62" x2="80" y2="80" stroke="#9CA3AF" strokeWidth="3.5" strokeLinecap="round" />
      {/* Magnifying glass ring */}
      <circle cx="40" cy="40" r="28" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="2" />
      <circle cx="40" cy="40" r="22" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
      {/* Question mark body */}
      <path d="M34 32 C34 26 52 26 52 34 C52 40 44 40 44 46"
        stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Question mark dot */}
      <circle cx="44" cy="52" r="2.5" fill="#9CA3AF" />
      {/* Stars around */}
      <circle cx="14" cy="16" r="2" fill="#5EEAD4" />
      <circle cx="78" cy="20" r="1.5" fill="#C4B5FD" />
      <circle cx="10" cy="60" r="1.5" fill="#FCD34D" />
      {/* Small cross/star top */}
      <line x1="72" y1="12" x2="72" y2="18" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="69" y1="15" x2="75" y2="15" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round" />
    </Illu>
  )
}

// ─── ACCESS DENIED ────────────────────────────────────────────────────────────
export function IlluAccessDenied({ size = 88 }) {
  return (
    <Illu size={size}>
      {/* Outer glow */}
      <circle cx="48" cy="48" r="38" fill="#FFF1F2" opacity="0.7" />
      {/* Shield body */}
      <path d="M48 10 L76 22 L76 44 C76 62 64 74 48 82 C32 74 20 62 20 44 L20 22 Z"
        fill="#FFE4E6" stroke="#FB7185" strokeWidth="2" strokeLinejoin="round" />
      {/* Shield inner */}
      <path d="M48 18 L70 28 L70 44 C70 58 60 68 48 74 C36 68 26 58 26 44 L26 28 Z"
        fill="#FFF1F2" stroke="#FDA4AF" strokeWidth="1.25" strokeLinejoin="round" />
      {/* X mark */}
      <line x1="38" y1="38" x2="58" y2="58" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="58" y1="38" x2="38" y2="58" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
      {/* Decorative dots */}
      <circle cx="20" cy="20" r="2" fill="#FDA4AF" />
      <circle cx="76" cy="18" r="1.5" fill="#FCA5A5" />
      <circle cx="12" cy="50" r="1.5" fill="#FDA4AF" />
    </Illu>
  )
}

// ─── EMPTY POSTS (no requests in a board) ─────────────────────────────────────
export function IlluEmptyPosts({ size = 88 }) {
  return (
    <Illu size={size}>
      {/* Inbox tray */}
      <rect x="12" y="50" width="72" height="30" rx="6" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.75" />
      <path d="M12 66 L26 66 C28 66 30 64 32 62 L40 62 L56 62 C58 64 60 66 62 66 L84 66"
        stroke="#D1D5DB" strokeWidth="1.75" fill="none" strokeLinecap="round" />
      {/* Floating empty envelope */}
      <rect x="26" y="18" width="44" height="30" rx="4"
        fill="white" stroke="#9CA3AF" strokeWidth="1.75" />
      {/* Envelope flap */}
      <path d="M26 22 L48 36 L70 22" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Lines inside (empty content) */}
      <line x1="34" y1="40" x2="62" y2="40" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="46" x2="58" y2="46" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
      {/* Dotted lines dropping into inbox */}
      <line x1="48" y1="50" x2="48" y2="58" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
      {/* Accent dots */}
      <circle cx="18" cy="24" r="2" fill="#5EEAD4" />
      <circle cx="78" cy="26" r="1.5" fill="#C4B5FD" />
      <circle cx="14" cy="44" r="1.5" fill="#FCD34D" />
    </Illu>
  )
}

// ─── ROCKET (upgrade, create board, "add yours") ──────────────────────────────
export function IlluRocket({ size = 88 }) {
  return (
    <Illu size={size}>
      {/* Stars */}
      <circle cx="16" cy="16" r="2" fill="#C4B5FD" />
      <circle cx="78" cy="12" r="1.5" fill="#5EEAD4" />
      <circle cx="82" cy="36" r="2" fill="#FCD34D" />
      <circle cx="10" cy="48" r="1.5" fill="#C4B5FD" />
      {/* Plus/cross star top-left */}
      <line x1="28" y1="14" x2="28" y2="20" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25" y1="17" x2="31" y2="17" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round" />
      {/* Rocket body */}
      <path d="M48 14 C52 14 64 26 64 46 L48 58 L32 46 C32 26 44 14 48 14 Z"
        fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.75" />
      {/* Rocket nose */}
      <path d="M42 22 C42 16 54 16 54 22" fill="#C4B5FD" stroke="#8B5CF6" strokeWidth="1.25" />
      {/* Window */}
      <circle cx="48" cy="36" r="7" fill="white" stroke="#8B5CF6" strokeWidth="1.75" />
      <circle cx="48" cy="36" r="4" fill="#E0E7FF" />
      {/* Left fin */}
      <path d="M32 46 L22 58 L36 54 Z" fill="#DDD6FE" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Right fin */}
      <path d="M64 46 L74 58 L60 54 Z" fill="#DDD6FE" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Flame */}
      <path d="M40 58 C38 64 40 72 48 76 C56 72 58 64 56 58 C52 62 44 62 40 58 Z"
        fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
      <path d="M43 60 C42 64 44 70 48 72 C52 70 54 64 53 60 C50 63 46 63 43 60 Z"
        fill="#FDE68A" />
    </Illu>
  )
}

// ─── PAGE NOT FOUND (404) ─────────────────────────────────────────────────────
export function IlluPageNotFound({ size = 88 }) {
  return (
    <Illu size={size}>
      {/* Stars scattered */}
      <circle cx="14" cy="12" r="1.5" fill="#5EEAD4" />
      <circle cx="78" cy="10" r="2"   fill="#C4B5FD" />
      <circle cx="82" cy="44" r="1.5" fill="#FCD34D" />
      <circle cx="8"  cy="56" r="1.5" fill="#5EEAD4" />
      <circle cx="30" cy="8"  r="1"   fill="#C4B5FD" />
      <circle cx="66" cy="76" r="1"   fill="#5EEAD4" />
      {/* Plus cross at top-right */}
      <line x1="68" y1="18" x2="68" y2="26" stroke="#C4B5FD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="22" x2="72" y2="22" stroke="#C4B5FD" strokeWidth="1.5" strokeLinecap="round" />
      {/* Telescope tube */}
      <rect x="22" y="38" width="52" height="18" rx="5"
        fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1.75" />
      {/* Telescope eyepiece (right, smaller) */}
      <rect x="68" y="42" width="16" height="10" rx="3"
        fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.5" />
      {/* Telescope lens (left, larger) */}
      <circle cx="22" cy="47" r="12" fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="1.75" />
      <circle cx="22" cy="47" r="8"  fill="white" stroke="#E5E7EB" strokeWidth="1.25" />
      {/* Reflection dot inside lens */}
      <circle cx="18" cy="43" r="2" fill="#E0F2FE" />
      {/* Tripod legs */}
      <line x1="42" y1="56" x2="32" y2="80" stroke="#9CA3AF" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="48" y1="56" x2="48" y2="80" stroke="#9CA3AF" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="54" y1="56" x2="64" y2="80" stroke="#9CA3AF" strokeWidth="1.75" strokeLinecap="round" />
      {/* Ground line */}
      <line x1="24" y1="80" x2="72" y2="80" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" />
    </Illu>
  )
}

// ─── PAYMENT SUCCESS (Stripe success banner icon) ─────────────────────────────
export function IlluPaymentSuccess({ size = 32 }) {
  return (
    <Illu size={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="#CCFBF1" stroke="#14B8A6" strokeWidth="1.5" />
      <polyline points="9,16 14,21 24,11" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Illu>
  )
}

// ─── WAVE HAND (dashboard greeting) ──────────────────────────────────────────
export function IlluWaveHand({ size = 28 }) {
  return (
    <Illu size={size} viewBox="0 0 32 32">
      {/* Palm */}
      <path d="M8 22 C8 22 6 18 8 14 L10 8 C10 6.5 12 6 12.5 8 L13 12"
        stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Index finger */}
      <path d="M13 12 L13 6 C13 4.5 15 4 15.5 6 L16 12"
        stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Middle finger */}
      <path d="M16 12 L16 5 C16 3.5 18 3 18.5 5 L19 12"
        stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Ring finger */}
      <path d="M19 12 L19 6.5 C19 5 21 4.5 21.5 6.5 L22 12"
        stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Pinky */}
      <path d="M22 12 L22 8.5 C22 7 24 6.5 24.5 8.5 L25 14"
        stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Palm base */}
      <path d="M8 22 C8 26 10 28 14 28 L20 28 C24 28 26 26 25 22 L25 14 L22 12 L19 12 L16 12 L13 12 L10 14 L8 22 Z"
        fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Wave lines */}
      <path d="M4 12 Q6 10 8 12" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M2 8 Q5 5 8 8"   stroke="#FCD34D" strokeWidth="1.25" strokeLinecap="round" fill="none" />
    </Illu>
  )
}

// ─── COLUMN ICONS (roadmap kanban headers) ───────────────────────────────────

/** Live / Shipped column */
export function IlluColumnLive({ size = 18 }) {
  return (
    <Illu size={size} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1.5" />
      <polyline points="6,10 9,13 15,7" stroke="#15803D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </Illu>
  )
}

/** In Development column */
export function IlluColumnBuilding({ size = 18 }) {
  return (
    <Illu size={size} viewBox="0 0 20 20">
      {/* Wrench */}
      <path d="M13.5 3 C11 3 9 5 9 7.5 C9 8.2 9.2 8.8 9.5 9.3 L3.5 15.3 C3 15.8 3 16.7 3.5 17.2 L4.2 17.9 C4.7 18.4 5.6 18.4 6.1 17.9 L12.1 11.9 C12.6 12.2 13.2 12.4 14 12.4 C16.5 12.4 18.5 10.4 18.5 7.9 L16 10.4 L13.5 7.9 L16 5.5 C15 4 14.3 3 13.5 3 Z"
        fill="#CCFBF1" stroke="#0D9488" strokeWidth="1.25" strokeLinejoin="round" />
    </Illu>
  )
}

/** Coming Soon column */
export function IlluColumnSoon({ size = 18 }) {
  return (
    <Illu size={size} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" />
      <line x1="10" y1="5" x2="10" y2="10.5" stroke="#7C3AED" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="10" y1="10.5" x2="13.5" y2="13" stroke="#7C3AED" strokeWidth="1.75" strokeLinecap="round" />
    </Illu>
  )
}

/** Considering column */
export function IlluColumnThinking({ size = 18 }) {
  return (
    <Illu size={size} viewBox="0 0 20 20">
      {/* Lightbulb */}
      <path d="M10 3 C7 3 5 5.5 5 8 C5 10 6.5 11.5 7 13 L13 13 C13.5 11.5 15 10 15 8 C15 5.5 13 3 10 3 Z"
        fill="#FEF9C3" stroke="#EAB308" strokeWidth="1.5" />
      <line x1="7.5" y1="14.5" x2="12.5" y2="14.5" stroke="#EAB308" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8.5" y1="16.5" x2="11.5" y2="16.5" stroke="#EAB308" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="6" x2="10" y2="9" stroke="#D97706" strokeWidth="1.25" strokeLinecap="round" />
      <line x1="10" y1="10.5" x2="10" y2="11" stroke="#D97706" strokeWidth="1.25" strokeLinecap="round" />
    </Illu>
  )
}

// ─── SORT ICONS (feed sidebar) ────────────────────────────────────────────────

/** Trending / Most Voted */
export function IlluSortFire({ size = 14 }) {
  return (
    <Illu size={size} viewBox="0 0 16 16">
      <path d="M8 1 C8 1 11 5 10 8 C12 6.5 12 4.5 12 4.5 C14 7 13 12 8 14 C3 12 3 7 5 5 C5 5 5 8 7 8 C6 5 8 1 8 1 Z"
        fill="#FEF3C7" stroke="#F97316" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </Illu>
  )
}

/** Newest */
export function IlluSortNew({ size = 14 }) {
  return (
    <Illu size={size} viewBox="0 0 16 16">
      {/* 4-pointed star */}
      <path d="M8 1 L9.2 6.8 L15 8 L9.2 9.2 L8 15 L6.8 9.2 L1 8 L6.8 6.8 Z"
        fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.25" strokeLinejoin="round" />
    </Illu>
  )
}

/** Trending (chart variant) */
export function IlluSortTrending({ size = 14 }) {
  return (
    <Illu size={size} viewBox="0 0 16 16">
      <polyline points="1,12 5,8 9,10 15,4"
        stroke="#14B8A6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points="11,4 15,4 15,8"
        stroke="#14B8A6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Illu>
  )
}

// ─── PUBLIC / PRIVATE BADGES ──────────────────────────────────────────────────

/** Public globe - small inline */
export function IlluPublic({ size = 12 }) {
  return (
    <Illu size={size} viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5.5" stroke="#16A34A" strokeWidth="1.25" fill="#DCFCE7" />
      <ellipse cx="7" cy="7" rx="2" ry="5.5" stroke="#16A34A" strokeWidth="1" fill="none" />
      <line x1="1.5" y1="7" x2="12.5" y2="7" stroke="#16A34A" strokeWidth="1" />
    </Illu>
  )
}

/** Private lock - small inline */
export function IlluPrivate({ size = 12 }) {
  return (
    <Illu size={size} viewBox="0 0 14 14">
      <rect x="2.5" y="6" width="9" height="7" rx="1.5" fill="#EDE9FE" stroke="#7C3AED" strokeWidth="1.25" />
      <path d="M4.5 6 L4.5 4 C4.5 2.3 9.5 2.3 9.5 4 L9.5 6"
        stroke="#7C3AED" strokeWidth="1.25" fill="none" strokeLinecap="round" />
      <circle cx="7" cy="9.5" r="1.25" fill="#7C3AED" />
    </Illu>
  )
}
