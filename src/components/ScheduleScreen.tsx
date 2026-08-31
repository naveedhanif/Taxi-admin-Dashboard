import { useState, useEffect } from "react";
import { Save, Check, Loader2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "../supabaseClient";

// Requires one new column, run once in the Supabase SQL editor before
// deploying:
//   ALTER TABLE drivers ADD COLUMN working_hours jsonb;
//
// Shape stored: { mon: {start:"07:00", end:"19:00"} | null, tue: ..., ... }
// A null value means "day off". A missing/null working_hours column
// entirely means "no schedule set" — the driver's manual Online/Offline
// toggle in the header is the only thing controlling availability in
// that case, exactly as it worked before this feature existed.

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

type DaySchedule = { start: string; end: string } | null;
type WeekSchedule = Record<string, DaySchedule>;

const DEFAULT_HOURS: DaySchedule = { start: "07:00", end: "19:00" };

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);
}

export default function ScheduleScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [schedule, setSchedule] = useState<WeekSchedule>({});
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("drivers").select("working_hours").eq("id", driverId).single();
      if (cancelled) return;
      setLoading(false);
      if (error) return;
      if (data?.working_hours) {
        setSchedule(data.working_hours);
        setScheduleEnabled(true);
      }
    })();
    return () => { cancelled = true; };
  }, [driverId]);

  function toggleDayOff(day: string) {
    setSchedule((prev) => ({ ...prev, [day]: prev[day] ? null : DEFAULT_HOURS }));
  }

  function updateDayTime(day: string, field: "start" | "end", value: string) {
    setSchedule((prev) => ({ ...prev, [day]: { ...(prev[day] || DEFAULT_HOURS), [field]: value } }));
  }

  async function handleSave() {
    if (!driverId) return;
    setSaving(true);
    setErrorMessage("");
    const { error } = await supabase
      .from("drivers")
      .update({ working_hours: scheduleEnabled ? schedule : null })
      .eq("id", driverId);
    setSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[#5F5E5A]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
        Working Hours
      </h1>
      <p className="mb-4 text-sm text-[#5F5E5A]">
        Set a weekly schedule to automatically appear online during your working hours. Your manual Online/Offline
        toggle in the header always takes priority — switching yourself offline stops new bookings immediately,
        regardless of what's scheduled below.
      </p>

      <div
        className="mb-4 flex items-center justify-between rounded-xl p-4"
        style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}
      >
        <div>
          <div className="text-sm font-semibold text-[#2C2C2A]">Use a weekly schedule</div>
          <div className="text-xs text-[#8C8977]">Off means only the manual toggle controls availability</div>
        </div>
        <button
          onClick={() => setScheduleEnabled((v) => !v)}
          className="relative h-7 w-12 rounded-full transition-colors"
          style={{ background: scheduleEnabled ? "#185FA5" : "#D3D1C7" }}
        >
          <span
            className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
            style={{ left: scheduleEnabled ? "26px" : "4px" }}
          />
        </button>
      </div>

      {scheduleEnabled && (
        <div className="space-y-2.5">
          {DAYS.map((d) => {
            const daySchedule = schedule[d.key];
            const isOff = !daySchedule;
            return (
              <div
                key={d.key}
                className="flex flex-wrap items-center gap-3 rounded-xl p-3.5"
                style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}
              >
                <div className="flex w-28 items-center gap-2 text-sm font-medium text-[#2C2C2A]">
                  <Clock size={13} className="text-[#8C8977]" /> {d.label}
                </div>
                <button
                  onClick={() => toggleDayOff(d.key)}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: isOff ? "#F1EFE8" : "#EAF3DE", color: isOff ? "#8C8977" : "#27500A" }}
                >
                  {isOff ? "Day off" : "Working"}
                </button>
                {!isOff && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <input
                      type="time"
                      value={daySchedule.start}
                      onChange={(e) => updateDayTime(d.key, "start", e.target.value)}
                      className="emboss-input rounded-lg px-2 py-1.5 text-xs text-[#2C2C2A]"
                    />
                    <span className="text-[#8C8977]">to</span>
                    <input
                      type="time"
                      value={daySchedule.end}
                      onChange={(e) => updateDayTime(d.key, "end", e.target.value)}
                      className="emboss-input rounded-lg px-2 py-1.5 text-xs text-[#2C2C2A]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="emboss-btn-primary mt-5 flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white cursor-pointer disabled:opacity-60"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
        {saving ? "Saving…" : saved ? "Saved" : "Save schedule"}
      </button>
    </div>
  );
}
