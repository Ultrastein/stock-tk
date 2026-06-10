// =====================================================
// SERVICIO: HISTORIAL INMUTABLE
// Registra todas las acciones en la tabla de auditoría.
// Esta tabla NUNCA se modifica - solo INSERT.
// =====================================================
const db = require('../models');
const { HistorialMovimiento } = db;

/**
 * Registra un movimiento en el historial inmutable.
 * @param {Object} datos - Datos del movimiento
 * @param {string} datos.usuario_id - ID del usuario que realiza la acción
 * @param {string} datos.accion - Tipo de acción (ver ACCION_HISTORIAL)
 * @param {string} datos.entidad_tipo - Modelo afectado
 * @param {string} datos.entidad_id - ID del registro afectado
 * @param {string} [datos.producto_id] - ID del producto
 * @param {string} [datos.activo_fijo_id] - ID del activo fijo
 * @param {string} [datos.kit_id] - ID del kit
 * @param {number} [datos.cantidad] - Cantidad afectada
 * @param {string} [datos.numero_serie] - Número de serie
 * @param {Object} [datos.detalle] - Datos adicionales (JSONB)
 * @param {string} [datos.ip_address] - IP de origen
 * @param {Object} [transaction] - Transacción Sequelize
 */
async function registrarMovimiento(datos, transaction = null) {
  const options = transaction ? { transaction } : {};

  return HistorialMovimiento.create(
    {
      usuario_id: datos.usuario_id,
      accion: datos.accion,
      entidad_tipo: datos.entidad_tipo,
      entidad_id: datos.entidad_id,
      producto_id: datos.producto_id || null,
      activo_fijo_id: datos.activo_fijo_id || null,
      kit_id: datos.kit_id || null,
      cantidad: datos.cantidad || null,
      numero_serie: datos.numero_serie || null,
      detalle: datos.detalle || null,
      ip_address: datos.ip_address || null,
    },
    options
  );
}

/**
 * Registra múltiples movimientos en una sola transacción.
 * @param {Array<Object>} movimientos - Array de datos de movimiento
 * @param {Object} [transaction] - Transacción Sequelize
 */
async function registrarMovimientosBulk(movimientos, transaction = null) {
  const options = transaction ? { transaction } : {};

  return HistorialMovimiento.bulkCreate(
    movimientos.map((m) => ({
      usuario_id: m.usuario_id,
      accion: m.accion,
      entidad_tipo: m.entidad_tipo,
      entidad_id: m.entidad_id,
      producto_id: m.producto_id || null,
      activo_fijo_id: m.activo_fijo_id || null,
      kit_id: m.kit_id || null,
      cantidad: m.cantidad || null,
      numero_serie: m.numero_serie || null,
      detalle: m.detalle || null,
      ip_address: m.ip_address || null,
    })),
    options
  );
}

module.exports = {
  registrarMovimiento,
  registrarMovimientosBulk,
};
