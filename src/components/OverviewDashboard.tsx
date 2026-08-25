import { useState, useEffect } from "react";
import { MapPin, Plus, Settings, TrendingUp, Circle, Car } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { supabase } from "../supabaseClient";

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
      .emboss-toggle-on:active, .emboss-toggle-off:active {
        box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7);
        transform: translateY(1px);
      }
    `}</style>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[#E4E2DA] bg-white p-5">
      <div className="text-xs font-medium text-[#5F5E5A]" style={{ fontFamily: "Inter" }}>{label}</div>
      <div className="mt-2 text-3xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs" style={{ color: accent }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "#FAEEDA", text: "#633806", label: "Pending" },
    confirmed: { bg: "#EAF3DE", text: "#27500A", label: "Confirmed" },
    en_route: { bg: "#E6F1FB", text: "#0C447C", label: "En route" },
    arrived: { bg: "#E6F1FB", text: "#0C447C", label: "Arrived" },
    in_progress: { bg: "#E6F1FB", text: "#0C447C", label: "In progress" },
    completed: { bg: "#F1EFE8", text: "#5F5E5A", label: "Completed" },
    canceled: { bg: "#FCEBEB", text: "#791F1F", label: "Canceled" },
  };
  const s = map[status] || { bg: "#F1EFE8", text: "#2C2C2A", label: status };
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: s.bg, color: s.text, fontFamily: "Inter" }}>
      {s.label}
    </span>
  );
}

interface Booking {
  id: string;
  passenger_name: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  status: string;
  estimated_fare: number;
  final_fare: number | null;
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// A driver is "busy" (hidden from new bookings, shown as unavailable)
// from the moment a booking is confirmed as paid — "pending" onward.
// awaiting_payment is deliberately excluded: that status means a
// PaymentIntent exists but the passenger hasn't completed payment yet,
// so it isn't a real booking and shouldn't lock the driver or show up
// on the dashboard. See create-booking and confirm-booking-payment.
const ACTIVE_TRIP_STATUSES = ["pending", "confirmed", "en_route", "arrived", "in_progress"];

export default function OverviewDashboard({ driverId, onNavigate }: { driverId: string | null; onNavigate?: (screen: string) => void }) {
  useGoogleFont();
  const [businessName, setBusinessName] = useState("");
  const [online, setOnline] = useState(true);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [activeTripCount, setActiveTripCount] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState<{ day: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboardData() {
    if (!driverId) {
      // No driver yet (still resolving after signup, or genuinely
      // signed out) — don't leave the spinner stuck forever.
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: driver } = await supabase
      .from("drivers")
      .select("business_name, is_active")
      .eq("id", driverId)
      .single();
    if (driver) {
      setBusinessName(driver.business_name);
      setOnline(driver.is_active);
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { data: todayData } = await supabase
      .from("bookings")
      .select("id, passenger_name, pickup_address, dropoff_address, scheduled_time, status, estimated_fare, final_fare")
      .eq("driver_id", driverId)
      // Same exclusion as AllBookingsScreen — an unpaid awaiting_payment
      // booking isn't a real booking yet and shouldn't show up here.
      .neq("status", "awaiting_payment")
      .gte("scheduled_time", todayStart.toISOString())
      .lt("scheduled_time", todayEnd.toISOString())
      .order("scheduled_time");
    setTodayBookings(todayData ?? []);

    // Busy/available state (mirrors public_driver_profiles.is_available)
    // is NOT limited to "today" — a trip that started yesterday and is
    // still in progress should still count. Checked separately from the
    // today-only list above so a driver mid-trip past midnight doesn't
    // get incorrectly shown as free.
    const { count: activeCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", driverId)
      .in("status", ACTIVE_TRIP_STATUSES);
    setActiveTripCount(activeCount ?? 0);

    // Last 7 days of completed bookings, grouped by day for the earnings chart
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const { data: weekData } = await supabase
      .from("bookings")
      .select("scheduled_time, final_fare, estimated_fare, status")
      .eq("driver_id", driverId)
      .eq("status", "completed")
      .gte("scheduled_time", weekAgo.toISOString());

    const byDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekAgo);
      d.setDate(d.getDate() + i);
      byDay[DAY_LABELS[d.getDay()]] = 0;
    }
    (weekData ?? []).forEach((b) => {
      const day = DAY_LABELS[new Date(b.scheduled_time).getDay()];
      const amount = b.final_fare ?? b.estimated_fare ?? 0;
      byDay[day] = (byDay[day] ?? 0) + Number(amount);
    });
    setWeeklyEarnings(Object.entries(byDay).map(([day, amount]) => ({ day, amount: Math.round(amount) })));

    setLoading(false);
  }

  useEffect(() => {
    loadDashboardData();

    if (!driverId) return;

    // Real-time: refresh whenever a booking for this driver changes
    // (new booking arrives, status changes, etc.) — the notification
    // toast is a separate concern (see useNewBookingNotifications);
    // this keeps the dashboard's own numbers in sync too.
    const channel = supabase
      .channel(`dashboard-bookings-${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `driver_id=eq.${driverId}` },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  async function handleToggleOnline() {
    const newValue = !online;
    setOnline(newValue); // optimistic update
    if (driverId) {
      await supabase.from("drivers").update({ is_active: newValue }).eq("id", driverId);
    }
  }

  const ridesTodayCount = todayBookings.length;
  const earningsToday = todayBookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + Number(b.final_fare ?? b.estimated_fare ?? 0), 0);
  const activeTrip = todayBookings.find((b) => ACTIVE_TRIP_STATUSES.includes(b.status));
  const isBusy = activeTripCount > 0;
  const nextUpcoming = todayBookings.find((b) => b.status === "pending" || b.status === "confirmed");

  const statusCounts: Record<string, number> = {};
  todayBookings.forEach((b) => {
    statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
  });
  const statusColors: Record<string, string> = {
    confirmed: "#639922",
    pending: "#BA7517",
    en_route: "#185FA5",
    completed: "#5F5E5A",
    canceled: "#A32D2D",
  };
  const statusBreakdown = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: statusColors[name] ?? "#8C8977",
  }));

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-[#5F5E5A]">
        Loading your dashboard…
      </div>
    );
  }

  if (!driverId) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="mb-2 text-base font-semibold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
          Setting up your account…
        </div>
        <div className="text-sm text-[#5F5E5A]">
          If this takes more than a few seconds, try refreshing the page. If it persists, sign out and sign back in.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] w-full p-4 sm:p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            {businessName || "Your Taxi"}
          </div>
          <div className="text-sm text-[#5F5E5A]">{todayLabel}</div>
        </div>
        <button
          onClick={handleToggleOnline}
          disabled={isBusy}
          className={`flex items-center gap-2 self-start rounded-full px-4 py-2 text-xs sm:text-sm font-medium cursor-pointer disabled:cursor-default ${
            isBusy ? "emboss-toggle-on" : online ? "emboss-toggle-on" : "emboss-toggle-off"
          }`}
          style={{ color: isBusy ? "#185FA5" : online ? "#3B6D11" : "#5F5E5A" }}
        >
          <Circle size={9} className="shrink-0" fill={isBusy ? "#185FA5" : online ? "#639922" : "#B4B2A9"} stroke="none" />
          <span className="sm:hidden">{isBusy ? "On a trip" : online ? "Online" : "Offline"}</span>
          <span className="hidden sm:inline">
            {isBusy ? "On a trip — hidden from new bookings" : online ? "Online — accepting bookings" : "Offline"}
          </span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Rides today" value={String(ridesTodayCount)} />
        <StatCard label="Earnings today" value={`€${earningsToday.toFixed(2)}`} accent="#3B6D11" />
        <StatCard
          label="Next pickup"
          value={nextUpcoming ? new Date(nextUpcoming.scheduled_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—"}
          sub={nextUpcoming ? `${nextUpcoming.passenger_name}, ${nextUpcoming.pickup_address}` : "No upcoming rides"}
          accent="#185FA5"
        />
      </div>

      {/* Charts row */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border border-[#E4E2DA] bg-white p-5">
          <div className="mb-3 text-sm font-medium text-[#2C2C2A]">Earnings, last 7 days</div>
          <div style={{ width: "100%", height: 140 }}>
            <ResponsiveContainer>
              <BarChart data={weeklyEarnings} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5F5E5A" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#F1EFE8" }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E4E2DA" }}
                  formatter={(v) => [`€${v}`, "Earnings"]}
                />
                <Bar dataKey="amount" fill="#185FA5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#E4E2DA] bg-white p-5">
          <div className="mb-3 text-sm font-medium text-[#2C2C2A]">Today's status mix</div>
          {statusBreakdown.length === 0 ? (
            <div className="flex h-[120px] items-center justify-center text-xs text-[#8C8977]">No bookings today yet</div>
          ) : (
            <div style={{ width: "100%", height: 120 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" innerRadius={30} outerRadius={48} paddingAngle={3}>
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-1 flex flex-wrap justify-center gap-4 text-xs">
            {statusBreakdown.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[#5F5E5A]">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main grid: bookings + live trip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border border-[#E4E2DA] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium text-[#2C2C2A]">Today's bookings</div>
            <button
              onClick={() => onNavigate?.("bookings")}
              className="emboss-btn-primary flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
            >
              <Plus size={13} /> Add booking
            </button>
          </div>
          {todayBookings.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8C8977]">No bookings scheduled for today</div>
          ) : (
            <div className="space-y-2">
              {todayBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-[#E4E2DA] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-[#F1EFE8] px-2 py-1 text-xs font-medium text-[#2C2C2A]">
                      {new Date(b.scheduled_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#2C2C2A]">{b.passenger_name}</div>
                      <div className="flex items-center gap-1 text-xs text-[#5F5E5A]">
                        <MapPin size={11} /> {b.pickup_address} → {b.dropoff_address}
                      </div>
                    </div>
                  </div>
                  <StatusPill status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#E4E2DA] bg-white p-5">
          <div className="mb-3 text-sm font-medium text-[#2C2C2A]">Active trip</div>
          <div className="mb-4 flex h-28 items-center justify-center rounded-lg bg-[#F1EFE8]">
            <Car size={26} color={activeTrip ? "#185FA5" : "#B4B2A9"} />
          </div>
          {activeTrip ? (
            <div className="space-y-2.5 text-xs">
              <div className="text-sm font-medium text-[#2C2C2A]">{activeTrip.passenger_name}</div>
              {["confirmed", "en_route", "arrived", "completed"].map((step, i) => {
                const order = ["confirmed", "en_route", "arrived", "in_progress", "completed"];
                const currentIndex = order.indexOf(activeTrip.status);
                const stepIndex = order.indexOf(step);
                const reached = stepIndex <= currentIndex;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <Circle size={7} fill={reached ? "#185FA5" : "#D3D1C7"} stroke="none" />
                    <span style={{ color: reached ? "#2C2C2A" : "#B4B2A9", fontWeight: reached ? 500 : 400 }}>
                      {step.charAt(0).toUpperCase() + step.slice(1).replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-xs text-[#8C8977]">No trip currently in progress</div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => onNavigate?.("fare_rules")}
          className="emboss-btn flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer"
        >
          <Settings size={13} /> Fare rules
        </button>
        <button
          onClick={() => onNavigate?.("bookings")}
          className="emboss-btn flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer"
        >
          <TrendingUp size={13} /> View all bookings
        </button>
      </div>
    </div>
  );
}

