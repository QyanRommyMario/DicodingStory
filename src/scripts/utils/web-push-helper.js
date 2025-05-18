import API_CONFIG from "../config/api-config.js";
import storyRepository from "../data/story-repository.js";
import Swal from "sweetalert2";

class WebPushHelper {
  constructor() {
    this._swRegistration = null;
    this._isSubscribed = false;
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return this._isSubscribed;
    if (!this._isPushSupported()) {
      console.log("Push notifications are not supported in this browser");
      return false;
    }

    try {
      this._swRegistration = await navigator.serviceWorker.ready;
      this._isSubscribed = await this._checkSubscription();
      this._initialized = true;

      console.log(
        "Web Push Helper initialized, subscription status:",
        this._isSubscribed
      );
      return this._isSubscribed;
    } catch (error) {
      console.error("Service worker registration failed:", error);
      return false;
    }
  }

  _isPushSupported() {
    return "serviceWorker" in navigator && "PushManager" in window;
  }

  async subscribe() {
    if (!this._initialized && !(await this.init())) {
      throw new Error("Web Push Helper initialization failed");
    }

    try {
      const subscription = await this._swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(
          API_CONFIG.WEB_PUSH.VAPID_PUBLIC_KEY
        ),
      });

      const subscriptionData = this._formatSubscriptionForApi(subscription);
      await storyRepository.subscribeToPushNotifications(subscriptionData);

      this._isSubscribed = true;
      this._showSuccessNotification(
        "Notifikasi Aktif!",
        "Anda akan menerima notifikasi saat ada story baru."
      );

      return subscriptionData;
    } catch (error) {
      let errorMessage = "Gagal mengaktifkan notifikasi.";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Izin notifikasi ditolak. Mohon aktifkan izin notifikasi di pengaturan browser Anda.";
      } else if (error.name === "InvalidStateError") {
        errorMessage = "Anda sudah berlangganan notifikasi sebelumnya.";
      }

      this._showErrorNotification("Gagal Aktivasi Notifikasi", errorMessage);
      throw error;
    }
  }

  async unsubscribe() {
    if (!this._initialized && !(await this.init())) {
      throw new Error("Web Push Helper initialization failed");
    }

    try {
      const subscription =
        await this._swRegistration.pushManager.getSubscription();

      if (!subscription) {
        this._isSubscribed = false;
        return true;
      }

      const endpoint = subscription.endpoint;
      const unsubscribeResult = await subscription.unsubscribe();

      if (!unsubscribeResult) {
        throw new Error("Failed to unsubscribe from push service");
      }

      await storyRepository.unsubscribeFromPushNotifications(endpoint);
      this._isSubscribed = false;

      this._showInfoNotification(
        "Notifikasi Dinonaktifkan",
        "Anda tidak akan menerima notifikasi lagi."
      );

      return true;
    } catch (error) {
      this._showErrorNotification(
        "Gagal Menonaktifkan Notifikasi",
        error.message || "Terjadi kesalahan saat menonaktifkan notifikasi."
      );
      return false;
    }
  }

  async _checkSubscription() {
    if (!this._swRegistration) {
      return false;
    }

    try {
      const subscription =
        await this._swRegistration.pushManager.getSubscription();
      return Boolean(subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
      return false;
    }
  }

  _formatSubscriptionForApi(subscription) {
    const subscriptionJson = subscription.toJSON();

    return {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
      },
    };
  }

  _urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  _showSuccessNotification(title, text) {
    Swal.fire({
      title,
      text,
      icon: "success",
      confirmButtonColor: "#2563EB",
    });
  }

  _showErrorNotification(title, text) {
    Swal.fire({
      title,
      text,
      icon: "error",
      confirmButtonColor: "#2563EB",
    });
  }

  _showInfoNotification(title, text) {
    Swal.fire({
      title,
      text,
      icon: "info",
      confirmButtonColor: "#2563EB",
    });
  }

  async requestPermission() {
    if (!("Notification" in window)) {
      throw new Error("Browser ini tidak mendukung notifikasi");
    }

    return new Promise((resolve) => {
      Swal.fire({
        title: "Aktifkan Notifikasi?",
        text: "Kami akan memberi tahu Anda saat ada story baru.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#2563EB",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Ya, aktifkan!",
        cancelButtonText: "Nanti saja",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const permission = await Notification.requestPermission();

            if (permission === "granted") {
              await this.subscribe();
            } else {
              this._showInfoNotification(
                "Notifikasi Tidak Diizinkan",
                "Anda dapat mengaktifkannya nanti melalui pengaturan browser."
              );
            }

            resolve(permission);
          } catch (error) {
            this._showErrorNotification(
              "Terjadi Kesalahan",
              "Gagal meminta izin notifikasi. Silakan coba lagi nanti."
            );
            resolve("denied");
          }
        } else {
          resolve("dismissed");
        }
      });
    });
  }

  isSubscribed() {
    return this._isSubscribed;
  }

  getRegistration() {
    return this._swRegistration;
  }
}

const webPushHelper = new WebPushHelper();
export default webPushHelper;
