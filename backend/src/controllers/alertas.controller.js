const db = require('../models');
const { Alerta } = db;
const { Op } = db.Sequelize;

async function listar(req, res) {
  try {
    const where = {};
    if (req.user.rol !== 'admin') where.usuario_destino_id = req.user.id;
    if (req.query.leida !== undefined) where.leida = req.query.leida === 'true';
    if (req.query.tipo) where.tipo = req.query.tipo;

    const data = await Alerta.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(req.query.limit) || 50,
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener alertas.' });
  }
}

async function marcarLeida(req, res) {
  try {
    const alerta = await Alerta.findByPk(req.params.id);
    if (!alerta) return res.status(404).json({ error: 'Alerta no encontrada.' });
    if (req.user.rol !== 'admin' && alerta.usuario_destino_id !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos para esta alerta.' });
    }
    await alerta.update({ leida: true });
    return res.json({ data: alerta });
  } catch (e) {
    return res.status(500).json({ error: 'Error al marcar alerta.' });
  }
}

async function marcarTodasLeidas(req, res) {
  try {
    const where = { leida: false };
    if (req.user.rol !== 'admin') where.usuario_destino_id = req.user.id;
    await Alerta.update({ leida: true }, { where });
    return res.json({ mensaje: 'Alertas marcadas como leídas.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al marcar alertas.' });
  }
}

module.exports = { listar, marcarLeida, marcarTodasLeidas };
