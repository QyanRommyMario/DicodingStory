import API_CONFIG from "../config/api-config.js";
import L from "leaflet";

// Fix untuk Leaflet icons di bundler environment
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Hapus default icon URL dan set yang baru
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

class MapHelper {
  constructor() {
    this._map = null;
    this._markers = [];
    this._selectedLocation = null;
    this._mapOptions = {
      center: API_CONFIG.MAP.DEFAULT_CENTER,
      zoom: API_CONFIG.MAP.DEFAULT_ZOOM,
    };
    this._baseLayers = {};
  }

  initMap(containerElement, options = {}) {
    if (!containerElement) {
      throw new Error("Container element is required");
    }

    const mapOptions = { ...this._mapOptions, ...options };

    this._map = L.map(containerElement, {
      center: mapOptions.center,
      zoom: mapOptions.zoom,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    this._addDefaultTileLayer();

    if (options.addSecondaryTileLayer || mapOptions.addSecondaryTileLayer) {
      this._addSecondaryTileLayer(API_CONFIG.MAP.SECONDARY_TILE_LAYER);
    }

    if (Object.keys(this._baseLayers).length > 1) {
      L.control.layers(this._baseLayers).addTo(this._map);
    }

    return this._map;
  }

  addStoryMarkers(stories) {
    if (!this._map) {
      throw new Error("Map not initialized. Call initMap first.");
    }

    this.clearMarkers();

    const storiesWithLocation = stories.filter(
      (story) =>
        story.lat && story.lon && !isNaN(story.lat) && !isNaN(story.lon)
    );

    if (storiesWithLocation.length === 0) {
      console.warn("No stories with valid location data");
      return;
    }

    storiesWithLocation.forEach((story) => {
      const marker = L.marker([story.lat, story.lon]);
      marker.bindPopup(this._createPopupContent(story));
      marker.addTo(this._map);
      this._markers.push(marker);
    });

    if (this._markers.length > 1) {
      const group = L.featureGroup(this._markers);
      this._map.fitBounds(group.getBounds().pad(0.1));
    } else if (this._markers.length === 1) {
      this._map.setView(
        [storiesWithLocation[0].lat, storiesWithLocation[0].lon],
        15
      );
    }
  }

  setupLocationSelector(onLocationSelected) {
    if (!this._map) {
      throw new Error("Map not initialized. Call initMap first.");
    }

    this.clearMarkers();

    this._map.on("click", (event) => {
      const { lat, lng } = event.latlng;

      this.clearMarkers();

      const marker = L.marker([lat, lng]).addTo(this._map);
      this._markers.push(marker);

      this._selectedLocation = { lat, lon: lng };

      if (typeof onLocationSelected === "function") {
        onLocationSelected(this._selectedLocation);
      }
    });
  }

  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };

          if (this._map) {
            this._map.setView([location.lat, location.lon], 15);

            this.clearMarkers();
            const marker = L.marker([location.lat, location.lon])
              .addTo(this._map)
              .bindPopup("Your location")
              .openPopup();

            this._markers.push(marker);
            this._selectedLocation = location;
          }

          resolve(location);
        },
        (error) => {
          reject(new Error(`Could not get your location: ${error.message}`));
        }
      );
    });
  }

  getSelectedLocation() {
    return this._selectedLocation;
  }

  clearMarkers() {
    if (this._map) {
      this._markers.forEach((marker) => this._map.removeLayer(marker));
      this._markers = [];
    }
  }

  _addDefaultTileLayer() {
    const osmLayer = L.tileLayer(API_CONFIG.MAP.TILE_LAYER, {
      attribution: API_CONFIG.MAP.ATTRIBUTION,
      maxZoom: 19,
    }).addTo(this._map);

    this._baseLayers["OpenStreetMap"] = osmLayer;
  }

  _addSecondaryTileLayer(layerConfig) {
    if (!layerConfig || !layerConfig.url) {
      return;
    }

    const secondaryLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution || "",
      maxZoom: layerConfig.maxZoom || 19,
      subdomains: layerConfig.subdomains || [],
    });

    this._baseLayers[layerConfig.name || "Satellite"] = secondaryLayer;
  }

  _createPopupContent(story) {
    const popupContent = document.createElement("div");
    popupContent.className = "map-popup";

    const thumbnail = document.createElement("img");
    thumbnail.src = story.photoUrl;
    thumbnail.alt = `Photo by ${story.name}`;
    thumbnail.className = "map-popup__thumbnail";

    // Error handling untuk gambar
    thumbnail.onerror = function () {
      this.src = "/images/placeholder-image.jpg"; // atau URL placeholder lainnya
      this.alt = "Image not available";
    };

    popupContent.appendChild(thumbnail);

    const infoDiv = document.createElement("div");
    infoDiv.className = "map-popup__info";

    const name = document.createElement("h4");
    name.textContent = story.name;
    infoDiv.appendChild(name);

    const description = document.createElement("p");
    description.textContent = this._truncateText(story.description, 100);
    infoDiv.appendChild(description);

    const link = document.createElement("a");
    link.href = `#/detail/${story.id}`;
    link.textContent = "View details";
    link.className = "map-popup__link";
    infoDiv.appendChild(link);

    popupContent.appendChild(infoDiv);

    return popupContent;
  }

  _truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + "...";
  }
}

export default MapHelper;
