import { useState, useEffect } from "react";
import { Search, MapPin, Calendar, Clock, ArrowUpDown, Filter, ChevronRight, User, Phone } from "lucide-react";

export interface Booking {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  quoted_price: number;
  status: "pending" | "confirmed" | "en_route" | "arrived" | "in_progress" | "completed" | "canceled";
}

const initialBookings: Booking[] = [
  { id: "BK-101", passenger_name: "Sarah Kelly", passenger_phone: "+353 87 123 4567", pickup_address: "Grafton St, Dublin", dropoff_address: "Dublin Airport T1", scheduled_time: "2026-08-19 14:20", quoted_price: 38.50, status: "confirmed" },
  { id: "BK-102", passenger_name: "Tom Byrne", passenger_phone: "+353 86 987 6543", pickup_address: "St. Stephen's Green", dropoff_address: "Ballsbridge Hotel", scheduled_time: "2026-08-19 15:05", quoted_price: 18.00, status: "pending" },
  { id: "BK-103", passenger_name: "Aoife Ryan", passenger_phone: "+353 85 555 1212", pickup_address: "Temple Bar", dropoff_address: "Dun Laoghaire Pier", scheduled_time: "2026-08-19 16:40", quoted_price: 32.00, status: "confirmed" },
  { id: "BK-104", passenger_name: "Michael Doyle", passenger_phone: "+353 87 888 9900", pickup_address: "IFSC Quarter", dropoff_address: "Malahide Castle", scheduled_time: "2026-08-19 18:15", quoted_price: 45.00, status: "pending" },
  { id: "BK-105", passenger_name: "Liam O'Connor", passenger_phone: "+353 89 222 3344", pickup_address: "Dundrum Town Centre", dropoff_address: "Sandyford Business Park", scheduled_time: "2026-08-19 19:30", quoted_price: 22.50, status: "en_route" },
  { id: "BK-106", passenger_name: "Emma Walsh", passenger_phone: "+353 83 444 5566", pickup_address: "Grand Canal Dock", dropoff_address: "Howth Summit", scheduled_time: "2026-08-19 21:00", quoted_price: 40.00, status: "arrived" },
  { id: "BK-107", passenger_name: "Ciaran Murphy", passenger_phone: "+353 87 111 2233", pickup_address: "Heuston Station", dropoff_address: "Ranelagh Village", scheduled_time: "2026-08-19 11:15", quoted_price: 16.50, status: "completed" },
  { id: "BK-108", passenger_name: "David Smith", passenger_phone: "+353 86 333 4455", pickup_address: "Connolly Station", dropoff_address: "Rathmines", scheduled_time: "2026-08-19 09:30", quoted_price: 14.00, status: "canceled" },
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

function StatusPill({ status }: { status: Booking["status"] }) {
  const map: Record<Booking["status"], { bg: string; text: string; label: string }> = {
    confirmed: { bg: "#EAF3DE", text: "#27500A", label: "Confirmed" },
    pending: { bg: "#FAEEDA", text: "#633806", label: "Pending" },
    en_route: { bg: "#E1F0FF", text: "#0C4A6E", label: "En Route" },
    arrived: { bg: "#F3E8FF", text: "#581C87", label: "Arrived" },
    in_progress: { bg: "#E0F2FE", text: "#0369A1", label: "In Progress" },
    completed: { bg: "#F1EFE8", text: "#2C2C2A", label: "Completed" },
    canceled: { bg: "#FEE2E2", text: "#991B1B", label: "Canceled" },
  };
  const s = map[status] || { bg: "#F1EFE8", text: "#2C2C2A", label: status };
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ backgroundColor: s.bg, color: s.text, fontFamily: "Inter" }}
    >
      {s.label}
    </span>
  );
}

export default function AllBookingsScreen() {
  useGoogleFont();
  const [bookingsList, setBookingsList] = useState<Booking[]>(initialBookings);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filterOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "en_route", label: "En Route" },
    { value: "arrived", label: "Arrived" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "canceled", label: "Canceled" },
  ];

  const filteredBookings = bookingsList
    .filter((b) => {
      const matchesStatus = filterStatus === "all" || b.status === filterStatus;
      const matchesSearch =
        b.passenger_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.pickup_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.dropoff_address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const timeA = new Date(a.scheduled_time).getTime();
      const timeB = new Date(b.scheduled_time).getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

  const updateBookingStatus = (id: string, newStatus: Booking["status"]) => {
    setBookingsList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  return (
    <div className="min-h-[600px] w-full p-6" style={{ backgroundColor: "#F7F7F5", fontFamily: "Inter" }}>
      <EmbossStyles />

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'", fontWeight: 700 }}>
            All Bookings
          </h1>
          <p className="text-sm text-[#5F5E5A]">Manage passenger pre-bookings and schedule dispatch</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="emboss-btn flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer"
          >
            <ArrowUpDown size={13} /> Sort: {sortOrder === "asc" ? "Earliest first" : "Latest first"}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search passenger name, pickup or dropoff..."
            className="emboss-input w-full rounded-xl px-3.5 py-2.5 pl-10 text-xs text-[#2C2C2A] placeholder-[#B4B2A9]"
          />
          <Search size={15} className="absolute left-3.5 top-3 text-[#B4B2A9]" />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="emboss-input w-full rounded-xl px-3.5 py-2.5 pr-8 text-xs font-medium text-[#2C2C2A] appearance-none"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Filter size={14} className="absolute right-3.5 top-3.5 text-[#5F5E5A] pointer-events-none" />
        </div>
      </div>

      {/* Bookings List Card */}
      <div className="rounded-xl border border-[#E4E2DA] bg-white p-5">
        <div className="mb-4 flex items-center justify-between text-xs text-[#5F5E5A]">
          <span>Showing {filteredBookings.length} bookings</span>
          <span>Filtered by: <strong className="text-[#2C2C2A] capitalize">{filterStatus}</strong></span>
        </div>

        <div className="space-y-3">
          {filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#5F5E5A]">
              No bookings match your filter criteria.
            </div>
          ) : (
            filteredBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBooking(b)}
                className="flex flex-col justify-between rounded-lg border border-[#E4E2DA] p-4 transition-all hover:border-[#185FA5]/40 md:flex-row md:items-center gap-3 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-[#F1EFE8] px-2.5 py-1.5 text-center text-xs font-semibold text-[#2C2C2A]">
                    <div className="flex items-center gap-1">
                      <Clock size={11} className="text-[#5F5E5A]" />
                      <span>{b.scheduled_time.split(" ")[1]}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#2C2C2A]">{b.passenger_name}</span>
                      <span className="text-[11px] font-mono text-[#B4B2A9]">{b.id}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5F5E5A]">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-[#185FA5]" /> {b.pickup_address}
                      </span>
                      <span>→</span>
                      <span>{b.dropoff_address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 md:justify-end">
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#2C2C2A]">€{b.quoted_price.toFixed(2)}</div>
                    <StatusPill status={b.status} />
                  </div>
                  <ChevronRight size={16} className="text-[#B4B2A9]" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E4E2DA] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#E4E2DA] pb-3">
              <div>
                <div className="text-xs font-mono text-[#5F5E5A]">{selectedBooking.id}</div>
                <h3 className="text-lg font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                  {selectedBooking.passenger_name}
                </h3>
              </div>
              <StatusPill status={selectedBooking.status} />
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2 text-[#5F5E5A]">
                <Phone size={14} className="text-[#185FA5]" />
                <span className="font-medium text-[#2C2C2A]">{selectedBooking.passenger_phone}</span>
              </div>

              <div className="rounded-lg bg-[#F1EFE8] p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="mt-0.5 text-[#185FA5]" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#5F5E5A]">Pickup</div>
                    <div className="font-medium text-[#2C2C2A]">{selectedBooking.pickup_address}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="mt-0.5 text-[#639922]" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#5F5E5A]">Dropoff</div>
                    <div className="font-medium text-[#2C2C2A]">{selectedBooking.dropoff_address}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center rounded-lg border border-[#E4E2DA] p-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[#5F5E5A]" />
                  <span className="text-[#5F5E5A]">Scheduled Time</span>
                </div>
                <span className="font-bold text-[#2C2C2A]">{selectedBooking.scheduled_time}</span>
              </div>

              <div className="flex justify-between items-center rounded-lg border border-[#E4E2DA] p-3">
                <span className="text-[#5F5E5A]">Quoted Price</span>
                <span className="text-base font-bold text-[#2C2C2A]">€{selectedBooking.quoted_price.toFixed(2)}</span>
              </div>
            </div>

            {/* Status Action Buttons */}
            <div className="mt-5 border-t border-[#E4E2DA] pt-4">
              <div className="mb-2 text-xs font-semibold text-[#5F5E5A]">Update Booking Status:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateBookingStatus(selectedBooking.id, "confirmed")}
                  className="emboss-btn-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  onClick={() => updateBookingStatus(selectedBooking.id, "en_route")}
                  className="emboss-btn rounded-lg px-3 py-1.5 text-xs font-medium text-[#2C2C2A] cursor-pointer"
                >
                  Mark En Route
                </button>
                <button
                  onClick={() => updateBookingStatus(selectedBooking.id, "completed")}
                  className="emboss-btn rounded-lg px-3 py-1.5 text-xs font-medium text-[#27500A] bg-[#EAF3DE] cursor-pointer"
                >
                  Complete
                </button>
                <button
                  onClick={() => updateBookingStatus(selectedBooking.id, "canceled")}
                  className="emboss-btn rounded-lg px-3 py-1.5 text-xs font-medium text-[#991B1B] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="emboss-btn rounded-lg px-4 py-2 text-xs font-medium text-[#2C2C2A] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
