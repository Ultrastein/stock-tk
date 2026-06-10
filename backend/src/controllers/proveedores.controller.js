const db = require('../models');
const { Proveedor, ActivoFijo, Producto } = db;

async function listar(req, res) {
  try {
    const where = {};
    if (req.query.activo !== undefined) where.activo = req.query.activo === 'true';
    const data = await Proveedor.findAll({ where, order: [['nombre', 'ASC']] });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener proveedores.' });
  }
}

async function obtener(req, res) {
  try {
    const item = await Proveedor.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Proveedor no encontrado.' });
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener proveedor.' });
  }
}

async function crear(req, res) {
  try {
    const { nombre, cuit, contacto_nombre, contacto_email, contacto_telefono, sitio_web, rubro, notas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
    const item = await Proveedor.create({ nombre, cuit, contacto_nombre, contacto_email, contacto_telefono, sitio_web, rubro, notas });
    return res.status(201).json({ data: item });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un proveedor con ese CUIT.' });
    }
    return res.status(500).json({ error: 'Error al crear proveedor.' });
  }
}

async function actualizar(req, res) {
  try {
    const item = await Proveedor.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Proveedor no encontrado.' });
    await item.update(req.body);
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar proveedor.' });
  }
}

async function eliminar(req, res) {
  try {
    const item = await Proveedor.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Proveedor no encontrado.' });
    await item.destroy();
    return res.json({ mensaje: 'Proveedor eliminado.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar proveedor.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
