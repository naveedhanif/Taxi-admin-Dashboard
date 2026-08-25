import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, CheckCircle2, ShieldCheck, ArrowRight, Building, Clock, RefreshCw, AlertCircle, DollarSign } from "lucide-react";
import { supabase } from "../supabaseClient";

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
    `}</style>
  );
}

export default function StripeOnboardingScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("drivers")
        .select("stripe_connect_account_id, stripe_connect_onboarded")
        .eq("id", driverId)
        .single();
      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
      } else {
        setIsConnected(Boolean(data?.stripe_connect_onboarded));
        setAccountId(data?.stripe_connect_account_id ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  // If we land back on this screen after Stripe's hosted onboarding
  // (return_url points here with ?stripe_return=1), check the real
  // account status and sync it to the database.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_return") !== "1") return;

    (async () => {
      setCheckingStatus(true);
      setErrorMessage("");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Not signed in");

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't check Stripe status");
        setIsConnected(Boolean(data.onboarded));
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Couldn't check Stripe status");
      } finally {
        setCheckingStatus(false);
        // Clean the query param so a refresh doesn't re-trigger this
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();
  }, []);

  const handleLaunchStripe = async () => {
    setIsConnecting(true);
    setErrorMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("stripe_return", "1");
      const refreshUrl = new URL(window.location.href);

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ return_url: returnUrl.toString(), refresh_url: refreshUrl.toString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start Stripe onboarding");

      window.location.href = data.url;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't start Stripe onboarding");
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-[600px] w-full p-4 sm:p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            Stripe Connect Payments
          </h1>
          <p className="text-sm text-[#5F5E5A]">Direct payout channel setup for passenger credit card pre-payments</p>
        </div>
        {isConnected ? (
          <span className="rounded-full bg-[#EAF3DE] px-3.5 py-1 text-xs font-semibold text-[#27500A] flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Stripe Connected
          </span>
        ) : (
          <span className="rounded-full bg-[#FAEEDA] px-3.5 py-1 text-xs font-semibold text-[#633806] flex items-center gap-1.5">
            <Clock size={14} /> Setup Required
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Onboarding Card */}
        <div className="col-span-2 rounded-xl border border-[#E4E2DA] bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3 border-b border-[#E4E2DA] pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1EFE8]">
                <CreditCard size={24} color="#185FA5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                  Direct Bank Account Payouts
                </h2>
                <p className="text-xs text-[#5F5E5A]">
                  Powered by Stripe Express custom destination charges
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-[#5F5E5A] leading-relaxed">
              <p>
                When passengers book trips via your custom QR code or landing page, funds are processed securely through Stripe and transferred directly to your bank account.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                <div className="rounded-lg border border-[#E4E2DA] bg-[#F1EFE8] p-3">
                  <div className="mb-1 font-semibold text-[#2C2C2A] flex items-center gap-1.5">
                    <DollarSign size={14} className="text-[#639922]" /> 100% Direct Driver Fare
                  </div>
                  <div className="text-[11px]">
                    Pass-through destination charges send fare revenue straight to your bank account with automatic platform usage fees deducted.
                  </div>
                </div>

                <div className="rounded-lg border border-[#E4E2DA] bg-[#F1EFE8] p-3">
                  <div className="mb-1 font-semibold text-[#2C2C2A] flex items-center gap-1.5">
                    <Building size={14} className="text-[#185FA5]" /> Rolling Daily Payouts
                  </div>
                  <div className="text-[11px]">
                    Automatic daily or weekly bank transfers according to your Stripe payout schedule preference.
                  </div>
                </div>
              </div>

              {isConnected && (
                <div className="mt-4 rounded-xl border border-[#E4E2DA] bg-[#F1EFE8] p-4">
                  <div className="mb-2 text-xs font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                    Active Stripe Express Account
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Account ID</span>
                      <span className="font-mono text-[#2C2C2A]">{accountId ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status</span>
                      <span className="font-medium text-[#27500A]">Charges & payouts enabled</span>
                    </div>
                  </div>
                </div>
              )}
              {errorMessage && (
                <div className="mt-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
                  <AlertCircle size={14} /> {errorMessage}
                </div>
              )}
              {checkingStatus && (
                <div className="mt-4 flex items-center gap-2 rounded-lg p-3 text-xs text-[#5F5E5A]" style={{ background: "#F1EFE8" }}>
                  <RefreshCw size={14} className="animate-spin" /> Checking your Stripe status…
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-[#E4E2DA] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#5F5E5A]">
              <ShieldCheck size={16} className="text-[#639922]" />
              <span>PCI-DSS Level 1 Compliant Security</span>
            </div>

            <button
              onClick={handleLaunchStripe}
              disabled={isConnecting || loading || !driverId}
              className="emboss-btn-primary flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold text-white cursor-pointer w-full sm:w-auto disabled:opacity-60"
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Redirecting to Stripe...</span>
                </>
              ) : isConnected ? (
                <>
                  <span>Update Stripe Details</span>
                  <ExternalLink size={14} />
                </>
              ) : (
                <>
                  <span>Connect Stripe Account</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="rounded-xl border border-[#E4E2DA] bg-white p-5 flex flex-col justify-between">
          <div>
            <h3 className="mb-3 text-sm font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
              Payouts
            </h3>

            {isConnected ? (
              <div className="rounded-lg border border-[#E4E2DA] bg-[#F1EFE8] p-4 text-xs text-[#5F5E5A] leading-relaxed">
                Payout balances and schedule are managed directly in your Stripe Express dashboard. Live balance data isn't wired into this dashboard yet — click "Update Stripe Details" to reach your Stripe account.
              </div>
            ) : (
              <div className="rounded-lg border border-[#E4E2DA] bg-[#F1EFE8] p-4 text-xs text-[#5F5E5A] leading-relaxed">
                Connect your Stripe account to start accepting passenger payments and receiving payouts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
