import type React from "react";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Check, ShieldCheck, HelpCircle } from "lucide-react";

export interface FareRule {
  id: string;
  name: string;
  base_rate: number;
  per_km_rate: number;
  per_minute_rate: number;
  minimum_fare: number;
  is_active: boolean;
}

const initialFareRules: FareRule[] = [
  {
    id: "fr_standard",
    name: "Standard Day Rate",
    base_rate: 4.20,
    per_km_rate: 1.65,
    per_minute_rate: 0.35,
    minimum_fare: 10.00,
    is_active: true,
  },
  {
    id: "fr_night",
    name: "Night & Weekend Rate",
    base_rate: 5.50,
    per_km_rate: 2.10,
    per_minute_rate: 0.45,
    minimum_fare: 14.00,
    is_active: false,
  },
  {
    id: "fr_airport",
    name: "Airport Premium Transfer",
    base_rate: 8.00,
    per_km_rate: 1.85,
    per_minute_rate: 0.40,
    minimum_fare: 25.00,
    is_active: false,
  },
];

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

export default function FareRulesScreen() {
  useGoogleFont();
  const [rules, setRules] = useState<FareRule[]>(initialFareRules);
  const [editingRule, setEditingRule] = useState<FareRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleRuleActive = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, is_active: !r.is_active };
        }
        // If single active rule policy is enforced
        return r;
      })
    );
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    if (rules.some((r) => r.id === editingRule.id)) {
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? editingRule : r)));
    } else {
      setRules((prev) => [...prev, editingRule]);
    }
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const openAddModal = () => {
    setEditingRule({
      id: `fr_${Date.now()}`,
      name: "Custom Rate Profile",
      base_rate: 4.50,
      per_km_rate: 1.70,
      per_minute_rate: 0.35,
      minimum_fare: 12.00,
      is_active: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rule: FareRule) => {
    setEditingRule({ ...rule });
    setIsModalOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-[600px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            Fare Rules Configuration
          </h1>
          <p className="text-sm text-[#5F5E5A]">Set distance, duration, and base tariffs for instant passenger quotes</p>
        </div>
        <button
          onClick={openAddModal}
          className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          <Plus size={14} /> Add fare rule
        </button>
      </div>

      {/* Info Card */}
      <div className="mb-6 rounded-xl border border-[#E4E2DA] bg-[#F1EFE8] p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 text-[#185FA5] shrink-0" />
        <div className="text-xs text-[#5F5E5A] leading-relaxed">
          <strong>Direct Quote Engine:</strong> Your passenger booking PWA queries these active rates directly to generate real-time upfront fare estimates before checkout. Only one rule is marked default active at a time.
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-xl border bg-white p-5 transition-all ${
              rule.is_active ? "border-[#639922] shadow-sm" : "border-[#E4E2DA]"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                  {rule.name}
                </span>
              </div>
              <button
                onClick={() => toggleRuleActive(rule.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all ${
                  rule.is_active ? "emboss-toggle-on text-[#27500A]" : "emboss-toggle-off text-[#5F5E5A]"
                }`}
              >
                {rule.is_active ? "Active Rule" : "Inactive"}
              </button>
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

      {/* Edit / Add Modal */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E4E2DA] bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
              {rules.some((r) => r.id === editingRule.id) ? "Edit Fare Rule" : "Create Fare Rule"}
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

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active_check"
                  checked={editingRule.is_active}
                  onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                  className="rounded border-[#E4E2DA]"
                />
                <label htmlFor="active_check" className="font-medium text-[#2C2C2A] cursor-pointer">
                  Set as default active tariff rule
                </label>
              </div>

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
                  className="emboss-btn-primary rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Save Fare Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

