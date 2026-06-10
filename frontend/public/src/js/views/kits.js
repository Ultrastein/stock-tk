// frontend/public/src/js/views/kits.js
// Vista de gestión de kits. Admin puede crear; kiosco puede ver.

import { renderLayout } from './_layout.js';
import { DataTable }    from '../components/DataTable.js';
import { Modal }        from '../components/Modal.js';
import { Toast }        from '../components/Toast.js';
import {
  kits      as kitsApi,
  productos as productosApi,
  activos   as activosApi,
} from '../api/endpoints.js';
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
    this.container      = container;
    this._dt            = null;
    this._isAdmin       = false;
    this._layoutDestroy = null;
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario  = getState('usuario');
    this._isAdmin  = usuario?.rol === 'admin';

    const { mainContent, destroy } = renderLayout(this.container, {
      usuario, activeHash: '#/kits',
    });
    this._layoutDestroy = destroy;

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
      container: mainContent.querySelector('#kits-table-container'),
      emptyText: 'Sin kits registrados',
      columns: [
        { key: 'codigo',      label: 'Código',      sortable: true },
        { key: 'nombre',      label: 'Nombre',      sortable: true },
        { key: 'estado',      label: 'Estado',      sortable: true,
          render: v => `<span class="badge ${ESTADO_CLS[v] || 'badge-default'}">${esc(v?.replace(/_/g,' ') ?? '')}</span>` },
        { key: 'componentes', label: 'Componentes', sortable: false,
          render: (_, row) => `<span style="color:var(--text-muted)">${row.componentes?.length ?? 0}</span>` },
        { key: '_actions',    label: '',
          render: (_, row) => `
            <button class="btn btn-sm btn-ghost" data-id="view-${row.id}" title="Ver componentes">
              🔍 Ver
            </button>
          ` },
      ],
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
      this._dt.setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { Toast.show('Error al cargar kits', 'error'); }
  }

  _showComponentes(kit) {
    const rows = (kit.componentes || []).map(c => `
      <tr>
        <td>${esc(c.producto?.nombre ?? '—')}</td>
        <td>
          <span class="badge ${c.producto?.tipo === 'retornable' ? 'badge-blue' : 'badge-green'}">
            ${esc(c.producto?.tipo ?? '')}
          </span>
        </td>
        <td>
          ${c.activoFijo
            ? `<span style="font-family:monospace;font-size:11px">${esc(c.activoFijo.numero_serie)}</span>`
            : '—'}
        </td>
        <td>${c.cantidad ?? 1}</td>
        <td>${c.es_obligatorio ? '✓' : '—'}</td>
      </tr>
    `).join('');

    const el = document.createElement('div');
    el.innerHTML = `
      <p style="color:var(--text-secondary);margin-bottom:12px;font-size:var(--text-sm)">
        Estado:
        <span class="badge ${ESTADO_CLS[kit.estado] || 'badge-default'}">
          ${esc(kit.estado?.replace(/_/g,' ') ?? '')}
        </span>
        &nbsp;|&nbsp; Código:
        <span style="font-family:monospace">${esc(kit.codigo)}</span>
      </p>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Producto</th><th>Tipo</th><th>N° Serie</th>
              <th>Cantidad</th><th>Obligatorio</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px">Sin componentes</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const modal = new Modal({
      title:       `Componentes: ${kit.nombre}`,
      content:     el,
      confirmText: 'Cerrar',
      cancelText:  '',
      size:        'lg',
    });
    modal.onConfirm(() => modal.hide());
    modal.onCancel(()  => modal.hide());
    modal.show();
  }

  async _openCrearKit() {
    let productosDisp = [], activosDisp = [];
    try {
      const [pRes, aRes] = await Promise.all([
        productosApi.listar(),
        activosApi.listar({ estado: 'disponible' }),
      ]);
      productosDisp = Array.isArray(pRes.data) ? pRes.data : [];
      activosDisp   = Array.isArray(aRes.data) ? aRes.data : [];
    } catch (e) {
      Toast.show('Error al cargar productos para el kit', 'error');
      return;
    }

    const componentes = [];
    const formEl = document.createElement('div');

    formEl.innerHTML = `
      <div class="form-group" style="margin-bottom:12px">
        <label class="form-label">Nombre del kit *</label>
        <input class="form-control" id="kit-nombre"
          placeholder="Ej: Kit de Robótica A1" required>
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Descripción</label>
        <textarea class="form-control" id="kit-desc" rows="2" maxlength="512"></textarea>
      </div>
      <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:8px">
        Componentes:
      </div>
      <div id="kit-comp-list"
        style="max-height:200px;overflow-y:auto;border:1px solid var(--border);
               border-radius:var(--radius);padding:8px;margin-bottom:12px">
        <p style="color:var(--text-muted);font-size:var(--text-sm);text-align:center;padding:8px">
          Sin componentes aún
        </p>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="flex:2">
          <label class="form-label">Producto</label>
          <select class="form-control" id="kit-comp-prod">
            <option value="">— Seleccionar —</option>
            ${productosDisp.map(p =>
              `<option value="${p.id}" data-tipo="${p.tipo}">${esc(p.nombre)} (${p.tipo})</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Activo (retornable)</label>
          <select class="form-control" id="kit-comp-activo" disabled>
            <option value="">— Sin activo —</option>
            ${activosDisp.map(a =>
              `<option value="${a.id}">${esc(a.numero_serie)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" style="width:70px">
          <label class="form-label">Cant.</label>
          <input class="form-control" id="kit-comp-qty" type="number" min="1" value="1">
        </div>
        <button class="btn btn-secondary" id="kit-add-comp" style="margin-bottom:1px">
          + Agregar
        </button>
      </div>
    `;

    // Habilitar activo si el producto es retornable
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
        title:       'Nuevo Kit',
        content:     formEl,
        confirmText: 'Crear kit',
        size:        'lg',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });

    if (!confirmed) return;

    const nombre = formEl.querySelector('#kit-nombre').value.trim();
    if (!nombre)           { Toast.show('El nombre es requerido', 'error'); return; }
    if (!componentes.length) { Toast.show('Agregá al menos un componente', 'warning'); return; }

    try {
      await kitsApi.crear({
        nombre,
        descripcion: formEl.querySelector('#kit-desc').value.trim() || null,
        componentes,
      });
      Toast.show('Kit creado exitosamente', 'success');
      await this._loadKits();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() {
    this._layoutDestroy?.();
  }
}
