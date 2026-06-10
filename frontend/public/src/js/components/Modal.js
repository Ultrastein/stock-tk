// Reusable modal dialog.
// Usage:
//   new Modal({ title, content, confirmText, danger }).show().onConfirm(fn)
//   await Modal.confirm({ title, message, danger }) // returns true/false

export class Modal {
  constructor({ title = 'Confirmación', content = '', confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, size = 'md' } = {}) {
    this.options = { title, content, confirmText, cancelText, danger, size };
    this._onConfirm = null;
    this._onCancel  = null;
    this._el        = null;
    this._build();
  }

  _build() {
    const maxW = { sm: '400px', md: '560px', lg: '720px' }[this.options.size] || '560px';
    const confirmClass = this.options.danger ? 'btn btn-danger' : 'btn btn-primary';

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(0,0,0,.7)',
      zIndex: '9000', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '16px',
      animation: 'fadeIn .15s ease',
    });

    overlay.innerHTML = `
      <div class="card" style="max-width:${maxW};width:100%;max-height:90dvh;display:flex;flex-direction:column;animation:slideUp .2s ease">
        <div class="card-header">
          <h3 class="card-title"></h3>
          <button class="btn btn-ghost btn-icon btn-close" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" style="flex:1;min-height:0;overflow-y:auto;padding-bottom:4px"></div>
        <div style="display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;padding-top:16px">
          <button class="btn btn-secondary btn-cancel">${this.options.cancelText}</button>
          <button class="${confirmClass} btn-confirm">${this.options.confirmText}</button>
        </div>
      </div>
    `;

    // Fix 1: set title via textContent to prevent XSS
    overlay.querySelector('.card-title').textContent = this.options.title;

    // Fix 6: ARIA role on modal dialog
    const card = overlay.querySelector('.card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'modal-dialog-title');
    overlay.querySelector('.card-title').id = 'modal-dialog-title';

    const body = overlay.querySelector('.modal-body');
    if (typeof this.options.content === 'string') {
      body.innerHTML = this.options.content;
    } else {
      body.appendChild(this.options.content);
    }

    overlay.querySelector('.btn-close').addEventListener('click',   () => this._cancel());
    overlay.querySelector('.btn-cancel').addEventListener('click',  () => this._cancel());
    overlay.querySelector('.btn-confirm').addEventListener('click', () => this._confirm());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._cancel(); });

    this._keyHandler = (e) => { if (e.key === 'Escape') this._cancel(); };
    this._el = overlay;
  }

  show() {
    if (this._el.isConnected) return this;  // guard against duplicate calls
    document.body.appendChild(this._el);
    document.addEventListener('keydown', this._keyHandler);
    setTimeout(() => this._el.querySelector('.btn-confirm')?.focus(), 50);
    return this;
  }

  hide() {
    if (!this._el.isConnected) return this;  // idempotency guard
    this._el.style.opacity    = '0';
    this._el.style.transition = 'opacity .15s';
    setTimeout(() => {
      this._el.remove();
      document.removeEventListener('keydown', this._keyHandler);
    }, 150);
    return this;
  }

  onConfirm(fn) { this._onConfirm = fn; return this; }
  onCancel(fn)  { this._onCancel  = fn; return this; }

  _confirm() { this.hide(); if (this._onConfirm) this._onConfirm(); }
  _cancel()  { this.hide(); if (this._onCancel)  this._onCancel();  }

  static confirm({ title, message, confirmText = 'Confirmar', danger = false } = {}) {
    return new Promise(resolve => {
      const p = document.createElement('p');
      p.style.color = 'var(--text-primary)';
      p.textContent = message;
      const m = new Modal({ title, content: p, confirmText, danger });
      m.onConfirm(() => { m.hide(); resolve(true); });
      m.onCancel(()  => { m.hide(); resolve(false); });
      m.show();
    });
  }
}

export default Modal;
