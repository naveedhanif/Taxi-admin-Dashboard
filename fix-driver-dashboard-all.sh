#!/bin/bash
set -e

echo 'Applying all outstanding fixes to the driver dashboard...'
echo 'This includes: React type-import fixes (8 files), seat selector'
echo 'fix, CSS import order fix, and the new real-time notification system.'

echo 'Writing src/App.tsx...'
cat > src/App.tsx << 'FILE_EOF_0'
import { useState } from "react";
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

import { LayoutDashboard, Compass, LogIn, Calendar, Settings2, Car, CreditCard } from "lucide-react";

export default function App() {
  const [viewMode, setViewMode] = useState<"onboarding" | "dashboard">("onboarding");
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [dashboardScreen, setDashboardScreen] = useState<"overview" | "login" | "bookings" | "fare_rules" | "vehicle" | "stripe">("overview");

  // TODO: replace with the real logged-in driver's id once real Auth is
  // built — until then this stays null and the notification hook simply
  // does nothing (no subscription is created without a real driverId).
  const [driverId] = useState<string | null>(null);
  const { notifications, dismiss } = useNewBookingNotifications(driverId);

  const navigationItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "login", label: "Login", icon: LogIn },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "fare_rules", label: "Fare Rules", icon: Settings2 },
    { id: "vehicle", label: "Vehicle", icon: Car },
    { id: "stripe", label: "Stripe", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#2C2C2A] font-sans antialiased">
      <NotificationToast notifications={notifications} onDismiss={dismiss} />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[#ECE9E0] bg-[#F7F7F5]/90 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
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
              <span>Onboarding Flow (Steps 1-5)</span>
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
              <span>Driver Dashboard View</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl py-6">
        {viewMode === "onboarding" ? (
          <div className="px-4">
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
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 px-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = dashboardScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setDashboardScreen(item.id as any)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                      isActive
                        ? "emboss-btn-primary text-white"
                        : "emboss-btn text-[#5F5E5A] hover:text-[#2C2C2A]"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {dashboardScreen === "overview" && <OverviewDashboard onNavigate={(s) => setDashboardScreen(s as any)} />}
            {dashboardScreen === "login" && <LoginScreen />}
            {dashboardScreen === "bookings" && <AllBookingsScreen />}
            {dashboardScreen === "fare_rules" && <FareRulesScreen />}
            {dashboardScreen === "vehicle" && <VehicleInfoScreen />}
            {dashboardScreen === "stripe" && <StripeOnboardingScreen />}
          </div>
        )}
      </main>
    </div>
  );
}

FILE_EOF_0

echo 'Writing src/NotificationToast.tsx...'
cat > src/NotificationToast.tsx << 'FILE_EOF_1'
import type React from "react";
import { Bell, X, MapPin } from "lucide-react";
import type { BookingNotification } from "./useNewBookingNotifications";

interface Props {
  notifications: BookingNotification[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-3" style={{ fontFamily: "Inter" }}>
      {notifications.map((n) => (
        <div
          key={n.id}
          className="w-80 rounded-xl p-4"
          style={{
            background: "#FBFAF6",
            border: "1px solid #ECE9E0",
            boxShadow: "9px 9px 20px rgba(44,44,42,0.16), -7px -7px 16px rgba(255,255,255,0.9), 0 24px 30px -16px rgba(44,44,42,0.2)",
          }}
        >
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "#185FA5" }}
              >
                <Bell size={14} color="#FFFFFF" />
              </div>
              <span className="text-sm font-semibold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                New booking
              </span>
            </div>
            <button onClick={() => onDismiss(n.id)}>
              <X size={15} color="#8C8977" />
            </button>
          </div>
          <div className="text-sm text-[#2C2C2A]">{n.passenger_name}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-[#5F5E5A]">
            <MapPin size={11} /> {n.pickup_address} → {n.dropoff_address}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#ECE9E0] pt-2">
            <span className="text-xs text-[#8C8977]">
              {new Date(n.scheduled_time).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-sm font-semibold text-[#2C2C2A]">€{Number(n.estimated_fare).toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

FILE_EOF_1

echo 'Writing src/components/BusinessDetailsStep.tsx...'
cat > src/components/BusinessDetailsStep.tsx << 'FILE_EOF_2'
import type React from "react";
import { useState, useEffect } from "react";
import { Building2, Phone, Globe, ArrowRight, CheckCircle2 } from "lucide-react";

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
      .emboss-btn-primary {
        background: linear-gradient(135deg, #378ADD, #0C447C);
        border: none;
        box-shadow: 3px 3px 8px rgba(4,44,83,0.35), -2px -2px 6px rgba(133,183,235,0.5);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
    `}</style>
  );
}

function TiltCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8, active: true });
  }

  function handleLeave() {
    setTilt({ x: 0, y: 0, active: false });
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        ...style,
        background: "#FBFAF6",
        border: "1px solid #ECE9E0",
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${tilt.active ? "scale(1.015)" : "scale(1)"}`,
        boxShadow: tilt.active
          ? "9px 9px 20px rgba(44,44,42,0.16), -7px -7px 16px rgba(255,255,255,0.9), 0 24px 30px -16px rgba(44,44,42,0.2)"
          : "6px 6px 14px rgba(44,44,42,0.10), -6px -6px 14px rgba(255,255,255,0.85)",
        transition: tilt.active ? "transform 0.06s ease-out" : "transform 0.4s ease-out, box-shadow 0.4s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

function RecessedField({ icon: Icon, ...props }: any) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 transition-all"
      style={{
        background: "#F0EEE7",
        boxShadow: "inset 2px 2px 5px rgba(44,44,42,0.14), inset -2px -2px 5px rgba(255,255,255,0.8)",
      }}
    >
      <Icon size={15} color="#8C8977" />
      <input
        {...props}
        className="w-full bg-transparent text-sm outline-none placeholder:text-[#8C8977]"
        style={{ color: "#2C2C2A", fontFamily: "Inter" }}
      />
    </div>
  );
}

interface BusinessDetailsStepProps {
  onNext?: (data: { businessName: string; phone: string; slug: string }) => void;
  initialBusinessName?: string;
  initialPhone?: string;
}

export default function BusinessDetailsStep({
  onNext,
  initialBusinessName = "John's Taxi",
  initialPhone = "+353 87 123 4567",
}: BusinessDetailsStepProps) {
  useGoogleFont();
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [phone, setPhone] = useState(initialPhone);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "your-taxi";
  };

  const slug = generateSlug(businessName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) {
      onNext({ businessName, phone, slug });
    }
  };

  return (
    <div className="flex min-h-[500px] w-full items-center justify-center p-4 font-sans" style={{ backgroundColor: "#F7F7F5" }}>
      <EmbossStyles />

      <div className="w-full max-w-lg">
        <TiltCard className="rounded-2xl p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-[#EAF3DE] px-2.5 py-0.5 text-[11px] font-semibold text-[#27500A]">
                Step 1 of 5
              </span>
            </div>
            <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
              Business Profile
            </h1>
            <p className="mt-1 text-xs text-[#5F5E5A]">
              Set up your public brand details and customized booking link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">
                Business / Taxi Trading Name
              </label>
              <RecessedField
                icon={Building2}
                type="text"
                required
                value={businessName}
                onChange={(e: any) => setBusinessName(e.target.value)}
                placeholder="e.g. John's Taxi Service"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">
                Dispatch Phone Number
              </label>
              <RecessedField
                icon={Phone}
                type="tel"
                required
                value={phone}
                onChange={(e: any) => setPhone(e.target.value)}
                placeholder="+353 87 123 4567"
              />
            </div>

            {/* Live Slug Preview Card */}
            <div
              className="mt-6 rounded-xl p-4 text-xs transition-all"
              style={{
                background: "linear-gradient(145deg, #EAE8E1, #F8F6F1)",
                boxShadow: "inset 2px 2px 5px rgba(44,44,42,0.12), inset -2px -2px 5px rgba(255,255,255,0.85)",
                border: "1px solid #ECE9E0",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#185FA5]" style={{ fontFamily: "'Space Grotesk'" }}>
                  <Globe size={13} /> Your Unique Booking URL
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#27500A] font-semibold">
                  <CheckCircle2 size={11} /> Live Auto-Slug
                </span>
              </div>
              <div className="font-mono text-xs font-bold text-[#2C2C2A] bg-white/80 p-2.5 rounded-lg border border-[#ECE9E0] break-all">
                yourapp.com/book/<span className="text-[#185FA5]">{slug}</span>
              </div>
              <p className="mt-2 text-[11px] text-[#5F5E5A]">
                Passengers open this URL or scan your QR code to book rides directly with you.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="emboss-btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
              >
                <span>Continue to Stripe Setup</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </TiltCard>
      </div>
    </div>
  );
}

FILE_EOF_2

echo 'Writing src/components/FareRulesScreen.tsx...'
cat > src/components/FareRulesScreen.tsx << 'FILE_EOF_3'
import type React from "react";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Check, ShieldCheck, HelpCircle } from "lucide-react";

export interface FareRule {
  id: string;
  name: string;
  base_rate: number;
  per_km_rate: number;
  per_minute_rate: number;
  minimum_fare: number;
  is_active: boolean;
}

const initialFareRules: FareRule[] = [
  {
    id: "fr_standard",
    name: "Standard Day Rate",
    base_rate: 4.20,
    per_km_rate: 1.65,
    per_minute_rate: 0.35,
    minimum_fare: 10.00,
    is_active: true,
  },
  {
    id: "fr_night",
    name: "Night & Weekend Rate",
    base_rate: 5.50,
    per_km_rate: 2.10,
    per_minute_rate: 0.45,
    minimum_fare: 14.00,
    is_active: false,
  },
  {
    id: "fr_airport",
    name: "Airport Premium Transfer",
    base_rate: 8.00,
    per_km_rate: 1.85,
    per_minute_rate: 0.40,
    minimum_fare: 25.00,
    is_active: false,
  },
];

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
      .emboss-btn-primary {
        background: #185FA5;
        border: none;
        box-shadow: 3px 3px 7px rgba(4,44,83,0.35), -2px -2px 5px rgba(133,183,235,0.55);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
      .emboss-toggle-on {
        background: #EAF3DE;
        border: none;
        box-shadow: 2px 2px 5px rgba(59,109,17,0.22), -2px -2px 5px rgba(255,255,255,0.8);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-toggle-off {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-input {
        background: #FFFFFF;
        border: 1px solid #E4E2DA;
        box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .emboss-input:focus {
        outline: none;
        border-color: #185FA5;
        box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08), 0 0 0 2px rgba(24,95,165,0.15);
      }
    `}</style>
  );
}

export default function FareRulesScreen() {
  useGoogleFont();
  const [rules, setRules] = useState<FareRule[]>(initialFareRules);
  const [editingRule, setEditingRule] = useState<FareRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleRuleActive = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, is_active: !r.is_active };
        }
        // If single active rule policy is enforced
        return r;
      })
    );
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    if (rules.some((r) => r.id === editingRule.id)) {
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? editingRule : r)));
    } else {
      setRules((prev) => [...prev, editingRule]);
    }
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const openAddModal = () => {
    setEditingRule({
      id: `fr_${Date.now()}`,
      name: "Custom Rate Profile",
      base_rate: 4.50,
      per_km_rate: 1.70,
      per_minute_rate: 0.35,
      minimum_fare: 12.00,
      is_active: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rule: FareRule) => {
    setEditingRule({ ...rule });
    setIsModalOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-[600px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            Fare Rules Configuration
          </h1>
          <p className="text-sm text-[#5F5E5A]">Set distance, duration, and base tariffs for instant passenger quotes</p>
        </div>
        <button
          onClick={openAddModal}
          className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <Plus size={14} /> Add fare rule
        </button>
      </div>

      {/* Info Card */}
      <div className="mb-6 rounded-xl border border-[#E4E2DA] bg-[#F1EFE8] p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 text-[#185FA5] shrink-0" />
        <div className="text-xs text-[#5F5E5A] leading-relaxed">
          <strong>Direct Quote Engine:</strong> Your passenger booking PWA queries these active rates directly to generate real-time upfront fare estimates before checkout. Only one rule is marked default active at a time.
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-xl border bg-white p-5 transition-all ${
              rule.is_active ? "border-[#639922] shadow-sm" : "border-[#E4E2DA]"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                  {rule.name}
                </span>
              </div>
              <button
                onClick={() => toggleRuleActive(rule.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all ${
                  rule.is_active ? "emboss-toggle-on text-[#27500A]" : "emboss-toggle-off text-[#5F5E5A]"
                }`}
              >
                {rule.is_active ? "Active Rule" : "Inactive"}
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#5F5E5A] border-t border-[#E4E2DA] pt-3 mb-4">
              <div className="flex justify-between items-center">
                <span>Base pickup fare</span>
                <span className="font-semibold text-[#2C2C2A]">€{rule.base_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Rate per km</span>
                <span className="font-semibold text-[#2C2C2A]">€{rule.per_km_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Rate per minute</span>
                <span className="font-semibold text-[#2C2C2A]">€{rule.per_minute_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-dashed border-[#E4E2DA]">
                <span className="font-medium text-[#2C2C2A]">Minimum trip fare</span>
                <span className="font-bold text-[#185FA5]">€{rule.minimum_fare.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#E4E2DA]">
              <button
                onClick={() => openEditModal(rule)}
                className="emboss-btn flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-[#2C2C2A] cursor-pointer"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="emboss-btn flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#991B1B] hover:bg-red-50 cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E4E2DA] bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
              {rules.some((r) => r.id === editingRule.id) ? "Edit Fare Rule" : "Create Fare Rule"}
            </h3>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Rule Profile Name</label>
                <input
                  type="text"
                  required
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[#2C2C2A]">Base Fare (€)</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={editingRule.base_rate}
                    onChange={(e) => setEditingRule({ ...editingRule, base_rate: parseFloat(e.target.value) || 0 })}
                    className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#2C2C2A]">Minimum Fare (€)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={editingRule.minimum_fare}
                    onChange={(e) => setEditingRule({ ...editingRule, minimum_fare: parseFloat(e.target.value) || 0 })}
                    className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[#2C2C2A]">Per Kilometer Rate (€)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={editingRule.per_km_rate}
                    onChange={(e) => setEditingRule({ ...editingRule, per_km_rate: parseFloat(e.target.value) || 0 })}
                    className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#2C2C2A]">Per Minute Rate (€)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={editingRule.per_minute_rate}
                    onChange={(e) => setEditingRule({ ...editingRule, per_minute_rate: parseFloat(e.target.value) || 0 })}
                    className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active_check"
                  checked={editingRule.is_active}
                  onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                  className="rounded border-[#E4E2DA]"
                />
                <label htmlFor="active_check" className="font-medium text-[#2C2C2A] cursor-pointer">
                  Set as default active tariff rule
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-[#E4E2DA] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="emboss-btn rounded-lg px-4 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="emboss-btn-primary rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Save Fare Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

FILE_EOF_3

echo 'Writing src/components/FareRulesSetupStep.tsx...'
cat > src/components/FareRulesSetupStep.tsx << 'FILE_EOF_4'
import type React from "react";
import { useState, useEffect } from "react";
import { Euro, Tag, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
      .emboss-btn-primary {
        background: linear-gradient(135deg, #378ADD, #0C447C);
        border: none;
        box-shadow: 3px 3px 8px rgba(4,44,83,0.35), -2px -2px 6px rgba(133,183,235,0.5);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
    `}</style>
  );
}

function TiltCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8, active: true });
  }

  function handleLeave() {
    setTilt({ x: 0, y: 0, active: false });
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        ...style,
        background: "#FBFAF6",
        border: "1px solid #ECE9E0",
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${tilt.active ? "scale(1.015)" : "scale(1)"}`,
        boxShadow: tilt.active
          ? "9px 9px 20px rgba(44,44,42,0.16), -7px -7px 16px rgba(255,255,255,0.9), 0 24px 30px -16px rgba(44,44,42,0.2)"
          : "6px 6px 14px rgba(44,44,42,0.10), -6px -6px 14px rgba(255,255,255,0.85)",
        transition: tilt.active ? "transform 0.06s ease-out" : "transform 0.4s ease-out, box-shadow 0.4s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

function RecessedField({ icon: Icon, prefix = "€", ...props }: any) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 transition-all"
      style={{
        background: "#F0EEE7",
        boxShadow: "inset 2px 2px 5px rgba(44,44,42,0.14), inset -2px -2px 5px rgba(255,255,255,0.8)",
      }}
    >
      {Icon ? <Icon size={15} color="#8C8977" /> : <span className="text-xs font-bold text-[#8C8977]">{prefix}</span>}
      <input
        {...props}
        className="w-full bg-transparent text-sm outline-none placeholder:text-[#8C8977]"
        style={{ color: "#2C2C2A", fontFamily: "Inter" }}
      />
    </div>
  );
}

interface FareRulesSetupStepProps {
  onComplete?: (data: {
    ruleName: string;
    baseRate: number;
    perKmRate: number;
    perMinuteRate: number;
    minimumFare: number;
  }) => void;
}

export default function FareRulesSetupStep({ onComplete }: FareRulesSetupStepProps) {
  useGoogleFont();
  const [ruleName, setRuleName] = useState("Standard Tariff");
  const [baseRate, setBaseRate] = useState("4.20");
  const [perKmRate, setPerKmRate] = useState("1.65");
  const [perMinuteRate, setPerMinuteRate] = useState("0.35");
  const [minimumFare, setMinimumFare] = useState("10.00");
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompleted(true);
    setTimeout(() => {
      if (onComplete) {
        onComplete({
          ruleName,
          baseRate: parseFloat(baseRate) || 0,
          perKmRate: parseFloat(perKmRate) || 0,
          perMinuteRate: parseFloat(perMinuteRate) || 0,
          minimumFare: parseFloat(minimumFare) || 0,
        });
      }
    }, 1200);
  };

  return (
    <div className="flex min-h-[500px] w-full items-center justify-center p-4 font-sans" style={{ backgroundColor: "#F7F7F5" }}>
      <EmbossStyles />

      <div className="w-full max-w-lg">
        <TiltCard className="rounded-2xl p-8">
          {isCompleted ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3DE]">
                <CheckCircle2 size={28} color="#27500A" />
              </div>
              <div className="text-2xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                Setup complete!
              </div>
              <p className="text-xs text-[#5F5E5A] max-w-sm mx-auto leading-relaxed">
                Your fare rules are active. Your booking link is now live and ready to receive passenger pre-bookings.
              </p>
              <div className="pt-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3DE] px-4 py-2 text-xs font-semibold text-[#27500A]">
                  <Sparkles size={14} /> Opening Driver Dashboard...
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-[#EAF3DE] px-2.5 py-0.5 text-[11px] font-semibold text-[#27500A]">
                    Step 5 of 5
                  </span>
                </div>
                <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
                  Set Default Fare Rule
                </h1>
                <p className="mt-1 text-xs text-[#5F5E5A]">
                  Set your initial pricing rule for automated passenger fare quotes
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Tariff Rule Name</label>
                  <RecessedField
                    icon={Tag}
                    type="text"
                    required
                    value={ruleName}
                    onChange={(e: any) => setRuleName(e.target.value)}
                    placeholder="e.g. Standard Day Rate"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Base Fare (€)</label>
                    <RecessedField
                      prefix="€"
                      type="number"
                      step="0.10"
                      required
                      value={baseRate}
                      onChange={(e: any) => setBaseRate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Minimum Trip Fare (€)</label>
                    <RecessedField
                      prefix="€"
                      type="number"
                      step="0.50"
                      required
                      value={minimumFare}
                      onChange={(e: any) => setMinimumFare(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Per Kilometer Rate (€)</label>
                    <RecessedField
                      prefix="€"
                      type="number"
                      step="0.05"
                      required
                      value={perKmRate}
                      onChange={(e: any) => setPerKmRate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Per Minute Rate (€)</label>
                    <RecessedField
                      prefix="€"
                      type="number"
                      step="0.05"
                      required
                      value={perMinuteRate}
                      onChange={(e: any) => setPerMinuteRate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl p-3.5 text-xs text-[#5F5E5A] bg-[#F1EFE8] border border-[#ECE9E0]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#2C2C2A] mb-1">
                    <ShieldCheck size={14} className="text-[#185FA5]" /> Automatic Quote Example
                  </div>
                  <span>
                    A 10km ride taking 15 minutes will automatically quote:{" "}
                    <strong className="text-[#2C2C2A]">
                      €{(parseFloat(baseRate || "0") + 10 * parseFloat(perKmRate || "0") + 15 * parseFloat(perMinuteRate || "0")).toFixed(2)}
                    </strong>
                  </span>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="emboss-btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
                  >
                    <span>Save Fare Rule & Finish Setup</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            </>
          )}
        </TiltCard>
      </div>
    </div>
  );
}

FILE_EOF_4

echo 'Writing src/components/LoginScreen.tsx...'
cat > src/components/LoginScreen.tsx << 'FILE_EOF_5'
import type React from "react";
import { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight, CheckCircle2, Car, KeyRound } from "lucide-react";

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
      .emboss-btn-primary {
        background: #185FA5;
        border: none;
        box-shadow: 3px 3px 7px rgba(4,44,83,0.35), -2px -2px 5px rgba(133,183,235,0.55);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
      .emboss-input {
        background: #FFFFFF;
        border: 1px solid #E4E2DA;
        box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .emboss-input:focus {
        outline: none;
        border-color: #185FA5;
        box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08), 0 0 0 2px rgba(24,95,165,0.15);
      }
      @keyframes animateRise {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-entrance {
        animation: animateRise 300ms ease-out forwards;
      }
    `}</style>
  );
}

export default function LoginScreen() {
  useGoogleFont();
  const [authMode, setAuthMode] = useState<"password" | "magic_link">("password");
  const [email, setEmail] = useState("john.driver@example.com");
  const [password, setPassword] = useState("••••••••••••");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1000);
  };

  return (
    <div className="flex min-h-[640px] w-full items-center justify-center p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      <div className="animate-entrance w-full max-w-md">
        {/* Branding Slot */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E4E2DA] bg-[#F1EFE8]">
            <Car size={28} color="#185FA5" />
          </div>
          <div className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            John's Taxi
          </div>
          <div className="mt-1 text-sm text-[#5F5E5A]">Driver Dashboard Portal</div>
        </div>

        {/* Card Form */}
        <div className="rounded-xl border border-[#E4E2DA] bg-white p-6 shadow-sm">
          {isSuccess ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3DE]">
                <CheckCircle2 size={24} color="#27500A" />
              </div>
              <div className="text-lg font-semibold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                {authMode === "magic_link" ? "Magic link sent!" : "Welcome back, John!"}
              </div>
              <div className="mt-2 text-xs text-[#5F5E5A]">
                {authMode === "magic_link"
                  ? "Check your inbox for your secure sign-in link."
                  : "Authenticating session and redirecting..."}
              </div>
              <button
                onClick={() => setIsSuccess(false)}
                className="emboss-btn mt-6 w-full rounded-lg py-2.5 text-xs font-medium text-[#2C2C2A]"
              >
                Sign in as different user
              </button>
            </div>
          ) : (
            <>
              {/* Method Toggle */}
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg border border-[#E4E2DA] bg-[#F1EFE8] p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("password")}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all ${
                    authMode === "password"
                      ? "bg-white text-[#2C2C2A] shadow-sm"
                      : "text-[#5F5E5A] hover:text-[#2C2C2A]"
                  }`}
                >
                  <Lock size={13} /> Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("magic_link")}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all ${
                    authMode === "magic_link"
                      ? "bg-white text-[#2C2C2A] shadow-sm"
                      : "text-[#5F5E5A] hover:text-[#2C2C2A]"
                  }`}
                >
                  <KeyRound size={13} /> Magic Link
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#2C2C2A]">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="driver@example.com"
                      className="emboss-input w-full rounded-lg px-3 py-2.5 pl-9 text-xs text-[#2C2C2A] placeholder-[#B4B2A9]"
                    />
                    <Mail size={14} className="absolute left-3 top-3 text-[#B4B2A9]" />
                  </div>
                </div>

                {authMode === "password" && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-[#2C2C2A]">Password</label>
                      <a href="#forgot" className="text-[11px] font-medium text-[#185FA5] hover:underline">
                        Forgot?
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="emboss-input w-full rounded-lg px-3 py-2.5 pl-9 text-xs text-[#2C2C2A] placeholder-[#B4B2A9]"
                      />
                      <Lock size={14} className="absolute left-3 top-3 text-[#B4B2A9]" />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="emboss-btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white cursor-pointer"
                >
                  {isLoading ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>{authMode === "password" ? "Sign in to dashboard" : "Send magic link"}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-[#5F5E5A]">
          Direct Digital Dispatch • Protected by Supabase Auth & RLS
        </div>
      </div>
    </div>
  );
}

FILE_EOF_5

echo 'Writing src/components/StripeConnectStep.tsx...'
cat > src/components/StripeConnectStep.tsx << 'FILE_EOF_6'
import type React from "react";
import { useState, useEffect } from "react";
import { CreditCard, DollarSign, ArrowRight, ShieldCheck, Banknote, RefreshCw } from "lucide-react";

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
      .emboss-btn-primary {
        background: linear-gradient(135deg, #378ADD, #0C447C);
        border: none;
        box-shadow: 3px 3px 8px rgba(4,44,83,0.35), -2px -2px 6px rgba(133,183,235,0.5);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
    `}</style>
  );
}

function TiltCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8, active: true });
  }

  function handleLeave() {
    setTilt({ x: 0, y: 0, active: false });
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        ...style,
        background: "#FBFAF6",
        border: "1px solid #ECE9E0",
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${tilt.active ? "scale(1.015)" : "scale(1)"}`,
        boxShadow: tilt.active
          ? "9px 9px 20px rgba(44,44,42,0.16), -7px -7px 16px rgba(255,255,255,0.9), 0 24px 30px -16px rgba(44,44,42,0.2)"
          : "6px 6px 14px rgba(44,44,42,0.10), -6px -6px 14px rgba(255,255,255,0.85)",
        transition: tilt.active ? "transform 0.06s ease-out" : "transform 0.4s ease-out, box-shadow 0.4s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

interface StripeConnectStepProps {
  onNext?: () => void;
  onSkip?: () => void;
}

export default function StripeConnectStep({ onNext, onSkip }: StripeConnectStepProps) {
  useGoogleFont();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      if (onNext) onNext();
    }, 1200);
  };

  const points = [
    {
      num: "1",
      title: "Get paid directly",
      desc: "Pass-through destination charges send fare revenue straight to your bank account.",
      icon: DollarSign,
      color: "#639922",
    },
    {
      num: "2",
      title: "Passengers pay by card",
      desc: "Offer seamless online pre-payments directly on your custom booking page.",
      icon: CreditCard,
      color: "#185FA5",
    },
    {
      num: "3",
      title: "Automated payouts",
      desc: "Funds arrive automatically on your rolling payout schedule, minus standard platform fees.",
      icon: Banknote,
      color: "#BA7517",
    },
  ];

  return (
    <div className="flex min-h-[500px] w-full items-center justify-center p-4 font-sans" style={{ backgroundColor: "#F7F7F5" }}>
      <EmbossStyles />

      <div className="w-full max-w-lg">
        <TiltCard className="rounded-2xl p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-[#EAF3DE] px-2.5 py-0.5 text-[11px] font-semibold text-[#27500A]">
                Step 2 of 5
              </span>
            </div>
            <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
              Connect Stripe Payouts
            </h1>
            <p className="mt-1 text-xs text-[#5F5E5A]">
              Connect your bank account so passenger card payments arrive directly with you.
            </p>
          </div>

          {/* 3-Point Visual List */}
          <div className="space-y-3 mb-6">
            {points.map((pt) => {
              const Icon = pt.icon;
              return (
                <div
                  key={pt.num}
                  className="flex items-start gap-3.5 rounded-xl p-3.5 transition-all"
                  style={{
                    background: "linear-gradient(145deg, #F8F6F1, #EAE8E1)",
                    border: "1px solid #ECE9E0",
                    boxShadow: "3px 3px 6px rgba(44,44,42,0.06), -3px -3px 6px rgba(255,255,255,0.8)",
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{
                      background: "linear-gradient(135deg, #378ADD, #0C447C)",
                      boxShadow: "2px 2px 5px rgba(4,44,83,0.3)",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                      {pt.title}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-[#5F5E5A]">
                      {pt.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security Note */}
          <div className="mb-6 flex items-center gap-2 text-[11px] text-[#5F5E5A] bg-[#F1EFE8] p-2.5 rounded-lg border border-[#ECE9E0]">
            <ShieldCheck size={15} className="text-[#639922] shrink-0" />
            <span>Secure onboarding hosted by Stripe. Bank details are encrypted and PCI-DSS compliant.</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="emboss-btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Connecting Stripe...</span>
                </>
              ) : (
                <>
                  <span>Connect with Stripe</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="emboss-btn flex w-full items-center justify-center rounded-full py-2.5 text-xs font-semibold text-[#5F5E5A] hover:text-[#2C2C2A] cursor-pointer"
            >
              I'll do this later
            </button>
          </div>
        </TiltCard>
      </div>
    </div>
  );
}

FILE_EOF_6

echo 'Writing src/components/SubscriptionPlanStep.tsx...'
cat > src/components/SubscriptionPlanStep.tsx << 'FILE_EOF_7'
import type React from "react";
import { useState, useEffect } from "react";
import { Check, Shield, ArrowRight, Zap, Award } from "lucide-react";

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
      .emboss-btn-primary {
        background: linear-gradient(135deg, #378ADD, #0C447C);
        border: none;
        box-shadow: 3px 3px 8px rgba(4,44,83,0.35), -2px -2px 6px rgba(133,183,235,0.5);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
    `}</style>
  );
}

function TiltCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8, active: true });
  }

  function handleLeave() {
    setTilt({ x: 0, y: 0, active: false });
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        ...style,
        background: "#FBFAF6",
        border: "1px solid #ECE9E0",
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${tilt.active ? "scale(1.015)" : "scale(1)"}`,
        boxShadow: tilt.active
          ? "9px 9px 20px rgba(44,44,42,0.16), -7px -7px 16px rgba(255,255,255,0.9), 0 24px 30px -16px rgba(44,44,42,0.2)"
          : "6px 6px 14px rgba(44,44,42,0.10), -6px -6px 14px rgba(255,255,255,0.85)",
        transition: tilt.active ? "transform 0.06s ease-out" : "transform 0.4s ease-out, box-shadow 0.4s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

interface SubscriptionPlanStepProps {
  onNext?: () => void;
}

export default function SubscriptionPlanStep({ onNext }: SubscriptionPlanStepProps) {
  useGoogleFont();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTrial = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onNext) onNext();
    }, 800);
  };

  const planFeatures = [
    "Unlimited scheduled pre-bookings",
    "Own branded booking web page & custom QR code",
    "Direct Stripe Connect bank payouts",
    "0% commission on passenger trip fares",
    "SMS & email booking notifications",
    "Live trip status & route tracking",
  ];

  return (
    <div className="flex min-h-[500px] w-full items-center justify-center p-4 font-sans" style={{ backgroundColor: "#F7F7F5" }}>
      <EmbossStyles />

      <div className="w-full max-w-lg">
        <TiltCard className="rounded-2xl p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-[#EAF3DE] px-2.5 py-0.5 text-[11px] font-semibold text-[#27500A]">
                Step 3 of 5
              </span>
            </div>
            <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
              Subscription & Plan
            </h1>
            <p className="mt-1 text-xs text-[#5F5E5A]">
              Simple flat-rate SaaS subscription with zero commission per ride
            </p>
          </div>

          {/* Plan Highlight Box */}
          <div
            className="mb-6 rounded-xl p-5"
            style={{
              background: "linear-gradient(145deg, #F8F6F1, #EAE8E1)",
              border: "1px solid #ECE9E0",
              boxShadow: "inset 2px 2px 5px rgba(44,44,42,0.12), inset -2px -2px 5px rgba(255,255,255,0.85)",
            }}
          >
            <div className="flex items-center justify-between border-b border-[#ECE9E0] pb-3 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#185FA5]" style={{ fontFamily: "'Space Grotesk'" }}>
                  Driver Pro Plan
                </span>
                <div className="text-2xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                  €39 <span className="text-xs font-medium text-[#5F5E5A]">/ month</span>
                </div>
              </div>
              <span className="rounded-full bg-[#EAF3DE] px-3 py-1 text-xs font-bold text-[#27500A]">
                14-Day Free Trial
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-[#2C2C2A]">
              {planFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EAF3DE] text-[#27500A]">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between text-xs text-[#5F5E5A] bg-[#F1EFE8] p-3 rounded-lg border border-[#ECE9E0]">
            <span className="flex items-center gap-1.5">
              <Shield size={14} className="text-[#185FA5]" /> No credit card required today
            </span>
            <span className="font-semibold text-[#2C2C2A]">Cancel anytime</span>
          </div>

          <button
            onClick={handleStartTrial}
            disabled={isLoading}
            className="emboss-btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
          >
            <span>{isLoading ? "Activating trial..." : "Start 14-day free trial"}</span>
            <ArrowRight size={14} />
          </button>
        </TiltCard>
      </div>
    </div>
  );
}

FILE_EOF_7

echo 'Writing src/components/VehicleInfoScreen.tsx...'
cat > src/components/VehicleInfoScreen.tsx << 'FILE_EOF_8'
import type React from "react";
import { useState, useEffect } from "react";
import { Car, ShieldCheck, Check, Save, Fuel, Users, Hash, Palette } from "lucide-react";

export interface VehicleData {
  make: string;
  model: string;
  year: string;
  color: string;
  plate: string;
  seats: number;
  vehicle_type: string;
  fuel_type: string;
  insurance_expiry: string;
  inspection_status: "verified" | "pending" | "expired";
}

const initialVehicle: VehicleData = {
  make: "Mercedes-Benz",
  model: "E-Class Estate 220d",
  year: "2023",
  color: "Obsidian Black",
  plate: "231-D-18492",
  seats: 4,
  vehicle_type: "Executive Saloon",
  fuel_type: "Diesel Hybrid",
  insurance_expiry: "2027-03-31",
  inspection_status: "verified",
};

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
      .emboss-btn-primary {
        background: #185FA5;
        border: none;
        box-shadow: 3px 3px 7px rgba(4,44,83,0.35), -2px -2px 5px rgba(133,183,235,0.55);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
      .emboss-input {
        background: #FFFFFF;
        border: 1px solid #E4E2DA;
        box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .emboss-input:focus {
        outline: none;
        border-color: #185FA5;
        box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08), 0 0 0 2px rgba(24,95,165,0.15);
      }
    `}</style>
  );
}

export default function VehicleInfoScreen() {
  useGoogleFont();
  const [vehicle, setVehicle] = useState<VehicleData>(initialVehicle);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-[600px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Top Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            Vehicle Information
          </h1>
          <p className="text-sm text-[#5F5E5A]">Manage your active taxi specs displayed to passengers during booking</p>
        </div>
        <span className="rounded-full bg-[#EAF3DE] px-3 py-1 text-xs font-semibold text-[#27500A] flex items-center gap-1.5">
          <ShieldCheck size={14} /> License Verified
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Card: Live Vehicle Preview */}
        <div className="rounded-xl border border-[#E4E2DA] bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-[#E4E2DA] pb-3">
              <span className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider">Public Profile Card</span>
              <span className="text-[11px] font-mono text-[#185FA5]">{vehicle.vehicle_type}</span>
            </div>

            <div className="mb-6 flex h-36 items-center justify-center rounded-xl bg-[#F1EFE8] border border-[#E4E2DA]">
              <div className="text-center">
                <Car size={48} color="#185FA5" className="mx-auto mb-2" />
                <div className="font-mono text-sm font-bold text-[#2C2C2A] bg-white px-3 py-1 rounded border border-[#E4E2DA] shadow-xs inline-block">
                  {vehicle.plate}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[#5F5E5A]">
              <div className="flex justify-between items-center">
                <span>Vehicle Model</span>
                <span className="font-semibold text-[#2C2C2A]">{vehicle.make} {vehicle.model}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Color</span>
                <span className="font-medium text-[#2C2C2A] flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2C2C2A] border border-[#E4E2DA]" />
                  {vehicle.color}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Max Passengers</span>
                <span className="font-semibold text-[#2C2C2A] flex items-center gap-1">
                  <Users size={12} className="text-[#185FA5]" /> {vehicle.seats} Seats
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Fuel System</span>
                <span className="font-medium text-[#2C2C2A]">{vehicle.fuel_type}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-[#EAF3DE] p-3 text-xs text-[#27500A]">
            <strong>SPSV Inspection:</strong> Active until {vehicle.insurance_expiry}. Meets all pre-booking regulatory requirements.
          </div>
        </div>

        {/* Right Form: Editable Spec Details */}
        <div className="col-span-2 rounded-xl border border-[#E4E2DA] bg-white p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#E4E2DA] pb-3">
            <h2 className="text-sm font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
              Edit Vehicle Specification
            </h2>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-medium text-[#27500A] bg-[#EAF3DE] px-2.5 py-1 rounded-full">
                <Check size={13} /> Updated successfully
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Vehicle Make</label>
                <input
                  type="text"
                  required
                  value={vehicle.make}
                  onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Vehicle Model</label>
                <input
                  type="text"
                  required
                  value={vehicle.model}
                  onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Registration Plate</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={vehicle.plate}
                    onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                    className="emboss-input w-full rounded-lg px-3 py-2 pl-8 text-xs font-mono font-bold text-[#2C2C2A]"
                  />
                  <Hash size={13} className="absolute left-2.5 top-2.5 text-[#B4B2A9]" />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Color</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={vehicle.color}
                    onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                    className="emboss-input w-full rounded-lg px-3 py-2 pl-8 text-xs text-[#2C2C2A]"
                  />
                  <Palette size={13} className="absolute left-2.5 top-2.5 text-[#B4B2A9]" />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Passenger Seats</label>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 6, 9].map((option) => {
                    const isActive = vehicle.seats === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setVehicle({ ...vehicle, seats: option })}
                        className="rounded-lg py-2 text-xs font-semibold transition-all"
                        style={{
                          background: isActive ? "#185FA5" : "#F0EEE7",
                          color: isActive ? "#FFFFFF" : "#2C2C2A",
                          boxShadow: isActive
                            ? "inset 2px 2px 4px rgba(4,44,83,0.4), inset -2px -2px 3px rgba(133,183,235,0.3)"
                            : "2px 2px 5px rgba(44,44,42,0.14), -2px -2px 5px rgba(255,255,255,0.85)",
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Vehicle Classification</label>
                <select
                  value={vehicle.vehicle_type}
                  onChange={(e) => setVehicle({ ...vehicle, vehicle_type: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs font-medium text-[#2C2C2A]"
                >
                  <option value="Executive Saloon">Executive Saloon</option>
                  <option value="Standard Taxi">Standard Taxi</option>
                  <option value="MPV / Van (6+ Seats)">MPV / Van (6+ Seats)</option>
                  <option value="Wheelchair Accessible">Wheelchair Accessible</option>
                  <option value="Electric / EV">Electric / EV Premium</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Engine / Fuel Type</label>
                <div className="relative">
                  <input
                    type="text"
                    value={vehicle.fuel_type}
                    onChange={(e) => setVehicle({ ...vehicle, fuel_type: e.target.value })}
                    className="emboss-input w-full rounded-lg px-3 py-2 pl-8 text-xs text-[#2C2C2A]"
                  />
                  <Fuel size={13} className="absolute left-2.5 top-2.5 text-[#B4B2A9]" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E4E2DA] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setVehicle(initialVehicle)}
                className="emboss-btn rounded-lg px-4 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer"
              >
                Reset
              </button>
              <button
                type="submit"
                className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                <Save size={14} /> Save vehicle details
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

FILE_EOF_8

echo 'Writing src/components/VehicleSetupStep.tsx...'
cat > src/components/VehicleSetupStep.tsx << 'FILE_EOF_9'
import type React from "react";
import { useState, useEffect } from "react";
import { Car, Hash, Palette, Users, ArrowRight } from "lucide-react";

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
      .emboss-btn-primary {
        background: linear-gradient(135deg, #378ADD, #0C447C);
        border: none;
        box-shadow: 3px 3px 8px rgba(4,44,83,0.35), -2px -2px 6px rgba(133,183,235,0.5);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
      }
      .emboss-btn-primary:active {
        box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
        transform: translateY(1px);
      }
    `}</style>
  );
}

function TiltCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8, active: true });
  }

  function handleLeave() {
    setTilt({ x: 0, y: 0, active: false });
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        ...style,
        background: "#FBFAF6",
        border: "1px solid #ECE9E0",
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${tilt.active ? "scale(1.015)" : "scale(1)"}`,
        boxShadow: tilt.active
          ? "9px 9px 20px rgba(44,44,42,0.16), -7px -7px 16px rgba(255,255,255,0.9), 0 24px 30px -16px rgba(44,44,42,0.2)"
          : "6px 6px 14px rgba(44,44,42,0.10), -6px -6px 14px rgba(255,255,255,0.85)",
        transition: tilt.active ? "transform 0.06s ease-out" : "transform 0.4s ease-out, box-shadow 0.4s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

function RecessedField({ icon: Icon, ...props }: any) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 transition-all"
      style={{
        background: "#F0EEE7",
        boxShadow: "inset 2px 2px 5px rgba(44,44,42,0.14), inset -2px -2px 5px rgba(255,255,255,0.8)",
      }}
    >
      <Icon size={15} color="#8C8977" />
      <input
        {...props}
        className="w-full bg-transparent text-sm outline-none placeholder:text-[#8C8977]"
        style={{ color: "#2C2C2A", fontFamily: "Inter" }}
      />
    </div>
  );
}

interface VehicleSetupStepProps {
  onNext?: (data: { make: string; model: string; color: string; plate: string; seats: number }) => void;
  onSkip?: () => void;
}

export default function VehicleSetupStep({ onNext, onSkip }: VehicleSetupStepProps) {
  useGoogleFont();
  const [make, setMake] = useState("Mercedes-Benz");
  const [model, setModel] = useState("E-Class");
  const [color, setColor] = useState("Black");
  const [plate, setPlate] = useState("231-D-18492");
  const [seats, setSeats] = useState(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) {
      onNext({ make, model, color, plate, seats });
    }
  };

  return (
    <div className="flex min-h-[500px] w-full items-center justify-center p-4 font-sans" style={{ backgroundColor: "#F7F7F5" }}>
      <EmbossStyles />

      <div className="w-full max-w-lg">
        <TiltCard className="rounded-2xl p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-[#EAF3DE] px-2.5 py-0.5 text-[11px] font-semibold text-[#27500A]">
                Step 4 of 5
              </span>
            </div>
            <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
              Vehicle Setup
            </h1>
            <p className="mt-1 text-xs text-[#5F5E5A]">
              Add your vehicle details so passengers recognize your car at pickup
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Make</label>
                <RecessedField
                  icon={Car}
                  type="text"
                  required
                  value={make}
                  onChange={(e: any) => setMake(e.target.value)}
                  placeholder="e.g. Toyota"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Model</label>
                <RecessedField
                  icon={Car}
                  type="text"
                  required
                  value={model}
                  onChange={(e: any) => setModel(e.target.value)}
                  placeholder="e.g. Camry"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Color</label>
                <RecessedField
                  icon={Palette}
                  type="text"
                  required
                  value={color}
                  onChange={(e: any) => setColor(e.target.value)}
                  placeholder="e.g. Black"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">License Plate</label>
                <RecessedField
                  icon={Hash}
                  type="text"
                  required
                  value={plate}
                  onChange={(e: any) => setPlate(e.target.value)}
                  placeholder="e.g. 231-D-12345"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">Passenger Seats</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[4, 6, 9].map((option) => {
                  const isActive = seats === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSeats(option)}
                      className="flex flex-col items-center gap-1 rounded-xl py-3 transition-all"
                      style={{
                        background: isActive ? "#185FA5" : "#F0EEE7",
                        color: isActive ? "#FFFFFF" : "#2C2C2A",
                        boxShadow: isActive
                          ? "inset 2px 2px 5px rgba(4,44,83,0.4), inset -2px -2px 4px rgba(133,183,235,0.3)"
                          : "3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85)",
                      }}
                    >
                      <Users size={16} color={isActive ? "#FFFFFF" : "#8C8977"} />
                      <span className="text-sm font-semibold">{option}</span>
                      <span className="text-[10px]" style={{ color: isActive ? "#DCEBFA" : "#8C8977" }}>
                        seats
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                className="emboss-btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
              >
                <span>Save Vehicle</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={onSkip}
                className="emboss-btn flex w-full items-center justify-center rounded-full py-2.5 text-xs font-semibold text-[#5F5E5A] hover:text-[#2C2C2A] cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          </form>
        </TiltCard>
      </div>
    </div>
  );
}

FILE_EOF_9

echo 'Writing src/index.css...'
cat > src/index.css << 'FILE_EOF_10'
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
@import "tailwindcss";

.emboss-btn {
  background: #F0EEE7;
  border: none;
  box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
  transition: box-shadow 0.12s ease, transform 0.08s ease;
}
.emboss-btn:active {
  box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
  transform: translateY(1px);
}
.emboss-btn-primary {
  background: #185FA5;
  border: none;
  box-shadow: 3px 3px 7px rgba(4,44,83,0.35), -2px -2px 5px rgba(133,183,235,0.55);
  transition: box-shadow 0.12s ease, transform 0.08s ease;
}
.emboss-btn-primary:active {
  box-shadow: inset 2px 2px 5px rgba(4,44,83,0.5), inset -2px -2px 4px rgba(133,183,235,0.35);
  transform: translateY(1px);
}
.emboss-toggle-on {
  background: #EAF3DE;
  border: none;
  box-shadow: 2px 2px 5px rgba(59,109,17,0.22), -2px -2px 5px rgba(255,255,255,0.8);
  transition: box-shadow 0.12s ease, transform 0.08s ease;
}
.emboss-toggle-off {
  background: #F0EEE7;
  border: none;
  box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
  transition: box-shadow 0.12s ease, transform 0.08s ease;
}
.emboss-input {
  background: #FFFFFF;
  border: 1px solid #E4E2DA;
  box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.emboss-input:focus {
  outline: none;
  border-color: #185FA5;
  box-shadow: inset 1px 1px 3px rgba(44,44,42,0.08), 0 0 0 2px rgba(24,95,165,0.15);
}

@keyframes animateRise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-entrance {
  animation: animateRise 300ms ease-out forwards;
}

FILE_EOF_10

echo 'Writing src/supabaseClient.ts...'
cat > src/supabaseClient.ts << 'FILE_EOF_11'
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

FILE_EOF_11

echo 'Writing src/useNewBookingNotifications.ts...'
cat > src/useNewBookingNotifications.ts << 'FILE_EOF_12'
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

export interface BookingNotification {
  id: string;
  passenger_name: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  estimated_fare: number;
}

/**
 * Subscribes to real-time booking INSERT events for one driver.
 * This is what makes "customer books → driver gets notified instantly"
 * actually work — no polling, no refresh needed.
 *
 * NOT LIVE-TESTED against a real websocket connection — this sandbox
 * has no network path to Supabase's realtime endpoint. The
 * subscription code follows Supabase's documented Realtime API
 * exactly; the first real test is two browser tabs open at once, one
 * as the driver, one booking as a passenger.
 *
 * @param driverId - the logged-in driver's own drivers.id (not their
 *   auth user_id — look this up once after login and pass it in)
 */
export function useNewBookingNotifications(driverId: string | null) {
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel(`new-bookings-${driverId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings", filter: `driver_id=eq.${driverId}` },
        (payload) => {
          const booking = payload.new as BookingNotification;
          setNotifications((prev) => [booking, ...prev]);
          audioRef.current?.play().catch(() => {
            // Browsers block autoplay until the user has interacted with
            // the page at least once — this fails silently the first
            // time, which is expected and fine.
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return { notifications, dismiss, audioRef };
}

FILE_EOF_12

echo 'Writing src/vite-env.d.ts...'
cat > src/vite-env.d.ts << 'FILE_EOF_13'
/// <reference types="vite/client" />

FILE_EOF_13

echo 'Writing package.json...'
cat > package.json << 'FILE_EOF_14'
{
  "name": "taxi-admin-dashboard",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.4",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "recharts": "^3.10.1",
    "vite": "^6.2.3"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}

FILE_EOF_14

echo 'Staging and committing...'
git add -A
git commit -m 'Fix React type imports, seat selector, CSS order; add real-time booking notifications'

echo 'Pushing to GitHub...'
git push origin main

echo 'Done.'