//src/scripts/presenters/favorite-presenter.js

import FavoriteRepository from "../data/favorite-repository.js";
import {
  createFavoritePageTemplate,
  createFavoriteItemTemplate,
  createToastTemplate,
} from "../views/template/favorite-template.js";

class FavoritePresenter {
  constructor(params = {}) {
    this._params = params;
    this._view = null;
    this._confirmationResolve = null;
    this._isLoading = false;
  }

  async init() {
    try {
      const content = createFavoritePageTemplate();
      document.querySelector("#pageContent").innerHTML = content;

      this._initializeElements();
      this._bindEvents();
      await this._initView();
    } catch (error) {
      console.error("Failed to initialize FavoritePresenter:", error);
      this._showErrorPage(error.message);
    }
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

  async _initView() {
    await this._loadFavorites();
  }

  _bindEvents() {
    document
      .querySelector("#refreshFavorites")
      ?.addEventListener("click", async () => {
        await this._loadFavorites();
      });

    document
      .querySelector("#exportFavorites")
      ?.addEventListener("click", async () => {
        await this._handleExportFavorites();
      });

    document
      .querySelector("#importFavorites")
      ?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            await this._handleImportFavorites(event.target.result);
            // Reset file input
            e.target.value = "";
          };
          reader.readAsText(file);
        }
      });

    document
      .querySelector("#clearAllFavorites")
      ?.addEventListener("click", async () => {
        await this._handleClearAllFavorites();
      });

    document
      .querySelector("#retryLoad")
      ?.addEventListener("click", async () => {
        await this._loadFavorites();
      });

    this._bindModalEvents();
    this._bindDropdownEvents();
  }

  _bindModalEvents() {
    const modal = this._confirmationModal;
    if (!modal) return;

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

    // Close modal on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("active")) {
        this._hideConfirmationModal(false);
      }
    });
  }

  _bindDropdownEvents() {
    const dropdown = document.querySelector(".dropdown");
    const dropdownToggle = document.querySelector("#moreActions");

    dropdownToggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });
  }

  _bindDynamicEvents() {
    document.querySelectorAll(".btn-remove-favorite").forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        const storyId = e.target.closest(".btn-remove-favorite").dataset
          .storyId;
        if (storyId) {
          await this._handleRemoveFavorite(storyId);
        }
      });
    });

    document.querySelectorAll(".btn-share").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const storyId = e.target.closest(".btn-share").dataset.storyId;
        if (storyId) {
          this._shareStory(storyId);
        }
      });
    });
  }

  _shareStory(storyId) {
    const url = `${window.location.origin}/#/detail/${storyId}`;

    if (navigator.share) {
      navigator
        .share({
          title: "Check out this story",
          url: url,
        })
        .catch((err) => console.log("Error sharing:", err));
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          this._showSuccessMessage("Story link copied to clipboard!");
        })
        .catch(() => {
          this._showErrorMessage("Failed to copy link to clipboard.");
        });
    }
  }

  async _loadFavorites() {
    if (this._isLoading) return;

    this._isLoading = true;

    try {
      this._showLoadingState();

      console.log("Loading favorites..."); // Debug log

      const favorites = await FavoriteRepository.getFavorites();

      if (!favorites || favorites.length === 0) {
        this._showEmptyState();
      } else {
        this._renderFavorites(favorites);
        this._updateFavoritesCount(favorites.length);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
      this._showErrorState(error.message);
    } finally {
      this._isLoading = false;
    }
  }

  _renderFavorites(favorites) {
    if (!this._favoritesGrid) return;

    this._favoritesGrid.innerHTML = "";

    favorites.forEach((story) => {
      const storyElement = document.createElement("div");
      storyElement.innerHTML = createFavoriteItemTemplate(story);
      this._favoritesGrid.appendChild(storyElement.firstElementChild);
    });

    this._bindDynamicEvents();
    this._showFavoritesContent();
  }

  _updateFavoritesCount(count) {
    if (this._favoritesCount) {
      this._favoritesCount.textContent = count;
    }
  }

  async _handleRemoveFavorite(storyId) {
    try {
      const confirmed = await this._showConfirmationModal(
        "Remove Favorite",
        "Are you sure you want to remove this story from your favorites?"
      );

      if (confirmed) {
        await FavoriteRepository.removeFavorite(storyId);
        this._showSuccessMessage("Story removed from favorites!");
        await this._loadFavorites();
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      this._showErrorMessage("Failed to remove favorite. Please try again.");
    }
  }

  async _handleClearAllFavorites() {
    try {
      const confirmed = await this._showConfirmationModal(
        "Clear All Favorites",
        "Are you sure you want to remove all stories from your favorites? This action cannot be undone."
      );

      if (confirmed) {
        await FavoriteRepository.clearAllFavorites();
        this._showSuccessMessage("All favorites cleared!");
        await this._loadFavorites();
      }
    } catch (error) {
      console.error("Error clearing favorites:", error);
      this._showErrorMessage("Failed to clear favorites. Please try again.");
    }
  }

  async _handleExportFavorites() {
    try {
      const favorites = await FavoriteRepository.getFavorites();

      if (!favorites || favorites.length === 0) {
        this._showWarningMessage("No favorites to export.");
        return;
      }

      const dataStr = JSON.stringify(favorites, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(dataBlob);
      link.download = `favorites-${
        new Date().toISOString().split("T")[0]
      }.json`;
      link.click();

      URL.revokeObjectURL(link.href);
      this._showSuccessMessage("Favorites exported successfully!");
    } catch (error) {
      console.error("Error exporting favorites:", error);
      this._showErrorMessage("Failed to export favorites. Please try again.");
    }
  }

  async _handleImportFavorites(fileContent) {
    try {
      const importedFavorites = JSON.parse(fileContent);

      if (!Array.isArray(importedFavorites)) {
        throw new Error("Invalid file format. Expected an array of favorites.");
      }

      let importedCount = 0;
      for (const favorite of importedFavorites) {
        if (this._isValidFavorite(favorite)) {
          await FavoriteRepository.addFavorite(favorite);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        this._showSuccessMessage(
          `Successfully imported ${importedCount} favorites!`
        );
        await this._loadFavorites();
      } else {
        this._showWarningMessage("No valid favorites found in the file.");
      }
    } catch (error) {
      console.error("Error importing favorites:", error);
      this._showErrorMessage(
        "Failed to import favorites. Please check the file format."
      );
    }
  }

  _isValidFavorite(favorite) {
    return (
      favorite &&
      typeof favorite === "object" &&
      favorite.id &&
      favorite.title &&
      favorite.description
    );
  }

  async _showConfirmationModal(title, message) {
    if (!this._confirmationModal) return false;

    return new Promise((resolve) => {
      this._confirmationResolve = resolve;

      const titleElement =
        this._confirmationModal.querySelector("#confirmationTitle");
      const messageElement = this._confirmationModal.querySelector(
        "#confirmationMessage"
      );

      if (titleElement) titleElement.textContent = title;
      if (messageElement) messageElement.textContent = message;

      this._confirmationModal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  _hideConfirmationModal(confirmed) {
    if (!this._confirmationModal) return;

    this._confirmationModal.classList.remove("active");
    document.body.style.overflow = "";

    if (this._confirmationResolve) {
      this._confirmationResolve(confirmed);
      this._confirmationResolve = null;
    }
  }

  _showLoadingState() {
    this._hideAllStates();
    this._loadingState?.classList.add("active");
  }

  _showEmptyState() {
    this._hideAllStates();
    this._emptyState?.classList.add("active");
  }

  _showErrorState(message) {
    this._hideAllStates();
    if (this._errorState) {
      this._errorState.classList.add("active");
      const errorMessage = this._errorState.querySelector(".error-message");
      if (errorMessage) {
        errorMessage.textContent =
          message || "An error occurred while loading favorites.";
      }
    }
  }

  _showFavoritesContent() {
    this._hideAllStates();
    this._favoritesContainer?.classList.add("active");
  }

  _hideAllStates() {
    [
      this._loadingState,
      this._emptyState,
      this._errorState,
      this._favoritesContainer,
    ].forEach((element) => element?.classList.remove("active"));
  }

  _showErrorPage(message) {
    const errorContent = `
      <div class="error-page">
        <div class="error-icon">⚠️</div>
        <h2>Something went wrong</h2>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          Reload Page
        </button>
      </div>
    `;
    document.querySelector("#pageContent").innerHTML = errorContent;
  }

  _showToast(message, type = "info") {
    if (!this._toastContainer) return;

    const toast = document.createElement("div");
    toast.innerHTML = createToastTemplate(message, type);

    const toastElement = toast.firstElementChild;
    this._toastContainer.appendChild(toastElement);

    // Show toast
    setTimeout(() => {
      toastElement.classList.add("show");
    }, 100);

    // Auto hide after 3 seconds
    setTimeout(() => {
      this._hideToast(toastElement);
    }, 3000);

    // Add click to dismiss
    toastElement.addEventListener("click", () => {
      this._hideToast(toastElement);
    });
  }

  _hideToast(toastElement) {
    toastElement.classList.remove("show");
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
    }, 300);
  }

  _showSuccessMessage(message) {
    this._showToast(message, "success");
  }

  _showErrorMessage(message) {
    this._showToast(message, "error");
  }

  _showWarningMessage(message) {
    this._showToast(message, "warning");
  }

  _showInfoMessage(message) {
    this._showToast(message, "info");
  }

  // Cleanup method
  destroy() {
    this._isLoading = false;
    this._confirmationResolve = null;

    // Remove event listeners if needed
    document.removeEventListener("keydown", this._handleEscapeKey);
    document.removeEventListener("click", this._handleDocumentClick);
  }
}

export default FavoritePresenter;
