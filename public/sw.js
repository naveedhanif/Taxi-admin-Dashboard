// public/sw.js
//
// Minimal service worker whose only job is to display a real OS-level
// notification when a push event arrives, and focus/open the app to a
// relevant screen when it's tapped. Nothing else in this app needs a
// service worker, so this deliberately doesn't do any caching/offline
// work.
//
// NOT LIVE-TESTED — this sandbox can't receive a real push event.
// Written to match the documented Push API / Notifications API exactly.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Update", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Update";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Take over immediately when this file changes, so a fix to the tap handling
// doesn't wait for every old copy of the app to be closed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      // Backup channel for iOS (see the comment in App.tsx): remember where
      // this tap should go; the app reads it back when it starts / resumes.
      try {
        const cache = await caches.open("pending-nav");
        await cache.put("/__pending_nav", new Response(JSON.stringify({ url: targetUrl, at: Date.now() })));
      } catch (err) {
        console.error("sw: couldn't store the pending navigation:", err);
      }

      const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          // WindowClient.navigate() is unreliable on iOS PWAs; postMessage
          // the running app instead (the cache entry above is the fallback).
          if ("postMessage" in client) {
            client.postMessage({ type: "NOTIFICATION_NAVIGATE", url: targetUrl });
          }
          try {
            return await client.focus();
          } catch (err) {
            console.error("sw: client.focus() failed:", err);
            return;
          }
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })()
  );
});
