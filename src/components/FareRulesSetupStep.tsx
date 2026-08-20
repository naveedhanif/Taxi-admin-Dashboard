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
