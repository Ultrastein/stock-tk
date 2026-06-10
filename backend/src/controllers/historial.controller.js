const db = require('../models');
const { HistorialMovimiento } = db;
const { Op } = db.Sequelize;

async function listar(req, res) {
  try {
    const { accion, entidad_tipo, usuario_id, desde, hasta, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (accion)       where.accion = accion;
    if (entidad_tipo) where.entidad_tipo = entidad_tipo;
    if (usuario_id)   where.usuario_id = usuario_id;
    if (desde || hasta) {
      where.created_at = {};
      if (desde) where.created_at[Op.gte] = new Date(desde);
      if (hasta) where.created_at[Op.lte] = new Date(hasta);
    }

    const { rows, count } = await HistorialMovimiento.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 500),
      offset: parseInt(offset),
    });
    return res.json({ data: rows, total: count });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener historial.' });
  }
}

async function listarPorEntidad(req, res) {
  try {
    const { tipo, id } = req.params;
    const data = await HistorialMovimiento.findAll({
      where: { entidad_tipo: tipo, entidad_id: id },
      order: [['created_at', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener historial de entidad.' });
  }
}

module.exports = { listar, listarPorEntidad };
