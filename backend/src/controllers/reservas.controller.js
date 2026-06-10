const db = require('../models');
const { Reserva, ReservaItem, Producto, ActivoFijo, Kit } = db;
const { registrarMovimiento } = require('../services/historial.service');
const { generarCodigo } = require('../utils/codeGenerator');
const { ESTADO_RESERVA, ACCION_HISTORIAL, ROLES } = require('../config/constants');

async function listar(req, res) {
  try {
    const where = {};
    if (req.user.rol !== ROLES.ADMIN) where.solicitante_id = req.user.id;
    const data = await Reserva.findAll({
      where,
      include: [{
        model: ReservaItem, as: 'items',
        include: [
          { model: Producto,   as: 'producto',   attributes: ['id', 'nombre', 'codigo'] },
          { model: ActivoFijo, as: 'activoFijo', attributes: ['id', 'numero_serie'] },
          { model: Kit,        as: 'kit',        attributes: ['id', 'nombre', 'codigo'] },
        ],
      }],
      order: [['fecha_reserva', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener reservas.' });
  }
}

async function obtener(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id, {
      include: [{ model: ReservaItem, as: 'items' }],
    });
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    return res.json({ data: reserva });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener reserva.' });
  }
}

async function crear(req, res) {
  const { items, ...datosReserva } = req.body;
  const t = await db.sequelize.transaction();
  try {
    const reserva = await Reserva.create({
      ...datosReserva,
      codigo: generarCodigo('RES'),
      solicitante_id: req.user.id,
      estado: ESTADO_RESERVA.BORRADOR,
    }, { transaction: t });

    if (items?.length) {
      for (const item of items) {
        await ReservaItem.create({
          reserva_id:    reserva.id,
          producto_id:   item.producto_id,
          activo_fijo_id: item.activo_fijo_id || null,
          kit_id:        item.kit_id || null,
          cantidad:      item.cantidad || 1,
        }, { transaction: t });
      }
    }

    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.RESERVA,
      entidad_tipo: 'Reserva',
      entidad_id: reserva.id,
      detalle: { codigo: reserva.codigo, fecha: reserva.fecha_reserva },
      ip_address: req.ip,
    }, t);

    await t.commit();
    return res.status(201).json({ data: reserva });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ error: 'Error al crear reserva.' });
  }
}

async function actualizar(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (reserva.estado !== ESTADO_RESERVA.BORRADOR) {
      return res.status(400).json({ error: 'Solo se pueden editar reservas en borrador.' });
    }
    await reserva.update(req.body);
    return res.json({ data: reserva });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar reserva.' });
  }
}

async function eliminar(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (![ESTADO_RESERVA.BORRADOR, ESTADO_RESERVA.CANCELADA].includes(reserva.estado)) {
      return res.status(400).json({ error: 'Solo se pueden eliminar reservas en borrador o canceladas.' });
    }
    await reserva.destroy();
    return res.json({ mensaje: 'Reserva eliminada.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar reserva.' });
  }
}

async function confirmar(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (reserva.estado !== ESTADO_RESERVA.BORRADOR) {
      return res.status(400).json({ error: `No se puede confirmar desde estado "${reserva.estado}".` });
    }
    await reserva.update({ estado: ESTADO_RESERVA.CONFIRMADA });
    return res.json({ data: reserva });
  } catch (e) {
    return res.status(500).json({ error: 'Error al confirmar reserva.' });
  }
}

async function cancelar(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (reserva.estado === ESTADO_RESERVA.CUMPLIDA) {
      return res.status(400).json({ error: 'No se puede cancelar una reserva ya cumplida.' });
    }
    await reserva.update({ estado: ESTADO_RESERVA.CANCELADA });
    return res.json({ data: reserva });
  } catch (e) {
    return res.status(500).json({ error: 'Error al cancelar reserva.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, confirmar, cancelar };
