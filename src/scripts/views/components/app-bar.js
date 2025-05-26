import authRepository from "../../data/auth-repository.js";
import webPushHelper from "../../utils/web-push-helper.js";
import FavoriteRepository from "../../data/favorite-repository.js";

class AppBar extends HTMLElement {
  constructor() {
    super();

    this._isAuthenticated = authRepository.isAuthenticated();
    this._isSubscribed = false;
    this._favoritesCount = 0;

    this._handleAuthChange = this._handleAuthChange.bind(this);
    this._handleLogout = this._handleLogout.bind(this);
    this._handleMenuToggle = this._handleMenuToggle.bind(this);
    this._handleSubscribe = this._handleSubscribe.bind(this);
    this._handleUnsubscribe = this._handleUnsubscribe.bind(this);
  }

  async connectedCallback() {
    this.render();

    window.addEventListener("user-logged-in", this._handleAuthChange);
    window.addEventListener("user-logged-out", this._handleAuthChange);
    window.addEventListener(
      "favorites-updated",
      this._handleFavoritesUpdated.bind(this)
    );

    this._attachEventListeners();

    // Initialize web push helper and check subscription status after render
    if (this._isAuthenticated) {
      try {
        this._isSubscribed = await webPushHelper.init();
        // Load favorites count
        await this._loadFavoritesCount();
        // Re-render to show correct button state and favorites count
        this.render();
      } catch (error) {
        console.error("Failed to initialize web push helper:", error);
        this._isSubscribed = false;
      }
    }
  }

  disconnectedCallback() {
    window.removeEventListener("user-logged-in", this._handleAuthChange);
    window.removeEventListener("user-logged-out", this._handleAuthChange);
    window.removeEventListener(
      "favorites-updated",
      this._handleFavoritesUpdated
    );

    const menuToggle = this.querySelector(".menu-toggle");
    if (menuToggle) {
      menuToggle.removeEventListener("click", this._handleMenuToggle);
    }

    const logoutButton = this.querySelector("#logoutButton");
    if (logoutButton) {
      logoutButton.removeEventListener("click", this._handleLogout);
    }

    const subscribeButton = this.querySelector("#subscribeButton");
    if (subscribeButton) {
      subscribeButton.removeEventListener("click", this._handleSubscribe);
    }

    const unsubscribeButton = this.querySelector("#unsubscribeButton");
    if (unsubscribeButton) {
      unsubscribeButton.removeEventListener("click", this._handleUnsubscribe);
    }
  }

  async _loadFavoritesCount() {
    try {
      this._favoritesCount = await FavoriteRepository.getFavoritesCount();
    } catch (error) {
      console.error("Failed to load favorites count:", error);
      this._favoritesCount = 0;
    }
  }

  _handleFavoritesUpdated() {
    this._loadFavoritesCount().then(() => {
      this._updateFavoritesCount();
    });
  }

  _updateFavoritesCount() {
    const countBadge = this.querySelector(".favorites-count-badge");
    if (countBadge) {
      countBadge.textContent = this._favoritesCount;
      countBadge.style.display =
        this._favoritesCount > 0 ? "inline-block" : "none";
    }
  }

  render() {
    const userData = authRepository.getUserData() || {};

    this.innerHTML = `
      <nav class="app-nav">
        <div class="app-nav__brand">
          <a href="#/" class="app-nav__title">Dicoding Story</a>
        </div>
        
        <button class="menu-toggle" aria-label="Toggle menu">
          <i class="fas fa-bars"></i>
        </button>
        
        <ul class="app-nav__list ${
          this._isAuthenticated ? "" : "app-nav__list--guest"
        }">
          <li class="app-nav__item">
            <a href="#/" class="app-nav__link">
              <i class="fas fa-home"></i>
              <span>Home</span>
            </a>
          </li>
          
          ${
            this._isAuthenticated
              ? `
                <li class="app-nav__item">
                  <a href="#/add" class="app-nav__link">
                    <i class="fas fa-plus-circle"></i>
                    <span>Add Story</span>
                  </a>
                </li>
                
                <li class="app-nav__item">
                  <a href="#/favorites" class="app-nav__link app-nav__link--favorites">
                    <i class="fas fa-heart"></i>
                    <span>Favorites</span>
                    <span class="favorites-count-badge" style="display: ${
                      this._favoritesCount > 0 ? "inline-block" : "none"
                    }">${this._favoritesCount}</span>
                  </a>
                </li>
                
                ${this._renderNotificationButton()}
                
                <li class="app-nav__item app-nav__item--user">
                  <span class="app-nav__user">
                    <i class="fas fa-user-circle"></i>
                    <span>${userData.name || "User"}</span>
                  </span>
                  <button id="logoutButton" class="app-nav__button">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                  </button>
                </li>
              `
              : `
                <li class="app-nav__item">
                  <a href="#/login" class="app-nav__link">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Login</span>
                  </a>
                </li>
                <li class="app-nav__item">
                  <a href="#/register" class="app-nav__link app-nav__link--register">
                    <i class="fas fa-user-plus"></i>
                    <span>Register</span>
                  </a>
                </li>
              `
          }
        </ul>
      </nav>
    `;

    this._attachEventListeners();
    // Update favorites count display after render
    if (this._isAuthenticated) {
      this._updateFavoritesCount();
    }
  }

  _renderNotificationButton() {
    // Always show button if user is authenticated and push is supported
    if (!this._isAuthenticated || !this._isPushSupported()) {
      return "";
    }

    if (this._isSubscribed) {
      return `
        <li class="app-nav__item">
          <button id="unsubscribeButton" class="app-nav__button app-nav__button--notification app-nav__button--subscribed" title="Nonaktifkan notifikasi">
            <i class="fas fa-bell"></i>
            <span>Subscribed</span>
          </button>
        </li>
      `;
    } else {
      return `
        <li class="app-nav__item">
          <button id="subscribeButton" class="app-nav__button app-nav__button--notification" title="Aktifkan notifikasi">
            <i class="fas fa-bell-slash"></i>
            <span>Subscribe</span>
          </button>
        </li>
      `;
    }
  }

  _isPushSupported() {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  _attachEventListeners() {
    const logoutButton = this.querySelector("#logoutButton");
    if (logoutButton) {
      logoutButton.addEventListener("click", this._handleLogout);
    }

    const menuToggle = this.querySelector(".menu-toggle");
    if (menuToggle) {
      menuToggle.addEventListener("click", this._handleMenuToggle);
    }

    const subscribeButton = this.querySelector("#subscribeButton");
    if (subscribeButton) {
      subscribeButton.addEventListener("click", this._handleSubscribe);
    }

    const unsubscribeButton = this.querySelector("#unsubscribeButton");
    if (unsubscribeButton) {
      unsubscribeButton.addEventListener("click", this._handleUnsubscribe);
    }
  }

  async _handleAuthChange() {
    const wasAuthenticated = this._isAuthenticated;
    this._isAuthenticated = authRepository.isAuthenticated();

    // If user just logged in, initialize push notifications and load favorites
    if (!wasAuthenticated && this._isAuthenticated) {
      this.render(); // Render first to show the subscribe button
      try {
        this._isSubscribed = await webPushHelper.init();
        await this._loadFavoritesCount();
        this.render(); // Re-render to update button state and favorites count
      } catch (error) {
        console.error("Failed to initialize web push helper:", error);
        this._isSubscribed = false;
      }
    } else {
      // If user logged out, reset subscription status and favorites count
      if (wasAuthenticated && !this._isAuthenticated) {
        this._isSubscribed = false;
        this._favoritesCount = 0;
      }
      this.render();
    }
  }

  _handleLogout(event) {
    event.preventDefault();
    authRepository.logout();
    window.location.hash = "#/";
  }

  _handleMenuToggle() {
    const navList = this.querySelector(".app-nav__list");
    navList.classList.toggle("app-nav__list--open");
  }

  async _handleSubscribe(event) {
    event.preventDefault();

    const button = event.target.closest("button");
    const originalContent = button.innerHTML;

    // Show loading state
    button.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      <span>Subscribing...</span>
    `;
    button.disabled = true;

    try {
      await webPushHelper.requestPermission();
      this._isSubscribed = webPushHelper.isSubscribed();
      this.render();
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      // Restore button state
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  }

  async _handleUnsubscribe(event) {
    event.preventDefault();

    const button = event.target.closest("button");
    const originalContent = button.innerHTML;

    // Show loading state
    button.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      <span>Unsubscribing...</span>
    `;
    button.disabled = true;

    try {
      const success = await webPushHelper.unsubscribe();
      if (success) {
        this._isSubscribed = false;
        this.render();
      } else {
        // Restore button state if failed
        button.innerHTML = originalContent;
        button.disabled = false;
      }
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error);
      // Restore button state
      button.innerHTML = originalContent;
      button.disabled = false;
    }
  }
}

customElements.define("app-bar", AppBar);

export default AppBar;
