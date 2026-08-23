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
import FareRulesScreen from "./components/FareRulesScreen";
import VehicleInfoScreen from "./components/VehicleInfoScreen";
import StripeOnboardingScreen from "./components/StripeOnboardingScreen";

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
  Settings2,
  Car,
  CreditCard,
  Menu,
  X,
} from "lucide-react";

export default function App() {
  const [viewMode, setViewMode] = useState<"onboarding" | "dashboard">("onboarding");
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [dashboardScreen, setDashboardScreen] = useState<"overview" | "login" | "bookings" | "fare_rules" | "vehicle" | "stripe">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Real session tracking. onAuthStateChange fires immediately with the
  // current session on load, then again on every sign-in/sign-out — this
  // is the one source of truth for "who's logged in right now."
  const [driverId, setDriverId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const result = await getDriverForUser(session.user.id);
        setDriverId(result.driverId);
        // Driver already has an account — go straight to dashboard,
        // skip onboarding entirely.
        if (result.driverId) {
          setViewMode("dashboard");
          setDashboardScreen("overview");
        }
      } else {
        setDriverId(null);
      }
      setSessionChecked(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const { notifications, dismiss } = useNewBookingNotifications(driverId);

  async function handleLogout() {
    await supabase.auth.signOut();
    setDriverId(null);
    setDashboardScreen("login");
  }

  const navigationItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "fare_rules", label: "Fare Rules", icon: Settings2 },
    { id: "vehicle", label: "Vehicle", icon: Car },
    { id: "stripe", label: "Stripe", icon: CreditCard },
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
      <header className="sticky top-0 z-40 border-b border-[#ECE9E0] bg-[#F7F7F5]/90 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {viewMode === "dashboard" && (
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="emboss-btn flex h-9 w-9 items-center justify-center rounded-lg text-[#2C2C2A] lg:hidden"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
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
                John's Taxi <span className="text-xs font-normal text-[#5F5E5A]">— Driver SaaS</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => setViewMode("dashboard")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                viewMode === "dashboard"
                  ? "emboss-btn-primary text-white"
                  : "emboss-btn text-[#5F5E5A] hover:text-[#2C2C2A]"
              }`}
            >
              <LayoutDashboard size={13} />
              <span className="hidden sm:inline">Driver Dashboard View</span>
              <span className="sm:hidden">Dashboard</span>
            </button>

            {driverId ? (
              <button
                onClick={handleLogout}
                className="emboss-btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#991B1B] cursor-pointer transition-all"
              >
                <LogOut size={13} />
                <span>Log out</span>
              </button>
            ) : (
              <button
                onClick={() => { setViewMode("dashboard"); setDashboardScreen("login"); }}
                className="emboss-btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#5F5E5A] hover:text-[#2C2C2A] cursor-pointer transition-all"
              >
                <LogIn size={13} />
                <span>Log in</span>
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
        <div className="mx-auto flex max-w-7xl">
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
                className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform border-r border-[#ECE9E0] bg-[#FBFAF6] p-4 transition-transform duration-200 ease-out lg:sticky lg:top-[57px] lg:z-0 lg:h-[calc(100vh-57px)] lg:translate-x-0 ${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                style={{ top: sidebarOpen ? 0 : undefined }}
              >
                <nav className="flex flex-col gap-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = dashboardScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectScreen(item.id)}
                        className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium cursor-pointer transition-all text-left ${
                          isActive
                            ? "emboss-btn-primary text-white"
                            : "text-[#5F5E5A] hover:bg-[#F0EEE7] hover:text-[#2C2C2A]"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </aside>
            </>
          )}

          <main className="min-w-0 flex-1 py-6">
            <div className="px-4">
              {dashboardScreen === "overview" && <OverviewDashboard driverId={driverId} onNavigate={(s) => setDashboardScreen(s as any)} />}
              {dashboardScreen === "login" && (
                <LoginScreen
                  onLoginSuccess={() => setDashboardScreen("overview")}
                />
              )}
              {dashboardScreen === "bookings" && <AllBookingsScreen driverId={driverId} />}
              {dashboardScreen === "fare_rules" && <FareRulesScreen />}
              {dashboardScreen === "vehicle" && <VehicleInfoScreen driverId={driverId} />}
              {dashboardScreen === "stripe" && <StripeOnboardingScreen />}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

