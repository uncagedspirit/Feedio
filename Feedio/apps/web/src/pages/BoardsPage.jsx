import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Icons } from '../components/ui/Icons'
import { IlluRocket } from '../components/illustrations'
import { Input } from '../components/ui/index'
import BoardCard from '../components/boards/BoardCard'

export default function BoardsPage({ onAuthClick }) {
  const { getPublicBoards } = useApp()
  const boards = getPublicBoards()
  const [search, setSearch] = useState('')

  const filtered = boards.filter(b =>
    !search ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.tagline.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-20">
      {/* Header */}
      <div className="bg-white border-b border-[#F3F4F6]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-teal-600 mb-2">Public boards</p>
          <h1
            className="text-[32px] md:text-[40px] font-extrabold text-[#111827] mb-3 leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Discover products made by real founders
          </h1>
          <p className="text-[14px] text-[#9CA3AF] mb-6 max-w-lg">
            These teams use feedio to collect public feedback and build in the open.
            Vote, suggest features, or start your own board.
          </p>

          {/* Search */}
          <Input
            placeholder="Search boards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Icons.Search size={14} />}
            className="max-w-sm"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-[15px] font-semibold text-[#374151] mb-1">No boards found</p>
            <p className="text-[13px] text-[#9CA3AF]">Try a different search term</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(board => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}

        {/* Invite */}
        <div className="mt-14 text-center bg-white rounded-2xl border border-[#F3F4F6] p-10 shadow-sm">
          <div className="flex justify-center mb-3"><IlluRocket size={64} /></div>
          <h2 className="text-[18px] font-bold text-[#111827] mb-2">Add your product here</h2>
          <p className="text-[13px] text-[#9CA3AF] mb-5 max-w-sm mx-auto">
            Create a free feedback board and get listed. Build in the open.
          </p>
          <button
            onClick={() => onAuthClick('signup')}
            className="inline-flex items-center gap-2 bg-[#1a2e28] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#243d35] transition-colors"
          >
            Create a free board
            <Icons.ArrowUp size={13} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
