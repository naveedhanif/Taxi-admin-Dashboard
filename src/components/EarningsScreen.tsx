import { useState, useEffect } from "react";
import { Loader2, Download, ExternalLink, TrendingUp, HeartHandshake, Hash, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

// Requires tip_amount (added in the passenger app's tipping feature —
// ALTER TABLE bookings ADD COLUMN tip_amount numeric DEFAULT 0;) to
// already exist, or tips just show as €0 everywhere, which is a safe
// default either way.

const RANGE_OPTIONS = [
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "all_time", label: "All time" },
];

function getRangeDates(range: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case "this_week": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - start.getDay());
      return { start, end: null };
    }
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: null };
    case "last_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    default:
      return { start: null, end: null };
  }
}

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export default function EarningsScreen({ driverId }: { driverId: string | null }) {
  const [range, setRange] = useState("this_week");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [dashboardLinkLoading, setDashboardLinkLoading] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { start, end } = getRangeDates(range);
      let query = supabase
        .from("bookings")
        .select("id, passenger_name, scheduled_time, status, final_fare, estimated_fare, tip_amount, payment_status")
        .eq("driver_id", driverId)
        .eq("status", "completed")
        .order("scheduled_time", { ascending: false });
      if (start) query = query.gte("scheduled_time", start.toISOString());
      if (end) query = query.lt("scheduled_time", end.toISOString());

      const { data, error } = await query;
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("");
      setBookings(data ?? []);
    })();
    return () => { cancelled = true; };
  }, [driverId, range]);

  const fareTotal = bookings.reduce((sum, b) => sum + Number(b.final_fare ?? b.estimated_fare ?? 0), 0);
  const tipTotal = bookings.reduce((sum, b) => sum + Number(b.tip_amount ?? 0), 0);
  const tripCount = bookings.length;
  const average = tripCount > 0 ? fareTotal / tripCount : 0;

  function handleExportCsv() {
    const rows = bookings.map((b) => ({
      Date: new Date(b.scheduled_time).toLocaleDateString(),
      Passenger: b.passenger_name,
      Fare: Number(b.final_fare ?? b.estimated_fare ?? 0).toFixed(2),
      Tip: Number(b.tip_amount ?? 0).toFixed(2),
      "Payment status": b.payment_status,
    }));
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleOpenStripeDashboard() {
    if (!driverId) return;
    setDashboardLinkLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(`${supabaseUrl}/functions/v1/get-stripe-dashboard-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token || anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ driver_id: driverId }),
      });
      const data = await res.json();
      setDashboardLinkLoading(false);
      if (!res.ok || !data.url) {
        setErrorMessage(data.error || "Couldn't open the Stripe dashboard");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDashboardLinkLoading(false);
      setErrorMessage(err instanceof Error ? err.message : "Couldn't open the Stripe dashboard");
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 px-1">
        <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
          Earnings
        </h1>
        <p className="text-sm text-[#5F5E5A]">Completed trips only — figures reflect what was actually charged, not estimates.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`emboss-btn rounded-full px-4 py-2 text-xs font-semibold cursor-pointer ${
              range === opt.value ? "emboss-selected text-white" : "text-[#5F5E5A]"
            }`}
            style={
              range === opt.value
                ? { background: "linear-gradient(135deg, #378ADD, #0C447C)", boxShadow: "inset 2px 2px 5px rgba(4,44,83,0.5), inset -1px -1px 3px rgba(133,183,235,0.3)" }
                : undefined
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-[#5F5E5A]">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8C8977]">
                <TrendingUp size={11} /> Fares
              </div>
              <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>€{fareTotal.toFixed(2)}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8C8977]">
                <HeartHandshake size={11} /> Tips
              </div>
              <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>€{tipTotal.toFixed(2)}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8C8977]">
                <Hash size={11} /> Trips
              </div>
              <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>{tripCount}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 text-[10px] font-semibold uppercase text-[#8C8977]">Avg. fare</div>
              <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>€{average.toFixed(2)}</div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2.5">
            <button
              onClick={handleExportCsv}
              disabled={tripCount === 0}
              className="emboss-btn flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2C2C2A] cursor-pointer disabled:opacity-50"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={handleOpenStripeDashboard}
              disabled={dashboardLinkLoading}
              className="emboss-btn flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2C2C2A] cursor-pointer disabled:opacity-60"
            >
              {dashboardLinkLoading ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
              Open Stripe payout dashboard
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
              <AlertCircle size={14} /> {errorMessage}
            </div>
          )}

          <div className="rounded-xl border border-[#E4E2DA] bg-white p-4">
            <div className="mb-3 text-xs font-semibold text-[#5F5E5A]">Trips in this period</div>
            {tripCount === 0 ? (
              <div className="py-6 text-center text-sm text-[#8C8977]">No completed trips in this range.</div>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between border-b border-[#F0EEE7] pb-2 text-sm last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium text-[#2C2C2A]">{b.passenger_name}</div>
                      <div className="text-[11px] text-[#8C8977]">{new Date(b.scheduled_time).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#2C2C2A]">€{Number(b.final_fare ?? b.estimated_fare ?? 0).toFixed(2)}</div>
                      {Number(b.tip_amount ?? 0) > 0 && (
                        <div className="text-[11px] text-[#27500A]">+€{Number(b.tip_amount).toFixed(2)} tip</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
