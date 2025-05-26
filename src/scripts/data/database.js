import { openDB } from "idb";

const DB_NAME = "dicoding-story-db";
const DB_VERSION = 2; // ← PENTING: Increment version number
const CACHE_STORE = "cached-stories";
const FAVORITES_STORE = "favorite-stories";

class StoryIdb {
  static async _openDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(
          `Upgrading database from version ${oldVersion} to ${newVersion}`
        );

        // Always check and create stores regardless of version
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          console.log("Creating cached-stories store");
          const cacheStore = db.createObjectStore(CACHE_STORE, {
            keyPath: "id",
          });
          cacheStore.createIndex("createdAt", "createdAt");
          cacheStore.createIndex("cachedAt", "cachedAt");
        }

        if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
          console.log("Creating favorite-stories store");
          const favStore = db.createObjectStore(FAVORITES_STORE, {
            keyPath: "id",
          });
          favStore.createIndex("savedAt", "savedAt");
          favStore.createIndex("createdAt", "createdAt");
        }

        console.log("Database upgrade completed");
      },
      blocked() {
        console.warn("Database upgrade blocked. Please close other tabs.");
      },
      blocking() {
        console.warn("Database blocking upgrade in another tab.");
      },
    });
  }

  // Add database health check
  static async _checkDatabaseHealth() {
    try {
      const db = await this._openDB();

      // Verify both stores exist
      const storeNames = Array.from(db.objectStoreNames);
      const requiredStores = [CACHE_STORE, FAVORITES_STORE];

      for (const storeName of requiredStores) {
        if (!storeNames.includes(storeName)) {
          throw new Error(`Missing object store: ${storeName}`);
        }
      }

      console.log("Database health check passed");
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      throw error;
    }
  }

  // Enhanced transaction handling with retry logic
  static async _performTransaction(storeName, mode, operation) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this._checkDatabaseHealth();
        const db = await this._openDB();
        const tx = db.transaction(storeName, mode);
        const result = await operation(tx);
        await tx.done;
        return result;
      } catch (error) {
        attempt++;
        console.error(`Transaction attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }
  }

  static async cacheStoriesForOffline(stories) {
    if (!Array.isArray(stories)) return;

    return this._performTransaction(CACHE_STORE, "readwrite", async (tx) => {
      for (const story of stories) {
        await tx.store.put({
          ...story,
          cachedAt: new Date().toISOString(),
        });
      }
    });
  }

  static async cacheStoryForOffline(story) {
    return this._performTransaction(CACHE_STORE, "readwrite", async (tx) => {
      await tx.store.put({
        ...story,
        cachedAt: new Date().toISOString(),
      });
    });
  }

  static async getCachedStories() {
    try {
      return await this._performTransaction(
        CACHE_STORE,
        "readonly",
        async (tx) => {
          const stories = await tx.store.getAll();
          return stories.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
        }
      );
    } catch (error) {
      console.error("Failed to get cached stories:", error);
      return [];
    }
  }

  static async getCachedStoryById(id) {
    try {
      return await this._performTransaction(
        CACHE_STORE,
        "readonly",
        async (tx) => {
          return await tx.store.get(id);
        }
      );
    } catch (error) {
      console.error("Failed to get cached story:", error);
      return null;
    }
  }

  static async removeCachedStory(id) {
    return this._performTransaction(CACHE_STORE, "readwrite", async (tx) => {
      await tx.store.delete(id);
    });
  }

  static async clearCachedStories() {
    return this._performTransaction(CACHE_STORE, "readwrite", async (tx) => {
      await tx.store.clear();
    });
  }

  // FAVORITES METHODS (for user-saved stories)
  static async saveToFavorites(story) {
    return this._performTransaction(
      FAVORITES_STORE,
      "readwrite",
      async (tx) => {
        await tx.store.put({
          ...story,
          savedAt: new Date().toISOString(),
        });
      }
    );
  }

  static async removeFromFavorites(storyId) {
    return this._performTransaction(
      FAVORITES_STORE,
      "readwrite",
      async (tx) => {
        await tx.store.delete(storyId);
      }
    );
  }

  static async getFavorites() {
    try {
      return await this._performTransaction(
        FAVORITES_STORE,
        "readonly",
        async (tx) => {
          const favorites = await tx.store.getAll();
          return favorites.sort(
            (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
          );
        }
      );
    } catch (error) {
      console.error("Failed to get favorites:", error);
      return [];
    }
  }

  static async getFavoriteById(id) {
    try {
      return await this._performTransaction(
        FAVORITES_STORE,
        "readonly",
        async (tx) => {
          return await tx.store.get(id);
        }
      );
    } catch (error) {
      console.error("Failed to get favorite by ID:", error);
      return null;
    }
  }

  static async isFavorited(storyId) {
    try {
      return await this._performTransaction(
        FAVORITES_STORE,
        "readonly",
        async (tx) => {
          const favorite = await tx.store.get(storyId);
          return !!favorite;
        }
      );
    } catch (error) {
      console.error("Failed to check if favorited:", error);
      return false;
    }
  }

  static async getFavoritesCount() {
    try {
      return await this._performTransaction(
        FAVORITES_STORE,
        "readonly",
        async (tx) => {
          return await tx.store.count();
        }
      );
    } catch (error) {
      console.error("Failed to get favorites count:", error);
      return 0;
    }
  }

  static async clearFavorites() {
    return this._performTransaction(
      FAVORITES_STORE,
      "readwrite",
      async (tx) => {
        await tx.store.clear();
      }
    );
  }

  static async saveStories(stories) {
    return this.cacheStoriesForOffline(stories);
  }

  static async saveStory(story) {
    return this.cacheStoryForOffline(story);
  }

  static async getAllStories() {
    return this.getCachedStories();
  }

  static async getStoryById(id) {
    return this.getCachedStoryById(id);
  }

  static async deleteStory(id) {
    return this.removeCachedStory(id);
  }

  static async getStorageUsage() {
    try {
      await this._checkDatabaseHealth();
      const db = await this._openDB();
      const cachedCount = await db.count(CACHE_STORE);
      const favoritesCount = await db.count(FAVORITES_STORE);

      return {
        cachedStories: cachedCount,
        favoriteStories: favoritesCount,
        totalStories: cachedCount + favoritesCount,
      };
    } catch (error) {
      console.error("Failed to get storage usage:", error);
      return {
        cachedStories: 0,
        favoriteStories: 0,
        totalStories: 0,
      };
    }
  }

  static async cleanup() {
    try {
      return await this._performTransaction(
        CACHE_STORE,
        "readwrite",
        async (tx) => {
          const stories = await tx.store.getAll();
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          for (const story of stories) {
            if (story.cachedAt && new Date(story.cachedAt) < oneWeekAgo) {
              await tx.store.delete(story.id);
            }
          }
        }
      );
    } catch (error) {
      console.error("Failed to cleanup old cached stories:", error);
    }
  }

  static async exportFavorites() {
    try {
      const favorites = await this.getFavorites();
      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        favorites: favorites,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      return blob;
    } catch (error) {
      console.error("Failed to export favorites:", error);
      throw error;
    }
  }

  static async importFavorites(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      if (!data.favorites || !Array.isArray(data.favorites)) {
        throw new Error("Invalid export data format");
      }

      return await this._performTransaction(
        FAVORITES_STORE,
        "readwrite",
        async (tx) => {
          for (const story of data.favorites) {
            await tx.store.put(story);
          }
          return data.favorites.length;
        }
      );
    } catch (error) {
      console.error("Failed to import favorites:", error);
      throw error;
    }
  }

  // Force database reset (for development/debugging)
  static async resetDatabase() {
    try {
      // Close any existing connections
      const dbs = await indexedDB.databases();
      const targetDb = dbs.find((db) => db.name === DB_NAME);

      if (targetDb) {
        console.log("Deleting existing database...");
        await new Promise((resolve, reject) => {
          const deleteReq = indexedDB.deleteDatabase(DB_NAME);
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
          deleteReq.onblocked = () => {
            console.warn("Database deletion blocked. Please close other tabs.");
          };
        });
      }

      console.log("Database reset completed");
      return true;
    } catch (error) {
      console.error("Failed to reset database:", error);
      return false;
    }
  }
}

export default StoryIdb;
