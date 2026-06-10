// =====================================================
// UTILIDAD: GENERADOR DE CÓDIGOS
// Genera códigos únicos para despachos, reservas,
// tickets, pedidos, etc.
// =====================================================
const { v4: uuidv4 } = require('uuid');

/**
 * Genera un código legible con prefijo y timestamp.
 * Formato: PREFIX-YYYYMMDD-XXXX
 * @param {string} prefix - Prefijo (DES, RES, TKT, PED, KIT)
 * @returns {string} Código generado
 */
function generarCodigo(prefix = 'COD') {
  const now = new Date();
  const fecha = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = uuidv4().slice(0, 4).toUpperCase();
  return `${prefix}-${fecha}-${random}`;
}

/**
 * Genera un código QR único.
 * @returns {string}
 */
function generarCodigoQR() {
  return `QR-${uuidv4()}`;
}

module.exports = {
  generarCodigo,
  generarCodigoQR,
};
