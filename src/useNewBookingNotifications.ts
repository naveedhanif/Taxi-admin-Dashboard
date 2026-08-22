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
 * Subscribes to real-time booking INSERT events for one driver.
 * This is what makes "customer books → driver gets notified instantly"
 * actually work — no polling, no refresh needed.
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
        { event: "INSERT", schema: "public", table: "bookings", filter: `driver_id=eq.${driverId}` },
        (payload) => {
          const booking = payload.new as BookingNotification;
          setNotifications((prev) => [booking, ...prev]);
          audioRef.current?.play().catch(() => {
            // Browsers block autoplay until the user has interacted with
            // the page at least once — this fails silently the first
            // time, which is expected and fine.
          });
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

