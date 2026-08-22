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

