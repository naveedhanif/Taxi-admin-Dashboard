import type React from "react";
import { useState, useEffect } from "react";
import { Car, ShieldCheck, Check, Save, Users, Hash, Palette, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

// Mirrors the actual `vehicles` table columns in Supabase — that table
// does not have year/vehicle_type/fuel_type/insurance_expiry/
// inspection_status, so those mockup-only fields were removed rather
// than left silently un-saved.
export interface VehicleData {
  make: string;
  model: string;
  color: string;
  plate: string;
  seats: number;
}

const emptyVehicle: VehicleData = {
  make: "",
  model: "",
  color: "",
  plate: "",
  seats: 4,
};

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

export default function VehicleInfoScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [vehicle, setVehicle] = useState<VehicleData>(emptyVehicle);
  const [originalVehicle, setOriginalVehicle] = useState<VehicleData>(emptyVehicle);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMessage("");
      const { data, error } = await supabase
        .from("vehicles")
        .select("make, model, color, plate, seats")
        .eq("driver_id", driverId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
      } else if (data) {
        setVehicle(data as VehicleData);
        setOriginalVehicle(data as VehicleData);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) {
      setErrorMessage("No driver is signed in — can't save vehicle details.");
      return;
    }
    setSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("vehicles")
      .upsert(
        { driver_id: driverId, ...vehicle, is_active: true },
        { onConflict: "driver_id" }
      );

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setOriginalVehicle(vehicle);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-[600px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Top Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            Vehicle Information
          </h1>
          <p className="text-sm text-[#5F5E5A]">Manage your active taxi specs displayed to passengers during booking</p>
        </div>
        <span className="rounded-full bg-[#EAF3DE] px-3 py-1 text-xs font-semibold text-[#27500A] flex items-center gap-1.5">
          <ShieldCheck size={14} /> License Verified
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Card: Live Vehicle Preview */}
        <div className="rounded-xl border border-[#E4E2DA] bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-[#E4E2DA] pb-3">
              <span className="text-xs font-semibold text-[#5F5E5A] uppercase tracking-wider">Public Profile Card</span>
            </div>

            <div className="mb-6 flex h-36 items-center justify-center rounded-xl bg-[#F1EFE8] border border-[#E4E2DA]">
              <div className="text-center">
                <Car size={48} color="#185FA5" className="mx-auto mb-2" />
                <div className="font-mono text-sm font-bold text-[#2C2C2A] bg-white px-3 py-1 rounded border border-[#E4E2DA] shadow-xs inline-block">
                  {vehicle.plate}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[#5F5E5A]">
              <div className="flex justify-between items-center">
                <span>Vehicle Model</span>
                <span className="font-semibold text-[#2C2C2A]">{vehicle.make} {vehicle.model}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Color</span>
                <span className="font-medium text-[#2C2C2A] flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2C2C2A] border border-[#E4E2DA]" />
                  {vehicle.color}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Max Passengers</span>
                <span className="font-semibold text-[#2C2C2A] flex items-center gap-1">
                  <Users size={12} className="text-[#185FA5]" /> {vehicle.seats} Seats
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form: Editable Spec Details */}
        <div className="col-span-2 rounded-xl border border-[#E4E2DA] bg-white p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#E4E2DA] pb-3">
            <h2 className="text-sm font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
              Edit Vehicle Specification
            </h2>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-medium text-[#27500A] bg-[#EAF3DE] px-2.5 py-1 rounded-full">
                <Check size={13} /> Updated successfully
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 justify-center text-xs text-[#5F5E5A]">
              <Loader2 size={14} className="animate-spin" /> Loading vehicle details…
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Vehicle Make</label>
                <input
                  type="text"
                  required
                  value={vehicle.make}
                  onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Vehicle Model</label>
                <input
                  type="text"
                  required
                  value={vehicle.model}
                  onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Registration Plate</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={vehicle.plate}
                    onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                    className="emboss-input w-full rounded-lg px-3 py-2 pl-8 text-xs font-mono font-bold text-[#2C2C2A]"
                  />
                  <Hash size={13} className="absolute left-2.5 top-2.5 text-[#B4B2A9]" />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Color</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={vehicle.color}
                    onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                    className="emboss-input w-full rounded-lg px-3 py-2 pl-8 text-xs text-[#2C2C2A]"
                  />
                  <Palette size={13} className="absolute left-2.5 top-2.5 text-[#B4B2A9]" />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Passenger Seats</label>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 6, 9].map((option) => {
                    const isActive = vehicle.seats === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setVehicle({ ...vehicle, seats: option })}
                        className="rounded-lg py-2 text-xs font-semibold transition-all"
                        style={{
                          background: isActive ? "#185FA5" : "#F0EEE7",
                          color: isActive ? "#FFFFFF" : "#2C2C2A",
                          boxShadow: isActive
                            ? "inset 2px 2px 4px rgba(4,44,83,0.4), inset -2px -2px 3px rgba(133,183,235,0.3)"
                            : "2px 2px 5px rgba(44,44,42,0.14), -2px -2px 5px rgba(255,255,255,0.85)",
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
                <AlertCircle size={14} /> {errorMessage}
              </div>
            )}

            <div className="pt-4 border-t border-[#E4E2DA] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setVehicle(originalVehicle)}
                className="emboss-btn rounded-lg px-4 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving…" : "Save vehicle details"}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}

