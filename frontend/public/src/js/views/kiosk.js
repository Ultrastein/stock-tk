// frontend/public/src/js/views/kiosk.js
// Vista Kiosco — checkout/checkin de kits con escáner QR.
// Roles: admin, kiosco.
// Offline-first: pre-carga kits/usuarios/ubicaciones en IndexedDB.
// Checkin requiere conexión (necesita despacho_id del servidor).

import { Scanner }  from '../components/Scanner.js';
import { Toast }    from '../components/Toast.js';
import { Modal }    from '../components/Modal.js';
import { kits as kitsApi, usuarios as usuariosApi, ubicaciones as ubicacionesApi } from '../api/endpoints.js';
import { cache }    from '../store/db.js';
import { get as getState } from '../store/state.js';

export default class KioskView {
  constructor(container) {
    this.container     = container;
    this._scanner      = null;
    this._state        = 'idle';   // 'idle' | 'found' | 'processing'
    this._kit          = null;     // kit actualmente cargado
    this._allKits      = [];       // todos los kits (para búsqueda QR local)
    this._usuarios     = [];       // docentes + admins
    this._ubicaciones  = [];       // ubicaciones disponibles
    this._onlineHandler  = null;
    this._offlineHandler = null;
  }

  // ──────────────────────────────────────────────────────
  // CICLO DE VIDA
  // ──────────────────────────────────────────────────────

  async render() {
    const usuario = getState('usuario');

    this.container.innerHTML = `
      <div class="layout-kiosk">
        <header class="kiosk-header">
          <h1>📦 Control de Stock</h1>
          <div class="kiosk-status">
            <span style="color:var(--text-secondary);font-size:var(--text-sm)">${usuario?.nombre ?? ''}</span>
            <span id="kiosk-online-dot" class="badge ${navigator.onLine ? 'badge-green' : 'badge-red'}" style="margin-left:8px">
              ${navigator.onLine ? 'En línea' : 'Sin conexión'}
            </span>
          </div>
        </header>

        <main class="kiosk-body">
          <!-- Zona de escaneo QR (cámara) -->
          <div id="kiosk-scan-zone" class="scan-zone">
            <div class="scan-overlay">
              <div class="scan-overlay-tl"></div>
              <div class="scan-overlay-tr"></div>
              <div class="scan-overlay-bl"></div>
              <div class="scan-overlay-br"></div>
              <div class="scan-line"></div>
              <div id="kiosk-scanner" style="position:absolute;inset:0;overflow:hidden;border-radius:4px;"></div>
            </div>
          </div>

          <!-- Input manual / pistola USB -->
          <div class="kiosk-manual-input">
            <input id="kiosk-manual" type="text"
              placeholder="Código manual o pistola (Enter para buscar)"
              maxlength="128" autocomplete="off">
            <button class="btn btn-secondary" id="kiosk-manual-btn">Buscar</button>
          </div>

          <!-- Panel de resultado del escaneo (oculto por defecto) -->
          <div id="kiosk-result-panel" class="kiosk-result" style="display:none"></div>
        </main>
      </div>
    `;

    // Conectividad
    this._onlineHandler  = () => this._updateOnline();
    this._offlineHandler = () => this._updateOnline();
    window.addEventListener('online',  this._onlineHandler);
    window.addEventListener('offline', this._offlineHandler);

    // Input manual y pistola USB
    const manualInput = this.container.querySelector('#kiosk-manual');
    const manualBtn   = this.container.querySelector('#kiosk-manual-btn');
    manualInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._searchCode(manualInput.value.trim());
      }
    });
    manualBtn.addEventListener('click', () => this._searchCode(manualInput.value.trim()));

    // Auto-focus para pistola USB
    manualInput.focus();

    // Pre-cargar datos
    await this._loadData();

    // Iniciar escáner QR (cámara)
    this._scanner = new Scanner({
      container: this.container.querySelector('#kiosk-scanner'),
      onScan:  (code) => this._onScan(code),
      onError: (err)  => {
        console.warn('[KioskView] Camera no disponible:', err.message);
        const overlay = this.container.querySelector('.scan-overlay');
        if (overlay) {
          // Detener animación de scan line
          overlay.querySelector('.scan-line')?.remove();
          // Mostrar mensaje
          const msg = document.createElement('p');
          msg.style.cssText = 'color:var(--text-muted);font-size:13px;text-align:center;padding:20px;position:absolute;bottom:8px;left:0;right:0';
          msg.textContent = 'Cámara no disponible — usá el código manual o la pistola USB.';
          overlay.appendChild(msg);
        }
      },
    });
    await this._scanner.start();
  }

  destroy() {
    window.removeEventListener('online',  this._onlineHandler);
    window.removeEventListener('offline', this._offlineHandler);
    this._scanner?.stop();
  }

  // ──────────────────────────────────────────────────────
  // CARGA DE DATOS (offline-first)
  // ──────────────────────────────────────────────────────

  async _loadData() {
    try {
      const [kitsRes, usersRes, ubicsRes] = await Promise.all([
        kitsApi.listar(),
        usuariosApi.listar(),
        ubicacionesApi.listar(),
      ]);
      this._allKits     = kitsRes.data   || [];
      this._usuarios    = (usersRes.data || []).filter(u => u.rol !== 'kiosco');
      this._ubicaciones = ubicsRes.data  || [];

      // Guardar en cache para modo offline
      await Promise.all([
        cache.set('kiosk_kits',        this._allKits),
        cache.set('kiosk_usuarios',    this._usuarios),
        cache.set('kiosk_ubicaciones', this._ubicaciones),
      ]);
    } catch (_err) {
      // Fallback a cache
      const [ck, cu, cl] = await Promise.all([
        cache.get('kiosk_kits'),
        cache.get('kiosk_usuarios'),
        cache.get('kiosk_ubicaciones'),
      ]);
      this._allKits     = ck?.value ?? [];
      this._usuarios    = cu?.value ?? [];
      this._ubicaciones = cl?.value ?? [];

      if (!this._allKits.length) {
        Toast.show(
          'Sin datos cacheados. Conectate a la red al menos una vez para habilitar modo offline.',
          'warning', 0
        );
      } else {
        Toast.show('Modo offline — usando datos cacheados', 'warning', 3000);
      }
    }
  }

  // ──────────────────────────────────────────────────────
  // BÚSQUEDA DE KIT POR QR
  // ──────────────────────────────────────────────────────

  _onScan(codigo) {
    this._searchCode(codigo);
  }

  _searchCode(codigo) {
    if (!codigo || this._state === 'processing') return;

    const kit = this._allKits.find(
      k => k.codigo_qr === codigo || k.codigo === codigo
    );

    if (!kit) {
      this._flashError(`Código no reconocido: ${codigo}`);
      const m = this.container.querySelector('#kiosk-manual');
      if (m) m.value = '';
      return;
    }

    this._showKitPanel(kit);
  }

  // ──────────────────────────────────────────────────────
  // PANEL DE RESULTADO
  // ──────────────────────────────────────────────────────

  _showKitPanel(kit) {
    this._kit = kit;
    this._state = 'found';

    const panel = this.container.querySelector('#kiosk-result-panel');
    if (!panel) return;
    panel.style.display = 'block';

    const estadoLabels = {
      disponible:    { cls: 'badge-green',  label: 'Disponible' },
      en_uso:        { cls: 'badge-yellow', label: 'En uso' },
      incompleto:    { cls: 'badge-red',    label: 'Incompleto' },
      en_reparacion: { cls: 'badge-red',    label: 'En reparación' },
    };
    const estadoInfo = estadoLabels[kit.estado] || { cls: 'badge-default', label: kit.estado };

    const canCheckout = kit.estado === 'disponible';
    const canCheckin  = kit.estado === 'en_uso';

    const cancelCol = (canCheckout && canCheckin) ? '1 / -1' :
                      (canCheckout || canCheckin)  ? '2 / -1' : '1 / -1';

    panel.innerHTML = `
      <div class="kiosk-result-card fade-in">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span class="badge ${estadoInfo.cls}" style="font-size:12px;padding:4px 10px">
            ${estadoInfo.label}
          </span>
          <span class="kiosk-result-meta">${this._esc(kit.codigo)}</span>
        </div>
        <div class="kiosk-result-title">${this._esc(kit.nombre)}</div>
        ${kit.descripcion
          ? `<div class="kiosk-result-meta" style="margin-top:4px">${this._esc(kit.descripcion)}</div>`
          : ''}
        <div style="margin-top:6px;font-size:12px;color:var(--text-muted)">
          ${kit.componentes?.length ?? 0} componente${(kit.componentes?.length ?? 0) !== 1 ? 's' : ''}
        </div>
      </div>

      <div class="kiosk-actions">
        ${canCheckout ? `
          <button class="btn-kiosk btn-kiosk-checkout" id="btn-checkout" aria-label="Entregar kit">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="20 12 20 22 4 22 4 12"/>
              <polyline points="22 7 12 2 2 7"/>
              <line x1="12" y1="22" x2="12" y2="2"/>
            </svg>
            <span>Entregar</span>
          </button>` : ''}

        ${canCheckin ? `
          <button class="btn-kiosk btn-kiosk-checkin" id="btn-checkin" aria-label="Recibir kit devuelto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="20 12 20 22 4 22 4 12"/>
              <polyline points="22 7 12 2 2 7"/>
              <line x1="12" y1="22" x2="12" y2="2" transform="rotate(180 12 12)"/>
            </svg>
            <span>Recibir</span>
          </button>` : ''}

        ${!canCheckout && !canCheckin ? `
          <div class="alert alert-warning" style="grid-column:1/-1">
            Kit no disponible para operaciones en este momento (${estadoInfo.label}).
          </div>` : ''}

        <button class="btn-kiosk btn-kiosk-cancel" id="btn-cancel"
          style="grid-column:${cancelCol}" aria-label="Cancelar y volver al escáner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          <span>Cancelar</span>
        </button>
      </div>
    `;

    this.container.querySelector('#btn-checkout')
      ?.addEventListener('click', () => this._startCheckout());
    this.container.querySelector('#btn-checkin')
      ?.addEventListener('click',  () => this._startCheckin());
    this.container.querySelector('#btn-cancel')
      ?.addEventListener('click',   () => this._resetToIdle());
  }

  // ──────────────────────────────────────────────────────
  // CHECKOUT
  // ──────────────────────────────────────────────────────

  async _startCheckout() {
    const kit = this._kit;

    const formEl = document.createElement('div');

    const solicitanteOpts = this._usuarios.map(u =>
      `<option value="${u.id}">${this._esc(u.nombre)} (${u.rol})</option>`
    ).join('');

    const ubicacionOpts = this._ubicaciones.map(u =>
      `<option value="${u.id}">${this._esc(u.nombre)}</option>`
    ).join('');

    formEl.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="co-solicitante">Solicitante</label>
        <select class="form-control" id="co-solicitante">
          <option value="">— Sin especificar —</option>
          ${solicitanteOpts}
        </select>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label class="form-label" for="co-ubicacion">Destino (opcional)</label>
        <select class="form-control" id="co-ubicacion">
          <option value="">— Sin especificar —</option>
          ${ubicacionOpts}
        </select>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label class="form-label" for="co-notas">Notas (opcional)</label>
        <textarea class="form-control" id="co-notas" rows="2"
          placeholder="Ej: préstamo para clase de física..."
          maxlength="512"></textarea>
      </div>
    `;

    const confirmed = await this._showFormModal(
      `Entregar: ${kit.nombre}`,
      formEl,
      'Confirmar entrega'
    );
    if (!confirmed) return;

    const body = {};
    const sol  = formEl.querySelector('#co-solicitante').value;
    const ubi  = formEl.querySelector('#co-ubicacion').value;
    const nota = formEl.querySelector('#co-notas').value.trim();
    if (sol)  body.solicitante_id = sol;
    if (ubi)  body.ubicacion_destino_id = ubi;
    if (nota) body.notas = nota;

    await this._executeWithState(async () => {
      const res = await kitsApi.checkout(kit.id, body);

      if (res.queued) {
        Toast.show('Entrega encolada (se sincronizará al reconectar red)', 'warning');
      } else {
        Toast.show(
          `✓ Kit "${kit.nombre}" entregado — Despacho ${res.despacho?.codigo ?? ''}`,
          'success', 5000
        );
      }

      // Actualizar estado local sin recargar
      const idx = this._allKits.findIndex(k => k.id === kit.id);
      if (idx >= 0) this._allKits[idx] = { ...this._allKits[idx], estado: 'en_uso' };

      this._resetToIdle();
    });
  }

  // ──────────────────────────────────────────────────────
  // CHECKIN
  // ──────────────────────────────────────────────────────

  async _startCheckin() {
    const kit = this._kit;

    if (!navigator.onLine) {
      Toast.show(
        'Necesitás conexión para registrar una devolución (se requiere ID del despacho activo)',
        'warning', 6000
      );
      return;
    }

    // Obtener despacho activo
    let despacho;
    try {
      const res = await kitsApi.despachoActivo(kit.id);
      despacho = res.data;
    } catch (err) {
      Toast.show(
        (err.status === 404 || err.message?.includes('404'))
          ? 'No se encontró un despacho activo para este kit'
          : `Error al obtener despacho: ${err.message}`,
        'error'
      );
      return;
    }

    // Construir formulario de componentes
    const formEl = document.createElement('div');
    const componentes = kit.componentes || [];

    const componentRows = componentes.map((comp, i) => {
      const nombre = comp.producto?.nombre ?? 'Componente';
      const serie  = comp.activoFijo?.numero_serie ?? null;
      const esRetornable = !!comp.activoFijo;

      return `
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:8px"
          data-comp-idx="${i}">
          <div style="font-weight:600;margin-bottom:8px;font-size:var(--text-sm)">
            ${this._esc(nombre)}
            ${serie ? `<span style="color:var(--text-muted);font-weight:400;font-size:11px;margin-left:6px">S/N: ${this._esc(serie)}</span>` : ''}
          </div>
          ${esRetornable ? `
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px">
                <input type="radio" name="estado_comp_${i}" value="funcional" checked>
                <span style="color:var(--success)">Funcional</span>
              </label>
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px">
                <input type="radio" name="estado_comp_${i}" value="dañado">
                <span style="color:var(--danger)">Dañado</span>
              </label>
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px">
                <input type="radio" name="estado_comp_${i}" value="requiere_reparacion">
                <span style="color:var(--warning)">Requiere reparación</span>
              </label>
            </div>
          ` : `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px">
              <label style="color:var(--text-secondary)">Cantidad devuelta:</label>
              <input type="number" class="form-control" style="width:80px"
                min="0" max="${comp.cantidad}" value="${comp.cantidad}"
                data-qty-idx="${i}">
              <span style="color:var(--text-muted)">de ${comp.cantidad}</span>
            </div>
          `}
          <input type="text" class="form-control"
            placeholder="Notas sobre este ítem (opcional)" maxlength="256"
            data-notes-idx="${i}" style="font-size:12px">
        </div>
      `;
    }).join('');

    formEl.innerHTML = `
      ${componentes.length === 0
        ? '<p style="color:var(--text-muted);font-size:var(--text-sm)">Este kit no tiene componentes registrados.</p>'
        : `<div style="margin-bottom:12px;font-size:var(--text-sm);color:var(--text-secondary)">
             Revisá el estado de cada componente antes de confirmar:
           </div>
           ${componentRows}`
      }
      <div class="form-group" style="margin-top:12px">
        <label class="form-label" for="ci-notas">Notas generales (opcional)</label>
        <textarea class="form-control" id="ci-notas" rows="2"
          maxlength="512" placeholder="Ej: devuelto con manchas en el estuche..."></textarea>
      </div>
    `;

    const confirmed = await this._showFormModal(
      `Recibir: ${kit.nombre}`,
      formEl,
      'Confirmar devolución',
      'lg'
    );
    if (!confirmed) return;

    // Construir items_devueltos desde el formulario
    const items_devueltos = componentes.map((comp, i) => {
      if (comp.activoFijo) {
        const estado = formEl.querySelector(`input[name="estado_comp_${i}"]:checked`)?.value ?? 'funcional';
        const notas  = formEl.querySelector(`[data-notes-idx="${i}"]`)?.value.trim() || null;
        return { activo_fijo_id: comp.activoFijo.id, estado, notas };
      } else {
        const cantEl            = formEl.querySelector(`[data-qty-idx="${i}"]`);
        const cantidad_devuelta = Math.max(0, parseInt(cantEl?.value ?? comp.cantidad, 10));
        const notas             = formEl.querySelector(`[data-notes-idx="${i}"]`)?.value.trim() || null;
        return { producto_id: comp.producto_id, cantidad_devuelta, notas };
      }
    });

    const notasGenerales = formEl.querySelector('#ci-notas')?.value.trim() || undefined;

    await this._executeWithState(async () => {
      const res = await kitsApi.checkin(kit.id, {
        despacho_id: despacho.id,
        items_devueltos,
        notas: notasGenerales,
      });

      const ticketCount = res.tickets_mantenimiento?.length ?? 0;
      let msg = `✓ Kit "${kit.nombre}" recibido — ${res.kit?.estado_nuevo?.replaceAll('_', ' ') ?? ''}`;
      if (ticketCount > 0) {
        msg += `. ${ticketCount} ticket${ticketCount > 1 ? 's' : ''} de mantenimiento generado${ticketCount > 1 ? 's' : ''}.`;
      }
      Toast.show(msg, 'success', 7000);

      const idx = this._allKits.findIndex(k => k.id === kit.id);
      if (idx >= 0) {
        this._allKits[idx] = {
          ...this._allKits[idx],
          estado: res.kit?.estado_nuevo ?? 'disponible',
        };
      }

      this._resetToIdle();
    });
  }

  // ──────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────

  _showFormModal(title, formEl, confirmText, size = 'sm') {
    return new Promise(resolve => {
      const modal = new Modal({ title, content: formEl, confirmText, cancelText: 'Cancelar', size });
      modal.onConfirm(() => { modal.hide(); resolve(true); });
      modal.onCancel(()  => { modal.hide(); resolve(false); });
      modal.show();
    });
  }

  async _executeWithState(fn) {
    this._state = 'processing';
    const panel = this.container.querySelector('#kiosk-result-panel');
    if (panel) {
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;padding:40px;gap:16px">
          <div class="spinner spinner-lg"></div>
          <span style="color:var(--text-secondary)">Procesando...</span>
        </div>
      `;
    }

    try {
      await fn();
    } catch (err) {
      Toast.show(err.message || 'Error al procesar la operación', 'error');
      if (this._kit) this._showKitPanel(this._kit);
      else this._resetToIdle();
    } finally {
      this._state = 'idle';
    }
  }

  _resetToIdle() {
    this._kit   = null;
    this._state = 'idle';

    const panel = this.container.querySelector('#kiosk-result-panel');
    if (panel) panel.style.display = 'none';

    const manualInput = this.container.querySelector('#kiosk-manual');
    if (manualInput) {
      manualInput.value = '';
      manualInput.focus();
    }
  }

  _updateOnline() {
    const dot = this.container.querySelector('#kiosk-online-dot');
    if (!dot) return;
    dot.className = `badge ${navigator.onLine ? 'badge-green' : 'badge-red'}`;
    dot.textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
  }

  _flashError(msg) {
    Toast.show(msg, 'error');
    const zone = this.container.querySelector('#kiosk-scan-zone');
    if (zone) {
      zone.style.filter = 'brightness(0.4) sepia(1) hue-rotate(-30deg)';
      setTimeout(() => { if (zone.isConnected) zone.style.filter = ''; }, 500);
    }
  }

  _esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
