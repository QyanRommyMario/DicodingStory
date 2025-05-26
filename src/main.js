import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "leaflet/dist/leaflet.css";
import "./styles/styles.css";

import { registerSW } from "./scripts/utils/register-sw.js";
import webPushHelper from "./scripts/utils/web-push-helper.js";
import StoryIdb from "./scripts/data/database.js";
import storyRepository from "./scripts/data/story-repository.js";
import Swal from "sweetalert2";
import "./scripts/app.js";

class InstallablePWA {
  constructor() {
    this._deferredPrompt = null;
    this._setupEventListeners();
  }

  _setupEventListeners() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      this._deferredPrompt = event;
      console.log("App can be installed to home screen");
      this._showInstallPromotion();
    });

    window.addEventListener("appinstalled", () => {
      console.log("App was installed to home screen");
      this._hideInstallPromotion();
      this._deferredPrompt = null;
      this._showSuccessfulInstallMessage();
    });
  }

  _showInstallPromotion() {
    if (this._isAlreadyInstalled()) return;

    const installButton = document.getElementById("install-button");
    if (installButton) {
      installButton.style.display = "block";
      installButton.addEventListener("click", () => this.promptInstall());
    } else {
      this._showInstallToast();
    }
  }

  _hideInstallPromotion() {
    const installButton = document.getElementById("install-button");
    if (installButton) {
      installButton.style.display = "none";
    }
  }

  _showInstallToast() {
    setTimeout(() => {
      Swal.fire({
        title: "Pasang Aplikasi?",
        text: "Pasang aplikasi ini ke layar utama untuk pengalaman yang lebih baik",
        icon: "info",
        showCancelButton: true,
        confirmButtonColor: "#2563EB",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Pasang Sekarang",
        cancelButtonText: "Nanti Saja",
      }).then((result) => {
        if (result.isConfirmed) {
          this.promptInstall();
        }
      });
    }, 3000);
  }

  _showSuccessfulInstallMessage() {
    Swal.fire({
      title: "Pemasangan Berhasil!",
      text: "Aplikasi telah terpasang di layar utama Anda",
      icon: "success",
      confirmButtonColor: "#2563EB",
    });
  }

  _isAlreadyInstalled() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  async promptInstall() {
    if (!this._deferredPrompt) {
      console.log(
        "Cannot prompt to install: not supported or already installed"
      );
      return;
    }

    try {
      this._deferredPrompt.prompt();
      const choiceResult = await this._deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }

      this._deferredPrompt = null;
    } catch (error) {
      console.error("Error during installation prompt:", error);
    }
  }

  canInstall() {
    return !!this._deferredPrompt;
  }
}

const installablePWA = new InstallablePWA();

async function initServiceWorker() {
  try {
    const registration = await registerSW();

    if (registration) {
      await webPushHelper.init();
      console.log("Web Push Helper initialized");
    }

    window.addEventListener("offline", () => {
      console.log("Application is now offline");
    });

    window.addEventListener("online", () => {
      console.log("Application is now online");
      storyRepository.syncOfflineQueue();
    });

    window.webPushHelper = webPushHelper;
    window.swRegistration = registration;

    return registration;
  } catch (error) {
    console.error("Failed to initialize service worker:", error);
    return null;
  }
}

async function initIndexedDB() {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(
        `IndexedDB initialization attempt ${attempt + 1}/${maxRetries}`
      );

      // Test database connection first
      await StoryIdb._checkDatabaseHealth();

      // Try to get existing stories
      const stories = await StoryIdb.getAllStories();
      console.log(
        `IndexedDB initialized successfully with ${stories.length} stories`
      );

      // Make StoryIdb available globally for debugging
      window.StoryIdb = StoryIdb;

      return true;
    } catch (error) {
      attempt++;
      console.error(
        `IndexedDB initialization attempt ${attempt} failed:`,
        error
      );

      if (
        error.message &&
        error.message.includes("object stores was not found")
      ) {
        console.log("Attempting to reset database due to schema mismatch...");

        try {
          await StoryIdb.resetDatabase();
          console.log("Database reset completed, retrying initialization...");
          continue;
        } catch (resetError) {
          console.error("Failed to reset database:", resetError);
        }
      }

      if (attempt === maxRetries) {
        console.error(
          "Failed to initialize IndexedDB after all retries:",
          error
        );

        // Show user-friendly error message
        Swal.fire({
          title: "Database Error",
          text: "There was an issue initializing the local database. Some features may not work properly. Please try refreshing the page.",
          icon: "warning",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "Refresh Page",
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.reload();
          }
        });

        return false;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function init() {
  console.log("Starting application initialization...");

  try {
    // Initialize service worker first
    await initServiceWorker();

    // Initialize IndexedDB with retry logic
    const dbInitialized = await initIndexedDB();

    if (dbInitialized && navigator.onLine) {
      // Only sync if database is working
      storyRepository.syncOfflineQueue();
    }

    // Make PWA installer available globally
    window.installablePWA = installablePWA;

    console.log("Application initialization completed");
  } catch (error) {
    console.error("Critical error during application initialization:", error);

    Swal.fire({
      title: "Initialization Error",
      text: "There was a critical error starting the application. Please refresh the page and try again.",
      icon: "error",
      confirmButtonColor: "#2563EB",
      confirmButtonText: "Refresh Page",
    }).then(() => {
      window.location.reload();
    });
  }
}

// Add global error handler for unhandled IndexedDB errors
window.addEventListener("error", (event) => {
  if (
    event.error &&
    event.error.message &&
    event.error.message.includes("object stores was not found")
  ) {
    console.error("Unhandled IndexedDB error detected:", event.error);

    // Attempt to reset database
    StoryIdb.resetDatabase()
      .then(() => {
        console.log("Database reset due to unhandled error");
        window.location.reload();
      })
      .catch((resetError) => {
        console.error(
          "Failed to reset database after unhandled error:",
          resetError
        );
      });
  }
});

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);

export default installablePWA;
