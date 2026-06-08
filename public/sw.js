// Cuequill service worker.
// Goals:
//   1. Make the installed PWA launch instantly by serving the app
//      shell from cache.
//   2. Survive offline — show the dashboard fallback when there's no
//      network, instead of the browser's "no internet" page.
//   3. Never cache API calls, auth, or data fetches — those must always
//      hit the network so trades stay fresh.

const VERSION = "v1";
const SHELL_CACHE = `cuequill-shell-${VERSION}`;
const STATIC_CACHE = `cuequill-static-${VERSION}`;

// Routes we want available offline. Keep this list short — the SW
// fetches every URL on install and the install fails if any 404.
const APP_SHELL = ["/", "/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((url) =>
            fetch(url, { credentials: "include" })
              .then((res) => (res.ok ? cache.put(url, res) : null))
              .catch(() => null),
          ),
        ),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch API / data / auth — these must always be fresh.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/__/")
  ) {
    return; // browser default behaviour
  }

  // Navigations: network first, fall back to shell cache when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cached) =>
                cached ||
                caches.match("/dashboard") ||
                caches.match("/") ||
                new Response("Offline", { status: 503 }),
            ),
        ),
    );
    return;
  }

  // Static assets (Next bundle, images, fonts): cache first.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css|js)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              if (res.ok && res.type !== "opaque") {
                const copy = res.clone();
                caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
              }
              return res;
            })
            .catch(() => cached || Response.error()),
      ),
    );
    return;
  }
});

// ── Web Push ───────────────────────────────────────────────────────────
// Display a notification when the server pushes one. Payload shape is
// { title, body, url?, tag? }.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Cuequill", body: event.data ? event.data.text() : "" };
  }
  const { title = "Cuequill", body = "", url = "/dashboard", tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icon",
      badge: "/icon",
      data: { url },
    }),
  );
});

// Focus an open tab on the target URL, or open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          const u = new URL(client.url);
          if (u.pathname === target && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      }),
  );
});
