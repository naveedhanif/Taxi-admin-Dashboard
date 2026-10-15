import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Shares the driver's live GPS position with the passenger while a trip
 * is actually in motion — i.e. while a booking is "en_route" (heading to
 * pickup) or "arrived" (waiting at pickup). Nothing is sent before that
 * and nothing is kept after: the moment there is no such booking, the
 * driver's live_tracking row is deleted, so a stale position can never
 * be shown to a later passenger and the driver is never tracked while
 * off the clock.
 *
 * Writes to the existing `live_tracking` table (one row per driver,
 * primary key driver_id, upserted in place — it never grows). The
 * passenger app reads it through the get-booking-status edge function,
 * which only returns it to someone who proves they own that booking.
 *
 * HONEST LIMIT (iOS / any home-screen web app): a web page can only read
 * GPS while it is open on screen. When the driver taps "Route to pickup"
 * and Google Maps takes over, this page goes to the background and the
 * updates pause until the driver comes back to the app. The passenger
 * screen shows "last updated Ns ago" for exactly that reason. Fixing it
 * for real needs a native wrapper — see the plan discussed with the owner.
 *
 * Every failure path logs with console.error — a silent no-op here would
 * look identical to "working" from the driver's side.
 */

const ACTIVE_TRACKING_STATUSES = ["en_route", "arrived"];
const MIN_SEND_INTERVAL_MS = 8000; // matches the passenger poll interval
const SAFETY_REFETCH_MS = 60000;

export type LocationShareState =
  | "idle" // no trip needing tracking
  | "active" // sharing normally
  | "waiting" // trip active, waiting for first GPS fix
  | "denied" // driver blocked location permission
  | "unavailable"; // device/browser has no geolocation

export function useLiveLocationSharing(driverId: string | null) {
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [state, setState] = useState<LocationShareState>("idle");
  const lastSentRef = useRef(0);
  const [retryTick, setRetryTick] = useState(0);

  // 1) Work out which booking (if any) currently needs tracking.
  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;

    async function refresh() {
      const { data, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("driver_id", driverId)
        .in("status", ACTIVE_TRACKING_STATUSES)
        .order("scheduled_time", { ascending: true })
        .limit(1);
      if (cancelled) return;
      if (error) {
        console.error("useLiveLocationSharing: couldn't check active trip:", error.message);
        return;
      }
      setBookingId(data && data.length > 0 ? data[0].id : null);
    }

    refresh();
    const channel = supabase
      .channel(`live-location-trip-${driverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `driver_id=eq.${driverId}` },
        () => refresh()
      )
      .subscribe();
    const interval = setInterval(refresh, SAFETY_REFETCH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  // 2) While there is a trip to track, watch GPS and upsert; when there
  //    isn't, make sure nothing is left behind.
  useEffect(() => {
    if (!driverId) return;

    if (!bookingId) {
      setState("idle");
      supabase
        .from("live_tracking")
        .delete()
        .eq("driver_id", driverId)
        .then(({ error }) => {
          if (error) console.error("useLiveLocationSharing: couldn't clear live_tracking row:", error.message);
        });
      return;
    }

    if (!("geolocation" in navigator)) {
      console.error("useLiveLocationSharing: this device has no geolocation support");
      setState("unavailable");
      return;
    }

    setState("waiting");
    lastSentRef.current = 0;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < MIN_SEND_INTERVAL_MS) return;
        lastSentRef.current = now;

        const { latitude, longitude, heading, speed } = pos.coords;
        const { error } = await supabase.from("live_tracking").upsert(
          {
            driver_id: driverId,
            booking_id: bookingId,
            lat: latitude,
            lng: longitude,
            heading: heading != null && !Number.isNaN(heading) ? heading : null,
            speed_kmh: speed != null && !Number.isNaN(speed) ? Math.round(speed * 3.6) : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "driver_id" }
        );
        if (error) {
          console.error("useLiveLocationSharing: couldn't save position:", error.message);
          return;
        }
        setState("active");
      },
      (err) => {
        console.error("useLiveLocationSharing: GPS error:", err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) setState("denied");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, bookingId, retryTick]);

  // Lets the driver re-ask after fixing the phone setting — iOS home-screen
  // apps only re-evaluate permission when a new GPS request is made.
  const retry = () => setRetryTick((n) => n + 1);

  return { state, bookingId, retry };
}
