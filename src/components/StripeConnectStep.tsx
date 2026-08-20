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
