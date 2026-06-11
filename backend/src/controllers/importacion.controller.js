const db = require('../models');
const { Producto, ActivoFijo, Categoria, Ubicacion } = db;
const { parsearCSV, parsearExcel } = require('../utils/csvParser');
const { generarCodigo, generarCodigoQR } = require('../utils/codeGenerator');
const { registrarMovimiento } = require('../services/historial.service');
const { ACCION_HISTORIAL, TIPO_PRODUCTO } = require('../config/constants');
const XLSX = require('xlsx');

function parsearArchivo(file) {
  const isCsv = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');
  return isCsv ? parsearCSV(file.buffer) : parsearExcel(file.buffer);
}

/**
 * POST /api/importacion/productos
 * Columnas requeridas: nombre, tipo
 * Columnas opcionales: codigo, codigo_barras, descripcion,
 *   categoria (nombre), categoria_id (UUID),
 *   ubicacion (nombre), ubicacion_id (UUID),
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

  // Pre-cargar categorías y ubicaciones para resolución eficiente por nombre
  const [todasCategorias, todasUbicaciones] = await Promise.all([
    Categoria.findAll(),
    Ubicacion.findAll(),
  ]);
  const catPorNombre  = new Map(todasCategorias.map(c => [c.nombre.toLowerCase().trim(), c.id]));
  const ubicPorNombre = new Map(todasUbicaciones.map(u => [u.nombre.toLowerCase().trim(), u.id]));

  const exitosos   = [];
  const errores    = [];
  const advertencias = [];
  const catsCreadas  = new Set();
  const ubicsCreadas = new Set();

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

      // Resolver categoría: buscar por nombre → auto-crear si no existe
      let categoria_id = fila.categoria_id || null;
      if (!categoria_id && fila.categoria) {
        const key = String(fila.categoria).toLowerCase().trim();
        categoria_id = catPorNombre.get(key) || null;
        if (!categoria_id) {
          const [cat, creada] = await Categoria.findOrCreate({
            where: { nombre: String(fila.categoria).trim() },
          });
          categoria_id = cat.id;
          catPorNombre.set(key, cat.id);
          if (creada && !catsCreadas.has(key)) {
            catsCreadas.add(key);
            advertencias.push(`Categoría "${fila.categoria}" creada automáticamente.`);
          }
        }
      }

      // Resolver ubicación: buscar por nombre → auto-crear si no existe
      let ubicacion_id = fila.ubicacion_id || null;
      if (!ubicacion_id && fila.ubicacion) {
        const key = String(fila.ubicacion).toLowerCase().trim();
        ubicacion_id = ubicPorNombre.get(key) || null;
        if (!ubicacion_id) {
          const [ubic, creada] = await Ubicacion.findOrCreate({
            where: { nombre: String(fila.ubicacion).trim() },
            defaults: { tipo: 'otro' },
          });
          ubicacion_id = ubic.id;
          ubicPorNombre.set(key, ubic.id);
          if (creada && !ubicsCreadas.has(key)) {
            ubicsCreadas.add(key);
            advertencias.push(`Ubicación "${fila.ubicacion}" creada automáticamente.`);
          }
        }
      }

      const producto = await Producto.create({
        codigo:            fila.codigo           || generarCodigo('PRD'),
        codigo_barras:     fila.codigo_barras     || null,
        nombre:            fila.nombre,
        descripcion:       fila.descripcion      || null,
        tipo:              fila.tipo,
        categoria_id,
        ubicacion_id,
        stock_actual:      parseInt(fila.stock_actual)      || 0,
        stock_minimo:      parseInt(fila.stock_minimo)      || 0,
        unidad_medida:     fila.unidad_medida     || 'unidades',
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
    resumen:  { total: filas.length, exitosos: exitosos.length, errores: errores.length, advertencias: advertencias.length },
    exitosos,
    errores,
    advertencias,
  });
}

/**
 * POST /api/importacion/activos
 * Columnas requeridas: numero_serie + (producto_codigo | producto_id)
 * Columnas opcionales: mac_address, codigo_qr, fecha_adquisicion, valor_adquisicion,
 *   fecha_garantia, vida_util_anos, notas
 */
async function importarActivos(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo.' });

  let filas;
  try {
    filas = parsearArchivo(req.file);
  } catch (e) {
    return res.status(400).json({ error: 'No se pudo parsear el archivo.', detalle: e.message });
  }

  // Pre-cargar productos por código para resolución eficiente
  const todosProductos = await Producto.findAll({ attributes: ['id', 'codigo'] });
  const prodPorCodigo  = new Map(todosProductos.map(p => [p.codigo.toLowerCase().trim(), p.id]));

  const exitosos = [];
  const errores  = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    try {
      // Resolver producto: primero por código, luego por UUID directo
      let producto_id = fila.producto_id || null;
      if (!producto_id && fila.producto_codigo) {
        producto_id = prodPorCodigo.get(String(fila.producto_codigo).toLowerCase().trim()) || null;
        if (!producto_id) {
          errores.push({ fila: i + 2, error: `Producto no encontrado con código: "${fila.producto_codigo}".` });
          continue;
        }
      }

      if (!producto_id || !fila.numero_serie) {
        errores.push({ fila: i + 2, error: 'producto_codigo (o producto_id) y numero_serie son requeridos.' });
        continue;
      }

      const activo = await ActivoFijo.create({
        producto_id,
        numero_serie:      fila.numero_serie,
        mac_address:       fila.mac_address       || null,
        codigo_qr:         fila.codigo_qr         || generarCodigoQR(),
        fecha_adquisicion: fila.fecha_adquisicion || null,
        valor_adquisicion: parseFloat(fila.valor_adquisicion) || null,
        fecha_garantia:    fila.fecha_garantia    || null,
        vida_util_anos:    parseInt(fila.vida_util_anos)      || null,
        notas:             fila.notas             || null,
      });

      await registrarMovimiento({
        usuario_id:     req.user.id,
        accion:         ACCION_HISTORIAL.CREACION,
        entidad_tipo:   'ActivoFijo',
        entidad_id:     activo.id,
        activo_fijo_id: activo.id,
        producto_id:    activo.producto_id,
        numero_serie:   activo.numero_serie,
        detalle:        { importacion: true, fila: i + 2 },
        ip_address:     req.ip,
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

/**
 * GET /api/importacion/plantilla
 * Genera y descarga un .xlsx con tres hojas:
 *   - Productos: columnas + 2 filas de ejemplo
 *   - Activos Fijos: columnas + 2 filas de ejemplo
 *   - Referencia: categorías y ubicaciones actuales del sistema
 */
async function generarPlantilla(req, res) {
  try {
  const [categorias, ubicaciones] = await Promise.all([
    Categoria.findAll({ order: [['nombre', 'ASC']] }),
    Ubicacion.findAll({ order: [['nombre', 'ASC']] }),
  ]);

  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Productos ─────────────────────────────────────────────────────
  const cat0  = categorias[0]?.nombre  || '*** ver hoja Referencia ***';
  const cat1  = categorias[1]?.nombre  || cat0;
  const ubic0 = ubicaciones[0]?.nombre || '*** ver hoja Referencia ***';
  const ubic1 = ubicaciones[1]?.nombre || ubic0;

  const productosRows = [
    ['nombre', 'tipo', 'codigo', 'codigo_barras', 'descripcion', 'categoria', 'ubicacion', 'stock_actual', 'stock_minimo', 'unidad_medida', 'precio_referencia'],
    ['[EJEMPLO - borrar esta fila] Notebook HP 15', 'retornable', 'NB-001', '', 'Notebook para uso docente', cat0, ubic0, 5, 2, 'unidades', 85000],
    ['[EJEMPLO - borrar esta fila] Marcador azul pizarrón', 'consumible', '', '', 'Marcador para pizarrón color azul', cat1, ubic1, 50, 10, 'unidades', 350],
  ];
  const wsProductos = XLSX.utils.aoa_to_sheet(productosRows);
  wsProductos['!cols'] = [
    { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 35 },
    { wch: 20 }, { wch: 20 }, { wch: 13 }, { wch: 13 }, { wch: 14 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');

  // ── Hoja 2: Activos Fijos ─────────────────────────────────────────────────
  const activosRows = [
    ['producto_codigo', 'numero_serie', 'mac_address', 'fecha_adquisicion', 'valor_adquisicion', 'fecha_garantia', 'vida_util_anos', 'notas'],
    ['NB-001', 'SN12345678', 'AA:BB:CC:DD:EE:FF', '2024-01-15', 85000, '2026-01-15', 5, 'Buen estado'],
    ['NB-001', 'SN87654321', '', '2024-01-15', 85000, '', '', ''],
  ];
  const wsActivos = XLSX.utils.aoa_to_sheet(activosRows);
  wsActivos['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 15 }, { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsActivos, 'Activos Fijos');

  // ── Hoja 3: Referencia ────────────────────────────────────────────────────
  const maxRows = Math.max(categorias.length, ubicaciones.length);
  const refRows = [
    ['CATEGORÍAS', '', '', 'UBICACIONES', ''],
    ['Nombre', 'Descripción', '', 'Nombre', 'Tipo'],
  ];
  for (let i = 0; i < maxRows; i++) {
    const cat  = categorias[i];
    const ubic = ubicaciones[i];
    refRows.push([
      cat  ? cat.nombre              : '',
      cat  ? (cat.descripcion || '') : '',
      '',
      ubic ? ubic.nombre : '',
      ubic ? ubic.tipo   : '',
    ]);
  }
  // Tipos de producto válidos
  refRows.push([]);
  refRows.push(['TIPOS DE PRODUCTO VÁLIDOS', '', '', 'TIPOS DE UBICACIÓN VÁLIDOS', '']);
  refRows.push(['retornable', '', '', 'aula', '']);
  refRows.push(['consumible', '', '', 'deposito', '']);
  refRows.push(['', '', '', 'laboratorio', '']);
  refRows.push(['', '', '', 'otro', '']);

  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef['!cols'] = [{ wch: 28 }, { wch: 35 }, { wch: 4 }, { wch: 28 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referencia');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-importacion.xlsx"');
  return res.send(buffer);
  } catch (err) {
    console.error('❌ Error generando plantilla:', err);
    return res.status(500).json({ error: 'Error al generar la plantilla.', detalle: err.message });
  }
}

module.exports = { importarProductos, importarActivos, generarPlantilla };
