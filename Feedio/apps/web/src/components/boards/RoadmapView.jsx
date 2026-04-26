import { useState, useRef, useCallback } from "react";
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

// ── Drag state singleton (avoids prop-drilling through FeedbackCard) ─────────
let _draggingPost = null;

export default function RoadmapView({
  board,
  posts,
  adminMode = false,
  onStatusChange,
  onDelete,
  onPin,
}) {
  // Which post is being dragged
  const [draggingId, setDraggingId]       = useState(null);
  // Which column the drag is currently hovering over
  const [overColumn, setOverColumn]       = useState(null);
  // Which card slot the drag is hovering over (for ordering preview)
  const [overCardId, setOverCardId]       = useState(null);
  // Whether we're hovering the bottom empty zone of a column
  const [overBottom, setOverBottom]       = useState(false);

  const dragCounter = useRef({}); // per-column enter/leave counters

  // ── Drag start ─────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, post) => {
    if (!adminMode) { e.preventDefault(); return; }
    _draggingPost = post;
    setDraggingId(post.id);
    e.dataTransfer.effectAllowed = "move";
    // Ghost image: slightly transparent clone via CSS (handled by opacity)
    e.dataTransfer.setData("text/plain", post.id);
  }, [adminMode]);

  const handleDragEnd = useCallback(() => {
    _draggingPost = null;
    setDraggingId(null);
    setOverColumn(null);
    setOverCardId(null);
    setOverBottom(false);
    dragCounter.current = {};
  }, []);

  // ── Column drag-over / enter / leave ──────────────────────────────────────
  const handleColumnDragEnter = useCallback((e, colKey) => {
    if (!adminMode) return;
    e.preventDefault();
    dragCounter.current[colKey] = (dragCounter.current[colKey] || 0) + 1;
    setOverColumn(colKey);
  }, [adminMode]);

  const handleColumnDragLeave = useCallback((e, colKey) => {
    if (!adminMode) return;
    dragCounter.current[colKey] = (dragCounter.current[colKey] || 1) - 1;
    if (dragCounter.current[colKey] <= 0) {
      dragCounter.current[colKey] = 0;
      setOverColumn((prev) => (prev === colKey ? null : prev));
      setOverCardId(null);
      setOverBottom(false);
    }
  }, [adminMode]);

  const handleColumnDragOver = useCallback((e) => {
    if (!adminMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, [adminMode]);

  // ── Card drag-over (for insert-position preview) ──────────────────────────
  const handleCardDragOver = useCallback((e, cardId) => {
    if (!adminMode) return;
    e.preventDefault();
    e.stopPropagation();
    setOverCardId(cardId);
    setOverBottom(false);
  }, [adminMode]);

  // ── Drop on column ────────────────────────────────────────────────────────
  const handleDrop = useCallback((e, colKey) => {
    if (!adminMode) return;
    e.preventDefault();
    dragCounter.current[colKey] = 0;
    setOverColumn(null);
    setOverCardId(null);
    setOverBottom(false);

    const post = _draggingPost;
    if (post && post.status !== colKey) {
      onStatusChange?.(post.id, colKey);
    }
    _draggingPost = null;
    setDraggingId(null);
  }, [adminMode, onStatusChange]);

  return (
    <div>
      {adminMode && (
        <div className="flex items-center gap-2 mb-5 px-1">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <p className="text-[12px] text-[#9CA3AF] font-medium">
            Drag cards between columns to update their status
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROADMAP_COLUMNS.map((col) => {
          const colPosts    = posts.filter((p) => p.status === col.key);
          const ColIcon     = COLUMN_ICON[col.key] ?? IlluColumnLive;
          const isDropTarget = adminMode && overColumn === col.key;
          const draggingPost = posts.find((p) => p.id === draggingId);
          const isSameCol   = draggingPost?.status === col.key;

          return (
            <div
              key={col.key}
              className="flex flex-col gap-3"
              onDragEnter={(e) => handleColumnDragEnter(e, col.key)}
              onDragLeave={(e) => handleColumnDragLeave(e, col.key)}
              onDragOver={handleColumnDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {/* ── Column header ── */}
              <div
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 transition-all duration-200
                  ${isDropTarget && !isSameCol
                    ? "border-teal-400 shadow-md scale-[1.01]"
                    : "border-transparent"
                  }`}
                style={{
                  backgroundColor: col.columnBg,
                }}
              >
                <div className="flex items-center gap-2">
                  <ColIcon size={22} />
                  <span className="text-[13px] font-semibold text-[#111827]">
                    {col.label}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#6B7280] bg-white/60 px-2 py-0.5 rounded-full">
                  {colPosts.length}
                </span>
              </div>

              {/* ── Drop zone body ── */}
              <div
                className={`flex flex-col gap-2.5 min-h-[120px] rounded-xl p-2 transition-all duration-200
                  ${isDropTarget && !isSameCol
                    ? "bg-teal-50/60 ring-2 ring-teal-300 ring-dashed"
                    : "bg-transparent"
                  }`}
              >
                {colPosts.length === 0 ? (
                  <div
                    className={`flex-1 border-2 border-dashed rounded-2xl py-10 text-center transition-all duration-200
                      ${isDropTarget && !isSameCol
                        ? "border-teal-400 bg-teal-50"
                        : "border-[#E5E7EB]"
                      }`}
                  >
                    {isDropTarget && !isSameCol ? (
                      <p className="text-[12px] text-teal-500 font-semibold">
                        Drop here
                      </p>
                    ) : (
                      <p className="text-[12px] text-[#D1D5DB]">
                        Nothing here yet
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {colPosts.map((post) => {
                      const isDragging = post.id === draggingId;
                      const isInsertTarget = overCardId === post.id && isDropTarget && !isSameCol;

                      return (
                        <div key={post.id}>
                          {/* Insert-before indicator */}
                          {isInsertTarget && (
                            <div className="h-0.5 bg-teal-400 rounded-full mx-1 mb-2 shadow-sm" />
                          )}
                          <div
                            draggable={adminMode}
                            onDragStart={(e) => handleDragStart(e, post)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleCardDragOver(e, post.id)}
                            className={`transition-all duration-200
                              ${adminMode ? "cursor-grab active:cursor-grabbing" : ""}
                              ${isDragging ? "opacity-40 scale-[0.97] rotate-1" : "opacity-100"}
                            `}
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
                        </div>
                      );
                    })}

                    {/* Drop-at-bottom zone */}
                    {isDropTarget && !isSameCol && (
                      <div
                        className="h-8 rounded-xl border-2 border-dashed border-teal-300 flex items-center justify-center"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOverCardId(null);
                          setOverBottom(true);
                        }}
                      >
                        <p className="text-[11px] text-teal-400 font-semibold">
                          + Drop here
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}