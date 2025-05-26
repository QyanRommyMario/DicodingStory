//src/scripts/views/pages/favorite-page.js
import FavoritePresenter from "../../presenters/favorite-presenter.js";
import {
  createFavoritePageTemplate,
  createFavoriteItemTemplate,
  createToastTemplate,
} from "../templates/favorite-template.js";

class FavoritePage {
  constructor() {
    this._presenter = null;
    this._confirmationResolve = null;
  }

  async render() {
    return createFavoritePageTemplate();
  }

  async afterRender() {
    this._initializeElements();
    this._initializePresenter();
    this._bindEvents();
  }

  _initializeElements() {
    this._loadingState = document.querySelector("#loadingState");
    this._emptyState = document.querySelector("#emptyState");
    this._errorState = document.querySelector("#errorState");
    this._favoritesContainer = document.querySelector("#favoritesContainer");
    this._favoritesGrid = document.querySelector("#favoritesGrid");
    this._favoritesCount = document.querySelector(".count-badge");
    this._confirmationModal = document.querySelector("#confirmationModal");
    this._toastContainer = document.querySelector("#toastContainer");
  }

  _initializePresenter() {
    this._presenter = new FavoritePresenter({ view: this });
  }

  _bindEvents() {
    // Refresh favorites
    document
      .querySelector("#refreshFavorites")
      ?.addEventListener("click", () => {
        this.bindRefreshFavorites && this.bindRefreshFavorites();
      });

    // Export favorites
    document
      .querySelector("#exportFavorites")
      ?.addEventListener("click", () => {
        this.bindExportFavorites && this.bindExportFavorites();
      });

    // Import favorites
    document
      .querySelector("#importFavorites")
      ?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.bindImportFavorites &&
              this.bindImportFavorites(event.target.result);
          };
          reader.readAsText(file);
        }
      });

    // Clear all favorites
    document
      .querySelector("#clearAllFavorites")
      ?.addEventListener("click", () => {
        this.bindClearAllFavorites && this.bindClearAllFavorites();
      });

    // Retry load
    document.querySelector("#retryLoad")?.addEventListener("click", () => {
      this.bindRefreshFavorites && this.bindRefreshFavorites();
    });

    // Modal events
    this._bindModalEvents();

    // Dropdown toggle
    this._bindDropdownEvents();
  }

  _bindModalEvents() {
    const modal = this._confirmationModal;
    const overlay = modal.querySelector(".modal-overlay");
    const closeBtn = modal.querySelector("#closeConfirmation");
    const cancelBtn = modal.querySelector("#cancelConfirmation");
    const confirmBtn = modal.querySelector("#confirmAction");

    [overlay, closeBtn, cancelBtn].forEach((element) => {
      element?.addEventListener("click", () => {
        this._hideConfirmationModal(false);
      });
    });

    confirmBtn?.addEventListener("click", () => {
      this._hideConfirmationModal(true);
    });
  }

  _bindDropdownEvents() {
    const dropdown = document.querySelector(".dropdown");
    const dropdownToggle = document.querySelector("#moreActions");
    const dropdownMenu = document.querySelector(".dropdown-menu");

    dropdownToggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });
  }

  // View interface methods called by presenter
  bindRemoveFavorite(handler) {
    this._removeFavoriteHandler = handler;
    this._bindDynamicEvents();
  }

  bindClearAllFavorites(handler) {
    this.bindClearAllFavorites = handler;
  }

  bindExportFavorites(handler) {
    this.bindExportFavorites = handler;
  }

  bindImportFavorites(handler) {
    this.bindImportFavorites = handler;
  }

  bindRefreshFavorites(handler) {
    this.bindRefreshFavorites = handler;
  }

  _bindDynamicEvents() {
    // Remove favorite buttons
    document.querySelectorAll(".btn-remove-favorite").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const storyId = e.target.closest(".btn-remove-favorite").dataset
          .storyId;
        if (this._removeFavoriteHandler) {
          await this._removeFavoriteHandler(storyId);
        }
      });
    });

    // Share buttons
    document.querySelectorAll(".btn-share").forEach((button) => {
      button.addEventListener("click", (e) => {
        const storyId = e.target.closest(".btn-share").dataset.storyId;
        this._shareStory(storyId);
      });
    });
  }

  _shareStory(storyId) {
    const url = `${window.location.origin}/#/detail/${storyId}`;

    if (navigator.share) {
      navigator.share({
        title: "Check out this story",
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.showSuccessMessage("Story link copied to clipboard!");
      });
    }
  }

  showLoadingState() {
    this._hideAllStates();
    this._loadingState.style.display = "block";
  }

  hideLoadingState() {
    this._loadingState.style.display = "none";
  }

  showEmptyState() {
    this._hideAllStates();
    this._emptyState.style.display = "block";
  }

  showErrorState(message = "Something went wrong") {
    this._hideAllStates();
    this._errorState.style.display = "block";
    this._errorState.querySelector(".error-message").textContent = message;
  }

  displayFavorites(favorites) {
    this._hideAllStates();
    this._favoritesContainer.style.display = "block";

    this._favoritesGrid.innerHTML = favorites
      .map((story) => createFavoriteItemTemplate(story))
      .join("");

    this._bindDynamicEvents();
  }

  updateFavoritesCount(count) {
    this._favoritesCount.textContent = count.toString();
  }

  _hideAllStates() {
    this._loadingState.style.display = "none";
    this._emptyState.style.display = "none";
    this._errorState.style.display = "none";
    this._favoritesContainer.style.display = "none";
  }

  async showConfirmationDialog(title, message) {
    return new Promise((resolve) => {
      this._confirmationResolve = resolve;

      this._confirmationModal.querySelector("#confirmationTitle").textContent =
        title;
      this._confirmationModal.querySelector(
        "#confirmationMessage"
      ).textContent = message;
      this._confirmationModal.style.display = "flex";

      // Add animation class
      setTimeout(() => {
        this._confirmationModal.classList.add("show");
      }, 10);
    });
  }

  _hideConfirmationModal(confirmed) {
    this._confirmationModal.classList.remove("show");

    setTimeout(() => {
      this._confirmationModal.style.display = "none";
      if (this._confirmationResolve) {
        this._confirmationResolve(confirmed);
        this._confirmationResolve = null;
      }
    }, 300);
  }

  showSuccessMessage(message) {
    this._showToast("success", message);
  }

  showErrorMessage(message) {
    this._showToast("error", message);
  }

  showInfoMessage(message) {
    this._showToast("info", message);
  }

  _showToast(type, message) {
    const toast = document.createElement("div");
    toast.innerHTML = createToastTemplate(type, message);
    const toastElement = toast.firstElementChild;

    this._toastContainer.appendChild(toastElement);

    // Show animation
    setTimeout(() => {
      toastElement.classList.add("show");
    }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
      this._removeToast(toastElement);
    }, 5000);

    // Close button event
    toastElement.querySelector(".toast-close").addEventListener("click", () => {
      this._removeToast(toastElement);
    });
  }

  _removeToast(toastElement) {
    toastElement.classList.add("hide");
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
    }, 300);
  }

  updateFavoriteButton(storyId, isFavorited) {
    // This method would be used in other pages to update favorite button states
    const buttons = document.querySelectorAll(
      `[data-story-id="${storyId}"] .btn-favorite`
    );
    buttons.forEach((button) => {
      button.classList.toggle("favorited", isFavorited);
      button.title = isFavorited ? "Remove from favorites" : "Add to favorites";

      const text = button.querySelector(".favorite-text");
      if (text) {
        text.textContent = isFavorited ? "Favorited" : "Add to Favorites";
      }
    });
  }
}

export default FavoritePage;
