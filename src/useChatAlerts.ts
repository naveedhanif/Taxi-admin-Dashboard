import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

export interface ChatAlert {
  bookingId: string;
  passengerName: string;
  preview: string;
}

const POLL_MS = 12000;
const CHAT_STATUSES = ["pending", "confirmed", "en_route", "arrived", "in_progress"];

/**
 * Tells the driver about a NEW passenger message on any of their active
 * bookings, wherever they are in the app. Before this, the only in-app
 * chat alert lived inside the chat panel of the one booking currently
 * open — a message on any other booking, or while looking at another
 * screen, produced nothing at all unless a push happened to arrive.
 *
 * The messages table has no public read policy (only the list-messages
 * edge function can read it), so this polls that function per active
 * booking instead of using realtime. Normally 1–3 bookings are active,
 * so that is a handful of small requests every 12 seconds, and only
 * while the app is visible.
 *
 * The first read for each booking only records what already exists, so
 * old history never triggers an alert. `skipBookingId` is the booking
 * whose own chat panel is already mounted (it alerts for itself).
 */
export function useChatAlerts(driverId: string | null, skipBookingId: string | null) {
  const [alert, setAlert] = useState<ChatAlert | null>(null);
  const knownRef = useRef<Map<string, Set<string>>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const skipRef = useRef<string | null>(skipBookingId);
  skipRef.current = skipBookingId;

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    knownRef.current = new Map();

    async function poll() {
      if (document.hidden) return;
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, passenger_name")
        .eq("driver_id", driverId)
        .in("status", CHAT_STATUSES);
      if (cancelled) return;
      if (error) {
        console.error("useChatAlerts: couldn't load active bookings:", error.message);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        console.error("useChatAlerts: no session token, skipping poll.");
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      for (const b of bookings ?? []) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/list-messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: anonKey },
            body: JSON.stringify({ booking_id: b.id }),
          });
          const data = await res.json();
          if (!res.ok) {
            console.error("useChatAlerts: list-messages failed for", b.id, data?.error);
            continue;
          }
          const messages: { id: string; sender_role: string; body: string }[] = data.messages ?? [];
          const known = knownRef.current.get(b.id);
          if (known) {
            const fresh = messages.filter((m) => m.sender_role === "passenger" && !known.has(m.id));
            if (fresh.length > 0 && skipRef.current !== b.id) {
              const last = fresh[fresh.length - 1];
              setAlert({ bookingId: b.id, passengerName: b.passenger_name, preview: last.body.slice(0, 100) });
              const audio = audioRef.current;
              if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
              }
              if ("vibrate" in navigator) {
                try {
                  navigator.vibrate(60);
                } catch {
                  // Not supported — ignore.
                }
              }
            }
          }
          knownRef.current.set(b.id, new Set(messages.map((m) => m.id)));
        } catch (err) {
          console.error("useChatAlerts: request failed for", b.id, err);
        }
      }
    }

    if (!audioRef.current) audioRef.current = new Audio("/message-pop.wav");
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [driverId]);

  return { alert, dismissAlert: () => setAlert(null) };
}
