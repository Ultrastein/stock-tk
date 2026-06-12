const db = require('../models');
const { Ubicacion } = db;

async function listar(req, res) {
  try {
    const data = await Ubicacion.findAll({ order: [['nombre', 'ASC']] });
    return res.json({ data });
  } catch (e) {
    console.error('[ubicaciones] listar:', e);
    return res.status(500).json({ mensaje: 'Error al obtener ubicaciones.', detalle: e.message });
  }
}

async function obtener(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ mensaje: 'Ubicación no encontrada.' });
    return res.json({ data: ubicacion });
  } catch (e) {
    console.error('[ubicaciones] obtener:', e);
    return res.status(500).json({ mensaje: 'Error al obtener ubicación.', detalle: e.message });
  }
}

async function crear(req, res) {
  try {
    const ubicacion = await Ubicacion.create(req.body);
    return res.status(201).json({ data: ubicacion });
  } catch (e) {
    console.error('[ubicaciones] crear:', e);
    return res.status(500).json({ mensaje: 'Error al crear ubicación.', detalle: e.message });
  }
}

async function actualizar(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ mensaje: 'Ubicación no encontrada.' });
    await ubicacion.update(req.body);
    return res.json({ data: ubicacion });
  } catch (e) {
    console.error('[ubicaciones] actualizar:', e);
    return res.status(500).json({ mensaje: 'Error al actualizar ubicación.', detalle: e.message });
  }
}

async function eliminar(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ mensaje: 'Ubicación no encontrada.' });
    await ubicacion.destroy();
    return res.json({ mensaje: 'Ubicación eliminada.' });
  } catch (e) {
    console.error('[ubicaciones] eliminar:', e);
    return res.status(500).json({ mensaje: 'Error al eliminar ubicación.', detalle: e.message });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
