// frontend/public/src/js/views/dashboard.js
// Dashboard view: KPI stat cards + unread alerts + recent history table.
// Mounted via the SPA router when route is #/dashboard.

import { get as getState }    from '../store/state.js';
import { renderLayout }        from './_layout.js';
import { Toast }               from '../components/Toast.js';
import {
  kits    as kitsApi,
  alertas as alertasApi,
  historial as historialApi,
} from '../api/endpoints.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Escape user-controlled strings for safe innerHTML insertion. */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format an ISO date string for es-AR locale. */
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Skeleton HTML ────────────────────────────────────────────────────────────

function skeletonCards() {
  return `
    <div class="dashboard-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
      ${[1,2,3,4].map(() => `
        <div class="card skeleton-card" style="padding:20px;border-radius:var(--radius-lg)">
          <div class="skeleton" style="height:12px;width:60%;border-radius:4px;margin-bottom:12px"></div>
          <div class="skeleton" style="height:32px;width:40%;border-radius:4px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:10px;width:80%;border-radius:4px"></div>
        </div>
      `).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card" style="padding:20px;border-radius:var(--radius-lg)">
        <div class="skeleton" style="height:14px;width:50%;border-radius:4px;margin-bottom:16px"></div>
        ${[1,2,3].map(() => `<div class="skeleton" style="height:48px;border-radius:4px;margin-bottom:8px"></div>`).join('')}
      </div>
      <div class="card" style="padding:20px;border-radius:var(--radius-lg)">
        <div class="skeleton" style="height:14px;width:50%;border-radius:4px;margin-bottom:16px"></div>
        ${[1,2,3,4].map(() => `<div class="skeleton" style="height:36px;border-radius:4px;margin-bottom:8px"></div>`).join('')}
      </div>
    </div>
  `;
}

// ─── KPI cards ────────────────────────────────────────────────────────────────

function statCard({ label, value, sublabel, colorVar, iconPath }) {
  return `
    <div class="card stat-card" style="padding:20px;border-radius:var(--radius-lg);border-left:4px solid ${colorVar}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:var(--text-sm);color:var(--text-secondary);font-weight:500">${esc(label)}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colorVar}" stroke-width="2" aria-hidden="true">
          ${iconPath}
        </svg>
      </div>
      <div style="font-size:2rem;font-weight:700;color:var(--text-primary);line-height:1">${esc(String(value))}</div>
      ${sublabel ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">${esc(sublabel)}</div>` : ''}
    </div>
  `;
}

// ─── Alerts section ───────────────────────────────────────────────────────────

const TIPO_BADGE = {
  stock_bajo:    'badge-yellow',
  sin_stock:     'badge-red',
  mantenimiento: 'badge-orange',
  vencimiento:   'badge-red',
  info:          'badge-blue',
};

function alertaBadgeClass(tipo) {
  return TIPO_BADGE[tipo] || 'badge-default';
}

function alertaLabel(tipo) {
  const labels = {
    stock_bajo:    'Stock bajo',
    sin_stock:     'Sin stock',
    mantenimiento: 'Mantenimiento',
    vencimiento:   'Vencimiento',
    info:          'Info',
  };
  return labels[tipo] || tipo;
}

function renderAlertasSection(alertas, onMarcarTodas) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card';
  wrapper.style.cssText = 'border-radius:var(--radius-lg);overflow:hidden';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)';

  const title = document.createElement('h3');
  title.style.cssText = 'font-size:var(--text-base);font-weight:600;margin:0';
  title.textContent = 'Alertas pendientes';

  header.appendChild(title);

  if (alertas.length > 0) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-sm';
    btn.textContent = 'Marcar todas leídas';
    btn.addEventListener('click', onMarcarTodas);
    header.appendChild(btn);
  }

  wrapper.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'padding:16px 20px';

  if (alertas.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:24px 0;color:var(--text-muted);font-size:var(--text-sm)';
    empty.textContent = 'Sin alertas pendientes 🎉';
    body.appendChild(empty);
  } else {
    const first5 = alertas.slice(0, 5);
    first5.forEach(alerta => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)';
      row.innerHTML = `
        <span class="badge ${alertaBadgeClass(alerta.tipo)}" style="flex-shrink:0;white-space:nowrap">${esc(alertaLabel(alerta.tipo))}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:var(--text-sm);color:var(--text-primary)">${esc(alerta.mensaje ?? alerta.message ?? '')}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">${esc(fmtDate(alerta.createdAt ?? alerta.created_at))}</div>
        </div>
      `;
      body.appendChild(row);
    });

    // Remove border on last row
    const rows = body.querySelectorAll('div[style*="border-bottom"]');
    if (rows.length) {
      rows[rows.length - 1].style.borderBottom = 'none';
    }
  }

  wrapper.appendChild(body);
  return wrapper;
}

// ─── Historial section ────────────────────────────────────────────────────────

const ACCION_BADGE = {
  checkout:  'badge-blue',
  checkin:   'badge-green',
  creacion:  'badge-green',
  actualizacion: 'badge-yellow',
  eliminacion: 'badge-red',
};

function historialBadgeClass(accion) {
  return ACCION_BADGE[accion?.toLowerCase()] || 'badge-default';
}

function renderHistorialSection(movimientos) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card';
  wrapper.style.cssText = 'border-radius:var(--radius-lg);overflow:hidden';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)';

  const title = document.createElement('h3');
  title.style.cssText = 'font-size:var(--text-base);font-weight:600;margin:0';
  title.textContent = 'Actividad reciente';

  const verTodoLink = document.createElement('a');
  verTodoLink.href = '#/historial';
  verTodoLink.style.cssText = 'font-size:var(--text-sm);color:var(--accent);text-decoration:none';
  verTodoLink.textContent = 'Ver todo →';
  verTodoLink.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = '#/historial';
  });

  header.appendChild(title);
  header.appendChild(verTodoLink);
  wrapper.appendChild(header);

  // Table
  const tableWrap = document.createElement('div');
  tableWrap.style.cssText = 'overflow-x:auto';

  if (movimientos.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:24px 0;color:var(--text-muted);font-size:var(--text-sm)';
    empty.textContent = 'Sin actividad reciente';
    tableWrap.appendChild(empty);
  } else {
    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--text-sm)';

    // thead
    table.innerHTML = `
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:10px 20px;color:var(--text-secondary);font-weight:500;white-space:nowrap">Acción</th>
          <th style="text-align:left;padding:10px 12px;color:var(--text-secondary);font-weight:500">Entidad</th>
          <th style="text-align:left;padding:10px 12px;color:var(--text-secondary);font-weight:500">ID</th>
          <th style="text-align:left;padding:10px 20px;color:var(--text-secondary);font-weight:500;white-space:nowrap">Fecha</th>
        </tr>
      </thead>
    `;

    // tbody
    const tbody = document.createElement('tbody');
    movimientos.forEach((mov, idx) => {
      const tr = document.createElement('tr');
      if (idx < movimientos.length - 1) {
        tr.style.borderBottom = '1px solid var(--border)';
      }

      const accion  = mov.accion ?? mov.action ?? '';
      const entidad = mov.entidad ?? mov.entity ?? '';
      const entidadId = String(mov.entidad_id ?? mov.entity_id ?? mov.id ?? '');
      const idShort = entidadId.slice(0, 8);
      const fecha   = mov.createdAt ?? mov.created_at ?? mov.fecha ?? '';

      tr.innerHTML = `
        <td style="padding:10px 20px;white-space:nowrap">
          <span class="badge ${historialBadgeClass(accion)}">${esc(accion)}</span>
        </td>
        <td style="padding:10px 12px;color:var(--text-primary)">${esc(entidad)}</td>
        <td style="padding:10px 12px;font-family:monospace;font-size:var(--text-xs);color:var(--text-muted)">${esc(idShort)}</td>
        <td style="padding:10px 20px;white-space:nowrap;color:var(--text-secondary)">${esc(fmtDate(fecha))}</td>
      `;

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  wrapper.appendChild(tableWrap);
  return wrapper;
}

// ─── DashboardView ────────────────────────────────────────────────────────────

export default class DashboardView {
  constructor(container) {
    this.container     = container;
    this._layoutDestroy = null;
    this._mainContent   = null;
  }

  async render() {
    if (this._layoutDestroy) {
      this._layoutDestroy();
      this._layoutDestroy = null;
    }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, {
      usuario,
      activeHash: '#/dashboard',
    });

    this._mainContent   = mainContent;
    this._layoutDestroy = destroy;

    // Show skeleton while data loads
    mainContent.innerHTML = `
      <div style="padding:24px">
        <div style="margin-bottom:24px">
          <h2 style="font-size:var(--text-xl);font-weight:700;margin:0 0 4px">Dashboard</h2>
          <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">
            Bienvenido, ${esc(usuario?.nombre ?? '')}
          </p>
        </div>
        ${skeletonCards()}
      </div>
    `;

    const [kitsResult, alertasResult, histResult] = await Promise.allSettled([
      kitsApi.listar(),
      alertasApi.listar({ leida: false, limit: 10 }),
      historialApi.listar({ limit: 10 }),
    ]);

    const kitsData      = Array.isArray(kitsResult.value?.data)    ? kitsResult.value.data    : [];
    const alertasData   = Array.isArray(alertasResult.value?.data) ? alertasResult.value.data : [];
    const historialData = Array.isArray(histResult.value?.data)    ? histResult.value.data    : [];

    // Collect names of sections that failed
    const failed = [];
    if (kitsResult.status    !== 'fulfilled') failed.push('Kits');
    if (alertasResult.status !== 'fulfilled') failed.push('Alertas');
    if (histResult.status    !== 'fulfilled') failed.push('Historial');

    this._renderContent(mainContent, usuario, kitsData, alertasData, historialData, failed);
  }

  _renderContent(mainContent, usuario, kitsData, alertasData, historialData, failed = []) {
    // ── KPI counts ──────────────────────────────────────────────────────────
    const kitsDisponibles = kitsData.filter(k => k.estado === 'disponible').length;
    const kitsEnUso       = kitsData.filter(k => k.estado === 'en_uso').length;
    const kitsProblema    = kitsData.filter(
      k => k.estado === 'en_reparacion' || k.estado === 'incompleto'
    ).length;
    const alertasSinLeer  = alertasData.length;

    // ── Page wrapper ────────────────────────────────────────────────────────
    const page = document.createElement('div');
    page.style.cssText = 'padding:24px';

    // Header
    const pageHeader = document.createElement('div');
    pageHeader.style.cssText = 'margin-bottom:24px';
    pageHeader.innerHTML = `
      <h2 style="font-size:var(--text-xl);font-weight:700;margin:0 0 4px">Dashboard</h2>
      <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">
        Bienvenido, ${esc(usuario?.nombre ?? '')}
      </p>
    `;
    page.appendChild(pageHeader);

    // Partial-failure warning
    if (failed.length > 0) {
      const warn = document.createElement('div');
      warn.style.cssText = 'background:var(--warning-bg,#fffbeb);border:1px solid var(--warning,#f59e0b);border-radius:var(--radius-md,6px);padding:10px 14px;margin-bottom:16px;font-size:var(--text-sm);color:var(--warning-text,#92400e)';
      warn.textContent = `Algunos datos no pudieron cargarse: ${failed.join(', ')}. El resto se muestra correctamente.`;
      page.appendChild(warn);
    }

    // KPI grid
    const kpiGrid = document.createElement('div');
    kpiGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px';
    kpiGrid.innerHTML = [
      statCard({
        label: 'Kits disponibles',
        value: kitsDisponibles,
        sublabel: 'Listos para entregar',
        colorVar: 'var(--success)',
        iconPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
      }),
      statCard({
        label: 'Kits en uso',
        value: kitsEnUso,
        sublabel: 'Actualmente despachados',
        colorVar: 'var(--info)',
        iconPath: '<path d="M16 11V7a4 4 0 0 0-8 0v4"/><path d="M5 9h14l1 12H4L5 9z"/>',
      }),
      statCard({
        label: 'Kits con problema',
        value: kitsProblema,
        sublabel: 'En reparación o incompletos',
        colorVar: 'var(--warning)',
        iconPath: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
      }),
      statCard({
        label: 'Alertas sin leer',
        value: alertasSinLeer,
        sublabel: 'Requieren atención',
        colorVar: alertasSinLeer > 0 ? 'var(--danger)' : 'var(--text-muted)',
        iconPath: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      }),
    ].join('');
    page.appendChild(kpiGrid);

    // Bottom two-column grid
    const bottomGrid = document.createElement('div');
    bottomGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px';

    // Alertas
    const alertasSection = renderAlertasSection(
      alertasData,
      async () => {
        try {
          await alertasApi.marcarTodasLeidas();
          Toast.show('Todas las alertas marcadas como leídas', 'success');
          // Re-render by calling render() again
          await this.render();
        } catch (err) {
          Toast.show('Error al marcar alertas: ' + (err.message || ''), 'error');
        }
      }
    );

    // Historial
    const historialSection = renderHistorialSection(historialData);

    bottomGrid.appendChild(alertasSection);
    bottomGrid.appendChild(historialSection);
    page.appendChild(bottomGrid);

    // Replace skeleton with real content
    mainContent.innerHTML = '';
    mainContent.appendChild(page);
  }

  destroy() {
    if (this._layoutDestroy) {
      this._layoutDestroy();
      this._layoutDestroy = null;
    }
  }
}
