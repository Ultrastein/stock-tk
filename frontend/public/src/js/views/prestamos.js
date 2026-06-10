// frontend/public/src/js/views/prestamos.js
// Vista de préstamos activos: despachos de salida con ítems pendientes de devolución.
// Permite ver quién tiene qué, hace cuánto tiempo y si está vencido.

import { renderLayout }    from './_layout.js';
import { DataTable }       from '../components/DataTable.js';
import { Modal }           from '../components/Modal.js';
import { Toast }           from '../components/Toast.js';
import { reportes as reportesApi, despachos as despachosApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

export default class PrestamosView {
  constructor(container) {
    this.container      = container;
    this._dt            = null;
    this._layoutDestroy = null;
    this._data          = [];
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, { usuario, activeHash: '#/prestamos' });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Préstamos Activos</h1>
        <span id="prestamos-badge" style="background:var(--danger-bg);color:var(--danger);
          padding:4px 12px;border-radius:var(--radius);font-size:var(--text-sm);font-weight:600">
          Cargando…
        </span>
      </div>
      <div class="page-body">
        <div class="card" id="prestamos-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container: mainContent.querySelector('#prestamos-table'),
      emptyText: '🎉 No hay préstamos activos',
      columns: [
        { key: 'codigo',       label: 'Despacho',    sortable: true,
          render: v => `<span style="font-family:monospace;font-size:var(--text-sm)">${esc(v)}</span>` },
        { key: 'solicitante',  label: 'Solicitante', sortable: false,
          render: (_, row) => esc(row.solicitante?.nombre ?? '—') },
        { key: 'ubicacionDestino', label: 'Destino', sortable: false,
          render: (_, row) => esc(row.ubicacionDestino?.nombre ?? '—') },
        { key: 'fecha_despacho', label: 'Desde',     sortable: true,
          render: v => fmtDate(v) },
        { key: 'fecha_devolucion_esperada', label: 'Vence',   sortable: true,
          render: v => v ? fmtDate(v) : '—' },
        { key: 'vencido',      label: 'Estado',      sortable: false,
          render: (_, row) => {
            if (row.vencido) return `<span class="badge badge-red">⚠ Vencido +${row.dias_demora}d</span>`;
            if (row.fecha_devolucion_esperada) return `<span class="badge badge-green">En plazo</span>`;
            return `<span class="badge badge-default">Sin fecha</span>`;
          }},
        { key: 'items',        label: 'Ítems',       sortable: false,
          render: (_, row) => `<span style="color:var(--text-secondary)">${row.items?.length ?? 0} ítem(s)</span>` },
        { key: '_actions',     label: '',
          render: (_, row) => `
            <button class="btn btn-sm btn-ghost" data-id="ver-${row.id}">Ver detalle</button>
            <button class="btn btn-sm btn-secondary" data-id="checkin-${row.id}">↩ Recibir</button>
          ` },
      ],
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('ver-'))     this._verDetalle(row);
      if (id.startsWith('checkin-')) this._iniciarCheckin(row);
    });

    await this._load(mainContent);
  }

  async _load(mainContent) {
    try {
      const res = await reportesApi.prestamosActivos();
      this._data = Array.isArray(res.data) ? res.data : [];
      this._dt.setData(this._data);

      const vencidos = this._data.filter(d => d.vencido).length;
      const badge = mainContent.querySelector('#prestamos-badge');
      if (badge) {
        badge.textContent = `${this._data.length} activo(s)${vencidos ? ` · ${vencidos} vencido(s)` : ''}`;
        badge.style.background = vencidos ? 'var(--danger-bg)' : 'var(--success-bg)';
        badge.style.color      = vencidos ? 'var(--danger)' : 'var(--success)';
      }
    } catch (e) { Toast.show('Error al cargar préstamos', 'error'); }
  }

  _verDetalle(despacho) {
    const rows = (despacho.items || []).map(i => `
      <tr>
        <td>${esc(i.producto?.nombre ?? '—')}</td>
        <td>
          ${i.activoFijo
            ? `<span style="font-family:monospace;font-size:11px">${esc(i.activoFijo.numero_serie)}</span>`
            : `<span style="color:var(--text-muted)">${i.cantidad_despachada ?? 1} unid.</span>`}
        </td>
        <td>
          <span class="badge ${i.producto?.tipo === 'retornable' ? 'badge-blue' : 'badge-green'}">
            ${esc(i.producto?.tipo ?? '')}
          </span>
        </td>
      </tr>
    `).join('');

    const el = document.createElement('div');
    el.innerHTML = `
      <dl style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:var(--text-sm);margin-bottom:16px">
        <dt style="color:var(--text-secondary)">Solicitante</dt>
        <dd>${esc(despacho.solicitante?.nombre ?? '—')}</dd>
        <dt style="color:var(--text-secondary)">Destino</dt>
        <dd>${esc(despacho.ubicacionDestino?.nombre ?? '—')}</dd>
        <dt style="color:var(--text-secondary)">Fecha salida</dt>
        <dd>${fmtDate(despacho.fecha_despacho)}</dd>
        ${despacho.fecha_devolucion_esperada ? `
        <dt style="color:var(--text-secondary)">Devolución esperada</dt>
        <dd style="color:${despacho.vencido ? 'var(--danger)' : 'var(--text-primary)'}">
          ${fmtDate(despacho.fecha_devolucion_esperada)}
          ${despacho.vencido ? `<span class="badge badge-red" style="margin-left:8px">+${despacho.dias_demora} días</span>` : ''}
        </dd>` : ''}
        ${despacho.notas ? `<dt style="color:var(--text-secondary)">Notas</dt><dd>${esc(despacho.notas)}</dd>` : ''}
      </dl>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Producto</th><th>Serie / Cant.</th><th>Tipo</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:16px">Sin ítems</td></tr>'}</tbody>
        </table>
      </div>
    `;

    const modal = new Modal({ title: `Despacho ${despacho.codigo}`, content: el, confirmText: 'Cerrar', cancelText: '', size: 'lg' });
    modal.onConfirm(() => modal.hide());
    modal.onCancel(()  => modal.hide());
    modal.show();
  }

  async _iniciarCheckin(despacho) {
    // Armar formulario de devolución ítem por ítem
    const items = despacho.items || [];
    if (!items.length) { Toast.show('Sin ítems para devolver', 'warning'); return; }

    const formEl = document.createElement('div');
    formEl.style.cssText = 'display:flex;flex-direction:column;gap:12px';

    items.forEach((item, idx) => {
      const esRetornable = !!item.activoFijo;
      const div = document.createElement('div');
      div.style.cssText = 'padding:12px;background:var(--bg-elevated);border-radius:var(--radius);border:1px solid var(--border)';
      div.innerHTML = `
        <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:8px">
          ${esc(item.producto?.nombre ?? '—')}
          ${item.activoFijo ? `<span style="font-family:monospace;font-size:11px;color:var(--text-muted)"> · ${esc(item.activoFijo.numero_serie)}</span>` : ''}
        </div>
        ${esRetornable ? `
          <div class="form-group">
            <label class="form-label">Estado de devolución</label>
            <select class="form-control" data-idx="${idx}" data-field="estado">
              <option value="funcional">Funcional ✓</option>
              <option value="dañado">Dañado ✗</option>
              <option value="requiere_reparacion">Requiere reparación ⚠</option>
            </select>
          </div>
        ` : `
          <div class="form-group">
            <label class="form-label">Cantidad devuelta (de ${item.cantidad_despachada} despachadas)</label>
            <input class="form-control" type="number" data-idx="${idx}" data-field="cantidad"
              min="0" max="${item.cantidad_despachada}" value="${item.cantidad_despachada}" style="width:120px">
          </div>
        `}
        <div class="form-group" style="margin-top:8px">
          <label class="form-label">Notas</label>
          <input class="form-control" type="text" data-idx="${idx}" data-field="notas" placeholder="Opcional…">
        </div>
      `;
      formEl.appendChild(div);
    });

    const confirmed = await new Promise(resolve => {
      const modal = new Modal({ title: 'Recibir devolución', content: formEl, confirmText: 'Confirmar devolución', size: 'lg' });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
    if (!confirmed) return;

    const items_devueltos = items.map((item, idx) => {
      const estadoEl   = formEl.querySelector(`[data-idx="${idx}"][data-field="estado"]`);
      const cantidadEl = formEl.querySelector(`[data-idx="${idx}"][data-field="cantidad"]`);
      const notasEl    = formEl.querySelector(`[data-idx="${idx}"][data-field="notas"]`);
      return {
        despacho_item_id:  item.id,
        estado:            estadoEl?.value   || 'funcional',
        cantidad_devuelta: cantidadEl ? parseInt(cantidadEl.value) || 0 : 1,
        notas:             notasEl?.value || null,
      };
    });

    try {
      const res = await despachosApi.checkin(despacho.id, { items_devueltos });
      const info = res.data || res;
      let msg = `Devolución registrada: ${info.codigo}`;
      if (res.tickets_creados?.length) msg += `. Tickets creados: ${res.tickets_creados.join(', ')}`;
      Toast.show(msg, 'success');
      await this._load(document.querySelector('#layout-main-content') || this.container);
    } catch (e) { Toast.show(e.message || 'Error al registrar devolución', 'error'); }
  }

  destroy() { this._layoutDestroy?.(); }
}
