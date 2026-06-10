// =====================================================
// SERVICIO: GESTIÓN DE STOCK
// Lógica centralizada para incremento/decremento de stock
// =====================================================
const db = require('../models');
const { Producto } = db;
const { Op, literal } = db.Sequelize;

/**
 * Incrementa el stock de un producto.
 * @param {string} productoId - ID del producto
 * @param {number} cantidad - Cantidad a sumar
 * @param {Object} [transaction] - Transacción Sequelize
 * @returns {Promise<Object>} Producto actualizado
 */
async function incrementarStock(productoId, cantidad, transaction = null) {
  const options = transaction ? { transaction } : {};

  const producto = await Producto.findByPk(productoId, options);
  if (!producto) {
    throw new Error(`Producto ${productoId} no encontrado.`);
  }

  await producto.increment('stock_actual', { by: cantidad, ...options });
  await producto.reload(options);

  return producto;
}

/**
 * Decrementa el stock de un producto.
 * Valida que no quede negativo.
 * @param {string} productoId - ID del producto
 * @param {number} cantidad - Cantidad a restar
 * @param {Object} [transaction] - Transacción Sequelize
 * @returns {Promise<Object>} Producto actualizado
 */
async function decrementarStock(productoId, cantidad, transaction = null) {
  const options = transaction ? { transaction } : {};

  const producto = await Producto.findByPk(productoId, options);
  if (!producto) {
    throw new Error(`Producto ${productoId} no encontrado.`);
  }

  // UPDATE atómico con WHERE para evitar race condition bajo concurrencia.
  // Si stock_actual < cantidad el WHERE no matchea y rowsAffected = 0.
  const [rowsAffected] = await Producto.update(
    { stock_actual: literal(`stock_actual - ${cantidad}`) },
    {
      where: {
        id: productoId,
        stock_actual: { [Op.gte]: cantidad },
      },
      ...options,
    }
  );

  if (rowsAffected === 0) {
    await producto.reload(options);
    throw new Error(
      `Stock insuficiente para "${producto.nombre}". ` +
      `Disponible: ${producto.stock_actual}, Solicitado: ${cantidad}.`
    );
  }

  await producto.reload(options);
  return producto;
}

/**
 * Verifica si un producto está por debajo del stock mínimo.
 * @param {string} productoId - ID del producto
 * @returns {Promise<boolean>}
 */
async function verificarStockMinimo(productoId) {
  const producto = await Producto.findByPk(productoId);
  if (!producto) return false;

  return producto.stock_actual <= producto.stock_minimo;
}

module.exports = {
  incrementarStock,
  decrementarStock,
  verificarStockMinimo,
};
