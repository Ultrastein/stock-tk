// frontend/public/src/js/views/reservas.js
// Vista de gestión de reservas anticipadas.

import { renderLayout }    from './_layout.js';
import { DataTable }       from '../components/DataTable.js';
import { Modal }           from '../components/Modal.js';
import { Toast }           from '../components/Toast.js';
import { reservas as reservasApi, productos as productosApi, ubicaciones as ubicacionesApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR');
}

const ESTADO_CLS = {
  borrador:    'badge-default',
  confirmada:  'badge-blue',
  cumplida:    'badge-green',
  cancelada:   'badge-red',
  vencida:     'badge-yellow',
};

export default class ReservasView {
  constructor(container) {
    this.container      = container;
    this._dt            = null;
    this._layoutDestroy = null;
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    this._isAdmin = usuario?.rol === 'admin';

    const { mainContent, destroy } = renderLayout(this.container, { usuario, activeHash: '#/reservas' });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Reservas</h1>
        <button class="btn btn-primary" id="btn-nueva-reserva">+ Nueva reserva</button>
      </div>
      <div class="page-body">
        <div class="card" id="reservas-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container: mainContent.querySelector('#reservas-table'),
      emptyText: 'Sin reservas registradas',
      columns: [
        { key: 'codigo',        label: 'Código',      sortable: true,
          render: v => `<span style="font-family:monospace;font-size:var(--text-sm)">${esc(v)}</span>` },
        { key: 'fecha_reserva', label: 'Fecha',        sortable: true,
          render: v => fmtDate(v) },
        { key: 'hora_inicio',   label: 'Horario',      sortable: false,
          render: (v, row) => v ? `${esc(v)} – ${esc(row.hora_fin ?? '?')}` : '—' },
        { key: 'estado',        label: 'Estado',       sortable: true,
          render: v => `<span class="badge ${ESTADO_CLS[v] || 'badge-default'}">${esc(v ?? '')}</span>` },
        { key: 'items',         label: 'Ítems',        sortable: false,
          render: (_, row) => `${row.items?.length ?? 0}` },
        { key: '_actions',      label: '',
          render: (_, row) => `
            <button class="btn btn-sm btn-ghost"      data-id="ver-${row.id}">Ver</button>
            ${row.estado === 'borrador' ? `
              <button class="btn btn-sm btn-secondary" data-id="confirmar-${row.id}">Confirmar</button>
              <button class="btn btn-sm btn-danger"    data-id="cancelar-${row.id}">Cancelar</button>
            ` : row.estado === 'confirmada' ? `
              <button class="btn btn-sm btn-danger"    data-id="cancelar-${row.id}">Cancelar</button>
            ` : ''}
          ` },
      ],
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('ver-'))       this._verDetalle(row);
      if (id.startsWith('confirmar-')) this._confirmar(row);
      if (id.startsWith('cancelar-'))  this._cancelar(row);
    });

    mainContent.querySelector('#btn-nueva-reserva')
      ?.addEventListener('click', () => this._openNuevaReserva());

    await this._load();
  }

  async _load() {
    try {
      const res = await reservasApi.listar();
      this._dt.setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { Toast.show('Error al cargar reservas', 'error'); }
  }

  _verDetalle(reserva) {
    const rows = (reserva.items || []).map(i => `
      <tr>
        <td>${esc(i.producto?.nombre ?? i.kit?.nombre ?? i.activoFijo?.numero_serie ?? '—')}</td>
        <td>${i.cantidad ?? 1}</td>
      </tr>
    `).join('');
    const el = document.createElement('div');
    el.innerHTML = `
      <dl style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:var(--text-sm);margin-bottom:16px">
        <dt style="color:var(--text-secondary)">Fecha</dt><dd>${fmtDate(reserva.fecha_reserva)}</dd>
        ${reserva.hora_inicio ? `<dt style="color:var(--text-secondary)">Horario</dt><dd>${esc(reserva.hora_inicio)} – ${esc(reserva.hora_fin ?? '?')}</dd>` : ''}
        <dt style="color:var(--text-secondary)">Estado</dt>
        <dd><span class="badge ${ESTADO_CLS[reserva.estado] || 'badge-default'}">${esc(reserva.estado ?? '')}</span></dd>
        ${reserva.notas ? `<dt style="color:var(--text-secondary)">Notas</dt><dd>${esc(reserva.notas)}</dd>` : ''}
      </dl>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Ítem</th><th>Cantidad</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2" style="text-align:center;color:var(--text-muted);padding:16px">Sin ítems</td></tr>'}</tbody>
        </table>
      </div>
    `;
    const modal = new Modal({ title: `Reserva ${reserva.codigo}`, content: el, confirmText: 'Cerrar', cancelText: '', size: 'md' });
    modal.onConfirm(() => modal.hide());
    modal.onCancel(()  => modal.hide());
    modal.show();
  }

  async _confirmar(reserva) {
    const ok = await Modal.confirm({ title: 'Confirmar reserva', message: `¿Confirmar reserva ${reserva.codigo}?`, confirmText: 'Confirmar' });
    if (!ok) return;
    try {
      await reservasApi.confirmar(reserva.id);
      Toast.show('Reserva confirmada', 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _cancelar(reserva) {
    const ok = await Modal.confirm({ title: 'Cancelar reserva', message: `¿Cancelar reserva ${reserva.codigo}?`, confirmText: 'Sí, cancelar' });
    if (!ok) return;
    try {
      await reservasApi.cancelar(reserva.id);
      Toast.show('Reserva cancelada', 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _openNuevaReserva() {
    let productos = [], ubicaciones = [];
    try {
      const [pRes, uRes] = await Promise.all([productosApi.listar(), ubicacionesApi.listar()]);
      productos   = Array.isArray(pRes.data) ? pRes.data : [];
      ubicaciones = Array.isArray(uRes.data) ? uRes.data : [];
    } catch (e) { Toast.show('Error al cargar datos', 'error'); return; }

    const items = [];
    const formEl = document.createElement('div');
    formEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="form-group">
          <label class="form-label">Fecha *</label>
          <input class="form-control" id="res-fecha" type="date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Destino / Aula</label>
          <select class="form-control" id="res-ubicacion">
            <option value="">— Sin destino —</option>
            ${ubicaciones.map(u => `<option value="${u.id}">${esc(u.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Hora inicio</label>
          <input class="form-control" id="res-hora-ini" type="time">
        </div>
        <div class="form-group">
          <label class="form-label">Hora fin</label>
          <input class="form-control" id="res-hora-fin" type="time">
        </div>
      </div>
      <div class="form-group" style="margin-bottom:12px">
        <label class="form-label">Notas</label>
        <input class="form-control" id="res-notas" type="text" placeholder="Motivo, curso, etc.">
      </div>
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:8px">Ítems a reservar:</div>
      <div id="res-items-list" style="max-height:160px;overflow-y:auto;border:1px solid var(--border);
           border-radius:var(--radius);padding:8px;margin-bottom:12px">
        <p style="color:var(--text-muted);font-size:var(--text-sm);text-align:center;padding:8px">Sin ítems</p>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <div class="form-group" style="flex:3">
          <label class="form-label">Producto</label>
          <select class="form-control" id="res-prod">
            <option value="">— Seleccionar —</option>
            ${productos.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="width:80px">
          <label class="form-label">Cant.</label>
          <input class="form-control" id="res-qty" type="number" min="1" value="1">
        </div>
        <button class="btn btn-secondary" id="res-add">+ Agregar</button>
      </div>
    `;

    formEl.querySelector('#res-add').addEventListener('click', () => {
      const sel = formEl.querySelector('#res-prod');
      const id  = sel.value;
      const nom = sel.options[sel.selectedIndex]?.text ?? '';
      const qty = parseInt(formEl.querySelector('#res-qty').value) || 1;
      if (!id) { Toast.show('Seleccioná un producto', 'warning'); return; }
      items.push({ producto_id: id, cantidad: qty });
      const list = formEl.querySelector('#res-items-list');
      if (list.querySelector('p')) list.innerHTML = '';
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px';
      d.textContent = `${nom} × ${qty}`;
      list.appendChild(d);
    });

    const confirmed = await new Promise(resolve => {
      const modal = new Modal({ title: 'Nueva Reserva', content: formEl, confirmText: 'Crear reserva', size: 'lg' });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
    if (!confirmed) return;

    const fecha = formEl.querySelector('#res-fecha').value;
    if (!fecha) { Toast.show('La fecha es requerida', 'error'); return; }
    if (!items.length) { Toast.show('Agregá al menos un ítem', 'warning'); return; }

    try {
      await reservasApi.crear({
        fecha_reserva: fecha,
        hora_inicio:   formEl.querySelector('#res-hora-ini').value || null,
        hora_fin:      formEl.querySelector('#res-hora-fin').value || null,
        ubicacion_destino_id: formEl.querySelector('#res-ubicacion').value || null,
        notas:         formEl.querySelector('#res-notas').value || null,
        items,
      });
      Toast.show('Reserva creada exitosamente', 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() { this._layoutDestroy?.(); }
}
