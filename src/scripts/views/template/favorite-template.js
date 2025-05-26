//src/scripts/views/template/favorite-template.js

const createFavoriteItemTemplate = (story) => `
  <div class="story-item" data-story-id="${story.id}">
    <div class="story-image">
      <img src="${story.photoUrl || "/images/placeholder.jpg"}" 
           alt="${story.name}" 
           onerror="this.src='/images/placeholder.jpg'">
    </div>
    <div class="story-content">
      <div class="story-header">
        <h3 class="story-title">${story.name}</h3>
        <div class="story-actions">
          <button class="btn-remove-favorite" 
                  data-story-id="${story.id}" 
                  title="Remove from favorites">
            <i class="fas fa-heart-broken"></i>
          </button>
        </div>
      </div>
      <p class="story-description">${story.description}</p>
      <div class="story-meta">
        <span class="story-date">
          <i class="fas fa-calendar-alt"></i>
          ${new Date(story.createdAt).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <span class="story-saved-date">
          <i class="fas fa-heart"></i>
          Saved on ${new Date(story.savedAt).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>
      <div class="story-actions-bottom">
        <a href="/#/detail/${story.id}" class="btn btn-primary">
          <i class="fas fa-eye"></i>
          View Details
        </a>
        <button class="btn btn-secondary btn-share" data-story-id="${story.id}">
          <i class="fas fa-share-alt"></i>
          Share
        </button>
      </div>
    </div>
  </div>
`;

const createFavoritePageTemplate = () => `
  <div class="favorite-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <i class="fas fa-heart"></i>
          My Favorite Stories
        </h1>
        <div class="header-actions">
          <div class="favorites-count">
            <span class="count-badge">0</span>
            <span class="count-label">Favorites</span>
          </div>
          <div class="header-buttons">
            <button class="btn btn-outline" id="refreshFavorites">
              <i class="fas fa-sync-alt"></i>
              Refresh
            </button>
            <div class="dropdown">
              <button class="btn btn-outline dropdown-toggle" id="moreActions">
                <i class="fas fa-ellipsis-v"></i>
                More
              </button>
              <div class="dropdown-menu">
                <button class="dropdown-item" id="exportFavorites">
                  <i class="fas fa-download"></i>
                  Export Favorites
                </button>
                <label class="dropdown-item" for="importFavorites">
                  <i class="fas fa-upload"></i>
                  Import Favorites
                  <input type="file" id="importFavorites" accept=".json" style="display: none;">
                </label>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item text-danger" id="clearAllFavorites">
                  <i class="fas fa-trash-alt"></i>
                  Clear All Favorites
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="page-content">
      <div class="loading-state" id="loadingState" style="display: none;">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading your favorite stories...</p>
      </div>

      <div class="empty-state" id="emptyState" style="display: none;">
        <div class="empty-icon">
          <i class="fas fa-heart"></i>
        </div>
        <h3>No Favorite Stories Yet</h3>
        <p>Stories you mark as favorites will appear here. Start exploring and save your favorite stories!</p>
        <a href="/#/home" class="btn btn-primary">
          <i class="fas fa-compass"></i>
          Explore Stories
        </a>
      </div>

      <div class="error-state" id="errorState" style="display: none;">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Failed to Load Favorites</h3>
        <p class="error-message">Something went wrong while loading your favorite stories.</p>
        <button class="btn btn-primary" id="retryLoad">
          <i class="fas fa-redo"></i>
          Try Again
        </button>
      </div>

      <div class="favorites-container" id="favoritesContainer">
        <div class="favorites-grid" id="favoritesGrid">
        </div>
      </div>
    </div>
  </div>

  <div class="modal" id="confirmationModal" style="display: none;">
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title" id="confirmationTitle">Confirm Action</h3>
        <button class="modal-close" id="closeConfirmation">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p class="modal-message" id="confirmationMessage">Are you sure you want to perform this action?</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancelConfirmation">Cancel</button>
        <button class="btn btn-danger" id="confirmAction">Confirm</button>
      </div>
    </div>
  </div>

  <div class="toast-container" id="toastContainer">
  </div>
`;

const createFavoriteButtonTemplate = (isFavorited = false) => `
  <button class="btn-favorite ${isFavorited ? "favorited" : ""}" 
          title="${isFavorited ? "Remove from favorites" : "Add to favorites"}">
    <i class="fas fa-heart"></i>
    <span class="favorite-text">${
      isFavorited ? "Favorited" : "Add to Favorites"
    }</span>
  </button>
`;

const createToastTemplate = (type, message) => `
  <div class="toast toast-${type}" data-toast>
    <div class="toast-icon">
      <i class="fas fa-${
        type === "success"
          ? "check-circle"
          : type === "error"
          ? "exclamation-circle"
          : "info-circle"
      }"></i>
    </div>
    <div class="toast-content">
      <p class="toast-message">${message}</p>
    </div>
    <button class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  </div>
`;

const createFavoriteStatsTemplate = (stats) => `
  <div class="favorite-stats">
    <div class="stat-item">
      <div class="stat-number">${stats.totalFavorites}</div>
      <div class="stat-label">Total Favorites</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">${stats.thisMonth}</div>
      <div class="stat-label">This Month</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">${stats.thisWeek}</div>
      <div class="stat-label">This Week</div>
    </div>
  </div>
`;

export {
  createFavoriteItemTemplate,
  createFavoritePageTemplate,
  createFavoriteButtonTemplate,
  createToastTemplate,
  createFavoriteStatsTemplate,
};
