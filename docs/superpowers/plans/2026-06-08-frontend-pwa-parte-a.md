# Frontend PWA — Plan de Implementación (Parte A: Infraestructura + Shell + Login)

> **Para agentes:** REQUIRED SUB-SKILL: Usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan sintaxis checkbox (`- [ ]`) para tracking.

**Goal:** Construir la capa base completa de la PWA: sistema CSS dark-mode, infraestructura JS offline-first (IndexedDB, state, API client, sync manager), componentes reutilizables y shell SPA con routing por hash y login funcional.

**Architecture:** Vanilla JS ES2022+ (ES modules con `type="module"`), CSS custom properties para theming, routing hash-based (`#/ruta`), IndexedDB para offline queue, `fetch` con fallback a cola offline. Sin frameworks, sin build step — servido estáticamente desde `frontend/public/` por `http-server`.

**Tech Stack:** Vanilla JS ES2022, CSS custom properties, IndexedDB nativo, html5-qrcode v2.3 (CDN), Service Worker ya existente en `frontend/public/sw.js`.

**API Backend:** `http://localhost:3000/api` — todas las rutas salvo `/api/auth/login` requieren `Authorization: Bearer <token>`. Token viene del endpoint `POST /api/auth/login → { token, usuario: { id, email, nombre, rol } }`.

**Roles:** `admin` (acceso total), `kiosco` (solo kiosco), `docente` (dashboard limitado + reservas + pedidos).

**Convención de paths:** Todo archivo nuevo va dentro de `frontend/public/src/`. El SW pre-cachea paths con `/src/` como prefijo.

---

## Mapa de archivos

| Archivo | Tarea | Descripción |
|---------|-------|-------------|
| `frontend/public/index.html` | Task 9 | Shell SPA, carga todos los módulos |
| `frontend/public/src/css/variables.css` | Task 1 | Design tokens (colores, spacing, tipografía) |
| `frontend/public/src/css/base.css` | Task 1 | Reset + estilos globales |
| `frontend/public/src/css/components.css` | Task 1 | btn, card, badge, form, table |
| `frontend/public/src/css/layouts.css` | Task 1 | sidebar, header, main-content |
| `frontend/public/src/css/kiosk.css` | Task 1 | Modo pistola escaneo |
| `frontend/public/src/css/animations.css` | Task 1 | Transitions, spinner, skeleton |
| `frontend/public/src/js/store/db.js` | Task 2 | Wrapper IndexedDB (Promise-based) |
| `frontend/public/src/js/store/state.js` | Task 3 | Observable global state |
| `frontend/public/src/js/api/client.js` | Task 4 | Fetch wrapper + cola offline |
| `frontend/public/src/js/api/endpoints.js` | Task 4 | Mapeo operación → URL+method |
| `frontend/public/src/js/store/syncManager.js` | Task 5 | Cola offline + Background Sync |
| `frontend/public/src/js/components/Toast.js` | Task 6 | Notificaciones toast |
| `frontend/public/src/js/components/Modal.js` | Task 6 | Dialog modal reutilizable |
| `frontend/public/src/js/components/DataTable.js` | Task 7 | Tabla con sort, filtro, paginado |
| `frontend/public/src/js/components/FileUpload.js` | Task 7 | Drag & drop CSV/Excel |
| `frontend/public/src/js/components/Scanner.js` | Task 8 | Escáner QR/barras via cámara |
| `frontend/public/src/js/app.js` | Task 9 | SPA router + auth guard |
| `frontend/public/src/js/views/auth.js` | Task 10 | Vista Login |

---

### Task 1: Sistema CSS (6 archivos)

**Files:**
- Create: `frontend/public/src/css/variables.css`
- Create: `frontend/public/src/css/base.css`
- Create: `frontend/public/src/css/components.css`
- Create: `frontend/public/src/css/layouts.css`
- Create: `frontend/public/src/css/kiosk.css`
- Create: `frontend/public/src/css/animations.css`

- [ ] **Paso 1: Crear variables.css**

```css
/* frontend/public/src/css/variables.css */
:root {
  /* ── Paleta base (dark mode permanente) ── */
  --bg-base:       #0f172a;   /* slate-900 */
  --bg-surface:    #1e293b;   /* slate-800 */
  --bg-elevated:   #293548;   /* slate-750 */
  --border:        #334155;   /* slate-700 */
  --border-light:  #475569;   /* slate-600 */

  /* ── Texto ── */
  --text-primary:  #f1f5f9;   /* slate-100 */
  --text-secondary:#94a3b8;   /* slate-400 */
  --text-muted:    #64748b;   /* slate-500 */

  /* ── Acento primario ── */
  --accent:        #6366f1;   /* indigo-500 */
  --accent-hover:  #4f46e5;   /* indigo-600 */
  --accent-light:  #312e81;   /* indigo-900 (bg) */

  /* ── Estados semánticos ── */
  --success:       #22c55e;
  --success-bg:    #052e16;
  --warning:       #f59e0b;
  --warning-bg:    #451a03;
  --danger:        #ef4444;
  --danger-bg:     #450a0a;
  --info:          #38bdf8;
  --info-bg:       #082f49;

  /* ── Kiosco ── */
  --kiosk-accent:  #0ea5e9;   /* sky-500 */
  --kiosk-scan-bg: #020617;

  /* ── Spacing (escala 4px) ── */
  --sp-1: 4px;   --sp-2: 8px;   --sp-3: 12px;  --sp-4: 16px;
  --sp-5: 20px;  --sp-6: 24px;  --sp-8: 32px;  --sp-10: 40px;
  --sp-12: 48px; --sp-16: 64px;

  /* ── Tipografía ── */
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono:  'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  --text-xs:   11px;  --text-sm: 13px;  --text-base: 14px;
  --text-md:   16px;  --text-lg: 18px;  --text-xl:   20px;
  --text-2xl:  24px;  --text-3xl: 30px;

  /* ── Bordes ── */
  --radius-sm: 4px;  --radius: 8px;  --radius-lg: 12px;  --radius-xl: 16px;

  /* ── Sombras ── */
  --shadow-sm: 0 1px 2px rgba(0,0,0,.4);
  --shadow:    0 4px 12px rgba(0,0,0,.5);
  --shadow-lg: 0 8px 24px rgba(0,0,0,.6);

  /* ── Layout ── */
  --sidebar-w: 240px;
  --header-h:  56px;
  --transition: 150ms ease;
}
```

- [ ] **Paso 2: Crear base.css**

```css
/* frontend/public/src/css/base.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--text-primary);
  background: var(--bg-base);
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

h1 { font-size: var(--text-2xl); font-weight: 700; }
h2 { font-size: var(--text-xl);  font-weight: 600; }
h3 { font-size: var(--text-lg);  font-weight: 600; }
h4 { font-size: var(--text-md);  font-weight: 600; }

input, select, textarea, button { font: inherit; }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--border-light); }

/* Utilidades */
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.flex { display: flex; }
.flex-col { display: flex; flex-direction: column; }
.items-center { align-items: center; }
.gap-2 { gap: var(--sp-2); }
.gap-4 { gap: var(--sp-4); }
.text-secondary { color: var(--text-secondary); }
.text-success { color: var(--success); }
.text-danger  { color: var(--danger); }
.text-warning { color: var(--warning); }
.font-mono { font-family: var(--font-mono); font-size: var(--text-sm); }
```

- [ ] **Paso 3: Crear components.css**

```css
/* frontend/public/src/css/components.css */

/* ── Button ── */
.btn {
  display: inline-flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--radius); border: 1px solid transparent;
  font-size: var(--text-sm); font-weight: 500; cursor: pointer;
  transition: background var(--transition), opacity var(--transition);
  white-space: nowrap; user-select: none;
}
.btn:disabled { opacity: .4; cursor: not-allowed; }
.btn-primary  { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn-secondary { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border); }
.btn-secondary:hover:not(:disabled) { background: var(--border); }
.btn-danger   { background: var(--danger); color: #fff; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }
.btn-ghost    { background: transparent; color: var(--text-secondary); border-color: transparent; }
.btn-ghost:hover:not(:disabled) { background: var(--bg-elevated); color: var(--text-primary); }
.btn-sm { padding: var(--sp-1) var(--sp-3); font-size: var(--text-xs); }
.btn-lg { padding: var(--sp-3) var(--sp-6); font-size: var(--text-md); }
.btn-icon { padding: var(--sp-2); }

/* ── Card ── */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--sp-6);
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-4);
}
.card-title { font-size: var(--text-md); font-weight: 600; }

/* ── Form ── */
.form-group { display: flex; flex-direction: column; gap: var(--sp-1); }
.form-label { font-size: var(--text-sm); color: var(--text-secondary); font-weight: 500; }
.form-control {
  background: var(--bg-base); color: var(--text-primary);
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: var(--sp-2) var(--sp-3); font-size: var(--text-sm);
  transition: border-color var(--transition);
  width: 100%;
}
.form-control:focus { border-color: var(--accent); outline: none; }
.form-control.error { border-color: var(--danger); }
.form-error { font-size: var(--text-xs); color: var(--danger); }
.form-hint  { font-size: var(--text-xs); color: var(--text-muted); }
select.form-control option { background: var(--bg-surface); }

/* ── Badge ── */
.badge {
  display: inline-flex; align-items: center;
  padding: 2px var(--sp-2); border-radius: 999px;
  font-size: var(--text-xs); font-weight: 600; white-space: nowrap;
}
.badge-green    { background: var(--success-bg); color: var(--success); }
.badge-yellow   { background: var(--warning-bg); color: var(--warning); }
.badge-red      { background: var(--danger-bg);  color: var(--danger); }
.badge-blue     { background: var(--info-bg);    color: var(--info); }
.badge-default  { background: var(--bg-elevated);color: var(--text-secondary); }

/* ── Table ── */
.table-wrapper { overflow-x: auto; }
.table {
  width: 100%; border-collapse: collapse;
  font-size: var(--text-sm);
}
.table th {
  padding: var(--sp-3) var(--sp-4);
  text-align: left; font-weight: 600; color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  white-space: nowrap; cursor: pointer; user-select: none;
}
.table th:hover { color: var(--text-primary); }
.table td {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}
.table tr:last-child td { border-bottom: none; }
.table tbody tr:hover { background: var(--bg-elevated); }

/* ── Empty state ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: var(--sp-16); gap: var(--sp-4);
  color: var(--text-muted); text-align: center;
}
.empty-state svg { width: 48px; height: 48px; opacity: .4; }

/* ── Stat card ── */
.stat-card { display: flex; flex-direction: column; gap: var(--sp-2); }
.stat-value { font-size: var(--text-3xl); font-weight: 700; }
.stat-label { font-size: var(--text-sm); color: var(--text-secondary); }

/* ── Alert banner ── */
.alert {
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--radius); font-size: var(--text-sm);
  display: flex; align-items: flex-start; gap: var(--sp-3);
}
.alert-warning { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning); }
.alert-danger  { background: var(--danger-bg);  color: var(--danger);  border: 1px solid var(--danger); }
.alert-info    { background: var(--info-bg);    color: var(--info);    border: 1px solid var(--info); }
.alert-success { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }

/* ── Offline indicator ── */
#offline-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
  background: var(--warning); color: #000;
  text-align: center; padding: var(--sp-1) var(--sp-4);
  font-size: var(--text-xs); font-weight: 600;
  transform: translateY(-100%); transition: transform var(--transition);
}
#offline-bar.visible { transform: translateY(0); }
```

- [ ] **Paso 4: Crear layouts.css**

```css
/* frontend/public/src/css/layouts.css */

#app { height: 100dvh; display: flex; flex-direction: column; }

/* ── Login layout ── */
.layout-login {
  min-height: 100dvh; display: flex;
  align-items: center; justify-content: center;
  background: var(--bg-base);
  padding: var(--sp-4);
}
.login-box {
  width: 100%; max-width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--sp-8);
}
.login-logo { text-align: center; margin-bottom: var(--sp-6); }
.login-logo h1 { font-size: var(--text-xl); }
.login-logo p  { font-size: var(--text-sm); color: var(--text-secondary); }

/* ── App layout (con sidebar) ── */
.layout-app { display: flex; height: 100dvh; overflow: hidden; }

/* Sidebar */
.sidebar {
  width: var(--sidebar-w); background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  flex-shrink: 0; overflow-y: auto;
}
.sidebar-logo {
  padding: var(--sp-4) var(--sp-6);
  font-size: var(--text-md); font-weight: 700;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}
.sidebar-nav { flex: 1; padding: var(--sp-4) var(--sp-2); }
.nav-section-label {
  font-size: var(--text-xs); font-weight: 600; letter-spacing: .08em;
  color: var(--text-muted); text-transform: uppercase;
  padding: var(--sp-3) var(--sp-4) var(--sp-1);
}
.nav-item {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-4); border-radius: var(--radius);
  color: var(--text-secondary); font-size: var(--text-sm);
  cursor: pointer; transition: background var(--transition), color var(--transition);
  text-decoration: none;
}
.nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
.nav-item.active { background: var(--accent-light); color: var(--accent); font-weight: 500; }
.nav-item svg  { width: 16px; height: 16px; flex-shrink: 0; }
.sidebar-user  {
  padding: var(--sp-4); border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: var(--sp-3);
}
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--accent); display: flex; align-items: center;
  justify-content: center; font-size: var(--text-sm); font-weight: 700;
  flex-shrink: 0;
}

/* Main content */
.main-content {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
}
.page-header {
  padding: var(--sp-4) var(--sp-6);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: var(--sp-4);
  background: var(--bg-surface); flex-shrink: 0;
}
.page-header h1 { font-size: var(--text-xl); flex: 1; }
.page-body {
  flex: 1; overflow-y: auto;
  padding: var(--sp-6);
  display: flex; flex-direction: column; gap: var(--sp-6);
}

/* Grid */
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); }

@media (max-width: 900px) {
  .sidebar { width: 56px; }
  .sidebar-logo, .nav-section-label, .nav-item span, .sidebar-user .flex-col { display: none; }
  .nav-item { justify-content: center; padding: var(--sp-3); }
  .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  .page-body { padding: var(--sp-4); }
}
```

- [ ] **Paso 5: Crear kiosk.css**

```css
/* frontend/public/src/css/kiosk.css */

/* El kiosk ocupa toda la pantalla, sin sidebar */
.layout-kiosk {
  min-height: 100dvh; background: var(--kiosk-scan-bg);
  display: flex; flex-direction: column;
  overscroll-behavior: none; touch-action: manipulation;
}
.kiosk-header {
  padding: var(--sp-4) var(--sp-6);
  background: var(--bg-surface);
  border-bottom: 2px solid var(--kiosk-accent);
  display: flex; align-items: center; justify-content: space-between;
}
.kiosk-header h1 { font-size: var(--text-lg); color: var(--kiosk-accent); }
.kiosk-status {
  font-size: var(--text-sm); color: var(--text-secondary);
  display: flex; align-items: center; gap: var(--sp-2);
}
.kiosk-body { flex: 1; display: flex; flex-direction: column; }

/* Zona de escaneo */
.scan-zone {
  flex: 1; display: flex; align-items: center; justify-content: center;
  position: relative;
}
.scan-overlay {
  width: 260px; height: 260px; position: relative;
}
.scan-overlay::before, .scan-overlay::after {
  content: ''; position: absolute;
  width: 40px; height: 40px; border-color: var(--kiosk-accent);
  border-style: solid; border-width: 0;
}
.scan-overlay::before { top: 0; left: 0; border-top-width: 4px; border-left-width: 4px; }
.scan-overlay::after  { bottom: 0; right: 0; border-bottom-width: 4px; border-right-width: 4px; }
.scan-overlay-tl, .scan-overlay-tr, .scan-overlay-bl, .scan-overlay-br {
  position: absolute; width: 40px; height: 40px;
  border-style: solid; border-color: var(--kiosk-accent);
}
.scan-overlay-tl { top: 0; right: 0; border-top-width: 4px; border-right-width: 4px; }
.scan-overlay-bl { bottom: 0; left: 0; border-bottom-width: 4px; border-left-width: 4px; }

/* Video escáner */
#kiosk-scanner video { width: 260px; height: 260px; object-fit: cover; }

/* Resultado de escaneo */
.kiosk-result {
  padding: var(--sp-4) var(--sp-6);
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
}
.kiosk-result-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--sp-4);
  margin-bottom: var(--sp-4);
}
.kiosk-result-title { font-size: var(--text-lg); font-weight: 700; }
.kiosk-result-meta  { font-size: var(--text-sm); color: var(--text-secondary); }

/* Botones kiosk — grandes para touch */
.kiosk-actions {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: var(--sp-3); padding: var(--sp-4) var(--sp-6) var(--sp-6);
}
.btn-kiosk {
  padding: var(--sp-5); font-size: var(--text-lg); font-weight: 700;
  border-radius: var(--radius-lg); border: none; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: var(--sp-2);
  transition: transform 100ms, opacity var(--transition);
  min-height: 80px;
}
.btn-kiosk:active { transform: scale(.97); }
.btn-kiosk svg { width: 28px; height: 28px; }
.btn-kiosk-checkout { background: var(--kiosk-accent); color: #fff; }
.btn-kiosk-checkin  { background: var(--success);      color: #fff; }
.btn-kiosk-reserva  { background: var(--accent);        color: #fff; }
.btn-kiosk-cancel   { background: var(--bg-elevated);   color: var(--text-secondary); }

/* Input manual de código */
.kiosk-manual-input {
  display: flex; gap: var(--sp-2);
  padding: 0 var(--sp-6) var(--sp-4);
}
.kiosk-manual-input input {
  flex: 1; font-size: var(--text-lg); padding: var(--sp-3) var(--sp-4);
  background: var(--bg-base); border: 2px solid var(--border);
  border-radius: var(--radius); color: var(--text-primary);
  font-family: var(--font-mono);
}
.kiosk-manual-input input:focus { border-color: var(--kiosk-accent); outline: none; }
```

- [ ] **Paso 6: Crear animations.css**

```css
/* frontend/public/src/css/animations.css */

/* ── Spinner ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .7s linear infinite;
  flex-shrink: 0;
}
.spinner-lg { width: 40px; height: 40px; border-width: 3px; }

/* ── Skeleton loader ── */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.skeleton {
  border-radius: var(--radius);
  background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-elevated) 50%, var(--bg-surface) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-line { height: 16px; margin-bottom: var(--sp-2); }
.skeleton-line.short { width: 40%; }

/* ── Fade ── */
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.fade-in { animation: fadeIn .2s ease forwards; }

/* ── Slide ── */
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
.slide-up { animation: slideUp .25s ease forwards; }

/* ── Scan line (kiosk) ── */
@keyframes scanLine {
  0%, 100% { top: 10%; }
  50%       { top: 85%; }
}
.scan-line {
  position: absolute; left: 10%; right: 10%; height: 2px;
  background: var(--kiosk-accent);
  box-shadow: 0 0 8px var(--kiosk-accent);
  animation: scanLine 2s ease-in-out infinite;
}

/* ── Pulse success (kiosk feedback) ── */
@keyframes pulseSuccess {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,.6); }
  50%       { box-shadow: 0 0 0 20px rgba(34,197,94,0); }
}
.pulse-success { animation: pulseSuccess .6s ease; }
```

- [ ] **Paso 7: Verificar estilos**

Abrir `frontend/public/index.html` (aún no existe — crear uno temporal para verificar):

```html
<!DOCTYPE html><html lang="es">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="/src/css/variables.css">
  <link rel="stylesheet" href="/src/css/base.css">
  <link rel="stylesheet" href="/src/css/components.css">
  <link rel="stylesheet" href="/src/css/layouts.css">
  <link rel="stylesheet" href="/src/css/kiosk.css">
  <link rel="stylesheet" href="/src/css/animations.css">
</head>
<body>
  <div class="flex gap-4 items-center" style="padding:20px">
    <button class="btn btn-primary">Primario</button>
    <button class="btn btn-secondary">Secundario</button>
    <button class="btn btn-danger">Danger</button>
    <span class="badge badge-green">disponible</span>
    <span class="badge badge-red">dañado</span>
    <div class="spinner"></div>
  </div>
</body></html>
```

Ejecutar: `cd "frontend" && npx http-server public -p 5173 -c-1`

Abrir `http://localhost:5173` → verificar que los botones y badges tienen estilos dark-mode correctos. No deben aparecer fondos blancos.

- [ ] **Paso 8: Commit**

```bash
git add frontend/public/src/css/
git commit -m "feat(frontend): sistema CSS dark-mode completo (variables, base, components, layouts, kiosk, animations)"
```

---

### Task 2: Capa IndexedDB (db.js)

**Files:**
- Create: `frontend/public/src/js/store/db.js`

El SW ya define las object stores (`syncQueue`, `cachedData`, `userData`). Este módulo abre la misma DB y expone una API Promise-based.

- [ ] **Paso 1: Crear db.js**

```js
// frontend/public/src/js/store/db.js
// Wrapper Promise sobre IndexedDB.
// La misma base StockControlDB v1 que usa el Service Worker.

const DB_NAME    = 'StockControlDB';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cachedData')) {
        db.createObjectStore('cachedData', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

// Operación genérica sobre una store
function tx(storeName, mode, fn) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store       = transaction.objectStore(storeName);
      const req         = fn(store);
      req.onsuccess     = () => resolve(req.result);
      req.onerror       = () => reject(req.error);
    });
  });
}

// ── cachedData: clave/valor para datos leídos offline ──────
export const cache = {
  get:    (key)        => tx('cachedData', 'readonly',  s => s.get(key)),
  set:    (key, value) => tx('cachedData', 'readwrite', s => s.put({ key, value, ts: Date.now() })),
  delete: (key)        => tx('cachedData', 'readwrite', s => s.delete(key)),
  clear:  ()           => tx('cachedData', 'readwrite', s => s.clear()),
};

// ── userData: perfil usuario autenticado ───────────────────
export const userData = {
  get:    (key)        => tx('userData',   'readonly',  s => s.get(key)),
  set:    (key, value) => tx('userData',   'readwrite', s => s.put({ key, value })),
  delete: (key)        => tx('userData',   'readwrite', s => s.delete(key)),
};

// ── syncQueue: cola de mutaciones offline ──────────────────
export const syncQueue = {
  add: (operation) => tx('syncQueue', 'readwrite', s => s.add({
    ...operation, ts: Date.now(), retries: 0
  })),
  getAll: () => openDB().then(db => new Promise((resolve, reject) => {
    const t    = db.transaction('syncQueue', 'readonly');
    const req  = t.objectStore('syncQueue').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  })),
  remove: (id) => tx('syncQueue', 'readwrite', s => s.delete(id)),
  clear:  ()   => tx('syncQueue', 'readwrite', s => s.clear()),
};

export default { cache, userData, syncQueue, openDB };
```

- [ ] **Paso 2: Test manual en consola del navegador**

Con el servidor corriendo, abrir DevTools → Console y ejecutar:

```js
// Pegar en consola (import dinámico desde módulo ES)
const { cache, userData, syncQueue } = await import('/src/js/store/db.js');

// Test cache
await cache.set('test-key', { foo: 'bar' });
const result = await cache.get('test-key');
console.assert(result.value.foo === 'bar', '❌ cache.set/get falló');
console.log('✅ cache.set/get OK:', result);

// Test syncQueue
await syncQueue.add({ method: 'POST', url: '/api/test', body: { x: 1 } });
const queue = await syncQueue.getAll();
console.assert(queue.length >= 1, '❌ syncQueue.add falló');
console.log('✅ syncQueue.add OK:', queue);

// Test userData
await userData.set('perfil', { nombre: 'Test', rol: 'admin' });
const u = await userData.get('perfil');
console.assert(u.value.nombre === 'Test', '❌ userData.set/get falló');
console.log('✅ userData OK:', u);
```

Verificar que todas las afirmaciones pasen sin errores.

- [ ] **Paso 3: Commit**

```bash
git add frontend/public/src/js/store/db.js
git commit -m "feat(frontend): IndexedDB wrapper Promise-based (cache, userData, syncQueue)"
```

---

### Task 3: Estado Global (state.js)

**Files:**
- Create: `frontend/public/src/js/store/state.js`

Observable state store sin framework. Cualquier módulo puede suscribirse a cambios.

- [ ] **Paso 1: Crear state.js**

```js
// frontend/public/src/js/store/state.js
// Estado global observable. Patrón pub/sub simple.

const _subscribers = {};
const _state = {
  usuario:  null,   // { id, email, nombre, rol }
  token:    null,
  online:   navigator.onLine,
  alertas:  [],
  syncPendiente: 0, // cantidad de operaciones en cola offline
};

/** Suscribirse a cambios en una clave. Devuelve función para desuscribirse. */
export function subscribe(key, fn) {
  if (!_subscribers[key]) _subscribers[key] = new Set();
  _subscribers[key].add(fn);
  return () => _subscribers[key].delete(fn);
}

/** Leer estado actual */
export function get(key) {
  return _state[key];
}

/** Actualizar estado y notificar suscriptores */
export function set(key, value) {
  _state[key] = value;
  if (_subscribers[key]) {
    _subscribers[key].forEach(fn => fn(value));
  }
}

/** Actualizar múltiples keys */
export function patch(updates) {
  Object.entries(updates).forEach(([k, v]) => set(k, v));
}

// ── Auth helpers ──────────────────────────────────────────
export function setAuth(token, usuario) {
  localStorage.setItem('auth_token', token);
  patch({ token, usuario });
}

export function clearAuth() {
  localStorage.removeItem('auth_token');
  patch({ token: null, usuario: null });
}

export function getToken() {
  return _state.token || localStorage.getItem('auth_token');
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function hasRole(...roles) {
  const u = _state.usuario;
  return u && roles.includes(u.rol);
}

// ── Conectividad ──────────────────────────────────────────
window.addEventListener('online',  () => set('online', true));
window.addEventListener('offline', () => set('online', false));

export default { get, set, patch, subscribe, setAuth, clearAuth, getToken, isAuthenticated, hasRole };
```

- [ ] **Paso 2: Test en consola**

```js
const state = await import('/src/js/store/state.js');

// Suscripción
const unsub = state.subscribe('online', v => console.log('online cambió a:', v));

// Set
state.set('online', false);
console.assert(state.get('online') === false, '❌ set/get falló');

// Restaurar
state.set('online', true);

// Auth
state.setAuth('test-token-xyz', { id: '1', nombre: 'Admin', rol: 'admin' });
console.assert(state.getToken() === 'test-token-xyz', '❌ token no persistió');
console.assert(state.hasRole('admin') === true, '❌ hasRole falló');

// Limpiar
state.clearAuth();
console.assert(state.getToken() === null, '❌ clearAuth falló');

unsub();
console.log('✅ state.js: todos los tests OK');
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/public/src/js/store/state.js
git commit -m "feat(frontend): estado global observable (subscribe/get/set, auth helpers, online detection)"
```

---

### Task 4: API Client + Endpoints (client.js + endpoints.js)

**Files:**
- Create: `frontend/public/src/js/api/client.js`
- Create: `frontend/public/src/js/api/endpoints.js`

- [ ] **Paso 1: Crear client.js**

```js
// frontend/public/src/js/api/client.js
// Fetch wrapper con:
// - Adjunta token JWT automáticamente
// - Si offline + mutación → encola en syncQueue
// - Si 401 → limpia auth y redirige a login
import { getToken, clearAuth } from '../store/state.js';
import { syncQueue } from '../store/db.js';

const BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name   = 'ApiError';
  }
}

export async function request(method, path, body = null, options = {}) {
  const token = getToken();
  const url   = `${BASE_URL}${path}`;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(options.timeout || 12000),
    });

    // 401 → sesión expirada
    if (res.status === 401) {
      clearAuth();
      window.location.hash = '#/login';
      throw new ApiError(401, 'Sesión expirada. Volvé a iniciar sesión.');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(res.status, data.error || `Error ${res.status}`);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    // Sin red → encolar si es una mutación (no GET)
    if (method !== 'GET' && !options.noQueue) {
      await syncQueue.add({
        method, url, body,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      return { queued: true, offline: true, mensaje: 'Operación encolada para sincronización.' };
    }

    throw new ApiError(503, 'Sin conexión al servidor.');
  }
}

export const api = {
  get:    (path, opts)        => request('GET',    path, null, opts),
  post:   (path, body, opts)  => request('POST',   path, body, opts),
  put:    (path, body, opts)  => request('PUT',    path, body, opts),
  patch:  (path, body, opts)  => request('PATCH',  path, body, opts),
  delete: (path, opts)        => request('DELETE', path, null, opts),
};

export default api;
```

- [ ] **Paso 2: Crear endpoints.js**

```js
// frontend/public/src/js/api/endpoints.js
// Mapa completo de endpoints. Todas las llamadas a la API pasan por aquí.
import api from './client.js';

// ── AUTH ──────────────────────────────────────────────────
export const auth = {
  login:   (email, password) => api.post('/auth/login',    { email, password }, { noQueue: true }),
  perfil:  ()                => api.get('/auth/perfil'),
};

// ── USUARIOS ──────────────────────────────────────────────
export const usuarios = {
  listar:   ()          => api.get('/usuarios'),
  crear:    (data)      => api.post('/usuarios', data),
  actualizar:(id, data) => api.patch(`/usuarios/${id}`, data),
  eliminar: (id)        => api.delete(`/usuarios/${id}`),
};

// ── CATEGORÍAS ────────────────────────────────────────────
export const categorias = {
  listar: () => api.get('/categorias'),
  crear:  (data) => api.post('/categorias', data),
};

// ── UBICACIONES ───────────────────────────────────────────
export const ubicaciones = {
  listar: () => api.get('/ubicaciones'),
  crear:  (data) => api.post('/ubicaciones', data),
};

// ── PRODUCTOS ─────────────────────────────────────────────
export const productos = {
  listar:      (params = {}) => api.get('/productos?' + new URLSearchParams(params).toString()),
  obtener:     (id)          => api.get(`/productos/${id}`),
  crear:       (data)        => api.post('/productos', data),
  actualizar:  (id, data)    => api.patch(`/productos/${id}`, data),
  eliminar:    (id)          => api.delete(`/productos/${id}`),
};

// ── ACTIVOS FIJOS ─────────────────────────────────────────
export const activos = {
  listar:      (params = {}) => api.get('/activos?' + new URLSearchParams(params).toString()),
  obtener:     (id)          => api.get(`/activos/${id}`),
  crear:       (data)        => api.post('/activos', data),
  actualizar:  (id, data)    => api.patch(`/activos/${id}`, data),
  porSerie:    (serie)       => api.get(`/activos/serie/${encodeURIComponent(serie)}`),
  porQR:       (codigo)      => api.get(`/activos/qr/${encodeURIComponent(codigo)}`),
};

// ── KITS ──────────────────────────────────────────────────
export const kits = {
  listar:   (params = {}) => api.get('/kits?' + new URLSearchParams(params).toString()),
  obtener:  (id)          => api.get(`/kits/${id}`),
  crear:    (data)        => api.post('/kits', data),
  checkout: (id, data)    => api.post(`/kits/${id}/checkout`, data),
  checkin:  (id, data)    => api.post(`/kits/${id}/checkin`, data),
  porQR:    (codigo)      => api.get(`/kits/qr/${encodeURIComponent(codigo)}`),
};

// ── DESPACHOS ─────────────────────────────────────────────
export const despachos = {
  listar:  (params = {}) => api.get('/despachos?' + new URLSearchParams(params).toString()),
  obtener: (id)          => api.get(`/despachos/${id}`),
  crear:   (data)        => api.post('/despachos', data),
  actualizar:(id, data)  => api.patch(`/despachos/${id}`, data),
};

// ── RESERVAS ──────────────────────────────────────────────
export const reservas = {
  listar:  (params = {}) => api.get('/reservas?' + new URLSearchParams(params).toString()),
  obtener: (id)          => api.get(`/reservas/${id}`),
  crear:   (data)        => api.post('/reservas', data),
  actualizar:(id, data)  => api.patch(`/reservas/${id}`, data),
};

// ── TICKETS DE MANTENIMIENTO ──────────────────────────────
export const tickets = {
  listar:  (params = {}) => api.get('/tickets?' + new URLSearchParams(params).toString()),
  obtener: (id)          => api.get(`/tickets/${id}`),
  crear:   (data)        => api.post('/tickets', data),
  actualizar:(id, data)  => api.patch(`/tickets/${id}`, data),
};

// ── PEDIDOS DE REPOSICIÓN ─────────────────────────────────
export const pedidos = {
  listar:  (params = {}) => api.get('/pedidos?' + new URLSearchParams(params).toString()),
  obtener: (id)          => api.get(`/pedidos/${id}`),
  crear:   (data)        => api.post('/pedidos', data),
  actualizar:(id, data)  => api.patch(`/pedidos/${id}`, data),
};

// ── ALERTAS ───────────────────────────────────────────────
export const alertas = {
  listar:   (params = {}) => api.get('/alertas?' + new URLSearchParams(params).toString()),
  resolver: (id)          => api.patch(`/alertas/${id}`, { resuelta: true }),
};

// ── HISTORIAL ─────────────────────────────────────────────
export const historial = {
  listar:  (params = {}) => api.get('/historial?' + new URLSearchParams(params).toString()),
};

// ── IMPORTACIÓN MASIVA ────────────────────────────────────
export const importacion = {
  subir: (formData) => fetch(
    (window.API_BASE_URL || 'http://localhost:3000/api') + '/importacion',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      body: formData, // No poner Content-Type — el browser lo pone con boundary
    }
  ).then(r => r.json()),
};

export default { auth, usuarios, categorias, ubicaciones, productos, activos, kits, despachos, reservas, tickets, pedidos, alertas, historial, importacion };
```

- [ ] **Paso 3: Test de client.js en consola (con backend corriendo)**

Backend debe estar en `http://localhost:3000`. Ejecutar `npm run dev` en `backend/`.

```js
const { api, ApiError } = await import('/src/js/api/client.js');

// Test 1: Endpoint inexistente → ApiError
try {
  await api.get('/no-existe');
} catch(e) {
  console.assert(e instanceof ApiError, '❌ debería ser ApiError');
  console.log('✅ error handling OK, status:', e.status, e.message);
}

// Test 2: Login exitoso
const endpoints = await import('/src/js/api/endpoints.js');
try {
  // Ajustar credenciales según el seed de la DB
  const res = await endpoints.auth.login('admin@test.com', 'password123');
  console.assert(res.token, '❌ no vino token');
  console.log('✅ login OK, token:', res.token.slice(0,20) + '...');
} catch(e) {
  console.warn('⚠️ Login test requiere DB con usuario admin@test.com');
}
```

- [ ] **Paso 4: Commit**

```bash
git add frontend/public/src/js/api/
git commit -m "feat(frontend): API client con offline queue, manejo 401 y endpoints completos"
```

---

### Task 5: Sync Manager (syncManager.js)

**Files:**
- Create: `frontend/public/src/js/store/syncManager.js`

- [ ] **Paso 1: Crear syncManager.js**

```js
// frontend/public/src/js/store/syncManager.js
// Gestiona la cola de operaciones offline.
// Cuando recupera red, envía las operaciones encoladas al backend.
import { syncQueue } from './db.js';
import { set } from './state.js';

let _syncing = false;

/** Actualiza el contador de sincronización pendiente en el estado */
async function updatePendingCount() {
  const ops = await syncQueue.getAll();
  set('syncPendiente', ops.length);
}

/** Procesar toda la cola: enviar cada operación al servidor */
async function flush() {
  if (_syncing || !navigator.onLine) return;
  _syncing = true;

  const ops = await syncQueue.getAll();
  if (!ops.length) { _syncing = false; return; }

  console.log(`[SyncManager] Procesando ${ops.length} operaciones en cola...`);

  for (const op of ops) {
    try {
      const res = await fetch(op.url, {
        method:  op.method,
        headers: op.headers,
        body:    op.body ? JSON.stringify(op.body) : undefined,
      });

      if (res.ok || res.status === 409) {
        // 409 = ya existe → igual lo quitamos de la cola
        await syncQueue.remove(op.id);
        console.log(`[SyncManager] ✅ Operación ${op.id} sincronizada`);
      } else {
        console.warn(`[SyncManager] ⚠️ Op ${op.id} respondió ${res.status} — se reintentará`);
      }
    } catch (e) {
      console.warn(`[SyncManager] ❌ Op ${op.id} falló offline — se reintentará`, e.message);
    }
  }

  await updatePendingCount();
  _syncing = false;
}

/** Inicializar: escuchar reconexión de red */
export function init() {
  window.addEventListener('online', () => {
    console.log('[SyncManager] Red disponible — iniciando flush...');
    flush();
  });

  // Si el SW soporta Background Sync, registrar tag
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(reg => {
      reg.sync.register('sync-operations').catch(() => {});
    });
  }

  // Escuchar mensajes del SW cuando completa una sincronización
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'SYNC_COMPLETE') {
        updatePendingCount();
        // Emitir evento para que las vistas se refresquen
        window.dispatchEvent(new CustomEvent('sync-complete', { detail: e.data }));
      }
    });
  }

  updatePendingCount();
  return { flush, updatePendingCount };
}

export default { init, flush, updatePendingCount };
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/public/src/js/store/syncManager.js
git commit -m "feat(frontend): sync manager offline — flush automático al reconectar red"
```

---

### Task 6: Componentes Toast y Modal

**Files:**
- Create: `frontend/public/src/js/components/Toast.js`
- Create: `frontend/public/src/js/components/Modal.js`

- [ ] **Paso 1: Crear Toast.js**

```js
// frontend/public/src/js/components/Toast.js
// Sistema de notificaciones toast.
// Uso: Toast.show('Guardado exitosamente', 'success');
//      Toast.show('Error al guardar', 'error');

const CONTAINER_ID = 'toast-container';

function getContainer() {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: '99999',
      display: 'flex', flexDirection: 'column', gap: '8px',
      maxWidth: '360px', pointerEvents: 'none',
    });
    document.body.appendChild(el);
  }
  return el;
}

const TYPE_STYLES = {
  success: { bg: 'var(--success-bg)', border: 'var(--success)', color: 'var(--success)', icon: '✓' },
  error:   { bg: 'var(--danger-bg)',  border: 'var(--danger)',  color: 'var(--danger)',  icon: '✕' },
  warning: { bg: 'var(--warning-bg)', border: 'var(--warning)', color: 'var(--warning)', icon: '⚠' },
  info:    { bg: 'var(--info-bg)',    border: 'var(--info)',    color: 'var(--info)',    icon: 'ℹ' },
};

/**
 * Mostrar un toast.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration ms (0 = no cierra solo)
 */
export function show(message, type = 'info', duration = 4000) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.info;
  const container = getContainer();

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    borderRadius: 'var(--radius)', padding: '12px 16px',
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    fontSize: 'var(--text-sm)', boxShadow: 'var(--shadow-lg)',
    pointerEvents: 'all', cursor: 'pointer',
    animation: 'slideUp .2s ease forwards',
    maxWidth: '360px', wordBreak: 'break-word',
  });

  toast.innerHTML = `
    <span style="font-weight:700;font-size:16px;line-height:1;flex-shrink:0">${s.icon}</span>
    <span style="flex:1;color:var(--text-primary)">${message}</span>
  `;

  toast.addEventListener('click', () => remove(toast));
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => remove(toast), duration);
  }

  return toast;
}

function remove(el) {
  el.style.transition = 'opacity .2s, transform .2s';
  el.style.opacity    = '0';
  el.style.transform  = 'translateX(20px)';
  setTimeout(() => el.remove(), 200);
}

export const Toast = { show };
export default Toast;
```

- [ ] **Paso 2: Crear Modal.js**

```js
// frontend/public/src/js/components/Modal.js
// Modal reutilizable.
// Uso:
//   const modal = new Modal({ title: 'Confirmar', content: '<p>¿Seguro?</p>' });
//   modal.show();
//   modal.onConfirm(() => { ... modal.hide(); });

export class Modal {
  /**
   * @param {{
   *   title: string,
   *   content: string | HTMLElement,
   *   confirmText?: string,
   *   cancelText?: string,
   *   danger?: boolean,
   *   size?: 'sm'|'md'|'lg'
   * }} options
   */
  constructor(options = {}) {
    this.options = {
      title:       options.title       || 'Confirmación',
      content:     options.content     || '',
      confirmText: options.confirmText || 'Confirmar',
      cancelText:  options.cancelText  || 'Cancelar',
      danger:      options.danger      || false,
      size:        options.size        || 'md',
    };
    this._onConfirm = null;
    this._onCancel  = null;
    this._el        = null;
    this._build();
  }

  _build() {
    const maxW = { sm: '400px', md: '560px', lg: '720px' }[this.options.size];
    const confirmClass = this.options.danger ? 'btn btn-danger' : 'btn btn-primary';

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(0,0,0,.7)',
      zIndex: '9000', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '16px',
      animation: 'fadeIn .15s ease',
    });

    overlay.innerHTML = `
      <div class="card" style="max-width:${maxW};width:100%;max-height:90dvh;overflow:auto;animation:slideUp .2s ease">
        <div class="card-header">
          <h3 class="card-title">${this.options.title}</h3>
          <button class="btn btn-ghost btn-icon btn-close" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" style="margin-bottom:24px"></div>
        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button class="btn btn-secondary btn-cancel">${this.options.cancelText}</button>
          <button class="${confirmClass} btn-confirm">${this.options.confirmText}</button>
        </div>
      </div>
    `;

    // Insertar contenido
    const body = overlay.querySelector('.modal-body');
    if (typeof this.options.content === 'string') {
      body.innerHTML = this.options.content;
    } else {
      body.appendChild(this.options.content);
    }

    // Event listeners
    overlay.querySelector('.btn-close').addEventListener('click',   () => this._cancel());
    overlay.querySelector('.btn-cancel').addEventListener('click',  () => this._cancel());
    overlay.querySelector('.btn-confirm').addEventListener('click', () => this._confirm());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._cancel(); });

    // Escape key
    this._keyHandler = (e) => { if (e.key === 'Escape') this._cancel(); };
    this._el = overlay;
  }

  show() {
    document.body.appendChild(this._el);
    document.addEventListener('keydown', this._keyHandler);
    // Foco al botón confirm
    setTimeout(() => this._el.querySelector('.btn-confirm')?.focus(), 50);
    return this;
  }

  hide() {
    this._el.style.animation = 'none';
    this._el.style.opacity   = '0';
    this._el.style.transition = 'opacity .15s';
    setTimeout(() => {
      this._el.remove();
      document.removeEventListener('keydown', this._keyHandler);
    }, 150);
    return this;
  }

  onConfirm(fn) { this._onConfirm = fn; return this; }
  onCancel(fn)  { this._onCancel  = fn; return this; }

  _confirm() { if (this._onConfirm) this._onConfirm(); else this.hide(); }
  _cancel()  { if (this._onCancel)  this._onCancel();  else this.hide(); }

  /** Fábrica estática para confirmaciones simples */
  static confirm({ title, message, confirmText = 'Confirmar', danger = false } = {}) {
    return new Promise(resolve => {
      const m = new Modal({ title, content: `<p style="color:var(--text-primary)">${message}</p>`, confirmText, danger });
      m.onConfirm(() => { m.hide(); resolve(true); });
      m.onCancel(()  => { m.hide(); resolve(false); });
      m.show();
    });
  }
}

export default Modal;
```

- [ ] **Paso 3: Test manual en navegador**

```js
// En consola del navegador:
const { Toast } = await import('/src/js/components/Toast.js');
Toast.show('✅ Operación exitosa', 'success');
Toast.show('⚠️ Stock bajo mínimo', 'warning');
Toast.show('❌ Error de conexión', 'error');

// Modal de confirmación
const { Modal } = await import('/src/js/components/Modal.js');
const confirmado = await Modal.confirm({
  title: '¿Confirmar devolución?',
  message: 'Esta acción marcará el Kit como devuelto.',
  confirmText: 'Devolver',
  danger: true,
});
console.log('Resultado:', confirmado); // true o false
```

Verificar visualmente que:
- Los toasts aparecen en esquina inferior derecha
- El modal aparece centrado con backdrop oscuro
- Cerrar con Escape y click fuera funciona

- [ ] **Paso 4: Commit**

```bash
git add frontend/public/src/js/components/Toast.js frontend/public/src/js/components/Modal.js
git commit -m "feat(frontend): componentes Toast y Modal reutilizables"
```

---

### Task 7: DataTable y FileUpload

**Files:**
- Create: `frontend/public/src/js/components/DataTable.js`
- Create: `frontend/public/src/js/components/FileUpload.js`

- [ ] **Paso 1: Crear DataTable.js**

```js
// frontend/public/src/js/components/DataTable.js
// Tabla de datos con sort, filtro de texto y paginado client-side.
//
// Uso:
//   const dt = new DataTable({
//     container: document.querySelector('#mi-tabla'),
//     columns: [
//       { key: 'codigo', label: 'Código', sortable: true },
//       { key: 'nombre', label: 'Nombre', sortable: true },
//       { key: 'estado', label: 'Estado', render: (v) => `<span class="badge badge-green">${v}</span>` },
//     ],
//     actions: (row) => `<button class="btn btn-sm btn-ghost" data-id="${row.id}">Ver</button>`,
//   });
//   dt.setData(arrayDeObjetos);

export class DataTable {
  constructor({ container, columns = [], actions = null, pageSize = 20, emptyMessage = 'Sin registros' }) {
    this.container    = container;
    this.columns      = columns;
    this.actions      = actions;
    this.pageSize     = pageSize;
    this.emptyMessage = emptyMessage;

    this._data       = [];
    this._filtered   = [];
    this._page       = 1;
    this._sortKey    = null;
    this._sortDir    = 'asc';
    this._filter     = '';

    this._render();
  }

  setData(data) {
    this._data     = data || [];
    this._page     = 1;
    this._applyFilterAndSort();
  }

  _applyFilterAndSort() {
    let result = [...this._data];

    // Filtro de texto global
    if (this._filter) {
      const q = this._filter.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v =>
          v !== null && v !== undefined && String(v).toLowerCase().includes(q)
        )
      );
    }

    // Sort
    if (this._sortKey) {
      result.sort((a, b) => {
        const va = a[this._sortKey] ?? '';
        const vb = b[this._sortKey] ?? '';
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return this._sortDir === 'asc' ? cmp : -cmp;
      });
    }

    this._filtered = result;
    this._renderTable();
  }

  _render() {
    this.container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <input class="form-control dt-filter" placeholder="Filtrar..." style="max-width:280px">
        <span class="dt-count text-secondary" style="font-size:var(--text-sm)"></span>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr class="dt-head"></tr></thead>
          <tbody class="dt-body"></tbody>
        </table>
      </div>
      <div class="dt-pagination" style="display:flex;gap:8px;align-items:center;margin-top:16px;justify-content:flex-end"></div>
    `;

    // Cabeceras
    const head = this.container.querySelector('.dt-head');
    this.columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      th.dataset.key = col.key;
      if (col.sortable) th.style.cursor = 'pointer';
      if (col.sortable) th.addEventListener('click', () => this._toggleSort(col.key));
      head.appendChild(th);
    });
    if (this.actions) {
      const th = document.createElement('th');
      th.textContent = 'Acciones';
      th.style.width = '1%';
      head.appendChild(th);
    }

    // Filtro
    this.container.querySelector('.dt-filter').addEventListener('input', (e) => {
      this._filter = e.target.value;
      this._page   = 1;
      this._applyFilterAndSort();
    });

    this._applyFilterAndSort();
  }

  _toggleSort(key) {
    if (this._sortKey === key) {
      this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortKey = key;
      this._sortDir = 'asc';
    }
    this._applyFilterAndSort();
  }

  _renderTable() {
    const body  = this.container.querySelector('.dt-body');
    const count = this.container.querySelector('.dt-count');
    const pag   = this.container.querySelector('.dt-pagination');

    const total      = this._filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    this._page       = Math.min(this._page, totalPages);

    const start = (this._page - 1) * this.pageSize;
    const page  = this._filtered.slice(start, start + this.pageSize);

    count.textContent = `${total} registro${total !== 1 ? 's' : ''}`;

    if (!page.length) {
      body.innerHTML = `<tr><td colspan="${this.columns.length + (this.actions ? 1 : 0)}" style="text-align:center;padding:40px;color:var(--text-muted)">${this.emptyMessage}</td></tr>`;
    } else {
      body.innerHTML = page.map(row => `
        <tr>
          ${this.columns.map(col => `<td>${col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}</td>`).join('')}
          ${this.actions ? `<td style="white-space:nowrap">${this.actions(row)}</td>` : ''}
        </tr>
      `).join('');
    }

    // Paginado
    if (totalPages <= 1) { pag.innerHTML = ''; return; }
    pag.innerHTML = `
      <button class="btn btn-sm btn-ghost" ${this._page <= 1 ? 'disabled' : ''} data-p="${this._page - 1}">‹ Ant</button>
      <span class="text-secondary" style="font-size:var(--text-sm)">Pág ${this._page} / ${totalPages}</span>
      <button class="btn btn-sm btn-ghost" ${this._page >= totalPages ? 'disabled' : ''} data-p="${this._page + 1}">Sig ›</button>
    `;
    pag.querySelectorAll('button[data-p]').forEach(btn => {
      btn.addEventListener('click', () => { this._page = parseInt(btn.dataset.p); this._renderTable(); });
    });
  }
}

export default DataTable;
```

- [ ] **Paso 2: Crear FileUpload.js**

```js
// frontend/public/src/js/components/FileUpload.js
// Componente drag & drop para CSV/Excel.
// Uso:
//   const fu = new FileUpload({ container: el, accept: ['.csv', '.xlsx'], onFile: (file) => { ... } });

export class FileUpload {
  constructor({ container, accept = ['.csv', '.xlsx', '.xls'], onFile, label = 'Arrastrar archivo o hacer click' }) {
    this.container = container;
    this.accept    = accept;
    this.onFile    = onFile;
    this._build();
  }

  _build() {
    this.container.innerHTML = `
      <div class="file-drop-zone" style="
        border: 2px dashed var(--border); border-radius: var(--radius-lg);
        padding: var(--sp-10); text-align: center; cursor: pointer;
        transition: border-color var(--transition), background var(--transition);
        color: var(--text-secondary);
      ">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 12px;display:block;opacity:.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p style="font-size:var(--text-sm);margin-bottom:4px">Arrastrar archivo aquí o</p>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer">
          Seleccionar archivo
          <input type="file" accept="${this.accept.join(',')}" style="display:none" class="file-input">
        </label>
        <p class="file-name" style="font-size:var(--text-xs);margin-top:8px;color:var(--text-muted)">
          Formatos aceptados: ${this.accept.join(', ')}
        </p>
      </div>
    `;

    const zone  = this.container.querySelector('.file-drop-zone');
    const input = this.container.querySelector('.file-input');

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; zone.style.background = 'var(--accent-light)'; });
    zone.addEventListener('dragleave', ()  => { zone.style.borderColor = 'var(--border)'; zone.style.background = ''; });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor = 'var(--border)';
      zone.style.background  = '';
      const file = e.dataTransfer.files[0];
      if (file) this._handleFile(file);
    });

    input.addEventListener('change', (e) => {
      if (e.target.files[0]) this._handleFile(e.target.files[0]);
    });
  }

  _handleFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.accept.includes(ext)) {
      import('./Toast.js').then(({ Toast }) => Toast.show(`Formato no soportado: ${ext}`, 'error'));
      return;
    }
    const nameEl = this.container.querySelector('.file-name');
    nameEl.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    nameEl.style.color = 'var(--success)';
    if (this.onFile) this.onFile(file);
  }

  reset() {
    const nameEl = this.container.querySelector('.file-name');
    if (nameEl) nameEl.textContent = `Formatos aceptados: ${this.accept.join(', ')}`;
    const input = this.container.querySelector('.file-input');
    if (input) input.value = '';
  }
}

export default FileUpload;
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/public/src/js/components/DataTable.js frontend/public/src/js/components/FileUpload.js
git commit -m "feat(frontend): DataTable con sort/filtro/paginado y FileUpload drag&drop"
```

---

### Task 8: Escáner QR/Barras (Scanner.js)

**Files:**
- Create: `frontend/public/src/js/components/Scanner.js`

Usa la librería `html5-qrcode` via CDN (ya incluida en el HTML del Task 9).

- [ ] **Paso 1: Crear Scanner.js**

```js
// frontend/public/src/js/components/Scanner.js
// Escáner QR y código de barras usando la cámara del dispositivo.
// Requiere html5-qrcode cargado en el HTML global.
//
// Uso:
//   const scanner = new Scanner({ container: el, onScan: (codigo) => { ... } });
//   scanner.start();
//   scanner.stop();

export class Scanner {
  constructor({ container, onScan, onError, aspectRatio = 1 }) {
    this.container   = container;
    this.onScan      = onScan;
    this.onError     = onError || (() => {});
    this.aspectRatio = aspectRatio;
    this._html5qr    = null;
    this._running    = false;
    this._scannedLast = null;
    this._cooldown    = false;
    this._build();
  }

  _build() {
    this.container.innerHTML = '';
    const inner = document.createElement('div');
    inner.id = 'qr-reader-' + Math.random().toString(36).slice(2);
    inner.style.width = '100%';
    this.container.appendChild(inner);
    this._readerId = inner.id;
  }

  async start() {
    if (this._running) return;
    if (typeof Html5Qrcode === 'undefined') {
      console.error('[Scanner] html5-qrcode no está cargado. Verificar script en index.html');
      return;
    }

    this._html5qr = new Html5Qrcode(this._readerId);

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: this.aspectRatio,
      supportedScanTypes: [
        Html5QrcodeScanType.SCAN_TYPE_CAMERA,
      ],
    };

    try {
      await this._html5qr.start(
        { facingMode: 'environment' }, // Cámara trasera
        config,
        (decodedText) => this._handleScan(decodedText),
        () => {} // frame sin código — ignorar
      );
      this._running = true;
    } catch (err) {
      console.error('[Scanner] Error al iniciar cámara:', err);
      this.onError(err);
    }
  }

  async stop() {
    if (!this._running || !this._html5qr) return;
    try {
      await this._html5qr.stop();
      this._html5qr.clear();
    } catch (e) {
      console.warn('[Scanner] Error al detener:', e);
    }
    this._running = false;
    this._html5qr = null;
  }

  _handleScan(codigo) {
    // Cooldown de 1.5s para no disparar múltiples veces el mismo código
    if (this._cooldown || codigo === this._scannedLast) return;
    this._scannedLast = codigo;
    this._cooldown    = true;
    setTimeout(() => {
      this._cooldown    = false;
      this._scannedLast = null;
    }, 1500);

    if (this.onScan) this.onScan(codigo);
  }

  isRunning() { return this._running; }
}

export default Scanner;
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/public/src/js/components/Scanner.js
git commit -m "feat(frontend): Scanner QR/barras via cámara con cooldown anti-duplicados"
```

---

### Task 9: Shell SPA (index.html + app.js)

**Files:**
- Create: `frontend/public/index.html`
- Create: `frontend/public/src/js/app.js`

- [ ] **Paso 1: Crear index.html**

```html
<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0f172a">
  <meta name="description" content="Sistema de control de stock, inventario y gestión de activos">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Control de Stock</title>
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/icons/icon-192x192.png">

  <!-- CSS del sistema de diseño -->
  <link rel="stylesheet" href="/src/css/variables.css">
  <link rel="stylesheet" href="/src/css/base.css">
  <link rel="stylesheet" href="/src/css/components.css">
  <link rel="stylesheet" href="/src/css/layouts.css">
  <link rel="stylesheet" href="/src/css/kiosk.css">
  <link rel="stylesheet" href="/src/css/animations.css">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- html5-qrcode (escáner QR) -->
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>

  <!-- Configuración de la API (overrideable) -->
  <script>
    window.API_BASE_URL = 'http://localhost:3000/api';
  </script>
</head>
<body>
  <!-- Barra offline -->
  <div id="offline-bar">📡 Sin conexión — los cambios se guardan y sincronizarán cuando haya red</div>

  <!-- Contenedor principal de la SPA -->
  <div id="app">
    <!-- El router inserta aquí la vista activa -->
  </div>

  <!-- Entry point de la app -->
  <script type="module" src="/src/js/app.js"></script>
</body>
</html>
```

- [ ] **Paso 2: Crear app.js**

```js
// frontend/public/src/js/app.js
// SPA Router + Auth Guard + Bootstrap de la app.
// Routing por hash: #/login, #/kiosk, #/dashboard, etc.

import { get, subscribe, setAuth, clearAuth, isAuthenticated, hasRole } from './store/state.js';
import { userData }      from './store/db.js';
import { init as initSync } from './store/syncManager.js';
import { auth as authApi }  from './api/endpoints.js';

// ── Rutas ────────────────────────────────────────────────
// Cada ruta tiene: path, módulo de vista, roles permitidos (null = todos autenticados)
const ROUTES = [
  { hash: '#/login',     module: () => import('./views/auth.js'),      public: true },
  { hash: '#/kiosk',     module: () => import('./views/kiosk.js'),      roles: ['admin', 'kiosco'] },
  { hash: '#/dashboard', module: () => import('./views/dashboard.js'),  roles: ['admin', 'docente'] },
  { hash: '#/stock',     module: () => import('./views/stock.js'),       roles: ['admin'] },
  { hash: '#/kits',      module: () => import('./views/kits.js'),        roles: ['admin', 'kiosco'] },
  { hash: '#/tickets',   module: () => import('./views/tickets.js'),     roles: ['admin'] },
  { hash: '#/pedidos',   module: () => import('./views/pedidos.js'),     roles: ['admin', 'docente'] },
  { hash: '#/historial', module: () => import('./views/historial.js'),   roles: ['admin'] },
];

// Ruta por defecto según rol
function defaultRoute(rol) {
  if (rol === 'kiosco') return '#/kiosk';
  if (rol === 'admin')  return '#/dashboard';
  return '#/dashboard';
}

// ── Instancia de vista actual (para cleanup) ──────────────
let _currentView = null;

async function navigate(hash) {
  const app = document.getElementById('app');
  hash = hash || location.hash || '#/login';

  const route = ROUTES.find(r => r.hash === hash);

  // Ruta desconocida → login o default
  if (!route) {
    location.hash = isAuthenticated() ? defaultRoute(get('usuario')?.rol) : '#/login';
    return;
  }

  // Ruta pública: si ya está autenticado → redirigir a su default
  if (route.public && isAuthenticated()) {
    location.hash = defaultRoute(get('usuario')?.rol);
    return;
  }

  // Ruta protegida: si no está autenticado → login
  if (!route.public && !isAuthenticated()) {
    location.hash = '#/login';
    return;
  }

  // Verificar rol
  if (route.roles && !hasRole(...route.roles)) {
    location.hash = defaultRoute(get('usuario')?.rol);
    return;
  }

  // Destruir vista anterior
  if (_currentView?.destroy) _currentView.destroy();
  app.innerHTML = '';

  // Mostrar spinner mientras carga
  app.innerHTML = `<div style="height:100dvh;display:flex;align-items:center;justify-content:center"><div class="spinner spinner-lg"></div></div>`;

  try {
    const mod = await route.module();
    const View = mod.default;
    _currentView = new View(app);
    await _currentView.render();
  } catch (err) {
    console.error('[Router] Error cargando vista:', err);
    app.innerHTML = `
      <div class="layout-login">
        <div class="login-box">
          <h2 style="color:var(--danger);margin-bottom:8px">Error al cargar vista</h2>
          <p style="color:var(--text-secondary);margin-bottom:16px">${err.message}</p>
          <button class="btn btn-primary" onclick="location.hash='#/dashboard'">Volver al inicio</button>
        </div>
      </div>
    `;
  }

  // Actualizar nav activo
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.hash === hash);
  });
}

// ── Offline bar ───────────────────────────────────────────
function initOfflineBar() {
  const bar = document.getElementById('offline-bar');
  function update(online) { bar.classList.toggle('visible', !online); }
  subscribe('online', update);
  update(navigator.onLine);
}

// ── Cargar sesión guardada ────────────────────────────────
async function restoreSession() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  // Intentar cargar perfil cacheado de IndexedDB (funciona offline)
  const cached = await userData.get('perfil');
  if (cached?.value) {
    setAuth(token, cached.value);
    return;
  }

  // Validar token con el servidor
  try {
    const res = await authApi.perfil();
    const u   = res.data;
    setAuth(token, u);
    await userData.set('perfil', u);
  } catch (e) {
    // Token inválido
    clearAuth();
  }
}

// ── Bootstrap ─────────────────────────────────────────────
async function bootstrap() {
  // Inicializar offline bar
  initOfflineBar();

  // Inicializar sync manager
  initSync();

  // Restaurar sesión
  await restoreSession();

  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(e =>
      console.warn('[SW] No se pudo registrar:', e)
    );
  }

  // Escuchar cambios de hash
  window.addEventListener('hashchange', () => navigate(location.hash));

  // Navegar a la ruta inicial
  navigate(location.hash);
}

bootstrap();
```

- [ ] **Paso 3: Verificar shell carga correctamente**

Ejecutar en `frontend/`: `npx http-server public -p 5173 -c-1`

Abrir `http://localhost:5173`. Verificar:
1. La página carga sin errores JS en consola
2. Redirige automáticamente a `#/login` (si no hay sesión)
3. La barra offline aparece al desconectar red (DevTools → Network → Offline)
4. El spinner aparece mientras carga una vista

- [ ] **Paso 4: Commit**

```bash
git add frontend/public/index.html frontend/public/src/js/app.js
git commit -m "feat(frontend): shell SPA con router hash-based, auth guard y RBAC"
```

---

### Task 10: Vista Login (views/auth.js)

**Files:**
- Create: `frontend/public/src/js/views/auth.js`

- [ ] **Paso 1: Crear auth.js**

```js
// frontend/public/src/js/views/auth.js
// Vista de login. Se monta en #app.
// Al autenticarse exitosamente, guarda token en state + IndexedDB
// y redirige al default de su rol.

import { setAuth, get } from '../store/state.js';
import { userData }     from '../store/db.js';
import { auth as authApi } from '../api/endpoints.js';
import { Toast }        from '../components/Toast.js';

function defaultRoute(rol) {
  if (rol === 'kiosco') return '#/kiosk';
  return '#/dashboard';
}

export default class AuthView {
  constructor(container) { this.container = container; }

  async render() {
    this.container.innerHTML = `
      <div class="layout-login">
        <div class="login-box fade-in">
          <div class="login-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="margin:0 auto 8px;display:block">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <h1>Control de Stock</h1>
            <p>Sistema de gestión de inventario y activos</p>
          </div>

          <form id="login-form" novalidate>
            <div class="form-group" style="margin-bottom:16px">
              <label class="form-label" for="email">Email</label>
              <input id="email" type="email" class="form-control" placeholder="usuario@escuela.com"
                     autocomplete="email" required>
            </div>
            <div class="form-group" style="margin-bottom:24px">
              <label class="form-label" for="password">Contraseña</label>
              <div style="position:relative">
                <input id="password" type="password" class="form-control" placeholder="••••••••"
                       autocomplete="current-password" required style="padding-right:44px">
                <button type="button" id="toggle-pwd" class="btn btn-ghost btn-icon"
                        style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:4px">
                  <svg id="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" id="btn-login" class="btn btn-primary" style="width:100%;justify-content:center">
              <span id="btn-text">Iniciar sesión</span>
              <span id="btn-spinner" class="spinner" style="display:none;width:16px;height:16px;border-width:2px"></span>
            </button>

            <p id="login-error" style="color:var(--danger);font-size:var(--text-sm);margin-top:12px;text-align:center;display:none"></p>
          </form>
        </div>
      </div>
    `;

    this._setupEvents();
  }

  _setupEvents() {
    const form     = document.getElementById('login-form');
    const emailEl  = document.getElementById('email');
    const pwdEl    = document.getElementById('password');
    const btnLogin = document.getElementById('btn-login');
    const btnText  = document.getElementById('btn-text');
    const spinner  = document.getElementById('btn-spinner');
    const errorEl  = document.getElementById('login-error');
    const togglePwd = document.getElementById('toggle-pwd');

    // Toggle mostrar/ocultar contraseña
    togglePwd.addEventListener('click', () => {
      const isText = pwdEl.type === 'text';
      pwdEl.type = isText ? 'password' : 'text';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email    = emailEl.value.trim();
      const password = pwdEl.value;

      // Validación básica
      if (!email || !password) {
        this._showError(errorEl, 'Completá email y contraseña.');
        return;
      }

      // Estado de carga
      btnLogin.disabled = true;
      btnText.textContent = 'Iniciando sesión...';
      spinner.style.display = 'block';
      errorEl.style.display = 'none';

      try {
        const res = await authApi.login(email, password);

        // Guardar sesión
        setAuth(res.token, res.usuario);
        await userData.set('perfil', res.usuario);

        Toast.show(`¡Bienvenido, ${res.usuario.nombre}!`, 'success');

        // Redirigir según rol
        location.hash = defaultRoute(res.usuario.rol);

      } catch (err) {
        this._showError(errorEl, err.message || 'Error al iniciar sesión. Verificá tus credenciales.');
      } finally {
        btnLogin.disabled = false;
        btnText.textContent = 'Iniciar sesión';
        spinner.style.display = 'none';
      }
    });

    // Enter en email → foco a password
    emailEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); pwdEl.focus(); }
    });
  }

  _showError(el, msg) {
    el.textContent    = msg;
    el.style.display  = 'block';
  }

  destroy() {}
}
```

- [ ] **Paso 2: Test de login end-to-end**

Con backend corriendo en `http://localhost:3000`:

1. Abrir `http://localhost:5173` → debe mostrar formulario de login
2. Ingresar credenciales incorrectas → debe mostrar error "Credenciales inválidas"
3. Ingresar credenciales correctas (usuario admin de la DB) → debe:
   - Mostrar toast "¡Bienvenido, [nombre]!"
   - Redirigir a `#/dashboard`

Si el backend no está corriendo: probar con DevTools → Network → Offline → el login debe mostrar "Sin conexión al servidor."

- [ ] **Paso 3: Commit**

```bash
git add frontend/public/src/js/views/auth.js
git commit -m "feat(frontend): vista login con validación, toggle password y redirección por rol"
```

---

## Notas para Planes Siguientes

**Plan B — Vista Kiosco** (`docs/superpowers/plans/2026-06-08-frontend-pwa-parte-b.md`):
- Vista fullscreen modo pistola: `views/kiosk.js`
- Escáner QR activo, input manual de código como fallback
- Checkout y check-in de Kits con formulario de estado por componente
- Despacho de productos individuales
- Validación de reservas previas
- 100% funcional offline (encola en syncManager)

**Plan C — Vistas Admin** (`docs/superpowers/plans/2026-06-08-frontend-pwa-parte-c.md`):
- `views/dashboard.js`: KPIs, alertas activas, últimos movimientos
- `views/stock.js`: CRUD productos + activos, importación masiva
- `views/kits.js`: CRUD kits + gestión de componentes
- `views/tickets.js`: listado y resolución de tickets de mantenimiento
- `views/pedidos.js`: flujo completo de pedidos de reposición
- `views/historial.js`: historial inmutable con filtros

---

## Checklist de Auto-Revisión (para agente revisor)

- [ ] Los 6 archivos CSS existen en `frontend/public/src/css/`
- [ ] Las custom properties de `variables.css` son referenciadas por los otros CSS (no hay valores hardcodeados)
- [ ] `db.js` usa las mismas object stores que define el SW (`syncQueue`, `cachedData`, `userData`)
- [ ] `state.js` persiste el token en localStorage y recupera sesión offline desde IndexedDB
- [ ] `client.js` encola en syncQueue solo para métodos no-GET cuando está offline
- [ ] `client.js` redirige a `#/login` en respuesta 401
- [ ] `endpoints.js` cubre todos los endpoints del backend (auth, usuarios, categorias, ubicaciones, productos, activos, kits, despachos, reservas, tickets, pedidos, alertas, historial, importacion)
- [ ] `app.js` tiene auth guard: rutas protegidas → login si no autenticado
- [ ] `app.js` tiene RBAC: roles incorrectos → redirige a su default
- [ ] `index.html` carga `html5-qrcode` vía CDN antes del módulo app.js
- [ ] La vista login hace `userData.set('perfil', usuario)` para soporte offline
- [ ] La vista login redirige `kiosco → #/kiosk`, `admin|docente → #/dashboard`
- [ ] No hay valores hardcodeados de rutas API (todo usa `window.API_BASE_URL`)
- [ ] No hay `import` de archivos que no existen todavía en este plan (las vistas de Plan B y C no se importan aquí)
