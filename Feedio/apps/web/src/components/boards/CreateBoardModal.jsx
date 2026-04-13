import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useRouter } from "../../router";
import { Modal, Input, Textarea, Toggle, Button } from "../ui/index";
import {
  IlluRocket,
  IlluCelebration,
  IlluPublic,
  IlluPrivate,
} from "../illustrations";
import { Icons } from "../ui/Icons";
import { DEFAULT_TAGS } from "../../data/mockData";

const ACCENT_COLORS = [
  "#14B8A6", // teal
  "#8B5CF6", // violet
  "#F97316", // orange
  "#EF4444", // red
  "#3B82F6", // blue
  "#EC4899", // pink
  "#22C55E", // green
  "#EAB308", // yellow
];

const SUGGESTED_TAGS = [
  "Feature",
  "Bug",
  "Improvement",
  "Enhancement",
  "Performance",
  "Design",
  "UX/UI",
  "Documentation",
  "Infrastructure",
  "Security",
  "Mobile",
  "Backend",
  "Frontend",
  "API",
  "Database",
  "Integration",
  "Accessibility",
  "Other",
];

export default function CreateBoardModal({ open, onClose }) {
  const { createBoard, currentUser, getUserBoards, upgradePlan } = useApp();
  const { navigate } = useRouter();

  const userBoards = getUserBoards(currentUser?.id ?? "");
  const isPro = currentUser?.plan === "pro";
  const atFreeLimit = !isPro && userBoards.length >= 1;

  const [step, setStep] = useState(0); // 0: basics, 1: settings, 2: done
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDesc] = useState("");
  const [website, setWebsite] = useState("");
  const [accentColor, setAccent] = useState(ACCENT_COLORS[0]);
  const [visibility, setVis] = useState("public");

  // Settings
  const [requireName, setReqName] = useState(true);
  const [requireEmail, setReqEmail] = useState(false);
  const [allowAnon, setAllowAnon] = useState(false);
  const [showVoterCount, setShowCount] = useState(true);

  // Tags
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));
  const toggleSuggestedTag = (tag) => {
    if (tags.includes(tag)) {
      removeTag(tag);
    } else {
      setTags((prev) => [...prev, tag]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const board = createBoard({
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      website: website.trim(),
      accentColor,
      visibility,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerAvatarInitials: currentUser.avatarInitials,
      ownerAvatarColor: currentUser.avatarColor,
      tags,
      settings: {
        requireName,
        requireEmail,
        allowAnonymous: allowAnon,
        showVoterCount,
      },
    });
    setLoading(false);
    setCreated(board);
    setStep(2);
  };

  const handleClose = () => {
    setStep(0);
    setName("");
    setTagline("");
    setDesc("");
    setWebsite("");
    setAccent(ACCENT_COLORS[0]);
    setVis("public");
    setReqName(true);
    setReqEmail(false);
    setAllowAnon(false);
    setShowCount(true);
    setTags([]);
    setCreated(null);
    setLoading(false);
    onClose();
  };

  if (atFreeLimit && open) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Board limit reached"
        maxWidth="max-w-sm"
      >
        <div className="text-center py-2">
          <div className="flex justify-center mb-3">
            <IlluRocket size={80} />
          </div>
          <p className="text-[13px] text-[#6B7280] mb-5">
            Free plan includes <strong>1 public board</strong>. Upgrade to Pro
            for unlimited boards, private boards, and more.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="pro"
              fullWidth
              onClick={() => {
                upgradePlan();
                handleClose();
              }}
            >
              <Icons.Crown size={14} /> Upgrade to Pro — $19/mo
            </Button>
            <Button variant="ghost" fullWidth onClick={handleClose}>
              Maybe later
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === 2
          ? undefined
          : step === 0
            ? "Create a board"
            : "Board settings"
      }
      maxWidth="max-w-lg"
    >
      {/* ── STEP 2: SUCCESS ── */}
      {step === 2 && created && (
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <IlluCelebration size={88} />
          </div>
          <h2 className="text-[18px] font-bold text-[#111827] mb-2">
            {created.name} is live!
          </h2>
          <p className="text-[13px] text-[#6B7280] mb-2">
            Share this link with your users:
          </p>
          <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-4 py-3 mb-6 text-left">
            <code className="flex-1 text-[12px] text-[#374151] break-all">
              {window.location.origin}/boards/{created.slug}
            </code>
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/boards/${created.slug}`,
                )
              }
              className="flex-shrink-0 text-teal-600 hover:text-teal-700 transition-colors"
            >
              <Icons.Copy size={14} />
            </button>
          </div>
          {created.visibility === "public" && (
            <p className="text-[12px] text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-4">
              <IlluPublic size={14} className="inline mr-1" /> This board will
              appear in the public boards directory.
            </p>
          )}
          {created.visibility === "private" && (
            <p className="text-[12px] text-violet-600 bg-violet-50 px-3 py-2 rounded-lg mb-4">
              <IlluPrivate size={14} className="inline mr-1" /> Only people with
              the link can view this board.
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={handleClose}>
              Close
            </Button>
            <Button
              fullWidth
              onClick={() => {
                navigate(`/boards/${created.slug}`);
                handleClose();
              }}
            >
              View board
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 0: BASICS ── */}
      {step === 0 && (
        <div className="flex flex-col gap-5">
          <Input
            label="Board / product name"
            required
            placeholder="e.g. Acma AI"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Tagline"
            placeholder="One-line description of your product"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={100}
          />
          <Textarea
            label="Product description"
            placeholder="Tell users what your product does. This shows on your board and helps with discovery."
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
          />
          <Input
            label="Website URL"
            type="url"
            placeholder="https://yourproduct.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          {/* Accent color */}
          <div>
            <p className="text-[12px] font-semibold text-[#374151] mb-2">
              Accent color
            </p>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccent(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: accentColor === c ? "#1a2e28" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <p className="text-[12px] font-semibold text-[#374151] mb-2">
              Visibility
            </p>
            <div className="grid grid-cols-2 gap-2">
              <VisBtn
                active={visibility === "public"}
                onClick={() => setVis("public")}
                icon={<Icons.Globe size={15} />}
                label="Public"
                hint="Listed in the public boards directory"
              />
              <VisBtn
                active={visibility === "private"}
                onClick={() => (isPro ? setVis("private") : null)}
                icon={<Icons.Lock size={15} />}
                label="Private"
                hint="Only accessible via direct link"
                disabled={!isPro}
                disabledHint="Pro plan required"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={() => setStep(1)}
              disabled={!name.trim()}
            >
              Next: Settings →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: SETTINGS ── */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          {/* Identity / privacy */}
          <div>
            <p className="text-[12px] font-semibold text-[#374151] mb-3">
              Consumer identity
            </p>
            <div className="flex flex-col gap-3 bg-[#F9FAFB] rounded-xl p-4">
              <Toggle
                checked={requireName}
                onChange={(v) => {
                  setReqName(v);
                  if (v) setAllowAnon(false);
                }}
                label="Require submitter's name"
                hint="Consumers must enter their name to submit or vote"
              />
              <Toggle
                checked={requireEmail}
                onChange={(v) => {
                  setReqEmail(v);
                  if (v) setAllowAnon(false);
                }}
                label="Require email address"
                hint="Email is collected but hidden from public view"
              />
              <Toggle
                checked={allowAnon}
                onChange={(v) => {
                  setAllowAnon(v);
                  if (v) {
                    setReqName(false);
                    setReqEmail(false);
                  }
                }}
                label="Allow fully anonymous submissions"
                hint="No name or email required — fully anonymous"
              />
              <Toggle
                checked={showVoterCount}
                onChange={setShowCount}
                label="Show vote counts publicly"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-[12px] font-semibold text-[#374151] mb-2">
              Request categories / tags
            </p>

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 text-[11px] font-medium text-white px-2.5 py-1 rounded-full transition-colors"
                    style={{ backgroundColor: accentColor }}
                  >
                    {t}
                    <button
                      onClick={() => removeTag(t)}
                      className="hover:opacity-75 transition-opacity"
                    >
                      <Icons.X size={9} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add custom tag */}
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Add a custom tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                inputClassName="text-[12px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim()}
              >
                <Icons.Plus size={13} />
              </Button>
            </div>

            {/* Importance notice */}
            <p className="text-[11px] text-[#6B7280] mb-3 bg-amber-50 text-amber-800 px-3 py-2 rounded-lg">
              💡 <strong>Tags help you find and filter your feedback.</strong> Choose
              categories that best describe your product feedback.
            </p>

            {/* Suggested tags */}
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] mb-2">
                Suggested tags:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleSuggestedTag(tag)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all font-medium border-2"
                    style={{
                      backgroundColor: tags.includes(tag)
                        ? accentColor
                        : "white",
                      color: tags.includes(tag) ? "white" : "#6B7280",
                      borderColor: tags.includes(tag) ? accentColor : "#E5E7EB",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" fullWidth onClick={() => setStep(0)}>
              ← Back
            </Button>
            <Button fullWidth onClick={handleCreate} disabled={loading}>
              {loading ? "Creating…" : "Create board"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function VisBtn({
  active,
  onClick,
  icon,
  label,
  hint,
  disabled,
  disabledHint,
}) {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all
        ${active ? "border-teal-400 bg-teal-50" : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-center gap-2">
        <span className={active ? "text-teal-600" : "text-[#6B7280]"}>
          {icon}
        </span>
        <span className="text-[13px] font-semibold text-[#111827]">
          {label}
        </span>
        {disabled && (
          <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">
            Pro
          </span>
        )}
      </div>
      <p className="text-[11px] text-[#9CA3AF] pl-5">
        {disabled ? disabledHint : hint}
      </p>
    </button>
  );
}
