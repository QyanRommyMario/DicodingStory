import createDetailTemplate from "../template/detail-template.js";
import MapHelper from "../../utils/map-helper.js";

class DetailPage {
  constructor({ story = null, isLoading = false, error = null, container }) {
    this._story = story;
    this._isLoading = isLoading;
    this._error = error;
    this._container = container;
    this._mapHelper = new MapHelper();
    this._mapInitialized = false;
    this._retryHandler = null;
  }

  render() {
    this._container.innerHTML = createDetailTemplate({
      isLoading: this._isLoading,
      error: this._error,
      story: this._story,
    });

    if (this._story && !this._isLoading && !this._error) {
      this._initMap();
    }

    if (this._error) {
      this._attachRetryHandler();
    }
  }

  _initMap() {
    const { lat, lon } = this._story;

    if (!lat || !lon || isNaN(lat) || isNaN(lon) || this._mapInitialized) {
      return;
    }

    const mapContainer = document.getElementById("detailMap");
    if (!mapContainer) {
      return;
    }

    const map = this._mapHelper.initMap(mapContainer, {
      center: [lat, lon],
      zoom: 15,
    });

    const marker = L.marker([lat, lon]).addTo(map);
    marker
      .bindPopup(
        `
      <div class="map-popup">
        <strong>${this._story.name}</strong>
        <p>Posted this story from here</p>
      </div>
    `
      )
      .openPopup();

    this._mapInitialized = true;
  }

  _attachRetryHandler() {
    const retryButton = document.getElementById("retryButton");
    if (retryButton && this._retryHandler) {
      retryButton.addEventListener("click", this._retryHandler);
    }
  }

  setRetryHandler(handler) {
    this._retryHandler = handler;

    if (this._error) {
      this._attachRetryHandler();
    }
  }

  cleanup() {
    if (this._mapInitialized && this._mapHelper) {
      this._mapHelper.clearMarkers();
    }
  }
}

export default DetailPage;
