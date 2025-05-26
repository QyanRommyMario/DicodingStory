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
    this._db = null;
    this._syncInterval = null;
    this._initDatabase();
    this._setupEventListeners();
  }
  async _initDatabase() {
    try {
      this._db = await openDB(this._offlineAuthDbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("auth-store")) {
            const store = db.createObjectStore("auth-store", { keyPath: "id" });
            store.createIndex("timestamp", "timestamp");
          }
        },
      });
    } catch (error) {
      console.error("Failed to initialize auth offline database:", error);
    }
  }
  _setupEventListeners() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SYNC_AUTH_DATA") {
          this.syncOnlineStatus();
        }
      });
    }
    window.addEventListener("online", () => this._handleOnlineStatus());
    window.addEventListener("offline", () => this._handleOfflineStatus());
  }
  async _handleOnlineStatus() {
    if (this.isAuthenticated()) {
      try {
        const isValid = await this.syncOnlineStatus();
        if (!isValid) {
          this.logout();
          this._showNotification(
            "Sesi telah berakhir. Silakan login kembali.",
            "warning"
          );
        } else {
          this._showNotification(
            "Koneksi kembali tersedia. Data akun telah disinkronkan.",
            "success"
          );
        }
      } catch (error) {
        console.error("Error syncing auth status when online:", error);
      }
    }
  }
  _handleOfflineStatus() {
    if (this.isAuthenticated()) {
      this._showNotification(
        "Anda sedang offline. Beberapa fitur mungkin terbatas.",
        "info"
      );
    }
  }
  async register({ name, email, password }) {
    if (!navigator.onLine) {
      this._showNotification("Tidak dapat mendaftar saat offline", "error");
      throw new Error("Tidak dapat mendaftar saat offline. Coba lagi nanti.");
    }
    try {
      return await api.post(
        API_CONFIG.ENDPOINTS.REGISTER,
        { name, email, password },
        false
      );
    } catch (error) {
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
        const offlineAuth = await this._tryOfflineLogin(email, password);
        if (offlineAuth) {
          this._showNotification("Login offline berhasil", "success");
          await this._saveAuthData(offlineAuth);
          return { loginResult: offlineAuth };
        } else {
          this._showNotification("Login offline gagal", "error");
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
      return true;
    } catch (error) {
      console.error("Failed to save credentials offline:", error);
      return false;
    }
  }
  async _tryOfflineLogin(email, password) {
    if (!this._db) await this._initDatabase();
    try {
      const tx = this._db.transaction(this._offlineAuthStoreName, "readonly");
      const store = tx.objectStore(this._offlineAuthStoreName);
      const userData = await store.get(email);
      await tx.done;
      return userData?.loginResult || null;
    } catch (error) {
      console.error("Failed to retrieve offline credentials:", error);
      return null;
    }
  }
  async logout() {
    try {
      localStorage.removeItem(this._authStorageKey);
      localStorage.removeItem(this._userDataKey);
      this._clearSyncInterval();
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration?.pushManager) {
            const subscription =
              await registration.pushManager.getSubscription();
            if (subscription) await subscription.unsubscribe();
          }
        } catch (error) {
          console.error("Error unsubscribing from push notifications:", error);
        }
      }
      window.dispatchEvent(new Event("user-logged-out"));
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
  async syncOnlineStatus() {
    if (!navigator.onLine || !this.isAuthenticated()) {
      return this.isAuthenticated();
    }
    try {
      await api.get(API_CONFIG.ENDPOINTS.USER_INFO);
      return true;
    } catch (error) {
      console.warn("Token validation failed:", error);
      return false;
    }
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
    await this._registerBackgroundSync();
    this._startSyncInterval();
    window.dispatchEvent(new Event("user-logged-in"));
  }
  async _registerBackgroundSync() {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register("sync-auth-data");
      } catch (error) {
        console.error("Background sync registration failed:", error);
      }
    }
  }
  _startSyncInterval() {
    this._clearSyncInterval();
    this._syncInterval = setInterval(async () => {
      if (navigator.onLine && this.isAuthenticated()) {
        const isValid = await this.syncOnlineStatus();
        if (!isValid) this.logout();
      }
    }, 30 * 60 * 1000);
  }
  _clearSyncInterval() {
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }
  }
  _showNotification(message, type = "info") {
    const config = {
      info: { icon: "info", color: "#2563EB" },
      success: { icon: "success", color: "#10B981" },
      warning: { icon: "warning", color: "#F59E0B" },
      error: { icon: "error", color: "#EF4444" },
    };
    Swal.fire({
      title: "Status Akun",
      text: message,
      icon: config[type].icon,
      confirmButtonColor: config[type].color,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  }
  async setupPWAFeatures() {
    if (this.isAuthenticated()) {
      this._startSyncInterval();
    }
    window.addEventListener("user-logged-in", () => {
      this._startSyncInterval();
    });
    window.addEventListener("user-logged-out", () => {
      this._clearSyncInterval();
    });
    return true;
  }
  async clearOfflineData() {
    if (!this._db) await this._initDatabase();
    try {
      const tx = this._db.transaction(this._offlineAuthStoreName, "readwrite");
      const store = tx.objectStore(this._offlineAuthStoreName);
      await store.clear();
      await tx.done;
      return true;
    } catch (error) {
      console.error("Failed to clear offline data:", error);
      return false;
    }
  }
  destroy() {
    this._clearSyncInterval();
    if (this._db) {
      this._db.close();
      this._db = null;
    }
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
