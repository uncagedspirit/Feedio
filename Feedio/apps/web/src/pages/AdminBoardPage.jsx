import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useRouter } from "../router";
import { STATUS_CONFIG } from "../data/mockData";
import { Icons } from "../components/ui/Icons";
import {
  Avatar,
  Button,
  EmptyState,
  CopyButton,
  Toggle,
} from "../components/ui/index";
import {
  IlluNotFound,
  IlluAccessDenied,
  IlluEmptyPosts,
  IlluPublic,
  IlluPrivate,
  IlluSortFire,
  IlluSortNew,
} from "../components/illustrations";
import FeedbackCard from "../components/boards/FeedbackCard";
import RoadmapView from "../components/boards/RoadmapView";
import AddRequestModal from "../components/boards/AddRequestModal";
import { Analytics } from "../lib/analytics.js";

export default function AdminBoardPage({ params }) {
  const {
    getBoardBySlug,
    getBoardPosts,
    currentUser,
    updatePost,
    deletePost,
    updateBoard,
    deleteBoard,
    loadBoardPosts,
  } = useApp();
  const { navigate } = useRouter();

  const board = getBoardBySlug(params.slug);

  useEffect(() => {
    if (board?.id) loadBoardPosts(board.id);
  }, [board?.id, loadBoardPosts]);

  const [tab, setTab] = useState("feed");
  const [sort, setSort] = useState("top");
  const [tagFilter, setTagFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── FIX: initialize settings/tags from board, re-sync when board changes ──
  const [settingsForm, setSettingsForm] = useState(null);
  const [tagsForm, setTagsForm] = useState(null);
  const [newTagInput, setNewTagInput] = useState("");

  useEffect(() => {
    if (board) {
      setSettingsForm({ ...(board.settings ?? {}) });
      setTagsForm([...(board.tags ?? ["Feature", "Bug", "Other"])]);
    }
  }, [board?.id]); // re-sync only when board ID changes (i.e. new board loaded)

  if (!board) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center pt-14">
        <EmptyState
          illustration={<IlluNotFound size={96} />}
          title="Board not found"
          body="This board doesn't exist or was deleted."
          action={
            <Button onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
          }
        />
      </div>
    );
  }

  if (!currentUser || currentUser.id !== board.ownerId) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center pt-14">
        <EmptyState
          illustration={<IlluAccessDenied size={96} />}
          title="Access denied"
          body="You don't have permission to manage this board."
          action={
            <Button onClick={() => navigate("/dashboard")}>My dashboard</Button>
          }
        />
      </div>
    );
  }

  // Guard: forms not yet initialized (render nothing until useEffect fires)
  if (!settingsForm || !tagsForm) return null;

  const allPosts = getBoardPosts(board.id);
  const filtered = allPosts.filter(
    (p) => tagFilter === "all" || p.tag === tagFilter,
  );
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "top") return b.upvotes - a.upvotes;
    if (sort === "new") return new Date(b.createdAt) - new Date(a.createdAt);
    return 0;
  });

  const handleStatusChange = (postId, status) => {
    const post = allPosts.find((p) => p.id === postId);
    if (post) Analytics.postStatusChanged(post, status);
    updatePost(postId, { status });
  };
  const handleDelete = (postId) => deletePost(postId);
  const handlePin = (postId) => {
    const p = allPosts.find((x) => x.id === postId);
    if (p) updatePost(postId, { pinned: !p.pinned });
  };

  const handleSaveSettings = () => {
    updateBoard(board.id, { settings: settingsForm, tags: tagsForm });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (trimmed && !tagsForm.includes(trimmed)) {
      setTagsForm((prev) => [...prev, trimmed]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTagsForm((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const boardUrl = `${window.location.origin}/boards/${board.slug}`;
  const isPro = currentUser.plan === "pro";
  const usedCount = board.totalInteractions ?? 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-14 flex flex-col">
      {/* ── HEADER ── */}
      <div
        className={`bg-gradient-to-br ${board.headerGradient ?? "from-teal-600 to-emerald-500"}`}
      >
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-white/55 hover:text-white/90 text-[12px] mb-5 transition-colors group"
          >
            <Icons.ArrowLeft
              size={16}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <h1
                  className="text-[24px] sm:text-[28px] font-extrabold text-white"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {board.name}
                </h1>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                  {board.visibility === "private" ? (
                    <>
                      <IlluPrivate size={13} /> Private
                    </>
                  ) : (
                    <>
                      <IlluPublic size={13} /> Public
                    </>
                  )}
                </span>
              </div>
              <p className="text-white/55 text-[13px]">{board.tagline}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyButton
                text={boardUrl}
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
              />
              <Button
                size="sm"
                onClick={() => navigate(`/boards/${board.slug}`)}
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
                leftIcon={<Icons.Eye size={15} />}
              >
                Public view
              </Button>
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                leftIcon={<Icons.Plus size={15} />}
              >
                Add request
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/10">
            {[
              { label: "Requests", value: allPosts.length },
              {
                label: "Total votes",
                value: allPosts.reduce((s, p) => s + p.upvotes, 0),
              },
              {
                label: "Interactions",
                value: `${usedCount}/${isPro ? "∞" : "25"}`,
              },
              {
                label: "Shipped",
                value: allPosts.filter((p) => p.status === "live").length,
              },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[22px] font-extrabold text-white leading-none drop-shadow">
                  {s.value}
                </p>
                <p className="text-[11px] text-white/60 mt-0.5 font-medium">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="sticky top-14 z-30 bg-white border-b border-[#F3F4F6] shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-11 flex items-center gap-1">
          {[
            { key: "feed", Icon: Icons.List, label: "Feed" },
            { key: "roadmap", Icon: Icons.Grid, label: "Roadmap" },
            { key: "settings", Icon: Icons.Settings, label: "Settings" },
          ].map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-all
                ${tab === key ? "bg-[#F0FDF4] text-teal-700" : "text-[#6B7280] hover:text-[#374151] hover:bg-[#F9FAFB]"}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[11px] text-[#9CA3AF] font-medium hidden sm:block">
            Admin view
          </span>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {tab === "feed" && (
          <div className="flex gap-8">
            <aside className="hidden lg:block w-44 flex-shrink-0">
              <div className="sticky top-28 flex flex-col gap-5">
                <FilterSection label="Sort">
                  <FilterChip
                    active={sort === "top"}
                    onClick={() => setSort("top")}
                  >
                    <IlluSortFire size={16} /> Most voted
                  </FilterChip>
                  <FilterChip
                    active={sort === "new"}
                    onClick={() => setSort("new")}
                  >
                    <IlluSortNew size={16} /> Newest
                  </FilterChip>
                </FilterSection>
                <FilterSection label="Category">
                  <FilterChip
                    active={tagFilter === "all"}
                    onClick={() => setTagFilter("all")}
                  >
                    All
                  </FilterChip>
                  {board.tags.map((t) => (
                    <FilterChip
                      key={t}
                      active={tagFilter === t}
                      onClick={() => setTagFilter(t)}
                    >
                      {t}
                    </FilterChip>
                  ))}
                </FilterSection>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] text-[#9CA3AF]">
                  {sorted.length} request{sorted.length !== 1 ? "s" : ""}
                </p>
                <span className="text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full">
                  Hover cards to change status, pin, or delete
                </span>
              </div>
              {sorted.length === 0 ? (
                <EmptyState
                  illustration={<IlluEmptyPosts size={88} />}
                  title="No requests yet"
                  body="Requests from your users will appear here."
                  action={
                    <Button
                      onClick={() => setAddOpen(true)}
                      leftIcon={<Icons.Plus size={15} />}
                    >
                      Add first request
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {sorted.map((post) => (
                    <FeedbackCard
                      key={post.id}
                      post={post}
                      board={board}
                      adminMode
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onPin={handlePin}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "roadmap" && (
          <RoadmapView
            board={board}
            posts={allPosts}
            adminMode
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onPin={handlePin}
          />
        )}

        {tab === "settings" && (
          <div className="max-w-xl flex flex-col gap-5">
            <SettingsCard
              title="Request categories"
              subtitle="Customize tags for organizing feedback"
            >
              <div className="flex flex-col gap-3">
                {tagsForm.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tagsForm.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-2 bg-[#F0FDF4] border border-teal-200 rounded-lg px-3 py-1.5"
                      >
                        <span className="text-[12px] font-medium text-teal-700">
                          {tag}
                        </span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-teal-500 hover:text-teal-700 transition-colors"
                          title="Remove tag"
                        >
                          <Icons.X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleAddTag} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-[#6B7280] mb-1.5">
                      Add new category
                    </label>
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="e.g. Feature, Bug, Documentation"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-teal-600 text-white rounded-lg text-[12px] font-semibold hover:bg-teal-700 transition-colors"
                  >
                    <Icons.Plus size={15} />
                  </button>
                </form>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Consumer identity"
              subtitle="Control what information submitters must provide"
            >
              <Toggle
                checked={settingsForm.requireName ?? true}
                onChange={(v) =>
                  setSettingsForm((f) => ({
                    ...f,
                    requireName: v,
                    ...(v ? { allowAnonymous: false } : {}),
                  }))
                }
                label="Require submitter's name"
                hint="Consumers must enter their name to submit or vote"
              />
              <Toggle
                checked={settingsForm.requireEmail ?? false}
                onChange={(v) =>
                  setSettingsForm((f) => ({
                    ...f,
                    requireEmail: v,
                    ...(v ? { allowAnonymous: false } : {}),
                  }))
                }
                label="Require email address"
                hint="Email is collected privately — never shown publicly"
              />
              <Toggle
                checked={settingsForm.allowAnonymous ?? false}
                onChange={(v) =>
                  setSettingsForm((f) => ({
                    ...f,
                    allowAnonymous: v,
                    ...(v ? { requireName: false, requireEmail: false } : {}),
                  }))
                }
                label="Allow fully anonymous submissions"
                hint="No name or email required"
              />
              <Toggle
                checked={settingsForm.showVoterCount ?? true}
                onChange={(v) =>
                  setSettingsForm((f) => ({ ...f, showVoterCount: v }))
                }
                label="Show vote counts publicly"
              />
            </SettingsCard>

            <SettingsCard
              title="Share your board"
              subtitle="Send this link to your users"
            >
              <div className="flex items-center gap-2 bg-[#F9FAFB] rounded-xl px-4 py-3 border border-[#F3F4F6]">
                <code className="flex-1 text-[12px] text-[#374151] break-all">
                  {boardUrl}
                </code>
                <CopyButton text={boardUrl} />
              </div>
              <div
                className={`flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg mt-2
                ${board.visibility === "private" ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"}`}
              >
                {board.visibility === "private" ? (
                  <IlluPrivate size={15} />
                ) : (
                  <IlluPublic size={15} />
                )}
                {board.visibility === "private"
                  ? "Only people with this link can access this board."
                  : "This board is listed publicly in the boards directory."}
              </div>
            </SettingsCard>

            {!isPro && (
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-violet-800 mb-1">
                      Free plan
                    </p>
                    <p className="text-[12px] text-violet-600">
                      {usedCount}/25 interactions used. Upgrade for unlimited
                      interactions, private boards, and more.
                    </p>
                  </div>
                  <Button
                    variant="pro"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => navigate("/dashboard")}
                    leftIcon={<Icons.Crown size={15} />}
                  >
                    Upgrade
                  </Button>
                </div>
                <div className="mt-3 h-1.5 bg-violet-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (usedCount / 25) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <Button onClick={handleSaveSettings} disabled={saved}>
              {saved ? (
                <>
                  <Icons.Check size={16} /> Settings saved
                </>
              ) : (
                "Save settings"
              )}
            </Button>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 mt-2">
              <h3 className="text-[14px] font-bold text-rose-800 mb-1">
                Danger zone
              </h3>
              <p className="text-[12px] text-rose-400 mb-3">
                Permanently deletes this board and all its requests.
              </p>
              <Button
                variant="danger"
                leftIcon={<Icons.Trash size={15} />}
                onClick={() => {
                  if (
                    confirm(
                      `Delete "${board.name}" and all its requests? This cannot be undone.`,
                    )
                  ) {
                    deleteBoard(board.id);
                    navigate("/dashboard");
                  }
                }}
              >
                Delete board
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddRequestModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        board={board}
      />
    </div>
  );
}

function SettingsCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F3F4F6] p-6">
      <div className="mb-4">
        <h3 className="text-[14px] font-bold text-[#111827]">{title}</h3>
        {subtitle && (
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
function FilterSection({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold tracking-widest uppercase text-[#9CA3AF] mb-2">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-left w-full px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer
        ${active ? "bg-[#F0FDF4] text-teal-700 font-semibold" : "text-[#374151] hover:bg-[#F0FDF4] hover:text-teal-700"}`}
    >
      {children}
    </button>
  );
}