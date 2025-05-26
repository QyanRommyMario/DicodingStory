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
      // Wait for service worker to be ready
      this._swRegistration = await navigator.serviceWorker.ready;

      // Check current subscription status
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
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  async subscribe() {
    if (!this._initialized && !(await this.init())) {
      throw new Error("Web Push Helper initialization failed");
    }

    // Check if already subscribed
    if (this._isSubscribed) {
      console.log("Already subscribed to push notifications");
      return true;
    }

    try {
      console.log("Starting subscription process...");

      const subscription = await this._swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(
          API_CONFIG.WEB_PUSH.VAPID_PUBLIC_KEY
        ),
      });

      console.log("Browser subscription successful:", subscription);

      const subscriptionData = this._formatSubscriptionForApi(subscription);
      console.log("Formatted subscription data:", subscriptionData);

      // Send subscription to API
      await storyRepository.subscribeToPushNotifications(subscriptionData);
      console.log("Subscription sent to API successfully");

      this._isSubscribed = true;
      this._showSuccessNotification(
        "Notifikasi Aktif!",
        "Anda akan menerima notifikasi saat ada story baru."
      );

      return subscriptionData;
    } catch (error) {
      console.error("Subscription failed:", error);

      let errorMessage = "Gagal mengaktifkan notifikasi.";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Izin notifikasi ditolak. Mohon aktifkan izin notifikasi di pengaturan browser Anda.";
      } else if (error.name === "InvalidStateError") {
        errorMessage = "Anda sudah berlangganan notifikasi sebelumnya.";
      } else if (error.message && error.message.includes("API")) {
        errorMessage =
          "Gagal menyimpan langganan ke server. Silakan coba lagi.";
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
        console.log("No active subscription found");
        this._isSubscribed = false;
        return true;
      }

      const endpoint = subscription.endpoint;
      console.log("Unsubscribing from:", endpoint);

      // Unsubscribe from browser
      const unsubscribeResult = await subscription.unsubscribe();

      if (!unsubscribeResult) {
        throw new Error("Failed to unsubscribe from push service");
      }

      console.log("Browser unsubscription successful");

      // Remove subscription from API
      await storyRepository.unsubscribeFromPushNotifications(endpoint);
      console.log("Subscription removed from API successfully");

      this._isSubscribed = false;

      this._showInfoNotification(
        "Notifikasi Dinonaktifkan",
        "Anda tidak akan menerima notifikasi lagi."
      );

      return true;
    } catch (error) {
      console.error("Unsubscribe failed:", error);

      let errorMessage =
        error.message || "Terjadi kesalahan saat menonaktifkan notifikasi.";
      if (error.message && error.message.includes("API")) {
        errorMessage =
          "Gagal menghapus langganan dari server, tapi notifikasi sudah dinonaktifkan.";
      }

      this._showErrorNotification(
        "Gagal Menonaktifkan Notifikasi",
        errorMessage
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
      const hasSubscription = Boolean(subscription);

      if (hasSubscription) {
        console.log("Active subscription found:", subscription.endpoint);
      } else {
        console.log("No active subscription");
      }

      return hasSubscription;
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

    // Check current permission
    if (Notification.permission === "granted") {
      console.log("Notification permission already granted");
      return await this.subscribe();
    }

    if (Notification.permission === "denied") {
      throw new Error("Izin notifikasi sudah ditolak sebelumnya");
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
            console.log("Requesting notification permission...");
            const permission = await Notification.requestPermission();
            console.log("Permission result:", permission);

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
            console.error("Permission request failed:", error);
            this._showErrorNotification(
              "Terjadi Kesalahan",
              "Gagal meminta izin notifikasi. Silakan coba lagi nanti."
            );
            resolve("denied");
          }
        } else {
          console.log("User dismissed notification permission request");
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

  // Method untuk testing - mengirim notifikasi test
  async sendTestNotification() {
    if (!this._isSubscribed) {
      throw new Error("Not subscribed to push notifications");
    }

    // This would typically be called from your backend
    // For testing, you can use Chrome DevTools > Application > Service Workers > Push
    console.log("To test notifications, use Chrome DevTools:");
    console.log("1. Go to Application tab");
    console.log("2. Click on Service Workers");
    console.log("3. Find your service worker");
    console.log("4. Click 'Push' button and enter test data");

    const testData = {
      title: "Test Notification",
      options: {
        body: "This is a test push notification!",
        icon: "/favicon.png",
        badge: "/favicon.png",
        data: {
          url: "/",
        },
      },
    };

    console.log("Test notification data:", JSON.stringify(testData));
  }
}

const webPushHelper = new WebPushHelper();
export default webPushHelper;
