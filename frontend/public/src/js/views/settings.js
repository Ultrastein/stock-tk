// frontend/public/src/js/views/settings.js
// Vista de Configuración: gestión de Usuarios, Categorías y Ubicaciones.
// Rol requerido: admin.

import { renderLayout }  from './_layout.js';
import { Modal }         from '../components/Modal.js';
import { Toast }         from '../components/Toast.js';
import {
  usuarios    as usuariosApi,
  categorias  as categoriasApi,
  ubicaciones as ubicacionesApi,
} from '../api/endpoints.js';
import { get as getState } from '../store/state.js';

const ROLE_LABELS = { admin: 'Administrador', docente: 'Docente', kiosco: 'Kiosco' };
const ROLE_COLORS = { admin: 'var(--accent)', docente: 'var(--success)', kiosco: 'var(--warning)' };

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export default class SettingsView {
  constructor(container) {
    this.container      = container;
    this._tab           = 'usuarios';
    this._layoutDestroy = null;
    this._usuarios      = [];
    this._categorias    = [];
    this._ubicaciones   = [];
  }

  async render() {
    if (this._layoutDestroy) { this._layoutDestroy(); this._layoutDestroy = null; }

    const usuario = getState('usuario');
    const { mainContent, destroy } = renderLayout(this.container, {
      usuario, activeHash: '#/settings',
    });
    this._layoutDestroy = destroy;

    mainContent.innerHTML = `
      <div class="page-header">
        <h1>Configuración</h1>
      </div>
      <div class="page-body">
        <!-- Tabs -->
        <div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px">
          ${['usuarios','categorias','ubicaciones'].map(t => `
            <button class="btn btn-ghost" id="tab-${t}" data-tab="${t}"
              style="border-radius:4px 4px 0 0;padding:8px 18px;font-size:var(--text-sm)">
              ${{ usuarios:'👥 Usuarios', categorias:'🏷️ Categorías', ubicaciones:'📍 Ubicaciones' }[t]}
            </button>`).join('')}
        </div>

        <!-- Paneles -->
        <div id="panel-usuarios">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <span style="color:var(--text-secondary);font-size:var(--text-sm)" id="usuarios-count"></span>
            <button class="btn btn-primary btn-sm" id="btn-nuevo-usuario">+ Nuevo usuario</button>
          </div>
          <div id="usuarios-list" class="settings-list"></div>
        </div>

        <div id="panel-categorias" style="display:none">
          <div style="display:flex;gap:8px;margin-bottom:14px">
            <input id="nueva-categoria" class="form-control" placeholder="Nombre de la categoría" style="max-width:280px">
            <button class="btn btn-primary btn-sm" id="btn-crear-categoria">Agregar</button>
          </div>
          <div id="categorias-list" class="settings-list"></div>
        </div>

        <div id="panel-ubicaciones" style="display:none">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <input id="nueva-ubicacion-nombre" class="form-control" placeholder="Nombre (ej: Aula 5)" style="max-width:200px">
            <select id="nueva-ubicacion-tipo" class="form-control" style="max-width:160px">
              <option value="aula">Aula</option>
              <option value="deposito">Depósito</option>
              <option value="laboratorio">Laboratorio</option>
              <option value="otro">Otro</option>
            </select>
            <button class="btn btn-primary btn-sm" id="btn-crear-ubicacion">Agregar</button>
          </div>
          <div id="ubicaciones-list" class="settings-list"></div>
        </div>
      </div>
    `;

    this._setupTabs(mainContent);
    await this._loadAll();
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  _setupTabs(root) {
    root.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });
    this._switchTab(this._tab);
  }

  _switchTab(tab) {
    this._tab = tab;
    ['usuarios','categorias','ubicaciones'].forEach(t => {
      const btn   = document.getElementById(`tab-${t}`);
      const panel = document.getElementById(`panel-${t}`);
      const active = t === tab;
      if (btn)   btn.style.cssText   = active
        ? 'border-bottom:2px solid var(--accent);border-radius:4px 4px 0 0;padding:8px 18px;font-size:var(--text-sm);color:var(--accent)'
        : 'border-radius:4px 4px 0 0;padding:8px 18px;font-size:var(--text-sm)';
      if (panel) panel.style.display = active ? '' : 'none';
    });
  }

  // ── Load ──────────────────────────────────────────────────────────────────────
  async _loadAll() {
    const [rU, rC, rL] = await Promise.allSettled([
      usuariosApi.listar(),
      categoriasApi.listar(),
      ubicacionesApi.listar(),
    ]);

    this._usuarios   = Array.isArray(rU.value?.data)  ? rU.value.data  : [];
    this._categorias = Array.isArray(rC.value?.data)  ? rC.value.data  : (Array.isArray(rC.value) ? rC.value : []);
    this._ubicaciones= Array.isArray(rL.value?.data)  ? rL.value.data  : (Array.isArray(rL.value) ? rL.value : []);

    this._renderUsuarios();
    this._renderCategorias();
    this._renderUbicaciones();
    this._setupActions();
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────────
  _renderUsuarios() {
    const count = document.getElementById('usuarios-count');
    const list  = document.getElementById('usuarios-list');
    if (!list) return;
    if (count) count.textContent = `${this._usuarios.length} usuario${this._usuarios.length !== 1 ? 's' : ''}`;

    if (!this._usuarios.length) {
      list.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:24px">Sin usuarios registrados.</p>`;
      return;
    }

    list.innerHTML = this._usuarios.map(u => `
      <div class="settings-item" data-id="${esc(u.id)}">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--surface-2);
            display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0">
            ${esc(u.nombre?.charAt(0).toUpperCase())}
          </div>
          <div style="min-width:0">
            <div style="font-weight:500;font-size:var(--text-sm)">${esc(u.nombre)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">${esc(u.email)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <span style="font-size:var(--text-xs);padding:2px 8px;border-radius:9999px;
            background:${ROLE_COLORS[u.rol] ?? 'var(--surface-2)'}22;
            color:${ROLE_COLORS[u.rol] ?? 'var(--text-secondary)'}">
            ${ROLE_LABELS[u.rol] ?? u.rol}
          </span>
          ${u.activo
            ? `<span style="font-size:var(--text-xs);color:var(--success)">Activo</span>
               <button class="btn btn-ghost btn-sm btn-desactivar-usuario" data-id="${esc(u.id)}"
                 title="Desactivar" style="color:var(--danger);font-size:var(--text-xs)">Desactivar</button>`
            : `<span style="font-size:var(--text-xs);color:var(--text-muted)">Inactivo</span>
               <button class="btn btn-ghost btn-sm btn-reactivar-usuario" data-id="${esc(u.id)}"
                 title="Reactivar" style="color:var(--success);font-size:var(--text-xs)">Reactivar</button>`
          }
        </div>
      </div>
    `).join('');
  }

  // ── Categorías ────────────────────────────────────────────────────────────────
  _renderCategorias() {
    const list = document.getElementById('categorias-list');
    if (!list) return;
    if (!this._categorias.length) {
      list.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:24px">
        Sin categorías. Agregá una arriba para poder crear productos.</p>`;
      return;
    }
    list.innerHTML = this._categorias.map(c => `
      <div class="settings-item">
        <span style="font-size:var(--text-sm)">${esc(c.nombre)}</span>
        ${c.descripcion ? `<span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:8px">${esc(c.descripcion)}</span>` : ''}
        <button class="btn btn-ghost btn-sm btn-eliminar-cat" data-id="${esc(c.id)}"
          style="margin-left:auto;color:var(--danger)" title="Eliminar">🗑️</button>
      </div>
    `).join('');
  }

  // ── Ubicaciones ───────────────────────────────────────────────────────────────
  _renderUbicaciones() {
    const TIPO_LABELS = { aula:'🏫 Aula', deposito:'📦 Depósito', laboratorio:'🔬 Laboratorio', otro:'📌 Otro' };
    const list = document.getElementById('ubicaciones-list');
    if (!list) return;
    if (!this._ubicaciones.length) {
      list.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:24px">
        Sin ubicaciones. Agregá aulas o depósitos para asignarlos a productos.</p>`;
      return;
    }
    list.innerHTML = this._ubicaciones.map(u => `
      <div class="settings-item">
        <span style="font-size:var(--text-sm)">${esc(u.nombre)}</span>
        <span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:8px">${TIPO_LABELS[u.tipo] ?? u.tipo}</span>
        <button class="btn btn-ghost btn-sm btn-eliminar-ubi" data-id="${esc(u.id)}"
          style="margin-left:auto;color:var(--danger)" title="Eliminar">🗑️</button>
      </div>
    `).join('');
  }

  // ── Actions ───────────────────────────────────────────────────────────────────
  _setupActions() {
    // Nuevo usuario
    document.getElementById('btn-nuevo-usuario')?.addEventListener('click', () => this._openNuevoUsuarioModal());

    // Crear categoría
    document.getElementById('btn-crear-categoria')?.addEventListener('click', () => this._crearCategoria());
    document.getElementById('nueva-categoria')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._crearCategoria();
    });

    // Crear ubicación
    document.getElementById('btn-crear-ubicacion')?.addEventListener('click', () => this._crearUbicacion());

    // Delegación de clicks en listas
    document.getElementById('usuarios-list')?.addEventListener('click',    e => this._onUsuarioClick(e));
    document.getElementById('categorias-list')?.addEventListener('click',  e => this._onCatClick(e));
    document.getElementById('ubicaciones-list')?.addEventListener('click', e => this._onUbiClick(e));
  }

  // ── Modal nuevo usuario ───────────────────────────────────────────────────────
  _openNuevoUsuarioModal(data = null) {
    const formEl = document.createElement('div');
    formEl.style.cssText = 'display:flex;flex-direction:column;gap:14px';
    formEl.innerHTML = `
      <div>
        <label class="form-label">Nombre completo *</label>
        <input id="u-nombre" class="form-control" placeholder="Juan García" value="${esc(data?.nombre ?? '')}">
      </div>
      <div>
        <label class="form-label">Email *</label>
        <input id="u-email" class="form-control" type="email" placeholder="juan@escuela.com" value="${esc(data?.email ?? '')}">
      </div>
      ${!data ? `
      <div>
        <label class="form-label">Contraseña *</label>
        <input id="u-password" class="form-control" type="password" placeholder="Mínimo 6 caracteres">
      </div>` : ''}
      <div>
        <label class="form-label">Rol *</label>
        <select id="u-rol" class="form-control">
          <option value="docente" ${(!data || data.rol==='docente') ? 'selected':''}>Docente</option>
          <option value="admin"   ${data?.rol==='admin'   ? 'selected':''}>Administrador</option>
          <option value="kiosco"  ${data?.rol==='kiosco'  ? 'selected':''}>Kiosco</option>
        </select>
      </div>
    `;

    new Promise(resolve => {
      const modal = new Modal({
        title:       data ? 'Editar usuario' : 'Nuevo usuario',
        content:     formEl,
        confirmText: data ? 'Guardar' : 'Crear usuario',
      });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    }).then(async ok => {
      if (!ok) return;
      const nombre   = formEl.querySelector('#u-nombre')?.value.trim();
      const email    = formEl.querySelector('#u-email')?.value.trim();
      const password = formEl.querySelector('#u-password')?.value;
      const rol      = formEl.querySelector('#u-rol')?.value;

      if (!nombre || !email) return Toast.show('Completá nombre y email.', 'warning');
      if (!data && (!password || password.length < 6))
        return Toast.show('La contraseña debe tener al menos 6 caracteres.', 'warning');

      try {
        if (data) {
          await usuariosApi.actualizar(data.id, { nombre, email, rol });
          Toast.show('Usuario actualizado.', 'success');
        } else {
          await usuariosApi.crear({ nombre, email, password, rol });
          Toast.show(`Usuario ${nombre} creado. Puede ingresar con ${email}.`, 'success');
        }
        await this._reloadUsuarios();
      } catch (err) {
        Toast.show(err.message || 'Error al guardar usuario.', 'error');
      }
    });
  }

  async _reloadUsuarios() {
    try {
      const r = await usuariosApi.listar();
      this._usuarios = Array.isArray(r?.data) ? r.data : [];
      this._renderUsuarios();
    } catch (_) {}
  }

  _onUsuarioClick(e) {
    const desBtn = e.target.closest('.btn-desactivar-usuario');
    const reBtn  = e.target.closest('.btn-reactivar-usuario');
    if (desBtn) this._toggleUsuario(desBtn.dataset.id, false);
    if (reBtn)  this._toggleUsuario(reBtn.dataset.id,  true);
  }

  async _toggleUsuario(id, activar) {
    try {
      if (activar) await usuariosApi.reactivar(id);
      else         await usuariosApi.desactivar(id);
      Toast.show(activar ? 'Usuario reactivado.' : 'Usuario desactivado.', 'success');
      await this._reloadUsuarios();
    } catch (err) {
      Toast.show(err.message || 'Error al actualizar usuario.', 'error');
    }
  }

  // ── Categorías actions ────────────────────────────────────────────────────────
  async _crearCategoria() {
    const input = document.getElementById('nueva-categoria');
    const nombre = input?.value.trim();
    if (!nombre) return Toast.show('Escribí un nombre de categoría.', 'warning');
    try {
      await categoriasApi.crear({ nombre });
      Toast.show(`Categoría "${nombre}" creada.`, 'success');
      input.value = '';
      const r = await categoriasApi.listar();
      this._categorias = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      this._renderCategorias();
    } catch (err) {
      Toast.show(err.message || 'Error al crear categoría.', 'error');
    }
  }

  _onCatClick(e) {
    const btn = e.target.closest('.btn-eliminar-cat');
    if (btn) this._eliminarCategoria(btn.dataset.id);
  }

  async _eliminarCategoria(id) {
    if (!confirm('¿Eliminar esta categoría? Los productos que la usen quedarán sin categoría.')) return;
    try {
      await categoriasApi.eliminar(id);
      Toast.show('Categoría eliminada.', 'success');
      this._categorias = this._categorias.filter(c => c.id !== id);
      this._renderCategorias();
    } catch (err) {
      Toast.show(err.message || 'Error al eliminar categoría.', 'error');
    }
  }

  // ── Ubicaciones actions ───────────────────────────────────────────────────────
  async _crearUbicacion() {
    const nombre = document.getElementById('nueva-ubicacion-nombre')?.value.trim();
    const tipo   = document.getElementById('nueva-ubicacion-tipo')?.value;
    if (!nombre) return Toast.show('Escribí un nombre de ubicación.', 'warning');
    try {
      await ubicacionesApi.crear({ nombre, tipo });
      Toast.show(`Ubicación "${nombre}" creada.`, 'success');
      document.getElementById('nueva-ubicacion-nombre').value = '';
      const r = await ubicacionesApi.listar();
      this._ubicaciones = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      this._renderUbicaciones();
    } catch (err) {
      Toast.show(err.message || 'Error al crear ubicación.', 'error');
    }
  }

  _onUbiClick(e) {
    const btn = e.target.closest('.btn-eliminar-ubi');
    if (btn) this._eliminarUbicacion(btn.dataset.id);
  }

  async _eliminarUbicacion(id) {
    if (!confirm('¿Eliminar esta ubicación?')) return;
    try {
      await ubicacionesApi.eliminar(id);
      Toast.show('Ubicación eliminada.', 'success');
      this._ubicaciones = this._ubicaciones.filter(u => u.id !== id);
      this._renderUbicaciones();
    } catch (err) {
      Toast.show(err.message || 'Error al eliminar ubicación.', 'error');
    }
  }

  destroy() { this._layoutDestroy?.(); }
}
