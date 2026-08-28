import { useState } from "react";
import { Car, Percent, CreditCard, ShieldCheck, Building2 } from "lucide-react";
import VehicleInfoScreen from "./VehicleInfoScreen";
import FareRulesScreen from "./FareRulesScreen";
import StripeOnboardingScreen from "./StripeOnboardingScreen";
import LicenceScreen from "./LicenceScreen";
import BusinessProfileScreen from "./BusinessProfileScreen";

type SettingsTab = "profile" | "vehicle" | "fare_rules" | "stripe" | "licence";

const TABS: { id: SettingsTab; label: string; icon: typeof Car }[] = [
  { id: "profile", label: "Business Profile", icon: Building2 },
  { id: "vehicle", label: "Vehicle", icon: Car },
  { id: "fare_rules", label: "Fare Rules & Discounts", icon: Percent },
  { id: "stripe", label: "Stripe", icon: CreditCard },
  { id: "licence", label: "SPSV Licence", icon: ShieldCheck },
];

export default function SettingsScreen({ driverId }: { driverId: string | null }) {
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <div className="w-full">
      <div className="mb-6 px-1">
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          Settings
        </h1>
        <p className="text-sm text-[#5F5E5A]">Vehicle details, fare rules & passenger discounts, and payment setup</p>
      </div>

      {/* Sub-tabs — a second-level nav within Settings, distinct from the
          main sidebar. A single scrollable row of tabs rather than a
          multi-row button grid — more compact (one row regardless of
          screen width) and reads as connected tabs rather than a set
          of disconnected buttons, matching the same chip style used
          for the booking date filter for a consistent feel. */}
      <div className="mb-6 flex gap-2 overflow-x-auto px-1 pb-2" style={{ scrollbarWidth: "thin" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`emboss-btn flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold cursor-pointer ${
                isActive ? "emboss-selected text-white" : "text-[#5F5E5A]"
              }`}
              style={
                isActive
                  ? { background: "linear-gradient(135deg, #378ADD, #0C447C)", boxShadow: "inset 2px 2px 5px rgba(4,44,83,0.5), inset -1px -1px 3px rgba(133,183,235,0.3)" }
                  : undefined
              }
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && <BusinessProfileScreen driverId={driverId} />}
      {tab === "vehicle" && <VehicleInfoScreen driverId={driverId} />}
      {tab === "fare_rules" && <FareRulesScreen driverId={driverId} />}
      {tab === "stripe" && <StripeOnboardingScreen driverId={driverId} />}
      {tab === "licence" && <LicenceScreen driverId={driverId} />}
    </div>
  );
}
