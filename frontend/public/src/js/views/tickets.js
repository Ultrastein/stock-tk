// frontend/public/src/js/views/tickets.js
// Vista de tickets de mantenimiento. Solo admin.

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Modal }        from '../components/Modal.js';
import { Toast }        from '../components/Toast.js';
import { tickets as ticketsApi } from '../api/endpoints.js';
import { get as getState }       from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR');
}

const ESTADO_CLS = {
  pendiente:      'badge-yellow',
  en_reparacion:  'badge-blue',
  resuelto:       'badge-green',
  rechazado_baja: 'badge-red',
};

// Estado siguiente en el flujo (solo avance lineal)
const ESTADO_NEXT = {
  pendiente:     'en_reparacion',
  en_reparacion: 'resuelto',
};

const FILTERS = ['', 'pendiente', 'en_reparacion', 'resuelto', 'rechazado_baja'];

export default class TicketsView {
  constructor(container) {
    this.container      = container;
    this._dt            = null;
    this._filter        = '';
    this._layoutDestroy = null;
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, {
      usuario, activeHash: '#/tickets',
    });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Tickets de Mantenimiento</h1>
      </div>
      <div class="page-body">
        <div id="filter-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          ${FILTERS.map(e => `
            <button class="btn btn-sm ${e === '' ? 'btn-primary' : 'btn-secondary'}"
              data-filter="${e}">
              ${e === '' ? 'Todos' : e.replace(/_/g,' ')}
            </button>
          `).join('')}
        </div>
        <div class="card" id="tickets-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container: mainContent.querySelector('#tickets-table'),
      emptyText: 'Sin tickets',
      columns: [
        { key: 'codigo',      label: 'Código',     sortable: true },
        { key: 'estado',      label: 'Estado',     sortable: true,
          render: v => `<span class="badge ${ESTADO_CLS[v] || 'badge-default'}">${esc(v?.replace(/_/g,' ') ?? '')}</span>` },
        { key: 'diagnostico', label: 'Diagnóstico', sortable: false,
          render: v => {
            const s = String(v ?? '');
            return `<span style="color:var(--text-secondary);font-size:var(--text-sm)">${esc(s.slice(0,60))}${s.length > 60 ? '…' : ''}</span>`;
          }},
        { key: 'created_at',  label: 'Fecha',      sortable: true,
          render: v => fmtDate(v) },
        { key: '_actions',    label: '',
          render: (_, row) => {
            const next = ESTADO_NEXT[row.estado];
            return next
              ? `<button class="btn btn-sm btn-secondary" data-id="avanzar-${row.id}"
                  title="Avanzar a ${next.replace(/_/g,' ')}">
                  Avanzar →
                </button>`
              : `<button class="btn btn-sm btn-ghost" data-id="ver-${row.id}"
                  title="Ver detalle">
                  Ver
                </button>`;
          }},
      ],
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('avanzar-')) this._avanzarEstado(row);
      if (id.startsWith('ver-'))     this._verDetalle(row);
    });

    // Filtros de estado
    mainContent.querySelector('#filter-bar').addEventListener('click', e => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      this._filter = btn.dataset.filter;
      mainContent.querySelectorAll('#filter-bar [data-filter]').forEach(b => {
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
      this._dt.setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { Toast.show('Error al cargar tickets', 'error'); }
  }

  async _avanzarEstado(ticket) {
    const next = ESTADO_NEXT[ticket.estado];
    if (!next) return;

    const ok = await Modal.confirm({
      title:       'Avanzar estado',
      message:     `¿Cambiar "${ticket.codigo}" de "${ticket.estado.replace(/_/g,' ')}" a "${next.replace(/_/g,' ')}"?`,
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
        <dd style="font-family:monospace">${esc(ticket.codigo)}</dd>
        <dt style="color:var(--text-secondary)">Estado</dt>
        <dd>
          <span class="badge ${ESTADO_CLS[ticket.estado] || 'badge-default'}">
            ${esc(ticket.estado?.replace(/_/g,' ') ?? '')}
          </span>
        </dd>
        <dt style="color:var(--text-secondary)">Diagnóstico</dt>
        <dd>${esc(ticket.diagnostico ?? '—')}</dd>
        <dt style="color:var(--text-secondary)">Notas técnico</dt>
        <dd>${esc(ticket.notas_tecnico ?? '—')}</dd>
        <dt style="color:var(--text-secondary)">Creado</dt>
        <dd>${new Date(ticket.created_at).toLocaleString('es-AR')}</dd>
      </dl>
    `;

    const modal = new Modal({
      title:       `Ticket ${ticket.codigo}`,
      content:     el,
      confirmText: 'Cerrar',
      cancelText:  '',
      size:        'sm',
    });
    modal.onConfirm(() => modal.hide());
    modal.onCancel(()  => modal.hide());
    modal.show();
  }

  destroy() {
    this._layoutDestroy?.();
  }
}
