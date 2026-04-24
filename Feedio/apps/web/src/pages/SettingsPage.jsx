/**
 * SettingsPage — /settings
 *
 * User account and subscription settings.
 * Shows:
 *   - Current plan and subscription status
 *   - Upgrade/downgrade options
 *   - Cancel subscription option
 *   - Account details
 */
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useRouter } from "../router";
import { Icons } from "../components/ui/Icons";
import { Button, Badge } from "../components/ui/index";
import { Analytics } from "../lib/analytics.js";

const SUBSCRIPTION_STATE_INFO = {
  free: {
    label: "Free",
    color: "#9CA3AF",
    bg: "#F3F4F6",
    description: "You're on the free plan with limited features.",
  },
  active: {
    label: "Active",
    color: "#14532D",
    bg: "#DCFCE7",
    description: "Your subscription is active and renewing automatically.",
  },
  cancel_scheduled: {
    label: "Canceling",
    color: "#713F12",
    bg: "#FEF9C3",
    description:
      "Your subscription will cancel at the end of the current billing period.",
  },
  in_grace: {
    label: "In Grace Period",
    color: "#7C2D12",
    bg: "#FFEDD5",
    description:
      "Your payment failed. Please update your payment method to continue service.",
  },
  expired: {
    label: "Expired",
    color: "#7F1D1D",
    bg: "#FEE2E2",
    description: "Your subscription has expired. Upgrade to restore access.",
  },
};

const PLAN_FEATURES = {
  free: [
    "1 public board",
    "25 interactions per month",
    "Basic analytics",
    "Community support",
  ],
  pro: [
    "Unlimited boards",
    "Unlimited interactions",
    "Advanced analytics",
    "Private boards",
    "Priority support",
    "Custom branding",
    "30-day trial available",
  ],
};

export default function SettingsPage() {
  const { currentUser, upgradePlan, manageBilling, logout } = useApp();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-14 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-[#6B7280] mb-4">
            Sign in to access your settings.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const stateInfo =
    SUBSCRIPTION_STATE_INFO[currentUser.subscriptionState] ??
    SUBSCRIPTION_STATE_INFO.free;
  const isPro = currentUser.plan === "pro";
  const isActive = currentUser.subscriptionState === "active";
  const isFree = currentUser.plan === "free";

  const handleUpgrade = async () => {
    if (isPro) return;
    setLoading(true);
    setError(null);
    try {
      Analytics.upgradeStarted("settings");
      const result = await upgradePlan();
      if (!result.ok) {
        setError(result.error || "Failed to initiate upgrade");
      }
      Analytics.upgradeCompleted();
    } catch (err) {
      setError(err.message || "Failed to initiate upgrade");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await manageBilling();
      if (!result.ok) {
        setError(result.error || "Failed to open billing portal");
      }
    } catch (err) {
      setError(err.message || "Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-14">
      {/* Header */}
      <div className="bg-white border-b border-[#F3F4F6] sticky top-14 z-20">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-[24px] font-extrabold text-[#111827]"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Settings
              </h1>
              <p className="text-[12px] text-[#9CA3AF] mt-1">
                Manage your account and subscription
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#374151] transition-colors"
            >
              <Icons.ArrowLeft size={14} />
              Back to dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        {error && (
          <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-[13px] text-rose-600 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-600"
            >
              <Icons.X size={16} />
            </button>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white rounded-2xl border border-[#F3F4F6] p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] font-extrabold tracking-widest uppercase text-[#9CA3AF] mb-1">
                Current Plan
              </p>
              <h2
                className="text-[28px] font-extrabold text-[#111827]"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {isPro ? "Pro" : "Free"}
              </h2>
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-[12px] font-bold"
              style={{ backgroundColor: stateInfo.bg, color: stateInfo.color }}
            >
              {stateInfo.label}
            </div>
          </div>

          {/* Subscription status message */}
          <div className="bg-[#F9FAFB] rounded-xl p-4 mb-6 border border-[#F3F4F6]">
            <p className="text-[13px] text-[#6B7280]">
              {stateInfo.description}
            </p>
          </div>

          {/* Features list */}
          <div className="mb-6">
            <p className="text-[11px] font-extrabold tracking-widest uppercase text-[#9CA3AF] mb-3">
              Features included
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PLAN_FEATURES[isPro ? "pro" : "free"].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-[13px] text-[#374151]"
                >
                  <Icons.Check
                    size={16}
                    className="text-teal-600 flex-shrink-0"
                  />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isFree && (
              <Button
                fullWidth
                onClick={handleUpgrade}
                disabled={loading}
                leftIcon={<Icons.Crown size={14} />}
              >
                {loading ? "Loading..." : "Upgrade to Pro"}
              </Button>
            )}

            {isPro && isActive && (
              <Button
                fullWidth
                onClick={handleManageBilling}
                disabled={loading}
                variant="outline"
                leftIcon={<Icons.Settings size={14} />}
              >
                {loading ? "Loading..." : "Manage billing"}
              </Button>
            )}

            {isPro && isActive && (
              <Button
                fullWidth
                variant="outline"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Icons.X size={14} className="mr-1.5" />
                Cancel subscription
              </Button>
            )}
          </div>
        </div>

        {/* Plan Comparison */}
        {isFree && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-8">
            <h3 className="text-[18px] font-bold text-violet-900 mb-4">
              Upgrade to Pro
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {/* Free Plan */}
              <div className="bg-white rounded-xl p-5 border border-[#F3F4F6]">
                <p className="text-[13px] font-bold text-[#111827] mb-4">
                  Free Plan
                </p>
                <ul className="flex flex-col gap-2 text-[12px] text-[#6B7280] mb-4">
                  {PLAN_FEATURES.free.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-[#D1D5DB] mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="bg-white rounded-xl p-5 border-2 border-teal-500 ring-2 ring-teal-100">
                <p className="text-[13px] font-bold text-teal-700 mb-4">
                  Pro Plan
                  <span className="ml-2 text-[10px] font-extrabold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </p>
                <ul className="flex flex-col gap-2 text-[12px] text-[#374151] mb-4">
                  {PLAN_FEATURES.pro.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Icons.Check
                        size={14}
                        className="text-teal-600 flex-shrink-0 mt-0.5"
                      />{" "}
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-xl">
              <div>
                <p className="text-[14px] font-bold text-[#111827]">
                  $19/month
                </p>
                <p className="text-[12px] text-[#9CA3AF]">
                  Billed monthly, cancel anytime
                </p>
              </div>
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                leftIcon={<Icons.Crown size={14} />}
              >
                {loading ? "Loading..." : "Get Pro"}
              </Button>
            </div>
          </div>
        )}

        {/* Account Info Card */}
        <div className="bg-white rounded-2xl border border-[#F3F4F6] p-6">
          <p className="text-[11px] font-extrabold tracking-widest uppercase text-[#9CA3AF] mb-4">
            Account Info
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                Name
              </label>
              <p className="text-[14px] text-[#111827]">
                {currentUser.name || "Not set"}
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                Email
              </label>
              <p className="text-[14px] text-[#111827]">{currentUser.email}</p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            variant="outline"
            onClick={logout}
            leftIcon={<Icons.LogOut size={14} />}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
