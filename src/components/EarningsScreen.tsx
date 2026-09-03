import { useState, useEffect } from "react";
import { Loader2, Download, ExternalLink, TrendingUp, HeartHandshake, Hash, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "../supabaseClient";

// Requires tip_amount (added in the passenger app's tipping feature —
// ALTER TABLE bookings ADD COLUMN tip_amount numeric DEFAULT 0;) to
// already exist, or tips just show as €0 everywhere, which is a safe
// default either way.
//
// DESIGN-ONLY REDESIGN of the original EarningsScreen — every real
// data source, query condition, and action (CSV export, Stripe
// dashboard link) is unchanged from before. What's new, purely
// additive, and doesn't touch any existing behavior:
//   - A trend delta (vs. the immediately preceding period of the same
//     length) on the hero total and each metric card — computed from a
//     second, real query, never a guessed/faked number.
//   - A daily bar chart, derived client-side from the SAME bookings
//     array already being fetched for the metric cards/trip list — no
//     new query for this part.
//   - A Top Customers ranking, derived the same way (grouped by
//     customer_id when available, otherwise by passenger_name+phone for
//     guest bookings) — also no new query, just customer_id added to
//     the existing select.

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

// The immediately preceding period of the SAME length as the current
// one — e.g. "this week" compares to the 7 days before that, "this
// month" to the same number of days before the 1st. Duration-based
// rather than hardcoded calendar units so it stays meaningful
// regardless of which range is selected. "All time" has no meaningful
// "previous period" — callers should skip the comparison entirely
// when this returns nulls.
function getPreviousRangeDates(range: string): { start: Date | null; end: Date | null } {
  const { start, end } = getRangeDates(range);
  if (!start) return { start: null, end: null };
  const rangeEnd = end ?? new Date();
  const durationMs = rangeEnd.getTime() - start.getTime();
  return { start: new Date(start.getTime() - durationMs), end: start };
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null; // avoid a meaningless "∞%"; no prior activity to compare against
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ color: up ? "#27500A" : "#791F1F", background: up ? "#EAF3DE" : "#FCEBEB" }}
    >
      {up ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export default function EarningsScreen({ driverId }: { driverId: string | null }) {
  const [range, setRange] = useState("this_week");
  const [bookings, setBookings] = useState<any[]>([]);
  const [previousBookings, setPreviousBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [dashboardLinkLoading, setDashboardLinkLoading] = useState(false);

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { start, end } = getRangeDates(range);
      const { start: prevStart, end: prevEnd } = getPreviousRangeDates(range);

      let query = supabase
        .from("bookings")
        .select("id, customer_id, passenger_name, passenger_phone, scheduled_time, status, final_fare, estimated_fare, tip_amount, payment_status")
        .eq("driver_id", driverId)
        .eq("status", "completed")
        .order("scheduled_time", { ascending: false });
      if (start) query = query.gte("scheduled_time", start.toISOString());
      if (end) query = query.lt("scheduled_time", end.toISOString());

      let prevQuery = null;
      if (prevStart) {
        prevQuery = supabase
          .from("bookings")
          .select("final_fare, estimated_fare, tip_amount")
          .eq("driver_id", driverId)
          .eq("status", "completed")
          .gte("scheduled_time", prevStart.toISOString())
          .lt("scheduled_time", (prevEnd as Date).toISOString());
      }

      const [{ data, error }, prevResult] = await Promise.all([query, prevQuery ?? Promise.resolve({ data: [], error: null })]);

      if (cancelled) return;
      setLoading(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("");
      setBookings(data ?? []);
      setPreviousBookings((prevResult as any)?.data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId, range]);

  const fareTotal = bookings.reduce((sum, b) => sum + Number(b.final_fare ?? b.estimated_fare ?? 0), 0);
  const tipTotal = bookings.reduce((sum, b) => sum + Number(b.tip_amount ?? 0), 0);
  const tripCount = bookings.length;
  const average = tripCount > 0 ? fareTotal / tripCount : 0;
  const totalEarnings = fareTotal + tipTotal;

  const prevFareTotal = previousBookings.reduce((sum, b) => sum + Number(b.final_fare ?? b.estimated_fare ?? 0), 0);
  const prevTipTotal = previousBookings.reduce((sum, b) => sum + Number(b.tip_amount ?? 0), 0);
  const prevTripCount = previousBookings.length;
  const prevAverage = prevTripCount > 0 ? prevFareTotal / prevTripCount : 0;
  const prevTotalEarnings = prevFareTotal + prevTipTotal;
  const hasComparison = range !== "all_time";

  // Daily buckets, derived from the bookings already loaded above — no
  // extra query. Only meaningful for ranges that span a reasonably
  // small, fixed number of days; "all_time" could span years, so no
  // daily chart is shown for it at all.
  const showDailyChart = range !== "all_time";
  const dayBuckets: { label: string; amount: number; isToday: boolean }[] = [];
  if (showDailyChart) {
    const { start } = getRangeDates(range);
    const rangeStart = start ?? new Date(Math.min(...bookings.map((b) => new Date(b.scheduled_time).getTime()), Date.now()));
    const todayKey = new Date().toDateString();
    const byDay = new Map<string, number>();
    for (const b of bookings) {
      const d = new Date(b.scheduled_time);
      const key = d.toDateString();
      const amt = Number(b.final_fare ?? b.estimated_fare ?? 0) + Number(b.tip_amount ?? 0);
      byDay.set(key, (byDay.get(key) ?? 0) + amt);
    }
    const cursor = new Date(rangeStart);
    const today = new Date();
    while (cursor <= today) {
      const key = cursor.toDateString();
      dayBuckets.push({
        label: cursor.toLocaleDateString(undefined, { weekday: "short" }),
        amount: byDay.get(key) ?? 0,
        isToday: key === todayKey,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    // A month-long range would otherwise render 28-31 bars — keep only
    // the most recent 14 so the chart stays legible; the metric
    // cards/CSV/trip list above and below are completely unaffected,
    // this trims only this one chart's own bucket list.
    if (dayBuckets.length > 14) dayBuckets.splice(0, dayBuckets.length - 14);
  }
  const maxDayAmount = Math.max(1, ...dayBuckets.map((d) => d.amount));

  // Top customers, also derived client-side from the same bookings
  // array — grouped by customer_id when the booking has one (a
  // signed-in customer), otherwise by name+phone so guest bookings
  // from the same person still group together within this one period.
  const customerTotals = new Map<string, { name: string; amount: number; trips: number }>();
  for (const b of bookings) {
    const key = b.customer_id || `${b.passenger_name}|${b.passenger_phone}`;
    const amt = Number(b.final_fare ?? b.estimated_fare ?? 0) + Number(b.tip_amount ?? 0);
    const existing = customerTotals.get(key);
    if (existing) {
      existing.amount += amt;
      existing.trips += 1;
    } else {
      customerTotals.set(key, { name: b.passenger_name, amount: amt, trips: 1 });
    }
  }
  const topCustomers = [...customerTotals.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const maxCustomerAmount = Math.max(1, ...topCustomers.map((c) => c.amount));

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

  const totalDelta = hasComparison ? deltaPercent(totalEarnings, prevTotalEarnings) : null;
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label.toLowerCase() ?? "this period";

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
          {/* Hero */}
          <div
            className="mb-4 rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, #185FA5, #0C447C)", color: "white", boxShadow: "6px 10px 24px rgba(12,68,124,0.30)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 text-xs opacity-75">Total {rangeLabel}</div>
                <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk'" }}>
                  €{totalEarnings.toFixed(2)}
                </div>
                {totalDelta !== null && (
                  <div
                    className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: "rgba(255,255,255,0.16)", color: totalDelta >= 0 ? "#C7F2A4" : "#F5C6C6" }}
                  >
                    {totalDelta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                    {Math.abs(totalDelta).toFixed(0)}% vs previous period
                  </div>
                )}
              </div>
              {dayBuckets.length > 1 && (
                <svg viewBox={`0 0 ${Math.max(dayBuckets.length - 1, 1) * 20} 46`} width="130" height="46" fill="none">
                  <polyline
                    points={dayBuckets.map((d, i) => `${i * 20},${46 - (d.amount / maxDayAmount) * 40 - 3}`).join(" ")}
                    stroke="#9FD97E"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="mt-3 text-xs opacity-70">
              {tripCount} completed {tripCount === 1 ? "trip" : "trips"} · €{average.toFixed(2)} average fare
            </div>
          </div>

          {/* Metric cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8C8977]">
                  <TrendingUp size={11} /> Fares
                </span>
                {hasComparison && <DeltaBadge value={deltaPercent(fareTotal, prevFareTotal)} />}
              </div>
              <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>€{fareTotal.toFixed(2)}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8C8977]">
                  <HeartHandshake size={11} /> Tips
                </span>
                {hasComparison && <DeltaBadge value={deltaPercent(tipTotal, prevTipTotal)} />}
              </div>
              <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>€{tipTotal.toFixed(2)}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#8C8977]">
                  <Hash size={11} /> Trips
                </span>
                {hasComparison && <DeltaBadge value={deltaPercent(tripCount, prevTripCount)} />}
              </div>
              <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>{tripCount}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-[#8C8977]">Avg. fare</span>
                {hasComparison && <DeltaBadge value={deltaPercent(average, prevAverage)} />}
              </div>
              <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>€{average.toFixed(2)}</div>
            </div>
          </div>

          {/* Daily chart */}
          {showDailyChart && dayBuckets.length > 0 && (
            <div className="mb-4 rounded-xl border border-[#E4E2DA] bg-white p-4">
              <div className="mb-3 text-xs font-semibold text-[#5F5E5A]">Daily earnings</div>
              <div className="flex items-end gap-2" style={{ height: 130 }}>
                {dayBuckets.map((d, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <div className="text-[9px] font-semibold text-[#5F5E5A]">{d.amount > 0 ? `€${d.amount.toFixed(0)}` : ""}</div>
                    <div
                      className="w-full max-w-[30px] rounded-t-md"
                      style={{
                        height: `${Math.max((d.amount / maxDayAmount) * 90, d.amount > 0 ? 4 : 1)}%`,
                        background: d.isToday ? "linear-gradient(180deg, #63C77A, #3B8A4C)" : "linear-gradient(180deg, #378ADD, #185FA5)",
                      }}
                    />
                    <div className="text-[9px] font-semibold text-[#8C8977]">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top customers */}
          {topCustomers.length > 0 && (
            <div className="mb-4 rounded-xl border border-[#E4E2DA] bg-white p-4">
              <div className="mb-3 text-xs font-semibold text-[#5F5E5A]">Top customers this period</div>
              <div className="space-y-0.5">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-[#F0EEE7] py-2 last:border-0">
                    <div className="w-4 text-center text-[11px] font-bold text-[#8C8977]">{i + 1}</div>
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #378ADD, #0C447C)", fontFamily: "'Space Grotesk'" }}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-[#2C2C2A]">{c.name}</div>
                      <div className="text-[11px] text-[#8C8977]">{c.trips} {c.trips === 1 ? "trip" : "trips"}</div>
                    </div>
                    <div className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-[#F0EEE7] sm:block">
                      <div className="h-full rounded-full" style={{ width: `${(c.amount / maxCustomerAmount) * 100}%`, background: "linear-gradient(90deg, #378ADD, #185FA5)" }} />
                    </div>
                    <div className="w-16 shrink-0 text-right text-[13px] font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                      €{c.amount.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  <div key={b.id} className="flex items-center gap-3 border-b border-[#F0EEE7] pb-2 text-sm last:border-0 last:pb-0">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#5F5E5A]"
                      style={{ background: "#F0EEE7", fontFamily: "'Space Grotesk'" }}
                    >
                      {initials(b.passenger_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-[#2C2C2A]">{b.passenger_name}</div>
                      <div className="text-[11px] text-[#8C8977]">{new Date(b.scheduled_time).toLocaleDateString()}</div>
                    </div>
                    <div className="shrink-0 text-right">
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
