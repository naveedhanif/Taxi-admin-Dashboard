import { useEffect, useState } from "react";
import StepProgressIndicator from "./components/StepProgressIndicator";
import BusinessDetailsStep from "./components/BusinessDetailsStep";
import StripeConnectStep from "./components/StripeConnectStep";
import SubscriptionPlanStep from "./components/SubscriptionPlanStep";
import VehicleSetupStep from "./components/VehicleSetupStep";
import FareRulesSetupStep from "./components/FareRulesSetupStep";

import OverviewDashboard from "./components/OverviewDashboard";
import LoginScreen from "./components/LoginScreen";
import AllBookingsScreen from "./components/AllBookingsScreen";
import SettingsScreen from "./components/SettingsScreen";

import NotificationToast from "./NotificationToast";
import { useNewBookingNotifications } from "./useNewBookingNotifications";
import { supabase } from "./supabaseClient";
import { getDriverForUser } from "./driverAuth";

import {
  LayoutDashboard,
  Compass,
  LogIn,
  LogOut,
  Calendar,
  Settings as SettingsIcon,
  Car,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const SCREEN_PATHS: Record<string, string> = { overview: "/", bookings: "/bookings", settings: "/settings" };
function screenFromPath(pathname: string): "overview" | "bookings" | "settings" {
  if (pathname.startsWith("/bookings")) return "bookings";
  if (pathname.startsWith("/settings")) return "settings";
  return "overview";
}

export default function App() {
  const [viewMode, setViewMode] = useState<"onboarding" | "dashboard">("onboarding");
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  // The URL is now the actual source of truth for which screen is
  // showing — not just in-memory state, and not just localStorage
  // either. Both of those were tried already (this file's own git
  // history) and neither survived every real-world case of the driver
  // switching away and back on iOS. A URL survives ANY kind of reload
  // or relaunch, because the browser/OS itself is what's responsible
  // for remembering and re-requesting it — there's no app-level state
  // to lose in the first place. "login" is intentionally not part of
  // the URL scheme below (see screenFromPath) — it's a transient state
  // reached via the header button, not a real destination.
  const [dashboardScreen, setDashboardScreen] = useState<"overview" | "login" | "bookings" | "settings">(
    () => screenFromPath(window.location.pathname)
  );
  // Mobile: drawer is closed by default, opened via hamburger.
  // Desktop: sidebar is open by default, collapsible via the same toggle.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Keep the URL in sync whenever the screen changes via in-app
  // navigation (sidebar clicks, "View all bookings" links, etc.) — a
  // real navigation via pushState, not a page reload, so the app stays
  // mounted and nothing else resets.
  useEffect(() => {
    const targetPath = SCREEN_PATHS[dashboardScreen];
    if (targetPath && window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  }, [dashboardScreen]);

  // Also respond to the browser's own back/forward buttons, for
  // completeness — not the main point of this fix, but free once the
  // URL is the source of truth anyway.
  useEffect(() => {
    function handlePopState() {
      setDashboardScreen(screenFromPath(window.location.pathname));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Real session tracking. onAuthStateChange fires immediately with the
  // current session on load, then again on every sign-in/sign-out — this
  // is the one source of truth for "who's logged in right now."
  const [driverId, setDriverId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const result = await getDriverForUser(session.user.id);
        setDriverId(result.driverId);
        // Driver already has an account — go straight to dashboard,
        // skip onboarding entirely.
        if (result.driverId) {
          setViewMode("dashboard");
          // Only force back to Overview on a REAL new sign-in — not on
          // "INITIAL_SESSION" (fires on every page load/reload, including
          // whenever iOS reloads a backgrounded PWA's page) or
          // "TOKEN_REFRESHED" (fires periodically in the background).
          // Treating every one of those as if it were a fresh sign-in is
          // exactly what kept resetting the driver back to Dashboard no
          // matter which screen they'd actually been on.
          if (event === "SIGNED_IN") {
            setDashboardScreen("overview");
          }

          const { data } = await supabase
            .from("drivers")
            .select("business_name")
            .eq("id", result.driverId)
            .single();
          setBusinessName(data?.business_name ?? null);
        }
      } else {
        setDriverId(null);
        setBusinessName(null);
      }
      setSessionChecked(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const { notifications, dismiss, unviewedCount } = useNewBookingNotifications(driverId);

  // Keep the header name in sync if the driver edits their business name
  // in Settings — same tab or another device, without needing a refresh.
  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`driver-business-name-${driverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${driverId}` },
        (payload) => {
          if (payload.new && "business_name" in payload.new) {
            setBusinessName(payload.new.business_name as string);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setDriverId(null);
    setDashboardScreen("login");
    window.history.pushState(null, "", "/");
  }

  const navigationItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  function selectScreen(id: string) {
    setDashboardScreen(id as any);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#2C2C2A] font-sans antialiased">
      <NotificationToast notifications={notifications} onDismiss={dismiss} />

      {/* Top bar — branding + onboarding/dashboard mode toggle only.
          Screen navigation lives in the left sidebar now. */}
      <header className="sticky top-0 z-40 border-b border-[#ECE9E0] bg-[#F7F7F5]/90 backdrop-blur-md px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {viewMode === "dashboard" && driverId && (
              <>
                {/* Mobile: opens/closes the slide-over drawer */}
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="emboss-btn flex h-9 w-9 items-center justify-center rounded-lg text-[#2C2C2A] lg:hidden"
                  aria-label="Toggle menu"
                >
                  {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                {/* Desktop: collapses/expands the fixed sidebar */}
                <button
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  className="emboss-btn hidden h-9 w-9 items-center justify-center rounded-lg text-[#2C2C2A] lg:flex"
                  aria-label="Toggle sidebar"
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
              </>
            )}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, #378ADD, #0C447C)",
                boxShadow: "2px 2px 5px rgba(4,44,83,0.3)",
              }}
            >
              <Car size={20} className="text-white" />
            </div>
            <div>
              <div className="text-base font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                {businessName || "Driver Dashboard"} <span className="text-xs font-normal text-[#5F5E5A]">— Driver SaaS</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Onboarding is only for drivers who haven't set up an
                account yet. Once driverId exists, jumping back into
                onboarding makes no sense and risks a returning driver
                accidentally re-running setup — so it's hidden entirely. */}
            {!driverId && (
              <>
                <button
                  onClick={() => setViewMode("onboarding")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                    viewMode === "onboarding"
                      ? "emboss-btn-primary text-white"
                      : "emboss-btn text-[#5F5E5A] hover:text-[#2C2C2A]"
                  }`}
                >
                  <Compass size={13} />
                  <span className="hidden sm:inline">Onboarding Flow (Steps 1-5)</span>
                  <span className="sm:hidden">Onboarding</span>
                </button>

                <button
                  onClick={() => { setViewMode("dashboard"); setDashboardScreen("login"); }}
                  className="emboss-btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#5F5E5A] hover:text-[#2C2C2A] cursor-pointer transition-all"
                >
                  <LogIn size={13} />
                  <span>Log in</span>
                </button>
              </>
            )}

            {driverId && (
              <button
                onClick={handleLogout}
                className="emboss-btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#991B1B] cursor-pointer transition-all"
              >
                <LogOut size={13} />
                <span>Log out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {!sessionChecked ? (
        <div className="flex min-h-[400px] items-center justify-center text-sm text-[#5F5E5A]">
          Loading…
        </div>
      ) : viewMode === "onboarding" ? (
        <main className="mx-auto max-w-7xl py-6">
          <div className="px-4">
            {/* Returning driver prompt — shown above onboarding steps */}
            <div className="mb-6 mx-auto max-w-md rounded-xl border border-[#E4E2DA] bg-white p-4 flex items-center justify-between">
              <span className="text-sm text-[#5F5E5A]">Already have an account?</span>
              <button
                onClick={() => { setViewMode("dashboard"); setDashboardScreen("login"); }}
                className="emboss-btn-primary rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Sign in
              </button>
            </div>

            <StepProgressIndicator
              currentStep={onboardingStep}
              onStepClick={(step) => setOnboardingStep(step)}
            />

            {onboardingStep === 1 && (
              <BusinessDetailsStep onNext={() => setOnboardingStep(2)} />
            )}
            {onboardingStep === 2 && (
              <StripeConnectStep
                onNext={() => setOnboardingStep(3)}
                onSkip={() => setOnboardingStep(3)}
              />
            )}
            {onboardingStep === 3 && (
              <SubscriptionPlanStep onNext={() => setOnboardingStep(4)} />
            )}
            {onboardingStep === 4 && (
              <VehicleSetupStep
                onNext={() => setOnboardingStep(5)}
                onSkip={() => setOnboardingStep(5)}
              />
            )}
            {onboardingStep === 5 && (
              <FareRulesSetupStep
                onComplete={() => {
                  setViewMode("dashboard");
                  setDashboardScreen("overview");
                }}
              />
            )}
          </div>
        </main>
      ) : (
        <div className="flex w-full">
          {/* Left sidebar nav — desktop: fixed column. Mobile: slide-over. */}
          {driverId && (
            <>
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-30 bg-black/30 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
              <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform p-3 transition-all duration-200 ease-out lg:sticky lg:top-[57px] lg:z-0 lg:h-[calc(100vh-57px)] lg:translate-x-0 ${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                } ${sidebarCollapsed ? "lg:w-[72px]" : "lg:w-64"}`}
                style={{
                  top: sidebarOpen ? 0 : undefined,
                  background: "linear-gradient(180deg, #1B2430, #131A24)",
                }}
              >
                <nav className="flex flex-col gap-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = dashboardScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectScreen(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`relative flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium cursor-pointer transition-all text-left ${
                          sidebarCollapsed ? "lg:justify-center lg:px-0" : ""
                        } ${
                          isActive
                            ? "text-white"
                            : "text-[#9AA3B2] hover:bg-white/5 hover:text-white"
                        }`}
                        style={
                          isActive
                            ? {
                                background: "linear-gradient(135deg, #378ADD, #0C447C)",
                                boxShadow: "2px 2px 8px rgba(4,44,83,0.5)",
                              }
                            : undefined
                        }
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className={sidebarCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                        {item.id === "bookings" && unviewedCount > 0 && (
                          <span
                            className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ${
                              sidebarCollapsed ? "lg:absolute lg:right-1 lg:top-1 lg:ml-0" : ""
                            }`}
                            style={{ background: "#D64545" }}
                          >
                            {unviewedCount > 99 ? "99+" : unviewedCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </aside>
            </>
          )}

          <main className="min-w-0 flex-1 py-4 sm:py-6">
            <div className="px-3 sm:px-6">
              {dashboardScreen === "overview" && <OverviewDashboard driverId={driverId} onNavigate={(s) => setDashboardScreen(s as any)} />}
              {dashboardScreen === "login" && (
                <LoginScreen
                  onLoginSuccess={() => setDashboardScreen("overview")}
                />
              )}
              {dashboardScreen === "bookings" && <AllBookingsScreen driverId={driverId} />}
              {dashboardScreen === "settings" && <SettingsScreen driverId={driverId} />}
            </div>
          </main>
        </div>
      )}

      {/* Version badge — small, fixed, out of the way. Exists purely so
          you can glance at the app and confirm which deployed commit
          you're actually testing. Tap it to copy the full commit SHA
          for bug reports tied to an exact build. See vite.config.ts for
          how these values are injected. */}
      <VersionBadge />
    </div>
  );
}

function VersionBadge() {
  const [copied, setCopied] = useState(false);
  const sha = typeof __APP_COMMIT_SHA__ !== "undefined" ? __APP_COMMIT_SHA__ : "local";
  const buildTime = typeof __APP_BUILD_TIME__ !== "undefined" ? __APP_BUILD_TIME__ : "";
  const buildLabel = buildTime
    ? new Date(buildTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  function handleClick() {
    navigator.clipboard?.writeText(sha).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-2 right-2 z-50 rounded-full px-2.5 py-1 text-[10px] font-mono opacity-60 hover:opacity-100 transition-opacity"
      style={{ background: "#2C2C2A", color: "#F0EEE7" }}
      title="Tap to copy full commit SHA"
    >
      {copied ? "copied!" : `${sha}${buildLabel ? ` · ${buildLabel}` : ""}`}
    </button>
  );
}

