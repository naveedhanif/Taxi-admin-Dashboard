import type React from "react";
import { useState, useEffect } from "react";
import { Car, ShieldCheck, Check, Save, Users, Hash, Palette, Loader2, AlertCircle, Plus, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import PhotoUpload from "./PhotoUpload";

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

interface VehicleRow extends VehicleData {
  id: string;
  is_active: boolean;
  photo_url: string | null;
}

const emptyVehicle: VehicleData = {
  make: "",
  model: "",
  color: "",
  plate: "",
  seats: 4,
};

// Requires the `vehicles` table's driver_id UNIQUE constraint to be
// replaced with a PARTIAL unique index — one full vehicle per driver
// used to be enforced outright; multi-vehicle needs "at most one
// ACTIVE vehicle per driver" instead, so the passenger-facing view
// (public_vehicle_profiles, confirmed via pg_get_viewdef to already
// filter on v.is_active = true) keeps returning exactly one row the
// way every .maybeSingle() call throughout both apps already expects.
// Run once in the Supabase SQL editor before deploying:
//
//   ALTER TABLE vehicles DROP CONSTRAINT vehicles_driver_id_key;
//   CREATE UNIQUE INDEX vehicles_one_active_per_driver ON vehicles(driver_id) WHERE is_active = true;

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
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // null = list view. "new" = adding a vehicle. an id = editing that one.
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [formData, setFormData] = useState<VehicleData>(emptyVehicle);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [switchingActiveId, setSwitchingActiveId] = useState<string | null>(null);

  async function loadVehicles() {
    if (!driverId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage("");
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, make, model, color, plate, seats, photo_url, is_active")
      .eq("driver_id", driverId)
      .order("is_active", { ascending: false });
    setLoading(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setVehicles((data as VehicleRow[]) ?? []);
  }

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  function startAdd() {
    setEditingId("new");
    setFormData(emptyVehicle);
    setFormPhotoUrl(null);
    setErrorMessage("");
  }

  function startEdit(v: VehicleRow) {
    setEditingId(v.id);
    setFormData({ make: v.make, model: v.model, color: v.color, plate: v.plate, seats: v.seats });
    setFormPhotoUrl(v.photo_url);
    setErrorMessage("");
  }

  function cancelForm() {
    setEditingId(null);
    setErrorMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId) {
      setErrorMessage("No driver is signed in — can't save vehicle details.");
      return;
    }
    setSaving(true);
    setErrorMessage("");

    if (editingId === "new") {
      // First vehicle a driver ever adds becomes active automatically —
      // there's nothing to choose between yet. Every vehicle after that
      // stays inactive until the driver deliberately switches to it, so
      // adding a second car never silently swaps what passengers see.
      const { error } = await supabase
        .from("vehicles")
        .insert({ driver_id: driverId, ...formData, is_active: vehicles.length === 0 });
      setSaving(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
    } else if (editingId) {
      const { error } = await supabase.from("vehicles").update(formData).eq("id", editingId);
      setSaving(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }

    setEditingId(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    loadVehicles();
  }

  async function handleSetActive(id: string) {
    if (!driverId || switchingActiveId) return;
    setSwitchingActiveId(id);
    setErrorMessage("");
    // Two separate statements, deliberately in this order: deactivate
    // everything else FIRST, then activate the target. Doing it the
    // other way around would briefly have two active rows for the same
    // driver at once, which the partial unique index (see the SQL note
    // above) correctly rejects. This order instead passes through a
    // harmless instant of zero active vehicles, not a constraint
    // violation.
    const { error: deactivateError } = await supabase
      .from("vehicles")
      .update({ is_active: false })
      .eq("driver_id", driverId)
      .neq("id", id);
    if (deactivateError) {
      setSwitchingActiveId(null);
      setErrorMessage(deactivateError.message);
      return;
    }
    const { error: activateError } = await supabase.from("vehicles").update({ is_active: true }).eq("id", id);
    setSwitchingActiveId(null);
    if (activateError) {
      setErrorMessage(activateError.message);
      return;
    }
    loadVehicles();
  }

  async function handleDelete(v: VehicleRow) {
    if (!window.confirm(`Remove ${v.make} ${v.model}? This can't be undone.`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    // If the deleted vehicle was the active one and others remain,
    // automatically activate the next one — otherwise passengers would
    // see no vehicle at all until the driver manually picks one.
    if (v.is_active) {
      const remaining = vehicles.filter((x) => x.id !== v.id);
      if (remaining.length > 0) {
        await supabase.from("vehicles").update({ is_active: true }).eq("id", remaining[0].id);
      }
    }
    loadVehicles();
  }

  return (
    <div className="min-h-[600px] w-full p-4 sm:p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            Vehicles
          </h1>
          <p className="text-sm text-[#5F5E5A]">The active vehicle is what passengers see when booking. Keep a spare car listed for when you swap.</p>
        </div>
        <span className="rounded-full bg-[#EAF3DE] px-3 py-1 text-xs font-semibold text-[#27500A] flex items-center gap-1.5">
          <ShieldCheck size={14} /> License Verified
        </span>
      </div>

      {savedSuccess && (
        <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-[#EAF3DE] px-3 py-2 text-xs font-medium text-[#27500A]">
          <Check size={13} /> Saved
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 justify-center text-xs text-[#5F5E5A]">
          <Loader2 size={14} className="animate-spin" /> Loading vehicles…
        </div>
      ) : editingId ? (
        <div className="max-w-md rounded-xl border border-[#E4E2DA] bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
            {editingId === "new" ? "Add a vehicle" : "Edit vehicle"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {editingId !== "new" && (
              <PhotoUpload
                driverId={editingId}
                table="vehicles"
                matchColumn="id"
                currentUrl={formPhotoUrl}
                onUploaded={setFormPhotoUrl}
                label="Vehicle photo"
              />
            )}
            {editingId === "new" && (
              <div className="rounded-lg p-3 text-[11px]" style={{ background: "#F1EFE8", color: "#5F5E5A" }}>
                You can add a photo once this vehicle is saved.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Vehicle Make</label>
                <input
                  type="text"
                  required
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="emboss-input w-full rounded-lg px-3 py-2 text-xs text-[#2C2C2A]"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Vehicle Model</label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
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
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
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
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="emboss-input w-full rounded-lg px-3 py-2 pl-8 text-xs text-[#2C2C2A]"
                  />
                  <Palette size={13} className="absolute left-2.5 top-2.5 text-[#B4B2A9]" />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium text-[#2C2C2A]">Passenger Seats</label>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 6, 9].map((option) => {
                    const isActive = formData.seats === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData({ ...formData, seats: option })}
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

            <div className="pt-4 border-t border-[#E4E2DA] flex justify-end gap-3">
              <button type="button" onClick={cancelForm} className="emboss-btn rounded-lg px-4 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="emboss-btn-primary flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving…" : "Save vehicle"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-[#E4E2DA] bg-white py-10 text-center">
              <Car size={22} color="#B4B2A9" />
              <div className="text-sm text-[#8C8977]">No vehicles added yet.</div>
            </div>
          )}
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4"
              style={{ borderColor: v.is_active ? "#185FA5" : "#E4E2DA" }}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: "#F1EFE8" }}>
                {v.photo_url ? (
                  <img src={v.photo_url} alt={`${v.make} ${v.model}`} className="h-full w-full object-cover" />
                ) : (
                  <Car size={22} color="#8C8977" />
                )}
              </div>
              <div className="min-w-[140px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#2C2C2A]">{v.make} {v.model}</span>
                  {v.is_active && (
                    <span className="flex items-center gap-1 rounded-full bg-[#EAF3DE] px-2 py-0.5 text-[10px] font-semibold text-[#27500A]">
                      <CheckCircle2 size={10} /> Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#8C8977]">
                  <span>{v.color}</span>
                  <span className="font-mono">{v.plate}</span>
                  <span className="flex items-center gap-1"><Users size={10} /> {v.seats}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!v.is_active && (
                  <button
                    onClick={() => handleSetActive(v.id)}
                    disabled={switchingActiveId === v.id}
                    className="emboss-btn rounded-lg px-3 py-2 text-[11px] font-semibold text-[#185FA5] cursor-pointer disabled:opacity-60"
                  >
                    {switchingActiveId === v.id ? "Switching…" : "Set active"}
                  </button>
                )}
                <button onClick={() => startEdit(v)} className="emboss-btn flex h-8 w-8 items-center justify-center rounded-lg text-[#5F5E5A]" aria-label="Edit">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(v)} className="emboss-btn flex h-8 w-8 items-center justify-center rounded-lg text-[#991B1B]" aria-label="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={startAdd} className="emboss-btn flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[#185FA5] cursor-pointer">
            <Plus size={15} /> Add a vehicle
          </button>
        </div>
      )}
    </div>
  );
}
