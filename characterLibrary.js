/* ===========================================
   CharacterLibrary — Persistent Character Store
   Saves characters for reuse across projects
   =========================================== */

const CharacterLibrary = (() => {
  const DB_NAME = 'SceneGenLibrary';
  const STORE = 'characters';
  let db = null;

  async function getDB() {
    if (db) return db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }

  // Save or update a character in the library
  async function save(character) {
    const d = await getDB();
    const entry = {
      id: character.id || `lib_char_${Date.now()}`,
      name: character.name,
      description: character.description || '',
      character_dna: character.character_dna || {},
      character_invariants: character.character_invariants || [],
      physical_traits: character.physical_traits || {},
      thumbnail: character.thumbnail || null, // base64 of reference image
      thumbnailMime: character.thumbnailMime || 'image/jpeg',
      savedAt: Date.now()
    };
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put(entry);
      req.onsuccess = () => resolve(entry);
      req.onerror = () => reject(req.error);
    });
  }

  // List all saved characters
  async function list() {
    const d = await getDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Load a single character by id
  async function load(id) {
    const d = await getDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Delete a character from library
  async function remove(id) {
    const d = await getDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  return { save, list, load, remove };
})();
