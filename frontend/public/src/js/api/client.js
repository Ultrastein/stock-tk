import { getToken, clearAuth } from '../store/state.js';
import { syncQueue } from '../store/db.js';

function getBaseUrl() {
  // Determinar URL del backend según entorno (producción GitHub Pages vs local)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'ultrastein.github.io') {
      return 'https://stock-tk-api.onrender.com/api';
    }
    // Desarrollo local: mismo host, puerto del backend
    return `http://${host}:3000/api`;
  }
  return 'http://localhost:3000/api';
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name   = 'ApiError';
  }
}

export async function request(method, path, body = null, options = {}) {
  const url = getBaseUrl() + path;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeout = options.timeout || 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      clearAuth();
      window.location.hash = '#/login';
      throw new ApiError(401, 'No autorizado. Redirigiendo al login...');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.mensaje || `Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    // Network error or timeout
    if (error instanceof TypeError || error.name === 'AbortError') {
      if (method === 'GET') {
        throw new ApiError(503, 'Sin conexión al servidor.');
      }

      // For non-GET requests, enqueue if not noQueue
      if (!options.noQueue) {
        const op = {
          id: `${Date.now()}-${Math.random()}`,
          method,
          url,
          headers,
          body,
          timestamp: Date.now(),
        };
        await syncQueue.add(op);
        return { queued: true, offline: true, mensaje: 'Operación encolada para sincronización.' };
      }

      throw new ApiError(503, 'Sin conexión al servidor.');
    }

    throw error;
  }
}

export const api = {
  get:    (path, opts)       => request('GET',    path, null, opts),
  post:   (path, body, opts) => request('POST',   path, body, opts),
  put:    (path, body, opts) => request('PUT',    path, body, opts),
  patch:  (path, body, opts) => request('PATCH',  path, body, opts),
  delete: (path, opts)       => request('DELETE', path, null, opts),
};

export default api;
