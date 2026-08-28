import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Calendar, Clock, ArrowUpDown, Filter, ChevronRight, User, Phone, Loader2, AlertCircle, Wallet, Check, Banknote, CreditCard, MessageCircle, CheckCircle2, Navigation, FlagTriangleRight, XCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { formatPhoneForLinks } from "../phoneLinks";

export interface Booking {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  estimated_fare: number | null;
  final_fare: number | null;
  status: "pending" | "confirmed" | "en_route" | "arrived" | "in_progress" | "completed" | "canceled";
  payment_timing: "now" | "later";
  payment_method: "card" | "cash" | null;
  deposit_amount: number;
  deposit_payment_status: "unpaid" | "paid" | "refunded" | "forfeited";
  balance_due: number | null;
  balance_collected: boolean;
  driver_viewed_at: string | null;
}

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
      .emboss-selected {
        box-shadow: inset 2.5px 2.5px 6px rgba(44,44,42,0.20), inset -2px -2px 5px rgba(255,255,255,0.6) !important;
        cursor: default !important;
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

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

const VALID_STATUS_FILTERS = ["all", "pending", "confirmed", "en_route", "arrived", "in_progress", "completed", "canceled"];

export default function AllBookingsScreen({ driverId }: { driverId: string | null }) {
  useGoogleFont();
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Persisted per driver, same pattern and same reason as
  // App.tsx's dashboardScreen fix: iOS reloads a backgrounded PWA's
  // page from scratch under memory pressure, wiping every in-memory
  // React state. Restoring WHICH TAB to land on (the earlier fix)
  // wasn't enough on its own — this component still remounted with
  // its filter reset to defaults every time. Lazy-initialized from
  // localStorage so a fresh reload restores the actual filter/search/
  // sort instead of defaulting back to "all".
  const [filterStatus, setFilterStatus] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`taxi_admin_bookings_filter_${driverId}`);
      return saved && VALID_STATUS_FILTERS.includes(saved) ? saved : "all";
    } catch {
      return "all";
    }
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      return localStorage.getItem(`taxi_admin_bookings_search_${driverId}`) || "";
    } catch {
      return "";
    }
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    try {
      const saved = localStorage.getItem(`taxi_admin_bookings_sort_${driverId}`);
      return saved === "desc" ? "desc" : "asc";
    } catch {
      return "asc";
    }
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  // Only auto-reopen the detail modal ONCE, right after the initial
  // load restores it — not on every later realtime refresh. A ref
  // (not state) is required here: this flag is read inside a closure
  // created once per driverId effect run, so a useState value would
  // stay stale at its original "false" for every later realtime-
  // triggered call within that same effect run, incorrectly reopening
  // the modal every time even right after manually closing it.
  const hasRestoredSelectionRef = useRef(false);

  useEffect(() => {
    if (!driverId) return;
    try {
      if (selectedBooking) {
        localStorage.setItem(`taxi_admin_selected_booking_${driverId}`, selectedBooking.id);
      } else {
        localStorage.removeItem(`taxi_admin_selected_booking_${driverId}`);
      }
    } catch {
      // Ignore — storage unavailable, this just means a reload won't
      // reopen whichever booking detail was open.
    }
  }, [selectedBooking, driverId]);

  useEffect(() => {
    if (!driverId) return;
    try {
      localStorage.setItem(`taxi_admin_bookings_filter_${driverId}`, filterStatus);
    } catch {
      // Ignore — storage unavailable, this just means the next reload
      // falls back to the default instead of persisting.
    }
  }, [filterStatus, driverId]);

  useEffect(() => {
    if (!driverId) return;
    try {
      localStorage.setItem(`taxi_admin_bookings_search_${driverId}`, searchQuery);
    } catch {
      // Ignore.
    }
  }, [searchQuery, driverId]);

  useEffect(() => {
    if (!driverId) return;
    try {
      localStorage.setItem(`taxi_admin_bookings_sort_${driverId}`, sortOrder);
    } catch {
      // Ignore.
    }
  }, [sortOrder, driverId]);

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function loadBookings() {
      setLoading(true);
      setErrorMessage("");
      const { data, error } = await supabase
        .from("bookings")
        .select("id, passenger_name, passenger_phone, pickup_address, dropoff_address, scheduled_time, estimated_fare, final_fare, status, payment_timing, payment_method, deposit_amount, deposit_payment_status, balance_due, balance_collected, driver_viewed_at")
        .eq("driver_id", driverId)
        // Exclude bookings the passenger hasn't actually paid for yet —
        // a booking sits in "awaiting_payment" between PaymentIntent
        // creation and the passenger confirming payment; it only
        // becomes a real booking once confirm-booking-payment verifies
        // the charge with Stripe and flips it to "pending". Showing it
        // here before that would mean a driver "receives" bookings
        // nobody has paid for.
        .neq("status", "awaiting_payment")
        .order("scheduled_time", { ascending: true });

      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
      } else {
        const list = (data ?? []) as Booking[];
        setBookingsList(list);

        if (!hasRestoredSelectionRef.current) {
          hasRestoredSelectionRef.current = true;
          try {
            const savedId = localStorage.getItem(`taxi_admin_selected_booking_${driverId}`);
            if (savedId) {
              const match = list.find((b) => b.id === savedId);
              if (match) setSelectedBooking(match);
            }
          } catch {
            // Ignore.
          }
        }
      }
      setLoading(false);
    }

    loadBookings();

    // Live updates: new bookings and status changes from the passenger
    // app / other tabs show up here without a manual refresh.
    const channel = supabase
      .channel(`driver-bookings-${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `driver_id=eq.${driverId}` },
        () => loadBookings()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

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

  // Marks a booking as viewed the moment the driver opens its details —
  // this is what clears it from the unviewed-count badge (sidebar +
  // real app icon badge, see useNewBookingNotifications.ts). Only
  // writes once per booking (skips if already viewed) to avoid
  // needless updates on every re-open.
  async function handleSelectBooking(booking: Booking) {
    setSelectedBooking(booking);
    if (!booking.driver_viewed_at) {
      const viewedAt = new Date().toISOString();
      const { error } = await supabase.from("bookings").update({ driver_viewed_at: viewedAt }).eq("id", booking.id);
      if (!error) {
        setBookingsList((prev) => prev.map((b) => (b.id === booking.id ? { ...b, driver_viewed_at: viewedAt } : b)));
        setSelectedBooking((prev) => (prev ? { ...prev, driver_viewed_at: viewedAt } : null));
      }
    }
  }

  const updateBookingStatus = async (id: string, newStatus: Booking["status"]) => {
    setUpdatingId(id);    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", id);
    setUpdatingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setBookingsList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Cancelling used to go through updateBookingStatus above — a plain
  // `status = "canceled"` update with NO refund at all. This platform
  // charges passengers via Stripe Connect destination charges
  // (create-booking), so cancelling without refunding just leaves their
  // money captured with nothing paying it back. This calls the shared
  // cancel-booking Edge Function instead, which actually issues a
  // Stripe refund (reversing the Connect transfer + platform fee) for
  // whatever was charged, then updates the booking's status. Used by
  // both this dashboard and the passenger app's own self-cancel, so
  // refund behavior can't drift between the two.
  const cancelBookingWithRefund = async (id: string) => {
    setUpdatingId(id);
    setErrorMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setUpdatingId(null);
      setErrorMessage("Your session expired — please refresh and sign in again before cancelling.");
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-booking`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ booking_id: id }),
      }
    ).then((r) => r.json());

    setUpdatingId(null);

    if (response.error) {
      setErrorMessage(response.error);
      return;
    }
    if (response.refundError) {
      setErrorMessage(
        `Booking cancelled, but the automatic refund failed: ${response.refundError}. You may need to refund the passenger manually from your Stripe dashboard.`
      );
    }

    setBookingsList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "canceled" } : b))
    );
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => (prev ? { ...prev, status: "canceled" } : null));
    }
  };

  // For pay-later bookings: the driver collects the remaining balance
  // directly (cash or card reader) after the ride, outside Stripe — this
  // just records how it was paid, it doesn't move any money itself.
  const markBalanceCollected = async (id: string, method: "cash" | "card") => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("bookings")
      .update({ payment_method: method, balance_collected: true })
      .eq("id", id);
    setUpdatingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setBookingsList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, payment_method: method, balance_collected: true } : b))
    );
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking((prev) => (prev ? { ...prev, payment_method: method, balance_collected: true } : null));
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

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg p-3 text-xs" style={{ background: "#FCEBEB", color: "#791F1F" }}>
            <AlertCircle size={14} /> {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#5F5E5A]">
              <Loader2 size={16} className="animate-spin" /> Loading bookings…
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#5F5E5A]">
              {bookingsList.length === 0 ? "No bookings yet." : "No bookings match your filter criteria."}
            </div>
          ) : (
            filteredBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => handleSelectBooking(b)}
                className="emboss-btn flex cursor-pointer flex-col justify-between gap-3 rounded-xl p-4 transition-all md:flex-row md:items-center"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-[#F1EFE8] px-2.5 py-1.5 text-center text-xs font-semibold text-[#2C2C2A]">
                    <div className="flex items-center gap-1">
                      <Clock size={11} className="text-[#5F5E5A]" />
                      <span>{formatTime(b.scheduled_time)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#2C2C2A]">{b.passenger_name}</span>
                      <span className="text-[11px] font-mono text-[#B4B2A9]">{b.id.slice(0, 8)}</span>
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
                    <div className="text-sm font-bold text-[#2C2C2A]">
                      €{(b.final_fare ?? b.estimated_fare ?? 0).toFixed(2)}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <StatusPill status={b.status} />
                      {b.payment_timing === "later" && (
                        <span
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: b.balance_collected ? "#EAF3DE" : "#FAEEDA",
                            color: b.balance_collected ? "#27500A" : "#633806",
                          }}
                        >
                          <Wallet size={9} /> {b.balance_collected ? "Collected" : "Pay in taxi"}
                        </span>
                      )}
                    </div>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#E4E2DA] bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-[#E4E2DA] pb-3">
              <div>
                <div className="text-xs font-mono text-[#5F5E5A]">{selectedBooking.id.slice(0, 8)}</div>
                <h3 className="text-lg font-bold text-[#2C2C2A]" style={{ fontFamily: "'Space Grotesk'" }}>
                  {selectedBooking.passenger_name}
                </h3>
              </div>
              <StatusPill status={selectedBooking.status} />
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-[#5F5E5A]">
                  <Phone size={14} className="text-[#185FA5]" />
                  <span className="text-sm font-medium text-[#2C2C2A]">{selectedBooking.passenger_phone}</span>
                </div>
                {(() => {
                  const links = formatPhoneForLinks(selectedBooking.passenger_phone);
                  if (!links) return null;
                  return (
                    <div className="grid grid-cols-2 gap-2.5">
                      <a
                        href={`tel:${links.tel}`}
                        className="emboss-btn flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold text-[#2C2C2A]"
                      >
                        <Phone size={16} /> Call
                      </a>
                      <a
                        href={`https://wa.me/${links.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold text-white"
                        style={{ background: "#25D366", boxShadow: "3px 3px 7px rgba(37,211,102,0.35), -2px -2px 5px rgba(255,255,255,0.5)" }}
                      >
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    </div>
                  );
                })()}
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
                <span className="font-bold text-[#2C2C2A]">{formatDateTime(selectedBooking.scheduled_time)}</span>
              </div>

              <div className="flex justify-between items-center rounded-lg border border-[#E4E2DA] p-3">
                <span className="text-[#5F5E5A]">{selectedBooking.final_fare != null ? "Final Fare" : "Estimated Fare"}</span>
                <span className="text-base font-bold text-[#2C2C2A]">
                  €{(selectedBooking.final_fare ?? selectedBooking.estimated_fare ?? 0).toFixed(2)}
                </span>
              </div>

              {selectedBooking.payment_timing === "later" && (
                <div className="rounded-lg border border-[#E4E2DA] bg-[#FAEEDA] p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#633806]">
                    <Wallet size={11} /> Pay in taxi — deposit booking
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F5E5A]">Deposit paid (Stripe)</span>
                    <span className="font-semibold text-[#2C2C2A]">€{Number(selectedBooking.deposit_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F5E5A]">Balance owed to you</span>
                    <span className="font-semibold text-[#2C2C2A]">€{Number(selectedBooking.balance_due ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-dashed border-[#E4C99A]">
                    <span className="text-[#5F5E5A]">Collected?</span>
                    {selectedBooking.balance_collected ? (
                      <span className="flex items-center gap-1 font-semibold text-[#27500A]">
                        <Check size={12} /> Yes, via {selectedBooking.payment_method}
                      </span>
                    ) : (
                      <span className="font-semibold text-[#991B1B]">Not yet</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedBooking.payment_timing === "later" && !selectedBooking.balance_collected && (
              <div className="mt-5 border-t border-[#E4E2DA] pt-4">
                <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#5F5E5A]">
                  Mark balance as collected:
                  {updatingId === selectedBooking.id && <Loader2 size={12} className="animate-spin" />}
                </div>
                {selectedBooking.status !== "completed" && (
                  <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-[#8C8977]">
                    <AlertCircle size={12} /> Available once the trip is marked Complete below — collecting
                    before the ride happens risks marking it paid too early.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={updatingId === selectedBooking.id || selectedBooking.status !== "completed"}
                    onClick={() => markBalanceCollected(selectedBooking.id, "cash")}
                    className="emboss-btn flex flex-col items-center justify-center gap-1.5 rounded-xl py-4 text-sm font-semibold text-[#2C2C2A] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Banknote size={20} /> Paid cash
                  </button>
                  <button
                    disabled={updatingId === selectedBooking.id || selectedBooking.status !== "completed"}
                    onClick={() => markBalanceCollected(selectedBooking.id, "card")}
                    className="emboss-btn flex flex-col items-center justify-center gap-1.5 rounded-xl py-4 text-sm font-semibold text-[#2C2C2A] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CreditCard size={20} /> Paid by card
                  </button>
                </div>
              </div>
            )}

            {/* Status Action Buttons — each one now reflects the booking's
                ACTUAL current status (previously "Confirm" always looked
                selected/blue no matter what the real status was, which is
                exactly the mismatch visible when a booking was already
                En Route). Buttons now disable based on where the
                booking's status sits in the natural progression
                (pending → confirmed → en_route → arrived → in_progress
                → completed), not just an exact match — a booking that's
                already En Route keeps "Confirm" locked too, instead of
                it re-enabling the moment the status moves past it. */}
            <div className="mt-5 border-t border-[#E4E2DA] pt-4">
              <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#5F5E5A]">
                Update Booking Status:
                {updatingId === selectedBooking.id && <Loader2 size={12} className="animate-spin" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const isBusy = updatingId === selectedBooking.id;
                  const isCurrent = (s: Booking["status"]) => selectedBooking.status === s;
                  // Natural forward progression. "canceled" is handled
                  // separately below since it isn't part of this
                  // sequence — a booking can be cancelled from almost
                  // any point, not just reached in order.
                  const STATUS_ORDER: Record<string, number> = {
                    pending: 0,
                    confirmed: 1,
                    en_route: 2,
                    arrived: 3,
                    in_progress: 4,
                    completed: 5,
                  };
                  const currentRank = STATUS_ORDER[selectedBooking.status] ?? -1;
                  const isCanceled = selectedBooking.status === "canceled";
                  // Reached or passed this stage already — including
                  // being cancelled, since none of these forward
                  // actions make sense on a cancelled booking either.
                  const isLocked = (s: keyof typeof STATUS_ORDER) => isCanceled || currentRank >= STATUS_ORDER[s];
                  return (
                    <>
                      <button
                        disabled={isBusy || isLocked("confirmed")}
                        onClick={() => updateBookingStatus(selectedBooking.id, "confirmed")}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-4 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-90 ${
                          isCurrent("confirmed")
                            ? "emboss-btn emboss-selected text-[#185FA5] bg-[#E1F0FF]"
                            : isLocked("confirmed")
                            ? "emboss-btn text-[#8C8977]"
                            : "emboss-btn-primary text-white"
                        }`}
                      >
                        <CheckCircle2 size={20} />
                        {isCurrent("confirmed") ? "Confirmed" : "Confirm"}
                      </button>
                      <button
                        disabled={isBusy || isLocked("en_route")}
                        onClick={() => updateBookingStatus(selectedBooking.id, "en_route")}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-4 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-90 emboss-btn ${
                          isCurrent("en_route")
                            ? "emboss-selected bg-[#E1F0FF] text-[#0C4A6E]"
                            : isLocked("en_route")
                            ? "text-[#8C8977]"
                            : "text-[#2C2C2A]"
                        }`}
                      >
                        <Navigation size={20} />
                        {isCurrent("en_route") ? "En Route" : "Mark En Route"}
                      </button>
                      <button
                        disabled={isBusy || isLocked("completed")}
                        onClick={() => updateBookingStatus(selectedBooking.id, "completed")}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-4 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-90 emboss-btn ${
                          isCurrent("completed")
                            ? "emboss-selected text-[#27500A] bg-[#EAF3DE]"
                            : isLocked("completed")
                            ? "text-[#8C8977]"
                            : "text-[#27500A] bg-[#EAF3DE]"
                        }`}
                      >
                        <FlagTriangleRight size={20} />
                        {isCurrent("completed") ? "Completed" : "Complete"}
                      </button>
                      <button
                        disabled={isBusy || isCanceled || selectedBooking.status === "completed"}
                        onClick={() => {
                          if (window.confirm("Cancel this booking and refund the passenger?")) {
                            cancelBookingWithRefund(selectedBooking.id);
                          }
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-4 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-90 emboss-btn ${
                          isCanceled ? "emboss-selected bg-[#FEE2E2] text-[#991B1B]" : "text-[#991B1B]"
                        }`}
                      >
                        <XCircle size={20} />
                        {isCanceled ? "Cancelled" : "Cancel"}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="emboss-btn rounded-xl px-6 py-3 text-sm font-semibold text-[#2C2C2A] cursor-pointer"
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
