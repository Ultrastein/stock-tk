/**
 * Observable State Store
 *
 * Global state management for authentication, online status, alerts, and sync.
 * Pure vanilla JS, no external dependencies.
 *
 * Provides:
 * - Reactive state with subscribe/get/set/patch
 * - Auth helpers (setAuth, clearAuth, getToken, isAuthenticated, hasRole)
 * - Auto-detection of online/offline status
 * - Subscriber callbacks notified on state changes
 */

/**
 * Module-level state object
 * @type {Object}
 */
const _state = {
  usuario: null,           // { id, email, nombre, rol } | null
  token: null,            // string | null
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,  // boolean
  alertas: [],            // array
  syncPendiente: 0,       // number — count of offline queued ops
};

/**
 * Module-level subscribers map
 * Key: state key (string)
 * Value: Set of subscriber functions
 * @type {Object<string, Set<Function>>}
 */
const _subscribers = {};

/**
 * Subscribe to changes on a specific state key
 * Calls the function immediately with current value, then on every change.
 *
 * @param {string} key - State key to subscribe to
 * @param {Function} fn - Callback function(newValue, oldValue)
 * @returns {Function} Unsubscribe function
 */
export function subscribe(key, fn) {
  if (!_subscribers[key]) {
    _subscribers[key] = new Set();
  }
  _subscribers[key].add(fn);

  // Call immediately with current value
  fn(_state[key], undefined);

  // Return unsubscribe function
  return () => {
    if (_subscribers[key]) {
      _subscribers[key].delete(fn);
    }
  };
}

/**
 * Get current value of a state key
 *
 * @param {string} key - State key
 * @returns {any} Current value
 */
export function get(key) {
  return _state[key];
}

/**
 * Set a state key and notify subscribers
 *
 * @param {string} key - State key
 * @param {any} value - New value
 */
export function set(key, value) {
  const oldValue = _state[key];
  if (oldValue === value) {
    return; // No change
  }
  _state[key] = value;

  // Notify subscribers
  if (_subscribers[key]) {
    _subscribers[key].forEach((fn) => {
      try {
        fn(value, oldValue);
      } catch (err) {
        console.error(`Error in subscriber for key "${key}":`, err);
      }
    });
  }
}

/**
 * Set multiple state keys at once
 * More efficient than multiple set() calls for bulk updates.
 *
 * @param {Object} updates - Object with key-value pairs to update
 */
export function patch(updates) {
  Object.entries(updates).forEach(([key, value]) => {
    const oldValue = _state[key];
    if (oldValue !== value) {
      _state[key] = value;

      // Notify subscribers
      if (_subscribers[key]) {
        _subscribers[key].forEach((fn) => {
          try {
            fn(value, oldValue);
          } catch (err) {
            console.error(`Error in subscriber for key "${key}":`, err);
          }
        });
      }
    }
  });
}

/**
 * Set authentication (token + usuario)
 * Saves token to localStorage and updates state
 *
 * @param {string} token - JWT or auth token
 * @param {Object} usuario - User object { id, email, nombre, rol }
 */
export function setAuth(token, usuario) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('auth_token', token);
  }
  patch({
    token,
    usuario,
  });
}

/**
 * Clear authentication
 * Removes token from localStorage and resets state
 */
export function clearAuth() {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('auth_token');
  }
  patch({
    token: null,
    usuario: null,
  });
}

/**
 * Get current token from state or localStorage
 * Falls back to localStorage if state.token is null
 *
 * @returns {string|null} Auth token or null
 */
export function getToken() {
  if (_state.token) {
    return _state.token;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('auth_token');
  }
  return null;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Check if current user has one of the specified roles
 * Returns false if no user is logged in
 *
 * @param {...string} roles - Role(s) to check
 * @returns {boolean}
 */
export function hasRole(...roles) {
  if (!_state.usuario) {
    return false;
  }
  return roles.includes(_state.usuario.rol);
}

/**
 * Auto-wire online/offline detection on module load
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    set('online', true);
  });

  window.addEventListener('offline', () => {
    set('online', false);
  });
}

/**
 * Default export - all public methods and state
 */
export default {
  get,
  set,
  patch,
  subscribe,
  setAuth,
  clearAuth,
  getToken,
  isAuthenticated,
  hasRole,
};
