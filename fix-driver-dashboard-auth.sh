#!/bin/bash
set -e

echo 'Wiring real Supabase Auth into the driver dashboard...'
echo 'IMPORTANT: only run this AFTER fix-driver-dashboard-all.sh'
echo '(this assumes that ones fixes are already applied).'

echo 'Writing src/driverAuth.ts...'
cat > src/driverAuth.ts << 'FILE_EOF_0'
import { supabase } from "./supabaseClient";

/**
 * Real Supabase Auth + drivers-table wiring for the driver dashboard.
 *
 * NOT LIVE-TESTED against a real Supabase Auth call — this sandbox has
 * no network path to Supabase's auth endpoint. This follows Supabase's
 * documented Auth API exactly; the first real test is an actual signup
 * attempt in a running browser.
 */

export interface SignUpParams {
  email: string;
  password: string;
  businessName: string;
  phone: string;
  bookingSlug: string;
}

export interface AuthResult {
  driverId: string | null;
  error: string | null;
}

/**
 * Creates a new driver account: an auth.users row via Supabase Auth,
 * then a matching drivers row. If the drivers insert fails after the
 * auth user was created, the auth user is left dangling — this is the
 * exact kind of atomicity gap flagged earlier; a production version
 * should do this inside a single Postgres function (RPC) instead of
 * two separate client calls, so it's genuinely all-or-nothing.
 */
export async function signUpDriver({ email, password, businessName, phone, bookingSlug }: SignUpParams): Promise<AuthResult> {
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

  if (authError) {
    return { driverId: null, error: authError.message };
  }
  if (!authData.user) {
    return { driverId: null, error: "Sign up succeeded but no user was returned — check your email to confirm your account." };
  }

  const { data: driverRow, error: driverError } = await supabase
    .from("drivers")
    .insert({
      user_id: authData.user.id,
      business_name: businessName,
      phone,
      email,
      booking_slug: bookingSlug,
    })
    .select("id")
    .single();

  if (driverError) {
    // Common real-world case: booking_slug already taken by another driver
    if (driverError.code === "23505") {
      return { driverId: null, error: "That booking link is already taken — try a different business name." };
    }
    return { driverId: null, error: driverError.message };
  }

  return { driverId: driverRow.id, error: null };
}

export async function signInDriver(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { driverId: null, error: error.message };
  }

  return getDriverForUser(data.user.id);
}

export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error: error?.message ?? null };
}

/** Looks up the drivers row belonging to an already-authenticated user. */
export async function getDriverForUser(userId: string): Promise<AuthResult> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (error) {
    return { driverId: null, error: "No driver profile found for this account — onboarding may be incomplete." };
  }

  return { driverId: data.id, error: null };
}

export async function signOutDriver() {
  await supabase.auth.signOut();
}

FILE_EOF_0

echo 'Writing src/components/BusinessDetailsStep.tsx...'
cat > src/components/BusinessDetailsStep.tsx << 'FILE_EOF_1'
import type React from "react";
import { useState, useEffect } from "react";
import { Building2, Phone, Globe, ArrowRight, CheckCircle2, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { signUpDriver } from "../driverAuth";

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
  onNext?: (data: { businessName: string; phone: string; slug: string; driverId: string }) => void;
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "your-taxi";
  };

  const slug = generateSlug(businessName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    const result = await signUpDriver({ email, password, businessName, phone, bookingSlug: slug });

    setSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    if (onNext && result.driverId) {
      onNext({ businessName, phone, slug, driverId: result.driverId });
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

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">
                Login Email
              </label>
              <RecessedField
                icon={Mail}
                type="email"
                required
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#2C2C2A]">
                Password
              </label>
              <RecessedField
                icon={Lock}
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
                <AlertCircle size={14} /> {errorMessage}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="emboss-btn-primary flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-semibold uppercase tracking-wider text-white cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Stripe Setup</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </TiltCard>
      </div>
    </div>
  );
}

FILE_EOF_1

echo 'Writing src/components/LoginScreen.tsx...'
cat > src/components/LoginScreen.tsx << 'FILE_EOF_2'
import type React from "react";
import { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight, CheckCircle2, Car, KeyRound, AlertCircle } from "lucide-react";
import { signInDriver, signInWithMagicLink } from "../driverAuth";

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

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess?: (driverId: string) => void }) {
  useGoogleFont();
  const [authMode, setAuthMode] = useState<"password" | "magic_link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    if (authMode === "magic_link") {
      const { error } = await signInWithMagicLink(email);
      setIsLoading(false);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setIsSuccess(true);
      return;
    }

    const result = await signInDriver(email, password);
    setIsLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setIsSuccess(true);
    if (onLoginSuccess && result.driverId) {
      onLoginSuccess(result.driverId);
    }
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

                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
                    <AlertCircle size={14} /> {errorMessage}
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

FILE_EOF_2

echo 'Writing src/App.tsx...'
cat > src/App.tsx << 'FILE_EOF_3'
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

import { LayoutDashboard, Compass, LogIn, Calendar, Settings2, Car, CreditCard } from "lucide-react";

export default function App() {
  const [viewMode, setViewMode] = useState<"onboarding" | "dashboard">("onboarding");
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [dashboardScreen, setDashboardScreen] = useState<"overview" | "login" | "bookings" | "fare_rules" | "vehicle" | "stripe">("overview");

  // Real session tracking. onAuthStateChange fires immediately with the
  // current session on load, then again on every sign-in/sign-out — this
  // is the one source of truth for "who's logged in right now."
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const result = await getDriverForUser(session.user.id);
        setDriverId(result.driverId);
      } else {
        setDriverId(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

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
            {dashboardScreen === "login" && (
              <LoginScreen
                onLoginSuccess={() => setDashboardScreen("overview")}
              />
            )}
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

FILE_EOF_3

echo 'Staging and committing...'
git add -A
git commit -m 'Wire real Supabase Auth: driver signup, login, session tracking'

echo 'Pushing to GitHub...'
git push origin main

echo 'Done.'