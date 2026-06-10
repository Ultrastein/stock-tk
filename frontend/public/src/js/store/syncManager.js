import { syncQueue } from './db.js';
import { set, getToken } from './state.js';

let _syncing = false;

async function updatePendingCount() {
  const ops = await syncQueue.getAll();
  set('syncPendiente', ops.length);
}

async function flush() {
  if (_syncing || !navigator.onLine) return;
  _syncing = true;

  const ops = await syncQueue.getAll();
  if (!ops.length) { _syncing = false; return; }

  console.log(`[SyncManager] Procesando ${ops.length} operaciones en cola...`);

  for (const op of ops) {
    try {
      // Reemplazar el token almacenado con el token actual (puede haber renovado)
      const freshHeaders = { ...op.headers };
      const currentToken = getToken();
      if (currentToken) {
        freshHeaders['Authorization'] = `Bearer ${currentToken}`;
      }

      const res = await fetch(op.url, {
        method:  op.method,
        headers: freshHeaders,
        body:    op.body ? JSON.stringify(op.body) : undefined,
      });

      if (res.ok || res.status === 409) {
        await syncQueue.remove(op.id);
        console.log(`[SyncManager] ✅ Op ${op.id} sincronizada`);
      } else if (res.status === 401) {
        // Token expirado y sin forma de renovar → eliminar op para no bloquear la cola
        await syncQueue.remove(op.id);
        console.warn(`[SyncManager] ⚠️ Op ${op.id} eliminada (401 token expirado en replay)`);
      }
    } catch (e) {
      if (!navigator.onLine) break; // sin red, no tiene sentido seguir intentando
      console.warn(`[SyncManager] ❌ Op ${op.id} falló`, e.message);
    }
  }

  await updatePendingCount();
  _syncing = false;
}

export function init() {
  window.addEventListener('online', () => {
    console.log('[SyncManager] Red disponible — flush...');
    flush();
  });

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(reg =>
      reg.sync.register('sync-operations').catch(() => {})
    );
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'SYNC_COMPLETE') {
        updatePendingCount();
        window.dispatchEvent(new CustomEvent('sync-complete', { detail: e.data }));
      }
    });
  }

  updatePendingCount();
  return { flush, updatePendingCount };
}

export default { init, flush, updatePendingCount };
