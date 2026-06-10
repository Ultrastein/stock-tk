// frontend/public/src/js/views/proveedores.js
// Directorio de proveedores con CRUD completo.

import { renderLayout }    from './_layout.js';
import { DataTable }       from '../components/DataTable.js';
import { Modal }           from '../components/Modal.js';
import { Toast }           from '../components/Toast.js';
import { proveedores as proveedoresApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export default class ProveedoresView {
  constructor(container) {
    this.container      = container;
    this._dt            = null;
    this._layoutDestroy = null;
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, { usuario, activeHash: '#/proveedores' });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Proveedores</h1>
        <button class="btn btn-primary" id="btn-nuevo-prov">+ Nuevo proveedor</button>
      </div>
      <div class="page-body">
        <div class="card" id="prov-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container: mainContent.querySelector('#prov-table'),
      emptyText: 'Sin proveedores registrados',
      columns: [
        { key: 'nombre',          label: 'Nombre',      sortable: true },
        { key: 'rubro',           label: 'Rubro',       sortable: true,
          render: v => v ? `<span class="badge badge-default">${esc(v)}</span>` : '—' },
        { key: 'cuit',            label: 'CUIT',        sortable: false,
          render: v => v ? `<span style="font-family:monospace;font-size:var(--text-sm)">${esc(v)}</span>` : '—' },
        { key: 'contacto_nombre', label: 'Contacto',    sortable: false,
          render: (v, row) => v ? `${esc(v)} · ${esc(row.contacto_telefono ?? '')}` : '—' },
        { key: 'contacto_email',  label: 'Email',       sortable: false,
          render: v => v ? `<a href="mailto:${esc(v)}" style="color:var(--accent-text)">${esc(v)}</a>` : '—' },
        { key: 'activo',          label: 'Estado',      sortable: true,
          render: v => v ? `<span class="badge badge-green">Activo</span>` : `<span class="badge badge-red">Inactivo</span>` },
        { key: '_actions',        label: '',
          render: (_, row) => `
            <button class="btn btn-sm btn-ghost" data-id="edit-${row.id}">✏ Editar</button>
            <button class="btn btn-sm btn-danger" data-id="del-${row.id}">🗑</button>
          ` },
      ],
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('edit-')) this._openForm(row);
      if (id.startsWith('del-'))  this._eliminar(row);
    });

    mainContent.querySelector('#btn-nuevo-prov')?.addEventListener('click', () => this._openForm());

    await this._load();
  }

  async _load() {
    try {
      const res = await proveedoresApi.listar();
      this._dt.setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { Toast.show('Error al cargar proveedores', 'error'); }
  }

  _buildForm(data = {}) {
    const el = document.createElement('div');
    el.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px';
    el.innerHTML = `
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Nombre *</label>
        <input class="form-control" id="pv-nombre" value="${esc(data.nombre ?? '')}" required>
      </div>
      <div class="form-group">
        <label class="form-label">CUIT</label>
        <input class="form-control" id="pv-cuit" value="${esc(data.cuit ?? '')}" placeholder="20-12345678-9">
      </div>
      <div class="form-group">
        <label class="form-label">Rubro</label>
        <input class="form-control" id="pv-rubro" value="${esc(data.rubro ?? '')}" placeholder="Electrónica, Papelería…">
      </div>
      <div class="form-group">
        <label class="form-label">Contacto nombre</label>
        <input class="form-control" id="pv-cnombre" value="${esc(data.contacto_nombre ?? '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Teléfono</label>
        <input class="form-control" id="pv-tel" value="${esc(data.contacto_telefono ?? '')}" placeholder="+54 11 …">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Email de contacto</label>
        <input class="form-control" id="pv-email" type="email" value="${esc(data.contacto_email ?? '')}">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Sitio web</label>
        <input class="form-control" id="pv-web" value="${esc(data.sitio_web ?? '')}" placeholder="https://…">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Notas</label>
        <textarea class="form-control" id="pv-notas" rows="2">${esc(data.notas ?? '')}</textarea>
      </div>
    `;
    return el;
  }

  async _openForm(data = null) {
    const formEl = this._buildForm(data || {});
    const confirmed = await new Promise(resolve => {
      const modal = new Modal({
        title:       data ? `Editar: ${data.nombre}` : 'Nuevo Proveedor',
        content:     formEl,
        confirmText: data ? 'Guardar cambios' : 'Crear proveedor',
        size:        'md',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
    if (!confirmed) return;

    const nombre = formEl.querySelector('#pv-nombre').value.trim();
    if (!nombre) { Toast.show('El nombre es requerido', 'error'); return; }

    const payload = {
      nombre,
      cuit:               formEl.querySelector('#pv-cuit').value.trim()    || null,
      rubro:              formEl.querySelector('#pv-rubro').value.trim()   || null,
      contacto_nombre:    formEl.querySelector('#pv-cnombre').value.trim() || null,
      contacto_telefono:  formEl.querySelector('#pv-tel').value.trim()    || null,
      contacto_email:     formEl.querySelector('#pv-email').value.trim()  || null,
      sitio_web:          formEl.querySelector('#pv-web').value.trim()    || null,
      notas:              formEl.querySelector('#pv-notas').value.trim()  || null,
    };

    try {
      if (data) {
        await proveedoresApi.actualizar(data.id, payload);
        Toast.show('Proveedor actualizado', 'success');
      } else {
        await proveedoresApi.crear(payload);
        Toast.show('Proveedor creado', 'success');
      }
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _eliminar(item) {
    const ok = await Modal.confirm({ title: 'Eliminar proveedor', message: `¿Eliminar "${item.nombre}"?`, confirmText: 'Eliminar' });
    if (!ok) return;
    try {
      await proveedoresApi.eliminar(item.id);
      Toast.show('Proveedor eliminado', 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() { this._layoutDestroy?.(); }
}
