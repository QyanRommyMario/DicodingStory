//src/scripts/components/story-item.js

import FavoriteRepository from "../../data/favorite-repository.js";

class StoryItem extends HTMLElement {
  constructor() {
    super();
    this._story = null;
    this._isFavorited = false;
    this._isLoading = false;

    this._handleToggleFavorite = this._handleToggleFavorite.bind(this);
  }

  async connectedCallback() {
    if (this._story) {
      await this._checkFavoriteStatus();
      this.render();
    }
  }

  set story(story) {
    this._story = story;
    // Call async initialization without blocking the setter
    this._initializeStory();
  }

  get story() {
    return this._story;
  }

  async _initializeStory() {
    if (this.isConnected && this._story) {
      await this._checkFavoriteStatus();
      this.render();
    }
  }

  async _checkFavoriteStatus() {
    if (this._story && this._story.id) {
      try {
        this._isFavorited = await FavoriteRepository.isFavorited(
          this._story.id
        );
        console.log(
          `Story ${this._story.id} favorite status:`,
          this._isFavorited
        ); // Debug log
      } catch (error) {
        console.error("Failed to check favorite status:", error);
        this._isFavorited = false;
      }
    }
  }

  async _handleToggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this._story || this._isLoading) return;

    this._isLoading = true;

    try {
      const favoriteButton = this.querySelector(".story-item__favorite-btn");
      if (favoriteButton) {
        favoriteButton.disabled = true;
        favoriteButton.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Loading...';
      }

      console.log("Toggling favorite for story:", this._story.id); // Debug log

      const result = await FavoriteRepository.toggleFavorite(this._story);

      console.log("Toggle result:", result); // Debug log

      // Update local state based on the result
      this._isFavorited = result.isFavorited;

      // Update the button appearance
      this._updateFavoriteButton();

      // Show success message
      this._showToastMessage(result.message, "success");

      // Dispatch custom event to notify other components
      this.dispatchEvent(
        new CustomEvent("favoriteToggled", {
          detail: {
            storyId: this._story.id,
            isFavorited: this._isFavorited,
            action: result.action,
          },
          bubbles: true,
        })
      );
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      this._showToastMessage(
        error.message || "Failed to update favorite. Please try again.",
        "error"
      );

      // Revert the state on error
      await this._checkFavoriteStatus();
      this._updateFavoriteButton();
    } finally {
      this._isLoading = false;
      const favoriteButton = this.querySelector(".story-item__favorite-btn");
      if (favoriteButton) {
        favoriteButton.disabled = false;
        this._updateFavoriteButton();
      }
    }
  }

  _updateFavoriteButton() {
    const favoriteButton = this.querySelector(".story-item__favorite-btn");
    if (favoriteButton && !this._isLoading) {
      const icon = this._isFavorited ? "fas fa-heart" : "far fa-heart";
      const text = this._isFavorited ? "Favorited" : "Favorite";
      const className = this._isFavorited
        ? "story-item__favorite-btn favorited"
        : "story-item__favorite-btn";

      favoriteButton.className = className;
      favoriteButton.innerHTML = `<i class="${icon}"></i> ${text}`;
      favoriteButton.title = this._isFavorited
        ? "Remove from favorites"
        : "Add to favorites";
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
          max-width: 300px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  _formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  _truncateText(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  // Method to update favorite status from external sources
  async updateFavoriteStatus(isFavorited) {
    this._isFavorited = isFavorited;
    this._updateFavoriteButton();
  }

  // Method to refresh favorite status from database
  async refreshFavoriteStatus() {
    await this._checkFavoriteStatus();
    this._updateFavoriteButton();
  }

  render() {
    if (!this._story) {
      this.innerHTML =
        '<div class="story-item__error">No story data available</div>';
      return;
    }

    const { id, name, description, photoUrl, createdAt, lat, lon } =
      this._story;
    const hasLocation =
      lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));

    const favoriteButtonClass = this._isFavorited
      ? "story-item__favorite-btn favorited"
      : "story-item__favorite-btn";
    const favoriteIcon = this._isFavorited ? "fas fa-heart" : "far fa-heart";
    const favoriteText = this._isFavorited ? "Favorited" : "Favorite";

    this.innerHTML = `
      <article class="story-item">
        <div class="story-item__image-container">
          <img 
            src="${photoUrl}" 
            alt="Story by ${name}"
            class="story-item__image"
            loading="lazy"
            onerror="this.src='/images/placeholder.jpg'"
          />
          <button class="${favoriteButtonClass}" 
                  title="${
                    this._isFavorited
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }"
                  ${this._isLoading ? "disabled" : ""}>
            <i class="${favoriteIcon}"></i> ${favoriteText}
          </button>
        </div>
        
        <div class="story-item__content">
          <div class="story-item__meta">
            <span class="story-item__author">
              <i class="fas fa-user"></i>
              ${name}
            </span>
            <span class="story-item__date">
              <i class="fas fa-calendar-alt"></i>
              ${this._formatDate(createdAt)}
            </span>
            ${
              hasLocation
                ? `
              <span class="story-item__location">
                <i class="fas fa-map-marker-alt"></i>
                Location Available
              </span>`
                : ""
            }
          </div>
          
          <h3 class="story-item__title">
            <a href="#/detail/${id}" class="story-item__link">
              Story by ${name}
            </a>
          </h3>
          
          <p class="story-item__description">
            ${this._truncateText(description)}
          </p>
          
          <div class="story-item__actions">
            <a href="#/detail/${id}" class="story-item__button">
              Read More
              <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </article>
      
      <style>
        .story-item {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .story-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        
        .story-item__image-container {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
        }
        
        .story-item__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .story-item__favorite-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 8px 12px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }
        
        .story-item__favorite-btn:hover {
          background-color: rgba(239, 68, 68, 0.9);
          transform: scale(1.05);
        }
        
        .story-item__favorite-btn.favorited {
          background-color: rgba(239, 68, 68, 0.9);
        }
        
        .story-item__favorite-btn.favorited:hover {
          background-color: rgba(220, 38, 38, 0.9);
        }
        
        .story-item__favorite-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .story-item__content {
          padding: 16px;
        }
        
        .story-item__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 8px;
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .story-item__meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .story-item__title {
          margin: 8px 0;
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .story-item__link {
          text-decoration: none;
          color: #1f2937;
          transition: color 0.2s ease;
        }
        
        .story-item__link:hover {
          color: #3b82f6;
        }
        
        .story-item__description {
          color: #6b7280;
          line-height: 1.5;
          margin-bottom: 16px;
        }
        
        .story-item__actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .story-item__button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background-color 0.2s ease;
        }
        
        .story-item__button:hover {
          background-color: #2563eb;
        }
        
        .story-item__error {
          padding: 20px;
          text-align: center;
          color: #ef4444;
          font-style: italic;
        }
      </style>
    `;

    // Bind the favorite button event after rendering
    const favoriteButton = this.querySelector(".story-item__favorite-btn");
    if (favoriteButton) {
      favoriteButton.addEventListener("click", this._handleToggleFavorite);
    }
  }

  // Cleanup method
  disconnectedCallback() {
    const favoriteButton = this.querySelector(".story-item__favorite-btn");
    if (favoriteButton) {
      favoriteButton.removeEventListener("click", this._handleToggleFavorite);
    }
  }
}

customElements.define("story-item", StoryItem);

export default StoryItem;
