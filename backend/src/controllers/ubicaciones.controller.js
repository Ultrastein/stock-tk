const db = require('../models');
const { Ubicacion } = db;

async function listar(req, res) {
  try {
    const data = await Ubicacion.findAll({ order: [['nombre', 'ASC']] });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener ubicaciones.' });
  }
}

async function obtener(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ error: 'Ubicación no encontrada.' });
    return res.json({ data: ubicacion });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener ubicación.' });
  }
}

async function crear(req, res) {
  try {
    const ubicacion = await Ubicacion.create(req.body);
    return res.status(201).json({ data: ubicacion });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear ubicación.' });
  }
}

async function actualizar(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ error: 'Ubicación no encontrada.' });
    await ubicacion.update(req.body);
    return res.json({ data: ubicacion });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar ubicación.' });
  }
}

async function eliminar(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ error: 'Ubicación no encontrada.' });
    await ubicacion.destroy();
    return res.json({ mensaje: 'Ubicación eliminada.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar ubicación.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
