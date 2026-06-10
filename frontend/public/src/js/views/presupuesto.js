// frontend/public/src/js/views/presupuesto.js
// Control de presupuesto anual/mensual por categoría.

import { renderLayout }    from './_layout.js';
import { DataTable }       from '../components/DataTable.js';
import { Modal }           from '../components/Modal.js';
import { Toast }           from '../components/Toast.js';
import { presupuesto as presupuestoApi, categorias as categoriasApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt$(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
}
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default class PresupuestoView {
  constructor(container) {
    this.container      = container;
    this._dt            = null;
    this._layoutDestroy = null;
    this._anio          = new Date().getFullYear();
    this._categorias    = [];
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, { usuario, activeHash: '#/presupuesto' });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Presupuesto</h1>
        <div style="display:flex;gap:8px;align-items:center">
          <select class="form-control" id="pres-anio" style="width:120px">
            ${[this._anio - 1, this._anio, this._anio + 1].map(a =>
              `<option value="${a}" ${a === this._anio ? 'selected' : ''}>${a}</option>`
            ).join('')}
          </select>
          <button class="btn btn-primary" id="btn-nuevo-pres">+ Nueva partida</button>
        </div>
      </div>
      <div class="page-body">
        <div id="pres-totales" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px"></div>
        <div class="card" id="pres-table"></div>
      </div>
    `;

    // Selector de año
    mainContent.querySelector('#pres-anio').addEventListener('change', e => {
      this._anio = parseInt(e.target.value);
      this._load();
    });

    // Cargar categorías para el formulario
    try {
      const r = await categoriasApi.listar();
      this._categorias = Array.isArray(r.data) ? r.data : [];
    } catch (_) {}

    this._dt = new DataTable({
      container: mainContent.querySelector('#pres-table'),
      emptyText: 'Sin partidas presupuestarias',
      columns: [
        { key: 'descripcion', label: 'Descripción', sortable: true },
        { key: 'categoria',   label: 'Categoría',   sortable: false,
          render: (_, row) => row.categoria?.nombre
            ? `<span class="badge badge-default">${esc(row.categoria.nombre)}</span>` : '—' },
        { key: 'mes',         label: 'Período',      sortable: true,
          render: (v) => v ? MESES[(v - 1)] : 'Anual' },
        { key: 'monto_asignado', label: 'Asignado',  sortable: true,
          render: v => `<span style="font-weight:600">${fmt$(v)}</span>` },
        { key: 'monto_ejecutado', label: 'Ejecutado', sortable: true,
          render: (v, row) => {
            const pct = row.monto_asignado > 0 ? Math.round((v / row.monto_asignado) * 100) : 0;
            const color = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--success)';
            return `<span style="color:${color};font-weight:600">${fmt$(v)}</span>
                    <span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:4px">${pct}%</span>`;
          } },
        { key: '_actions', label: '',
          render: (_, row) => `
            <button class="btn btn-sm btn-secondary" data-id="gasto-${row.id}" title="Registrar gasto">+ Gasto</button>
            <button class="btn btn-sm btn-ghost"     data-id="edit-${row.id}">✏</button>
            <button class="btn btn-sm btn-danger"    data-id="del-${row.id}">🗑</button>
          ` },
      ],
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('gasto-'))  this._registrarGasto(row);
      if (id.startsWith('edit-'))   this._openForm(row);
      if (id.startsWith('del-'))    this._eliminar(row);
    });

    mainContent.querySelector('#btn-nuevo-pres')?.addEventListener('click', () => this._openForm());

    await this._load();
  }

  async _load() {
    try {
      const res = await presupuestoApi.listar({ anio: this._anio });
      const data = Array.isArray(res.data) ? res.data : [];
      this._dt.setData(data);
      this._renderTotales(data);
    } catch (e) { Toast.show('Error al cargar presupuesto', 'error'); }
  }

  _renderTotales(data) {
    const totalesEl = this.container.querySelector('#pres-totales');
    if (!totalesEl) return;
    const asignado  = data.reduce((s, r) => s + (parseFloat(r.monto_asignado)  || 0), 0);
    const ejecutado = data.reduce((s, r) => s + (parseFloat(r.monto_ejecutado) || 0), 0);
    const restante  = asignado - ejecutado;
    const pct = asignado > 0 ? Math.round((ejecutado / asignado) * 100) : 0;

    totalesEl.innerHTML = [
      { label: 'Total asignado',  value: fmt$(asignado),  color: 'var(--info)' },
      { label: 'Total ejecutado', value: fmt$(ejecutado), color: pct > 90 ? 'var(--danger)' : 'var(--warning)' },
      { label: 'Disponible',      value: fmt$(restante),  color: restante < 0 ? 'var(--danger)' : 'var(--success)' },
    ].map(({ label, value, color }) => `
      <div class="card stat-card" style="border-left:4px solid ${color}">
        <div style="font-size:var(--text-sm);color:var(--text-secondary);font-weight:500;margin-bottom:4px">${esc(label)}</div>
        <div style="font-size:1.6rem;font-weight:700;color:${color}">${esc(value)}</div>
        ${label === 'Total ejecutado' ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">${pct}% del presupuesto</div>` : ''}
      </div>
    `).join('');
  }

  _buildForm(data = {}) {
    const mesesOpts = MESES.map((m, i) =>
      `<option value="${i + 1}" ${data.mes == (i + 1) ? 'selected' : ''}>${m}</option>`
    ).join('');
    const catOpts = this._categorias.map(c =>
      `<option value="${c.id}" ${data.categoria_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`
    ).join('');

    const el = document.createElement('div');
    el.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px';
    el.innerHTML = `
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Descripción *</label>
        <input class="form-control" id="pr-desc" value="${esc(data.descripcion ?? '')}" required placeholder="Ej: Compra equipos TIC Q2">
      </div>
      <div class="form-group">
        <label class="form-label">Año</label>
        <input class="form-control" id="pr-anio" type="number" value="${data.anio ?? this._anio}" min="2020" max="2099">
      </div>
      <div class="form-group">
        <label class="form-label">Mes (opcional)</label>
        <select class="form-control" id="pr-mes">
          <option value="">— Anual —</option>
          ${mesesOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoría (opcional)</label>
        <select class="form-control" id="pr-cat">
          <option value="">— Sin categoría —</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Monto asignado *</label>
        <input class="form-control" id="pr-monto" type="number" min="0" step="0.01"
          value="${data.monto_asignado ?? ''}" placeholder="0.00">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Notas</label>
        <textarea class="form-control" id="pr-notas" rows="2">${esc(data.notas ?? '')}</textarea>
      </div>
    `;
    return el;
  }

  async _openForm(data = null) {
    const formEl = this._buildForm(data || {});
    const confirmed = await new Promise(resolve => {
      const modal = new Modal({
        title:       data ? 'Editar partida' : 'Nueva partida presupuestaria',
        content:     formEl,
        confirmText: data ? 'Guardar cambios' : 'Crear partida',
        size:        'md',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
    if (!confirmed) return;

    const desc  = formEl.querySelector('#pr-desc').value.trim();
    const monto = parseFloat(formEl.querySelector('#pr-monto').value);
    if (!desc)         { Toast.show('La descripción es requerida', 'error'); return; }
    if (isNaN(monto))  { Toast.show('El monto es requerido', 'error'); return; }

    const payload = {
      descripcion:   desc,
      anio:          parseInt(formEl.querySelector('#pr-anio').value) || this._anio,
      mes:           formEl.querySelector('#pr-mes').value   || null,
      categoria_id:  formEl.querySelector('#pr-cat').value   || null,
      monto_asignado: monto,
      notas:         formEl.querySelector('#pr-notas').value.trim() || null,
    };

    try {
      if (data) {
        await presupuestoApi.actualizar(data.id, payload);
        Toast.show('Partida actualizada', 'success');
      } else {
        await presupuestoApi.crear(payload);
        Toast.show('Partida creada', 'success');
      }
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _registrarGasto(item) {
    const formEl = document.createElement('div');
    formEl.innerHTML = `
      <div class="form-group" style="margin-bottom:12px">
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:8px">
          Partida: <strong>${esc(item.descripcion)}</strong><br>
          Asignado: ${fmt$(item.monto_asignado)} · Ejecutado hasta ahora: ${fmt$(item.monto_ejecutado)}
        </p>
        <label class="form-label">Monto del gasto *</label>
        <input class="form-control" id="gasto-monto" type="number" min="0.01" step="0.01" placeholder="0.00" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción del gasto</label>
        <input class="form-control" id="gasto-desc" placeholder="Ej: Factura 0003-0001234">
      </div>
    `;
    const confirmed = await new Promise(resolve => {
      const modal = new Modal({ title: 'Registrar gasto', content: formEl, confirmText: 'Registrar', size: 'sm' });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
    if (!confirmed) return;

    const monto = parseFloat(formEl.querySelector('#gasto-monto').value);
    if (isNaN(monto) || monto <= 0) { Toast.show('Ingresá un monto válido', 'error'); return; }

    try {
      await presupuestoApi.registrarGasto(item.id, monto);
      Toast.show(`Gasto de ${fmt$(monto)} registrado`, 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _eliminar(item) {
    const ok = await Modal.confirm({ title: 'Eliminar partida', message: `¿Eliminar "${item.descripcion}"?`, confirmText: 'Eliminar' });
    if (!ok) return;
    try {
      await presupuestoApi.eliminar(item.id);
      Toast.show('Partida eliminada', 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() { this._layoutDestroy?.(); }
}
