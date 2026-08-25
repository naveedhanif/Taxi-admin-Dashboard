import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

export interface BookingNotification {
  id: string;
  passenger_name: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  estimated_fare: number;
}

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return { notifications, dismiss, audioRef };
}

