import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useRouter } from '../router'
import { STATUS_CONFIG, TAG_COLORS } from '../data/mockData'
import { Icons } from '../components/ui/Icons'
import { Avatar, EmptyState, Button, CopyButton } from '../components/ui/index'
import {
  IlluNotFound,
  IlluEmptyPosts,
  IlluSortFire,
  IlluSortNew,
  IlluSortTrending,
  IlluPublic,
  IlluPrivate,
} from '../components/illustrations'
import FeedbackCard from '../components/boards/FeedbackCard'
import RoadmapView from '../components/boards/RoadmapView'
import AddRequestModal from '../components/boards/AddRequestModal'
import { Analytics } from '../lib/analytics.js'

const SORT_OPTIONS = [
  { value: 'top',      label: 'Most voted',  Icon: IlluSortFire      },
  { value: 'new',      label: 'Newest',      Icon: IlluSortNew       },
  { value: 'trending', label: 'Trending',    Icon: IlluSortTrending  },
]

export default function PublicBoardPage({ params }) {
  const { getBoardBySlug, getBoardPosts, canInteract, loadBoardPosts, loadMyVotes } = useApp()
  const { navigate } = useRouter()
  const board = getBoardBySlug(params.slug)

  useEffect(() => {
    if (board?.id) {
      loadBoardPosts(board.id)
      loadMyVotes(board.id)
      Analytics.boardViewed(board)
    }
  }, [board?.id, loadBoardPosts, loadMyVotes])

  const [tab,          setTab]          = useState('feed')
  const [sort,         setSort]         = useState('top')
  const [tagFilter,    setTagFilter]    = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [addOpen,      setAddOpen]      = useState(false)
  const [aboutOpen,    setAboutOpen]    = useState(false)

  if (!board) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center pt-14">
        <EmptyState
          illustration={<IlluNotFound size={96} />}
          title="Board not found"
          body="This board may have been removed or the link is incorrect."
          action={<Button onClick={() => navigate('/boards')}>Browse public boards</Button>}
        />
      </div>
    )
  }

  const allPosts    = getBoardPosts(board.id)
  const interactive = canInteract(board)

  const sorted = [...allPosts]
    .filter(p => tagFilter    === 'all' || p.tag    === tagFilter)
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .sort((a, b) => {
      if (sort === 'top')      return b.upvotes - a.upvotes
      if (sort === 'new')      return new Date(b.createdAt) - new Date(a.createdAt)
      if (sort === 'trending') return (b.trending ? 1 : 0) - (a.trending ? 1 : 0) || b.upvotes - a.upvotes
      return 0
    })

  const boardUrl = `${window.location.origin}/boards/${board.slug}`

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-14 flex flex-col">
      {/* ── BOARD HEADER ── */}
      <div className={`bg-gradient-to-br ${board.headerGradient ?? 'from-teal-600 to-emerald-500'}`}>
        <div className="max-w-4xl mx-auto px-6 py-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                <Avatar initials={board.ownerAvatarInitials} color={board.ownerAvatarColor} size="sm" />
                <span className="text-white/60 text-[12px] font-medium">{board.ownerName}</span>
                {board.website && (
                  <a href={board.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-white/50 hover:text-white/80 text-[11px] transition-colors">
                    <Icons.Globe size={11} />
                    {board.website.replace(/https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
              </div>
              <h1 className="text-[24px] sm:text-[30px] font-extrabold text-white leading-tight mb-1"
                style={{ fontFamily: "'Fraunces', serif" }}>
                {board.name}
              </h1>
              {board.tagline && <p className="text-white/65 text-[13px]">{board.tagline}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyButton text={boardUrl}
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20" />
              <button
                onClick={() => interactive ? setAddOpen(true) : null}
                disabled={!interactive}
                title={!interactive ? 'Board interaction limit reached' : 'Submit a request'}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all
                  ${interactive
                    ? 'bg-white text-[#1a2e28] hover:bg-white/90 shadow-md hover:shadow-lg hover:-translate-y-px'
                    : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/20'
                  }`}
              >
                <Icons.Plus size={14} />
                Add request
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/10">
            <Stat value={allPosts.length}                                       label="requests" />
            <Stat value={allPosts.reduce((s, p) => s + p.upvotes, 0)}          label="total votes" />
            <Stat value={allPosts.filter(p => p.status === 'live').length}      label="shipped" />
            {!interactive && (
              <span className="ml-auto text-[11px] font-semibold text-white/40 bg-white/10 px-3 py-1 rounded-full">
                Interaction limit reached
              </span>
            )}
          </div>
        </div>

        {/* About strip */}
        {board.description && (
          <div className="border-t border-white/10 cursor-pointer group"
            onClick={() => setAboutOpen(v => !v)}>
            <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center gap-2">
              <p className={`text-[12px] text-white/55 flex-1 transition-all leading-relaxed ${aboutOpen ? '' : 'truncate'}`}>
                <span className="font-semibold text-white/70">About: </span>{board.description}
              </p>
              <Icons.ChevronDown size={13}
                className={`text-white/30 flex-shrink-0 transition-transform duration-200 ${aboutOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div className="sticky top-14 z-30 bg-white border-b border-[#F3F4F6] shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-11 flex items-center gap-1">
          {[
            { key: 'feed',    Icon: Icons.List, label: 'All requests' },
            { key: 'roadmap', Icon: Icons.Grid, label: 'Roadmap'      },
          ].map(({ key, Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-all
                ${tab === key ? 'bg-[#F0FDF4] text-teal-700' : 'text-[#6B7280] hover:text-[#374151] hover:bg-[#F9FAFB]'}`}>
              <Icon size={14} />
              {label}
              {key === 'feed' && (
                <span className="text-[10px] font-bold bg-[#F3F4F6] text-[#9CA3AF] px-1.5 py-0.5 rounded-full ml-0.5">
                  {allPosts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        {tab === 'feed' ? (
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block w-44 flex-shrink-0">
              <div className="sticky top-28 flex flex-col gap-5">

                <FilterSection label="Sort by">
                  {SORT_OPTIONS.map(o => (
                    <FilterChip key={o.value} active={sort === o.value} onClick={() => setSort(o.value)}>
                      <o.Icon size={14} />
                      {o.label}
                    </FilterChip>
                  ))}
                </FilterSection>

                <FilterSection label="Category">
                  <FilterChip active={tagFilter === 'all'} onClick={() => setTagFilter('all')}>
                    All categories
                  </FilterChip>
                  {board.tags.map(t => {
                    const cfg = TAG_COLORS[t] ?? TAG_COLORS.Other
                    return (
                      <FilterChip key={t} active={tagFilter === t} onClick={() => setTagFilter(t)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.border }} />
                        {t}
                      </FilterChip>
                    )
                  })}
                </FilterSection>

                <FilterSection label="Status">
                  <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                    All statuses
                  </FilterChip>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <FilterChip key={key} active={statusFilter === key} onClick={() => setStatusFilter(key)}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
                      {cfg.label}
                    </FilterChip>
                  ))}
                </FilterSection>
              </div>
            </aside>

            {/* Feed */}
            <div className="flex-1 min-w-0">
              {/* Mobile sort */}
              <div className="lg:hidden flex flex-wrap gap-2 mb-4">
                <MobileFilter label="Sort"
                  options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  value={sort} onChange={setSort} />
                <MobileFilter label="Category"
                  options={[{ value: 'all', label: 'All' }, ...board.tags.map(t => ({ value: t, label: t }))]}
                  value={tagFilter} onChange={setTagFilter} />
              </div>

              {sorted.length === 0 ? (
                <EmptyState
                  illustration={<IlluEmptyPosts size={88} />}
                  title="No requests yet"
                  body={tagFilter !== 'all' || statusFilter !== 'all'
                    ? 'No requests match your current filters.'
                    : 'Be the first to submit a feature request or report a bug.'
                  }
                  action={
                    tagFilter !== 'all' || statusFilter !== 'all' ? (
                      <Button variant="outline"
                        onClick={() => { setTagFilter('all'); setStatusFilter('all') }}>
                        Clear filters
                      </Button>
                    ) : (
                      <Button onClick={() => setAddOpen(true)} disabled={!interactive}
                        leftIcon={<Icons.Plus size={14} />}>
                        Add first request
                      </Button>
                    )
                  }
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {sorted.map(post => (
                    <FeedbackCard key={post.id} post={post} board={board} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <RoadmapView board={board} posts={allPosts} />
        )}
      </div>

      {/* Powered-by */}
      <div className="text-center py-5 border-t border-[#F3F4F6]">
        <span className="text-[11px] text-[#D1D5DB]">
          Powered by{' '}
          <button onClick={() => navigate('/')}
            className="font-semibold text-[#9CA3AF] hover:text-[#374151] transition-colors">
            feedio
          </button>
        </span>
      </div>

      <AddRequestModal open={addOpen} onClose={() => setAddOpen(false)} board={board} />
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <span className="text-[18px] font-extrabold text-white leading-none">{value}</span>
      <span className="text-[11px] text-white/45 ml-1.5">{label}</span>
    </div>
  )
}
function FilterSection({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold tracking-widest uppercase text-[#9CA3AF] mb-2">{label}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}
function FilterChip({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 text-left w-full px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer
        ${active ? 'bg-[#F0FDF4] text-teal-700 font-semibold' : 'text-[#374151] hover:bg-[#F0FDF4] hover:text-teal-700'}`}>
      {children}
    </button>
  )
}
function MobileFilter({ label, options, value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-[12px] bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[#374151]
        focus:outline-none focus:ring-2 focus:ring-teal-200 cursor-pointer">
      {options.map(o => <option key={o.value} value={o.value}>{label}: {o.label}</option>)}
    </select>
  )
}               