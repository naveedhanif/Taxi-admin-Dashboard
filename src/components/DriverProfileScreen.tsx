import { useState, useEffect } from "react";
import { Star, Car, TrendingUp, Percent, Users, Loader2, Circle, ChevronRight, Clock } from "lucide-react";
import { supabase } from "../supabaseClient";

// New "Profile" nav item, built to match the reference layout you
// shared — centered avatar/name/rating, a primary status action, a
// quick-action tile row, a vehicle card, and recent history — kept in
// this project's existing light/embossed theme rather than the dark
// reference image's colors, per your earlier instruction. Every field
// is real data (drivers/vehicles/bookings), nothing fabricated —
// stats reuse the same real aggregation approach already used on the
// Earnings/Customers pages.

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);
}

function EmbossStyles() {
  return (
    <style>{`
      .emboss-btn { background: #F0EEE7; border: none; box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85); transition: box-shadow 0.12s ease, transform 0.08s ease; }
      .emboss-btn:active { box-shadow: inset 2px 2px 4px rgba(44,44,42,0.18), inset -2px -2px 4px rgba(255,255,255,0.7); transform: translateY(1px); }
      .emboss-toggle-on { background: #EAF3DE; border: none; box-shadow: 2px 2px 5px rgba(59,109,17,0.22), -2px -2px 5px rgba(255,255,255,0.8); }
      .emboss-toggle-off { background: #F0EEE7; border: none; box-shadow: 3px 3px 6px rgba(44,44,42,0.14), -3px -3px 6px rgba(255,255,255,0.85); }
    `}</style>
  );
}

function initials(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

interface Vehicle {
  make: string;
  model: string;
  color: string | null;
  plate: string | null;
  photo_url: string | null;
}

export default function DriverProfileScreen({ driverId, onNavigate }: { driverId: string | null; onNavigate?: (screen: string) => void }) {
  useGoogleFont();
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [online, setOnline] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [recentBookings, setRecentBookings] = useState<{ id: string; passenger_name: string; status: string; final_fare: number | null; estimated_fare: number; scheduled_time: string }[]>([]);

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [{ data: driver }, { data: vehicleData }, { count: completedCount }, { data: bookings }] = await Promise.all([
        supabase.from("drivers").select("business_name, photo_url, avg_rating, review_count, is_online").eq("id", driverId).single(),
        supabase.from("vehicles").select("make, model, color, plate, photo_url").eq("driver_id", driverId).eq("is_active", true).maybeSingle(),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("driver_id", driverId).eq("status", "completed"),
        supabase
          .from("bookings")
          .select("id, passenger_name, status, final_fare, estimated_fare, scheduled_time")
          .eq("driver_id", driverId)
          .order("scheduled_time", { ascending: false })
          .limit(5),
      ]);
      if (driver) {
        setBusinessName(driver.business_name ?? "");
        setPhotoUrl(driver.photo_url ?? null);
        setAvgRating(driver.avg_rating != null ? Number(driver.avg_rating) : null);
        setReviewCount(Number(driver.review_count ?? 0));
        setOnline(driver.is_online);
      }
      setVehicle(vehicleData ?? null);
      setTotalTrips(completedCount ?? 0);
      setRecentBookings(bookings ?? []);
      setLoading(false);
    })();
  }, [driverId]);

  async function handleToggleOnline() {
    const newValue = !online;
    setOnline(newValue);
    if (driverId) await supabase.from("drivers").update({ is_online: newValue }).eq("id", driverId);
  }

  if (loading) {
    return <div className="flex min-h-[500px] items-center justify-center text-sm text-[#5F5E5A]"><Loader2 size={16} className="mr-2 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-md p-4 sm:p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Avatar / name / rating */}
      <div className="mb-6 flex flex-col items-center text-center">
        {photoUrl ? (
          <img src={photoUrl} alt={businessName} className="mb-3 h-24 w-24 rounded-full object-cover" style={{ border: "3px solid white", boxShadow: "3px 3px 10px rgba(44,44,42,0.15)" }} />
        ) : (
          <div
            className="mb-3 flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #378ADD, #0C447C)", fontFamily: "'Space Grotesk'" }}
          >
            {initials(businessName)}
          </div>
        )}
        <div className="text-xl font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>{businessName || "Driver"}</div>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-[#5F5E5A]">
          {avgRating != null && (
            <span className="flex items-center gap-1"><Star size={13} fill="#BA7517" stroke="none" /> {avgRating.toFixed(2)}</span>
          )}
          {avgRating != null && <span>·</span>}
          <span>{totalTrips} trips</span>
        </div>
      </div>

      {/* Online toggle — primary action, matching the reference's "Go online" button */}
      <button
        onClick={handleToggleOnline}
        className={`mb-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold cursor-pointer ${online ? "emboss-toggle-on" : "emboss-toggle-off"}`}
        style={{ color: online ? "#3B6D11" : "#5F5E5A" }}
      >
        <Circle size={9} fill={online ? "#639922" : "#B4B2A9"} stroke="none" />
        {online ? "Online" : "Offline — tap to go online"}
      </button>

      {/* Quick action tiles */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <button onClick={() => onNavigate?.("earnings")} className="emboss-btn flex flex-col items-center gap-1.5 rounded-xl py-4 text-xs font-semibold text-[#2C2C2A]">
          <TrendingUp size={18} className="text-[#185FA5]" /> Earnings
        </button>
        <button onClick={() => onNavigate?.("customers")} className="emboss-btn flex flex-col items-center gap-1.5 rounded-xl py-4 text-xs font-semibold text-[#2C2C2A]">
          <Users size={18} className="text-[#185FA5]" /> Customers
        </button>
        <button onClick={() => onNavigate?.("settings")} className="emboss-btn flex flex-col items-center gap-1.5 rounded-xl py-4 text-xs font-semibold text-[#2C2C2A]">
          <Percent size={18} className="text-[#185FA5]" /> Fare Rules
        </button>
      </div>

      {/* Vehicle card */}
      {vehicle ? (
        <div className="mb-5 flex items-center justify-between rounded-xl p-4" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
          <div>
            <div className="text-sm font-bold text-[#2C2C2A]">{vehicle.make} {vehicle.model}</div>
            <div className="text-xs text-[#8C8977]">{vehicle.color ? `${vehicle.color} · ` : ""}{vehicle.plate || "No plate on file"}</div>
          </div>
          {vehicle.photo_url ? (
            <img src={vehicle.photo_url} alt="Vehicle" className="h-12 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-16 items-center justify-center rounded-lg" style={{ background: "#F0EEE7" }}>
              <Car size={20} color="#8C8977" />
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => onNavigate?.("settings")} className="mb-5 flex w-full items-center justify-between rounded-xl p-4 text-left" style={{ background: "#FAEEDA", border: "1px solid #F0D9A8" }}>
          <span className="text-xs font-semibold text-[#633806]">No vehicle added yet — tap to add one</span>
          <ChevronRight size={14} color="#633806" />
        </button>
      )}

      {/* History */}
      <div className="mb-2 text-xs font-semibold text-[#5F5E5A]">Recent history</div>
      {recentBookings.length === 0 ? (
        <div className="rounded-xl py-8 text-center text-xs text-[#8C8977]" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>No bookings yet.</div>
      ) : (
        <div className="space-y-2">
          {recentBookings.map((b) => (
            <div key={b.id} className="rounded-xl p-3.5" style={{ background: "#FBFAF6", border: "1px solid #ECE9E0" }}>
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                  style={{
                    background: b.status === "completed" ? "#EAF3DE" : b.status === "canceled" ? "#FCEBEB" : "#F1EFE8",
                    color: b.status === "completed" ? "#27500A" : b.status === "canceled" ? "#791F1F" : "#5F5E5A",
                  }}
                >
                  {b.status.replace("_", " ")}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#8C8977]"><Clock size={10} /> {new Date(b.scheduled_time).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#2C2C2A]">€{Number(b.final_fare ?? b.estimated_fare ?? 0).toFixed(2)}</span>
                <span className="text-xs text-[#8C8977]">{b.passenger_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
