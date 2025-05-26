import Swal from "sweetalert2";

class InstallablePWA {
  constructor() {
    this._deferredPrompt = null;
    this._isInstalled = false;
    this._setupEventListeners();
    this._checkInstallStatus();
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
      this._isInstalled = true;
      this._hideInstallPromotion();
      this._deferredPrompt = null;
      this._showSuccessfulInstallMessage();
      this._trackInstallation();
    });

    if (window.matchMedia) {
      window
        .matchMedia("(display-mode: standalone)")
        .addEventListener("change", (evt) => {
          if (evt.matches) {
            this._isInstalled = true;
          }
        });
    }
  }

  _checkInstallStatus() {
    this._isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://");
  }

  _showInstallPromotion() {
    if (this._isInstalled) return;

    const installButton = document.getElementById("install-button");
    if (installButton) {
      installButton.style.display = "block";
      installButton.addEventListener("click", () => this.promptInstall());
    }

    setTimeout(() => {
      if (!this._isInstalled && this._deferredPrompt) {
        this._showInstallToast();
      }
    }, 5000);
  }

  _hideInstallPromotion() {
    const installButton = document.getElementById("install-button");
    if (installButton) {
      installButton.style.display = "none";
    }
  }

  _showInstallToast() {
    Swal.fire({
      title: "Pasang Aplikasi?",
      html: `
        <div style="text-align: left; margin: 1rem 0;">
          <p>Pasang aplikasi ini ke layar utama untuk:</p>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Akses lebih cepat</li>
            <li>Pengalaman seperti aplikasi native</li>
            <li>Notifikasi push</li>
            <li>Mode offline</li>
          </ul>
        </div>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Pasang Sekarang",
      cancelButtonText: "Nanti Saja",
      customClass: {
        popup: "install-prompt-popup",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.promptInstall();
      }
    });
  }

  _showSuccessfulInstallMessage() {
    Swal.fire({
      title: "Pemasangan Berhasil!",
      text: "Aplikasi telah terpasang di layar utama Anda",
      icon: "success",
      confirmButtonColor: "#2563EB",
      timer: 3000,
      timerProgressBar: true,
    });
  }

  _trackInstallation() {
    try {
      if (typeof gtag !== "undefined") {
        gtag("event", "app_installed", {
          event_category: "PWA",
          event_label: "Home Screen Install",
        });
      }
    } catch (error) {
      console.log("Analytics tracking failed:", error);
    }
  }

  async promptInstall() {
    if (!this._deferredPrompt) {
      if (this._isInstalled) {
        Swal.fire({
          title: "Sudah Terpasang",
          text: "Aplikasi sudah terpasang di perangkat Anda",
          icon: "info",
          confirmButtonColor: "#2563EB",
        });
      } else {
        this._showManualInstallInstructions();
      }
      return;
    }

    try {
      this._deferredPrompt.prompt();
      const choiceResult = await this._deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
        this._showManualInstallInstructions();
      }

      this._deferredPrompt = null;
    } catch (error) {
      console.error("Error during installation prompt:", error);
      this._showManualInstallInstructions();
    }
  }

  _showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let instructions = "";

    if (isIOS) {
      instructions = `
        <div style="text-align: left;">
          <p><strong>Untuk iOS Safari:</strong></p>
          <ol>
            <li>Tap tombol Share (📤)</li>
            <li>Scroll ke bawah dan tap "Add to Home Screen"</li>
            <li>Tap "Add" di pojok kanan atas</li>
          </ol>
        </div>
      `;
    } else if (isAndroid) {
      instructions = `
        <div style="text-align: left;">
          <p><strong>Untuk Android Chrome:</strong></p>
          <ol>
            <li>Tap menu (⋮) di pojok kanan atas</li>
            <li>Pilih "Add to Home screen"</li>
            <li>Tap "Add"</li>
          </ol>
        </div>
      `;
    } else {
      instructions = `
        <div style="text-align: left;">
          <p><strong>Untuk Desktop:</strong></p>
          <ol>
            <li>Klik ikon install di address bar</li>
            <li>Atau buka menu browser dan pilih "Install App"</li>
          </ol>
        </div>
      `;
    }

    Swal.fire({
      title: "Cara Memasang Aplikasi",
      html: instructions,
      icon: "info",
      confirmButtonColor: "#2563EB",
      confirmButtonText: "Mengerti",
    });
  }

  canInstall() {
    return !!this._deferredPrompt && !this._isInstalled;
  }

  isInstalled() {
    return this._isInstalled;
  }

  async checkForUpdates() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch (error) {
        console.error("Error checking for updates:", error);
      }
    }
  }

  setupInstallButton() {
    const installBtn = document.createElement("button");
    installBtn.id = "install-button";
    installBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7,10 12,15 17,10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Install App
    `;
    installBtn.className = "install-btn";
    installBtn.style.display = "none";
    installBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2563EB;
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    `;

    installBtn.addEventListener("mouseenter", () => {
      installBtn.style.transform = "translateY(-2px)";
      installBtn.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.4)";
    });

    installBtn.addEventListener("mouseleave", () => {
      installBtn.style.transform = "translateY(0)";
      installBtn.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
    });

    document.body.appendChild(installBtn);
    return installBtn;
  }
}

const installablePWA = new InstallablePWA();
export default installablePWA;
