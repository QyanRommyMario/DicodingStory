import createHomeTemplate from "../template/home-template.js";
import "../components/story-item.js";
import MapHelper from "../../utils/map-helper.js";

class HomePage {
  constructor({ stories = [], isLoading = false, error = null, container }) {
    this._stories = stories;
    this._isLoading = isLoading;
    this._error = error;
    this._container = container;
    this._mapHelper = new MapHelper();
    this._mapInitialized = false;
    this._retryHandler = null;
  }

  render() {
    this._container.innerHTML = createHomeTemplate({
      isLoading: this._isLoading,
      error: this._error,
      stories: this._stories,
    });

    if (!this._isLoading && !this._error && this._stories.length > 0) {
      this._renderStories();
      this._initMap();
    }

    if (this._error) {
      this._attachRetryHandler();
    }
  }

  _renderStories() {
    const storiesContainer = document.getElementById("storiesList");
    if (!storiesContainer) return;

    storiesContainer.innerHTML = "";

    this._stories.forEach((story) => {
      const storyItemElement = document.createElement("story-item");
      storyItemElement.story = story;
      storiesContainer.appendChild(storyItemElement);
    });
  }

  _initMap() {
    const storiesWithLocation = this._stories.filter(
      (story) =>
        story.lat && story.lon && !isNaN(story.lat) && !isNaN(story.lon)
    );

    if (storiesWithLocation.length === 0) return;

    const mapContainer = document.getElementById("storyMap");
    if (!mapContainer) return;

    this._mapHelper.initMap(mapContainer, {
      addSecondaryTileLayer: true,
    });

    this._mapHelper.addStoryMarkers(this._stories);

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

export default HomePage;
