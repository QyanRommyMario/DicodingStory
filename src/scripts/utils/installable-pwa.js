import Swal from "sweetalert2";

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
export default installablePWA;
