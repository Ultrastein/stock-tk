const db = require('../models');
const { MantenimientoPreventivo, ActivoFijo, Producto } = db;
const { FRECUENCIA_MANTENIMIENTO } = require('../config/constants');

function calcularProxima(frecuencia, desde) {
  const base = desde ? new Date(desde) : new Date();
  const siguiente = new Date(base);
  switch (frecuencia) {
    case FRECUENCIA_MANTENIMIENTO.SEMANAL:    siguiente.setDate(siguiente.getDate() + 7);   break;
    case FRECUENCIA_MANTENIMIENTO.MENSUAL:    siguiente.setMonth(siguiente.getMonth() + 1); break;
    case FRECUENCIA_MANTENIMIENTO.TRIMESTRAL: siguiente.setMonth(siguiente.getMonth() + 3); break;
    case FRECUENCIA_MANTENIMIENTO.SEMESTRAL:  siguiente.setMonth(siguiente.getMonth() + 6); break;
    case FRECUENCIA_MANTENIMIENTO.ANUAL:      siguiente.setFullYear(siguiente.getFullYear() + 1); break;
  }
  return siguiente.toISOString().split('T')[0];
}

async function listar(req, res) {
  try {
    const where = { activo: true };
    if (req.query.activo_fijo_id) where.activo_fijo_id = req.query.activo_fijo_id;
    const data = await MantenimientoPreventivo.findAll({
      where,
      include: [
        { model: ActivoFijo, as: 'activoFijo', attributes: ['id', 'numero_serie', 'estado'],
          include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'] }] },
        { model: db.Usuario, as: 'responsable', attributes: ['id', 'nombre'] },
      ],
      order: [['proxima_ejecucion', 'ASC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener planes de mantenimiento.' });
  }
}

async function crear(req, res) {
  try {
    const { activo_fijo_id, descripcion, frecuencia, responsable_id, notas } = req.body;
    if (!activo_fijo_id || !descripcion || !frecuencia) {
      return res.status(400).json({ error: 'activo_fijo_id, descripcion y frecuencia son requeridos.' });
    }
    const proxima = calcularProxima(frecuencia, null);
    const item = await MantenimientoPreventivo.create({
      activo_fijo_id, descripcion, frecuencia,
      proxima_ejecucion: proxima,
      responsable_id: responsable_id || null,
      notas: notas || null,
    });
    return res.status(201).json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear plan de mantenimiento.' });
  }
}

async function actualizar(req, res) {
  try {
    const item = await MantenimientoPreventivo.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Plan no encontrado.' });
    await item.update(req.body);
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar plan.' });
  }
}

// Marcar como ejecutado → actualiza ultima_ejecucion y calcula proxima
async function marcarEjecutado(req, res) {
  try {
    const item = await MantenimientoPreventivo.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Plan no encontrado.' });
    const hoy = new Date().toISOString().split('T')[0];
    const proxima = calcularProxima(item.frecuencia, hoy);
    await item.update({ ultima_ejecucion: hoy, proxima_ejecucion: proxima });
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al marcar como ejecutado.' });
  }
}

async function eliminar(req, res) {
  try {
    const item = await MantenimientoPreventivo.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Plan no encontrado.' });
    await item.destroy();
    return res.json({ mensaje: 'Plan eliminado.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar plan.' });
  }
}

module.exports = { listar, crear, actualizar, marcarEjecutado, eliminar };
