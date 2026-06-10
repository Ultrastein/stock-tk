const db = require('../models');
const { Presupuesto, Categoria } = db;

async function listar(req, res) {
  try {
    const where = {};
    if (req.query.anio) where.anio = parseInt(req.query.anio);
    const data = await Presupuesto.findAll({
      where,
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
      order: [['anio', 'DESC'], ['mes', 'ASC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener presupuestos.' });
  }
}

async function crear(req, res) {
  try {
    const { anio, mes, categoria_id, descripcion, monto_asignado, notas } = req.body;
    if (!anio || monto_asignado == null) {
      return res.status(400).json({ error: 'anio y monto_asignado son requeridos.' });
    }
    const item = await Presupuesto.create({
      anio, mes: mes || null, categoria_id: categoria_id || null,
      descripcion: descripcion || null, monto_asignado, notas: notas || null,
    });
    return res.status(201).json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear presupuesto.' });
  }
}

async function actualizar(req, res) {
  try {
    const item = await Presupuesto.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    await item.update(req.body);
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar presupuesto.' });
  }
}

async function registrarGasto(req, res) {
  try {
    const item = await Presupuesto.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    const { monto } = req.body;
    if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido.' });
    await item.update({ monto_ejecutado: parseFloat(item.monto_ejecutado) + parseFloat(monto) });
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al registrar gasto.' });
  }
}

async function eliminar(req, res) {
  try {
    const item = await Presupuesto.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    await item.destroy();
    return res.json({ mensaje: 'Presupuesto eliminado.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar presupuesto.' });
  }
}

module.exports = { listar, crear, actualizar, registrarGasto, eliminar };
