const db = require('../models');
const { Producto, ActivoFijo } = db;
const { parsearCSV, parsearExcel } = require('../utils/csvParser');
const { generarCodigo, generarCodigoQR } = require('../utils/codeGenerator');
const { registrarMovimiento } = require('../services/historial.service');
const { ACCION_HISTORIAL, TIPO_PRODUCTO } = require('../config/constants');

function parsearArchivo(file) {
  const isCsv = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
  return isCsv ? parsearCSV(file.buffer) : parsearExcel(file.buffer);
}

/**
 * POST /api/importacion/productos
 * Columnas requeridas: nombre, tipo
 * Columnas opcionales: codigo, codigo_barras, descripcion, categoria_id, ubicacion_id,
 *   stock_actual, stock_minimo, unidad_medida, precio_referencia
 */
async function importarProductos(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo.' });

  let filas;
  try {
    filas = parsearArchivo(req.file);
  } catch (e) {
    return res.status(400).json({ error: 'No se pudo parsear el archivo.', detalle: e.message });
  }

  const exitosos = [];
  const errores  = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    try {
      if (!fila.nombre || !fila.tipo) {
        errores.push({ fila: i + 2, error: 'nombre y tipo son requeridos.' });
        continue;
      }
      if (!Object.values(TIPO_PRODUCTO).includes(fila.tipo)) {
        errores.push({ fila: i + 2, error: `tipo inválido: "${fila.tipo}". Use: retornable, consumible` });
        continue;
      }

      const producto = await Producto.create({
        codigo:           fila.codigo        || generarCodigo('PRD'),
        codigo_barras:    fila.codigo_barras  || null,
        nombre:           fila.nombre,
        descripcion:      fila.descripcion   || null,
        tipo:             fila.tipo,
        categoria_id:     fila.categoria_id  || null,
        ubicacion_id:     fila.ubicacion_id  || null,
        stock_actual:     parseInt(fila.stock_actual)  || 0,
        stock_minimo:     parseInt(fila.stock_minimo)  || 0,
        unidad_medida:    fila.unidad_medida  || 'unidades',
        precio_referencia: parseFloat(fila.precio_referencia) || null,
      });

      await registrarMovimiento({
        usuario_id:   req.user.id,
        accion:       ACCION_HISTORIAL.CREACION,
        entidad_tipo: 'Producto',
        entidad_id:   producto.id,
        producto_id:  producto.id,
        detalle:      { importacion: true, fila: i + 2 },
        ip_address:   req.ip,
      });

      exitosos.push({ fila: i + 2, id: producto.id, nombre: producto.nombre });
    } catch (e) {
      errores.push({ fila: i + 2, error: e.message });
    }
  }

  return res.json({
    resumen:  { total: filas.length, exitosos: exitosos.length, errores: errores.length },
    exitosos,
    errores,
  });
}

/**
 * POST /api/importacion/activos
 * Columnas requeridas: producto_id, numero_serie
 * Columnas opcionales: mac_address, codigo_qr, fecha_adquisicion, valor_adquisicion, notas
 */
async function importarActivos(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo.' });

  let filas;
  try {
    filas = parsearArchivo(req.file);
  } catch (e) {
    return res.status(400).json({ error: 'No se pudo parsear el archivo.', detalle: e.message });
  }

  const exitosos = [];
  const errores  = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    try {
      if (!fila.producto_id || !fila.numero_serie) {
        errores.push({ fila: i + 2, error: 'producto_id y numero_serie son requeridos.' });
        continue;
      }

      const activo = await ActivoFijo.create({
        producto_id:       fila.producto_id,
        numero_serie:      fila.numero_serie,
        mac_address:       fila.mac_address       || null,
        codigo_qr:         fila.codigo_qr         || generarCodigoQR(),
        fecha_adquisicion: fila.fecha_adquisicion || null,
        valor_adquisicion: parseFloat(fila.valor_adquisicion) || null,
        notas:             fila.notas             || null,
      });

      await registrarMovimiento({
        usuario_id:    req.user.id,
        accion:        ACCION_HISTORIAL.CREACION,
        entidad_tipo:  'ActivoFijo',
        entidad_id:    activo.id,
        activo_fijo_id: activo.id,
        producto_id:   activo.producto_id,
        numero_serie:  activo.numero_serie,
        detalle:       { importacion: true, fila: i + 2 },
        ip_address:    req.ip,
      });

      exitosos.push({ fila: i + 2, id: activo.id, numero_serie: activo.numero_serie });
    } catch (e) {
      errores.push({ fila: i + 2, error: e.message });
    }
  }

  return res.json({
    resumen:  { total: filas.length, exitosos: exitosos.length, errores: errores.length },
    exitosos,
    errores,
  });
}

module.exports = { importarProductos, importarActivos };
