// =====================================================
// CONTROLADOR: PRODUCTOS
// =====================================================
const db = require('../models');
const { Producto, Categoria, Ubicacion } = db;
const { registrarMovimiento } = require('../services/historial.service');
const { generarCodigo } = require('../utils/codeGenerator');
const { ACCION_HISTORIAL } = require('../config/constants');

/**
 * Lista todos los productos con su categoría y ubicación.
 * @route GET /api/productos
 */
async function listar(req, res) {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Categoria, as: 'categoria' },
        { model: Ubicacion, as: 'ubicacion' },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ data: productos });
  } catch (error) {
    console.error('Error al listar productos:', error);
    return res.status(500).json({ error: 'Error al obtener productos.' });
  }
}

/**
 * Obtiene un producto por ID.
 * @route GET /api/productos/:id
 */
async function obtener(req, res) {
  try {
    const producto = await Producto.findByPk(req.params.id, {
      include: [
        { model: Categoria, as: 'categoria' },
        { model: Ubicacion, as: 'ubicacion' },
      ],
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    return res.json({ data: producto });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return res.status(500).json({ error: 'Error al obtener el producto.' });
  }
}

/**
 * Crea un nuevo producto.
 * @route POST /api/productos
 */
async function crear(req, res) {
  try {
    const producto = await Producto.create({
      ...req.body,
      codigo: req.body.codigo || generarCodigo('PRD'),
    });

    // Registrar en historial
    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.CREACION,
      entidad_tipo: 'Producto',
      entidad_id: producto.id,
      producto_id: producto.id,
      detalle: {
        nombre: producto.nombre,
        codigo: producto.codigo,
        tipo: producto.tipo,
        stock_actual: producto.stock_actual,
      },
      ip_address: req.ip,
    });

    return res.status(201).json({ data: producto });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return res.status(500).json({ error: 'Error al crear el producto.' });
  }
}

/**
 * Actualiza un producto existente.
 * @route PUT /api/productos/:id
 */
async function actualizar(req, res) {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const datosAnteriores = producto.toJSON();
    await producto.update(req.body);

    // Registrar en historial
    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.MODIFICACION,
      entidad_tipo: 'Producto',
      entidad_id: producto.id,
      producto_id: producto.id,
      detalle: {
        cambios: req.body,
        datos_anteriores: datosAnteriores,
      },
      ip_address: req.ip,
    });

    return res.json({ data: producto });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return res.status(500).json({ error: 'Error al actualizar el producto.' });
  }
}

/**
 * Elimina (soft delete) un producto.
 * @route DELETE /api/productos/:id
 */
async function eliminar(req, res) {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    await producto.destroy();

    // Registrar en historial
    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.BAJA,
      entidad_tipo: 'Producto',
      entidad_id: producto.id,
      producto_id: producto.id,
      detalle: {
        nombre: producto.nombre,
        codigo: producto.codigo,
      },
      ip_address: req.ip,
    });

    return res.json({ mensaje: 'Producto eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return res.status(500).json({ error: 'Error al eliminar el producto.' });
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
};
