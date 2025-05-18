import Swal from "sweetalert2";

class NetworkHelper {
  constructor() {
    this._isOnline = navigator.onLine;
    this._setupListeners();
    this._offlineIndicator = null;
    this._callbacks = [];
  }

  _setupListeners() {
    window.addEventListener("online", () => this._handleOnlineStatus(true));
    window.addEventListener("offline", () => this._handleOnlineStatus(false));
  }

  _handleOnlineStatus(isOnline) {
    const previousStatus = this._isOnline;
    this._isOnline = isOnline;

    if (previousStatus !== isOnline) {
      this._notifyCallbacks(isOnline);

      document.dispatchEvent(
        new CustomEvent("network-status-changed", {
          detail: { status: isOnline ? "online" : "offline" },
        })
      );

      if (isOnline) {
        this._hideOfflineIndicator();
        this._showOnlineNotification();
      } else {
        this._showOfflineIndicator();
        this._showOfflineNotification();
      }
    }
  }

  _notifyCallbacks(isOnline) {
    this._callbacks.forEach((callback) => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error("Error in network status callback:", error);
      }
    });
  }

  _showOfflineIndicator() {
    if (this._offlineIndicator) return;

    const indicator = document.createElement("div");
    indicator.className = "offline-indicator";
    indicator.innerHTML = `
      <i class="fas fa-wifi"></i>
      <span>Anda sedang offline</span>
    `;

    Object.assign(indicator.style, {
      position: "fixed",
      bottom: "16px",
      right: "16px",
      backgroundColor: "#EF4444",
      color: "white",
      padding: "8px 16px",
      borderRadius: "4px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      zIndex: "9999",
      fontSize: "14px",
    });

    document.body.appendChild(indicator);
    this._offlineIndicator = indicator;
  }

  _hideOfflineIndicator() {
    if (this._offlineIndicator) {
      document.body.removeChild(this._offlineIndicator);
      this._offlineIndicator = null;
    }
  }

  _showOnlineNotification() {
    Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    }).fire({
      icon: "success",
      title: "Koneksi internet tersedia",
    });
  }

  _showOfflineNotification() {
    Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    }).fire({
      icon: "warning",
      title: "Anda sedang offline",
      text: "Beberapa fitur mungkin terbatas",
    });
  }

  isOnline() {
    return this._isOnline;
  }

  onNetworkChange(callback) {
    if (typeof callback !== "function") {
      console.error("Callback must be a function");
      return;
    }

    this._callbacks.push(callback);

    return () => {
      this._callbacks = this._callbacks.filter((cb) => cb !== callback);
    };
  }

  getConnectionInfo() {
    if (!("connection" in navigator)) {
      return {
        type: "unknown",
        effectiveType: "unknown",
        downlinkMax: undefined,
        rtt: undefined,
      };
    }

    const connection = navigator.connection;
    return {
      type: connection.type || "unknown",
      effectiveType: connection.effectiveType || "unknown",
      downlinkMax: connection.downlinkMax,
      rtt: connection.rtt,
    };
  }
}

const networkHelper = new NetworkHelper();

export const isOnline = () => networkHelper.isOnline();
export const setupNetworkListeners = (callback) =>
  networkHelper.onNetworkChange(callback);
export const getNetworkHelper = () => networkHelper;
export default networkHelper;
