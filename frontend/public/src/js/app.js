// © 2024 TK+ by Tecno Kids — Desarrollo: prof. Nicolas Kane
// Software de uso exclusivo para instancias autorizadas.
// Queda prohibida su copia, redistribución o uso en dominios no autorizados.

// ── Protección de dominio ─────────────────────────────────────────────────────
(function checkLicense() {
  const host = location.hostname;
  const ALLOWED = ['localhost', '127.0.0.1', 'ultrastein.github.io'];
  const isPrivate =
    ALLOWED.some(h => host === h || host.endsWith('.' + h)) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith('.local') ||
    host.endsWith('.lan') ||
    host === '[::1]';
  if (isPrivate) return;

  document.documentElement.style.cssText = 'height:100%;margin:0';
  document.body.style.cssText =
    'min-height:100%;display:flex;align-items:center;justify-content:center;' +
    'background:#07101f;font-family:system-ui,sans-serif;text-align:center;padding:24px;margin:0';
  document.body.innerHTML = `
    <div>
      <div style="background:#fff;border-radius:14px;padding:12px 20px;
                  display:inline-block;margin-bottom:20px;box-shadow:0 4px 20px rgba(0,0,0,.4)">
        <img src="icons/logo-tk.png" alt="TK+" style="width:130px;height:auto;display:block"
             onerror="this.parentElement.innerHTML='<span style=\\'font-size:28px;font-weight:900;color:#a855f7\\'>TK+</span>'">
      </div>
      <h1 style="font-size:20px;font-weight:700;color:#fb7185;margin:0 0 10px">
        Software no autorizado
      </h1>
      <p style="color:#7fa0c4;font-size:14px;max-width:360px;line-height:1.6;margin:0 auto">
        Este software es propiedad de <strong style="color:#e8f1ff">TK+ by Tecno Kids</strong>
        y solo puede ejecutarse en redes privadas autorizadas.<br><br>
        <em style="color:#4a6080">Desarrollo: prof. Nicolas Kane</em>
      </p>
    </div>`;
  throw new Error('[TK+] Unauthorized domain: ' + host);
})();

// ── SPA Router + Auth Guard + Bootstrap de la app.
// Routing por hash: #/login, #/kiosk, #/dashboard, etc.

import { get, subscribe, setAuth, clearAuth, isAuthenticated, hasRole } from './store/state.js';
import { userData }          from './store/db.js';
import { init as initSync }  from './store/syncManager.js';
import { auth as authApi } from './api/endpoints.js';

// ── Rutas ────────────────────────────────────────────────────────────────────
// public: true  → ruta accesible sin autenticar
// roles:  []    → array de roles permitidos
const ROUTES = [
  { hash: '#/login',       module: () => import('./views/auth.js'),           public: true },
  { hash: '#/kiosk',       module: () => import('./views/kiosk.js'),           roles: ['admin', 'kiosco'] },
  { hash: '#/dashboard',   module: () => import('./views/dashboard.js'),       roles: ['admin', 'docente'] },
  { hash: '#/stock',       module: () => import('./views/stock.js'),           roles: ['admin'] },
  { hash: '#/kits',        module: () => import('./views/kits.js'),            roles: ['admin', 'kiosco'] },
  { hash: '#/tickets',     module: () => import('./views/tickets.js'),         roles: ['admin'] },
  { hash: '#/pedidos',     module: () => import('./views/pedidos.js'),         roles: ['admin', 'docente'] },
  { hash: '#/historial',   module: () => import('./views/historial.js'),       roles: ['admin'] },
  { hash: '#/settings',    module: () => import('./views/settings.js'),        roles: ['admin'] },
  // ── Nuevas vistas (v2) ──────────────────────────────────────────────────────
  { hash: '#/prestamos',   module: () => import('./views/prestamos.js'),       roles: ['admin'] },
  { hash: '#/reservas',    module: () => import('./views/reservas.js'),        roles: ['admin', 'docente'] },
  { hash: '#/proveedores', module: () => import('./views/proveedores.js'),     roles: ['admin'] },
  { hash: '#/inventario',  module: () => import('./views/inventario.js'),      roles: ['admin'] },
  { hash: '#/reportes',    module: () => import('./views/reportes.js'),        roles: ['admin'] },
  { hash: '#/presupuesto', module: () => import('./views/presupuesto.js'),     roles: ['admin'] },
];

// ── Ruta por defecto según rol ────────────────────────────────────────────────
function defaultRoute(rol) {
  if (rol === 'kiosco') return '#/kiosk';
  return '#/dashboard';
}

// ── Instancia de vista activa (permite cleanup) ───────────────────────────────
let _currentView = null;

// ── Guard de navegación en vuelo ──────────────────────────────────────────────
let _navigating = false;

// ── Navegación principal ─────────────────────────────────────────────────────
async function navigate(hash) {
  if (_navigating) return;
  _navigating = true;
  try {
  const app = document.getElementById('app');
  hash = hash || location.hash || '#/login';

  // Normalizar hash vacío
  if (!hash || hash === '#' || hash === '#/') {
    location.hash = isAuthenticated() ? defaultRoute(get('usuario')?.rol) : '#/login';
    return;
  }

  const route = ROUTES.find(r => r.hash === hash);

  // Ruta desconocida
  if (!route) {
    location.hash = isAuthenticated() ? defaultRoute(get('usuario')?.rol) : '#/login';
    return;
  }

  // Ruta pública + ya autenticado → redirigir a su home
  if (route.public && isAuthenticated()) {
    location.hash = defaultRoute(get('usuario')?.rol);
    return;
  }

  // Ruta protegida + no autenticado → login
  if (!route.public && !isAuthenticated()) {
    location.hash = '#/login';
    return;
  }

  // Verificar rol
  if (route.roles && !hasRole(...route.roles)) {
    location.hash = defaultRoute(get('usuario')?.rol);
    return;
  }

  // Destruir vista anterior si tiene cleanup
  if (_currentView?.destroy) {
    try { _currentView.destroy(); } catch (_) {}
  }

  // Spinner de carga
  app.innerHTML = `
    <div style="height:100dvh;display:flex;align-items:center;justify-content:center">
      <div class="spinner spinner-lg"></div>
    </div>`;

  try {
    const mod  = await route.module();
    const View = mod.default;
    app.innerHTML = '';
    _currentView  = new View(app);
    await _currentView.render();
  } catch (err) {
    console.error('[Router] Error cargando vista:', hash, err);
    app.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'layout-login';
    const box = document.createElement('div');
    box.className = 'login-box';
    const h2 = document.createElement('h2');
    h2.style.cssText = 'color:var(--danger);margin-bottom:8px';
    h2.textContent = 'Error al cargar la vista';
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-secondary);margin-bottom:16px;font-size:var(--text-sm)';
    p.textContent = err.message;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Volver al inicio';
    btn.addEventListener('click', () => { location.hash = '#/login'; });
    box.append(h2, p, btn);
    wrapper.appendChild(box);
    app.appendChild(wrapper);
  }

  // Actualizar nav activo (si hay sidebar)
  document.querySelectorAll('.nav-item[data-hash]').forEach(el => {
    el.classList.toggle('active', el.dataset.hash === hash);
  });
  } finally {
    _navigating = false;
  }
}

// ── Barra offline ─────────────────────────────────────────────────────────────
function initOfflineBar() {
  const bar = document.getElementById('offline-bar');
  if (!bar) return;
  function update(online) { bar.classList.toggle('visible', !online); }
  subscribe('online', update);
  update(navigator.onLine);
}

// ── Restaurar sesión desde localStorage / IndexedDB ───────────────────────────
async function restoreSession() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  // Intentar perfil cacheado (funciona offline)
  const cached = await userData.get('perfil');
  if (cached?.value) {
    setAuth(token, cached.value);
    return;
  }

  // Validar token con el servidor (solo si hay red)
  if (!navigator.onLine) return;

  try {
    const res = await authApi.perfil();
    // backend puede devolver { data: usuario } o { usuario }
    const u = res.data || res.usuario || res;
    if (u?.rol) {
      setAuth(token, u);
      await userData.set('perfil', u);
    } else {
      clearAuth();
    }
  } catch (_) {
    clearAuth();
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
let _bootstrapped = false;

async function bootstrap() {
  if (_bootstrapped) return;
  _bootstrapped = true;
  initOfflineBar();
  initSync();

  await restoreSession();

  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e =>
      console.warn('[SW] No se pudo registrar:', e)
    );
  }

  // Escuchar cambios de hash
  window.addEventListener('hashchange', () => navigate(location.hash));

  // Navegar a la ruta inicial
  navigate(location.hash);
}

bootstrap();
