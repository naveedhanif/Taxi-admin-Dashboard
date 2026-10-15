import { useCallback, useEffect, useState } from "react";
import { Bell, MapPin, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { enableDriverPush, isPushSupported, isIosNonStandalone } from "../pushNotifications";

type LocState = "granted" | "denied" | "prompt" | "unavailable";

function readLocation(): Promise<LocState> {
  if (!("geolocation" in navigator)) return Promise.resolve("unavailable");
  if (!navigator.permissions?.query) return Promise.resolve("prompt");
  return navigator.permissions
    .query({ name: "geolocation" as PermissionName })
    .then((r) => r.state as LocState)
    .catch(() => "prompt" as LocState);
}

function describePushError(error?: string): string {
  if (error === "not configured") return "This app build has no push key (VITE_VAPID_PUBLIC_KEY missing in Vercel). Add it and redeploy.";
  if (error === "denied") return "Notifications are blocked. Open iPhone Settings → Notifications → this app, and allow them.";
  if (error === "unsupported") return "This browser can't receive push. On iPhone, open the app from the Home Screen icon.";
  return `Couldn't register this device: ${error || "unknown error"}`;
}

/**
 * One-tap setup for the two permissions the driver app needs: push
 * notifications (new bookings, chat) and location (live tracking for
 * the passenger). iOS only lists an app under Settings → Location after
 * it has asked once, and the app used to ask only when a trip started —
 * so there was nothing to turn on in Settings. Permission prompts must
 * come from a tap, hence the button.
 */
export default function PermissionsCard({ driverId }: { driverId: string | null }) {
  const [notif, setNotif] = useState<{ ok: boolean; message: string } | null>(null);
  const [loc, setLoc] = useState<LocState>("prompt");
  const [busy, setBusy] = useState(false);

  const register = useCallback(async (): Promise<void> => {
    if (!driverId) return;
    if (!isPushSupported()) {
      setNotif({
        ok: false,
        message: isIosNonStandalone()
          ? "On iPhone, add this app to your Home Screen and open it from there to get notifications."
          : describePushError("unsupported"),
      });
      return;
    }
    if (Notification.permission !== "granted") {
      setNotif({ ok: false, message: Notification.permission === "denied" ? describePushError("denied") : "Notifications are off." });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      console.error("PermissionsCard: no session token for push registration.");
      setNotif({ ok: false, message: "Couldn't verify your session — sign in again." });
      return;
    }
    const result = await enableDriverPush(driverId, token);
    if (!result.enabled) console.error("Push registration failed:", result.error);
    setNotif(result.enabled ? { ok: true, message: "Notifications are on." } : { ok: false, message: describePushError(result.error) });
  }, [driverId]);

  useEffect(() => {
    register();
    readLocation().then(setLoc);
  }, [register]);

  async function enableAll() {
    setBusy(true);
    try {
      // Location first (inside the tap), then notifications.
      if ("geolocation" in navigator) {
        await new Promise<void>((resolve) =>
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            (err) => {
              console.error("PermissionsCard: location request failed:", err.message);
              resolve();
            },
            { enableHighAccuracy: true, timeout: 15000 }
          )
        );
      } else {
        console.error("PermissionsCard: no geolocation support on this device.");
      }
      setLoc(await readLocation());

      if (isPushSupported() && Notification.permission === "default") {
        await Notification.requestPermission();
      } else if (!isPushSupported()) {
        console.error("PermissionsCard: push unsupported here (iOS non-standalone or old browser).");
      }
      await register();
    } finally {
      setBusy(false);
    }
  }

  const locOk = loc === "granted";
  const allOk = !!notif?.ok && locOk;
  const version = typeof __APP_COMMIT_SHA__ !== "undefined" ? __APP_COMMIT_SHA__ : "local";
  if (allOk) {
    return (
      <div className="mb-5 flex items-center gap-2 rounded-lg p-2.5 text-[11px]" style={{ background: "#EAF3DE", color: "#27500A" }}>
        <CheckCircle2 size={14} /> Notifications and location are on.
        <span className="ml-auto text-[10px] opacity-60">v{version}</span>
        <button onClick={enableAll} className="font-semibold underline">Recheck</button>
      </div>
    );
  }

  const row = (ok: boolean, Icon: typeof Bell, label: string, detail: string) => (
    <div className="flex items-start gap-2 text-[11px]" style={{ color: ok ? "#27500A" : "#791F1F" }}>
      {ok ? <CheckCircle2 size={14} className="mt-px shrink-0" /> : <AlertTriangle size={14} className="mt-px shrink-0" />}
      <span><Icon size={11} className="mr-1 inline" /><strong>{label}:</strong> {detail}</span>
    </div>
  );

  return (
    <div className="mb-5 rounded-xl p-3.5" style={{ background: "#E6F1FB", border: "1px solid #C9DFF4" }}>
      <div className="mb-2 text-xs font-semibold text-[#0C447C]">Finish setup: notifications &amp; location</div>
      <div className="mb-3 space-y-1.5">
        {row(!!notif?.ok, Bell, "Notifications", notif?.message ?? "Checking…")}
        {row(locOk, MapPin, "Location", locOk ? "On." : loc === "denied" ? "Blocked. iPhone Settings → Privacy & Security → Location Services → Safari Websites (or this app) → While Using." : loc === "unavailable" ? "Not available on this device." : "Off — needed to share your live position with passengers.")}
      </div>
      <button
        onClick={enableAll}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        style={{ background: "#185FA5" }}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />} Enable all
      </button>
      <div className="mt-2 text-[10px] text-[#185FA5] opacity-70">App version {version}</div>
    </div>
  );
}
