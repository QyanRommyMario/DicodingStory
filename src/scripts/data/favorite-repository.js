//src/scripts/data/favorite-repository.js

import StoryIdb from "./database.js";

class FavoriteRepository {
  static async addToFavorites(story) {
    try {
      // Pastikan story memiliki properti yang diperlukan
      if (!story || !story.id) {
        throw new Error("Invalid story data: missing id");
      }

      // Tambahkan timestamp savedAt jika belum ada
      const storyToSave = {
        ...story,
        savedAt: story.savedAt || new Date().toISOString(),
      };

      await StoryIdb.saveToFavorites(storyToSave);
      return { success: true, message: "Story added to favorites" };
    } catch (error) {
      console.error("Error adding to favorites:", error);
      if (error.message?.includes("object stores was not found")) {
        throw new Error(
          "Database error: Please refresh the page and try again"
        );
      }
      throw new Error("Failed to add story to favorites");
    }
  }

  static async removeFromFavorites(storyId) {
    try {
      if (!storyId) {
        throw new Error("Invalid story ID");
      }

      await StoryIdb.removeFromFavorites(storyId);
      return { success: true, message: "Story removed from favorites" };
    } catch (error) {
      console.error("Error removing from favorites:", error);
      if (error.message?.includes("object stores was not found")) {
        throw new Error(
          "Database error: Please refresh the page and try again"
        );
      }
      throw new Error("Failed to remove story from favorites");
    }
  }

  static async getFavorites() {
    try {
      const favorites = await StoryIdb.getFavorites();
      console.log("Retrieved favorites:", favorites.length); // Debug log
      return favorites || [];
    } catch (error) {
      console.error("Error getting favorites:", error);
      if (error.message?.includes("object stores was not found")) {
        return [];
      }
      throw new Error("Failed to get favorites");
    }
  }

  static async getFavoriteById(id) {
    try {
      if (!id) {
        return null;
      }
      return await StoryIdb.getFavoriteById(id);
    } catch (error) {
      console.error("Error getting favorite by id:", error);
      if (error.message?.includes("object stores was not found")) {
        return null;
      }
      throw new Error("Failed to get favorite by id");
    }
  }

  static async isFavorited(storyId) {
    try {
      if (!storyId) {
        return false;
      }
      const result = await StoryIdb.isFavorited(storyId);
      console.log(`Story ${storyId} is favorited:`, result); // Debug log
      return result;
    } catch (error) {
      console.error("Error checking if favorited:", error);
      return false;
    }
  }

  static async getFavoritesCount() {
    try {
      return await StoryIdb.getFavoritesCount();
    } catch (error) {
      console.error("Error getting favorites count:", error);
      return 0;
    }
  }

  static async clearAllFavorites() {
    try {
      await StoryIdb.clearFavorites();
      return { success: true, message: "All favorites cleared" };
    } catch (error) {
      console.error("Error clearing favorites:", error);
      if (error.message?.includes("object stores was not found")) {
        throw new Error(
          "Database error: Please refresh the page and try again"
        );
      }
      throw new Error("Failed to clear favorites");
    }
  }

  static async exportFavorites() {
    try {
      const favorites = await this.getFavorites();
      if (favorites.length === 0) {
        throw new Error("No favorites to export");
      }

      return await StoryIdb.exportFavorites();
    } catch (error) {
      console.error("Error exporting favorites:", error);
      if (error.message?.includes("object stores was not found")) {
        throw new Error(
          "Database error: Please refresh the page and try again"
        );
      }
      throw new Error("Failed to export favorites");
    }
  }

  static async importFavorites(jsonData) {
    try {
      const importedCount = await StoryIdb.importFavorites(jsonData);
      return {
        success: true,
        message: `Successfully imported ${importedCount} favorites`,
        count: importedCount,
      };
    } catch (error) {
      console.error("Error importing favorites:", error);
      if (error.message?.includes("object stores was not found")) {
        throw new Error(
          "Database error: Please refresh the page and try again"
        );
      }
      if (error.message?.includes("Invalid export data")) {
        throw new Error(
          "Invalid file format: Please select a valid favorites export file"
        );
      }
      throw new Error("Failed to import favorites");
    }
  }

  static async toggleFavorite(story) {
    try {
      if (!story || !story.id) {
        throw new Error("Invalid story data");
      }

      const isFavorited = await this.isFavorited(story.id);
      console.log(
        `Toggling favorite for story ${story.id}, currently favorited:`,
        isFavorited
      ); // Debug log

      if (isFavorited) {
        await this.removeFromFavorites(story.id);
        return {
          success: true,
          action: "removed",
          message: "Story removed from favorites",
          isFavorited: false,
        };
      } else {
        await this.addToFavorites(story);
        return {
          success: true,
          action: "added",
          message: "Story added to favorites",
          isFavorited: true,
        };
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      if (error.message?.includes("object stores was not found")) {
        throw new Error(
          "Database error: Please refresh the page and try again"
        );
      }
      throw new Error("Failed to toggle favorite");
    }
  }

  static async addMultipleToFavorites(stories) {
    const results = [];

    for (const story of stories) {
      try {
        await this.addToFavorites(story);
        results.push({ id: story.id, success: true });
      } catch (error) {
        results.push({ id: story.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Added ${successCount} stories to favorites${
        failCount > 0 ? `, ${failCount} failed` : ""
      }`,
      results,
      successCount,
      failCount,
    };
  }

  static async removeMultipleFromFavorites(storyIds) {
    const results = [];

    for (const storyId of storyIds) {
      try {
        await this.removeFromFavorites(storyId);
        results.push({ id: storyId, success: true });
      } catch (error) {
        results.push({ id: storyId, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Removed ${successCount} stories from favorites${
        failCount > 0 ? `, ${failCount} failed` : ""
      }`,
      results,
      successCount,
      failCount,
    };
  }

  static async getFavoritesPaginated(page = 1, limit = 10) {
    try {
      const allFavorites = await this.getFavorites();
      const totalCount = allFavorites.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFavorites = allFavorites.slice(startIndex, endIndex);

      return {
        favorites: paginatedFavorites,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: endIndex < totalCount,
          hasPrevPage: page > 1,
          limit,
        },
      };
    } catch (error) {
      console.error("Error getting paginated favorites:", error);
      if (error.message?.includes("object stores was not found")) {
        return {
          favorites: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalCount: 0,
            hasNextPage: false,
            hasPrevPage: false,
            limit,
          },
        };
      }
      throw new Error("Failed to get paginated favorites");
    }
  }

  // Method untuk debugging - bisa dihapus di production
  static async debugFavorites() {
    try {
      const favorites = await this.getFavorites();
      const count = await this.getFavoritesCount();
      console.log("Debug - Favorites:", favorites);
      console.log("Debug - Count:", count);
      return { favorites, count };
    } catch (error) {
      console.error("Debug error:", error);
      return { favorites: [], count: 0 };
    }
  }
}

export default FavoriteRepository;
