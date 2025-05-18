import { openDB } from "idb";

const DATABASE_NAME = "story-app-db";
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = "stories";

const dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      database.createObjectStore(OBJECT_STORE_NAME, { keyPath: "id" });
      console.log(`Object store ${OBJECT_STORE_NAME} berhasil dibuat`);
    }
  },
});

const StoryIdb = {
  async saveStory(story) {
    try {
      const db = await dbPromise;
      const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
      const store = tx.objectStore(OBJECT_STORE_NAME);
      await store.put(story);
      await tx.done;
      console.log("Story berhasil disimpan ke IndexedDB");
      return true;
    } catch (error) {
      console.error("Gagal menyimpan story ke IndexedDB", error);
      return false;
    }
  },
  async saveStories(stories) {
    try {
      const db = await dbPromise;
      const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
      const store = tx.objectStore(OBJECT_STORE_NAME);
      await Promise.all(stories.map((story) => store.put(story)));
      await tx.done;

      console.log(`${stories.length} stories berhasil disimpan ke IndexedDB`);
      return true;
    } catch (error) {
      console.error("Gagal menyimpan stories ke IndexedDB", error);
      return false;
    }
  },

  async getAllStories() {
    try {
      const db = await dbPromise;
      const tx = db.transaction(OBJECT_STORE_NAME, "readonly");
      const store = tx.objectStore(OBJECT_STORE_NAME);
      const stories = await store.getAll();
      return stories;
    } catch (error) {
      console.error("Gagal mengambil stories dari IndexedDB", error);
      return [];
    }
  },
  async getStoryById(id) {
    try {
      const db = await dbPromise;
      const tx = db.transaction(OBJECT_STORE_NAME, "readonly");
      const store = tx.objectStore(OBJECT_STORE_NAME);
      const story = await store.get(id);
      return story;
    } catch (error) {
      console.error(
        `Gagal mengambil story dengan ID ${id} dari IndexedDB`,
        error
      );
      return null;
    }
  },

  async deleteStory(id) {
    try {
      const db = await dbPromise;
      const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
      const store = tx.objectStore(OBJECT_STORE_NAME);
      await store.delete(id);
      await tx.done;
      console.log(`Story dengan ID ${id} berhasil dihapus dari IndexedDB`);
      return true;
    } catch (error) {
      console.error(
        `Gagal menghapus story dengan ID ${id} dari IndexedDB`,
        error
      );
      return false;
    }
  },

  async clearAllStories() {
    try {
      const db = await dbPromise;
      const tx = db.transaction(OBJECT_STORE_NAME, "readwrite");
      const store = tx.objectStore(OBJECT_STORE_NAME);
      await store.clear();
      await tx.done;
      console.log("Semua stories berhasil dihapus dari IndexedDB");
      return true;
    } catch (error) {
      console.error("Gagal menghapus semua stories dari IndexedDB", error);
      return false;
    }
  },
};

export default StoryIdb;
