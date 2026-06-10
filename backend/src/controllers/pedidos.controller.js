const db = require('../models');
const { PedidoReposicion, PedidoItem, ProveedorCotizacion, Producto } = db;
const { registrarMovimiento } = require('../services/historial.service');
const { incrementarStock } = require('../services/stock.service');
const { generarCodigo } = require('../utils/codeGenerator');
const { ESTADO_PEDIDO, ACCION_HISTORIAL, ROLES } = require('../config/constants');

const TRANSICIONES = {
  [ESTADO_PEDIDO.BORRADOR]:             [ESTADO_PEDIDO.PENDIENTE_APROBACION],
  [ESTADO_PEDIDO.PENDIENTE_APROBACION]: [ESTADO_PEDIDO.APROBADO, ESTADO_PEDIDO.RECHAZADO],
  [ESTADO_PEDIDO.APROBADO]:             [ESTADO_PEDIDO.COMPRADO],
  [ESTADO_PEDIDO.COMPRADO]:             [ESTADO_PEDIDO.EN_CAMINO],
  [ESTADO_PEDIDO.EN_CAMINO]:            [ESTADO_PEDIDO.RECIBIDO],
};

const SOLO_ADMIN = [
  ESTADO_PEDIDO.APROBADO, ESTADO_PEDIDO.RECHAZADO,
  ESTADO_PEDIDO.COMPRADO, ESTADO_PEDIDO.EN_CAMINO, ESTADO_PEDIDO.RECIBIDO,
];

async function listar(req, res) {
  try {
    const where = {};
    if (req.user.rol !== ROLES.ADMIN) where.solicitante_id = req.user.id;
    const data = await PedidoReposicion.findAll({
      where,
      include: [
        { model: PedidoItem, as: 'items',
          include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'codigo'] }] },
        { model: ProveedorCotizacion, as: 'cotizaciones' },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
}

async function obtener(req, res) {
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id, {
      include: [
        { model: PedidoItem, as: 'items', include: [{ model: Producto, as: 'producto' }] },
        { model: ProveedorCotizacion, as: 'cotizaciones' },
      ],
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
    return res.json({ data: pedido });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener pedido.' });
  }
}

async function crear(req, res) {
  const { items, ...datosPedido } = req.body;
  const t = await db.sequelize.transaction();
  try {
    const pedido = await PedidoReposicion.create({
      ...datosPedido,
      codigo: generarCodigo('PED'),
      solicitante_id: req.user.id,
      estado: ESTADO_PEDIDO.BORRADOR,
    }, { transaction: t });

    if (items?.length) {
      for (const item of items) {
        await PedidoItem.create({
          pedido_id:       pedido.id,
          producto_id:     item.producto_id,
          cantidad:        item.cantidad,
          precio_estimado: item.precio_estimado || null,
        }, { transaction: t });
      }
    }

    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.CREACION,
      entidad_tipo: 'PedidoReposicion',
      entidad_id: pedido.id,
      detalle: { codigo: pedido.codigo },
      ip_address: req.ip,
    }, t);

    await t.commit();
    return res.status(201).json({ data: pedido });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ error: 'Error al crear pedido.' });
  }
}

async function actualizar(req, res) {
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (pedido.estado !== ESTADO_PEDIDO.BORRADOR) {
      return res.status(400).json({ error: 'Solo se pueden editar pedidos en borrador.' });
    }
    await pedido.update(req.body);
    return res.json({ data: pedido });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar pedido.' });
  }
}

async function eliminar(req, res) {
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (pedido.estado !== ESTADO_PEDIDO.BORRADOR) {
      return res.status(400).json({ error: 'Solo se pueden eliminar pedidos en borrador.' });
    }
    await pedido.destroy();
    return res.json({ mensaje: 'Pedido eliminado.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar pedido.' });
  }
}

async function avanzarEstado(req, res) {
  const { estado, items_recibidos } = req.body;
  if (!estado) return res.status(400).json({ error: 'Se requiere el campo estado.' });

  if (SOLO_ADMIN.includes(estado) && req.user.rol !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Solo un administrador puede realizar esta transición.' });
  }

  const t = await db.sequelize.transaction();
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id, {
      include: [{ model: PedidoItem, as: 'items' }],
      transaction: t,
    });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: 'Pedido no encontrado.' }); }

    const permitidos = TRANSICIONES[pedido.estado] || [];
    if (!permitidos.includes(estado)) {
      await t.rollback();
      return res.status(400).json({
        error: `Transición inválida de "${pedido.estado}" a "${estado}".`,
        permitidos,
      });
    }

    const update = { estado };
    if (estado === ESTADO_PEDIDO.APROBADO) {
      update.aprobador_id   = req.user.id;
      update.fecha_aprobacion = new Date();
    }
    if (estado === ESTADO_PEDIDO.RECIBIDO) {
      update.fecha_recepcion = new Date();
    }

    await pedido.update(update, { transaction: t });

    if (estado === ESTADO_PEDIDO.RECIBIDO) {
      for (const item of pedido.items) {
        const recibido = items_recibidos?.find(r => r.pedido_item_id === item.id);
        const cantidadRecibida = recibido?.cantidad_recibida ?? item.cantidad;

        if (cantidadRecibida > 0) {
          await incrementarStock(item.producto_id, cantidadRecibida, t);
          await item.update({ cantidad_recibida: cantidadRecibida }, { transaction: t });
          await registrarMovimiento({
            usuario_id: req.user.id,
            accion: ACCION_HISTORIAL.RECEPCION_COMPRA,
            entidad_tipo: 'Producto',
            entidad_id: item.producto_id,
            producto_id: item.producto_id,
            cantidad: cantidadRecibida,
            detalle: { pedido_codigo: pedido.codigo },
            ip_address: req.ip,
          }, t);
        }
      }
    }

    await t.commit();
    return res.json({ data: pedido });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al avanzar estado del pedido.', detalle: e.message });
  }
}

async function agregarCotizacion(req, res) {
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
    const cotizacion = await ProveedorCotizacion.create({ ...req.body, pedido_id: pedido.id });
    return res.status(201).json({ data: cotizacion });
  } catch (e) {
    return res.status(500).json({ error: 'Error al agregar cotización.' });
  }
}

async function seleccionarCotizacion(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id, { transaction: t });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: 'Pedido no encontrado.' }); }

    await ProveedorCotizacion.update(
      { seleccionado: false },
      { where: { pedido_id: pedido.id }, transaction: t }
    );

    const cotizacion = await ProveedorCotizacion.findOne({
      where: { id: req.params.cotId, pedido_id: pedido.id },
      transaction: t,
    });
    if (!cotizacion) { await t.rollback(); return res.status(404).json({ error: 'Cotización no encontrada.' }); }

    await cotizacion.update({ seleccionado: true }, { transaction: t });
    await t.commit();
    return res.json({ data: cotizacion });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ error: 'Error al seleccionar cotización.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, avanzarEstado, agregarCotizacion, seleccionarCotizacion };
