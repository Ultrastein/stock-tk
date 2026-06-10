/**
 * IndexedDB Wrapper - Promise-based API for offline storage
 *
 * Database: StockControlDB v1 (synced with sw.js)
 * Object stores:
 *   - syncQueue: keyPath 'id', autoIncrement true
 *   - cachedData: keyPath 'key'
 *   - userData: keyPath 'key'
 */

// Module-level cache for open connection
let _db = null;

/**
 * Opens IndexedDB connection and creates stores if needed.
 * Returns Promise<IDBDatabase>
 */
export function openDB() {
  if (_db) {
    return Promise.resolve(_db);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StockControlDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create syncQueue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }

      // Create cachedData store
      if (!db.objectStoreNames.contains('cachedData')) {
        db.createObjectStore('cachedData', { keyPath: 'key' });
      }

      // Create userData store
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      _db = request.result;
      resolve(_db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Helper: wraps an IDBRequest from a store operation in a Promise
 * @param {string} storeName - Name of object store
 * @param {string} mode - 'readonly' or 'readwrite'
 * @param {Function} fn - Function that receives store and returns IDBRequest
 * @returns {Promise} Resolves to request.result
 */
function tx(storeName, mode, fn) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = fn(store);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  });
}

/**
 * Cache operations - for storing API responses (read-only offline)
 * Storage format: { key, value, ts }
 */
export const cache = {
  /**
   * Retrieve cached value
   * @param {string} key
   * @returns {Promise<Object|undefined>} { key, value, ts } or undefined
   */
  get: (key) => tx('cachedData', 'readonly', (store) => store.get(key)),

  /**
   * Store value with timestamp
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  set: (key, value) => tx('cachedData', 'readwrite', (store) => {
    return store.put({ key, value, ts: Date.now() });
  }),

  /**
   * Delete a cached entry
   * @param {string} key
   * @returns {Promise<void>}
   */
  delete: (key) => tx('cachedData', 'readwrite', (store) => store.delete(key)),

  /**
   * Clear all cached data
   * @returns {Promise<void>}
   */
  clear: () => tx('cachedData', 'readwrite', (store) => store.clear()),
};

/**
 * User data operations - for persisting user profile offline
 * Storage format: { key, value }
 */
export const userData = {
  /**
   * Retrieve user data value
   * @param {string} key
   * @returns {Promise<Object|undefined>} { key, value } or undefined
   */
  get: (key) => tx('userData', 'readonly', (store) => store.get(key)),

  /**
   * Store user data value
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  set: (key, value) => tx('userData', 'readwrite', (store) => {
    return store.put({ key, value });
  }),

  /**
   * Delete a user data entry
   * @param {string} key
   * @returns {Promise<void>}
   */
  delete: (key) => tx('userData', 'readwrite', (store) => store.delete(key)),

  /**
   * Clear all user data (logout)
   * @returns {Promise<void>}
   */
  clear: () => tx('userData', 'readwrite', (store) => store.clear()),
};

/**
 * Sync queue operations - for offline mutations (add to queue, process later)
 * Storage format: { id, ...operation, ts, retries }
 */
export const syncQueue = {
  /**
   * Add operation to sync queue
   * @param {Object} operation - Operation details (url, method, headers, body, etc.)
   * @returns {Promise<number>} New operation ID
   */
  add: (operation) => tx('syncQueue', 'readwrite', (store) => {
    return store.add({
      ...operation,
      ts: Date.now(),
      retries: 0,
    });
  }),

  /**
   * Get all queued operations
   * @returns {Promise<Array>} All operations in queue
   */
  getAll: () => {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('syncQueue', 'readonly');
        const store = transaction.objectStore('syncQueue');
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      });
    });
  },

  /**
   * Remove operation from queue by ID
   * @param {number} id - Operation ID
   * @returns {Promise<void>}
   */
  remove: (id) => tx('syncQueue', 'readwrite', (store) => store.delete(id)),

  /**
   * Clear entire sync queue
   * @returns {Promise<void>}
   */
  clear: () => tx('syncQueue', 'readwrite', (store) => store.clear()),
};

/**
 * Default export - all modules and helpers
 */
export default {
  openDB,
  cache,
  userData,
  syncQueue,
};
