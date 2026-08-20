import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, CheckCircle2, ShieldCheck, ArrowRight, Building, DollarSign, Clock, RefreshCw } from "lucide-react";

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

export default function StripeOnboardingScreen() {
  useGoogleFont();
  const [isConnected, setIsConnected] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleLaunchStripe = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 1200);
  };

  return (
    <div className="min-h-[600px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
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
                      <span className="font-mono text-[#2C2C2A]">acct_1N9x82KkL902pX</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connected Bank</span>
                      <span className="font-medium text-[#2C2C2A]">Bank of Ireland (•••4821)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payout Currency</span>
                      <span className="font-semibold text-[#2C2C2A]">EUR (€)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payout Schedule</span>
                      <span className="font-medium text-[#27500A]">Daily Rolling</span>
                    </div>
                  </div>
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
              disabled={isConnecting}
              className="emboss-btn-primary flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold text-white cursor-pointer w-full sm:w-auto"
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Redirecting to Stripe...</span>
                </>
              ) : isConnected ? (
                <>
                  <span>Manage Stripe Express Dashboard</span>
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
              Payout Summary
            </h3>

            <div className="space-y-4">
              <div className="rounded-lg border border-[#E4E2DA] p-3">
                <div className="text-xs text-[#5F5E5A]">Available for Payout</div>
                <div className="text-2xl font-bold text-[#2C2C2A] mt-1" style={{ fontFamily: "'Space Grotesk'" }}>
                  €248.50
                </div>
                <div className="text-[11px] text-[#3B6D11] mt-0.5">Scheduled for transfer tomorrow at 08:00</div>
              </div>

              <div className="rounded-lg border border-[#E4E2DA] p-3">
                <div className="text-xs text-[#5F5E5A]">In Transit / Pending</div>
                <div className="text-xl font-bold text-[#2C2C2A] mt-1" style={{ fontFamily: "'Space Grotesk'" }}>
                  €82.00
                </div>
                <div className="text-[11px] text-[#5F5E5A] mt-0.5">2 pre-booked trips pending completion</div>
              </div>

              <div className="rounded-lg border border-[#E4E2DA] p-3">
                <div className="text-xs text-[#5F5E5A]">Monthly Platform Fee</div>
                <div className="text-sm font-semibold text-[#2C2C2A] mt-1">
                  Flat €39.00 / month
                </div>
                <div className="text-[11px] text-[#5F5E5A] mt-0.5">0% commission on passenger fares</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E4E2DA]">
            <button
              onClick={() => setIsConnected(!isConnected)}
              className="emboss-btn w-full rounded-lg py-2 text-xs font-medium text-[#5F5E5A] cursor-pointer"
            >
              Toggle Demo Status ({isConnected ? "Connected" : "Disconnected"})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
