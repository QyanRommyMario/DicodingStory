const CACHE_NAME = "dicoding-story-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/assets/index.css",
  "/assets/index.js",
  "/favicon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetchAndCache(request);
      })
    );
  } else {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
  }
});

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (!response || response.status !== 200 || response.type !== "basic") {
      return response;
    }

    const responseToCache = response.clone();
    caches.open(CACHE_NAME).then((cache) => {
      cache.put(request, responseToCache);
    });

    return response;
  });
}

self.addEventListener("push", (event) => {
  let notificationData = {
    title: "New Story",
    options: {
      body: "Someone shared a new story!",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: "/",
      },
    },
  };

  try {
    notificationData = event.data.json();
  } catch (error) {
    notificationData.options.body = event.data
      ? event.data.text()
      : "Check out new content";
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData.options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-new-stories") {
    event.waitUntil(syncOfflineStories());
  } else if (event.tag === "sync-auth-data") {
    event.waitUntil(syncAuthData());
  }
});

async function syncOfflineStories() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_OFFLINE_STORIES",
      });
    });
    return true;
  } catch (error) {
    console.error("Error syncing offline stories:", error);
    return false;
  }
}

async function syncAuthData() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_AUTH_DATA",
      });
    });
    return true;
  } catch (error) {
    console.error("Error syncing auth data:", error);
    return false;
  }
}
