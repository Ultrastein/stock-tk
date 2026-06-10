// =====================================================
// CONTROLADOR: AUTENTICACIÓN
// =====================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { Usuario } = db;

/**
 * Registra un nuevo usuario.
 * @route POST /api/auth/registrar
 */
async function registrar(req, res) {
  try {
    const { email, password, nombre } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos.' });
    }

    // Verificar si el email ya existe
    const existente = await Usuario.findOne({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: 'El email ya está registrado.' });
    }

    // Hashear la contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Crear usuario — el rol siempre es 'docente' al auto-registrarse
    const usuario = await Usuario.create({
      email,
      password_hash,
      nombre,
      rol: 'docente',
    });

    // Generar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(201).json({
      mensaje: 'Usuario registrado exitosamente.',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ error: 'Error al registrar usuario.' });
  }
}

/**
 * Inicio de sesión.
 * @route POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    // Comparar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Generar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
}

/**
 * Obtiene el perfil del usuario autenticado.
 * @route GET /api/auth/perfil
 */
async function perfil(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.json({ data: usuario });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ error: 'Error al obtener perfil.' });
  }
}

/**
 * Login con Firebase (Google / Apple / cualquier proveedor configurado en Firebase).
 *
 * Flujo:
 *  1. El frontend autentica al usuario con Firebase y obtiene un idToken.
 *  2. Manda ese idToken a este endpoint.
 *  3. El backend lo verifica con Firebase Admin SDK.
 *  4. Busca o crea el usuario en PostgreSQL.
 *  5. Devuelve nuestro propio JWT.
 *
 * @route POST /api/auth/firebase-login
 */
async function firebaseLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken requerido.' });
    }

    // ── Verificar token con Firebase Admin ──────────────────────────────
    let decoded;
    try {
      const { getAdmin } = require('../config/firebase');
      decoded = await getAdmin().auth().verifyIdToken(idToken);
    } catch (fbErr) {
      if (fbErr.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: 'Sesión de Google expirada. Iniciá sesión nuevamente.' });
      }
      if (fbErr.message?.includes('no configurado')) {
        return res.status(503).json({ error: fbErr.message });
      }
      console.error('Firebase verifyIdToken error:', fbErr.code, fbErr.message);
      return res.status(401).json({ error: 'Token de autenticación inválido.' });
    }

    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({
        error: 'La cuenta de Google/Apple no tiene un email asociado. Usá una cuenta con email.',
      });
    }

    // ── Buscar o crear usuario en PostgreSQL ────────────────────────────
    let usuario;

    // 1. Buscar por firebase_uid (usuario ya vinculado)
    usuario = await Usuario.findOne({ where: { firebase_uid: uid } });

    if (!usuario) {
      // 2. Buscar por email (vincular cuenta existente)
      usuario = await Usuario.findOne({ where: { email } });

      if (usuario) {
        // Vincular el UID de Firebase a la cuenta existente
        await usuario.update({ firebase_uid: uid });
      } else {
        // 3. Crear cuenta nueva — rol docente por defecto
        //    El admin puede cambiarlo luego desde el panel de usuarios
        usuario = await Usuario.create({
          email,
          nombre:       name || email.split('@')[0],
          firebase_uid: uid,
          password_hash: null,
          rol:          'docente',
          activo:       true,
        });
      }
    }

    if (!usuario.activo) {
      return res.status(401).json({
        error: 'Tu cuenta está desactivada. Contactá al administrador.',
      });
    }

    // ── Emitir JWT propio ───────────────────────────────────────────────
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id:     usuario.id,
        email:  usuario.email,
        nombre: usuario.nombre,
        rol:    usuario.rol,
      },
    });
  } catch (error) {
    console.error('Error en firebaseLogin:', error);
    return res.status(500).json({ error: 'Error al autenticar con Firebase.' });
  }
}

module.exports = {
  registrar,
  login,
  perfil,
  firebaseLogin,
};
