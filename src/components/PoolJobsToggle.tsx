import { useState, useEffect } from "react";
import { Plane, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

// Standalone, not a Settings tab — this is a real availability
// preference (does this driver see the shared airport-jobs pool at
// all), not a fare/vehicle/profile detail, so it lives above the tabs
// where it's visible regardless of which tab is selected.
export default function PoolJobsToggle({ driverId }: { driverId: string | null }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    supabase
      .from("drivers")
      .select("pool_jobs_enabled")
      .eq("id", driverId)
      .single()
      .then(({ data }) => {
        setEnabled(data?.pool_jobs_enabled ?? false);
        setLoading(false);
      });
  }, [driverId]);

  async function toggle() {
    if (!driverId) return;
    const next = !enabled;
    setSaving(true);
    setErrorMessage("");
    const { error } = await supabase.from("drivers").update({ pool_jobs_enabled: next }).eq("id", driverId);
    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setEnabled(next);
  }

  if (loading) return null;

  return (
    <div className="mb-6 rounded-2xl p-5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#2C2C2A]">
        <Plane size={15} className="text-[#185FA5]" /> Airport Jobs Pool
      </div>
      <p className="mb-4 text-xs text-[#8C8977]">
        See and claim airport transfer requests from the shared jobs pool — bookings from the public
        website, not tied to your own booking link. First to accept gets it. Cash only for now, paid
        directly to you like any other pay-later trip.
      </p>

      <div className="flex items-center justify-between rounded-xl p-3.5" style={{ background: enabled ? "#EAF3DE" : "#F1EFE8" }}>
        <div>
          <div className="text-xs font-semibold" style={{ color: enabled ? "#27500A" : "#5F5E5A" }}>
            {enabled ? "Airport jobs enabled" : "Airport jobs disabled"}
          </div>
          <div className="text-[11px]" style={{ color: enabled ? "#27500A" : "#8C8977" }}>
            {enabled ? "You'll be notified when a new job appears." : "You won't see any pool jobs."}
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          role="switch"
          aria-checked={enabled}
          style={{
            position: "relative",
            height: 28,
            width: 48,
            minWidth: 48,
            flexShrink: 0,
            borderRadius: 999,
            background: enabled ? "#185FA5" : "#D8D5CB",
            border: "none",
            padding: 0,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
            transition: "background 0.2s ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: enabled ? 22 : 2,
              height: 24,
              width: 24,
              borderRadius: "50%",
              background: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
              transition: "left 0.2s ease",
            }}
          />
        </button>
      </div>

      {errorMessage && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg p-2 text-[11px]" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={12} /> {errorMessage}
        </div>
      )}
    </div>
  );
}
