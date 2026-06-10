// frontend/public/src/js/views/reportes.js
// Reportes y analítica: resumen, stock crítico, garantías, presupuesto, préstamos.

import { renderLayout }    from './_layout.js';
import { Toast }           from '../components/Toast.js';
import {
  reportes    as reportesApi,
  presupuesto as presupuestoApi,
  categorias  as categoriasApi,
} from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR');
}
function fmt$(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
}

export default class ReportesView {
  constructor(container) {
    this.container      = container;
    this._layoutDestroy = null;
    this._anio          = new Date().getFullYear();
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, { usuario, activeHash: '#/reportes' });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Reportes</h1>
        <button class="btn btn-secondary" id="btn-export">⬇ Exportar CSV</button>
      </div>
      <div class="page-body" id="reportes-body">
        <div style="text-align:center;padding:48px;color:var(--text-muted)">Cargando datos…</div>
      </div>
    `;

    mainContent.querySelector('#btn-export')?.addEventListener('click', () => this._exportarCSV());

    await this._loadAll(mainContent);
  }

  async _loadAll(mainContent) {
    const body = mainContent.querySelector('#reportes-body');

    const [resumenRes, stockCritRes, garantiasRes, prestamosRes, presupRes, movRes] = await Promise.allSettled([
      reportesApi.resumen(),
      reportesApi.stockCritico(),
      reportesApi.garantias(),
      reportesApi.prestamosActivos(),
      reportesApi.presupuestoAnio(this._anio),
      reportesApi.movimientosMes(),
    ]);

    const resumen   = resumenRes.value?.data ?? {};
    const stockCrit = Array.isArray(stockCritRes.value?.data) ? stockCritRes.value.data : [];
    const garantias = Array.isArray(garantiasRes.value?.data) ? garantiasRes.value.data : [];
    const prestamos = Array.isArray(prestamosRes.value?.data) ? prestamosRes.value.data : [];
    const presup    = presupRes.value ?? {};
    const movs      = Array.isArray(movRes.value?.data) ? movRes.value.data : [];

    body.innerHTML = '';

    // ── 1. KPI Row ────────────────────────────────────────────────
    const kpiRow = document.createElement('div');
    kpiRow.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px';
    const inv = resumen.inventario || {};
    const ops = resumen.operaciones || {};
    [
      { label: 'Total activos',    value: inv.totalActivos ?? '—',     color: 'var(--info)',    sub: `${inv.activosDisponibles ?? 0} disponibles` },
      { label: 'En uso',           value: inv.activosEnUso ?? '—',     color: 'var(--warning)', sub: `${prestamos.length} despachos activos` },
      { label: 'Stock crítico',    value: inv.stockCritico ?? '—',     color: 'var(--danger)',  sub: 'productos bajo mínimo' },
      { label: 'Tickets abiertos', value: ops.ticketsPendientes ?? '—', color: 'var(--warning)', sub: 'pendientes / en reparación' },
      { label: 'Alertas activas',  value: resumen.alertasNoLeidas ?? '—', color: 'var(--danger)', sub: 'sin leer' },
    ].forEach(({ label, value, color, sub }) => {
      const c = document.createElement('div');
      c.className = 'card stat-card';
      c.style.cssText = `border-left:4px solid ${color}`;
      c.innerHTML = `
        <div style="font-size:var(--text-sm);color:var(--text-secondary);font-weight:500;margin-bottom:4px">${esc(label)}</div>
        <div style="font-size:2rem;font-weight:700;line-height:1">${esc(String(value))}</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">${esc(sub)}</div>
      `;
      kpiRow.appendChild(c);
    });
    body.appendChild(kpiRow);

    // ── 2. Dos columnas ───────────────────────────────────────────
    const cols = document.createElement('div');
    cols.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px';

    // Stock crítico
    cols.appendChild(this._makeCard('🔴 Stock Crítico', stockCrit.length === 0
      ? '<p style="color:var(--success);padding:16px;text-align:center">🎉 Sin productos en stock crítico</p>'
      : `<table class="table"><thead><tr><th>Producto</th><th>Actual</th><th>Mínimo</th></tr></thead><tbody>
          ${stockCrit.slice(0,8).map(p => `
            <tr>
              <td>${esc(p.nombre)}</td>
              <td style="color:${p.stock_actual === 0 ? 'var(--danger)' : 'var(--warning)'};font-weight:600">${p.stock_actual}</td>
              <td style="color:var(--text-muted)">${p.stock_minimo}</td>
            </tr>
          `).join('')}
          ${stockCrit.length > 8 ? `<tr><td colspan="3" style="color:var(--text-muted);text-align:center;font-size:var(--text-xs)">+${stockCrit.length - 8} más</td></tr>` : ''}
        </tbody></table>`
    ));

    // Garantías por vencer
    const garantiasProx = garantias.filter(g => g.garantia_proxima || g.garantia_vencida).slice(0, 8);
    cols.appendChild(this._makeCard('🛡 Garantías', garantiasProx.length === 0
      ? '<p style="color:var(--success);padding:16px;text-align:center">Sin garantías por vencer pronto</p>'
      : `<table class="table"><thead><tr><th>Activo</th><th>Vence</th><th>Días</th></tr></thead><tbody>
          ${garantiasProx.map(g => `
            <tr>
              <td>${esc(g.numero_serie)}</td>
              <td style="font-size:var(--text-sm)">${fmtDate(g.fecha_garantia)}</td>
              <td>
                <span class="badge ${g.garantia_vencida ? 'badge-red' : 'badge-yellow'}">
                  ${g.garantia_vencida ? 'Vencida' : `${g.dias_restantes}d`}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody></table>`
    ));

    body.appendChild(cols);

    // ── 3. Préstamos vencidos ─────────────────────────────────────
    const vencidos = prestamos.filter(p => p.vencido);
    if (vencidos.length) {
      const card = this._makeCard(`⚠ Préstamos Vencidos (${vencidos.length})`,
        `<table class="table"><thead><tr><th>Despacho</th><th>Solicitante</th><th>Desde</th><th>Días</th></tr></thead><tbody>
          ${vencidos.map(p => `
            <tr>
              <td style="font-family:monospace;font-size:var(--text-sm)">${esc(p.codigo)}</td>
              <td>${esc(p.solicitante?.nombre ?? '—')}</td>
              <td style="font-size:var(--text-sm)">${fmtDate(p.fecha_devolucion_esperada)}</td>
              <td><span class="badge badge-red">+${p.dias_demora}d</span></td>
            </tr>
          `).join('')}
        </tbody></table>`
      );
      body.appendChild(card);
    }

    // ── 4. Presupuesto del año ────────────────────────────────────
    if (presup.data?.length) {
      const total = presup.total || { asignado: 0, ejecutado: 0 };
      const pct = total.asignado > 0 ? Math.round((total.ejecutado / total.asignado) * 100) : 0;
      const card = this._makeCard(`💰 Presupuesto ${this._anio}`,
        `<div style="display:flex;gap:16px;margin-bottom:12px">
          <div class="stat-card" style="flex:1;text-align:center">
            <div style="font-size:1.4rem;font-weight:700">${fmt$(total.asignado)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Asignado</div>
          </div>
          <div class="stat-card" style="flex:1;text-align:center">
            <div style="font-size:1.4rem;font-weight:700;color:var(--warning)">${fmt$(total.ejecutado)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Ejecutado</div>
          </div>
          <div class="stat-card" style="flex:1;text-align:center">
            <div style="font-size:1.4rem;font-weight:700;color:${pct > 90 ? 'var(--danger)' : 'var(--success)'}">
              ${pct}%
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">Utilizado</div>
          </div>
        </div>
        <div style="background:var(--bg-elevated);border-radius:var(--radius);height:8px;overflow:hidden">
          <div style="height:100%;width:${Math.min(pct, 100)}%;background:${pct > 90 ? 'var(--danger)' : 'var(--accent)'}; transition:width 0.4s"></div>
        </div>`
      );
      body.appendChild(card);
    }

    // ── 5. Actividad del mes ──────────────────────────────────────
    if (movs.length) {
      const maxCant = Math.max(...movs.map(m => parseInt(m.cantidad) || 0)) || 1;
      const barChart = movs.map(m => {
        const h = Math.round(((parseInt(m.cantidad) || 0) / maxCant) * 60);
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
            <span style="font-size:9px;color:var(--text-muted)">${m.cantidad}</span>
            <div style="width:12px;height:${h}px;background:var(--accent);border-radius:2px;min-height:2px"></div>
            <span style="font-size:9px;color:var(--text-muted);writing-mode:vertical-lr;transform:rotate(180deg)">
              ${esc(String(m.fecha ?? '').slice(8))}
            </span>
          </div>`;
      }).join('');

      const card = this._makeCard('📈 Actividad del mes',
        `<div style="display:flex;align-items:flex-end;gap:4px;height:80px;padding:8px 0">
          ${barChart}
        </div>`
      );
      body.appendChild(card);
    }
  }

  _makeCard(title, bodyHtml) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${esc(title)}</h3>
      </div>
      <div style="overflow-x:auto">${bodyHtml}</div>
    `;
    return card;
  }

  _exportarCSV() {
    // Exportación simple de stock crítico como CSV
    reportesApi.stockCritico().then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      if (!data.length) { Toast.show('Sin datos para exportar', 'info'); return; }
      const header = 'Código,Nombre,Stock Actual,Stock Mínimo,Categoría\n';
      const rows = data.map(p => [p.codigo, p.nombre, p.stock_actual, p.stock_minimo, p.categoria?.nombre ?? ''].join(',')).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock-critico-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      Toast.show('CSV descargado', 'success');
    }).catch(() => Toast.show('Error al exportar', 'error'));
  }

  destroy() { this._layoutDestroy?.(); }
}
