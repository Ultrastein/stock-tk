// frontend/public/src/js/views/_layout.js
// Shared application layout: sidebar + main content area.
// Usage: const { mainContent, destroy } = renderLayout(container, { usuario, activeHash });

import { clearAuth }    from '../store/state.js';
import { alertas as alertasApi } from '../api/endpoints.js';

/** Escape user-controlled strings for safe innerHTML insertion. */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── SVG icon constants (hardcoded, XSS-safe) ────────────────────────────────

const ICONS = {
  gear:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  grid:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  box:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  briefcase:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
  tool:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  cart:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  clock:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  monitor:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  logout:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  bell:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  handshake:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 12l-3 3M15 9l3-3M7.5 16.5l-1 1a2 2 0 0 1-3-3L9 9l3 3-4.5 4.5zM16.5 7.5l1-1a2 2 0 0 1 3 3L15 15l-3-3 4.5-4.5z"/></svg>`,
  clipboard:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  truck:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  dollar:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  bar_chart:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  calendar:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  search:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
};

// ─── Nav config per role ──────────────────────────────────────────────────────

const NAV_CONFIG = {
  admin: [
    {
      section: 'Principal',
      items: [
        { label: 'Dashboard',   href: '#/dashboard',  icon: ICONS.grid },
        { label: 'Préstamos',   href: '#/prestamos',  icon: ICONS.handshake },
        { label: 'Reservas',    href: '#/reservas',   icon: ICONS.calendar },
      ],
    },
    {
      section: 'Inventario',
      items: [
        { label: 'Stock',       href: '#/stock',      icon: ICONS.box },
        { label: 'Kits',        href: '#/kits',       icon: ICONS.briefcase },
        { label: 'Conteo físico', href: '#/inventario', icon: ICONS.clipboard },
      ],
    },
    {
      section: 'Mantenimiento',
      items: [
        { label: 'Tickets',      href: '#/tickets',    icon: ICONS.tool },
      ],
    },
    {
      section: 'Compras',
      items: [
        { label: 'Pedidos',     href: '#/pedidos',    icon: ICONS.cart },
        { label: 'Proveedores', href: '#/proveedores', icon: ICONS.truck },
        { label: 'Presupuesto', href: '#/presupuesto', icon: ICONS.dollar },
      ],
    },
    {
      section: 'Análisis',
      items: [
        { label: 'Reportes',    href: '#/reportes',   icon: ICONS.bar_chart },
        { label: 'Historial',   href: '#/historial',  icon: ICONS.clock },
      ],
    },
    {
      section: 'Kiosco',
      items: [
        { label: 'Kiosco',      href: '#/kiosk',      icon: ICONS.monitor },
      ],
    },
    {
      section: 'Sistema',
      items: [
        { label: 'Configuración', href: '#/settings', icon: ICONS.gear },
      ],
    },
  ],
  docente: [
    {
      section: 'Principal',
      items: [
        { label: 'Dashboard', href: '#/dashboard', icon: ICONS.grid },
        { label: 'Reservas',  href: '#/reservas',  icon: ICONS.calendar },
      ],
    },
    {
      section: 'Compras',
      items: [
        { label: 'Pedidos', href: '#/pedidos', icon: ICONS.cart },
      ],
    },
  ],
  kiosco: [
    {
      section: 'Kiosco',
      items: [
        { label: 'Kiosco', href: '#/kiosk', icon: ICONS.monitor },
      ],
    },
    {
      section: 'Inventario',
      items: [
        { label: 'Kits', href: '#/kits', icon: ICONS.briefcase },
      ],
    },
  ],
};

// ─── Build nav HTML ───────────────────────────────────────────────────────────

function buildNavHTML(rol, activeHash) {
  const sections = NAV_CONFIG[rol] || NAV_CONFIG.docente;
  return sections.map(({ section, items }) => {
    const links = items.map(({ label, href, icon }) => {
      const isActive = activeHash === href;
      return `<a
        class="nav-item${isActive ? ' nav-item-active' : ''}"
        href="${href}"
        aria-current="${isActive ? 'page' : 'false'}"
      >${icon}<span>${esc(label)}</span></a>`;
    }).join('');
    return `<div class="nav-section-label">${esc(section)}</div>${links}`;
  }).join('');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders the full app layout (sidebar + main content) into `container`.
 *
 * @param {Element} container - The root mount element (e.g. #app)
 * @param {{ usuario: Object, activeHash: string }} options
 * @returns {{ mainContent: Element, destroy: () => void }}
 */
export function renderLayout(container, { usuario, activeHash }) {
  const rol     = usuario?.rol ?? 'docente';
  const nombre  = esc(usuario?.nombre ?? '');
  const initial = esc((usuario?.nombre ?? '?').charAt(0).toUpperCase());

  const navHTML = buildNavHTML(rol, activeHash);

  container.innerHTML = `
    <div class="layout-app">
      <aside class="sidebar" role="navigation" aria-label="Menú principal">
        <div class="sidebar-logo">
          <img src="icons/logo-tk.png" alt="TK+ Stock" style="height:32px;width:auto;display:block">
        </div>
        <nav class="sidebar-nav">
          ${navHTML}
        </nav>
        <div class="sidebar-user">
          <div class="user-avatar">${initial}</div>
          <div class="flex-col" style="flex:1;min-width:0">
            <span class="truncate" style="font-size:var(--text-sm);font-weight:500">${nombre}</span>
            <span class="truncate" style="font-size:var(--text-xs);color:var(--text-muted)">${esc(rol)}</span>
          </div>
          <div style="position:relative;display:inline-flex">
            <button
              class="btn btn-ghost btn-icon btn-sm"
              id="layout-alerts-btn"
              title="Alertas"
              aria-label="Alertas"
            >${ICONS.bell}</button>
            <span id="layout-alerts-badge" style="
              display:none;
              position:absolute;top:-4px;right:-4px;
              background:var(--danger);color:#fff;
              font-size:10px;font-weight:700;line-height:1;
              min-width:16px;height:16px;padding:0 3px;
              border-radius:999px;text-align:center;
              pointer-events:none;
            "></span>
          </div>
          <button
            class="btn btn-ghost btn-icon btn-sm"
            id="layout-logout-btn"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >${ICONS.logout}</button>
        </div>
      </aside>
      <div class="main-content" id="layout-main-content" role="main"></div>
    </div>
  `;

  // ── SPA nav links ────────────────────────────────────────────────────────
  const navLinks = container.querySelectorAll('.nav-item');
  const _navHandler = (e) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    if (href) location.hash = href;
  };
  navLinks.forEach(link => link.addEventListener('click', _navHandler));

  // ── Logout ───────────────────────────────────────────────────────────────
  const logoutBtn = container.querySelector('#layout-logout-btn');
  const _logoutHandler = () => {
    clearAuth();
    location.hash = '#/login';
  };
  logoutBtn.addEventListener('click', _logoutHandler);

  // ── Alerts badge (non-blocking, fire-and-forget) ─────────────────────────
  const alertsBtn   = container.querySelector('#layout-alerts-btn');
  const alertsBadge = container.querySelector('#layout-alerts-badge');
  const _alertsHandler = () => { location.hash = '#/dashboard'; };
  if (alertsBtn) alertsBtn.addEventListener('click', _alertsHandler);

  alertasApi.listar({ leida: false, limit: 99 }).then(res => {
    const count = Array.isArray(res?.data) ? res.data.length : (res?.total ?? 0);
    if (count > 0 && alertsBadge) {
      alertsBadge.textContent = count > 99 ? '99+' : String(count);
      alertsBadge.style.display = 'flex';
      alertsBadge.style.alignItems = 'center';
      alertsBadge.style.justifyContent = 'center';
    }
  }).catch(() => {/* silencioso */});

  // ── Return refs ──────────────────────────────────────────────────────────
  const mainContent = container.querySelector('#layout-main-content');

  function destroy() {
    navLinks.forEach(link => link.removeEventListener('click', _navHandler));
    logoutBtn.removeEventListener('click', _logoutHandler);
    if (alertsBtn) alertsBtn.removeEventListener('click', _alertsHandler);
  }

  return { mainContent, destroy };
}

export default renderLayout;
