// =====================================================
// CONTROLADOR: ACTIVOS FIJOS
// =====================================================
const db = require('../models');
const { ActivoFijo, Producto } = db;
const { registrarMovimiento } = require('../services/historial.service');
const { generarCodigoQR } = require('../utils/codeGenerator');
const { ACCION_HISTORIAL } = require('../config/constants');

/**
 * Lista todos los activos fijos con su producto asociado.
 * @route GET /api/activos
 */
async function listar(req, res) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(100, parseInt(req.query.limit) || 50)
    const offset = (page - 1) * limit

    const { count, rows } = await ActivoFijo.findAndCountAll({
      distinct: true,
      include: [
        { model: Producto, as: 'producto' },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    return res.json({
      data: rows,
      pagination: { total: count, page, limit, pages: Math.ceil(count / limit) }
    })
  } catch (error) {
    console.error('Error al listar activos fijos:', error);
    return res.status(500).json({ error: 'Error al obtener activos fijos.' })
  }
}

/**
 * Obtiene un activo fijo por ID.
 * @route GET /api/activos/:id
 */
async function obtener(req, res) {
  try {
    const activo = await ActivoFijo.findByPk(req.params.id, {
      include: [
        { model: Producto, as: 'producto' },
      ],
    });

    if (!activo) {
      return res.status(404).json({ error: 'Activo fijo no encontrado.' });
    }

    return res.json({ data: activo });
  } catch (error) {
    console.error('Error al obtener activo fijo:', error);
    return res.status(500).json({ error: 'Error al obtener el activo fijo.' });
  }
}

/**
 * Crea un nuevo activo fijo.
 * @route POST /api/activos
 */
async function crear(req, res) {
  try {
    const activo = await ActivoFijo.create({
      ...req.body,
      codigo_qr: req.body.codigo_qr || generarCodigoQR(),
    });

    // Registrar en historial
    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.CREACION,
      entidad_tipo: 'ActivoFijo',
      entidad_id: activo.id,
      activo_fijo_id: activo.id,
      producto_id: activo.producto_id,
      numero_serie: activo.numero_serie,
      detalle: {
        numero_serie: activo.numero_serie,
        estado: activo.estado,
      },
      ip_address: req.ip,
    });

    return res.status(201).json({ data: activo });
  } catch (error) {
    console.error('Error al crear activo fijo:', error);
    return res.status(500).json({ error: 'Error al crear el activo fijo.' });
  }
}

/**
 * Actualiza un activo fijo existente.
 * @route PUT /api/activos/:id
 */
async function actualizar(req, res) {
  try {
    const activo = await ActivoFijo.findByPk(req.params.id);
    if (!activo) {
      return res.status(404).json({ error: 'Activo fijo no encontrado.' });
    }

    const datosAnteriores = activo.toJSON();
    await activo.update(req.body);

    // Registrar en historial
    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.MODIFICACION,
      entidad_tipo: 'ActivoFijo',
      entidad_id: activo.id,
      activo_fijo_id: activo.id,
      producto_id: activo.producto_id,
      numero_serie: activo.numero_serie,
      detalle: {
        cambios: req.body,
        datos_anteriores: datosAnteriores,
      },
      ip_address: req.ip,
    });

    return res.json({ data: activo });
  } catch (error) {
    console.error('Error al actualizar activo fijo:', error);
    return res.status(500).json({ error: 'Error al actualizar el activo fijo.' });
  }
}

/**
 * Elimina (soft delete) un activo fijo.
 * @route DELETE /api/activos/:id
 */
async function eliminar(req, res) {
  try {
    const activo = await ActivoFijo.findByPk(req.params.id);
    if (!activo) {
      return res.status(404).json({ error: 'Activo fijo no encontrado.' });
    }

    await activo.destroy();

    // Registrar en historial
    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.BAJA,
      entidad_tipo: 'ActivoFijo',
      entidad_id: activo.id,
      activo_fijo_id: activo.id,
      producto_id: activo.producto_id,
      numero_serie: activo.numero_serie,
      detalle: {
        numero_serie: activo.numero_serie,
      },
      ip_address: req.ip,
    });

    return res.json({ mensaje: 'Activo fijo eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar activo fijo:', error);
    return res.status(500).json({ error: 'Error al eliminar el activo fijo.' });
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
};
