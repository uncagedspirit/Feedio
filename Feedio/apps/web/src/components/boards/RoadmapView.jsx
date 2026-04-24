import { useState } from "react";
import {
  IlluColumnLive,
  IlluColumnBuilding,
  IlluColumnSoon,
  IlluColumnThinking,
} from "../illustrations";
import { ROADMAP_COLUMNS } from "../../data/mockData";
import FeedbackCard from "./FeedbackCard";

/** Map column key → illustration component */
const COLUMN_ICON = {
  live: IlluColumnLive,
  in_development: IlluColumnBuilding,
  coming_soon: IlluColumnSoon,
  considering: IlluColumnThinking,
};

export default function RoadmapView({
  board,
  posts,
  adminMode = false,
  onStatusChange,
  onDelete,
  onPin,
}) {
  const [draggedPost, setDraggedPost] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const handleDragStart = (e, post) => {
    if (!adminMode) {
      e.preventDefault();
      return;
    }
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, columnKey) => {
    if (!adminMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, columnKey) => {
    if (!adminMode) return;
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedPost && draggedPost.status !== columnKey) {
      onStatusChange?.(draggedPost.id, columnKey);
    }
    setDraggedPost(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {ROADMAP_COLUMNS.map((col) => {
        const colPosts = posts.filter((p) => p.status === col.key);
        const ColIcon = COLUMN_ICON[col.key] ?? IlluColumnLive;
        const isDropTarget = adminMode && dragOverColumn === col.key;

        return (
          <div key={col.key} className="flex flex-col gap-3 min-h-[200px]">
            {/* Column header */}
            <div
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border"
              style={{
                backgroundColor: col.columnBg,
                borderColor: col.columnBg,
              }}
            >
              <div className="flex items-center gap-2">
                <ColIcon size={18} />
                <span className="text-[13px] font-semibold text-[#111827]">
                  {col.label}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#6B7280] bg-white/60 px-2 py-0.5 rounded-full">
                {colPosts.length}
              </span>
            </div>

            {/* Cards - drop zone for admin mode */}
            <div
              className={`flex flex-col gap-2.5 p-2 rounded-xl transition-all ${
                adminMode ? "cursor-grab" : ""
              } ${
                isDropTarget
                  ? "bg-teal-100/30 border-2 border-dashed border-teal-400 -m-2 p-2"
                  : ""
              }`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {colPosts.length === 0 ? (
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-2xl py-8 text-center">
                  <p className="text-[12px] text-[#D1D5DB]">Nothing here yet</p>
                </div>
              ) : (
                colPosts.map((post) => (
                  <div
                    key={post.id}
                    draggable={adminMode}
                    onDragStart={(e) => handleDragStart(e, post)}
                    onDragEnd={() => setDraggedPost(null)}
                    className={`transition-opacity ${adminMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                  >
                    <FeedbackCard
                      post={post}
                      board={board}
                      compact
                      adminMode={adminMode}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                      onPin={onPin}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
