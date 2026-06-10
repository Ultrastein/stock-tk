const db = require('../models');
const { Categoria } = db;

async function listar(req, res) {
  try {
    const data = await Categoria.findAll({ order: [['nombre', 'ASC']] });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener categorías.' });
  }
}

async function obtener(req, res) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada.' });
    return res.json({ data: categoria });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener categoría.' });
  }
}

async function crear(req, res) {
  try {
    const categoria = await Categoria.create(req.body);
    return res.status(201).json({ data: categoria });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear categoría.' });
  }
}

async function actualizar(req, res) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada.' });
    await categoria.update(req.body);
    return res.json({ data: categoria });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar categoría.' });
  }
}

async function eliminar(req, res) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada.' });
    await categoria.destroy();
    return res.json({ mensaje: 'Categoría eliminada.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar categoría.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
