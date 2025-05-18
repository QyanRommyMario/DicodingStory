import api from "./api.js";
import API_CONFIG from "../config/api-config.js";
import { openDB } from "idb";
import Swal from "sweetalert2";

class AuthRepository {
  constructor() {
    this._authStorageKey = "auth_token";
    this._userDataKey = "user_data";
    this._offlineAuthDbName = "auth-offline-db";
    this._offlineAuthStoreName = "auth-store";
    this._initDatabase();
    this._setupEventListeners();
  }

  async _initDatabase() {
    try {
      this._db = await openDB(this._offlineAuthDbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("auth-store")) {
            db.createObjectStore("auth-store", { keyPath: "id" });
            console.log("Auth offline store successfully created");
          }
        },
      });
      console.log("Auth offline database initialized");
    } catch (error) {
      console.error("Failed to initialize auth offline database:", error);
    }
  }

  _setupEventListeners() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SYNC_AUTH_DATA") {
          this.syncOnlineStatus();
        }
      });
    }
  }

  async register({ name, email, password }) {
    try {
      return await api.post(
        API_CONFIG.ENDPOINTS.REGISTER,
        { name, email, password },
        false
      );
    } catch (error) {
      if (!navigator.onLine) {
        this._showOfflineNotification("Tidak dapat mendaftar saat offline");
        throw new Error("Tidak dapat mendaftar saat offline. Coba lagi nanti.");
      }
      throw error;
    }
  }

  async login({ email, password }) {
    try {
      const response = await api.post(
        API_CONFIG.ENDPOINTS.LOGIN,
        { email, password },
        false
      );

      if (response.loginResult) {
        await this._saveAuthData(response.loginResult);
        await this._saveCredentialsOffline(email, response.loginResult);
      }

      return response;
    } catch (error) {
      if (!navigator.onLine) {
        const offlineAuth = await this._tryOfflineLogin(email);
        if (offlineAuth) {
          this._showOfflineNotification("Login offline berhasil");
          return { loginResult: offlineAuth };
        } else {
          this._showOfflineNotification("Login offline gagal");
          throw new Error(
            "Tidak dapat login saat offline. Kredensial tidak tersedia."
          );
        }
      }
      throw error;
    }
  }

  async _saveCredentialsOffline(email, loginResult) {
    if (!this._db) await this._initDatabase();

    try {
      const tx = this._db.transaction(this._offlineAuthStoreName, "readwrite");
      const store = tx.objectStore(this._offlineAuthStoreName);

      await store.put({
        id: email,
        loginResult,
        timestamp: Date.now(),
      });

      await tx.done;
      console.log("Credentials saved for offline use");
      return true;
    } catch (error) {
      console.error("Failed to save credentials offline:", error);
      return false;
    }
  }

  async _tryOfflineLogin(email) {
    if (!this._db) await this._initDatabase();

    try {
      const tx = this._db.transaction(this._offlineAuthStoreName, "readonly");
      const store = tx.objectStore(this._offlineAuthStoreName);

      const userData = await store.get(email);

      if (userData && userData.loginResult) {
        return userData.loginResult;
      }
      return null;
    } catch (error) {
      console.error("Failed to retrieve offline credentials:", error);
      return null;
    }
  }

  async logout() {
    localStorage.removeItem(this._authStorageKey);
    localStorage.removeItem(this._userDataKey);

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.pushManager) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
            console.log("Push notification subscription removed on logout");
          }
        }
      } catch (error) {
        console.error("Error unsubscribing from push notifications:", error);
      }
    }

    window.dispatchEvent(new Event("user-logged-out"));
  }

  async syncOnlineStatus() {
    if (navigator.onLine && this.isAuthenticated()) {
      try {
        await api.get(API_CONFIG.ENDPOINTS.USER_INFO);
        console.log("Token is valid");
        return true;
      } catch (error) {
        console.warn("Token validation failed:", error);
        this.logout();
        return false;
      }
    }
    return this.isAuthenticated();
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  getToken() {
    return localStorage.getItem(this._authStorageKey);
  }

  getUserData() {
    const userData = localStorage.getItem(this._userDataKey);
    return userData ? JSON.parse(userData) : null;
  }

  async _saveAuthData(loginResult) {
    const { token, userId, name } = loginResult;

    localStorage.setItem(this._authStorageKey, token);
    localStorage.setItem(this._userDataKey, JSON.stringify({ userId, name }));

    this._registerBackgroundSync();

    window.dispatchEvent(new Event("user-logged-in"));
  }

  async _registerBackgroundSync() {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register("sync-auth-data");
        console.log("Background sync registered for auth data");
      } catch (error) {
        console.error("Background sync registration failed:", error);
      }
    }
  }

  _showOfflineNotification(message) {
    Swal.fire({
      title: "Status Koneksi",
      text: message,
      icon: "info",
      confirmButtonColor: "#2563EB",
      timer: 3000,
    });
  }

  async setupPWAFeatures() {
    window.addEventListener("online", async () => {
      if (this.isAuthenticated()) {
        try {
          await this.syncOnlineStatus();
          this._showOfflineNotification(
            "Koneksi kembali tersedia. Data akun telah disinkronkan."
          );
        } catch (error) {
          console.error("Error syncing auth status when online:", error);
        }
      }
    });

    window.addEventListener("offline", () => {
      if (this.isAuthenticated()) {
        this._showOfflineNotification(
          "Anda sedang offline. Beberapa fitur mungkin terbatas."
        );
      }
    });

    setInterval(async () => {
      if (navigator.onLine && this.isAuthenticated()) {
        await this.syncOnlineStatus();
      }
    }, 30 * 60 * 1000);

    return true;
  }
}

const authRepository = new AuthRepository();

document.addEventListener("DOMContentLoaded", () => {
  authRepository
    .setupPWAFeatures()
    .then(() => console.log("Auth PWA features initialized"))
    .catch((err) =>
      console.error("Failed to initialize Auth PWA features:", err)
    );
});

export default authRepository;
