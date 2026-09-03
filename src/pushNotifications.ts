// src/pushNotifications.ts
//
// Browser-side half of real push notifications for the driver app —
// asking permission, registering the service worker, subscribing, and
// saving that subscription server-side via save-push-subscription.
// Complements (doesn't replace) the existing Realtime-based toast/sound
// in useNewBookingNotifications.ts, which only fires while this app tab
// is actually open and connected — this is what reaches a driver whose
// phone is locked or who has the app closed.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}

/**
 * Silent-fails on purpose (returns without throwing) whenever push
 * genuinely isn't available or usable right now — permission denied,
 * VAPID key missing, browser unsupported. Called automatically once a
 * driver is logged in (see the effect in App.tsx); a driver who never
 * sees a native permission prompt, or who denies it, just doesn't get
 * push — every other feature in this app is unaffected either way.
 */
export async function enableDriverPush(driverId: string, accessToken: string): Promise<{ enabled: boolean; error?: string }> {
  if (!isPushSupported()) return { enabled: false, error: "unsupported" };

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidPublicKey) return { enabled: false, error: "not configured" };

  try {
    // Notification.requestPermission() is safe to call even if
    // permission is already granted/denied — it just returns the
    // existing state without re-prompting. useNewBookingNotifications.ts
    // already asks for this (for the Badging API), so in practice this
    // usually resolves instantly with whatever the driver already answered.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { enabled: false, error: permission };

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const res = await fetch(`${supabaseUrl}/functions/v1/save-push-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        subscriber_type: "driver",
        driver_id: driverId,
        subscription: subscription.toJSON(),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { enabled: false, error: data.error || "save failed" };
    }
    return { enabled: true };
  } catch (err) {
    return { enabled: false, error: err instanceof Error ? err.message : "unexpected error" };
  }
}
