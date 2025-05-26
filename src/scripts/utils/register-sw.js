import Swal from "sweetalert2";

export const registerSW = async () => {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported in this browser");
    return null;
  }

  try {
    // Unregister any existing service workers first (optional, untuk clean install)
    const existingRegistrations =
      await navigator.serviceWorker.getRegistrations();
    for (const registration of existingRegistrations) {
      const currentScope = registration.scope;
      if (currentScope.includes(window.location.origin)) {
        console.log("Found existing SW registration:", currentScope);
      }
    }

    const registration = await navigator.serviceWorker.register(
      "/service-worker.js",
      {
        scope: "/",
        updateViaCache: "none", // Mencegah cache service worker script
      }
    );

    let refreshing = false;

    // Handle controller change (new SW takes control)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      console.log("Controller changed, reloading page...");
      window.location.reload();
    });

    // Handle messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      console.log("Message from SW:", event.data);

      if (event.data?.type === "SYNC_STORIES") {
        // Handle stories sync
        window.dispatchEvent(
          new CustomEvent("sw-sync-stories", {
            detail: event.data,
          })
        );
      } else if (event.data?.type === "SYNC_AUTH") {
        // Handle auth sync
        window.dispatchEvent(
          new CustomEvent("sw-sync-auth", {
            detail: event.data,
          })
        );
      }
    });

    // Check for waiting service worker
    if (registration.waiting) {
      console.log("Service worker waiting, showing update notification");
      showUpdateNotification(registration);
    }

    // Listen for new service worker updates
    registration.addEventListener("updatefound", () => {
      console.log("Update found, new service worker installing...");
      const newWorker = registration.installing;

      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        console.log("New service worker state:", newWorker.state);

        if (newWorker.state === "installed") {
          if (navigator.serviceWorker.controller) {
            // Update available
            console.log("Update available");
            showUpdateNotification(registration);
          } else {
            // First install
            console.log("Service worker installed for first time");
            showOfflineReadyNotification();
          }
        }

        if (newWorker.state === "activated") {
          console.log("New service worker activated");
        }
      });
    });

    // Check current state
    if (registration.active && !navigator.serviceWorker.controller) {
      console.log("Service worker active but no controller, reloading...");
      window.location.reload();
    }

    // Periodic update check (optional)
    setInterval(() => {
      registration.update().catch((error) => {
        console.warn("Periodic update check failed:", error);
      });
    }, 60000); // Check every minute

    console.log("Service Worker registered successfully:", {
      scope: registration.scope,
      state: registration.active?.state,
      updateViaCache: registration.updateViaCache,
    });

    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);

    // Show user-friendly error message
    if (error.name === "SecurityError") {
      console.error(
        "Security error - make sure you're serving over HTTPS or localhost"
      );
    } else if (error.name === "NetworkError") {
      console.error(
        "Network error - service worker file might not be accessible"
      );
    }

    return null;
  }
};

function showUpdateNotification(registration) {
  Swal.fire({
    title: "Update tersedia!",
    text: "Aplikasi telah diperbarui. Refresh untuk melihat versi terbaru.",
    icon: "info",
    showCancelButton: true,
    confirmButtonColor: "#2563EB",
    cancelButtonColor: "#6B7280",
    confirmButtonText: "Refresh Sekarang",
    cancelButtonText: "Nanti Saja",
    allowOutsideClick: false,
    allowEscapeKey: false,
  }).then((result) => {
    if (result.isConfirmed) {
      updateServiceWorker(registration);
    } else {
      // Show reminder after 5 minutes
      setTimeout(() => {
        showUpdateReminderNotification(registration);
      }, 5 * 60 * 1000);
    }
  });
}

function showUpdateReminderNotification(registration) {
  // Check if update is still available
  if (!registration.waiting) return;

  Swal.fire({
    title: "Update masih tersedia",
    text: "Jangan lupa untuk refresh aplikasi agar mendapatkan fitur terbaru.",
    icon: "info",
    showCancelButton: true,
    confirmButtonColor: "#2563EB",
    cancelButtonColor: "#6B7280",
    confirmButtonText: "Refresh Sekarang",
    cancelButtonText: "Ingatkan Lagi",
    timer: 10000,
    timerProgressBar: true,
  }).then((result) => {
    if (result.isConfirmed) {
      updateServiceWorker(registration);
    } else if (
      result.dismiss === Swal.DismissReason.timer ||
      result.isDismissed
    ) {
      // Show reminder again after 10 minutes
      setTimeout(() => {
        showUpdateReminderNotification(registration);
      }, 10 * 60 * 1000);
    }
  });
}

function showOfflineReadyNotification() {
  Swal.fire({
    title: "Aplikasi siap offline!",
    text: "Anda dapat menggunakan aplikasi ini tanpa koneksi internet.",
    icon: "success",
    confirmButtonColor: "#2563EB",
    confirmButtonText: "Mengerti",
    timer: 5000,
    timerProgressBar: true,
  });
}

function updateServiceWorker(registration) {
  if (!registration.waiting) {
    console.warn("No waiting service worker found");
    return;
  }

  try {
    console.log("Sending skip waiting message to service worker");
    registration.waiting.postMessage({
      type: "SKIP_WAITING",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error sending skip waiting message:", error);
    // Fallback: just reload the page
    window.location.reload();
  }
}

// Helper function to check if app is running standalone (PWA mode)
export const isStandalonePWA = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
};

// Helper function to check online status
export const getOnlineStatus = () => {
  return navigator.onLine;
};

// Helper function to request persistent storage
export const requestPersistentStorage = async () => {
  if ("storage" in navigator && "persist" in navigator.storage) {
    try {
      const persistent = await navigator.storage.persist();
      console.log(`Persistent storage: ${persistent ? "granted" : "denied"}`);
      return persistent;
    } catch (error) {
      console.warn("Error requesting persistent storage:", error);
      return false;
    }
  }
  return false;
};

// Helper function to get storage usage
export const getStorageUsage = async () => {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usageInMB: Math.round((estimate.usage / 1024 / 1024) * 100) / 100,
        quotaInMB: Math.round((estimate.quota / 1024 / 1024) * 100) / 100,
        percentUsed:
          Math.round((estimate.usage / estimate.quota) * 100 * 100) / 100,
      };
    } catch (error) {
      console.warn("Error getting storage estimate:", error);
      return null;
    }
  }
  return null;
};

// Initialize online/offline event listeners
export const initializeOnlineStatusListeners = () => {
  const handleOnline = () => {
    console.log("App is online");
    document.documentElement.classList.remove("offline");
    document.documentElement.classList.add("online");

    // Show brief online notification
    const toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });

    toast.fire({
      icon: "success",
      title: "Kembali online!",
    });
  };

  const handleOffline = () => {
    console.log("App is offline");
    document.documentElement.classList.remove("online");
    document.documentElement.classList.add("offline");

    // Show offline notification
    const toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });

    toast.fire({
      icon: "warning",
      title: "Mode offline aktif",
    });
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Set initial state
  if (navigator.onLine) {
    document.documentElement.classList.add("online");
  } else {
    document.documentElement.classList.add("offline");
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
};

// Export all functions
export default {
  registerSW,
  isStandalonePWA,
  getOnlineStatus,
  requestPersistentStorage,
  getStorageUsage,
  initializeOnlineStatusListeners,
};
