import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useRouter } from '../router'
import { Icons } from '../components/ui/Icons'
import { Avatar, Button, EmptyState } from '../components/ui/index'
import { IlluAuthRequired, IlluNoBoards, IlluWaveHand, IlluPublic, IlluPrivate } from '../components/illustrations'
import CreateBoardModal from '../components/boards/CreateBoardModal'

export default function DashboardPage({ onAuthClick }) {
  const { currentUser, getUserBoards, deleteBoard, upgradePlan } = useApp()
  const { navigate } = useRouter()
  const [createOpen,    setCreateOpen]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center pt-14">
        <div className="text-center max-w-sm px-6">
          <div className="flex justify-center mb-5">
            <IlluAuthRequired size={100} />
          </div>
          <h2 className="text-[20px] font-extrabold text-[#111827] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
            Sign in to continue
          </h2>
          <p className="text-[13px] text-[#9CA3AF] mb-6">Create and manage your feedback boards.</p>
          <Button fullWidth onClick={() => onAuthClick('login')}>Sign in</Button>
          <p className="mt-3 text-[12px] text-[#9CA3AF]">
            No account?{' '}
            <button onClick={() => onAuthClick('signup')} className="text-teal-600 font-semibold hover:underline">
              Create one free
            </button>
          </p>
        </div>
      </div>
    )
  }

  const myBoards          = getUserBoards(currentUser.id)
  const isPro             = currentUser.plan === 'pro'
  const interactionsUsed  = myBoards.reduce((s, b) => s + (b.totalInteractions ?? 0), 0)

  const handleDelete = (boardId) => { deleteBoard(boardId); setDeleteConfirm(null) }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-14">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Welcome row */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Avatar initials={currentUser.avatarInitials} color={currentUser.avatarColor} size="lg" />
            <div>
              {/* Wave hand illustration inline with greeting */}
              <h1 className="flex items-center gap-2 text-[22px] font-extrabold text-[#111827] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}>
                Hey, {currentUser.name.split(' ')[0]}
                <IlluWaveHand size={26} />
              </h1>
              <p className="text-[13px] text-[#9CA3AF]">{currentUser.email}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} leftIcon={<Icons.Plus size={14} />}>
            New board
          </Button>
        </div>

        {/* Plan banner */}
        {!isPro ? (
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-violet-50 to-purple-50
            border border-violet-200 rounded-2xl px-5 py-4 mb-8">
            <div>
              <p className="text-[13px] font-bold text-violet-800 mb-0.5">Free plan</p>
              <div className="flex items-center gap-4 text-[12px] text-violet-600">
                <span>
                  {myBoards.length}/1 board
                  {myBoards.length >= 1 && (
                    <span className="ml-1 text-[10px] font-bold bg-violet-200/60 text-violet-700 px-1.5 py-0.5 rounded-full">
                      limit reached
                    </span>
                  )}
                </span>
                <span>·</span>
                <span>{interactionsUsed}/25 interactions used</span>
              </div>
              <div className="mt-2 h-1 w-48 bg-violet-200 rounded-full overflow-hidden">
                <div className="h-full bg-violet-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (interactionsUsed / 25) * 100)}%` }} />
              </div>
            </div>
            <Button variant="pro" size="sm" onClick={upgradePlan}
              leftIcon={<Icons.Crown size={13} />} className="flex-shrink-0">
              Upgrade to Pro
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[#F0FDF4] border border-emerald-200 rounded-2xl px-5 py-3 mb-8">
            <Icons.Crown size={16} className="text-emerald-600" />
            <p className="text-[13px] font-semibold text-emerald-800">Pro plan — unlimited boards and interactions</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total boards',   value: myBoards.length,                                         icon: Icons.LayoutGrid, bg: '#CCFBF1', iconColor: '#0D9488', numColor: '#0F4B45' },
            { label: 'Interactions',   value: interactionsUsed,                                        icon: Icons.ArrowUp,    bg: '#FEF9C3', iconColor: '#CA8A04', numColor: '#713F12' },
            { label: 'Public boards',  value: myBoards.filter(b => b.visibility === 'public').length,  icon: Icons.Globe,      bg: '#E0F2FE', iconColor: '#0284C7', numColor: '#0C4A6E' },
            { label: 'Private boards', value: myBoards.filter(b => b.visibility === 'private').length, icon: Icons.Lock,       bg: '#EDE9FE', iconColor: '#7C3AED', numColor: '#3B0764' },
          ].map(s => (
            <div key={s.label}
              className="bg-white rounded-2xl border border-[#F3F4F6] px-5 py-4 flex items-center gap-3 shadow-sm">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: s.bg }}
              >
                <s.icon size={16} style={{ color: s.iconColor }} />
              </div>
              <div>
                <p className="text-[24px] font-extrabold leading-none" style={{ color: s.numColor }}>{s.value}</p>
                <p className="text-[11px] font-semibold mt-0.5 text-[#6B7280]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Boards list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-[#111827]">Your boards</h2>
          {myBoards.length > 0 && (
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-teal-600 hover:text-teal-700 transition-colors">
              <Icons.Plus size={13} /> New board
            </button>
          )}
        </div>

        {myBoards.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-[#E5E7EB] p-14 text-center">
            <div className="flex justify-center mb-4">
              <IlluNoBoards size={100} />
            </div>
            <h3 className="text-[17px] font-bold text-[#374151] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              No boards yet
            </h3>
            <p className="text-[13px] text-[#9CA3AF] mb-6 max-w-xs mx-auto">
              Create your first feedback board and start collecting insights from your users.
            </p>
            <Button onClick={() => setCreateOpen(true)} leftIcon={<Icons.Plus size={14} />}>
              Create a board
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {myBoards.map(board => (
              <div key={board.id}
                className="group bg-white rounded-2xl border border-[#F3F4F6]
                  hover:shadow-md hover:border-[#E5E7EB] transition-all duration-200 overflow-hidden">
                <div className="h-1" style={{ backgroundColor: board.accentColor }} />
                <div className="flex items-center gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-bold text-[#111827] truncate">{board.name}</h3>
                      {/* Visibility using illustration + text */}
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                        ${board.visibility === 'private' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {board.visibility === 'private'
                          ? <><IlluPrivate size={11} /> Private</>
                          : <><IlluPublic  size={11} /> Public</>
                        }
                      </span>
                      {!isPro && (board.totalInteractions ?? 0) >= 25 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 flex-shrink-0">
                          Limit reached
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#9CA3AF] truncate">
                      {board.tagline || board.description || 'No description'}
                    </p>
                    <p className="text-[11px] text-[#D1D5DB] mt-1">
                      Created {board.createdAt} ·{' '}
                      <span className="text-[#9CA3AF]">
                        {board.totalInteractions ?? 0} interaction{(board.totalInteractions ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0
                    opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/boards/${board.slug}`)}>
                      View
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/dashboard/boards/${board.slug}`)}>
                      <Icons.Settings size={13} /> Manage
                    </Button>
                    {deleteConfirm === board.id ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="danger" onClick={() => handleDelete(board.id)}>Confirm</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(board.id)}
                        className="p-2 rounded-lg text-[#9CA3AF] hover:text-rose-500 hover:bg-rose-50 transition-all"
                        title="Delete board">
                        <Icons.Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateBoardModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
