// service-worker.js - Version yang diperbaiki
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

// Workbox precaching
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache names
const CACHE_NAME = "dicoding-story-v6";
const RUNTIME_CACHE = "runtime-cache-v6";

// Essential URLs untuk di-cache saat install
const essentialUrls = [
  "/",
  "/index.html",
  "/offline.html", // Ubah path ini
  "/manifest.json", // Ubah path ini
  "/favicon.png", // Ubah path ini
  "/icon192.png", // Ubah path ini
  "/icon512.png", // Ubah path ini
];

// Helper function untuk validasi URL
const isValidUrl = (url) => {
  try {
    new URL(url, self.location.origin);
    return true;
  } catch {
    return false;
  }
};

// Helper function untuk cache dengan error handling
const safeCacheAdd = async (cache, url) => {
  try {
    if (!isValidUrl(url)) {
      console.warn(`Invalid URL skipped: ${url}`);
      return false;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (response.ok) {
      await cache.put(url, response);
      console.log(`✓ Cached: ${url}`);
      return true;
    } else {
      console.warn(
        `Failed to cache ${url}: ${response.status} ${response.statusText}`
      );
      return false;
    }
  } catch (error) {
    console.warn(`Error caching ${url}:`, error.message);
    return false;
  }
};

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");

  event.waitUntil(
    Promise.all([
      // Cache essential files
      caches.open(CACHE_NAME).then(async (cache) => {
        const results = await Promise.allSettled(
          essentialUrls.map((url) => safeCacheAdd(cache, url))
        );

        const successful = results.filter(
          (r) => r.status === "fulfilled" && r.value
        ).length;
        console.log(
          `Cached ${successful}/${essentialUrls.length} essential files`
        );
      }),

      // Cache external resources
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const externalUrls = [
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
        ];

        const results = await Promise.allSettled(
          externalUrls.map((url) => safeCacheAdd(cache, url))
        );

        const successful = results.filter(
          (r) => r.status === "fulfilled" && r.value
        ).length;
        console.log(
          `Cached ${successful}/${externalUrls.length} external resources`
        );
      }),
    ])
  );

  // Force activation
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];

  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) =>
        Promise.allSettled(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log(`Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        )
      ),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Enhanced offline fallback handler
const getOfflineFallback = async (request) => {
  const cache = await caches.open(CACHE_NAME);

  // Try different fallback strategies based on request type
  if (request.destination === "document") {
    return (
      (await cache.match("/offline.html")) ||
      (await cache.match("/index.html")) ||
      new Response("<h1>Offline</h1><p>Please check your connection</p>", {
        headers: { "Content-Type": "text/html" },
      })
    );
  }

  if (request.destination === "image") {
    return (
      (await cache.match("/icon192.png")) || new Response("", { status: 204 })
    );
  }

  return new Response("", { status: 204 });
};

// Routing strategies dengan offline fallbacks yang lebih baik
registerRoute(
  ({ request }) => request.destination === "document",
  new NetworkFirst({
    cacheName: "documents",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
      {
        // Enhanced offline fallback
        handlerDidError: async ({ request }) => {
          console.log("Document request failed, serving offline fallback");
          return await getOfflineFallback(request);
        },
        handlerWillRespond: async ({ response }) => {
          return response.status === 200
            ? response
            : await getOfflineFallback();
        },
      },
    ],
  })
);

// Static assets (CSS, JS) dengan better error handling
registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.url.includes("/src/") ||
    request.url.includes("/scripts/"),
  new StaleWhileRevalidate({
    cacheName: "static-assets",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      {
        handlerDidError: async () => {
          console.log("Static asset request failed");
          return new Response("", { status: 204 });
        },
      },
    ],
  })
);

// Images dengan fallback
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      {
        handlerDidError: async ({ request }) => {
          console.log("Image request failed, serving fallback");
          return await getOfflineFallback(request);
        },
      },
    ],
  })
);

// CDN resources dengan retry logic
registerRoute(
  ({ url }) => url.origin === "https://cdnjs.cloudflare.com",
  new CacheFirst({
    cacheName: "cdn-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
      {
        handlerDidError: async ({ request }) => {
          console.log("CDN request failed:", request.url);
          return new Response("", { status: 204 });
        },
      },
    ],
  })
);

// API calls dengan enhanced error handling
registerRoute(
  ({ url }) =>
    url.hostname.includes("dicoding") || url.pathname.startsWith("/api"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
      {
        handlerDidError: async ({ request }) => {
          console.log("API request failed:", request.url);
          // Return cached version or empty response
          const cache = await caches.open("api-cache");
          const cachedResponse = await cache.match(request);
          return (
            cachedResponse ||
            new Response(JSON.stringify({ error: "Offline", cached: false }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            })
          );
        },
      },
    ],
  })
);

// Enhanced push notification handler
self.addEventListener("push", (event) => {
  console.log("Push notification received");

  let notificationData = {
    title: "Dicoding Story",
    options: {
      body: "Ada update baru untuk Anda!",
      icon: "/icon192.png",
      badge: "/favicon.png",
      tag: "dicoding-story-notification",
      requireInteraction: false,
      data: { url: "/" },
      actions: [
        {
          action: "view",
          title: "Lihat Story",
          icon: "/favicon.png",
        },
        {
          action: "close",
          title: "Tutup",
        },
      ],
      vibrate: [200, 100, 200],
    },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        options: {
          ...notificationData.options,
          body: data.body || data.message || notificationData.options.body,
          icon: data.icon || notificationData.options.icon,
          data: { url: data.url || "/", ...data },
        },
      };
    } catch (error) {
      console.warn("Error parsing push data:", error);
      try {
        const textData = event.data.text();
        if (textData) {
          notificationData.options.body = textData;
        }
      } catch (textError) {
        console.warn("Error parsing push text:", textError);
      }
    }
  }

  event.waitUntil(
    self.registration
      .showNotification(notificationData.title, notificationData.options)
      .catch((error) => {
        console.error("Failed to show notification:", error);
      })
  );
});

// Enhanced notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked");
  event.notification.close();

  const action = event.action;
  const urlToOpen = event.notification.data?.url || "/";

  if (action === "close") {
    return;
  }

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }

        // Navigate existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client
              .focus()
              .then(() => {
                return client.navigate(urlToOpen);
              })
              .catch(() => {
                return clients.openWindow(urlToOpen);
              });
          }
        }

        // Open new window
        return clients.openWindow(urlToOpen);
      })
      .catch((error) => {
        console.error("Error handling notification click:", error);
        return clients.openWindow(urlToOpen).catch((err) => {
          console.error("Failed to open window:", err);
        });
      })
  );
});

// Enhanced background sync
self.addEventListener("sync", (event) => {
  console.log("Background sync triggered:", event.tag);

  if (event.tag === "sync-stories") {
    event.waitUntil(syncStories().catch(console.error));
  } else if (event.tag === "sync-auth") {
    event.waitUntil(syncAuth().catch(console.error));
  }
});

async function syncStories() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length === 0) {
      console.log("No clients available for stories sync");
      return;
    }

    clients.forEach((client) =>
      client.postMessage({
        type: "SYNC_STORIES",
        timestamp: Date.now(),
      })
    );
    console.log("Stories sync message sent to", clients.length, "clients");
  } catch (error) {
    console.error("Error during stories sync:", error);
    throw error;
  }
}

async function syncAuth() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length === 0) {
      console.log("No clients available for auth sync");
      return;
    }

    clients.forEach((client) =>
      client.postMessage({
        type: "SYNC_AUTH",
        timestamp: Date.now(),
      })
    );
    console.log("Auth sync message sent to", clients.length, "clients");
  } catch (error) {
    console.error("Error during auth sync:", error);
    throw error;
  }
}

// Enhanced message handler
self.addEventListener("message", (event) => {
  console.log("Message received in SW:", event.data);

  try {
    if (
      event.data?.action === "skipWaiting" ||
      event.data?.type === "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }

    if (event.data?.type === "GET_VERSION") {
      const port = event.ports?.[0];
      if (port) {
        port.postMessage({ version: "v6.0", timestamp: Date.now() });
      }
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
});

// Enhanced error handlers
self.addEventListener("error", (event) => {
  console.error("Service Worker error:", {
    message: event.error?.message,
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Service Worker unhandled rejection:", {
    reason: event.reason,
    promise: event.promise,
  });

  // Prevent the default behavior (logging to console)
  event.preventDefault();
});

// Global fetch event listener sebagai fallback
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // Let Workbox handle the routing, but add global error handling
  event.respondWith(
    fetch(event.request).catch(async (error) => {
      console.warn("Global fetch failed:", event.request.url, error.message);

      // Try to get from any cache
      const response = await caches.match(event.request);
      if (response) {
        console.log("Serving from cache:", event.request.url);
        return response;
      }

      // Return appropriate fallback
      return await getOfflineFallback(event.request);
    })
  );
});

console.log(
  "Service Worker v6.0 loaded successfully with enhanced error handling"
);
