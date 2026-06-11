// frontend/public/src/js/views/stock.js
// Vista de stock: tabla de Productos y tabla de Activos Fijos.
// Roles: admin únicamente.

import { renderLayout }  from './_layout.js';
import { DataTable }     from '../components/DataTable.js';
import { Modal }         from '../components/Modal.js';
import { Toast }         from '../components/Toast.js';
import {
  productos    as productosApi,
  activos      as activosApi,
  categorias   as categoriasApi,
  ubicaciones  as ubicacionesApi,
  importacion  as importacionApi,
} from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Genera el ícono de ayuda con tooltip para los labels del formulario */
function tip(text) {
  return `<span class="field-tip" data-tip="${esc(text)}" aria-label="${esc(text)}">!</span>`;
}

export default class StockView {
  constructor(container) {
    this.container      = container;
    this._tab           = 'productos';
    this._categorias    = [];
    this._ubicaciones   = [];
    this._dtProductos   = null;
    this._dtActivos     = null;
    this._layoutDestroy = null;
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, {
      usuario, activeHash: '#/stock',
    });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Stock</h1>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" id="btn-importar">⬆ Importar Excel</button>
          <button class="btn btn-primary" id="btn-nuevo">+ Nuevo</button>
        </div>
      </div>
      <div class="page-body">
        <!-- Tabs -->
        <div style="display:flex;gap:8px;border-bottom:1px solid var(--border);margin-bottom:16px">
          <button class="btn btn-ghost" id="tab-productos" data-tab="productos"
            style="border-bottom:2px solid var(--accent);border-radius:0">
            📦 Productos
          </button>
          <button class="btn btn-ghost" id="tab-activos" data-tab="activos"
            style="border-radius:0">
            🔩 Activos Fijos
          </button>
        </div>
        <!-- Tablas -->
        <div id="table-container-productos" class="card"></div>
        <div id="table-container-activos"   class="card" style="display:none"></div>
      </div>
    `;

    // Cargar datos de soporte
    const [catRes, ubicRes] = await Promise.all([
      categoriasApi.listar().catch(() => ({ data: [] })),
      ubicacionesApi.listar().catch(() => ({ data: [] })),
    ]);
    this._categorias  = Array.isArray(catRes.data)  ? catRes.data  : [];
    this._ubicaciones = Array.isArray(ubicRes.data) ? ubicRes.data : [];

    // ── DataTable Productos ───────────────────────────────────────────────
    this._dtProductos = new DataTable({
      container: mainContent.querySelector('#table-container-productos'),
      emptyText: 'Sin productos registrados',
      columns: [
        { key: 'codigo',       label: 'Código',   sortable: true },
        { key: 'nombre',       label: 'Nombre',   sortable: true },
        { key: 'tipo',         label: 'Tipo',     sortable: true,
          render: v => `<span class="badge ${v === 'retornable' ? 'badge-blue' : 'badge-green'}">${esc(v ?? '')}</span>` },
        { key: 'stock_actual', label: 'Stock',    sortable: true,
          render: (v, row) => {
            const bajo = v != null && row.stock_minimo != null && v <= row.stock_minimo;
            return `<span${bajo ? ' style="color:var(--danger);font-weight:600"' : ''}>${v ?? '—'}</span>`;
          }},
        { key: 'stock_minimo', label: 'Mínimo',   sortable: true },
        { key: '_actions',     label: '',
          render: (_, row) => `
            <button class="btn btn-sm btn-ghost" data-id="edit-${row.id}" title="Editar">✏️</button>
            <button class="btn btn-sm btn-ghost" data-id="del-${row.id}"
              title="Eliminar" style="color:var(--danger)">🗑️</button>
          ` },
      ],
    });

    // ── DataTable Activos ─────────────────────────────────────────────────
    this._dtActivos = new DataTable({
      container: mainContent.querySelector('#table-container-activos'),
      emptyText: 'Sin activos registrados',
      columns: [
        { key: 'numero_serie', label: 'N° Serie',  sortable: true },
        { key: 'producto',     label: 'Producto',  sortable: false,
          render: (_, row) => esc(row.producto?.nombre ?? '—') },
        { key: 'estado',       label: 'Estado',    sortable: true,
          render: v => {
            const cls = { disponible:'badge-green', en_uso:'badge-blue', en_reparacion:'badge-yellow', dañado:'badge-red' }[v] || 'badge-default';
            return `<span class="badge ${cls}">${esc(v?.replace(/_/g,' ') ?? '')}</span>`;
          }},
        { key: 'codigo_qr',    label: 'QR',        sortable: false,
          render: v => v ? `<span style="font-family:monospace;font-size:11px">${esc(v.slice(0,12))}…</span>` : '—' },
        { key: '_actions',     label: '',
          render: (_, row) => `
            <button class="btn btn-sm btn-ghost" data-id="edit-${row.id}" title="Editar">✏️</button>
            <button class="btn btn-sm btn-ghost" data-id="del-${row.id}"
              title="Eliminar" style="color:var(--danger)">🗑️</button>
          ` },
      ],
    });

    // ── Tabs ──────────────────────────────────────────────────────────────
    mainContent.querySelector('#tab-productos').addEventListener('click', () =>
      this._switchTab('productos', mainContent));
    mainContent.querySelector('#tab-activos').addEventListener('click', () =>
      this._switchTab('activos', mainContent));

    // ── Botones de header ─────────────────────────────────────────────────
    mainContent.querySelector('#btn-importar').addEventListener('click', () => this._openImportModal());
    mainContent.querySelector('#btn-nuevo').addEventListener('click', () => {
      if (this._tab === 'productos') this._openProductoModal(null);
      else this._openActivoModal(null);
    });

    // ── Delegación de acciones ────────────────────────────────────────────
    this._dtProductos.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('edit-')) this._openProductoModal(row);
      if (id.startsWith('del-'))  this._deleteProducto(row);
    });
    this._dtActivos.addEventListener('actionClick', e => {
      const { id, row } = e.detail;
      if (id.startsWith('edit-')) this._openActivoModal(row);
      if (id.startsWith('del-'))  this._deleteActivo(row);
    });

    await Promise.all([this._loadProductos(), this._loadActivos()]);
  }

  _switchTab(tab, mainContent) {
    this._tab = tab;
    mainContent.querySelectorAll('[data-tab]').forEach(b => {
      b.style.borderBottom = b.dataset.tab === tab ? '2px solid var(--accent)' : 'none';
    });
    mainContent.querySelector('#table-container-productos').style.display =
      tab === 'productos' ? '' : 'none';
    mainContent.querySelector('#table-container-activos').style.display =
      tab === 'activos' ? '' : 'none';
  }

  async _loadProductos() {
    try {
      const res = await productosApi.listar();
      this._dtProductos.setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { Toast.show('Error al cargar productos', 'error'); }
  }

  async _loadActivos() {
    try {
      const res = await activosApi.listar();
      this._dtActivos.setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) { Toast.show('Error al cargar activos', 'error'); }
  }

  // ── Productos CRUD ────────────────────────────────────────────────────────

  _openProductoModal(producto) {
    const formEl = document.createElement('div');

    const catOpts = this._categorias.map(c =>
      `<option value="${c.id}"${producto?.categoria_id === c.id ? ' selected' : ''}>${esc(c.nombre)}</option>`
    ).join('');
    const ubicOpts = this._ubicaciones.map(u =>
      `<option value="${u.id}"${producto?.ubicacion_id === u.id ? ' selected' : ''}>${esc(u.nombre)}</option>`
    ).join('');

    formEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Nombre * ${tip('Nombre completo del producto tal como aparecerá en listados y despachos.')}</label>
          <input class="form-control" id="p-nombre" value="${esc(producto?.nombre ?? '')}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo * ${tip('Consumible: se gasta o no se devuelve (ej: papel, tóner). Retornable: se presta y se recupera (ej: notebook, proyector).')}</label>
          <select class="form-control" id="p-tipo">
            <option value="consumible"${producto?.tipo === 'consumible' ? ' selected' : ''}>Consumible</option>
            <option value="retornable"${producto?.tipo === 'retornable' ? ' selected' : ''}>Retornable</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Código ${tip('Código interno o de barras del producto. Si lo dejás vacío se genera automáticamente.')}</label>
          <input class="form-control" id="p-codigo" value="${esc(producto?.codigo ?? '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Stock mínimo ${tip('Cantidad mínima aceptable. El sistema genera una alerta cuando el stock baja de este valor.')}</label>
          <input class="form-control" id="p-stock-min" type="number" min="0"
            value="${producto?.stock_minimo ?? 0}">
        </div>
        <div class="form-group">
          <label class="form-label">Stock inicial${producto ? ' (solo creación)' : ''} ${tip(producto ? 'El stock solo puede modificarse mediante movimientos de entrada/salida, no editando el producto.' : 'Cantidad disponible al momento de dar de alta el producto. Después se ajusta con movimientos.')}</label>
          <input class="form-control" id="p-stock-ini" type="number" min="0"
            value="${producto?.stock_actual ?? 0}"${producto ? ' disabled' : ''}>
        </div>
        <div class="form-group">
          <label class="form-label">Categoría ${tip('Agrupación lógica del producto (ej: Electrónica, Papelería). Sirve para filtrar y reportes.')}</label>
          <select class="form-control" id="p-categoria">
            <option value="">— Sin categoría —</option>
            ${catOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ubicación ${tip('Lugar físico donde se almacena normalmente este producto (depósito, aula, laboratorio).')}</label>
          <select class="form-control" id="p-ubicacion">
            <option value="">— Sin ubicación —</option>
            ${ubicOpts}
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Descripción ${tip('Detalle adicional: especificaciones técnicas, marca, modelo u observaciones relevantes.')}</label>
          <textarea class="form-control" id="p-desc" rows="2"
            maxlength="512">${esc(producto?.descripcion ?? '')}</textarea>
        </div>
      </div>
    `;

    new Promise(resolve => {
      const modal = new Modal({
        title:       producto ? `Editar: ${producto.nombre}` : 'Nuevo Producto',
        content:     formEl,
        confirmText: producto ? 'Guardar cambios' : 'Crear producto',
        size:        'md',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    }).then(async ok => {
      if (!ok) return;
      const nombre = formEl.querySelector('#p-nombre').value.trim();
      if (!nombre) { Toast.show('El nombre es requerido', 'error'); return; }

      const body = {
        nombre,
        tipo:         formEl.querySelector('#p-tipo').value,
        codigo:       formEl.querySelector('#p-codigo').value.trim() || undefined,
        stock_minimo: parseInt(formEl.querySelector('#p-stock-min').value) || 0,
        categoria_id: formEl.querySelector('#p-categoria').value || null,
        ubicacion_id: formEl.querySelector('#p-ubicacion').value || null,
        descripcion:  formEl.querySelector('#p-desc').value.trim() || null,
      };
      if (!producto) {
        body.stock_actual = parseInt(formEl.querySelector('#p-stock-ini').value) || 0;
      }

      try {
        if (producto) await productosApi.actualizar(producto.id, body);
        else          await productosApi.crear(body);
        Toast.show(producto ? 'Producto actualizado' : 'Producto creado', 'success');
        await this._loadProductos();
      } catch (e) { Toast.show(e.message, 'error'); }
    });
  }

  async _deleteProducto(producto) {
    const ok = await Modal.confirm({
      title:       'Eliminar producto',
      message:     `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger:      true,
    });
    if (!ok) return;
    try {
      await productosApi.eliminar(producto.id);
      Toast.show('Producto eliminado', 'success');
      await this._loadProductos();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  // ── Activos CRUD ──────────────────────────────────────────────────────────

  _openActivoModal(activo) {
    const formEl = document.createElement('div');

    formEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">N° de Serie *</label>
          <input class="form-control" id="a-serie"
            value="${esc(activo?.numero_serie ?? '')}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-control" id="a-estado">
            ${['disponible','en_uso','en_reparacion','dañado','baja_definitiva'].map(e =>
              `<option value="${e}"${activo?.estado === e ? ' selected' : ''}>
                ${e.replace(/_/g,' ')}
              </option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Observaciones</label>
          <textarea class="form-control" id="a-obs" rows="2"
            maxlength="512">${esc(activo?.observaciones ?? '')}</textarea>
        </div>
      </div>
    `;

    new Promise(resolve => {
      const modal = new Modal({
        title:       activo ? `Editar: ${activo.numero_serie}` : 'Nuevo Activo Fijo',
        content:     formEl,
        confirmText: activo ? 'Guardar cambios' : 'Crear activo',
        size:        'sm',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    }).then(async ok => {
      if (!ok) return;
      const serie = formEl.querySelector('#a-serie').value.trim();
      if (!serie) { Toast.show('El N° de serie es requerido', 'error'); return; }

      const body = {
        numero_serie:  serie,
        estado:        formEl.querySelector('#a-estado').value,
        observaciones: formEl.querySelector('#a-obs').value.trim() || null,
      };

      try {
        if (activo) await activosApi.actualizar(activo.id, body);
        else        await activosApi.crear(body);
        Toast.show(activo ? 'Activo actualizado' : 'Activo creado', 'success');
        await this._loadActivos();
      } catch (e) { Toast.show(e.message, 'error'); }
    });
  }

  async _deleteActivo(activo) {
    const ok = await Modal.confirm({
      title:       'Eliminar activo',
      message:     `¿Eliminar el activo "${activo.numero_serie}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger:      true,
    });
    if (!ok) return;
    try {
      await activosApi.eliminar(activo.id);
      Toast.show('Activo eliminado', 'success');
      await this._loadActivos();
    } catch (e) { Toast.show(e.message, 'error'); }
  }

  // ── Importación Excel ────────────────────────────────────────────────────

  _openImportModal() {
    const el = document.createElement('div');

    el.innerHTML = `
      <!-- Tabs internos -->
      <div style="display:flex;gap:8px;border-bottom:1px solid var(--border);margin-bottom:16px">
        <button class="btn btn-ghost" id="itab-productos"
          style="border-bottom:2px solid var(--accent);border-radius:0;padding:6px 14px">
          📦 Productos
        </button>
        <button class="btn btn-ghost" id="itab-activos"
          style="border-radius:0;padding:6px 14px">
          🔩 Activos Fijos
        </button>
      </div>

      <!-- Descarga de plantilla -->
      <div style="background:var(--surface2,#1e2433);border-radius:8px;padding:12px 16px;
                  margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:2px">Plantilla Excel</div>
          <div style="font-size:12px;color:var(--text-secondary,#8896b0)">
            Descargá la plantilla con el formato correcto y una hoja de Referencia
            con las categorías y ubicaciones disponibles en el sistema.
          </div>
        </div>
        <button class="btn btn-secondary" id="btn-dl-plantilla" style="white-space:nowrap">
          ⬇ Descargar plantilla
        </button>
      </div>

      <!-- Panel Productos -->
      <div id="ipanel-productos">
        <p style="font-size:12px;color:var(--text-secondary,#8896b0);margin-bottom:10px">
          <strong>Requeridas:</strong> nombre, tipo (consumible / retornable)<br>
          <strong>Opcionales:</strong> codigo, descripcion, categoria, ubicacion,
          stock_actual, stock_minimo, unidad_medida, precio_referencia
        </p>
        <label id="izona-productos" style="display:flex;flex-direction:column;align-items:center;
            justify-content:center;border:2px dashed var(--border);border-radius:8px;
            padding:24px;cursor:pointer;gap:6px;transition:border-color .15s">
          <input type="file" id="ifile-productos" accept=".xlsx,.xls,.csv" style="display:none">
          <span style="font-size:22px">📂</span>
          <span id="inombre-productos" style="font-size:13px;color:var(--text-secondary,#8896b0)">
            Seleccioná un archivo .xlsx, .xls o .csv
          </span>
        </label>
      </div>

      <!-- Panel Activos -->
      <div id="ipanel-activos" style="display:none">
        <p style="font-size:12px;color:var(--text-secondary,#8896b0);margin-bottom:10px">
          <strong>Requeridas:</strong> producto_codigo, numero_serie<br>
          <strong>Opcionales:</strong> mac_address, fecha_adquisicion, valor_adquisicion,
          fecha_garantia, vida_util_anos, notas
        </p>
        <label id="izona-activos" style="display:flex;flex-direction:column;align-items:center;
            justify-content:center;border:2px dashed var(--border);border-radius:8px;
            padding:24px;cursor:pointer;gap:6px;transition:border-color .15s">
          <input type="file" id="ifile-activos" accept=".xlsx,.xls,.csv" style="display:none">
          <span style="font-size:22px">📂</span>
          <span id="inombre-activos" style="font-size:13px;color:var(--text-secondary,#8896b0)">
            Seleccioná un archivo .xlsx, .xls o .csv
          </span>
        </label>
      </div>

      <!-- Resultado inline -->
      <div id="iresultado" style="display:none;margin-top:16px"></div>
    `;

    let tabActual = 'productos';

    // ── Tabs ──────────────────────────────────────────────────────────────
    const switchITab = (tab) => {
      tabActual = tab;
      el.querySelector('#itab-productos').style.borderBottom =
        tab === 'productos' ? '2px solid var(--accent)' : 'none';
      el.querySelector('#itab-activos').style.borderBottom =
        tab === 'activos' ? '2px solid var(--accent)' : 'none';
      el.querySelector('#ipanel-productos').style.display = tab === 'productos' ? '' : 'none';
      el.querySelector('#ipanel-activos').style.display   = tab === 'activos'   ? '' : 'none';
      el.querySelector('#iresultado').style.display = 'none';
    };
    el.querySelector('#itab-productos').addEventListener('click', () => switchITab('productos'));
    el.querySelector('#itab-activos').addEventListener('click',   () => switchITab('activos'));

    // ── File pickers ──────────────────────────────────────────────────────
    const wireFilePicker = (inputId, labelId) => {
      el.querySelector(inputId).addEventListener('change', (e) => {
        const file = e.target.files[0];
        el.querySelector(labelId).textContent = file ? file.name : 'Seleccioná un archivo .xlsx, .xls o .csv';
      });
    };
    wireFilePicker('#ifile-productos', '#inombre-productos');
    wireFilePicker('#ifile-activos',   '#inombre-activos');

    // ── Descarga plantilla ────────────────────────────────────────────────
    el.querySelector('#btn-dl-plantilla').addEventListener('click', async () => {
      const btn = el.querySelector('#btn-dl-plantilla');
      btn.disabled = true;
      btn.textContent = 'Descargando…';
      try {
        const blob = await importacionApi.descargarPlantilla();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'plantilla-importacion.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } catch (e) {
        Toast.show(`Error al descargar la plantilla: ${e.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '⬇ Descargar plantilla';
      }
    });

    // ── Importar ──────────────────────────────────────────────────────────
    const renderResultado = (res) => {
      const div = el.querySelector('#iresultado');
      div.style.display = '';
      const { resumen, exitosos, errores } = res;
      let html = `
        <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
          <span class="badge badge-green">✔ ${resumen.exitosos} importados</span>
          ${resumen.errores > 0 ? `<span class="badge badge-red">✖ ${resumen.errores} con error</span>` : ''}
          <span style="font-size:12px;color:var(--text-secondary,#8896b0);align-self:center">
            Total: ${resumen.total} filas
          </span>
        </div>
      `;
      if (errores.length > 0) {
        html += `
          <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--danger,#e05c5c)">
            Filas con error:
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;font-size:12px;border-collapse:collapse">
              <thead>
                <tr style="border-bottom:1px solid var(--border)">
                  <th style="text-align:left;padding:4px 8px;white-space:nowrap">Fila</th>
                  <th style="text-align:left;padding:4px 8px">Motivo</th>
                </tr>
              </thead>
              <tbody>
                ${errores.map(e => `
                  <tr style="border-bottom:1px solid var(--border)">
                    <td style="padding:4px 8px;white-space:nowrap">${e.fila}</td>
                    <td style="padding:4px 8px;color:var(--danger,#e05c5c)">${esc(e.error)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
      div.innerHTML = html;
    };

    // ── Modal ─────────────────────────────────────────────────────────────
    const modal = new Modal({
      title:       'Importar desde Excel',
      content:     el,
      confirmText: 'Importar',
      cancelText:  'Cerrar',
      size:        'md',
    });

    modal.onCancel(() => modal.hide());
    modal.onConfirm(async () => {
      const fileInput = el.querySelector(tabActual === 'productos' ? '#ifile-productos' : '#ifile-activos');
      if (!fileInput.files[0]) {
        Toast.show('Seleccioná un archivo antes de importar', 'error');
        return;
      }
      const formData = new FormData();
      formData.append('archivo', fileInput.files[0]);

      const btn = modal._el.querySelector('.btn-confirm');
      btn.disabled = true;
      btn.textContent = 'Importando…';

      try {
        const res = tabActual === 'productos'
          ? await importacionApi.importarProductos(formData)
          : await importacionApi.importarActivos(formData);
        renderResultado(res);
        if (tabActual === 'productos') await this._loadProductos();
        else                           await this._loadActivos();
        if (res.resumen.errores === 0) Toast.show(`${res.resumen.exitosos} registros importados`, 'success');
      } catch (e) {
        Toast.show(e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Importar';
      }
    });

    // Override para que el modal NO se cierre automáticamente al confirmar
    modal._confirm = function () {
      if (this._onConfirm) this._onConfirm();
    };

    modal.show();
  }

  destroy() {
    this._layoutDestroy?.();
  }
}
