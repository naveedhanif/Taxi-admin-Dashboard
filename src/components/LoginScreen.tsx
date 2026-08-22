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

