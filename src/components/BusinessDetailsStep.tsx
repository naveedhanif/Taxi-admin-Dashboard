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

