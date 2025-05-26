import createDetailTemplate from "../template/detail-template.js";

class DetailPage {
  constructor({
    isLoading = false,
    story = null,
    error = null,
    isFavorited = false,
    container,
  }) {
    this._isLoading = isLoading;
    this._story = story;
    this._error = error;
    this._isFavorited = isFavorited;
    this._container = container;
    this._retryHandler = null;
    this._favoriteHandler = null;
  }

  render() {
    if (!this._container) {
      console.error("Container element not found");
      return;
    }

    this._container.innerHTML = createDetailTemplate({
      isLoading: this._isLoading,
      story: this._story,
      error: this._error,
      isFavorited: this._isFavorited,
    });

    this._bindEvents();
    this._initializeMap();
  }

  _bindEvents() {
    // Bind retry button for error state
    const retryButton = document.querySelector("#retryButton");
    if (retryButton && this._retryHandler) {
      retryButton.addEventListener("click", this._retryHandler);
    }

    // Bind favorite button
    const favoriteButton = document.querySelector("#favoriteButton");
    if (favoriteButton && this._favoriteHandler) {
      favoriteButton.addEventListener("click", this._favoriteHandler);
    }
  }

  _initializeMap() {
    if (
      !this._story ||
      !this._story.lat ||
      !this._story.lon ||
      this._isLoading ||
      this._error
    ) {
      return;
    }

    const mapContainer = document.querySelector("#detailMap");
    if (!mapContainer) return;

    try {
      // Simple map implementation - you can replace this with your preferred map library
      // This is a placeholder that shows coordinates
      const lat = parseFloat(this._story.lat);
      const lon = parseFloat(this._story.lon);

      if (isNaN(lat) || isNaN(lon)) {
        mapContainer.innerHTML = `
          <div class="map-placeholder">
            <p><i class="fas fa-map-marker-alt"></i> Location coordinates are invalid</p>
          </div>
        `;
        return;
      }

      // If you have a map library like Leaflet or Google Maps, initialize it here
      // For now, showing a placeholder with coordinates
      mapContainer.innerHTML = `
        <div class="map-placeholder">
          <div class="map-info">
            <h4><i class="fas fa-map-marker-alt"></i> Story Location</h4>
            <p><strong>Latitude:</strong> ${lat}</p>
            <p><strong>Longitude:</strong> ${lon}</p>
            <a 
              href="https://www.google.com/maps?q=${lat},${lon}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="button secondary"
            >
              <i class="fas fa-external-link-alt"></i> View on Google Maps
            </a>
          </div>
        </div>
        
        <style>
          .map-placeholder {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            color: white;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .map-info h4 {
            margin-bottom: 1rem;
            font-size: 1.25rem;
          }
          
          .map-info p {
            margin: 0.5rem 0;
            opacity: 0.9;
          }
          
          .map-info .button {
            margin-top: 1rem;
          }
        </style>
      `;
    } catch (error) {
      console.error("Error initializing map:", error);
      mapContainer.innerHTML = `
        <div class="map-placeholder">
          <p><i class="fas fa-exclamation-triangle"></i> Unable to load map</p>
        </div>
      `;
    }
  }

  setRetryHandler(handler) {
    this._retryHandler = handler;
  }

  setFavoriteHandler(handler) {
    this._favoriteHandler = handler;
  }

  cleanup() {
    // Clean up any event listeners or resources
    this._retryHandler = null;
    this._favoriteHandler = null;
  }
}

export default DetailPage;
