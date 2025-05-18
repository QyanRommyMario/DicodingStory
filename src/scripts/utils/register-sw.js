import Swal from "sweetalert2";

export const registerSW = async () => {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported in this browser");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/service-worker.js"
    );

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    if (registration.waiting) {
      showUpdateNotification(registration);
    }

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          showUpdateNotification(registration);
        } else if (
          newWorker.state === "activated" &&
          !navigator.serviceWorker.controller
        ) {
          showOfflineReadyNotification();
        }
      });
    });

    console.log("Service Worker registered successfully", registration);
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
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
    confirmButtonText: "Refresh",
    cancelButtonText: "Nanti",
  }).then((result) => {
    if (result.isConfirmed) {
      updateServiceWorker(registration);
    }
  });
}

function showOfflineReadyNotification() {
  Swal.fire({
    title: "Aplikasi siap offline!",
    text: "Anda dapat menggunakan aplikasi ini tanpa koneksi internet.",
    icon: "success",
    confirmButtonColor: "#2563EB",
    confirmButtonText: "OK",
  });
}

function updateServiceWorker(registration) {
  if (!registration.waiting) {
    return;
  }

  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}
