import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { RouterProvider, Routes, Route, useRouter } from "./router";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AuthModal from "./components/auth/AuthModal";
import LandingPage from "./pages/LandingPage";
import {
  IlluPageNotFound,
  IlluPaymentSuccess,
} from "./components/illustrations";
import BoardsPage from "./pages/BoardsPage";
import PublicBoardPage from "./pages/PublicBoardPage";
import DashboardPage from "./pages/DashboardPage";
import AdminBoardPage from "./pages/AdminBoardPage";
import TrialPage from "./pages/TrialPage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";

// ─── Spinner for the auth-loading state ─────────────────────────────────────
function Splash() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#1a2e28] flex items-center justify-center animate-pulse">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#CCFBF1"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
          </svg>
        </div>
        <p className="text-[13px] font-semibold text-[#9CA3AF]">feedio</p>
      </div>
    </div>
  );
}

// ─── Demo mode banner ────────────────────────────────────────────────────────
function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-5 py-2 flex items-center justify-between gap-4">
        <p className="text-[12px] text-amber-700">
          <span className="font-bold">Demo mode</span> — data is stored locally.
          Add{" "}
          <code className="bg-amber-100 px-1 rounded text-[11px]">
            VITE_SUPABASE_URL
          </code>{" "}
          to <code className="bg-amber-100 px-1 rounded text-[11px]">.env</code>{" "}
          to connect a real backend.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500 hover:text-amber-700 text-[18px] leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Inner — has access to both router and app context ───────────────────────
function Inner() {
  const { authLoading, isDemo, refreshCurrentUser } = useApp();
  const { path } = useRouter();

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");

  const openAuth = (tab = "login") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const isStripeSuccess = window.location.search.includes("checkout=success");

  const [stripeHandled, setStripeHandled] = useState(false);
  if (isStripeSuccess && !stripeHandled) {
    setStripeHandled(true);
    setTimeout(() => refreshCurrentUser(), 2000);
    if (window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  // Admin route: no Navbar/Footer chrome — standalone dark shell
  const isAdminRoute = path.startsWith("/admin");
  const noFooter =
    (path.startsWith("/boards/") && path !== "/boards") || isAdminRoute;

  if (authLoading) return <Splash />;

  return (
    <div className="flex flex-col min-h-screen">
      {isDemo && !isAdminRoute && <DemoBanner />}
      {!isAdminRoute && <Navbar onAuthClick={openAuth} />}

      {isStripeSuccess && !isAdminRoute && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-6xl mx-auto px-5 py-2.5 text-center text-[13px] text-emerald-700 font-medium">
            <span className="inline-flex items-center gap-2">
              <IlluPaymentSuccess size={20} /> Payment successful! Your plan is
              being upgraded — this may take a moment.
            </span>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            component={(p) => <LandingPage {...p} onAuthClick={openAuth} />}
          />
          <Route
            path="/boards"
            component={(p) => <BoardsPage {...p} onAuthClick={openAuth} />}
          />
          <Route path="/boards/:slug" component={PublicBoardPage} />
          <Route
            path="/dashboard"
            component={(p) => <DashboardPage {...p} onAuthClick={openAuth} />}
          />
          <Route path="/dashboard/boards/:slug" component={AdminBoardPage} />
          <Route path="/trial/:token" component={TrialPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/admin" component={AdminPage} />
          <Route
            path="*"
            component={() => (
              <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <IlluPageNotFound size={100} />
                  </div>
                  <h1 className="text-[22px] font-extrabold text-[#111827] mb-2">
                    Page not found
                  </h1>
                  <p className="text-[13px] text-[#9CA3AF] mb-6">
                    The page you're looking for doesn't exist.
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 bg-[#1a2e28] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#243d35] transition-colors cursor-pointer"
                  >
                    Go home
                  </a>
                </div>
              </div>
            )}
          />
        </Routes>
      </main>

      {!noFooter && <Footer />}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppProvider>
        <Inner />
      </AppProvider>
    </RouterProvider>
  );
}
