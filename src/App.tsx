import { useEffect, useState, useRef } from "react";
import StepProgressIndicator from "./components/StepProgressIndicator";
import BusinessDetailsStep from "./components/BusinessDetailsStep";
import StripeConnectStep from "./components/StripeConnectStep";
import SubscriptionPlanStep from "./components/SubscriptionPlanStep";
import VehicleSetupStep from "./components/VehicleSetupStep";
import FareRulesSetupStep from "./components/FareRulesSetupStep";
import LicenceScreen from "./components/LicenceScreen";

import OverviewDashboard from "./components/OverviewDashboard";
import LoginScreen from "./components/LoginScreen";
import AllBookingsScreen from "./components/AllBookingsScreen";
import SettingsScreen from "./components/SettingsScreen";
import EarningsScreen from "./components/EarningsScreen";
import CustomersScreen from "./components/CustomersScreen";
import DriverProfileScreen from "./components/DriverProfileScreen";

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
  TrendingUp,
  Car,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  User,
} from "lucide-react";

const SCREEN_PATHS: Record<string, string> = { overview: "/", bookings: "/bookings", settings: "/settings", earnings: "/earnings", customers: "/customers", profile: "/profile" };
function screenFromPath(pathname: string): "overview" | "bookings" | "settings" | "earnings" | "customers" | "profile" {
  if (pathname.startsWith("/bookings")) return "bookings";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/earnings")) return "earnings";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/profile")) return "profile";
  return "overview";
}

function initialDashboardScreen(): "overview" | "login" | "bookings" | "settings" | "earnings" | "customers" | "profile" {
  const pathScreen = screenFromPath(window.location.pathname);
  // Landing exactly on "/" is ambiguous: it's either a real, deliberate
  // navigation to Dashboard, OR — critically — it's iOS relaunching an
  // INSTALLED home-screen PWA after it was fully closed (not just
  // backgrounded). Installed PWAs always reopen at manifest.json's
  // start_url ("/") in that case, no matter which URL was showing when
  // the driver left, which completely bypasses pure URL-based
  // restoration. localStorage is the fallback for exactly that case —
  // it's checked ONLY when landing on "/" specifically, so a genuine
  // deliberate navigation to Dashboard is never overridden by it.
  if (window.location.pathname === "/") {
    try {
      const saved = localStorage.getItem("taxi_admin_dashboard_screen");
      if (saved === "bookings" || saved === "settings" || saved === "earnings" || saved === "customers" || saved === "profile") return saved;
    } catch {
      // Ignore — storage unavailable, just use the path-derived default.
    }
  }
  return pathScreen;
}

export default function App() {
  const [viewMode, setViewMode] = useState<"onboarding" | "dashboard">("onboarding");
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  // Two layers working together, not one or the other — see
  // initialDashboardScreen()'s comment for why URL alone wasn't enough.
  const [dashboardScreen, setDashboardScreen] = useState<"overview" | "login" | "bookings" | "settings" | "earnings" | "customers" | "profile">(
    initialDashboardScreen
  );
  // Mobile: drawer is closed by default, opened via hamburger.
  // Desktop: sidebar is open by default, collapsible via the same toggle.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Purely for the debug badge below to display an honest, in-sync
  // value — pushState() doesn't itself trigger a React re-render, so
  // the debug badge reading window.location.pathname directly at
  // arbitrary render times could show a STALE path that lagged one
  // step behind the real one. That lag is almost certainly what the
  // last two screenshots were actually showing, not a real navigation
  // bug. This state is updated in the same effect that calls
  // pushState, so it's always accurate.
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Keep both the URL AND localStorage in sync whenever the screen
  // changes via in-app navigation (sidebar clicks, "View all bookings"
  // links, etc.) — a real navigation via pushState, not a page reload,
  // so the app stays mounted and nothing else resets.
  useEffect(() => {
    const targetPath = SCREEN_PATHS[dashboardScreen];
    if (targetPath && window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
      setCurrentPath(targetPath);
    }
    if (dashboardScreen === "overview" || dashboardScreen === "bookings" || dashboardScreen === "settings" || dashboardScreen === "earnings" || dashboardScreen === "customers" || dashboardScreen === "profile") {
      try {
        localStorage.setItem("taxi_admin_dashboard_screen", dashboardScreen);
      } catch {
        // Ignore.
      }
    }
  }, [dashboardScreen]);

  // Also respond to the browser's own back/forward buttons, for
  // completeness — not the main point of this fix, but free once the
  // URL is the source of truth anyway.
  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname);
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
  // Whether the driver has manually marked themselves as taking bookings
  // today — a completely separate concept from "busy right now" (which
  // is derived automatically from having an active trip). Requires a
  // new `is_online` column — see the SQL note in the delivery message.
  const [isOnline, setIsOnline] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  // A ref, not state — needs to be read synchronously within the same
  // onAuthStateChange callback invocation to detect a genuine sign-in
  // (see below), which a state value can't reliably do since state
  // updates aren't visible until the next render.
  const driverIdRef = useRef<string | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const result = await getDriverForUser(session.user.id);
        // Trusting Supabase's event string (e.g. checking for
        // "SIGNED_IN") turned out NOT to be reliable — Supabase
        // automatically tries to refresh the session whenever a
        // background tab regains focus, and that refresh can itself
        // fire as "SIGNED_IN" rather than "TOKEN_REFRESHED" depending
        // on SDK version/internals. That's what kept resetting the
        // screen to Dashboard just from switching browser tabs, with
        // no reload involved at all. Detecting the actual state
        // transition instead — genuinely going from "no driver known"
        // to "a driver is known" — is reliable regardless of which
        // event string Supabase happens to report.
        const isGenuineSignIn = driverIdRef.current === null && result.driverId !== null;
        driverIdRef.current = result.driverId;
        setDriverId(result.driverId);
        // Driver already has an account — go straight to dashboard,
        // skip onboarding entirely.
        if (result.driverId) {
          setViewMode("dashboard");
          if (isGenuineSignIn) {
            setDashboardScreen("overview");
          }

          const { data } = await supabase
            .from("drivers")
            .select("business_name, is_online")
            .eq("id", result.driverId)
            .single();
          setBusinessName(data?.business_name ?? null);
          setIsOnline(data?.is_online ?? true);
        }
      } else {
        driverIdRef.current = null;
        setDriverId(null);
        setBusinessName(null);
      }
      setSessionChecked(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const { notifications, dismiss, unviewedCount, audioRef } = useNewBookingNotifications(driverId);

  // Unlocks audio playback for mobile browsers. Most mobile browsers
  // (iOS Safari in particular) block .play() calls that don't trace
  // back to a genuine user tap — a WebSocket callback (a new booking
  // arriving) doesn't count as one, which is exactly why the alert
  // sound worked on desktop Chrome but was silently blocked on mobile.
  // Priming the element with a real play()+immediate pause() inside
  // the very first tap anywhere on the page satisfies that requirement
  // once, after which programmatic play() calls succeed for the rest
  // of the session — this is the standard fix for this exact class of
  // mobile autoplay restriction.
  useEffect(() => {
    function unlockAudio() {
      const audio = audioRef.current;
      if (audio) {
        audio
          .play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
          })
          .catch(() => {
            // Nothing to do — will simply try again on the next tap.
          });
      }
    }
    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, [audioRef]);

  // Set when a notification toast is clicked — AllBookingsScreen watches
  // this and opens the matching booking's detail modal, then clears it
  // via onOpenBookingHandled below.
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);

  function handleOpenBookingFromNotification(id: string) {
    setDashboardScreen("bookings");
    setOpenBookingId(id);
    dismiss(id);
  }

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

  async function handleToggleOnline() {
    if (!driverId || togglingOnline) return;
    const next = !isOnline;
    setTogglingOnline(true);
    setIsOnline(next); // optimistic — feels instant, rolled back below if it fails
    const { error } = await supabase.from("drivers").update({ is_online: next }).eq("id", driverId);
    setTogglingOnline(false);
    if (error) {
      setIsOnline(!next); // roll back
      window.alert(`Couldn't update your availability: ${error.message}`);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    driverIdRef.current = null;
    setDriverId(null);
    setDashboardScreen("login");
    window.history.pushState(null, "", "/");
    try {
      localStorage.removeItem("taxi_admin_dashboard_screen");
    } catch {
      // Ignore.
    }
  }

  const navigationItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "profile", label: "Profile", icon: User },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "earnings", label: "Earnings", icon: TrendingUp },
    { id: "customers", label: "Customers", icon: Users },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  function selectScreen(id: string) {
    setDashboardScreen(id as any);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#2C2C2A] font-sans antialiased">
      {/* The hook already calls audioRef.current?.play() on every new
          booking — this element is what it was missing. Without a real
          <audio> to attach to, that call silently did nothing, which is
          the actual reason new bookings were arriving completely
          silently despite the alert logic being written. preload="auto"
          so the very first alert isn't delayed by a fetch. */}
      <audio ref={audioRef} src="/new-booking-alert.wav" preload="auto" />
      <NotificationToast notifications={notifications} onDismiss={dismiss} onOpenBooking={handleOpenBookingFromNotification} />

      {/* Top bar — branding + onboarding/dashboard mode toggle only.
          Screen navigation lives in the left sidebar now. */}
      <header className="sticky top-0 z-40 border-b border-[#ECE9E0] bg-[#F7F7F5]/90 backdrop-blur-md px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {viewMode === "dashboard" && driverId && (
              <>
                {/* Mobile: opens/closes the slide-over drawer — animated
                    3-bar-to-X morph (Concept A) instead of an icon swap,
                    each bar carrying its own shadow so they read as
                    separate embossed rods, not flat lines. */}
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="emboss-btn relative flex h-11 w-11 items-center justify-center rounded-lg lg:hidden"
                  aria-label="Toggle menu"
                >
                  <span
                    className="absolute h-[3px] w-6 rounded-full bg-[#2C2C2A] transition-transform duration-300"
                    style={{
                      top: sidebarOpen ? "50%" : "32%",
                      transform: sidebarOpen ? "translateY(-50%) rotate(45deg)" : "translateY(-50%)",
                      boxShadow: "1px 1px 1px rgba(0,0,0,0.25)",
                      transitionTimingFunction: "cubic-bezier(.68,-0.4,.27,1.4)",
                    }}
                  />
                  <span
                    className="absolute top-1/2 h-[3px] w-6 -translate-y-1/2 rounded-full bg-[#2C2C2A] transition-opacity duration-150"
                    style={{ opacity: sidebarOpen ? 0 : 1, boxShadow: "1px 1px 1px rgba(0,0,0,0.25)" }}
                  />
                  <span
                    className="absolute h-[3px] w-6 rounded-full bg-[#2C2C2A] transition-transform duration-300"
                    style={{
                      top: sidebarOpen ? "50%" : "68%",
                      transform: sidebarOpen ? "translateY(-50%) rotate(-45deg)" : "translateY(-50%)",
                      boxShadow: "1px 1px 1px rgba(0,0,0,0.25)",
                      transitionTimingFunction: "cubic-bezier(.68,-0.4,.27,1.4)",
                    }}
                  />
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
                {businessName || "Driver Dashboard"}{" "}
                <span className="hidden text-xs font-normal text-[#5F5E5A] sm:inline">— Driver SaaS</span>
              </div>
            </div>
            {driverId && (
              <button
                onClick={handleToggleOnline}
                disabled={togglingOnline}
                className="emboss-btn ml-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-70"
                style={{ color: isOnline ? "#27500A" : "#5F5E5A" }}
                title={isOnline ? "Taking bookings today — tap to go offline" : "Not taking bookings — tap to go online"}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: isOnline ? "#4CAF50" : "#B4B2A9" }}
                />
                {isOnline ? "Online" : "Offline"}
              </button>
            )}
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
                className="emboss-btn flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-[#991B1B] cursor-pointer transition-all"
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
              <FareRulesSetupStep driverId={driverId} onComplete={() => setOnboardingStep(6)} />
            )}
            {onboardingStep === 6 && (
              <LicenceScreen
                driverId={driverId}
                onboarding
                onNext={() => {
                  setViewMode("dashboard");
                  setDashboardScreen("overview");
                }}
                onSkip={() => {
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
                  background: "#0F172A",
                }}
              >
                <nav className="flex flex-col gap-2.5">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = dashboardScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectScreen(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium cursor-pointer text-left ${
                          sidebarCollapsed ? "lg:justify-center lg:px-0" : ""
                        } ${isActive ? "text-white" : "text-[#9CA3B5] hover:text-white"}`}
                        style={{
                          background: isActive ? "linear-gradient(145deg, #2563EB, #1D4ED8)" : "#16213A",
                          boxShadow: isActive
                            ? "inset 2px 2px 5px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.15), 0 4px 14px rgba(37,99,235,0.35)"
                            : "2px 3px 6px rgba(0,0,0,0.35), -1px -1px 3px rgba(255,255,255,0.03)",
                          transform: isActive ? "translateY(1px)" : undefined,
                          transition: "background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, color 0.2s ease",
                        }}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
                            sidebarCollapsed ? "" : ""
                          }`}
                          style={{
                            background: isActive ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                            boxShadow: isActive
                              ? "inset 1px 1px 3px rgba(0,0,0,0.25)"
                              : "inset 1px 1px 2px rgba(0,0,0,0.3), inset -1px -1px 1px rgba(255,255,255,0.06)",
                          }}
                        >
                          <Icon size={16} />
                        </span>
                        <span className={sidebarCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                        {item.id === "bookings" && unviewedCount > 0 && (
                          <span
                            className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ${
                              sidebarCollapsed ? "lg:absolute lg:right-1 lg:top-1 lg:ml-0" : ""
                            }`}
                            style={{ background: "#D64545", boxShadow: "1px 1px 3px rgba(0,0,0,0.4)" }}
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
              {dashboardScreen === "bookings" && (
                <AllBookingsScreen
                  driverId={driverId}
                  openBookingId={openBookingId}
                  onOpenBookingHandled={() => setOpenBookingId(null)}
                />
              )}
              {dashboardScreen === "settings" && <SettingsScreen driverId={driverId} />}
              {dashboardScreen === "earnings" && <EarningsScreen driverId={driverId} />}
              {dashboardScreen === "customers" && <CustomersScreen driverId={driverId} />}
              {dashboardScreen === "profile" && <DriverProfileScreen driverId={driverId} onNavigate={selectScreen} />}
            </div>
          </main>
        </div>
      )}

      {/* DebugBadge removed — it was explicitly marked "temporary,
          remove once the screen-persistence bug is confirmed fixed" and
          never actually removed, so it's been showing raw internal
          routing/localStorage state to every real driver in production.
          The bug it was tracking is confirmed fixed by now (extensive
          real-device testing since). */}

      {/* Version badge — dev-only now. Useful for confirming which
          commit you're testing locally, but a live driver has no
          reason to see this, and the previous unconditional render
          meant it (and the debug badge above) were both showing on
          every real production device. See vite.config.ts for how
          these values are injected. */}
      {import.meta.env.DEV && <VersionBadge />}
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

