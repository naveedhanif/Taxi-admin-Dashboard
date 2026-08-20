import { useState, useEffect } from "react";
import { MapPin, Plus, Settings, TrendingUp, Circle, Car } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

const bookings = [
  { id: 1, name: "Sarah Kelly", time: "14:20", pickup: "Grafton St", drop: "Dublin Airport", status: "confirmed" },
  { id: 2, name: "Tom Byrne", time: "15:05", pickup: "St. Stephen's Green", drop: "Ballsbridge", status: "pending" },
  { id: 3, name: "Aoife Ryan", time: "16:40", pickup: "Temple Bar", drop: "Dun Laoghaire", status: "confirmed" },
  { id: 4, name: "Michael Doyle", time: "18:15", pickup: "IFSC", drop: "Malahide", status: "pending" },
];

const weeklyEarnings = [
  { day: "Wed", amount: 96 },
  { day: "Thu", amount: 112 },
  { day: "Fri", amount: 154 },
  { day: "Sat", amount: 189 },
  { day: "Sun", amount: 121 },
  { day: "Mon", amount: 88 },
  { day: "Tue", amount: 138 },
];

const statusBreakdown = [
  { name: "Confirmed", value: 2, color: "#639922" },
  { name: "Pending", value: 2, color: "#BA7517" },
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
    confirmed: { bg: "#EAF3DE", text: "#27500A", label: "Confirmed" },
    pending: { bg: "#FAEEDA", text: "#633806", label: "Pending" },
  };
  const s = map[status] || { bg: "#F1EFE8", text: "#2C2C2A", label: status };
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: s.bg, color: s.text, fontFamily: "Inter" }}>
      {s.label}
    </span>
  );
}

export default function OverviewDashboard({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  useGoogleFont();
  const [online, setOnline] = useState(true);

  return (
    <div className="min-h-[600px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            John's Taxi
          </div>
          <div className="text-sm text-[#5F5E5A]">Wednesday, 19 August</div>
        </div>
        <button
          onClick={() => setOnline(!online)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium cursor-pointer ${online ? "emboss-toggle-on" : "emboss-toggle-off"}`}
          style={{ color: online ? "#3B6D11" : "#5F5E5A" }}
        >
          <Circle size={9} fill={online ? "#639922" : "#B4B2A9"} stroke="none" />
          {online ? "Online — accepting bookings" : "Offline"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Rides today" value="4" />
        <StatCard label="Earnings today" value="€138" sub="+€22 vs yesterday" accent="#3B6D11" />
        <StatCard label="Next pickup" value="42m" sub="Sarah Kelly, Grafton St" accent="#185FA5" />
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
          <div className="mt-1 flex justify-center gap-4 text-xs">
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
            <div className="text-sm font-medium text-[#2C2C2A]">Upcoming bookings</div>
            <button
              onClick={() => onNavigate?.("bookings")}
              className="emboss-btn-primary flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
            >
              <Plus size={13} /> Add booking
            </button>
          </div>
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-[#E4E2DA] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-[#F1EFE8] px-2 py-1 text-xs font-medium text-[#2C2C2A]">
                    {b.time}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#2C2C2A]">{b.name}</div>
                    <div className="flex items-center gap-1 text-xs text-[#5F5E5A]">
                      <MapPin size={11} /> {b.pickup} → {b.drop}
                    </div>
                  </div>
                </div>
                <StatusPill status={b.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E4E2DA] bg-white p-5">
          <div className="mb-3 text-sm font-medium text-[#2C2C2A]">Active trip</div>
          <div className="mb-4 flex h-28 items-center justify-center rounded-lg bg-[#F1EFE8]">
            <Car size={26} color="#185FA5" />
          </div>
          <div className="space-y-2.5 text-xs">
            {["Confirmed", "En route", "Arrived", "Completed"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <Circle size={7} fill={i <= 1 ? "#185FA5" : "#D3D1C7"} stroke="none" />
                <span style={{ color: i <= 1 ? "#2C2C2A" : "#B4B2A9", fontWeight: i <= 1 ? 500 : 400 }}>{step}</span>
              </div>
            ))}
          </div>
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
