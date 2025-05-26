import api from "./api.js";
import API_CONFIG from "../config/api-config.js";
import StoryIdb from "./database.js";

class StoryRepository {
  constructor() {
    this.offlineQueueKey = "offline_story_queue";
    this.offlineAssetsKey = "offline_story_assets";
    this.favoritesKey = "user_favorites";
    this.syncInProgress = false;
    this._setupPeriodicSync();
  }

  isOnline() {
    return navigator.onLine;
  }

  async getStories({ page, size, location } = {}) {
    try {
      if (this.isOnline()) {
        const response = await api.get(API_CONFIG.ENDPOINTS.STORIES, {
          page,
          size,
          location,
        });
        if (response.error === false && response.listStory) {
          await StoryIdb.cacheStoriesForOffline(response.listStory);
          this._cacheStoryImages(response.listStory);
        }
        return response;
      } else {
        const stories = await StoryIdb.getCachedStories();
        return {
          error: false,
          message: "Stories loaded from offline storage",
          listStory: stories,
        };
      }
    } catch (error) {
      console.error("Error getting stories:", error);
      if (!this.isOnline() || error.message.includes("Failed to fetch")) {
        const stories = await StoryIdb.getCachedStories();
        return {
          error: false,
          message: "Stories loaded from offline storage",
          listStory: stories,
        };
      }
      throw error;
    }
  }

  async getStoryById(id) {
    if (!id) {
      throw new Error("Story ID is required");
    }
    try {
      if (this.isOnline()) {
        const response = await api.get(`${API_CONFIG.ENDPOINTS.STORIES}/${id}`);
        if (response.error === false && response.story) {
          await StoryIdb.cacheStoryForOffline(response.story);
          if (response.story.photoUrl) {
            this._cacheStoryImage(response.story.photoUrl);
          }
        }
        return response;
      } else {
        const story = await StoryIdb.getCachedStoryById(id);
        if (story) {
          return {
            error: false,
            message: "Story loaded from offline storage",
            story,
          };
        } else {
          return {
            error: true,
            message: "Story not found in offline storage",
          };
        }
      }
    } catch (error) {
      console.error(`Error getting story ${id}:`, error);
      if (!this.isOnline() || error.message.includes("Failed to fetch")) {
        const story = await StoryIdb.getCachedStoryById(id);
        if (story) {
          return {
            error: false,
            message: "Story loaded from offline storage",
            story,
          };
        }
      }
      throw error;
    }
  }

  async saveStoryToFavorites(story) {
    try {
      await StoryIdb.saveToFavorites(story);
      if (story.photoUrl) {
        this._cacheStoryImage(story.photoUrl);
      }
      window.dispatchEvent(
        new CustomEvent("story-favorited", {
          detail: { storyId: story.id, story },
        })
      );
      return {
        error: false,
        message: "Story saved to favorites successfully",
      };
    } catch (error) {
      console.error("Error saving story to favorites:", error);
      return {
        error: true,
        message: "Failed to save story to favorites",
      };
    }
  }

  async removeStoryFromFavorites(storyId) {
    try {
      await StoryIdb.removeFromFavorites(storyId);
      window.dispatchEvent(
        new CustomEvent("story-unfavorited", {
          detail: { storyId },
        })
      );
      return {
        error: false,
        message: "Story removed from favorites successfully",
      };
    } catch (error) {
      console.error("Error removing story from favorites:", error);
      return {
        error: true,
        message: "Failed to remove story from favorites",
      };
    }
  }

  async getFavoriteStories() {
    try {
      const favorites = await StoryIdb.getFavorites();
      return {
        error: false,
        listStory: favorites,
        message: "Favorite stories loaded successfully",
      };
    } catch (error) {
      console.error("Error getting favorite stories:", error);
      return {
        error: true,
        listStory: [],
        message: "Failed to load favorite stories",
      };
    }
  }

  async isStoryFavorited(storyId) {
    try {
      return await StoryIdb.isFavorited(storyId);
    } catch (error) {
      console.error("Error checking if story is favorited:", error);
      return false;
    }
  }

  async toggleStoryFavorite(story) {
    try {
      const isFavorited = await this.isStoryFavorited(story.id);
      if (isFavorited) {
        return await this.removeStoryFromFavorites(story.id);
      } else {
        return await this.saveStoryToFavorites(story);
      }
    } catch (error) {
      console.error("Error toggling story favorite:", error);
      return {
        error: true,
        message: "Failed to toggle favorite status",
      };
    }
  }

  async addStory({ description, photo, lat, lon }, useAuth = true) {
    if (!description || !photo) {
      throw new Error("Description and photo are required");
    }
    if (!this.isOnline()) {
      const compressedPhoto = await this._tryCompressImage(photo);
      const tempId = await this._addToOfflineQueue(
        { description, photo: compressedPhoto, lat, lon },
        useAuth
      );
      const tempStory = {
        id: tempId,
        description,
        photoUrl: URL.createObjectURL(compressedPhoto),
        createdAt: new Date().toISOString(),
        lat,
        lon,
        isPending: true,
      };
      await StoryIdb.cacheStoryForOffline(tempStory);
      return {
        error: false,
        message: "Story saved offline and will be uploaded when online",
        tempId,
        tempStory,
      };
    }
    const endpoint = useAuth
      ? API_CONFIG.ENDPOINTS.STORIES
      : API_CONFIG.ENDPOINTS.GUEST_STORY;
    const formData = new FormData();
    formData.append("description", description);
    formData.append("photo", photo);
    if (lat !== undefined && lon !== undefined) {
      formData.append("lat", lat);
      formData.append("lon", lon);
    }
    return api.postForm(endpoint, formData, useAuth);
  }

  async _tryCompressImage(photoBlob, maxSizeMB = 1) {
    try {
      if (typeof imageCompression === "function") {
        const maxSizeInMB = maxSizeMB;
        const options = {
          maxSizeMB: maxSizeInMB,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        return await imageCompression(photoBlob, options);
      }
      return photoBlob;
    } catch (error) {
      console.warn("Image compression failed, using original:", error);
      return photoBlob;
    }
  }

  async _addToOfflineQueue(storyData, useAuth) {
    const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    if (storyData.photo instanceof Blob) {
      await this._storePhotoOffline(tempId, storyData.photo);
      storyData.photoRef = tempId;
      delete storyData.photo;
    }
    const queueItem = {
      id: tempId,
      data: storyData,
      useAuth,
      timestamp: Date.now(),
      type: "add",
      status: "pending",
      retries: 0,
    };
    const offlineQueue = JSON.parse(
      localStorage.getItem(this.offlineQueueKey) || "[]"
    );
    offlineQueue.push(queueItem);
    localStorage.setItem(this.offlineQueueKey, JSON.stringify(offlineQueue));
    this._registerBackgroundSync();
    return tempId;
  }

  async _storePhotoOffline(id, photoBlob) {
    try {
      const db = await indexedDB.open("offline-assets-db", 1);
      db.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("photos")) {
          db.createObjectStore("photos", { keyPath: "id" });
        }
      };
      return new Promise((resolve, reject) => {
        db.onsuccess = (event) => {
          const db = event.target.result;
          const tx = db.transaction("photos", "readwrite");
          const store = tx.objectStore("photos");
          const request = store.put({ id, photo: photoBlob });
          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(request.error);
          tx.oncomplete = () => db.close();
        };
        db.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error("Failed to store photo offline:", error);
      return false;
    }
  }

  async _getOfflinePhoto(id) {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("offline-assets-db", 1);
        request.onsuccess = (event) => {
          const db = event.target.result;
          const tx = db.transaction("photos", "readonly");
          const store = tx.objectStore("photos");
          const getRequest = store.get(id);
          getRequest.onsuccess = () => {
            resolve(getRequest.result?.photo || null);
          };
          getRequest.onerror = () => {
            reject(getRequest.error);
          };
          tx.oncomplete = () => db.close();
        };
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error("Failed to retrieve offline photo:", error);
      return null;
    }
  }

  async syncOfflineQueue() {
    if (!this.isOnline() || this.syncInProgress) {
      return;
    }
    this.syncInProgress = true;
    try {
      const offlineQueue = JSON.parse(
        localStorage.getItem(this.offlineQueueKey) || "[]"
      );
      if (offlineQueue.length === 0) {
        this.syncInProgress = false;
        return;
      }
      const updatedQueue = [];
      let syncProgress = 0;
      const totalItems = offlineQueue.filter(
        (item) => item.status === "pending"
      ).length;
      if (totalItems > 0) {
        window.dispatchEvent(
          new CustomEvent("offline-sync-start", {
            detail: { total: totalItems },
          })
        );
      }
      for (const item of offlineQueue) {
        if (item.status !== "pending") {
          updatedQueue.push(item);
          continue;
        }
        try {
          if (item.type === "add") {
            if (item.data.photoRef && !item.data.photo) {
              const photoBlob = await this._getOfflinePhoto(item.data.photoRef);
              if (photoBlob) {
                item.data.photo = photoBlob;
              } else {
                throw new Error("Failed to retrieve offline photo");
              }
              delete item.data.photoRef;
            }
            const response = await this.addStory(item.data, item.useAuth);
            if (!response.error) {
              item.status = "completed";
              item.response = response;
              if (response.story) {
                await StoryIdb.removeCachedStory(item.id);
                await StoryIdb.cacheStoryForOffline(response.story);
              }
              this._notifyStoryUploaded(item);
              if (item.data.photoRef) {
                this._deleteOfflinePhoto(item.data.photoRef);
              }
            } else {
              item.status = "failed";
              item.error = response.message;
              item.retries += 1;
              if (item.retries < 3) {
                item.status = "pending";
                updatedQueue.push(item);
              }
            }
          }
          syncProgress++;
          window.dispatchEvent(
            new CustomEvent("offline-sync-progress", {
              detail: { current: syncProgress, total: totalItems },
            })
          );
        } catch (error) {
          item.status = "failed";
          item.error = error.message;
          item.retries += 1;
          if (item.retries < 3) {
            item.status = "pending";
            updatedQueue.push(item);
          }
        }
      }
      localStorage.setItem(this.offlineQueueKey, JSON.stringify(updatedQueue));
      window.dispatchEvent(
        new CustomEvent("offline-sync-complete", {
          detail: {
            success: syncProgress,
            failed: totalItems - syncProgress,
          },
        })
      );
    } finally {
      this.syncInProgress = false;
    }
  }

  async _deleteOfflinePhoto(id) {
    try {
      const db = await indexedDB.open("offline-assets-db", 1);
      return new Promise((resolve, reject) => {
        db.onsuccess = (event) => {
          const db = event.target.result;
          const tx = db.transaction("photos", "readwrite");
          const store = tx.objectStore("photos");
          const request = store.delete(id);
          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(request.error);
          tx.oncomplete = () => db.close();
        };
        db.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error("Failed to delete offline photo:", error);
      return false;
    }
  }

  _notifyStoryUploaded(item) {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Story Uploaded", {
          body: "Your offline story has been successfully uploaded!",
          icon: "/favicon.ico",
          data: {
            url: `/story/${item.response?.story?.id || ""}`,
            timestamp: new Date().getTime(),
          },
        });
      } catch (error) {
        console.error("Failed to show notification", error);
      }
    }
    window.dispatchEvent(
      new CustomEvent("story-uploaded", {
        detail: {
          tempId: item.id,
          story: item.response?.story,
        },
      })
    );
  }

  async subscribeToPushNotifications(subscription) {
    const endpoint = API_CONFIG.ENDPOINTS.NOTIFICATIONS_SUBSCRIBE;
    return api.post(endpoint, subscription, true);
  }

  async unsubscribeFromPushNotifications(endpoint) {
    const unsubEndpoint = API_CONFIG.ENDPOINTS.NOTIFICATIONS_SUBSCRIBE;
    return api.delete(
      `${unsubEndpoint}?endpoint=${encodeURIComponent(endpoint)}`,
      true
    );
  }

  _registerBackgroundSync() {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register("sync-new-stories").catch((error) => {
          console.error("Failed to register sync:", error);
        });
      });
    }
  }

  async _setupPeriodicSync() {
    if ("serviceWorker" in navigator) {
      try {
        const status = await navigator.permissions.query({
          name: "periodic-background-sync",
        });
        if (status.state === "granted") {
          navigator.serviceWorker.ready.then(async (registration) => {
            if ("periodicSync" in registration) {
              await registration.periodicSync.register("sync-stories", {
                minInterval: 24 * 60 * 60 * 1000,
              });
              console.log("Periodic sync registered!");
            }
          });
        }
      } catch (error) {
        console.error("Periodic sync could not be registered:", error);
      }
    }
  }

  async _cacheStoryImages(stories) {
    if (!("caches" in window)) return;
    try {
      const cache = await caches.open("story-images-cache");
      const imageUrls = stories
        .filter((story) => story.photoUrl)
        .map((story) => story.photoUrl);
      for (const url of imageUrls) {
        const match = await cache.match(url);
        if (!match) {
          fetch(url, { mode: "no-cors" })
            .then((response) => cache.put(url, response))
            .catch((error) =>
              console.warn("Failed to cache image:", url, error)
            );
        }
      }
    } catch (error) {
      console.error("Failed to cache story images:", error);
    }
  }

  async _cacheStoryImage(url) {
    if (!("caches" in window) || !url) return;
    try {
      const cache = await caches.open("story-images-cache");
      const match = await cache.match(url);
      if (!match) {
        fetch(url, { mode: "no-cors" })
          .then((response) => cache.put(url, response))
          .catch((error) => console.warn("Failed to cache image:", url, error));
      }
    } catch (error) {
      console.error("Failed to cache story image:", error);
    }
  }

  async _getConnectionQuality() {
    if ("connection" in navigator) {
      const connection = navigator.connection;
      if (connection.saveData) {
        return "save-data";
      }
      if (connection.effectiveType) {
        return connection.effectiveType;
      }
    }
    return "unknown";
  }

  async cleanupExpiredCache() {
    if ("caches" in window) {
      try {
        const cache = await caches.open("story-images-cache");
        const keys = await cache.keys();
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000;
        for (const request of keys) {
          const response = await cache.match(request);
          const headers = response?.headers;
          if (headers && headers.get("date")) {
            const date = new Date(headers.get("date")).getTime();
            if (now - date > maxAge) {
              await cache.delete(request);
            }
          }
        }
      } catch (error) {
        console.error("Failed to cleanup cache:", error);
      }
    }
  }
}

const storyRepository = new StoryRepository();

window.addEventListener("online", () => {
  storyRepository.syncOfflineQueue();
});

if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SYNC_OFFLINE_STORIES") {
      storyRepository.syncOfflineQueue();
    }
  });
}

storyRepository.cleanupExpiredCache();

export default storyRepository;
