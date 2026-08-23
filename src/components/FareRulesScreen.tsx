import type React from "react";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ShieldCheck, Loader2, AlertCircle, Percent } from "lucide-react";
import { supabase } from "../supabaseClient";

export interface FareRule {
  id: string;
  name: string;
  tariff_period: string;
  base_rate: number;
  per_km_rate: number;
  per_minute_rate: number;
  minimum_fare: number;
  discount_percent: number;
  is_active: boolean;
}

const TARIFF_PERIODS = ["standard", "premium", "special"];

function emptyRule(): FareRule {
  return {
    id: "",
    name: "New Rate Profile",
    tariff_period: "standard",
    base_rate: 4.5,
    per_km_rate: 1.7,
    per_minute_rate: 0.35,
    minimum_fare: 12.0,
    discount_percent: 0,
    is_active: true,
  };
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
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingRule, setEditingRule] = useState<FareRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      .select("id, name, tariff_period, base_rate, per_km_rate, per_minute_rate, minimum_fare, discount_percent, is_active")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setRules((data ?? []) as FareRule[]);
    }
    setLoading(false);
  }

  const toggleRuleActive = async (rule: FareRule) => {
    const { error } = await supabase
      .from("fare_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !driverId) return;
    setSaving(true);
    setErrorMessage("");

    const { id, ...fields } = editingRule;
    const isNew = !id;

    const { data, error } = isNew
      ? await supabase.from("fare_rules").insert({ ...fields, driver_id: driverId }).select().single()
      : await supabase.from("fare_rules").update(fields).eq("id", id).select().single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (isNew) {
      setRules((prev) => [...prev, data as FareRule]);
    } else {
      setRules((prev) => prev.map((r) => (r.id === id ? (data as FareRule) : r)));
    }
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const openAddModal = () => {
    setEditingRule(emptyRule());
    setIsModalOpen(true);
  };

  const openEditModal = (rule: FareRule) => {
    setEditingRule({ ...rule });
    setIsModalOpen(true);
  };

  const handleDeleteRule = async (id: string) => {
    const { error } = await supabase.from("fare_rules").delete().eq("id", id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-[600px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            Fare Rules & Discounts
          </h1>
          <p className="text-sm text-[#5F5E5A]">Set tariffs per time period, and an optional passenger discount for each</p>
        </div>
        <button
          onClick={openAddModal}
          disabled={!driverId}
          className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
        >
          <Plus size={14} /> Add fare rule
        </button>
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
          <strong>Direct Quote Engine:</strong> Your passenger booking PWA queries these active rates directly to generate real-time upfront fare estimates before checkout. The tariff period (standard/premium/special) is matched automatically based on trip time; any discount you set is shown as a line item on the passenger's fare estimate.
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5F5E5A]">
          <Loader2 size={16} className="animate-spin" /> Loading fare rules…
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-[#E4E2DA] bg-white py-16 text-center text-sm text-[#5F5E5A]">
          No fare rules yet — add one to start giving passengers real estimates.
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-xl border bg-white p-5 transition-all ${
              rule.is_active ? "border-[#639922] shadow-sm" : "border-[#E4E2DA]"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                  {rule.name}
                </span>
              </div>
              <button
                onClick={() => toggleRuleActive(rule)}
                className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all ${
                  rule.is_active ? "emboss-toggle-on text-[#27500A]" : "emboss-toggle-off text-[#5F5E5A]"
                }`}
              >
                {rule.is_active ? "Active" : "Inactive"}
              </button>
            </div>
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[#8C8977]">
              {rule.tariff_period} tariff
            </div>

            <div className="space-y-2.5 text-xs text-[#5F5E5A] border-t border-[#E4E2DA] pt-3 mb-4">
              <div className="flex justify-between items-center">
                <span>Base pickup fare</span>
                <span className="font-semibold text-[#2C2C2A]">€{rule.base_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Rate per km</span>
                <span className="font-semibold text-[#2C2C2A]">€{rule.per_km_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Rate per minute</span>
                <span className="font-semibold text-[#2C2C2A]">€{rule.per_minute_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-dashed border-[#E4E2DA]">
                <span className="font-medium text-[#2C2C2A]">Minimum trip fare</span>
                <span className="font-bold text-[#185FA5]">€{rule.minimum_fare.toFixed(2)}</span>
              </div>
              {rule.discount_percent > 0 && (
                <div className="flex justify-between items-center rounded-lg bg-[#EAF3DE] px-2.5 py-1.5 -mx-1">
                  <span className="flex items-center gap-1 font-medium text-[#27500A]">
                    <Percent size={11} /> Passenger discount
                  </span>
                  <span className="font-bold text-[#27500A]">{rule.discount_percent}%</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#E4E2DA]">
              <button
                onClick={() => openEditModal(rule)}
                className="emboss-btn flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-[#2C2C2A] cursor-pointer"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="emboss-btn flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#991B1B] hover:bg-red-50 cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Edit / Add Modal */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E4E2DA] bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
              {editingRule.id ? "Edit Fare Rule" : "Create Fare Rule"}
            </h3>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Rule Profile Name</label>
                <input
                  type="text"
                  required
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Tariff Period</label>
                <select
                  value={editingRule.tariff_period}
                  onChange={(e) => setEditingRule({ ...editingRule, tariff_period: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs font-medium text-[#2C2C2A]"
                >
                  {TARIFF_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[#2C2C2A]">Base Fare (€)</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={editingRule.base_rate}
                    onChange={(e) => setEditingRule({ ...editingRule, base_rate: parseFloat(e.target.value) || 0 })}
                    className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#2C2C2A]">Minimum Fare (€)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={editingRule.minimum_fare}
                    onChange={(e) => setEditingRule({ ...editingRule, minimum_fare: parseFloat(e.target.value) || 0 })}
                    className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[#2C2C2A]">Per Kilometer Rate (€)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={editingRule.per_km_rate}
                    onChange={(e) => setEditingRule({ ...editingRule, per_km_rate: parseFloat(e.target.value) || 0 })}
                    className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#2C2C2A]">Per Minute Rate (€)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={editingRule.per_minute_rate}
                    onChange={(e) => setEditingRule({ ...editingRule, per_minute_rate: parseFloat(e.target.value) || 0 })}
                    className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 font-medium text-[#2C2C2A]">
                  <Percent size={12} className="text-[#27500A]" /> Passenger Discount (%)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={editingRule.discount_percent}
                  onChange={(e) => setEditingRule({ ...editingRule, discount_percent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                />
                <p className="mt-1 text-[10px] text-[#8C8977]">
                  Applied to every trip under this tariff, shown as a line item to the passenger on their fare estimate. Leave at 0 for no discount.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active_check"
                  checked={editingRule.is_active}
                  onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                  className="rounded border-[#E4E2DA]"
                />
                <label htmlFor="active_check" className="font-medium text-[#2C2C2A] cursor-pointer">
                  Active (visible to passengers)
                </label>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
                  <AlertCircle size={14} /> {errorMessage}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2 border-t border-[#E4E2DA] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="emboss-btn rounded-lg px-4 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {saving ? "Saving…" : "Save Fare Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

