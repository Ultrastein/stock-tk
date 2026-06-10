# Frontend PWA — Plan de Implementación (Parte C: Admin Views)

> **Para agentes:** REQUIRED SUB-SKILL: Usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan sintaxis checkbox (`- [ ]`) para tracking.

**Goal:** Implementar las 6 vistas del área admin/docente: Dashboard, Stock, Kits, Tickets, Pedidos e Historial. Todas comparten la misma capa visual (sidebar + header).

**Architecture:** Módulo `_layout.js` provee el esqueleto `.layout-app` (sidebar + `.main-content`) reutilizado por todas las vistas. Cada vista exporta `default class`. Usan `DataTable`, `Modal`, `Toast` de los componentes ya construidos en Plan A. Las formas de creación/edición se muestran en modales con formularios DOM construidos a mano (sin innerHTML con user input).

**Tech Stack:** Vanilla JS ES modules, DataTable.js, Modal.js, Toast.js, api/endpoints.js, store/state.js.

**API Backend — endpoints disponibles:**
- `GET /api/productos?tipo=&categoria_id=&ubicacion_id=` → `{ data }`
- `GET /api/activos?producto_id=&estado=` → `{ data }`
- `GET /api/kits?estado=&codigo_qr=` → `{ data }`
- `GET /api/usuarios` → `{ data }`
- `GET /api/categorias` → `{ data }`
- `GET /api/ubicaciones` → `{ data }`
- `GET /api/alertas?leida=false&limit=10` → `{ data }`
- `GET /api/historial?limit=100&offset=0&accion=&entidad_tipo=&desde=&hasta=` → `{ data, total }`
- `GET /api/tickets?estado=&activo_fijo_id=` → `{ data }`
- `PATCH /api/tickets/:id/estado` → avanzar estado
- `GET /api/pedidos` → `{ data }`
- `POST /api/pedidos` → crear pedido
- `PATCH /api/pedidos/:id/estado` → avanzar estado
- `POST /api/productos` / `PUT /api/productos/:id` / `DELETE /api/productos/:id`
- `POST /api/activos` / `PUT /api/activos/:id` / `DELETE /api/activos/:id`
- `POST /api/kits` / (no update, no delete in backend)

**Roles:**
- `admin`: todas las vistas
- `docente`: `#/dashboard` + `#/pedidos` únicamente
- `kiosco`: `#/kits` (read-only)

---

## Mapa de archivos

| Archivo | Tarea | Descripción |
|---------|-------|-------------|
| `frontend/public/src/js/views/_layout.js` | Task 13 | Sidebar + layout helper compartido |
| `frontend/public/src/js/views/dashboard.js` | Task 13 | Estadísticas + alertas + actividad reciente |
| `frontend/public/src/js/views/stock.js` | Task 14 | Gestión productos + activos fijos |
| `frontend/public/src/js/views/kits.js` | Task 15 | Gestión de kits (CRUD admin) |
| `frontend/public/src/js/views/tickets.js` | Task 16 | Tickets de mantenimiento |
| `frontend/public/src/js/views/pedidos.js` | Task 17 | Pedidos de reposición |
| `frontend/public/src/js/views/historial.js` | Task 18 | Historial de movimientos (read-only) |

---

### Task 13: Layout Helper + Dashboard

**Files:**
- Create: `frontend/public/src/js/views/_layout.js`
- Create: `frontend/public/src/js/views/dashboard.js`

- [ ] **Paso 1: Crear `_layout.js`**

```js
// frontend/public/src/js/views/_layout.js
// Skeleton compartido: sidebar + main-content.
// Uso:
//   const { mainContent, destroy } = renderLayout(container, {
//     usuario, activeHash, onLogout
//   });

import { clearAuth } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Nav items por rol
const NAV_BY_ROLE = {
  admin: [
    { section: 'Acceso Rápido', items: [
      { hash: '#/dashboard', label: 'Dashboard', icon: iconGrid() },
    ]},
    { section: 'Inventario', items: [
      { hash: '#/stock',     label: 'Stock',     icon: iconBox() },
      { hash: '#/kits',      label: 'Kits',      icon: iconBriefcase() },
    ]},
    { section: 'Mantenimiento', items: [
      { hash: '#/tickets',  label: 'Tickets',   icon: iconTool() },
    ]},
    { section: 'Compras', items: [
      { hash: '#/pedidos',  label: 'Pedidos',   icon: iconCart() },
    ]},
    { section: 'Reportes', items: [
      { hash: '#/historial',label: 'Historial', icon: iconClock() },
    ]},
    { section: 'Kiosco', items: [
      { hash: '#/kiosk',    label: 'Kiosco',    icon: iconMonitor() },
    ]},
  ],
  docente: [
    { section: 'Acceso Rápido', items: [
      { hash: '#/dashboard', label: 'Dashboard', icon: iconGrid() },
    ]},
    { section: 'Compras', items: [
      { hash: '#/pedidos',  label: 'Pedidos',   icon: iconCart() },
    ]},
  ],
  kiosco: [
    { section: 'Kiosco', items: [
      { hash: '#/kiosk',    label: 'Kiosco',    icon: iconMonitor() },
    ]},
    { section: 'Inventario', items: [
      { hash: '#/kits',     label: 'Kits',      icon: iconBriefcase() },
    ]},
  ],
};

export function renderLayout(container, { usuario, activeHash }) {
  const navSections = NAV_BY_ROLE[usuario?.rol] || NAV_BY_ROLE.admin;
  const initial     = esc((usuario?.nombre ?? 'U')[0].toUpperCase());
  const nombre      = esc(usuario?.nombre ?? '');
  const rol         = esc(usuario?.rol ?? '');

  const navHtml = navSections.map(section => `
    <div>
      <div class="nav-section-label">${esc(section.section)}</div>
      ${section.items.map(item => `
        <a class="nav-item${item.hash === activeHash ? ' active' : ''}"
          href="${item.hash}" role="link" aria-current="${item.hash === activeHash ? 'page' : 'false'}">
          ${item.icon}
          <span>${esc(item.label)}</span>
        </a>
      `).join('')}
    </div>
  `).join('');

  container.innerHTML = `
    <div class="layout-app">
      <aside class="sidebar" role="navigation" aria-label="Menú principal">
        <div class="sidebar-logo">🎓 StockControl</div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-user">
          <div class="user-avatar" aria-hidden="true">${initial}</div>
          <div class="flex-col" style="flex:1;min-width:0">
            <span class="truncate" style="font-size:var(--text-sm);font-weight:500">${nombre}</span>
            <span class="truncate" style="font-size:var(--text-xs);color:var(--text-muted)">${rol}</span>
          </div>
          <button class="btn btn-ghost btn-icon btn-sm" id="layout-logout-btn"
            title="Cerrar sesión" aria-label="Cerrar sesión" style="flex-shrink:0">
            ${iconLogout()}
          </button>
        </div>
      </aside>
      <div class="main-content" id="layout-main-content" role="main"></div>
    </div>
  `;

  // Logout
  const logoutBtn = container.querySelector('#layout-logout-btn');
  logoutBtn.addEventListener('click', () => {
    clearAuth();
    location.hash = '#/login';
  });

  // Interceptar clicks en nav para SPA
  const nav = container.querySelector('.sidebar-nav');
  nav.addEventListener('click', e => {
    const link = e.target.closest('.nav-item');
    if (!link) return;
    e.preventDefault();
    location.hash = link.getAttribute('href');
  });

  return {
    mainContent: container.querySelector('#layout-main-content'),
    destroy: () => {}, // cleanup si fuera necesario
  };
}

// ── SVG icons ────────────────────────────────────────────
function svg(path) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
function iconGrid()     { return svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'); }
function iconBox()      { return svg('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'); }
function iconBriefcase(){ return svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>'); }
function iconTool()     { return svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'); }
function iconCart()     { return svg('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>'); }
function iconClock()    { return svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'); }
function iconMonitor()  { return svg('<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'); }
function iconLogout()   { return svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'); }
```

- [ ] **Paso 2: Crear `dashboard.js`**

```js
// frontend/public/src/js/views/dashboard.js
// Dashboard admin/docente. Muestra KPIs, alertas recientes y actividad.

import { renderLayout } from './_layout.js';
import { Toast }        from '../components/Toast.js';
import { kits as kitsApi, alertas as alertasApi, historial as historialApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

export default class DashboardView {
  constructor(container) {
    this.container = container;
    this._destroyLayout = null;
  }

  async render() {
    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, {
      usuario,
      activeHash: '#/dashboard',
    });
    this._destroyLayout = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Dashboard</h1>
      </div>
      <div class="page-body" id="dash-body">
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          ${[0,1,2,3].map(() => `<div class="card skeleton" style="height:100px;flex:1;min-width:180px"></div>`).join('')}
        </div>
        <div class="card skeleton" style="height:200px"></div>
        <div class="card skeleton" style="height:200px"></div>
      </div>
    `;

    await this._load(mainContent.querySelector('#dash-body'));
  }

  async _load(body) {
    try {
      const [kitsRes, alertasRes, histRes] = await Promise.all([
        kitsApi.listar(),
        alertasApi.listar({ leida: false, limit: 10 }),
        historialApi.listar({ limit: 10 }),
      ]);

      const kits    = kitsRes.data   || [];
      const alertas = alertasRes.data || [];
      const movs    = histRes.data   || [];

      // Estadísticas de kits
      const kitDisp = kits.filter(k => k.estado === 'disponible').length;
      const kitUso  = kits.filter(k => k.estado === 'en_uso').length;
      const kitRep  = kits.filter(k => k.estado === 'en_reparacion' || k.estado === 'incompleto').length;
      const alertCount = alertas.length;

      // Cards KPI
      const kpiHtml = [
        { value: kitDisp,   label: 'Kits disponibles',   color: 'var(--success)',  bg: 'var(--success-bg)' },
        { value: kitUso,    label: 'Kits en uso',        color: 'var(--info)',     bg: 'var(--info-bg)' },
        { value: kitRep,    label: 'Kits con problema',  color: 'var(--warning)',  bg: 'var(--warning-bg)' },
        { value: alertCount,label: 'Alertas sin leer',   color: 'var(--danger)',   bg: 'var(--danger-bg)' },
      ].map(kpi => `
        <div class="card" style="flex:1;min-width:180px;background:${kpi.bg};border-color:${kpi.color}">
          <div class="stat-card">
            <div class="stat-value" style="color:${kpi.color}">${kpi.value}</div>
            <div class="stat-label">${esc(kpi.label)}</div>
          </div>
        </div>
      `).join('');

      // Alertas recientes
      const alertasHtml = alertas.length
        ? alertas.slice(0, 5).map(a => `
            <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
              <span class="badge badge-red" style="flex-shrink:0">${esc(a.tipo?.replace(/_/g,' ') ?? 'alerta')}</span>
              <div style="flex:1">
                <div style="font-size:var(--text-sm)">${esc(a.mensaje ?? '')}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted)">${fmtDate(a.created_at)}</div>
              </div>
            </div>
          `).join('')
        : '<div class="empty-state" style="padding:24px"><p>Sin alertas pendientes 🎉</p></div>';

      // Actividad reciente
      const movHtml = movs.length
        ? movs.slice(0, 10).map(m => `
            <tr>
              <td>
                <span class="badge badge-default" style="font-size:11px">
                  ${esc(m.accion?.replace(/_/g,' ') ?? '')}
                </span>
              </td>
              <td>${esc(m.entidad_tipo ?? '—')}</td>
              <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${esc(m.entidad_id?.slice(0,8) ?? '—')}</td>
              <td style="color:var(--text-secondary);font-size:var(--text-xs)">${fmtDate(m.created_at)}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">Sin actividad reciente</td></tr>`;

      body.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          ${kpiHtml}
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Alertas sin leer</h3>
            ${alertCount > 0 ? `<button class="btn btn-sm btn-ghost" id="btn-mark-all-read">Marcar todas leídas</button>` : ''}
          </div>
          ${alertasHtml}
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Actividad reciente</h3>
            <a href="#/historial" class="btn btn-sm btn-ghost">Ver todo →</a>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead><tr>
                <th>Acción</th><th>Entidad</th><th>ID</th><th>Fecha</th>
              </tr></thead>
              <tbody>${movHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      body.querySelector('#btn-mark-all-read')?.addEventListener('click', async () => {
        try {
          await alertasApi.marcarTodasLeidas();
          Toast.show('Alertas marcadas como leídas', 'success');
          await this._load(body);
        } catch (e) {
          Toast.show(e.message, 'error');
        }
      });

    } catch (err) {
      body.innerHTML = `
        <div class="alert alert-danger">Error al cargar datos: ${esc(err.message)}</div>
      `;
    }
  }

  destroy() {
    this._destroyLayout?.();
  }
}
```

- [ ] **Paso 3: Verificar que los archivos existen**

```bash
ls "frontend/public/src/js/views/_layout.js"
ls "frontend/public/src/js/views/dashboard.js"
```

- [ ] **Paso 4: Actualizar `endpoints.js` — agregar `alertas.listar` con params**

Leer `frontend/public/src/js/api/endpoints.js`. El bloque alertas actual:
```js
export const alertas = {
  listar:   (params = {}) => api.get('/alertas?' + new URLSearchParams(params).toString()),
  resolver: (id)          => api.patch(`/alertas/${id}`, { resuelta: true }),
};
```

Reemplazar con:
```js
export const alertas = {
  listar:             (params = {}) => api.get('/alertas?' + new URLSearchParams(params).toString()),
  marcarLeida:        (id)          => api.patch(`/alertas/${id}/leer`),
  marcarTodasLeidas:  ()            => api.patch('/alertas/leer-todas'),
};
```

- [ ] **Paso 5: Commit**

```bash
git add frontend/public/src/js/views/_layout.js frontend/public/src/js/views/dashboard.js frontend/public/src/js/api/endpoints.js
git commit -m "feat(frontend): layout helper compartido y vista dashboard con KPIs y alertas"
```

---

### Task 14: Vista Stock (productos + activos fijos)

**Files:**
- Create: `frontend/public/src/js/views/stock.js`

- [ ] **Paso 1: Crear `stock.js`**

```js
// frontend/public/src/js/views/stock.js
// Vista de stock: tabla de Productos y tabla de Activos Fijos.
// Roles: admin únicamente.

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Modal }        from '../components/Modal.js';
import { Toast }        from '../components/Toast.js';
import {
  productos as productosApi,
  activos   as activosApi,
  categorias as categoriasApi,
  ubicaciones as ubicacionesApi,
} from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export default class StockView {
  constructor(container) {
    this.container   = container;
    this._tab        = 'productos';   // 'productos' | 'activos'
    this._categorias = [];
    this._ubicaciones= [];
    this._dtProductos = null;
    this._dtActivos   = null;
  }

  async render() {
    const usuario = getState('usuario');
    const { mainContent } = renderLayout(this.container, {
      usuario, activeHash: '#/stock',
    });

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Stock</h1>
        <button class="btn btn-primary" id="btn-nuevo">+ Nuevo</button>
      </div>
      <div class="page-body">
        <!-- Tabs -->
        <div style="display:flex;gap:8px;border-bottom:1px solid var(--border);margin-bottom:16px">
          <button class="btn btn-ghost" id="tab-productos" data-tab="productos"
            style="border-bottom:2px solid var(--accent);border-radius:0">
            📦 Productos
          </button>
          <button class="btn btn-ghost" id="tab-activos" data-tab="activos"
            style="border-radius:0">
            🔩 Activos Fijos
          </button>
        </div>
        <!-- Tablas -->
        <div id="table-container-productos" class="card"></div>
        <div id="table-container-activos"   class="card" style="display:none"></div>
      </div>
    `;

    // Cargar datos de soporte
    const [catRes, ubicRes] = await Promise.all([
      categoriasApi.listar().catch(() => ({ data: [] })),
      ubicacionesApi.listar().catch(() => ({ data: [] })),
    ]);
    this._categorias  = catRes.data  || [];
    this._ubicaciones = ubicRes.data || [];

    // DataTable Productos
    this._dtProductos = new DataTable({
      container:    mainContent.querySelector('#table-container-productos'),
      emptyMessage: 'Sin productos registrados',
      columns: [
        { key: 'codigo',       label: 'Código',    sortable: true },
        { key: 'nombre',       label: 'Nombre',    sortable: true },
        { key: 'tipo',         label: 'Tipo',      sortable: true,
          render: v => `<span class="badge ${v==='retornable'?'badge-blue':'badge-green'}">${v}</span>` },
        { key: 'stock_actual', label: 'Stock',     sortable: true,
          render: (v, row) => {
            const cls = v <= (row.stock_minimo || 0) ? 'style="color:var(--danger);font-weight:600"' : '';
            return `<span ${cls}>${v}</span>`;
          }},
        { key: 'stock_minimo', label: 'Mínimo',    sortable: true },
      ],
      actions: row => `
        <button class="btn btn-sm btn-ghost" data-id="edit-${row.id}" title="Editar">✏️</button>
        <button class="btn btn-sm btn-ghost" data-id="del-${row.id}"  title="Eliminar" style="color:var(--danger)">🗑️</button>
      `,
    });

    // DataTable Activos
    this._dtActivos = new DataTable({
      container:    mainContent.querySelector('#table-container-activos'),
      emptyMessage: 'Sin activos registrados',
      columns: [
        { key: 'numero_serie', label: 'N° Serie', sortable: true },
        { key: 'producto',     label: 'Producto', sortable: true,
          render: (v, row) => esc(row.producto?.nombre ?? '—') },
        { key: 'estado',       label: 'Estado',   sortable: true,
          render: v => {
            const cls = { disponible:'badge-green', en_uso:'badge-blue', en_reparacion:'badge-yellow', dañado:'badge-red' }[v] || 'badge-default';
            return `<span class="badge ${cls}">${esc(v?.replace(/_/g,' ') ?? '')}</span>`;
          }},
        { key: 'codigo_qr',    label: 'QR',       sortable: false,
          render: v => v ? `<span class="font-mono" style="font-size:11px">${esc(v.slice(0,12))}…</span>` : '—' },
      ],
      actions: row => `
        <button class="btn btn-sm btn-ghost" data-id="edit-${row.id}" title="Editar">✏️</button>
        <button class="btn btn-sm btn-ghost" data-id="del-${row.id}"  title="Eliminar" style="color:var(--danger)">🗑️</button>
      `,
    });

    // Tabs
    mainContent.querySelector('#tab-productos').addEventListener('click', () => this._switchTab('productos', mainContent));
    mainContent.querySelector('#tab-activos').addEventListener('click',   () => this._switchTab('activos',  mainContent));

    // Botón nuevo
    mainContent.querySelector('#btn-nuevo').addEventListener('click', () => {
      if (this._tab === 'productos') this._openProductoModal(null);
      else this._openActivoModal(null);
    });

    // Action clicks — delegar en DataTable events
    this._dtProductos.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('edit-')) this._openProductoModal(row);
      if (id.startsWith('del-'))  this._deleteProducto(row);
    });
    this._dtActivos.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('edit-')) this._openActivoModal(row);
      if (id.startsWith('del-'))  this._deleteActivo(row);
    });

    await this._loadProductos();
    await this._loadActivos();
  }

  _switchTab(tab, mainContent) {
    this._tab = tab;
    const tabBtns = mainContent.querySelectorAll('[data-tab]');
    tabBtns.forEach(b => {
      b.style.borderBottom = b.dataset.tab === tab ? '2px solid var(--accent)' : 'none';
    });
    mainContent.querySelector('#table-container-productos').style.display = tab === 'productos' ? '' : 'none';
    mainContent.querySelector('#table-container-activos').style.display   = tab === 'activos'   ? '' : 'none';
  }

  async _loadProductos() {
    try {
      const res = await productosApi.listar();
      this._dtProductos.setData(res.data || []);
    } catch (e) { Toast.show('Error al cargar productos', 'error'); }
  }

  async _loadActivos() {
    try {
      const res = await activosApi.listar();
      this._dtActivos.setData(res.data || []);
    } catch (e) { Toast.show('Error al cargar activos', 'error'); }
  }

  // ── Productos CRUD ──────────────────────────────────────

  _openProductoModal(producto) {
    const formEl = document.createElement('div');

    const catOpts = this._categorias.map(c =>
      `<option value="${c.id}" ${producto?.categoria_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`
    ).join('');
    const ubicOpts = this._ubicaciones.map(u =>
      `<option value="${u.id}" ${producto?.ubicacion_id === u.id ? 'selected' : ''}>${esc(u.nombre)}</option>`
    ).join('');

    formEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Nombre *</label>
          <input class="form-control" id="p-nombre" value="${esc(producto?.nombre ?? '')}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select class="form-control" id="p-tipo">
            <option value="consumible"  ${producto?.tipo === 'consumible'  ? 'selected' : ''}>Consumible</option>
            <option value="retornable"  ${producto?.tipo === 'retornable'  ? 'selected' : ''}>Retornable</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Código</label>
          <input class="form-control" id="p-codigo" value="${esc(producto?.codigo ?? '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Stock mínimo</label>
          <input class="form-control" id="p-stock-min" type="number" min="0" value="${producto?.stock_minimo ?? 0}">
        </div>
        <div class="form-group">
          <label class="form-label">Stock inicial (solo en creación)</label>
          <input class="form-control" id="p-stock-ini" type="number" min="0" value="${producto?.stock_actual ?? 0}"
            ${producto ? 'disabled' : ''}>
        </div>
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select class="form-control" id="p-categoria">
            <option value="">— Sin categoría —</option>
            ${catOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ubicación</label>
          <select class="form-control" id="p-ubicacion">
            <option value="">— Sin ubicación —</option>
            ${ubicOpts}
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Descripción</label>
          <textarea class="form-control" id="p-desc" rows="2" maxlength="512">${esc(producto?.descripcion ?? '')}</textarea>
        </div>
      </div>
    `;

    const confirmed = new Promise(resolve => {
      const modal = new Modal({
        title:       producto ? `Editar: ${producto.nombre}` : 'Nuevo Producto',
        content:     formEl,
        confirmText: producto ? 'Guardar cambios' : 'Crear producto',
        size:        'md',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });

    confirmed.then(async ok => {
      if (!ok) return;
      const nombre = formEl.querySelector('#p-nombre').value.trim();
      if (!nombre) { Toast.show('El nombre es requerido', 'error'); return; }
      const body = {
        nombre,
        tipo:         formEl.querySelector('#p-tipo').value,
        codigo:       formEl.querySelector('#p-codigo').value.trim() || undefined,
        stock_minimo: parseInt(formEl.querySelector('#p-stock-min').value) || 0,
        categoria_id: formEl.querySelector('#p-categoria').value || null,
        ubicacion_id: formEl.querySelector('#p-ubicacion').value || null,
        descripcion:  formEl.querySelector('#p-desc').value.trim() || null,
      };
      if (!producto) body.stock_actual = parseInt(formEl.querySelector('#p-stock-ini').value) || 0;

      try {
        if (producto) await productosApi.actualizar(producto.id, body);
        else          await productosApi.crear(body);
        Toast.show(producto ? 'Producto actualizado' : 'Producto creado', 'success');
        await this._loadProductos();
      } catch (e) { Toast.show(e.message, 'error'); }
    });
  }

  async _deleteProducto(producto) {
    const ok = await Modal.confirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await productosApi.eliminar(producto.id);
      Toast.show('Producto eliminado', 'success');
      await this._loadProductos();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  // ── Activos CRUD ────────────────────────────────────────

  _openActivoModal(activo) {
    const formEl = document.createElement('div');

    formEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">N° de Serie *</label>
          <input class="form-control" id="a-serie" value="${esc(activo?.numero_serie ?? '')}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-control" id="a-estado">
            ${['disponible','en_uso','en_reparacion','dañado','baja_definitiva'].map(e =>
              `<option value="${e}" ${activo?.estado === e ? 'selected' : ''}>${e.replace(/_/g,' ')}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Observaciones</label>
          <textarea class="form-control" id="a-obs" rows="2" maxlength="512">${esc(activo?.observaciones ?? '')}</textarea>
        </div>
      </div>
    `;

    const confirmed = new Promise(resolve => {
      const modal = new Modal({
        title:       activo ? `Editar: ${activo.numero_serie}` : 'Nuevo Activo Fijo',
        content:     formEl,
        confirmText: activo ? 'Guardar cambios' : 'Crear activo',
        size:        'sm',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });

    confirmed.then(async ok => {
      if (!ok) return;
      const serie = formEl.querySelector('#a-serie').value.trim();
      if (!serie) { Toast.show('El N° de serie es requerido', 'error'); return; }
      const body = {
        numero_serie:  serie,
        estado:        formEl.querySelector('#a-estado').value,
        observaciones: formEl.querySelector('#a-obs').value.trim() || null,
      };
      try {
        if (activo) await activosApi.actualizar(activo.id, body);
        else        await activosApi.crear(body);
        Toast.show(activo ? 'Activo actualizado' : 'Activo creado', 'success');
        await this._loadActivos();
      } catch (e) { Toast.show(e.message, 'error'); }
    });
  }

  async _deleteActivo(activo) {
    const ok = await Modal.confirm({
      title: 'Eliminar activo',
      message: `¿Eliminar activo "${activo.numero_serie}"?`,
      confirmText: 'Eliminar', danger: true,
    });
    if (!ok) return;
    try {
      await activosApi.eliminar(activo.id);
      Toast.show('Activo eliminado', 'success');
      await this._loadActivos();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() {}
}
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/public/src/js/views/stock.js
git commit -m "feat(frontend): vista stock con CRUD de productos y activos fijos"
```

---

### Task 15: Vista Kits

**Files:**
- Create: `frontend/public/src/js/views/kits.js`

- [ ] **Paso 1: Crear `kits.js`**

```js
// frontend/public/src/js/views/kits.js
// Vista de gestión de kits (admin / read-only para kiosco).
// Permite ver kits, sus componentes, y crear nuevos (admin).

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Modal }        from '../components/Modal.js';
import { Toast }        from '../components/Toast.js';
import { kits as kitsApi, productos as productosApi, activos as activosApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const ESTADO_CLS = {
  disponible:    'badge-green',
  en_uso:        'badge-blue',
  incompleto:    'badge-red',
  en_reparacion: 'badge-yellow',
};

export default class KitsView {
  constructor(container) {
    this.container = container;
    this._dt       = null;
    this._isAdmin  = false;
  }

  async render() {
    const usuario  = getState('usuario');
    this._isAdmin  = usuario?.rol === 'admin';

    const { mainContent } = renderLayout(this.container, {
      usuario, activeHash: '#/kits',
    });

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Kits</h1>
        ${this._isAdmin ? '<button class="btn btn-primary" id="btn-nuevo-kit">+ Nuevo Kit</button>' : ''}
      </div>
      <div class="page-body">
        <div class="card" id="kits-table-container"></div>
      </div>
    `;

    this._dt = new DataTable({
      container:    mainContent.querySelector('#kits-table-container'),
      emptyMessage: 'Sin kits registrados',
      columns: [
        { key: 'codigo',       label: 'Código',       sortable: true },
        { key: 'nombre',       label: 'Nombre',       sortable: true },
        { key: 'estado',       label: 'Estado',       sortable: true,
          render: v => `<span class="badge ${ESTADO_CLS[v] || 'badge-default'}">${esc(v?.replace(/_/g,' ') ?? '')}</span>` },
        { key: 'componentes',  label: 'Componentes',  sortable: false,
          render: (v, row) => `<span style="color:var(--text-muted)">${row.componentes?.length ?? 0}</span>` },
      ],
      actions: row => `
        <button class="btn btn-sm btn-ghost" data-id="view-${row.id}" title="Ver componentes">🔍 Ver</button>
      `,
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('view-')) this._showComponentes(row);
    });

    if (this._isAdmin) {
      mainContent.querySelector('#btn-nuevo-kit')
        ?.addEventListener('click', () => this._openCrearKit());
    }

    await this._loadKits();
  }

  async _loadKits() {
    try {
      const res = await kitsApi.listar();
      this._dt.setData(res.data || []);
    } catch (e) { Toast.show('Error al cargar kits', 'error'); }
  }

  _showComponentes(kit) {
    const rows = (kit.componentes || []).map(c => `
      <tr>
        <td>${esc(c.producto?.nombre ?? '—')}</td>
        <td><span class="badge ${c.producto?.tipo === 'retornable' ? 'badge-blue' : 'badge-green'}">${esc(c.producto?.tipo ?? '')}</span></td>
        <td>${c.activoFijo ? `<span class="font-mono" style="font-size:11px">${esc(c.activoFijo.numero_serie)}</span>` : '—'}</td>
        <td>${c.cantidad}</td>
        <td>${c.es_obligatorio ? '✓' : '—'}</td>
      </tr>
    `).join('');

    const el = document.createElement('div');
    el.innerHTML = `
      <p style="color:var(--text-secondary);margin-bottom:12px;font-size:var(--text-sm)">
        Estado: <span class="badge ${ESTADO_CLS[kit.estado] || 'badge-default'}">${esc(kit.estado?.replace(/_/g,' ') ?? '')}</span>
        &nbsp;|&nbsp; Código: <span class="font-mono">${esc(kit.codigo)}</span>
      </p>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr>
            <th>Producto</th><th>Tipo</th><th>N° Serie</th><th>Cantidad</th><th>Obligatorio</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin componentes</td></tr>'}</tbody>
        </table>
      </div>
    `;

    const modal = new Modal({
      title: `Componentes: ${kit.nombre}`,
      content: el,
      confirmText: 'Cerrar',
      cancelText: '',
      size: 'lg',
    });
    modal.onConfirm(() => modal.hide());
    modal.onCancel(()  => modal.hide());
    modal.show();
  }

  async _openCrearKit() {
    // Cargar productos y activos para el selector
    let productosDisp = [], activosDisp = [];
    try {
      const [pRes, aRes] = await Promise.all([
        productosApi.listar(),
        activosApi.listar({ estado: 'disponible' }),
      ]);
      productosDisp = pRes.data || [];
      activosDisp   = aRes.data || [];
    } catch (e) { Toast.show('Error al cargar productos', 'error'); return; }

    const formEl = document.createElement('div');
    formEl.innerHTML = `
      <div class="form-group" style="margin-bottom:12px">
        <label class="form-label">Nombre del kit *</label>
        <input class="form-control" id="kit-nombre" placeholder="Ej: Kit de Robótica A1" required>
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Descripción</label>
        <textarea class="form-control" id="kit-desc" rows="2" maxlength="512"></textarea>
      </div>
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:8px">
        Componentes (agregar productos uno por uno):
      </div>
      <div id="kit-comp-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:8px;margin-bottom:12px">
        <p style="color:var(--text-muted);font-size:var(--text-sm);text-align:center;padding:8px">Sin componentes aún</p>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="flex:2">
          <label class="form-label">Producto</label>
          <select class="form-control" id="kit-comp-prod">
            <option value="">— Seleccionar —</option>
            ${productosDisp.map(p => `<option value="${p.id}" data-tipo="${p.tipo}">${esc(p.nombre)} (${p.tipo})</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Activo (retornable)</label>
          <select class="form-control" id="kit-comp-activo" disabled>
            <option value="">— Sin activo —</option>
            ${activosDisp.map(a => `<option value="${a.id}">${esc(a.numero_serie)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="width:70px">
          <label class="form-label">Cant.</label>
          <input class="form-control" id="kit-comp-qty" type="number" min="1" value="1">
        </div>
        <button class="btn btn-secondary" id="kit-add-comp" style="margin-bottom:1px">+ Agregar</button>
      </div>
    `;

    const componentes = [];

    // Habilitar selector de activo si el producto elegido es retornable
    const prodSel   = formEl.querySelector('#kit-comp-prod');
    const activoSel = formEl.querySelector('#kit-comp-activo');
    prodSel.addEventListener('change', () => {
      const opt = prodSel.options[prodSel.selectedIndex];
      activoSel.disabled = opt.dataset.tipo !== 'retornable';
      if (activoSel.disabled) activoSel.value = '';
    });

    formEl.querySelector('#kit-add-comp').addEventListener('click', () => {
      const prodId  = prodSel.value;
      const prodNom = prodSel.options[prodSel.selectedIndex]?.text ?? '';
      const actId   = activoSel.value || null;
      const qty     = parseInt(formEl.querySelector('#kit-comp-qty').value) || 1;
      if (!prodId) { Toast.show('Seleccioná un producto', 'warning'); return; }

      componentes.push({ producto_id: prodId, activo_fijo_id: actId, cantidad: qty, es_obligatorio: true });
      const listEl = formEl.querySelector('#kit-comp-list');
      if (listEl.querySelector('p')) listEl.innerHTML = '';
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px';
      div.textContent = `${prodNom} × ${qty}${actId ? ' (con activo)' : ''}`;
      listEl.appendChild(div);
    });

    const confirmed = await new Promise(resolve => {
      const modal = new Modal({
        title: 'Nuevo Kit', content: formEl, confirmText: 'Crear kit', size: 'lg',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
    if (!confirmed) return;

    const nombre = formEl.querySelector('#kit-nombre').value.trim();
    if (!nombre) { Toast.show('El nombre es requerido', 'error'); return; }
    if (!componentes.length) { Toast.show('Agregá al menos un componente', 'warning'); return; }

    try {
      await kitsApi.crear({ nombre, descripcion: formEl.querySelector('#kit-desc').value.trim() || null, componentes });
      Toast.show('Kit creado exitosamente', 'success');
      await this._loadKits();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() {}
}
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/public/src/js/views/kits.js
git commit -m "feat(frontend): vista kits con tabla, detalle de componentes y creación de kit"
```

---

### Task 16: Vista Tickets de Mantenimiento

**Files:**
- Create: `frontend/public/src/js/views/tickets.js`

- [ ] **Paso 1: Crear `tickets.js`**

```js
// frontend/public/src/js/views/tickets.js
// Vista de tickets de mantenimiento. Solo admin.

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Modal }        from '../components/Modal.js';
import { Toast }        from '../components/Toast.js';
import { tickets as ticketsApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR');
}

const ESTADO_CLS = {
  pendiente:       'badge-yellow',
  en_reparacion:   'badge-blue',
  resuelto:        'badge-green',
  rechazado_baja:  'badge-red',
};

const ESTADO_NEXT = {
  pendiente:     'en_reparacion',
  en_reparacion: 'resuelto',
};

export default class TicketsView {
  constructor(container) {
    this.container = container;
    this._dt       = null;
    this._filter   = '';
  }

  async render() {
    const usuario = getState('usuario');
    const { mainContent } = renderLayout(this.container, {
      usuario, activeHash: '#/tickets',
    });

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Tickets de Mantenimiento</h1>
      </div>
      <div class="page-body">
        <!-- Filtro por estado -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          ${['', 'pendiente', 'en_reparacion', 'resuelto', 'rechazado_baja'].map(e => `
            <button class="btn btn-sm ${e === '' ? 'btn-primary' : 'btn-secondary'}" data-filter="${e}">
              ${e === '' ? 'Todos' : e.replace(/_/g,' ')}
            </button>
          `).join('')}
        </div>
        <div class="card" id="tickets-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container:    mainContent.querySelector('#tickets-table'),
      emptyMessage: 'Sin tickets',
      columns: [
        { key: 'codigo',    label: 'Código',    sortable: true },
        { key: 'estado',    label: 'Estado',    sortable: true,
          render: v => `<span class="badge ${ESTADO_CLS[v] || 'badge-default'}">${esc(v?.replace(/_/g,' ') ?? '')}</span>` },
        { key: 'diagnostico', label: 'Diagnóstico', sortable: false,
          render: v => `<span style="color:var(--text-secondary);font-size:var(--text-sm)">${esc((v ?? '').slice(0,60))}${(v?.length??0)>60?'…':''}</span>` },
        { key: 'created_at', label: 'Fecha',    sortable: true,
          render: v => fmtDate(v) },
      ],
      actions: row => {
        const nextEstado = ESTADO_NEXT[row.estado];
        return nextEstado
          ? `<button class="btn btn-sm btn-secondary" data-id="avanzar-${row.id}" title="Avanzar a ${nextEstado.replace(/_/g,' ')}">
               Avanzar →
             </button>`
          : `<button class="btn btn-sm btn-ghost" data-id="ver-${row.id}" title="Ver detalle">Ver</button>`;
      },
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('avanzar-')) this._avanzarEstado(row);
      if (id.startsWith('ver-'))     this._verDetalle(row);
    });

    // Filtros de estado
    const filterBar = mainContent.querySelector('.page-body div');
    filterBar.addEventListener('click', e => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      this._filter = btn.dataset.filter;
      filterBar.querySelectorAll('[data-filter]').forEach(b => {
        b.className = `btn btn-sm ${b.dataset.filter === this._filter ? 'btn-primary' : 'btn-secondary'}`;
      });
      this._loadTickets();
    });

    await this._loadTickets();
  }

  async _loadTickets() {
    try {
      const params = this._filter ? { estado: this._filter } : {};
      const res = await ticketsApi.listar(params);
      this._dt.setData(res.data || []);
    } catch (e) { Toast.show('Error al cargar tickets', 'error'); }
  }

  async _avanzarEstado(ticket) {
    const next = ESTADO_NEXT[ticket.estado];
    if (!next) return;
    const ok = await Modal.confirm({
      title: 'Avanzar estado',
      message: `¿Cambiar "${ticket.codigo}" de "${ticket.estado.replace(/_/g,' ')}" a "${next.replace(/_/g,' ')}"?`,
      confirmText: 'Confirmar',
    });
    if (!ok) return;
    try {
      await ticketsApi.avanzarEstado(ticket.id, { estado: next });
      Toast.show(`Ticket ${ticket.codigo} → ${next.replace(/_/g,' ')}`, 'success');
      await this._loadTickets();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  _verDetalle(ticket) {
    const el = document.createElement('div');
    el.innerHTML = `
      <dl style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:var(--text-sm)">
        <dt style="color:var(--text-secondary)">Código</dt>
        <dd class="font-mono">${esc(ticket.codigo)}</dd>
        <dt style="color:var(--text-secondary)">Estado</dt>
        <dd><span class="badge ${ESTADO_CLS[ticket.estado]||'badge-default'}">${esc(ticket.estado?.replace(/_/g,' ')??'')}</span></dd>
        <dt style="color:var(--text-secondary)">Diagnóstico</dt>
        <dd>${esc(ticket.diagnostico ?? '—')}</dd>
        <dt style="color:var(--text-secondary)">Creado</dt>
        <dd>${new Date(ticket.created_at).toLocaleString('es-AR')}</dd>
      </dl>
    `;
    const modal = new Modal({ title: `Ticket ${ticket.codigo}`, content: el, confirmText: 'Cerrar', cancelText: '', size: 'sm' });
    modal.onConfirm(() => modal.hide());
    modal.onCancel(()  => modal.hide());
    modal.show();
  }

  destroy() {}
}
```

- [ ] **Paso 2: Actualizar `endpoints.js` — agregar `tickets.avanzarEstado` y `tickets.listar` con params**

Leer `endpoints.js`. El bloque tickets actual:
```js
export const tickets = {
  listar:    (params = {}) => api.get('/tickets?' + new URLSearchParams(params).toString()),
  obtener:   (id)          => api.get(`/tickets/${id}`),
  crear:     (data)        => api.post('/tickets', data),
  actualizar:(id, data)    => api.patch(`/tickets/${id}`, data),
};
```

Reemplazar con:
```js
export const tickets = {
  listar:        (params = {}) => api.get('/tickets?' + new URLSearchParams(params).toString()),
  obtener:       (id)          => api.get(`/tickets/${id}`),
  crear:         (data)        => api.post('/tickets', data),
  avanzarEstado: (id, data)    => api.patch(`/tickets/${id}/estado`, data),
  asignarTecnico:(id, data)    => api.patch(`/tickets/${id}/tecnico`, data),
};
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/public/src/js/views/tickets.js frontend/public/src/js/api/endpoints.js
git commit -m "feat(frontend): vista tickets de mantenimiento con avance de estado"
```

---

### Task 17: Vista Pedidos de Reposición

**Files:**
- Create: `frontend/public/src/js/views/pedidos.js`

- [ ] **Paso 1: Crear `pedidos.js`**

```js
// frontend/public/src/js/views/pedidos.js
// Vista de pedidos de reposición. Roles: admin, docente.

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Modal }        from '../components/Modal.js';
import { Toast }        from '../components/Toast.js';
import { pedidos as pedidosApi, productos as productosApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR');
}

const ESTADO_CLS = {
  borrador:              'badge-default',
  pendiente_aprobacion:  'badge-yellow',
  aprobado:              'badge-blue',
  comprado:              'badge-green',
  en_camino:             'badge-blue',
  recibido:              'badge-green',
  rechazado:             'badge-red',
};

// Estado siguiente según flujo
const ESTADO_NEXT_ADMIN   = { borrador: 'pendiente_aprobacion', pendiente_aprobacion: 'aprobado', aprobado: 'comprado', comprado: 'en_camino', en_camino: 'recibido' };
const ESTADO_NEXT_DOCENTE = { borrador: 'pendiente_aprobacion' };

export default class PedidosView {
  constructor(container) {
    this.container = container;
    this._dt       = null;
    this._isAdmin  = false;
  }

  async render() {
    const usuario = getState('usuario');
    this._isAdmin = usuario?.rol === 'admin';

    const { mainContent } = renderLayout(this.container, {
      usuario, activeHash: '#/pedidos',
    });

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Pedidos de Reposición</h1>
        <button class="btn btn-primary" id="btn-nuevo-pedido">+ Nuevo pedido</button>
      </div>
      <div class="page-body">
        <div class="card" id="pedidos-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container:    mainContent.querySelector('#pedidos-table'),
      emptyMessage: 'Sin pedidos registrados',
      columns: [
        { key: 'codigo',    label: 'Código',     sortable: true },
        { key: 'estado',    label: 'Estado',     sortable: true,
          render: v => `<span class="badge ${ESTADO_CLS[v]||'badge-default'}">${esc(v?.replace(/_/g,' ')??'')}</span>` },
        { key: 'items',     label: 'Ítems',      sortable: false,
          render: (v, row) => `${row.items?.length ?? 0} ítems` },
        { key: 'created_at',label: 'Fecha',      sortable: true,
          render: v => fmtDate(v) },
      ],
      actions: row => {
        const estadoNextMap = this._isAdmin ? ESTADO_NEXT_ADMIN : ESTADO_NEXT_DOCENTE;
        const nextEstado    = estadoNextMap[row.estado];
        return `
          <button class="btn btn-sm btn-ghost" data-id="ver-${row.id}" title="Ver detalle">Ver</button>
          ${nextEstado ? `<button class="btn btn-sm btn-secondary" data-id="avanzar-${row.id}" title="Avanzar estado">Avanzar →</button>` : ''}
        `;
      },
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('ver-'))     this._verDetalle(row);
      if (id.startsWith('avanzar-')) this._avanzarEstado(row);
    });

    mainContent.querySelector('#btn-nuevo-pedido')
      ?.addEventListener('click', () => this._openCrearPedido());

    await this._loadPedidos();
  }

  async _loadPedidos() {
    try {
      const res = await pedidosApi.listar();
      this._dt.setData(res.data || []);
    } catch (e) { Toast.show('Error al cargar pedidos', 'error'); }
  }

  async _avanzarEstado(pedido) {
    const estadoNextMap = this._isAdmin ? ESTADO_NEXT_ADMIN : ESTADO_NEXT_DOCENTE;
    const next = estadoNextMap[pedido.estado];
    if (!next) return;

    const ok = await Modal.confirm({
      title: 'Avanzar estado',
      message: `¿Cambiar pedido "${pedido.codigo}" a "${next.replace(/_/g,' ')}"?`,
      confirmText: 'Confirmar',
    });
    if (!ok) return;

    try {
      await pedidosApi.avanzarEstado(pedido.id, { estado: next });
      Toast.show(`Pedido ${pedido.codigo} → ${next.replace(/_/g,' ')}`, 'success');
      await this._loadPedidos();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  _verDetalle(pedido) {
    const itemsHtml = (pedido.items || []).map(i => `
      <tr>
        <td>${esc(i.producto?.nombre ?? i.producto_id ?? '—')}</td>
        <td>${i.cantidad_solicitada}</td>
        <td>${i.cantidad_recibida ?? '—'}</td>
        <td style="font-size:11px;color:var(--text-muted)">${esc(i.notas ?? '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Sin ítems</td></tr>';

    const el = document.createElement('div');
    el.innerHTML = `
      <dl style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:var(--text-sm);margin-bottom:16px">
        <dt style="color:var(--text-secondary)">Código</dt>
        <dd class="font-mono">${esc(pedido.codigo)}</dd>
        <dt style="color:var(--text-secondary)">Estado</dt>
        <dd><span class="badge ${ESTADO_CLS[pedido.estado]||'badge-default'}">${esc(pedido.estado?.replace(/_/g,' ')??'')}</span></dd>
        <dt style="color:var(--text-secondary)">Justificación</dt>
        <dd>${esc(pedido.justificacion ?? '—')}</dd>
        <dt style="color:var(--text-secondary)">Fecha</dt>
        <dd>${fmtDate(pedido.created_at)}</dd>
      </dl>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Producto</th><th>Solicitado</th><th>Recibido</th><th>Notas</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </div>
    `;
    const modal = new Modal({ title: `Pedido ${pedido.codigo}`, content: el, confirmText: 'Cerrar', cancelText: '', size: 'lg' });
    modal.onConfirm(() => modal.hide());
    modal.onCancel(()  => modal.hide());
    modal.show();
  }

  async _openCrearPedido() {
    let productos = [];
    try {
      const res = await productosApi.listar();
      productos = res.data || [];
    } catch (e) { Toast.show('Error al cargar productos', 'error'); return; }

    const items = [];

    const formEl = document.createElement('div');
    formEl.innerHTML = `
      <div class="form-group" style="margin-bottom:12px">
        <label class="form-label">Justificación *</label>
        <textarea class="form-control" id="ped-just" rows="2" maxlength="512" required
          placeholder="Motivo del pedido..."></textarea>
      </div>
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:8px">
        Ítems del pedido:
      </div>
      <div id="ped-items-list" style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:8px;margin-bottom:12px">
        <p style="color:var(--text-muted);font-size:var(--text-sm);text-align:center;padding:8px">Sin ítems aún</p>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="flex:3">
          <label class="form-label">Producto</label>
          <select class="form-control" id="ped-prod">
            <option value="">— Seleccionar —</option>
            ${productos.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="width:80px">
          <label class="form-label">Cantidad</label>
          <input class="form-control" id="ped-qty" type="number" min="1" value="1">
        </div>
        <button class="btn btn-secondary" id="ped-add">+ Agregar</button>
      </div>
    `;

    formEl.querySelector('#ped-add').addEventListener('click', () => {
      const prodSel = formEl.querySelector('#ped-prod');
      const prodId  = prodSel.value;
      const prodNom = prodSel.options[prodSel.selectedIndex]?.text ?? '';
      const qty     = parseInt(formEl.querySelector('#ped-qty').value) || 1;
      if (!prodId) { Toast.show('Seleccioná un producto', 'warning'); return; }

      items.push({ producto_id: prodId, cantidad_solicitada: qty });
      const listEl = formEl.querySelector('#ped-items-list');
      if (listEl.querySelector('p')) listEl.innerHTML = '';
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px';
      d.textContent = `${prodNom} × ${qty}`;
      listEl.appendChild(d);
    });

    const confirmed = await new Promise(resolve => {
      const modal = new Modal({ title: 'Nuevo Pedido', content: formEl, confirmText: 'Crear pedido', size: 'md' });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
    if (!confirmed) return;

    const just = formEl.querySelector('#ped-just').value.trim();
    if (!just)         { Toast.show('La justificación es requerida', 'error'); return; }
    if (!items.length) { Toast.show('Agregá al menos un ítem', 'warning'); return; }

    try {
      await pedidosApi.crear({ justificacion: just, items });
      Toast.show('Pedido creado exitosamente', 'success');
      await this._loadPedidos();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() {}
}
```

- [ ] **Paso 2: Actualizar `endpoints.js` — agregar `pedidos.avanzarEstado`**

En el bloque `pedidos`, verificar que `avanzarEstado` exista. Si el bloque actual tiene solo `listar, obtener, crear, actualizar, eliminar`, reemplazarlo con:

```js
export const pedidos = {
  listar:      (params = {}) => api.get('/pedidos?' + new URLSearchParams(params).toString()),
  obtener:     (id)          => api.get(`/pedidos/${id}`),
  crear:       (data)        => api.post('/pedidos', data),
  actualizar:  (id, data)    => api.patch(`/pedidos/${id}`, data),
  eliminar:    (id)          => api.delete(`/pedidos/${id}`),
  avanzarEstado:(id, data)   => api.patch(`/pedidos/${id}/estado`, data),
  agregarCotizacion:(id, data)   => api.post(`/pedidos/${id}/cotizaciones`, data),
  seleccionarCotizacion:(id, cotId) => api.patch(`/pedidos/${id}/cotizaciones/${cotId}/seleccionar`),
};
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/public/src/js/views/pedidos.js frontend/public/src/js/api/endpoints.js
git commit -m "feat(frontend): vista pedidos de reposición con creación y avance de estado"
```

---

### Task 18: Vista Historial de Movimientos

**Files:**
- Create: `frontend/public/src/js/views/historial.js`

- [ ] **Paso 1: Crear `historial.js`**

```js
// frontend/public/src/js/views/historial.js
// Vista de historial de movimientos — solo lectura, solo admin.

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Toast }        from '../components/Toast.js';
import { historial as historialApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

const ACCION_CLS = {
  checkout:        'badge-blue',
  checkin:         'badge-green',
  merma:           'badge-red',
  ajuste_stock:    'badge-yellow',
  creacion:        'badge-default',
  modificacion:    'badge-default',
  baja:            'badge-red',
  reparacion:      'badge-yellow',
  recepcion_compra:'badge-green',
  reserva:         'badge-blue',
  cancelacion:     'badge-red',
};

export default class HistorialView {
  constructor(container) {
    this.container = container;
    this._dt       = null;
    this._offset   = 0;
    this._total    = 0;
    this._limit    = 50;
    this._filters  = { accion: '', entidad_tipo: '', desde: '', hasta: '' };
  }

  async render() {
    const usuario = getState('usuario');
    const { mainContent } = renderLayout(this.container, {
      usuario, activeHash: '#/historial',
    });

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Historial de Movimientos</h1>
      </div>
      <div class="page-body">
        <!-- Filtros -->
        <div class="card" style="padding:16px">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
            <div class="form-group">
              <label class="form-label">Acción</label>
              <select class="form-control" id="f-accion" style="width:160px">
                <option value="">Todas</option>
                ${['checkout','checkin','merma','ajuste_stock','creacion','modificacion','baja','reparacion','recepcion_compra','reserva','cancelacion'].map(a =>
                  `<option value="${a}">${a.replace(/_/g,' ')}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Entidad</label>
              <select class="form-control" id="f-entidad" style="width:150px">
                <option value="">Todas</option>
                ${['Kit','ActivoFijo','Producto','Despacho','TicketMantenimiento'].map(e =>
                  `<option value="${e}">${e}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Desde</label>
              <input class="form-control" id="f-desde" type="date" style="width:150px">
            </div>
            <div class="form-group">
              <label class="form-label">Hasta</label>
              <input class="form-control" id="f-hasta" type="date" style="width:150px">
            </div>
            <button class="btn btn-primary" id="btn-filtrar">Filtrar</button>
            <button class="btn btn-ghost"   id="btn-limpiar">Limpiar</button>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;font-size:var(--text-sm);color:var(--text-secondary)">
          <span id="hist-count">Cargando...</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-ghost" id="btn-prev" disabled>‹ Anterior</button>
            <button class="btn btn-sm btn-ghost" id="btn-next" disabled>Siguiente ›</button>
          </div>
        </div>

        <div class="card" id="hist-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container:    mainContent.querySelector('#hist-table'),
      emptyMessage: 'Sin registros para los filtros seleccionados',
      pageSize:     50,
      columns: [
        { key: 'accion',     label: 'Acción',   sortable: false,
          render: v => `<span class="badge ${ACCION_CLS[v]||'badge-default'}" style="font-size:11px">${esc(v?.replace(/_/g,' ')??'')}</span>` },
        { key: 'entidad_tipo',label:'Entidad',  sortable: false },
        { key: 'entidad_id', label: 'ID',       sortable: false,
          render: v => `<span class="font-mono" style="font-size:11px;color:var(--text-muted)">${esc((v??'').slice(0,8))}…</span>` },
        { key: 'cantidad',   label: 'Cant.',    sortable: false,
          render: v => v != null ? v : '—' },
        { key: 'numero_serie',label:'N° Serie', sortable: false,
          render: v => v ? `<span class="font-mono" style="font-size:11px">${esc(v)}</span>` : '—' },
        { key: 'created_at', label: 'Fecha',    sortable: false,
          render: v => fmtDate(v) },
      ],
    });

    // Filtrar
    mainContent.querySelector('#btn-filtrar').addEventListener('click', () => {
      this._filters = {
        accion:       mainContent.querySelector('#f-accion').value,
        entidad_tipo: mainContent.querySelector('#f-entidad').value,
        desde:        mainContent.querySelector('#f-desde').value,
        hasta:        mainContent.querySelector('#f-hasta').value,
      };
      this._offset = 0;
      this._load(mainContent);
    });

    mainContent.querySelector('#btn-limpiar').addEventListener('click', () => {
      ['#f-accion','#f-entidad','#f-desde','#f-hasta'].forEach(sel => {
        mainContent.querySelector(sel).value = '';
      });
      this._filters = { accion:'', entidad_tipo:'', desde:'', hasta:'' };
      this._offset  = 0;
      this._load(mainContent);
    });

    mainContent.querySelector('#btn-prev').addEventListener('click', () => {
      this._offset = Math.max(0, this._offset - this._limit);
      this._load(mainContent);
    });
    mainContent.querySelector('#btn-next').addEventListener('click', () => {
      this._offset += this._limit;
      this._load(mainContent);
    });

    await this._load(mainContent);
  }

  async _load(mainContent) {
    try {
      const params = {
        limit:  this._limit,
        offset: this._offset,
        ...Object.fromEntries(Object.entries(this._filters).filter(([, v]) => v)),
      };
      const res = await historialApi.listar(params);
      const data  = res.data  || [];
      this._total = res.total || data.length;

      this._dt.setData(data);

      const countEl = mainContent.querySelector('#hist-count');
      if (countEl) {
        countEl.textContent = `Mostrando ${this._offset + 1}–${Math.min(this._offset + data.length, this._total)} de ${this._total} registros`;
      }

      const prevBtn = mainContent.querySelector('#btn-prev');
      const nextBtn = mainContent.querySelector('#btn-next');
      if (prevBtn) prevBtn.disabled = this._offset === 0;
      if (nextBtn) nextBtn.disabled = this._offset + data.length >= this._total;
    } catch (e) { Toast.show('Error al cargar historial', 'error'); }
  }

  destroy() {}
}
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/public/src/js/views/historial.js
git commit -m "feat(frontend): vista historial de movimientos con filtros y paginado"
```
