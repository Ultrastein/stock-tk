const bcrypt    = require('bcryptjs');
const db        = require('../models');
const { Usuario } = db;

async function listar(req, res) {
  try {
    const data = await Usuario.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['nombre', 'ASC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
}

async function obtener(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    return res.json({ data: usuario });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener usuario.' });
  }
}

async function actualizar(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    // No permitir cambiar password_hash directamente por esta ruta
    const { password_hash, ...datos } = req.body;
    await usuario.update(datos);

    const result = usuario.toJSON();
    delete result.password_hash;
    return res.json({ data: result });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
}

async function desactivar(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    await usuario.update({ activo: false });
    return res.json({ mensaje: 'Usuario desactivado.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al desactivar usuario.' });
  }
}

async function crear(req, res) {
  try {
    const { email, nombre, password, rol } = req.body;
    if (!email || !nombre || !password) {
      return res.status(400).json({ error: 'Email, nombre y contraseña son requeridos.' });
    }
    const ROLES_VALIDOS = ['admin', 'docente', 'kiosco'];
    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: `Rol inválido. Valores: ${ROLES_VALIDOS.join(', ')}.` });
    }
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });

    const password_hash = await bcrypt.hash(password, 10);
    const nuevo = await Usuario.create({
      email, nombre, password_hash,
      rol: rol || 'docente',
      activo: true,
    });
    const result = nuevo.toJSON();
    delete result.password_hash;
    return res.status(201).json({ data: result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al crear usuario.' });
  }
}

async function reactivar(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    await usuario.update({ activo: true });
    return res.json({ mensaje: 'Usuario reactivado.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al reactivar usuario.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, desactivar, reactivar };
