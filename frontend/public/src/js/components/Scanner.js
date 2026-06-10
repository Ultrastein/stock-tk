/**
 * Scanner — QR/Barcode scanner component.
 *
 * Supports two modes:
 *   - camera: uses html5-qrcode library (requires CDN global Html5Qrcode)
 *   - keyboard: listens for rapid keystrokes followed by Enter (USB gun)
 *
 * Usage:
 *   const scanner = new Scanner({
 *     container: document.getElementById('scan-zone'),
 *     mode: 'camera' | 'keyboard' | 'both',  // default 'both'
 *     onScan: (code) => { ... },
 *     onError: (err) => { ... },              // optional
 *     fps: 10,                                 // camera fps, default 10
 *     qrbox: 250,                              // scan box size, default 250
 *   });
 *   scanner.start();    // activate camera or keyboard listener
 *   scanner.stop();     // clean up camera and listeners
 *   scanner.setMode('keyboard');   // switch mode at runtime
 */

const CDN_TIMEOUT_MS = 10000; // wait up to 10s for CDN library to load
const GUN_MAX_GAP_MS = 100;   // keystrokes within 100ms are considered a barcode sequence
const GUN_MIN_LENGTH = 3;     // minimum code length from gun

function waitForHtml5Qrcode() {
  return new Promise((resolve, reject) => {
    if (window.Html5Qrcode) { resolve(); return; }
    const start = Date.now();
    const poll  = setInterval(() => {
      if (window.Html5Qrcode) { clearInterval(poll); resolve(); return; }
      if (Date.now() - start > CDN_TIMEOUT_MS) {
        clearInterval(poll);
        reject(new Error('html5-qrcode CDN library not loaded after ' + CDN_TIMEOUT_MS + 'ms'));
        return; // prevent second rejection on next interval tick
      }
    }, 200);
  });
}

export class Scanner {
  constructor({ container, mode = 'both', onScan, onError, fps = 10, qrbox = 250 } = {}) {
    this._container = container;
    this._mode      = mode;
    this._onError   = onError || ((e) => console.warn('[Scanner]', e));
    const rawOnScan = onScan || (() => {});
    this._onScan = (code) => {
      try { rawOnScan(code); }
      catch (e) { this._onError(e); }
    };
    this._fps       = fps;
    this._qrbox     = qrbox;
    this._html5qr   = null;
    this._cameraId  = null;
    this._cameraRunning  = false;
    this._cameraAborted  = false;
    this._cameraElId     = 'sc-cam-' + Math.random().toString(36).slice(2, 8);
    this._keyboardBuffer = '';
    this._lastKeyTime    = 0;
    this._keyHandler     = null;
    this._transitioning  = false;
    this._render();
  }

  // ── Public API ──────────────────────────────────────────────

  async start() {
    if (this._mode === 'camera' || this._mode === 'both') {
      await this._startCamera();
    }
    if (this._mode === 'keyboard' || this._mode === 'both') {
      this._startKeyboard();
    }
  }

  async stop() {
    await this._stopCamera();
    this._stopKeyboard();
  }

  async setMode(mode) {
    if (this._transitioning) return;
    this._transitioning = true;
    try {
      await this.stop();
      this._mode = mode;
      this._render();
      await this.start();
    } finally {
      this._transitioning = false;
    }
  }

  // ── Camera ──────────────────────────────────────────────────

  async _startCamera() {
    if (this._cameraRunning) return;
    this._cameraAborted = false;
    try {
      await waitForHtml5Qrcode();
      if (this._cameraAborted) return;

      const scanEl = this._container.querySelector('.scan-camera-target');
      if (!scanEl || this._cameraAborted) return;

      this._html5qr = new window.Html5Qrcode(scanEl.id);

      await this._html5qr.start(
        { facingMode: 'environment' },
        { fps: this._fps, qrbox: this._qrbox },
        (decodedText) => { this._cameraSuccess(decodedText); },
        () => {}
      );
      if (this._cameraAborted) {
        // start resolved but stop was requested — clean up
        try { await this._html5qr.stop(); this._html5qr.clear(); } catch (_) {}
        this._html5qr = null;
        return;
      }
      this._cameraRunning = true;
      this._showCameraStatus('active');
    } catch (err) {
      this._cameraAborted = false;
      this._cameraRunning = false;
      this._showCameraStatus('denied');
      this._onError(err);
    }
  }

  async _stopCamera() {
    this._cameraAborted = true;
    if (!this._html5qr || !this._cameraRunning) return;
    try {
      await this._html5qr.stop();
      this._html5qr.clear();
    } catch (_) { /* ignore if already stopped */ }
    this._html5qr   = null;
    this._cameraRunning = false;
  }

  _cameraSuccess(code) {
    if (!code || !code.trim()) return;
    this._flash('success');
    this._onScan(code.trim());
  }

  _showCameraStatus(state) {
    const statusEl = this._container.querySelector('.scan-status');
    if (!statusEl) return;
    const map = {
      active:  { text: 'Cámara activa — apuntá al código',  color: 'var(--success)' },
      denied:  { text: 'Cámara no disponible — usá el pistol o escribí el código manualmente', color: 'var(--warning)' },
    };
    const s = map[state] || {};
    statusEl.textContent = s.text || '';
    statusEl.style.color = s.color || 'var(--text-secondary)';
  }

  // ── Keyboard (USB gun) ───────────────────────────────────────

  _startKeyboard() {
    if (this._keyHandler) return;
    this._keyHandler = (e) => {
      // Ignore modifier-only or non-printable (Tab, Shift, etc.)
      if (e.key.length !== 1 && e.key !== 'Enter') return;
      // Ignore if focused on a real input (manual entry field)
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const now = Date.now();
      if (now - this._lastKeyTime > GUN_MAX_GAP_MS) {
        this._keyboardBuffer = '';
      }
      this._lastKeyTime = now;

      if (e.key === 'Enter') {
        const code = this._keyboardBuffer.trim();
        if (code.length >= GUN_MIN_LENGTH) {
          this._flash('success');
          this._onScan(code);
        }
        this._keyboardBuffer = '';
      } else {
        this._keyboardBuffer += e.key;
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  _stopKeyboard() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }

  // ── Manual input ────────────────────────────────────────────

  _wireManualInput() {
    const form  = this._container.querySelector('.scanner-manual-form');
    const input = this._container.querySelector('.scanner-manual-input');
    if (!form || !input) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = input.value.trim();
      if (code.length >= 1) {
        this._flash('success');
        this._onScan(code);
        input.value = '';
        input.focus();
      }
    });
  }

  // ── Visual feedback ─────────────────────────────────────────

  _flash(type) {
    const zone = this._container.querySelector('.scan-zone');
    if (!zone) return;
    const cls = type === 'success' ? 'scan-flash-success' : 'scan-flash-error';
    zone.classList.add(cls);
    setTimeout(() => zone.classList.remove(cls), 600);
  }

  // ── Render ──────────────────────────────────────────────────

  _render() {
    const showCamera = this._mode === 'camera' || this._mode === 'both';
    this._container.innerHTML = `
      <div class="scan-zone" style="position:relative;min-height:220px">
        ${showCamera ? `
          <div class="scan-camera-target" id="${this._cameraElId}" style="width:100%;min-height:220px;background:var(--bg-elevated,#1e293b)"></div>
          <div class="scan-overlay-tl"></div>
          <div class="scan-overlay-tr"></div>
          <div class="scan-overlay-bl"></div>
          <div class="scan-overlay-br"></div>
          <div class="scanLine"></div>
        ` : `
          <div style="display:flex;align-items:center;justify-content:center;min-height:220px;color:var(--text-secondary)">
            <div style="text-align:center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="7" x2="7" y2="17"/><line x1="11" y1="7" x2="11" y2="17"/><line x1="15" y1="7" x2="15" y2="11"/><line x1="15" y1="14" x2="15" y2="17"/>
              </svg>
              <p style="margin-top:8px;font-size:var(--text-sm)">Modo pistol activo</p>
            </div>
          </div>
        `}
      </div>
      <p class="scan-status" style="text-align:center;font-size:var(--text-sm);color:var(--text-secondary);margin:8px 0 0" aria-live="polite"></p>
      <div class="kiosk-manual-input" style="margin-top:16px">
        <form class="scanner-manual-form" style="display:flex;gap:8px">
          <input
            class="form-control scanner-manual-input"
            type="text"
            placeholder="Ingresar código manualmente…"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            aria-label="Ingresar código manualmente"
            maxlength="512"
            style="flex:1"
          >
          <button type="submit" class="btn btn-primary">OK</button>
        </form>
      </div>
    `;

    // Add flash animation styles inline if not already present
    if (!document.getElementById('scanner-flash-styles')) {
      const style = document.createElement('style');
      style.id = 'scanner-flash-styles';
      style.textContent = `
        .scan-flash-success { outline: 3px solid var(--success) !important; animation: pulseSuccess .6s ease; }
        .scan-flash-error   { outline: 3px solid var(--danger)  !important; }
      `;
      document.head.appendChild(style);
    }

    this._wireManualInput();
  }
}

export default Scanner;
