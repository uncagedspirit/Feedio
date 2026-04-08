import {
  IlluColumnLive,
  IlluColumnBuilding,
  IlluColumnSoon,
  IlluColumnThinking,
} from '../illustrations'
import { ROADMAP_COLUMNS } from '../../data/mockData'
import FeedbackCard from './FeedbackCard'

/** Map column key → illustration component */
const COLUMN_ICON = {
  live:           IlluColumnLive,
  in_development: IlluColumnBuilding,
  coming_soon:    IlluColumnSoon,
  considering:    IlluColumnThinking,
}

export default function RoadmapView({ board, posts, adminMode = false, onStatusChange, onDelete, onPin }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {ROADMAP_COLUMNS.map(col => {
        const colPosts = posts.filter(p => p.status === col.key)
        const ColIcon  = COLUMN_ICON[col.key] ?? IlluColumnLive
        return (
          <div key={col.key} className="flex flex-col gap-3 min-h-[200px]">
            {/* Column header */}
            <div
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border"
              style={{ backgroundColor: col.columnBg, borderColor: col.columnBg }}
            >
              <div className="flex items-center gap-2">
                <ColIcon size={18} />
                <span className="text-[13px] font-semibold text-[#111827]">{col.label}</span>
              </div>
              <span className="text-[11px] font-bold text-[#6B7280] bg-white/60 px-2 py-0.5 rounded-full">
                {colPosts.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
              {colPosts.length === 0 ? (
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-2xl py-8 text-center">
                  <p className="text-[12px] text-[#D1D5DB]">Nothing here yet</p>
                </div>
              ) : (
                colPosts.map(post => (
                  <FeedbackCard
                    key={post.id}
                    post={post}
                    board={board}
                    compact
                    adminMode={adminMode}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                    onPin={onPin}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
