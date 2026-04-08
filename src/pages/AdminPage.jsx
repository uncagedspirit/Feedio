/**
 * AdminPage — /admin
 *
 * Private owner-only dashboard. Accessible only to users whose ID is in
 * the ADMIN_USER_IDS Supabase secret (enforced server-side in admin-api).
 *
 * Shows:
 *   - Platform stats (users, plans, boards, posts)
 *   - Users table with masked emails + plan/status info
 *   - Trial link management (create, view, deactivate)
 */
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useRouter } from "../router";
import { supabase } from "../lib/supabase";
import { Icons } from "../components/ui/Icons";
import { Button, Input, Badge } from "../components/ui/index";

// ─── API helper ───────────────────────────────────────────────────────────────
async function adminApi(action, params = {}) {
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message ?? "Admin API error");
  return data;
}

// ─── SUBSCRIPTION STATE COLORS ────────────────────────────────────────────────
const STATE_STYLE = {
  active: { bg: "#DCFCE7", color: "#14532D", dot: "#22C55E" },
  cancel_scheduled: { bg: "#FEF9C3", color: "#713F12", dot: "#EAB308" },
  in_grace: { bg: "#FFEDD5", color: "#7C2D12", dot: "#F97316" },
  expired: { bg: "#FEE2E2", color: "#7F1D1D", dot: "#EF4444" },
  free: { bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" },
};

const PLAN_STYLE = {
  pro: { bg: "#EDE9FE", color: "#5B21B6" },
  free: { bg: "#F3F4F6", color: "#6B7280" },
};

function stateDot(state) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.free;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: s.dot }}
      />
      {state?.replace(/_/g, " ") ?? "free"}
    </span>
  );
}

function planBadge(plan) {
  const s = PLAN_STYLE[plan] ?? PLAN_STYLE.free;
  return (
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {plan ?? "free"}
    </span>
  );
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, bg = "#F3F4F6", color = "#111827" }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F3F4F6] px-5 py-4 flex items-center gap-3 shadow-sm">
      <div className="flex-1 min-w-0">
        <p
          className="text-[24px] font-extrabold leading-none"
          style={{ color }}
        >
          {value ?? "—"}
        </p>
        <p className="text-[11px] font-semibold mt-0.5 text-[#6B7280]">
          {label}
        </p>
        {sub && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── CREATE TRIAL LINK MODAL ──────────────────────────────────────────────────
function CreateLinkModal({ open, onClose, onCreated, appUrl }) {
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("10");
  const [trialDays, setTrialDays] = useState("30");
  const [expiresDays, setExpiresDays] = useState("90");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const reset = () => {
    setLabel("");
    setMaxUses("10");
    setTrialDays("30");
    setExpiresDays("90");
    setError("");
    setCreated(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi("create_trial_link", {
        label,
        max_uses: parseInt(maxUses, 10),
        trial_days: parseInt(trialDays, 10),
        expires_days: parseInt(expiresDays, 10),
      });
      setCreated(res.trial_link);
      onCreated(res.trial_link);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const trialUrl = created ? `${appUrl}/trial/${created.token}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          <Icons.X size={16} />
        </button>

        {created ? (
          <div>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#CCFBF1] flex items-center justify-center">
                <Icons.Check size={22} className="text-teal-600" />
              </div>
            </div>
            <h2 className="text-[17px] font-bold text-[#111827] mb-1 text-center">
              Trial link created
            </h2>
            <p className="text-[12px] text-[#9CA3AF] text-center mb-5">
              {created.max_uses} use{created.max_uses !== 1 ? "s" : ""} ·{" "}
              {created.trial_days}-day trial
            </p>
            <div className="bg-[#F9FAFB] rounded-xl px-4 py-3 flex items-center gap-2 mb-5">
              <code className="flex-1 text-[12px] text-[#374151] break-all">
                {trialUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(trialUrl)}
                className="flex-shrink-0 text-teal-600 hover:text-teal-700"
              >
                <Icons.Copy size={14} />
              </button>
            </div>
            <Button fullWidth onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="text-[17px] font-bold text-[#111827] mb-5">
              Create trial link
            </h2>
            {error && (
              <div className="mb-4 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[12px] text-rose-600">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-4">
              <Input
                label="Label (internal note)"
                placeholder="e.g. ProductHunt launch"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Max uses"
                  type="number"
                  min="1"
                  max="10000"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
                <Input
                  label="Trial days"
                  type="number"
                  min="1"
                  max="365"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                />
                <Input
                  label="Link expires (days)"
                  type="number"
                  min="1"
                  max="730"
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-[#9CA3AF] bg-[#F9FAFB] px-3 py-2 rounded-lg">
                Link expires in {expiresDays} days. Each redemption gives{" "}
                {trialDays} days of Pro access. Maximum {maxUses} total
                redemptions.
              </p>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" fullWidth onClick={handleClose}>
                  Cancel
                </Button>
                <Button fullWidth onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating…" : "Create link"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { currentUser } = useApp();
  const { navigate } = useRouter();

  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [trialLinks, setTrialLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(null);
  const [copied, setCopied] = useState(null);

  const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;

  // ── Fetch stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await adminApi("get_stats");
      setStats(res.stats);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // ── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1, search = "") => {
    try {
      const res = await adminApi("get_users", {
        page,
        per_page: 20,
        search: search || null,
      });
      setUsers(res.users ?? []);
      setUserTotal(res.total ?? 0);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // ── Fetch trial links ────────────────────────────────────────────────────────
  const fetchTrialLinks = useCallback(async () => {
    try {
      const res = await adminApi("get_trial_links");
      setTrialLinks(res.trial_links ?? []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(1, ""), fetchTrialLinks()]).finally(
      () => setLoading(false),
    );
  }, [currentUser, fetchStats, fetchUsers, fetchTrialLinks]);

  useEffect(() => {
    if (tab === "users") fetchUsers(userPage, userSearch);
  }, [tab, userPage, userSearch, fetchUsers]);

  const handleDeactivate = async (linkId) => {
    setDeactivating(linkId);
    try {
      await adminApi("deactivate_trial_link", { link_id: linkId });
      setTrialLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, is_active: false } : l)),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setDeactivating(null);
    }
  };

  const copyLink = (token) => {
    navigator.clipboard.writeText(`${appUrl}/trial/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center pt-14">
        <p className="text-[14px] text-[#6B7280]">
          Sign in to access the admin panel.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1d16] pt-14">
      {/* ── HEADER ── */}
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-teal-400">
                Admin
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            </div>
            <h1
              className="text-[22px] font-extrabold text-white"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Owner Dashboard
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            leftIcon={<Icons.ArrowLeft size={13} />}
          >
            Back to app
          </Button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 pb-0">
          {[
            { key: "overview", label: "Overview", icon: Icons.BarChart },
            { key: "users", label: "Users", icon: Icons.Users },
            { key: "trials", label: "Trial Links", icon: Icons.Link },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all
                ${
                  tab === key
                    ? "border-teal-400 text-teal-300"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 px-4 py-3 bg-rose-900/40 border border-rose-500/30 rounded-xl text-[13px] text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-rose-400 hover:text-rose-200"
            >
              <Icons.X size={14} />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-xl bg-teal-800 animate-pulse" />
          </div>
        )}

        {!loading && (
          <>
            {/* ── OVERVIEW TAB ── */}
            {tab === "overview" && stats && (
              <div>
                <p className="text-[11px] font-extrabold tracking-widest uppercase text-teal-400/60 mb-5">
                  Platform stats
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  <StatCard
                    label="Total users"
                    value={stats.total_users}
                    color="#CCFBF1"
                  />
                  <StatCard
                    label="Pro users"
                    value={stats.pro_users}
                    color="#C4B5FD"
                  />
                  <StatCard
                    label="Active subs"
                    value={stats.active_subs}
                    color="#86EFAC"
                  />
                  <StatCard
                    label="Free users"
                    value={stats.free_users}
                    color="#9CA3AF"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  <StatCard
                    label="Cancel scheduled"
                    value={stats.cancel_scheduled}
                    color="#FCD34D"
                  />
                  <StatCard
                    label="In grace"
                    value={stats.in_grace}
                    color="#FDBA74"
                  />
                  <StatCard
                    label="Expired"
                    value={stats.expired}
                    color="#FDA4AF"
                  />
                  <StatCard
                    label="Active trial links"
                    value={stats.trial_links_active}
                    color="#5EEAD4"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Total boards"
                    value={stats.total_boards}
                    color="#7DD3FC"
                  />
                  <StatCard
                    label="Total posts"
                    value={stats.total_posts}
                    color="#A5F3FC"
                  />
                </div>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {tab === "users" && (
              <div>
                <div className="flex items-center justify-between mb-5 gap-4">
                  <p className="text-[11px] font-extrabold tracking-widest uppercase text-teal-400/60">
                    {userTotal} user{userTotal !== 1 ? "s" : ""}
                  </p>
                  <div className="w-64">
                    <Input
                      placeholder="Search name or email…"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      leftIcon={<Icons.Search size={13} />}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#F3F4F6] overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#F3F4F6]">
                        {[
                          "Name",
                          "Email",
                          "Plan",
                          "State",
                          "Boards",
                          "Joined",
                          "Active",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-[11px] font-extrabold text-[#9CA3AF] uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-12 text-[13px] text-[#9CA3AF]"
                          >
                            No users found
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-[#F9FAFB] hover:bg-[#FAFAFA] transition-colors"
                          >
                            <td className="px-4 py-3 text-[13px] font-semibold text-[#111827] max-w-[140px] truncate">
                              {user.name || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-[12px] text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-lg">
                                {user.masked_email}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              {planBadge(user.plan)}
                            </td>
                            <td className="px-4 py-3">
                              {stateDot(user.subscription_state)}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#374151] font-medium">
                              {user.boards_count ?? 0}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-[#9CA3AF]">
                              {timeAgo(user.created_at)}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-[#9CA3AF]">
                              {timeAgo(user.last_active_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {userTotal > 20 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-[12px] text-white/40">
                      Page {userPage} of {Math.ceil(userTotal / 20)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      >
                        ← Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={userPage >= Math.ceil(userTotal / 20)}
                        onClick={() => setUserPage((p) => p + 1)}
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TRIALS TAB ── */}
            {tab === "trials" && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[11px] font-extrabold tracking-widest uppercase text-teal-400/60">
                    Trial links
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                    leftIcon={<Icons.Plus size={13} />}
                  >
                    Create link
                  </Button>
                </div>

                <div className="flex flex-col gap-3">
                  {trialLinks.length === 0 && (
                    <div className="text-center py-16 text-[13px] text-white/30">
                      No trial links yet. Create one to share with early users.
                    </div>
                  )}
                  {trialLinks.map((link) => {
                    const url = `${appUrl}/trial/${link.token}`;
                    const isExpired = new Date(link.expires_at) < new Date();
                    const isExhausted = link.use_count >= link.max_uses;
                    const statusLabel = !link.is_active
                      ? "deactivated"
                      : isExpired
                        ? "expired"
                        : isExhausted
                          ? "exhausted"
                          : "active";
                    const statusStyle = {
                      active: { bg: "#DCFCE7", color: "#14532D" },
                      deactivated: { bg: "#FEE2E2", color: "#7F1D1D" },
                      expired: { bg: "#F3F4F6", color: "#6B7280" },
                      exhausted: { bg: "#FEF3C7", color: "#78350F" },
                    }[statusLabel];
                    const pct = Math.min(
                      100,
                      (link.use_count / link.max_uses) * 100,
                    );

                    return (
                      <div
                        key={link.id}
                        className="bg-white rounded-2xl border border-[#F3F4F6] p-5 flex flex-col gap-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="text-[14px] font-bold text-[#111827]">
                                {link.label || "Untitled link"}
                              </p>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={statusStyle}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9CA3AF]">
                              <span>{link.trial_days}-day trial</span>
                              <span>·</span>
                              <span className="font-semibold text-[#374151]">
                                {link.use_count} / {link.max_uses} uses
                              </span>
                              <span>·</span>
                              <span>
                                expires{" "}
                                {new Date(link.expires_at).toLocaleDateString()}
                              </span>
                              <span>·</span>
                              <span>created {timeAgo(link.created_at)}</span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-2 h-1 w-48 bg-[#F3F4F6] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor:
                                    pct >= 100
                                      ? "#EF4444"
                                      : pct >= 80
                                        ? "#F97316"
                                        : "#14B8A6",
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => copyLink(link.token)}
                              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                            >
                              {copied === link.token ? (
                                <>
                                  <Icons.Check size={11} /> Copied!
                                </>
                              ) : (
                                <>
                                  <Icons.Copy size={11} /> Copy
                                </>
                              )}
                            </button>
                            {link.is_active && !isExpired && (
                              <button
                                onClick={() => handleDeactivate(link.id)}
                                disabled={deactivating === link.id}
                                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                              >
                                {deactivating === link.id
                                  ? "Deactivating…"
                                  : "Deactivate"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* URL preview */}
                        <div className="bg-[#F9FAFB] rounded-xl px-3 py-2 flex items-center gap-2">
                          <code className="flex-1 text-[11px] text-[#9CA3AF] truncate">
                            {url}
                          </code>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateLinkModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(link) => setTrialLinks((prev) => [link, ...prev])}
        appUrl={appUrl}
      />
    </div>
  );
}
