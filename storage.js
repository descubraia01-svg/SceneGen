/* ===========================================
   Storage Module — LocalStorage + IndexedDB
   =========================================== */

const Storage = (() => {
  const DB_NAME = 'SceneGenDB';
  const DB_VERSION = 1;
  const STORES = {
    images: 'images',
    state: 'state',
    generated: 'generatedImages'
  };
  let db = null;

  // --- IndexedDB ---
  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { db = request.result; resolve(db); };
      request.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORES.images)) d.createObjectStore(STORES.images, { keyPath: 'id' });
        if (!d.objectStoreNames.contains(STORES.state)) d.createObjectStore(STORES.state, { keyPath: 'key' });
        if (!d.objectStoreNames.contains(STORES.generated)) d.createObjectStore(STORES.generated, { keyPath: 'id' });
      };
    });
  }

  async function idbPut(storeName, data) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(storeName, key) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGetAll(storeName) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDelete(storeName, key) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbClear(storeName) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Public API ---
  return {
    // LocalStorage helpers
    setLocal(key, value) {
      try {
        // If it's an object or array, we must stringify it.
        // If it's a string, number, or boolean, we save it directly (or via String/JSON.stringify for non-strings)
        const valToSave = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
        localStorage.setItem('sg_' + key, valToSave);
      } catch (e) {
        console.warn('LocalStorage setItem failed:', e);
      }
    },
    getLocal(key, fallback = null) {
      try {
        const v = localStorage.getItem('sg_' + key);
        if (v === null) return fallback;
        
        // Try to parse as JSON (for objects, arrays, booleans, numbers)
        // If it fails, it's a raw string.
        try {
          const parsed = JSON.parse(v);
          // If we parsed a number/boolean/object, return it.
          return parsed;
        } catch (e) {
          // If parsing fails, it's just a raw string
          return v;
        }
      } catch (e) {
        return fallback;
      }
    },
    removeLocal(key) {
      try { localStorage.removeItem('sg_' + key); } catch (e) {}
    },

    // Image storage (IndexedDB)
    async saveImage(id, data, type, mimeType = 'image/png') {
      await idbPut(STORES.images, { id, data, type, mimeType, timestamp: Date.now() });
    },
    async getImage(id) { return idbGet(STORES.images, id); },
    async getAllImages() { return idbGetAll(STORES.images); },
    async deleteImage(id) { await idbDelete(STORES.images, id); },

    // Generated images (IndexedDB)
    async saveGenerated(id, data) {
      await idbPut(STORES.generated, { id, ...data, timestamp: Date.now() });
    },
    async getGenerated(id) { return idbGet(STORES.generated, id); },
    async getAllGenerated() { return idbGetAll(STORES.generated); },

    // App state (IndexedDB for large data)
    async saveState(key, value) {
      await idbPut(STORES.state, { key, value, timestamp: Date.now() });
    },
    async getState(key) {
      const result = await idbGet(STORES.state, key);
      return result ? result.value : null;
    },
    async deleteState(key) {
      await idbDelete(STORES.state, key);
    },

    // Clear everything
    async clearAll() {
      await idbClear(STORES.images);
      await idbClear(STORES.state);
      await idbClear(STORES.generated);
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sg_'));
      keys.forEach(k => localStorage.removeItem(k));
    },

    // Export entire project
    async exportProject() {
      const images = await idbGetAll(STORES.images);
      const generated = await idbGetAll(STORES.generated);
      const stateItems = await idbGetAll(STORES.state);
      const settings = {};
      
      // Use getLocal to get correctly typed values instead of raw strings
      Object.keys(localStorage).filter(k => k.startsWith('sg_')).forEach(k => {
        const cleanKey = k.replace('sg_', '');
        settings[k] = this.getLocal(cleanKey);
      });
      
      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings,
        state: stateItems,
        images,
        generated
      };
    },

    // Import project
    async importProject(data) {
      await this.clearAll();
      // Restore LocalStorage
      if (data.settings) {
        Object.entries(data.settings).forEach(([k, v]) => {
          const cleanKey = k.replace('sg_', '');
          this.setLocal(cleanKey, v);
        });
      }
      // Restore state
      if (data.state) {
        for (const item of data.state) await idbPut(STORES.state, item);
      }
      // Restore images
      if (data.images) {
        for (const img of data.images) await idbPut(STORES.images, img);
      }
      // Restore generated
      if (data.generated) {
        for (const gen of data.generated) await idbPut(STORES.generated, gen);
      }
    }
  };
})();
