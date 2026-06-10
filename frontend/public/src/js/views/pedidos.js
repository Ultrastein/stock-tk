// frontend/public/src/js/views/pedidos.js
// Vista de pedidos de reposición. Roles: admin, docente.

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Modal }        from '../components/Modal.js';
import { Toast }        from '../components/Toast.js';
import {
  pedidos  as pedidosApi,
  productos as productosApi,
} from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR');
}

const ESTADO_CLS = {
  borrador:             'badge-default',
  pendiente_aprobacion: 'badge-yellow',
  aprobado:             'badge-blue',
  comprado:             'badge-green',
  en_camino:            'badge-blue',
  recibido:             'badge-green',
  rechazado:            'badge-red',
};

// Flujo de estados según rol
const ESTADO_NEXT_ADMIN   = {
  borrador:             'pendiente_aprobacion',
  pendiente_aprobacion: 'aprobado',
  aprobado:             'comprado',
  comprado:             'en_camino',
  en_camino:            'recibido',
};
const ESTADO_NEXT_DOCENTE = {
  borrador: 'pendiente_aprobacion',
};

export default class PedidosView {
  constructor(container) {
    this.container      = container;
    this._dt            = null;
    this._isAdmin       = false;
    this._layoutDestroy = null;
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    this._isAdmin = usuario?.rol === 'admin';

    const { mainContent, destroy } = renderLayout(this.container, {
      usuario, activeHash: '#/pedidos',
    });
    this._layoutDestroy = destroy;

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
      container: mainContent.querySelector('#pedidos-table'),
      emptyText: 'Sin pedidos registrados',
      columns: [
        { key: 'codigo',     label: 'Código',  sortable: true },
        { key: 'estado',     label: 'Estado',  sortable: true,
          render: v => `<span class="badge ${ESTADO_CLS[v] || 'badge-default'}">${esc(v?.replace(/_/g,' ') ?? '')}</span>` },
        { key: 'items',      label: 'Ítems',   sortable: false,
          render: (_, row) => `${row.items?.length ?? 0} ítem${(row.items?.length ?? 0) !== 1 ? 's' : ''}` },
        { key: 'created_at', label: 'Fecha',   sortable: true,
          render: v => fmtDate(v) },
        { key: '_actions',   label: '',
          render: (_, row) => {
            const nextMap  = this._isAdmin ? ESTADO_NEXT_ADMIN : ESTADO_NEXT_DOCENTE;
            const next     = nextMap[row.estado];
            return `
              <button class="btn btn-sm btn-ghost" data-id="ver-${row.id}" title="Ver detalle">
                Ver
              </button>
              ${next
                ? `<button class="btn btn-sm btn-secondary" data-id="avanzar-${row.id}"
                    title="Avanzar a ${next.replace(/_/g,' ')}">
                    Avanzar →
                  </button>`
                : ''}
            `;
          }},
      ],
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
      this._dt.setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { Toast.show('Error al cargar pedidos', 'error'); }
  }

  async _avanzarEstado(pedido) {
    const nextMap = this._isAdmin ? ESTADO_NEXT_ADMIN : ESTADO_NEXT_DOCENTE;
    const next    = nextMap[pedido.estado];
    if (!next) return;

    const ok = await Modal.confirm({
      title:       'Avanzar estado',
      message:     `¿Cambiar pedido "${pedido.codigo}" a "${next.replace(/_/g,' ')}"?`,
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
        <td>${i.cantidad_solicitada ?? '—'}</td>
        <td>${i.cantidad_recibida  ?? '—'}</td>
        <td style="font-size:11px;color:var(--text-muted)">${esc(i.notas ?? '')}</td>
      </tr>
    `).join('') || `
      <tr>
        <td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px">
          Sin ítems
        </td>
      </tr>
    `;

    const el = document.createElement('div');
    el.innerHTML = `
      <dl style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;
                 font-size:var(--text-sm);margin-bottom:16px">
        <dt style="color:var(--text-secondary)">Código</dt>
        <dd style="font-family:monospace">${esc(pedido.codigo)}</dd>
        <dt style="color:var(--text-secondary)">Estado</dt>
        <dd>
          <span class="badge ${ESTADO_CLS[pedido.estado] || 'badge-default'}">
            ${esc(pedido.estado?.replace(/_/g,' ') ?? '')}
          </span>
        </dd>
        <dt style="color:var(--text-secondary)">Justificación</dt>
        <dd>${esc(pedido.justificacion ?? '—')}</dd>
        <dt style="color:var(--text-secondary)">Fecha</dt>
        <dd>${fmtDate(pedido.created_at)}</dd>
      </dl>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Producto</th><th>Solicitado</th><th>Recibido</th><th>Notas</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </div>
    `;

    const modal = new Modal({
      title:       `Pedido ${pedido.codigo}`,
      content:     el,
      confirmText: 'Cerrar',
      cancelText:  '',
      size:        'lg',
    });
    modal.onConfirm(() => modal.hide());
    modal.onCancel(()  => modal.hide());
    modal.show();
  }

  async _openCrearPedido() {
    let productos = [];
    try {
      const res = await productosApi.listar();
      productos = Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      Toast.show('Error al cargar productos', 'error');
      return;
    }

    const items  = [];
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
      <div id="ped-items-list"
        style="max-height:180px;overflow-y:auto;border:1px solid var(--border);
               border-radius:var(--radius);padding:8px;margin-bottom:12px">
        <p style="color:var(--text-muted);font-size:var(--text-sm);text-align:center;padding:8px">
          Sin ítems aún
        </p>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="flex:3">
          <label class="form-label">Producto</label>
          <select class="form-control" id="ped-prod">
            <option value="">— Seleccionar —</option>
            ${productos.map(p =>
              `<option value="${p.id}">${esc(p.nombre)}</option>`
            ).join('')}
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
      const modal = new Modal({
        title:       'Nuevo Pedido',
        content:     formEl,
        confirmText: 'Crear pedido',
        size:        'md',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });

    if (!confirmed) return;

    const just = formEl.querySelector('#ped-just').value.trim();
    if (!just)        { Toast.show('La justificación es requerida', 'error'); return; }
    if (!items.length){ Toast.show('Agregá al menos un ítem', 'warning'); return; }

    try {
      await pedidosApi.crear({ justificacion: just, items });
      Toast.show('Pedido creado exitosamente', 'success');
      await this._loadPedidos();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() {
    this._layoutDestroy?.();
  }
}
