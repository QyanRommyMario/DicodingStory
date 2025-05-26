import DetailPage from "../views/pages/detail-page.js";
import storyRepository from "../data/story-repository.js";
import FavoriteRepository from "../data/favorite-repository.js";
import { applyCustomAnimation } from "../utils/view-transition.js";

class DetailPresenter {
  constructor(params = {}) {
    this._params = params;
    this._storyId = params.id;
    this._view = null;
    this._container = document.querySelector("#pageContent");
    this._isLoading = false;
    this._error = null;
    this._story = null;
    this._isFavorited = false;

    this._fetchStory = this._fetchStory.bind(this);
    this._handleRetry = this._handleRetry.bind(this);
    this._handleToggleFavorite = this._handleToggleFavorite.bind(this);
  }

  async init() {
    if (!this._storyId) {
      this._error = "Story ID is required";
      this._renderError();
      return;
    }

    this._renderLoading();

    applyCustomAnimation("#pageContent", {
      name: "detail-transition",
      duration: 400,
    });

    await this._fetchStory();
  }

  async _fetchStory() {
    try {
      this._isLoading = true;
      this._error = null;

      this._renderLoading();

      const response = await storyRepository.getStoryById(this._storyId);
      this._story = response.story;

      // Check if story is favorited
      this._isFavorited = await FavoriteRepository.isFavorited(this._storyId);

      this._isLoading = false;
      this._renderView();
    } catch (error) {
      console.error(`Failed to fetch story with ID ${this._storyId}:`, error);

      this._isLoading = false;
      this._error =
        error.message || "Failed to load story details. Please try again.";

      this._renderError();
    }
  }

  async _handleToggleFavorite() {
    if (!this._story) return;

    try {
      const result = await FavoriteRepository.toggleFavorite(this._story);

      this._isFavorited = result.action === "added";

      // Update the view to reflect the change
      this._renderView();

      // Show success message
      this._showToastMessage(result.message, "success");
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      this._showToastMessage(
        "Failed to update favorite. Please try again.",
        "error"
      );
    }
  }

  _showToastMessage(message, type = "info") {
    // Create a simple toast notification
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas ${
          type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
        }"></i>
        <span>${message}</span>
      </div>
    `;

    // Add styles if not already present
    if (!document.querySelector("#toast-styles")) {
      const styles = document.createElement("style");
      styles.id = "toast-styles";
      styles.textContent = `
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          z-index: 10000;
          animation: slideInRight 0.3s ease-out;
        }
        .toast-success {
          background-color: #10b981;
        }
        .toast-error {
          background-color: #ef4444;
        }
        .toast-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.style.animation = "slideInRight 0.3s ease-out reverse";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  _renderLoading() {
    this._view = new DetailPage({
      isLoading: true,
      story: null,
      error: null,
      isFavorited: false,
      container: this._container,
    });

    this._view.render();
  }

  _renderError() {
    this._view = new DetailPage({
      isLoading: false,
      story: null,
      error: this._error,
      isFavorited: false,
      container: this._container,
    });

    this._view.render();
    this._view.setRetryHandler(this._handleRetry);
  }

  _renderView() {
    this._view = new DetailPage({
      isLoading: false,
      story: this._story,
      error: null,
      isFavorited: this._isFavorited,
      container: this._container,
    });

    this._view.render();
    this._view.setFavoriteHandler(this._handleToggleFavorite);
  }

  _handleRetry() {
    this._fetchStory();
  }

  cleanup() {
    if (this._view) {
      this._view.cleanup();
    }
  }
}

export default DetailPresenter;
