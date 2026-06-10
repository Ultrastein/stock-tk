const db = require('../models');
const { TicketMantenimiento, ActivoFijo } = db;
const { registrarMovimiento } = require('../services/historial.service');
const { generarCodigo } = require('../utils/codeGenerator');
const { ESTADO_TICKET, ESTADO_ACTIVO, ACCION_HISTORIAL } = require('../config/constants');

const TRANSICIONES = {
  [ESTADO_TICKET.PENDIENTE]:     [ESTADO_TICKET.EN_REPARACION, ESTADO_TICKET.RECHAZADO_BAJA],
  [ESTADO_TICKET.EN_REPARACION]: [ESTADO_TICKET.RESUELTO, ESTADO_TICKET.RECHAZADO_BAJA],
};

async function listar(req, res) {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.activo_fijo_id) where.activo_fijo_id = req.query.activo_fijo_id;

    const data = await TicketMantenimiento.findAll({
      where,
      include: [{ model: ActivoFijo, as: 'activoFijo', attributes: ['id', 'numero_serie', 'estado'] }],
      order: [['created_at', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener tickets.' });
  }
}

async function obtener(req, res) {
  try {
    const ticket = await TicketMantenimiento.findByPk(req.params.id, {
      include: [{ model: ActivoFijo, as: 'activoFijo' }],
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });
    return res.json({ data: ticket });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener ticket.' });
  }
}

async function crear(req, res) {
  try {
    const activo = await ActivoFijo.findByPk(req.body.activo_fijo_id);
    if (!activo) return res.status(404).json({ error: 'Activo fijo no encontrado.' });

    const ticket = await TicketMantenimiento.create({
      ...req.body,
      codigo: generarCodigo('TKT'),
      creador_id: req.user.id,
      estado: ESTADO_TICKET.PENDIENTE,
    });

    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.REPARACION,
      entidad_tipo: 'TicketMantenimiento',
      entidad_id: ticket.id,
      activo_fijo_id: activo.id,
      numero_serie: activo.numero_serie,
      detalle: { ticket_codigo: ticket.codigo, diagnostico: ticket.diagnostico },
      ip_address: req.ip,
    });

    return res.status(201).json({ data: ticket });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear ticket.' });
  }
}

async function avanzarEstado(req, res) {
  const { estado, diagnostico, solucion, costo_reparacion } = req.body;
  if (!estado) return res.status(400).json({ error: 'Se requiere estado.' });

  const t = await db.sequelize.transaction();
  try {
    const ticket = await TicketMantenimiento.findByPk(req.params.id, { transaction: t });
    if (!ticket) { await t.rollback(); return res.status(404).json({ error: 'Ticket no encontrado.' }); }

    const permitidos = TRANSICIONES[ticket.estado] || [];
    if (!permitidos.includes(estado)) {
      await t.rollback();
      return res.status(400).json({
        error: `Transición inválida de "${ticket.estado}" a "${estado}".`,
        permitidos,
      });
    }

    const activo = await ActivoFijo.findByPk(ticket.activo_fijo_id, { transaction: t });
    const estadoActivoAnterior = activo.estado;
    let nuevoEstadoActivo = activo.estado;

    const update = { estado };
    if (diagnostico)         update.diagnostico = diagnostico;
    if (solucion)            update.solucion = solucion;
    if (costo_reparacion !== undefined) update.costo_reparacion = costo_reparacion;

    if (estado === ESTADO_TICKET.EN_REPARACION) {
      update.fecha_inicio = new Date();
      nuevoEstadoActivo   = ESTADO_ACTIVO.EN_REPARACION;
    }
    if (estado === ESTADO_TICKET.RESUELTO) {
      update.fecha_fin    = new Date();
      nuevoEstadoActivo   = ESTADO_ACTIVO.DISPONIBLE;
    }
    if (estado === ESTADO_TICKET.RECHAZADO_BAJA) {
      update.fecha_fin    = new Date();
      nuevoEstadoActivo   = ESTADO_ACTIVO.BAJA_DEFINITIVA;
    }

    await ticket.update(update, { transaction: t });
    await activo.update({ estado: nuevoEstadoActivo }, { transaction: t });

    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.REPARACION,
      entidad_tipo: 'TicketMantenimiento',
      entidad_id: ticket.id,
      activo_fijo_id: activo.id,
      numero_serie: activo.numero_serie,
      detalle: {
        estado_ticket_anterior: ticket.estado,
        estado_ticket_nuevo: estado,
        estado_activo_anterior: estadoActivoAnterior,
        estado_activo_nuevo: nuevoEstadoActivo,
      },
      ip_address: req.ip,
    }, t);

    await t.commit();
    return res.json({ data: ticket });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al avanzar estado del ticket.', detalle: e.message });
  }
}

async function asignarTecnico(req, res) {
  try {
    const { tecnico_id } = req.body;
    if (!tecnico_id) return res.status(400).json({ error: 'Se requiere tecnico_id.' });

    const ticket = await TicketMantenimiento.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });

    await ticket.update({ tecnico_id });
    return res.json({ data: ticket });
  } catch (e) {
    return res.status(500).json({ error: 'Error al asignar técnico.' });
  }
}

module.exports = { listar, obtener, crear, avanzarEstado, asignarTecnico };
