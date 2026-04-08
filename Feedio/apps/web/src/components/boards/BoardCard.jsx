import { useRouter } from '../../router'
import { Icons } from '../ui/Icons'
import { Avatar } from '../ui/index'

export default function BoardCard({ board }) {
  const { navigate } = useRouter()

  return (
    <div
      onClick={() => navigate(`/boards/${board.slug}`)}
      className="group bg-white rounded-2xl border border-[#F3F4F6] shadow-sm hover:shadow-lg
        hover:-translate-y-1 cursor-pointer transition-all duration-300 overflow-hidden"
    >
      {/* Accent stripe */}
      <div
        className="h-1.5"
        style={{ backgroundColor: board.accentColor }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-[#111827] mb-0.5 group-hover:text-teal-700 transition-colors truncate">
              {board.name}
            </h3>
            <p className="text-[12px] text-[#9CA3AF] truncate">{board.tagline}</p>
          </div>
          {board.website && (
            <a
              href={board.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex-shrink-0 p-1.5 rounded-lg text-[#D1D5DB] hover:text-[#6B7280] hover:bg-[#F9FAFB] transition-all"
            >
              <Icons.ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Description */}
        <p className="text-[12px] text-[#6B7280] leading-relaxed line-clamp-2 mb-4">
          {board.description}
        </p>

        {/* Tags sample */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {board.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] rounded-full"
            >
              {tag}
            </span>
          ))}
          {board.tags.length > 3 && (
            <span className="text-[10px] text-[#D1D5DB] flex items-center">+{board.tags.length - 3}</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F9FAFB]">
          <div className="flex items-center gap-2">
            <Avatar
              initials={board.ownerAvatarInitials}
              color={board.ownerAvatarColor}
              size="sm"
            />
            <span className="text-[11px] text-[#9CA3AF] font-medium">{board.ownerName}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
            <Icons.ArrowUp size={11} />
            <span>{board.totalInteractions} interactions</span>
          </div>
        </div>
      </div>
    </div>
  )
}
