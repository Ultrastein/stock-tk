// frontend/public/src/js/views/inventario.js
// Inventario físico: sesiones de conteo con reconciliación contra el sistema.

import { renderLayout }    from './_layout.js';
import { DataTable }       from '../components/DataTable.js';
import { Modal }           from '../components/Modal.js';
import { Toast }           from '../components/Toast.js';
import { showSkeleton }    from '../components/Skeleton.js';
import { inventario as inventarioApi } from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

const ESTADO_CLS = {
  borrador:    'badge-default',
  en_proceso:  'badge-blue',
  finalizado:  'badge-green',
};

export default class InventarioView {
  constructor(container) {
    this.container      = container;
    this._dt            = null;
    this._layoutDestroy = null;
    this._sesionActiva  = null;
    this._itemsDt       = null;
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, { usuario, activeHash: '#/inventario' });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Inventario Físico</h1>
        <button class="btn btn-primary" id="btn-nuevo-inv">+ Nueva sesión</button>
      </div>
      <div class="page-body">
        <div class="card" id="inv-table"></div>
      </div>
    `;

    this._dt = new DataTable({
      container: mainContent.querySelector('#inv-table'),
      emptyText: 'Sin sesiones de inventario',
      columns: [
        { key: 'codigo',     label: 'Sesión',   sortable: true,
          render: v => `<span style="font-family:monospace;font-size:var(--text-sm)">${esc(v)}</span>` },
        { key: 'estado',     label: 'Estado',   sortable: true,
          render: v => `<span class="badge ${ESTADO_CLS[v] || 'badge-default'}">${esc(v ?? '')}</span>` },
        { key: 'responsable', label: 'Responsable', sortable: false,
          render: (_, row) => esc(row.responsable?.nombre ?? '—') },
        { key: 'fecha_inicio', label: 'Iniciado',  sortable: true, render: v => fmtDate(v) },
        { key: 'fecha_fin',    label: 'Finalizado', sortable: true, render: v => fmtDate(v) },
        { key: 'diferencias_encontradas', label: 'Diferencias', sortable: true,
          render: v => v > 0
            ? `<span class="badge badge-yellow">${v} diferencia(s)</span>`
            : `<span class="badge badge-green">Sin diferencias</span>` },
        { key: '_actions', label: '',
          render: (_, row) => `
            ${row.estado === 'borrador' ? `
              <button class="btn btn-sm btn-primary" data-id="iniciar-${row.id}">▶ Iniciar conteo</button>
            ` : ''}
            ${row.estado === 'en_proceso' ? `
              <button class="btn btn-sm btn-secondary" data-id="contar-${row.id}">📋 Contar</button>
              <button class="btn btn-sm btn-secondary" data-id="finalizar-${row.id}">✓ Finalizar</button>
            ` : ''}
            ${row.estado === 'finalizado' ? `
              <button class="btn btn-sm btn-ghost" data-id="ver-${row.id}">Ver reporte</button>
            ` : ''}
          ` },
      ],
    });

    this._dt.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('iniciar-'))   this._iniciar(row);
      if (id.startsWith('contar-'))    this._abrirConteo(row.id);
      if (id.startsWith('finalizar-')) this._finalizar(row);
      if (id.startsWith('ver-'))       this._verReporte(row.id);
    });

    mainContent.querySelector('#btn-nuevo-inv')?.addEventListener('click', () => this._nuevaSesion());

    await this._load();
  }

  async _load() {
    try {
      const tbody = this._dt._el?.querySelector('tbody')
      if (tbody) showSkeleton(tbody)
      const res = await inventarioApi.listar();
      this._dt.setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { Toast.show('Error al cargar sesiones', 'error'); }
  }

  async _nuevaSesion() {
    const formEl = document.createElement('div');
    formEl.innerHTML = `
      <div class="form-group">
        <label class="form-label">Notas / Motivo del inventario</label>
        <textarea class="form-control" id="inv-notas" rows="3"
          placeholder="Ej: Cierre de trimestre, auditoría anual…"></textarea>
      </div>
    `;
    const ok = await new Promise(resolve => {
      const modal = new Modal({ title: 'Nueva sesión de inventario', content: formEl, confirmText: 'Crear sesión' });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
    if (!ok) return;
    try {
      await inventarioApi.crear({ notas: formEl.querySelector('#inv-notas').value.trim() || null });
      Toast.show('Sesión creada. Presioná "Iniciar conteo" para cargar los ítems.', 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _iniciar(inv) {
    const ok = await Modal.confirm({
      title: 'Iniciar conteo',
      message: 'Se cargarán automáticamente todos los productos y activos del sistema. ¿Continuar?',
      confirmText: 'Iniciar',
    });
    if (!ok) return;
    try {
      const res = await inventarioApi.iniciar(inv.id);
      Toast.show(`Conteo iniciado — ${res.items_generados} ítems cargados`, 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _finalizar(inv) {
    const ok = await Modal.confirm({
      title: 'Finalizar inventario',
      message: 'Se aplicarán los ajustes de stock según el conteo físico. Esta acción no se puede deshacer. ¿Confirmar?',
      confirmText: 'Finalizar y ajustar',
    });
    if (!ok) return;
    try {
      const res = await inventarioApi.finalizar(inv.id);
      Toast.show(`Inventario finalizado — ${res.diferencias_encontradas} diferencia(s) encontrada(s)`, 'success');
      await this._load();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _abrirConteo(invId) {
    try {
      const res = await inventarioApi.obtener(invId);
      const inv  = res.data;
      const items = inv.items || [];

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-direction:column;gap:8px;max-height:70vh;overflow-y:auto';

      // Filtro rápido
      const filtroDiv = document.createElement('div');
      filtroDiv.innerHTML = `<input class="form-control" id="inv-search" placeholder="Buscar producto o serie…" style="margin-bottom:8px">`;
      wrapper.appendChild(filtroDiv);

      const listDiv = document.createElement('div');
      listDiv.id = 'inv-items';
      wrapper.appendChild(listDiv);

      const renderItems = (filter = '') => {
        const filtered = filter
          ? items.filter(i => {
              const name = (i.producto?.nombre ?? i.activoFijo?.numero_serie ?? '').toLowerCase();
              return name.includes(filter.toLowerCase());
            })
          : items;

        listDiv.innerHTML = filtered.map(item => `
          <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:6px;padding:10px 12px" data-item-id="${item.id}">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:var(--text-sm);font-weight:500">
                ${esc(item.producto?.nombre ?? item.activoFijo?.numero_serie ?? '—')}
                ${item.activoFijo?.numero_serie && item.producto?.nombre
                  ? `<span style="color:var(--text-muted);font-size:11px;margin-left:4px">${esc(item.activoFijo.numero_serie)}</span>` : ''}
              </span>
              <span style="font-size:var(--text-xs);color:var(--text-muted)">
                Sistema: ${item.cantidad_esperada ?? '?'}
                ${item.diferencia != null && item.diferencia !== 0
                  ? `<span style="color:${item.diferencia > 0 ? 'var(--success)' : 'var(--danger)'}">
                       (${item.diferencia > 0 ? '+' : ''}${item.diferencia})
                     </span>`
                  : ''}
              </span>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <input class="form-control inv-contada" type="number" min="0"
                value="${item.cantidad_contada ?? ''}"
                placeholder="Cant. física"
                data-item-id="${item.id}"
                style="width:120px">
              <select class="form-control inv-estado" data-item-id="${item.id}" style="flex:1">
                <option value="">Sin observación</option>
                <option value="funcional"  ${item.estado_fisico === 'funcional'  ? 'selected':''}>Funcional</option>
                <option value="dañado"     ${item.estado_fisico === 'dañado'     ? 'selected':''}>Dañado</option>
                <option value="para_baja"  ${item.estado_fisico === 'para_baja'  ? 'selected':''}>Para baja</option>
              </select>
              <button class="btn btn-sm btn-secondary btn-guardar-item" data-item-id="${item.id}">
                Guardar
              </button>
            </div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:16px">Sin ítems</p>';

        // Eventos de guardar
        listDiv.querySelectorAll('.btn-guardar-item').forEach(btn => {
          btn.addEventListener('click', async () => {
            const itemId  = btn.dataset.itemId;
            const cantada = parseInt(listDiv.querySelector(`.inv-contada[data-item-id="${itemId}"]`).value);
            const estado  = listDiv.querySelector(`.inv-estado[data-item-id="${itemId}"]`).value;
            if (isNaN(cantada)) { Toast.show('Ingresá una cantidad válida', 'warning'); return; }
            try {
              await inventarioApi.actualizarItem(invId, itemId, { cantidad_contada: cantada, estado_fisico: estado || null });
              btn.textContent = '✓';
              btn.classList.replace('btn-secondary', 'btn-ghost');
              // Actualizar diferencia en memoria
              const item = items.find(i => i.id === itemId);
              if (item) { item.cantidad_contada = cantada; item.diferencia = cantada - (item.cantidad_esperada ?? 0); }
            } catch (e) { Toast.show(e.message, 'error'); }
          });
        });
      };

      renderItems();
      filtroDiv.querySelector('#inv-search').addEventListener('input', e => renderItems(e.target.value));

      const modal = new Modal({ title: `Conteo: ${inv.codigo}`, content: wrapper, confirmText: 'Cerrar', cancelText: '', size: 'lg' });
      modal.onConfirm(() => modal.hide());
      modal.onCancel(()  => modal.hide());
      modal.show();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  async _verReporte(invId) {
    try {
      const res = await inventarioApi.obtener(invId);
      const inv  = res.data;
      const diffs = (inv.items || []).filter(i => i.diferencia != null && i.diferencia !== 0);

      const el = document.createElement('div');
      el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="stat-card" style="text-align:center">
            <div style="font-size:2rem;font-weight:700">${inv.items?.length ?? 0}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Total ítems</div>
          </div>
          <div class="stat-card" style="text-align:center">
            <div style="font-size:2rem;font-weight:700;color:var(--warning)">${diffs.length}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Con diferencia</div>
          </div>
          <div class="stat-card" style="text-align:center">
            <div style="font-size:2rem;font-weight:700;color:var(--success)">${(inv.items?.length ?? 0) - diffs.length}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Sin diferencia</div>
          </div>
        </div>
        ${diffs.length ? `
          <div style="font-weight:600;margin-bottom:8px;font-size:var(--text-sm)">Ítems con diferencia:</div>
          <div class="table-wrapper">
            <table class="table">
              <thead><tr><th>Ítem</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead>
              <tbody>
                ${diffs.map(i => `
                  <tr>
                    <td>${esc(i.producto?.nombre ?? i.activoFijo?.numero_serie ?? '—')}</td>
                    <td>${i.cantidad_esperada ?? '?'}</td>
                    <td>${i.cantidad_contada ?? '?'}</td>
                    <td style="color:${i.diferencia > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600">
                      ${i.diferencia > 0 ? '+' : ''}${i.diferencia}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--success);text-align:center;padding:16px">🎉 Sin diferencias encontradas</p>'}
      `;
      const modal = new Modal({ title: `Reporte: ${inv.codigo}`, content: el, confirmText: 'Cerrar', cancelText: '', size: 'lg' });
      modal.onConfirm(() => modal.hide());
      modal.onCancel(()  => modal.hide());
      modal.show();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  destroy() { this._layoutDestroy?.(); }
}
