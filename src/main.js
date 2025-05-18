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
  try {
    const stories = await StoryIdb.getAllStories();
    console.log(`IndexedDB initialized with ${stories.length} stories`);

    window.StoryIdb = StoryIdb;
  } catch (error) {
    console.error("Failed to initialize IndexedDB:", error);
  }
}

async function init() {
  await initServiceWorker();
  await initIndexedDB();

  if (navigator.onLine) {
    storyRepository.syncOfflineQueue();
  }

  window.installablePWA = installablePWA;
}

document.addEventListener("DOMContentLoaded", init);

export default installablePWA;
