import { useState } from "react";
import { Car, Percent, CreditCard } from "lucide-react";
import VehicleInfoScreen from "./VehicleInfoScreen";
import FareRulesScreen from "./FareRulesScreen";
import StripeOnboardingScreen from "./StripeOnboardingScreen";

type SettingsTab = "vehicle" | "fare_rules" | "stripe";

const TABS: { id: SettingsTab; label: string; icon: typeof Car }[] = [
  { id: "vehicle", label: "Vehicle", icon: Car },
  { id: "fare_rules", label: "Fare Rules & Discounts", icon: Percent },
  { id: "stripe", label: "Stripe", icon: CreditCard },
];

export default function SettingsScreen({ driverId }: { driverId: string | null }) {
  const [tab, setTab] = useState<SettingsTab>("vehicle");

  return (
    <div className="w-full">
      <div className="mb-6 px-1">
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          Settings
        </h1>
        <p className="text-sm text-[#5F5E5A]">Vehicle details, fare rules & passenger discounts, and payment setup</p>
      </div>

      {/* Sub-tabs — a second-level nav within Settings, distinct from the
          main sidebar. Kept as pill tabs rather than another sidebar so
          it's visually clear this is a sub-section. */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#ECE9E0] px-1 pb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer transition-all ${
                isActive
                  ? "text-white"
                  : "bg-[#F0EEE7] text-[#5F5E5A] hover:text-[#2C2C2A]"
              }`}
              style={
                isActive
                  ? { background: "linear-gradient(135deg, #378ADD, #0C447C)", boxShadow: "2px 2px 8px rgba(4,44,83,0.35)" }
                  : undefined
              }
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "vehicle" && <VehicleInfoScreen driverId={driverId} />}
      {tab === "fare_rules" && <FareRulesScreen driverId={driverId} />}
      {tab === "stripe" && <StripeOnboardingScreen driverId={driverId} />}
    </div>
  );
}
