import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, AlertCircle, Percent, ExternalLink, Save, Check } from "lucide-react";
import { supabase } from "../supabaseClient";

export interface FareRule {
  id: string;
  name: string;
  tariff_period: string;
  base_rate: number;
  per_km_rate: number;
  per_minute_rate: number;
  minimum_fare: number;
  tariff_a_cap: number | null;
  tariff_b_per_km_rate: number | null;
  tariff_b_per_minute_rate: number | null;
  discount_percent: number;
  is_active: boolean;
}

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
      .emboss-toggle-off {
        background: #F0EEE7;
        border: none;
        box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85);
        transition: box-shadow 0.12s ease, transform 0.08s ease;
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
    `}</style>
  );
}

export default function FareRulesScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [rules, setRules] = useState<FareRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Local edit buffer keyed by rule id, so typing doesn't save on every
  // keystroke — only on blur / explicit save.
  const [discountDrafts, setDiscountDrafts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    loadRules();
  }, [driverId]);

  async function loadRules() {
    setLoading(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("fare_rules")
      .select("id, name, tariff_period, base_rate, per_km_rate, per_minute_rate, minimum_fare, tariff_a_cap, tariff_b_per_km_rate, tariff_b_per_minute_rate, discount_percent, is_active")
      .eq("driver_id", driverId)
      .order("tariff_period", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    // Self-heal: a driver with genuinely zero rows almost certainly
    // went through onboarding before this was fixed — the old
    // onboarding step never actually saved anything. Rather than
    // leaving them stuck on "contact support" forever, seed the real
    // NTA rates automatically the moment they land on this screen,
    // then reload. Idempotent on the server side, so this is safe even
    // if it somehow runs more than once.
    if ((data ?? []).length === 0) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/seed-fare-rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, apikey: anonKey },
            body: JSON.stringify({ driver_id: driverId }),
          });
          if (res.ok) {
            const { data: reloaded, error: reloadError } = await supabase
              .from("fare_rules")
              .select("id, name, tariff_period, base_rate, per_km_rate, per_minute_rate, minimum_fare, tariff_a_cap, tariff_b_per_km_rate, tariff_b_per_minute_rate, discount_percent, is_active")
              .eq("driver_id", driverId)
              .order("tariff_period", { ascending: true });
            if (!reloadError) {
              const loaded = (reloaded ?? []) as FareRule[];
              setRules(loaded);
              setDiscountDrafts(Object.fromEntries(loaded.map((r) => [r.id, r.discount_percent])));
              setLoading(false);
              return;
            }
          }
        } catch {
          // Falls through to showing the empty state below — a genuine
          // "contact support" case only if the auto-fix itself fails.
        }
      }
    }

    const loaded = (data ?? []) as FareRule[];
    setRules(loaded);
    setDiscountDrafts(Object.fromEntries(loaded.map((r) => [r.id, r.discount_percent])));
    setLoading(false);
  }

  const saveDiscount = async (rule: FareRule) => {
    const newValue = Math.min(100, Math.max(0, discountDrafts[rule.id] ?? rule.discount_percent));
    if (newValue === rule.discount_percent) return;

    setSavingId(rule.id);
    setErrorMessage("");
    const { error } = await supabase
      .from("fare_rules")
      .update({ discount_percent: newValue })
      .eq("id", rule.id);
    setSavingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, discount_percent: newValue } : r)));
    setSavedId(rule.id);
    setTimeout(() => setSavedId(null), 2000);
  };

  return (
    <div className="min-h-[600px] w-full p-4 sm:p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          Fare Rules & Discounts
        </h1>
        <p className="text-sm text-[#5F5E5A]">Set an optional passenger discount for each official tariff</p>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      {/* Info Card */}
      <div className="mb-6 rounded-xl border border-[#E4E2DA] bg-[#F1EFE8] p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 text-[#185FA5] shrink-0" />
        <div className="text-xs text-[#5F5E5A] leading-relaxed">
          <strong>Fixed at the National Maximum Taxi Fare.</strong> Rates for all three tariffs are set by the National Transport Authority and can't be edited here — see{" "}
          <a
            href="https://www.transportforireland.ie/fares/taxi-fares/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-[#185FA5] underline"
          >
            the official NTA taxi fares page <ExternalLink size={10} />
          </a>
          . You can set a passenger discount per tariff below — it's shown as a line item on the passenger's fare estimate.
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5F5E5A]">
          <Loader2 size={16} className="animate-spin" /> Loading fare rules…
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-[#E4E2DA] bg-white py-16 text-center text-sm text-[#5F5E5A]">
          No fare rules set up for this account yet — contact support to get the standard NTA tariffs added.
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule) => {
          const draft = discountDrafts[rule.id] ?? rule.discount_percent;
          const isDirty = draft !== rule.discount_percent;
          return (
            <div
              key={rule.id}
              className="rounded-xl border border-[#E4E2DA] bg-white p-5"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                  {rule.name}
                </span>
                <span
                  className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full"
                  style={{ background: rule.is_active ? "#EAF3DE" : "#F1EFE8", color: rule.is_active ? "#27500A" : "#5F5E5A" }}
                >
                  {rule.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[#8C8977]">
                {rule.tariff_period} tariff
              </div>

              <div className="space-y-2 text-xs text-[#5F5E5A] border-t border-[#E4E2DA] pt-3 mb-4">
                <div className="flex justify-between items-center">
                  <span>Initial charge</span>
                  <span className="font-semibold text-[#2C2C2A]">€{rule.base_rate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tariff A — per km / per min</span>
                  <span className="font-semibold text-[#2C2C2A]">€{rule.per_km_rate.toFixed(2)} / €{rule.per_minute_rate.toFixed(2)}</span>
                </div>
                {rule.tariff_a_cap != null && rule.tariff_a_cap > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Tariff A cap</span>
                    <span className="font-medium text-[#2C2C2A]">€{rule.tariff_a_cap.toFixed(2)}</span>
                  </div>
                )}
                {rule.tariff_b_per_km_rate != null && (
                  <div className="flex justify-between items-center pt-1 border-t border-dashed border-[#E4E2DA]">
                    <span>Tariff B — per km / per min</span>
                    <span className="font-semibold text-[#2C2C2A]">€{rule.tariff_b_per_km_rate.toFixed(2)} / €{(rule.tariff_b_per_minute_rate ?? 0).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#E4E2DA] pt-3">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#2C2C2A]">
                  <Percent size={12} className="text-[#27500A]" /> Passenger discount
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draft}
                      onChange={(e) =>
                        setDiscountDrafts((prev) => ({
                          ...prev,
                          [rule.id]: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                        }))
                      }
                      onBlur={() => isDirty && saveDiscount(rule)}
                      className="emboss-input w-full rounded-lg px-3 py-2 pr-7 text-xs font-semibold text-[#2C2C2A]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#8C8977]">%</span>
                  </div>
                  <button
                    onClick={() => saveDiscount(rule)}
                    disabled={!isDirty || savingId === rule.id}
                    className="emboss-btn-primary flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-white disabled:opacity-40"
                  >
                    {savingId === rule.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : savedId === rule.id ? (
                      <Check size={13} />
                    ) : (
                      <Save size={13} />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-[#8C8977]">
                  Applied to every trip under this tariff, shown as a line item to the passenger.
                </p>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

