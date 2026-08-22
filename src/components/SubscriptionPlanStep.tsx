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

