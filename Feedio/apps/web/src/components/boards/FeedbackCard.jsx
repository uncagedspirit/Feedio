import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { getPastelColor, STATUS_CONFIG, TAG_COLORS } from '../../data/mockData'
import { Icons } from '../ui/Icons'
import { Badge } from '../ui/index'

/**
 * FeedbackCard
 *
 * Standard mode (compact=false):
 *   - Click anywhere on the card body → toggles description open/close
 *   - Shows tag + status badges always
 *   - Upvote column left, expand chevron top-right corner
 *
 * Roadmap compact mode (compact=true):
 *   - Upvote is a smaller pill, not a full-height column
 *   - Tags are hidden when collapsed; shown only when expanded
 *   - Cleaner, less dense layout
 *
 * Admin mode: hover reveals pin / status-change / delete controls.
 * Status dropdown uses fixed positioning to avoid z-index clipping.
 */
export default function FeedbackCard({
  post,
  board,
  adminMode  = false,
  compact    = false,
  onStatusChange,
  onDelete,
  onPin,
}) {
  const { toggleUpvote, hasVoted, canInteract } = useApp()
  const [expanded,       setExpanded]       = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusBtnRef = useRef(null)
  const [menuCoords,  setMenuCoords]  = useState({ top: 0, right: 0 })

  const voted       = hasVoted(post.id)
  const palette     = getPastelColor(post.id)
  const statusCfg   = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.open
  const tagCfg      = TAG_COLORS[post.tag] ?? TAG_COLORS.Other
  const interactive = canInteract(board)
  const hasDesc     = Boolean(post.description)

  const handleUpvote = (e) => {
    e.stopPropagation()
    if (!interactive) return
    toggleUpvote(post.id, board?.id)
  }

  // Position the dropdown using fixed coords from the button rect
  const openStatusMenu = (e) => {
    e.stopPropagation()
    const rect = statusBtnRef.current?.getBoundingClientRect()
    if (rect) {
      setMenuCoords({
        top:   rect.bottom + 6,
        right: window.innerWidth - rect.right,
      })
    }
    setStatusMenuOpen(v => !v)
  }

  // Close on outside click (captures clicks on other cards too)
  useEffect(() => {
    if (!statusMenuOpen) return
    const close = () => setStatusMenuOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [statusMenuOpen])

  // ── COMPACT (roadmap) card ──────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className={`group relative rounded-xl border transition-all duration-200
          ${post.pinned ? 'ring-2 ring-teal-200' : ''}
          ${hasDesc ? 'cursor-pointer' : ''}`}
        style={{ backgroundColor: palette.bg, borderColor: palette.border }}
        onClick={() => hasDesc && setExpanded(v => !v)}
      >
        {post.pinned && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-t-xl" />
        )}

        <div className="p-3">
          {/* Top row: title + controls */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-[13px] font-semibold text-[#111827] leading-snug flex-1 min-w-0">
              {post.pinned && <Icons.Pin size={10} className="text-teal-600 inline mr-1 flex-shrink-0" />}
              {post.title}
            </h3>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Admin controls */}
              {adminMode && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionBtn onClick={(e) => { e.stopPropagation(); onPin?.(post.id) }}
                    title={post.pinned ? 'Unpin' : 'Pin'}>
                    <Icons.Pin size={11} className={post.pinned ? 'text-teal-600' : ''} />
                  </ActionBtn>
                  <div className="relative" onMouseDown={e => e.stopPropagation()}>
                    <ActionBtn ref={statusBtnRef} onClick={openStatusMenu} title="Change status">
                      <Icons.Tag size={11} />
                    </ActionBtn>
                  </div>
                  <ActionBtn onClick={(e) => { e.stopPropagation(); onDelete?.(post.id) }} title="Delete" danger>
                    <Icons.Trash size={11} />
                  </ActionBtn>
                </div>
              )}

              {/* Expand chevron — only if description exists */}
              {hasDesc && (
                <span className="text-[#9CA3AF] flex-shrink-0 cursor-pointer">
                  {expanded
                    ? <Icons.ChevronUp size={15} />
                    : <Icons.ChevronDown size={15} />}
                </span>
              )}
            </div>
          </div>

          {/* Bottom row: upvote pill + status */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpvote}
              disabled={!interactive}
              title={!interactive ? 'Limit reached' : voted ? 'Remove vote' : 'Upvote'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold
                transition-all duration-200 select-none
                ${voted
                  ? 'bg-teal-500/15 border-teal-300/50 text-teal-700'
                  : 'border-transparent bg-white/60 text-[#6B7280] hover:text-[#374151] hover:bg-white/90'
                }
                ${!interactive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{ borderColor: voted ? undefined : palette.border }}
            >
              <Icons.ArrowUp size={11} className={voted ? 'text-teal-600' : ''} />
              {post.upvotes}
            </button>

            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>

            {post.trending && (
              <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                Trending
              </span>
            )}
          </div>
        </div>

        {/* Expanded description — tags revealed here */}
        {expanded && hasDesc && (
          <div
            className="px-3 pb-3"
            style={{ borderTop: `1px dashed ${palette.border}` }}
          >
            <p className="pt-2.5 text-[12px] text-[#374151] leading-relaxed mb-2">
              {post.description}
            </p>
            {/* Tags only visible when expanded in compact/roadmap mode */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2"
              style={{ borderTop: `1px solid ${palette.border}` }}>
              <Badge style={{ backgroundColor: tagCfg.bg, color: tagCfg.text, border: `1px solid ${tagCfg.border}` }}>
                {post.tag}
              </Badge>
              {adminMode && post.authorName && (
                <span className="text-[10px] text-[#9CA3AF]">by {post.authorName}</span>
              )}
            </div>
          </div>
        )}

        {/* Fixed-position status dropdown — avoids z-index clipping */}
        {statusMenuOpen && (
          <StatusDropdown
            coords={menuCoords}
            post={post}
            onSelect={(key) => { onStatusChange?.(post.id, key); setStatusMenuOpen(false) }}
            onClose={() => setStatusMenuOpen(false)}
          />
        )}
      </div>
    )
  }

  // ── STANDARD card ──────────────────────────────────────────────────────
  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 overflow-visible
        shadow-sm hover:shadow-md hover:-translate-y-px
        ${hasDesc ? 'cursor-pointer' : ''}
        ${post.pinned ? 'ring-2 ring-teal-200' : ''}`}
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
      onClick={() => hasDesc && setExpanded(v => !v)}
    >
      {post.pinned && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-t-2xl" />
      )}

      <div className="flex items-stretch">
        {/* Upvote column */}
        <button
          onClick={handleUpvote}
          disabled={!interactive}
          title={!interactive ? 'Interaction limit reached' : voted ? 'Remove vote' : 'Upvote'}
          className={`flex flex-col items-center justify-center gap-1.5 px-4 py-4 border-r min-w-[60px]
            transition-all duration-200 select-none rounded-l-2xl
            ${voted
              ? 'bg-teal-500/15 border-teal-300/60 text-teal-700'
              : 'border-transparent hover:bg-black/5 text-[#6B7280] hover:text-[#374151]'
            }
            ${!interactive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ borderColor: voted ? undefined : palette.border }}
        >
          <Icons.ArrowUp
            size={15}
            className={`transition-transform duration-200 ${voted ? 'text-teal-600' : 'group-hover/up:scale-110'}`}
          />
          <span className={`text-[13px] font-bold leading-none tabular-nums ${voted ? 'text-teal-700' : ''}`}>
            {post.upvotes}
          </span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {post.pinned && <Icons.Pin size={11} className="text-teal-600 flex-shrink-0" />}
                <h3 className="text-[14px] font-semibold text-[#111827] leading-snug">
                  {post.title}
                </h3>
                {post.trending && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    <Icons.Flame size={9} /> Trending
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge style={{ backgroundColor: tagCfg.bg, color: tagCfg.text, border: `1px solid ${tagCfg.border}` }}>
                  {post.tag}
                </Badge>
                <Badge style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusCfg.dot }} />
                  {statusCfg.label}
                </Badge>
                <span className="text-[10px] text-[#9CA3AF]">
                  by {post.authorName} · {post.createdAt}
                </span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {adminMode && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionBtn onClick={(e) => { e.stopPropagation(); onPin?.(post.id) }}
                    title={post.pinned ? 'Unpin' : 'Pin'}>
                    <Icons.Pin size={12} className={post.pinned ? 'text-teal-600' : ''} />
                  </ActionBtn>

                  <div className="relative" onMouseDown={e => e.stopPropagation()}>
                    <ActionBtn ref={statusBtnRef} onClick={openStatusMenu} title="Change status">
                      <Icons.Tag size={12} />
                    </ActionBtn>
                  </div>

                  <ActionBtn onClick={(e) => { e.stopPropagation(); onDelete?.(post.id) }} title="Delete" danger>
                    <Icons.Trash size={12} />
                  </ActionBtn>
                </div>
              )}

              {/* Expand chevron — big enough to click */}
              {hasDesc && (
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-xl
                    text-[#9CA3AF] hover:text-[#374151] hover:bg-black/5
                    transition-all cursor-pointer"
                >
                  {expanded ? <Icons.ChevronUp size={17} /> : <Icons.ChevronDown size={17} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded description */}
      {expanded && hasDesc && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: `1px dashed ${palette.border}` }}
        >
          <p className="pt-3 text-[13px] text-[#374151] leading-relaxed">
            {post.description}
          </p>
          {adminMode && (
            <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-4 text-[11px] text-[#9CA3AF]">
              <span>By: <span className="text-[#6B7280] font-medium">{post.authorName}</span></span>
              {post.authorEmail && (
                <span>Email: <span className="text-[#6B7280] font-medium">{post.authorEmail}</span></span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fixed-position status dropdown */}
      {statusMenuOpen && (
        <StatusDropdown
          coords={menuCoords}
          post={post}
          onSelect={(key) => { onStatusChange?.(post.id, key); setStatusMenuOpen(false) }}
          onClose={() => setStatusMenuOpen(false)}
        />
      )}
    </div>
  )
}

// ─── STATUS DROPDOWN (fixed position, above all z-index issues) ──────────────
function StatusDropdown({ coords, post, onSelect, onClose }) {
  return (
    <>
      {/* Transparent overlay to capture outside clicks */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onMouseDown={onClose}
      />
      <div
        className="fixed w-52 bg-white rounded-xl shadow-2xl border border-[#F3F4F6] overflow-hidden"
        style={{ top: coords.top, right: coords.right, zIndex: 9999 }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-[#F9FAFB]">
          <p className="text-[10px] font-extrabold tracking-widest uppercase text-[#9CA3AF]">
            Change status
          </p>
        </div>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-[#374151]
              hover:bg-teal-50 hover:text-teal-700 transition-colors cursor-pointer text-left"
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
            <span className="flex-1">{cfg.label}</span>
            {post.status === key && <Icons.Check size={12} className="text-teal-600 flex-shrink-0" />}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── ACTION BUTTON ────────────────────────────────────────────────────────────
import { forwardRef } from 'react'

const ActionBtn = forwardRef(function ActionBtn({ children, onClick, title, danger = false }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all cursor-pointer
        ${danger
          ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
          : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-black/5'
        }`}
    >
      {children}
    </button>
  )
})
