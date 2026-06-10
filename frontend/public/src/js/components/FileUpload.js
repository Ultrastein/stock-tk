/**
 * FileUpload — drag-and-drop file upload component.
 *
 * Usage:
 *   const fu = new FileUpload({
 *     container: document.getElementById('upload-zone'),
 *     accept: '.xlsx,.xls,.csv',
 *     maxMB: 20,
 *     onFile: async (file) => { ... },    // called with File object
 *   });
 *   fu.reset();    // clear state, re-show dropzone
 */

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                            // .xls
  'text/csv',
  'text/plain',  // some systems report CSV as text/plain
];

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class FileUpload {
  constructor({ container, accept = '.xlsx,.xls,.csv', maxMB = 20, onFile }) {
    this._container = container;
    this._accept    = accept;
    this._maxBytes  = maxMB * 1024 * 1024;
    this._onFile    = onFile;
    this._render();
  }

  reset() {
    this._render();
  }

  _render() {
    this._container.innerHTML = `
      <div class="file-dropzone" role="button" tabindex="0" aria-label="Zona de carga de archivos. Haga clic o arrastre un archivo aquí.">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p style="color:var(--text-primary);font-weight:600;margin:8px 0 4px">Arrastrá el archivo aquí</p>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin:0">o <span class="fu-browse" style="color:var(--accent);cursor:pointer;text-decoration:underline">buscá en tu equipo</span></p>
        <p style="color:var(--text-secondary);font-size:var(--text-xs,11px);margin:8px 0 0">Formatos: ${this._accept} · Máx. ${this._maxBytes / 1024 / 1024} MB</p>
        <input type="file" accept="${this._accept}" style="display:none" aria-hidden="true">
      </div>
    `;

    this._applyDropzoneStyles();
    this._wireEvents();
  }

  _applyDropzoneStyles() {
    const dz = this._container.querySelector('.file-dropzone');
    Object.assign(dz.style, {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', border: '2px dashed var(--border)',
      borderRadius: 'var(--radius)', padding: '40px 24px',
      textAlign: 'center', transition: 'border-color .2s, background .2s',
      cursor: 'pointer',
    });
  }

  _wireEvents() {
    const dz    = this._container.querySelector('.file-dropzone');
    const input = this._container.querySelector('input[type="file"]');
    const browse = this._container.querySelector('.fu-browse');

    // Click / keyboard
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    browse.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
    input.addEventListener('change', () => { if (input.files[0]) this._handleFile(input.files[0]); });

    // Drag & drop
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.style.borderColor = 'var(--accent)';
      dz.style.background  = 'var(--bg-hover, rgba(99,102,241,.06))';
    });
    dz.addEventListener('dragleave', (e) => {
      if (dz.contains(e.relatedTarget)) return; // still inside dropzone
      dz.style.borderColor = 'var(--border)';
      dz.style.background  = '';
    });
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.style.borderColor = 'var(--border)';
      dz.style.background  = '';
      const file = e.dataTransfer.files[0];
      if (file) this._handleFile(file);
    });
  }

  _handleFile(file) {
    // Size check
    if (file.size > this._maxBytes) {
      this._showError(`El archivo excede el límite de ${this._maxBytes / 1024 / 1024} MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    // Type check (MIME or extension fallback)
    const extOk = this._accept.split(',').some(ext => file.name.toLowerCase().endsWith(ext.trim()));
    const mimeOk = ALLOWED_TYPES.includes(file.type);
    if (!extOk && !mimeOk) {
      this._showError(`Formato no permitido: ${esc(file.name)}. Use ${this._accept}`);
      return;
    }
    // Show preview
    this._showPreview(file);
    if (this._onFile) this._onFile(file);
  }

  _showPreview(file) {
    const dz = this._container.querySelector('.file-dropzone');
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    dz.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="1.5" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <p style="color:var(--text-primary);font-weight:600;margin:8px 0 4px;word-break:break-all">${esc(file.name)}</p>
      <p style="color:var(--text-secondary);font-size:var(--text-sm);margin:0">${sizeMB} MB</p>
      <button class="btn btn-ghost btn-sm fu-reset" style="margin-top:12px">Cambiar archivo</button>
    `;
    this._container.querySelector('.fu-reset').addEventListener('click', (e) => {
      e.stopPropagation();
      this.reset();
    });
  }

  _showError(msg) {
    const dz = this._container.querySelector('.file-dropzone');
    dz.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p class="fu-err-msg" style="color:var(--danger);font-weight:600;margin:8px 0 4px"></p>
      <button class="btn btn-ghost btn-sm fu-retry" style="margin-top:8px">Intentar de nuevo</button>
    `;
    this._container.querySelector('.fu-err-msg').textContent = msg;
    this._container.querySelector('.fu-retry').addEventListener('click', (e) => {
      e.stopPropagation();
      this.reset();
    });
  }
}

export default FileUpload;
