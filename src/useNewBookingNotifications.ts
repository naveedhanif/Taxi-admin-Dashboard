import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

export interface BookingNotification {
  id: string;
  passenger_name: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  estimated_fare: number;
}

const ACTIVE_STATUSES = ["pending", "confirmed", "en_route", "arrived", "in_progress"];

/**
 * Subscribes to real-time booking notifications for one driver — fires
 * when a booking actually becomes real (status flips to "pending" after
 * payment is confirmed), not when it's first created.
 *
 * Listens for UPDATE rather than INSERT deliberately: create-booking
 * inserts a row as "awaiting_payment" as soon as the passenger reaches
 * the payment screen, before they've actually paid anything. Notifying
 * the driver at that point would mean they get pinged for bookings that
 * might never be paid for. confirm-booking-payment flips the status to
 * "pending" only after independently verifying the charge with Stripe —
 * that's the real "a passenger just booked you" moment.
 *
 * Also tracks unviewedCount — how many of the driver's active bookings
 * have never been opened (bookings.driver_viewed_at is null). This
 * drives the sidebar badge (e.g. "3" next to Bookings) and, where the
 * browser/OS supports it, the REAL app icon badge on the home screen
 * via the Badging API — the actual "1, 2, 3..." number-on-the-icon
 * behavior. Loaded fresh from the database on mount so it's correct
 * even for bookings that arrived before this tab was open, then kept
 * live via the same realtime subscription used for toasts.
 *
 * NOT LIVE-TESTED against a real websocket connection — this sandbox
 * has no network path to Supabase's realtime endpoint. The
 * subscription code follows Supabase's documented Realtime API
 * exactly; the first real test is two browser tabs open at once, one
 * as the driver, one booking as a passenger.
 *
 * @param driverId - the logged-in driver's own drivers.id (not their
 *   auth user_id — look this up once after login and pass it in)
 */
export function useNewBookingNotifications(driverId: string | null) {
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [unviewedCount, setUnviewedCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refreshUnviewedCount = useCallback(async () => {
    if (!driverId) return;
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", driverId)
      .in("status", ACTIVE_STATUSES)
      .is("driver_viewed_at", null);
    const n = count ?? 0;
    setUnviewedCount(n);

    // Real OS-level app icon badge, where supported (Chrome/Edge on
    // Android and desktop when the PWA is installed to the home screen;
    // NOT supported in Safari/iOS as of this writing — the in-app
    // sidebar badge is the reliable cross-browser fallback for that
    // case). setAppBadge/clearAppBadge fail if called outside an
    // installed-PWA context on some browsers, hence the try/catch.
    if ("setAppBadge" in navigator) {
      try {
        if (n > 0) {
          // @ts-expect-error — Badging API isn't in all TS lib versions yet
          navigator.setAppBadge(n);
        } else {
          // @ts-expect-error
          navigator.clearAppBadge();
        }
      } catch {
        // Fails silently outside an installed-PWA context — expected.
      }
    }
  }, [driverId]);

  useEffect(() => {
    refreshUnviewedCount();
  }, [refreshUnviewedCount]);

  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel(`new-bookings-${driverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `driver_id=eq.${driverId}` },
        (payload) => {
          const oldStatus = (payload.old as { status?: string } | null)?.status;
          const newStatus = (payload.new as { status?: string } | null)?.status;
          // Only the specific transition that means "payment just
          // succeeded" — not every update to a booking (status changes
          // to en_route, completed, etc. are handled elsewhere and
          // shouldn't re-trigger the new-booking notification).
          if (oldStatus === "awaiting_payment" && newStatus === "pending") {
            const booking = payload.new as BookingNotification;
            setNotifications((prev) => [booking, ...prev]);
            audioRef.current?.play().catch(() => {
              // Browsers block autoplay until the user has interacted with
              // the page at least once — this fails silently the first
              // time, which is expected and fine.
            });
          }
          // Any change to this driver's bookings (new pending booking,
          // status moving on, driver_viewed_at being set) can shift the
          // unviewed count — simplest to just re-derive it from the
          // database rather than try to patch it incrementally here.
          refreshUnviewedCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, refreshUnviewedCount]);

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return { notifications, dismiss, audioRef, unviewedCount, refreshUnviewedCount };
}

