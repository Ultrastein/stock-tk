const db = require('../models');
const { Despacho, DespachoItem, Producto, ActivoFijo, TicketMantenimiento } = db;
const { registrarMovimiento, registrarMovimientosBulk } = require('../services/historial.service');
const { incrementarStock, decrementarStock } = require('../services/stock.service');
const { generarCodigo } = require('../utils/codeGenerator');
const {
  TIPO_DESPACHO, ESTADO_DESPACHO, ESTADO_DEVOLUCION,
  ESTADO_ACTIVO, ESTADO_TICKET, ACCION_HISTORIAL, TIPO_PRODUCTO,
} = require('../config/constants');

async function listar(req, res) {
  try {
    const where = {};
    if (req.query.tipo) where.tipo = req.query.tipo;
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.solicitante_id) where.solicitante_id = req.query.solicitante_id;

    const data = await Despacho.findAll({
      where,
      include: [{
        model: DespachoItem, as: 'items',
        include: [
          { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'codigo', 'tipo'] },
          { model: ActivoFijo, as: 'activoFijo', attributes: ['id', 'numero_serie', 'estado'] },
        ],
      }],
      order: [['created_at', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al obtener despachos.' });
  }
}

async function obtener(req, res) {
  try {
    const despacho = await Despacho.findByPk(req.params.id, {
      include: [{
        model: DespachoItem, as: 'items',
        include: [
          { model: Producto, as: 'producto' },
          { model: ActivoFijo, as: 'activoFijo' },
        ],
      }],
    });
    if (!despacho) return res.status(404).json({ error: 'Despacho no encontrado.' });
    return res.json({ data: despacho });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener despacho.' });
  }
}

/**
 * POST /api/despachos/checkout
 * Body: { solicitante_id?, ubicacion_destino_id?, reserva_id?, notas?,
 *         items: [{ producto_id, activo_fijo_id?, cantidad }] }
 */
async function checkout(req, res) {
  const { solicitante_id, ubicacion_destino_id, reserva_id, notas, items } = req.body;
  const usuarioId = req.user.id;

  if (!items?.length) {
    return res.status(400).json({ error: 'Se requiere al menos un ítem.' });
  }

  const t = await db.sequelize.transaction();
  try {
    const despacho = await Despacho.create({
      codigo: generarCodigo('DES'),
      tipo: TIPO_DESPACHO.SALIDA,
      estado: ESTADO_DESPACHO.EN_PROCESO,
      solicitante_id: solicitante_id || usuarioId,
      responsable_id: usuarioId,
      ubicacion_destino_id: ubicacion_destino_id || null,
      reserva_id: reserva_id || null,
      fecha_despacho: new Date(),
      notas: notas || null,
      sync_id: req.headers['x-sync-id'] || null,
      created_offline: !!req.headers['x-sync-id'],
    }, { transaction: t });

    const movimientos = [];

    for (const item of items) {
      const producto = await Producto.findByPk(item.producto_id, { transaction: t });
      if (!producto) {
        await t.rollback();
        return res.status(404).json({ error: `Producto ${item.producto_id} no encontrado.` });
      }

      let activoFijo = null;
      if (item.activo_fijo_id) {
        activoFijo = await ActivoFijo.findByPk(item.activo_fijo_id, { transaction: t });
        if (!activoFijo) {
          await t.rollback();
          return res.status(404).json({ error: `Activo ${item.activo_fijo_id} no encontrado.` });
        }
        if (activoFijo.estado !== ESTADO_ACTIVO.DISPONIBLE) {
          await t.rollback();
          return res.status(400).json({
            error: `Activo ${activoFijo.numero_serie} no está disponible (estado: ${activoFijo.estado}).`,
          });
        }
        await activoFijo.update({ estado: ESTADO_ACTIVO.EN_USO }, { transaction: t });
      }

      if (producto.tipo === TIPO_PRODUCTO.CONSUMIBLE) {
        await decrementarStock(producto.id, item.cantidad, t);
      }

      await DespachoItem.create({
        despacho_id: despacho.id,
        producto_id: producto.id,
        activo_fijo_id: activoFijo?.id || null,
        cantidad_despachada: item.cantidad,
        cantidad_devuelta: 0,
        estado_devolucion: ESTADO_DEVOLUCION.PENDIENTE,
      }, { transaction: t });

      movimientos.push({
        usuario_id: usuarioId,
        accion: ACCION_HISTORIAL.CHECKOUT,
        entidad_tipo: activoFijo ? 'ActivoFijo' : 'Producto',
        entidad_id: activoFijo?.id || producto.id,
        producto_id: producto.id,
        activo_fijo_id: activoFijo?.id || null,
        cantidad: item.cantidad,
        numero_serie: activoFijo?.numero_serie || null,
        detalle: { despacho_id: despacho.id, despacho_codigo: despacho.codigo },
        ip_address: req.ip,
      });
    }

    await despacho.update({ estado: ESTADO_DESPACHO.COMPLETADO }, { transaction: t });
    await registrarMovimientosBulk(movimientos, t);
    await t.commit();

    return res.status(201).json({ data: { id: despacho.id, codigo: despacho.codigo } });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al procesar checkout.', detalle: e.message });
  }
}

/**
 * POST /api/despachos/:id/checkin
 * Body: { items_devueltos: [{ despacho_item_id, estado?, cantidad_devuelta?, notas? }] }
 * estado: 'funcional' | 'dañado' | 'requiere_reparacion'
 */
async function checkin(req, res) {
  const { items_devueltos } = req.body;
  const usuarioId = req.user.id;

  if (!items_devueltos?.length) {
    return res.status(400).json({ error: 'Se requiere items_devueltos.' });
  }

  const t = await db.sequelize.transaction();
  try {
    const despachoOriginal = await Despacho.findByPk(req.params.id, {
      include: [{ model: DespachoItem, as: 'items' }],
      transaction: t,
    });

    if (!despachoOriginal || despachoOriginal.tipo !== TIPO_DESPACHO.SALIDA) {
      await t.rollback();
      return res.status(404).json({ error: 'Despacho de salida no encontrado.' });
    }
    if (despachoOriginal.estado !== ESTADO_DESPACHO.COMPLETADO) {
      await t.rollback();
      return res.status(400).json({ error: 'El despacho no está en estado COMPLETADO.' });
    }

    const devolucion = await Despacho.create({
      codigo: generarCodigo('DEV'),
      tipo: TIPO_DESPACHO.DEVOLUCION,
      estado: ESTADO_DESPACHO.EN_PROCESO,
      solicitante_id: despachoOriginal.solicitante_id,
      responsable_id: usuarioId,
      ubicacion_destino_id: despachoOriginal.ubicacion_destino_id,
      fecha_despacho: new Date(),
    }, { transaction: t });

    const movimientos = [];
    const ticketsCreados = [];
    let completado = true;

    for (const dev of items_devueltos) {
      const itemOriginal = despachoOriginal.items.find(i => i.id === dev.despacho_item_id);
      if (!itemOriginal) continue;

      const producto = await Producto.findByPk(itemOriginal.producto_id, { transaction: t });

      if (itemOriginal.activo_fijo_id) {
        // Retornable
        const activo = await ActivoFijo.findByPk(itemOriginal.activo_fijo_id, { transaction: t });
        const estadoAnterior = activo.estado;
        let nuevoEstado;
        let estadoDevolucion;

        switch (dev.estado) {
          case 'dañado':
            nuevoEstado = ESTADO_ACTIVO.DAÑADO;
            estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_DAÑADO;
            break;
          case 'requiere_reparacion':
            nuevoEstado = ESTADO_ACTIVO.EN_REPARACION;
            estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_REPARACION;
            break;
          default:
            nuevoEstado = ESTADO_ACTIVO.DISPONIBLE;
            estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_FUNCIONAL;
        }

        await activo.update({ estado: nuevoEstado }, { transaction: t });

        const despachoItem = await DespachoItem.create({
          despacho_id: devolucion.id,
          producto_id: producto.id,
          activo_fijo_id: activo.id,
          cantidad_despachada: 1,
          cantidad_devuelta: 1,
          estado_devolucion: estadoDevolucion,
          notas: dev.notas || null,
        }, { transaction: t });

        if (nuevoEstado === ESTADO_ACTIVO.DAÑADO || nuevoEstado === ESTADO_ACTIVO.EN_REPARACION) {
          const ticket = await TicketMantenimiento.create({
            codigo: generarCodigo('TKT'),
            activo_fijo_id: activo.id,
            creador_id: usuarioId,
            estado: ESTADO_TICKET.PENDIENTE,
            diagnostico: dev.notas || `Reportado como ${dev.estado} en despacho ${despachoOriginal.codigo}`,
            despacho_item_id: despachoItem.id,
          }, { transaction: t });
          ticketsCreados.push(ticket.codigo);
        }

        await itemOriginal.update({
          estado_devolucion: estadoDevolucion,
          cantidad_devuelta: 1,
        }, { transaction: t });

        movimientos.push({
          usuario_id: usuarioId,
          accion: ACCION_HISTORIAL.CHECKIN,
          entidad_tipo: 'ActivoFijo',
          entidad_id: activo.id,
          producto_id: producto.id,
          activo_fijo_id: activo.id,
          numero_serie: activo.numero_serie,
          detalle: { estado_anterior: estadoAnterior, estado_nuevo: nuevoEstado },
          ip_address: req.ip,
        });

      } else {
        // Consumible
        const cantDevuelta = dev.cantidad_devuelta || 0;
        const cantEsperada = itemOriginal.cantidad_despachada;
        const estadoDevolucion = cantDevuelta < cantEsperada
          ? ESTADO_DEVOLUCION.MERMA
          : ESTADO_DEVOLUCION.DEVUELTO_FUNCIONAL;

        if (cantDevuelta < cantEsperada) completado = false;
        if (cantDevuelta > 0) await incrementarStock(producto.id, cantDevuelta, t);

        await DespachoItem.create({
          despacho_id: devolucion.id,
          producto_id: producto.id,
          cantidad_despachada: cantEsperada,
          cantidad_devuelta: cantDevuelta,
          estado_devolucion: estadoDevolucion,
          notas: dev.notas || null,
        }, { transaction: t });

        await itemOriginal.update({
          estado_devolucion: estadoDevolucion,
          cantidad_devuelta: cantDevuelta,
        }, { transaction: t });

        movimientos.push({
          usuario_id: usuarioId,
          accion: cantDevuelta > 0 ? ACCION_HISTORIAL.CHECKIN : ACCION_HISTORIAL.MERMA,
          entidad_tipo: 'Producto',
          entidad_id: producto.id,
          producto_id: producto.id,
          cantidad: cantDevuelta,
          detalle: { cantidad_esperada: cantEsperada, cantidad_devuelta: cantDevuelta },
          ip_address: req.ip,
        });
      }
    }

    const estadoFinal = completado ? ESTADO_DESPACHO.COMPLETADO : ESTADO_DESPACHO.COMPLETADO_PARCIAL;
    await devolucion.update({ estado: estadoFinal }, { transaction: t });
    await registrarMovimientosBulk(movimientos, t);
    await t.commit();

    return res.json({
      data: { id: devolucion.id, codigo: devolucion.codigo, estado: estadoFinal },
      tickets_creados: ticketsCreados,
    });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al procesar checkin.', detalle: e.message });
  }
}

async function cancelar(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const despacho = await Despacho.findByPk(req.params.id, { transaction: t });
    if (!despacho) { await t.rollback(); return res.status(404).json({ error: 'Despacho no encontrado.' }); }
    if (despacho.estado === ESTADO_DESPACHO.CANCELADO) {
      await t.rollback(); return res.status(400).json({ error: 'El despacho ya está cancelado.' });
    }
    if (despacho.tipo === TIPO_DESPACHO.SALIDA && despacho.estado === ESTADO_DESPACHO.COMPLETADO) {
      await t.rollback();
      return res.status(400).json({ error: 'No se puede cancelar un despacho completado. Use checkin.' });
    }

    await despacho.update({ estado: ESTADO_DESPACHO.CANCELADO }, { transaction: t });
    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.CANCELACION,
      entidad_tipo: 'Despacho',
      entidad_id: despacho.id,
      detalle: { codigo: despacho.codigo },
      ip_address: req.ip,
    }, t);
    await t.commit();
    return res.json({ mensaje: 'Despacho cancelado.' });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ error: 'Error al cancelar despacho.' });
  }
}

module.exports = { listar, obtener, checkout, checkin, cancelar };
