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

  // iOS ties the Badging API to notification permission: setAppBadge()
  // silently no-ops on iOS until the user has granted notifications,
  // even though the call itself never throws. Ask once per session as
  // soon as we know who's logged in — Notification.requestPermission()
  // is allowed here without a click gesture on iOS/Android, unlike some
  // desktop browsers, so this is safe to fire from an effect.
  useEffect(() => {
    if (!driverId) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // User dismissed or platform blocked it — badge just won't
        // show on the home screen icon; sidebar badge still works.
      });
    }
  }, [driverId]);

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

    // Real OS-level app icon badge. Supported on Chrome/Edge desktop
    // and, since iOS/iPadOS 16.4, on Safari home-screen web apps too —
    // but iOS requires notification permission to be granted first (see
    // the effect above) or the call silently no-ops. NOT supported on
    // Chrome for Android. The in-app sidebar badge is the reliable
    // cross-platform fallback everywhere this isn't available.
    // setAppBadge/clearAppBadge fail if called outside an installed-PWA
    // context on some browsers, hence the try/catch.
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

            // Sound + vibration — a silent toast is easy to miss if the
            // driver isn't looking at the screen, same reason Uber's
            // driver app leans hard on audio for new ride requests. The
            // repeat after 900ms is deliberate: one short chime is easy
            // to miss entirely; two makes it register as "something
            // happened" without becoming a persistent siren.
            const playAlert = () =>
              audioRef.current?.play().catch(() => {
                // Browsers block autoplay until the user has interacted
                // with the page at least once — fails silently the
                // first time, which is expected and fine.
              });
            playAlert();
            setTimeout(playAlert, 900);

            if ("vibrate" in navigator) {
              try {
                navigator.vibrate([120, 80, 120]);
              } catch {
                // Not supported on this device/browser — ignore.
              }
            }
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

