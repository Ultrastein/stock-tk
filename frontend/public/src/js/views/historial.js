// frontend/public/src/js/views/historial.js
// Vista de historial de movimientos — solo lectura, solo admin.

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Toast }        from '../components/Toast.js';
import { historial as historialApi } from '../api/endpoints.js';
import { get as getState }           from '../store/state.js';

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
  checkout:         'badge-blue',
  checkin:          'badge-green',
  merma:            'badge-red',
  ajuste_stock:     'badge-yellow',
  creacion:         'badge-default',
  modificacion:     'badge-default',
  baja:             'badge-red',
  reparacion:       'badge-yellow',
  recepcion_compra: 'badge-green',
  reserva:          'badge-blue',
  cancelacion:      'badge-red',
};

const ACCIONES  = ['checkout','checkin','merma','ajuste_stock','creacion','modificacion','baja','reparacion','recepcion_compra','reserva','cancelacion'];
const ENTIDADES = ['Kit','ActivoFijo','Producto','Despacho','TicketMantenimiento'];

export default class HistorialView {
  constructor(container) {
    this.container      = container;
    this._dt            = null;
    this._offset        = 0;
    this._total         = 0;
    this._limit         = 50;
    this._filters       = { accion: '', entidad_tipo: '', desde: '', hasta: '' };
    this._layoutDestroy = null;
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, {
      usuario, activeHash: '#/historial',
    });
    this._layoutDestroy = destroy;

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
                ${ACCIONES.map(a => `<option value="${a}">${a.replace(/_/g,' ')}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Entidad</label>
              <select class="form-control" id="f-entidad" style="width:160px">
                <option value="">Todas</option>
                ${ENTIDADES.map(e => `<option value="${e}">${e}</option>`).join('')}
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

        <!-- Paginado info + botones -->
        <div style="display:flex;align-items:center;justify-content:space-between;
                    font-size:var(--text-sm);color:var(--text-secondary)">
          <span id="hist-count">Cargando…</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-ghost" id="btn-prev" disabled>‹ Anterior</button>
            <button class="btn btn-sm btn-ghost" id="btn-next" disabled>Siguiente ›</button>
          </div>
        </div>

        <div class="card" id="hist-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container:   mainContent.querySelector('#hist-table'),
      emptyText:   'Sin registros para los filtros seleccionados',
      searchable:  false,
      pageSize:    50,
      columns: [
        { key: 'accion',      label: 'Acción',  sortable: false,
          render: v => `<span class="badge ${ACCION_CLS[v] || 'badge-default'}" style="font-size:11px">${esc(v?.replace(/_/g,' ') ?? '')}</span>` },
        { key: 'entidad_tipo',label: 'Entidad', sortable: false },
        { key: 'entidad_id',  label: 'ID',      sortable: false,
          render: v => `<span style="font-family:monospace;font-size:11px;color:var(--text-muted)">${esc((v ?? '').slice(0,8))}…</span>` },
        { key: 'cantidad',    label: 'Cant.',   sortable: false,
          render: v => v != null ? v : '—' },
        { key: 'numero_serie',label: 'N° Serie', sortable: false,
          render: v => v ? `<span style="font-family:monospace;font-size:11px">${esc(v)}</span>` : '—' },
        { key: 'created_at',  label: 'Fecha',   sortable: false,
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
      this._filters = { accion: '', entidad_tipo: '', desde: '', hasta: '' };
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
        ...Object.fromEntries(
          Object.entries(this._filters).filter(([, v]) => v)
        ),
      };
      const res   = await historialApi.listar(params);
      const data  = Array.isArray(res.data) ? res.data : [];
      this._total = res.total ?? data.length;

      this._dt.setData(data);

      const countEl = mainContent.querySelector('#hist-count');
      if (countEl) {
        if (data.length === 0) {
          countEl.textContent = 'Sin registros';
        } else {
          const from = this._offset + 1;
          const to   = this._offset + data.length;
          countEl.textContent = `Mostrando ${from}–${to} de ${this._total} registros`;
        }
      }

      const prevBtn = mainContent.querySelector('#btn-prev');
      const nextBtn = mainContent.querySelector('#btn-next');
      if (prevBtn) prevBtn.disabled = this._offset === 0;
      if (nextBtn) nextBtn.disabled = this._offset + data.length >= this._total;

    } catch (e) { Toast.show('Error al cargar historial', 'error'); }
  }

  destroy() {
    this._layoutDestroy?.();
  }
}
