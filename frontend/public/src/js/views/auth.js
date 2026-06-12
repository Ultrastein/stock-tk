// frontend/public/src/js/views/auth.js
// Vista de login. Se monta en #app cuando la ruta es #/login.
// Soporta login clásico (email+password) y login con Google / Apple via Firebase.

import { setAuth }          from '../store/state.js';
import { userData }         from '../store/db.js';
import { auth as authApi }  from '../api/endpoints.js';
import { Toast }            from '../components/Toast.js';
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
} from '../firebase-config.js';

function defaultRoute(rol) {
  if (rol === 'kiosco') return '#/kiosk';
  return '#/dashboard';
}

// SVG de Google (colores oficiales)
const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  <path fill="none" d="M0 0h48v48H0z"/>
</svg>`;

// SVG de Apple (logo monocromo)
const APPLE_SVG = `<svg width="17" height="18" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 411.6 18 357.1 18 304.6c0-138.5 90.7-211.6 178.6-211.6 70.3 0 121.3 46.3 162.4 46.3 39.5 0 101.5-49 181.8-49 28.5 0 124.7 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
</svg>`;

export default class AuthView {
  constructor(container) {
    this.container = container;
    this._focusTimer = null;
  }

  async render() {
    this.container.innerHTML = `
      <div class="layout-login">
        <div class="login-box fade-in">

          <!-- Logo -->
          <div class="login-logo">
            <div style="background:#fff;border-radius:14px;padding:12px 20px;
                        display:inline-block;margin-bottom:14px;
                        box-shadow:0 4px 20px rgba(0,0,0,.35)">
              <img src="icons/logo-tk.png" alt="TK+ by Tecno Kids"
                   style="width:140px;height:auto;display:block">
            </div>
            <h1>Control de Stock</h1>
            <p>Sistema de gestión de inventario y activos</p>
          </div>

          <!-- ── Botones sociales (siempre visibles) ── -->
          <div class="social-login-buttons" style="margin-bottom:16px">
            <button type="button" id="btn-google" class="btn-social">
              ${GOOGLE_SVG}
              <span>Continuar con Google</span>
            </button>
            <button type="button" id="btn-apple" class="btn-social btn-social-apple"
              style="display:none">
              ${APPLE_SVG}
              <span>Continuar con Apple</span>
            </button>
          </div>

          <div class="login-divider"><span>o usá tu cuenta</span></div>

          <!-- ── Formulario email/contraseña ── -->
          <form id="login-form" novalidate>

            <div class="form-group" style="margin-bottom:16px">
              <label class="form-label" for="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                class="form-control"
                placeholder="usuario@escuela.com"
                autocomplete="email"
                required
              >
            </div>

            <div class="form-group" style="margin-bottom:24px">
              <label class="form-label" for="login-password">Contraseña</label>
              <div style="position:relative">
                <input
                  id="login-password"
                  type="password"
                  class="form-control"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  required
                  style="padding-right:44px"
                >
                <button
                  type="button"
                  id="toggle-pwd"
                  class="btn btn-ghost btn-icon"
                  aria-label="Mostrar/ocultar contraseña"
                  style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:4px"
                >
                  <svg id="eye-icon" width="16" height="16" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-login"
              class="btn btn-primary"
              style="width:100%;justify-content:center;gap:8px"
            >
              <span id="btn-text">Iniciar sesión</span>
              <span
                id="btn-spinner"
                class="spinner"
                style="display:none;width:16px;height:16px;border-width:2px"
                aria-hidden="true"
              ></span>
            </button>

            <p
              id="login-error"
              role="alert"
              style="color:var(--danger);font-size:var(--text-sm);margin-top:12px;
                     text-align:center;display:none;min-height:20px"
            ></p>

          </form>
        </div>
      </div>
    `;

    this._setupEvents();
    this._focusTimer = setTimeout(() => document.getElementById('login-email')?.focus(), 100);
  }

  _setupEvents() {
    const form      = document.getElementById('login-form');
    const emailEl   = document.getElementById('login-email');
    const pwdEl     = document.getElementById('login-password');
    const btnLogin  = document.getElementById('btn-login');
    const btnText   = document.getElementById('btn-text');
    const spinner   = document.getElementById('btn-spinner');
    const errorEl   = document.getElementById('login-error');
    const togglePwd = document.getElementById('toggle-pwd');

    // Toggle mostrar/ocultar contraseña
    togglePwd.addEventListener('click', () => {
      const showing = pwdEl.type === 'text';
      pwdEl.type = showing ? 'password' : 'text';
      togglePwd.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });

    // Enter en email → foco a password
    emailEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); pwdEl.focus(); }
    });

    // ── Submit email/password ──────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (btnLogin.disabled) return; // double-submit guard

      const email    = emailEl.value.trim();
      const password = pwdEl.value;

      if (!email || !password) {
        this._showError(errorEl, 'Completá email y contraseña.');
        return;
      }

      this._setLoading(btnLogin, btnText, spinner, true, 'Iniciando sesión… (puede tardar ~40s)');
      errorEl.style.display = 'none';

      try {
        const res = await authApi.login(email, password);
        await this._onLoginSuccess(res);
      } catch (err) {
        const msg = err.status === 401
          ? 'Credenciales incorrectas. Verificá tu email y contraseña.'
          : (err.status === 503 || err.name === 'AbortError' || err.message?.includes('abort'))
            ? 'El servidor está iniciando, puede tardar hasta 60 segundos. Intentá de nuevo en un momento.'
            : err.message || 'Error al iniciar sesión.';
        this._showError(errorEl, msg);
      } finally {
        this._setLoading(btnLogin, btnText, spinner, false, 'Iniciar sesión');
      }
    });

    // ── Botón Google ───────────────────────────────────────────────────
    document.getElementById('btn-google')?.addEventListener('click', () => {
      this._signInWithProvider('google', errorEl);
    });

    // Apple (desactivado por defecto — requiere Apple Developer Program)
    // document.getElementById('btn-apple')?.addEventListener('click', () => {
    //   this._signInWithProvider('apple', errorEl);
    // });
  }

  // ── Login con proveedor Firebase (Google / Apple) ───────────────────
  async _signInWithProvider(providerName, errorEl) {
    // Deshabilitar botones durante el flujo
    const btnGoogle = document.getElementById('btn-google');
    const btnApple  = document.getElementById('btn-apple');
    const originalGoogleText = btnGoogle?.querySelector('span')?.textContent;
    if (btnGoogle) { btnGoogle.disabled = true; if (btnGoogle.querySelector('span')) btnGoogle.querySelector('span').textContent = 'Conectando...'; }
    if (btnApple)  btnApple.disabled = true;
    errorEl.style.display = 'none';

    try {
      // Crear el provider correcto
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        // Forzar selección de cuenta aunque ya haya una activa
        provider.setCustomParameters({ prompt: 'select_account' });
      } else if (providerName === 'apple') {
        // Apple login no está habilitado actualmente
        throw new Error('Login con Apple no está disponible en este momento.');
      } else {
        throw new Error(`Proveedor desconocido: ${providerName}`);
      }

      // Popup de autenticación (modular SDK: signInWithPopup(auth, provider))
      const result = await signInWithPopup(auth, provider);

      // Obtener el ID token de Firebase
      const idToken = await result.user.getIdToken();

      // Enviar al backend para verificación y obtener nuestro JWT
      const res = await authApi.firebaseLogin(idToken);
      await this._onLoginSuccess(res);

    } catch (err) {
      console.error('Firebase sign-in error:', err.code, err.message);
      const CODE_MSGS = {
        'auth/popup-closed-by-user':      null,   // silencioso
        'auth/cancelled-popup-request':   null,
        'auth/popup-blocked':             'El navegador bloqueó el popup. Permitílo en la barra de direcciones e intentá de nuevo.',
        'auth/network-request-failed':    'Sin conexión a internet para autenticarse con Google.',
        'auth/operation-not-allowed':     'El login con Google no está habilitado. Activalo en Firebase Console → Authentication → Sign-in methods → Google.',
        'auth/unauthorized-domain':       'Este dominio no está autorizado en Firebase. Agregá "localhost" en Firebase Console → Authentication → Settings → Authorized domains.',
        'auth/invalid-api-key':           'API key de Firebase inválida. Verificá firebase-config.js.',
        'auth/user-disabled':             'Tu cuenta fue desactivada. Contactá al administrador.',
        'auth/account-exists-with-different-credential': 'Ya existe una cuenta con ese email usando otro método de login.',
      };
      if (err.code in CODE_MSGS) {
        const msg = CODE_MSGS[err.code];
        if (msg) this._showError(errorEl, msg);
        return;
      }
      const msg = err.message?.includes('backend')
        ? err.message
        : `Error al conectar con Google (${err.code ?? 'desconocido'}). Revisá la consola del navegador.`;
      this._showError(errorEl, msg);
    } finally {
      if (btnGoogle) { btnGoogle.disabled = false; if (btnGoogle.querySelector('span') && originalGoogleText) btnGoogle.querySelector('span').textContent = originalGoogleText; }
      if (btnApple)  btnApple.disabled = false;
    }
  }

  // ── Común a todos los métodos de login ─────────────────────────────
  async _onLoginSuccess(res) {
    const nombre = res.usuario?.nombre ?? 'usuario';
    setAuth(res.token, res.usuario);
    await userData.set('perfil', res.usuario);
    Toast.show(`¡Bienvenido, ${nombre}!`, 'success');
    location.hash = defaultRoute(res.usuario?.rol ?? '');
  }

  _showError(el, msg) {
    el.textContent   = msg;
    el.style.display = 'block';
  }

  _setLoading(btn, textEl, spinner, loading, text) {
    btn.disabled           = loading;
    textEl.textContent     = text;
    spinner.style.display  = loading ? 'inline-block' : 'none';
  }

  destroy() {
    clearTimeout(this._focusTimer);
  }
}
