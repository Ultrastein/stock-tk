// =====================================================
// JOB: COLD STORAGE — ARCHIVADO LOCAL ON-PREMISE
//
// Política: registros del historial_movimientos y
// soft-deletes con más de COLD_STORAGE_RETENTION_YEARS
// años se comprimen a GZIP, se guardan en
// COLD_STORAGE_PATH (directorio local o mount NAS) y
// se eliminan definitivamente de la DB principal.
//
// Ejecución: 1er día de cada mes a las 02:00.
// =====================================================
const cron = require('node-cron');
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const db   = require('../models');
const { HistorialMovimiento } = db;
const { Op } = db.Sequelize;
const { comprimirJSON } = require('../utils/compression');

const COLD_STORAGE_PATH = process.env.COLD_STORAGE_PATH
  || path.join(__dirname, '../../cold-storage');

async function ejecutarColdStorage() {
  console.log('[ColdStorage] Iniciando archivado local...');

  // Asegurarse de que el directorio de destino exista
  if (!fs.existsSync(COLD_STORAGE_PATH)) {
    fs.mkdirSync(COLD_STORAGE_PATH, { recursive: true });
    console.log(`[ColdStorage] Directorio creado: ${COLD_STORAGE_PATH}`);
  }

  const retentionYears = parseInt(process.env.COLD_STORAGE_RETENTION_YEARS) || 3;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - retentionYears);

  // 1. Registros de historial más antiguos que la política
  const registrosHistorial = await HistorialMovimiento.findAll({
    where: { created_at: { [Op.lt]: cutoff } },
    raw: true,
  });

  // 2. Soft-deletes de todas las tablas operativas con más antigüedad
  //    Sequelize paranoid: los registros con deleted_at son accesibles con paranoid: false
  const modelosParanoid = [
    'Usuario', 'Producto', 'ActivoFijo', 'Kit', 'KitComponente',
    'Despacho', 'DespachoItem', 'Reserva', 'ReservaItem',
    'TicketMantenimiento', 'PedidoReposicion', 'PedidoItem',
    'ProveedorCotizacion', 'Alerta',
  ];

  const softDeletesArchivados = {};

  for (const modelName of modelosParanoid) {
    const model = db[modelName];
    if (!model) continue;

    const registros = await model.findAll({
      where: { deleted_at: { [Op.lt]: cutoff } },
      paranoid: false,
      raw: true,
    });

    if (registros.length > 0) {
      softDeletesArchivados[modelName] = registros;
    }
  }

  const totalSoftDeletes = Object.values(softDeletesArchivados)
    .reduce((sum, arr) => sum + arr.length, 0);

  if (!registrosHistorial.length && totalSoftDeletes === 0) {
    console.log('[ColdStorage] Sin registros a archivar.');
    return;
  }

  console.log(`[ColdStorage] Historial: ${registrosHistorial.length} registros.`);
  console.log(`[ColdStorage] Soft-deletes: ${totalSoftDeletes} registros.`);

  // 3. Comprimir y guardar archivo
  const payload = {
    exportado_en:   new Date().toISOString(),
    politica_años:  retentionYears,
    corte:          cutoff.toISOString(),
    historial:      registrosHistorial,
    soft_deletes:   softDeletesArchivados,
  };

  const buffer = await comprimirJSON(payload);
  const fecha  = new Date().toISOString().slice(0, 10);
  const nombre = `cold-storage-${fecha}.json.gz`;
  const destino = path.join(COLD_STORAGE_PATH, nombre);

  fs.writeFileSync(destino, buffer);
  console.log(`[ColdStorage] Archivo guardado: ${destino}`);

  // 4. Hard delete del historial archivado
  if (registrosHistorial.length > 0) {
    const ids = registrosHistorial.map(r => r.id);
    const deleted = await HistorialMovimiento.destroy({
      where: { id: { [Op.in]: ids } },
      force: true,
    });
    console.log(`[ColdStorage] Historial: ${deleted} registros eliminados de la DB.`);
  }

  // 5. Hard delete de soft-deletes archivados
  for (const [modelName, registros] of Object.entries(softDeletesArchivados)) {
    if (!registros.length) continue;
    const model = db[modelName];
    const ids = registros.map(r => r.id);
    const deleted = await model.destroy({
      where: { id: { [Op.in]: ids } },
      paranoid: false,
      force: true,
    });
    console.log(`[ColdStorage] ${modelName}: ${deleted} soft-deletes eliminados.`);
  }

  console.log('[ColdStorage] Archivado completado.');
}

function schedule() {
  // 1er día de cada mes a las 02:00
  cron.schedule('0 2 1 * *', async () => {
    try {
      await ejecutarColdStorage();
    } catch (e) {
      console.error('[ColdStorage] Error:', e.message);
    }
  });
  console.log('[ColdStorage] Scheduler registrado (día 1 de cada mes, 02:00).');
}

async function archivarHistorial() {
  const retentionDays = parseInt(process.env.COLD_STORAGE_RETENTION_DAYS) || 90;
  const limite = new Date();
  limite.setDate(limite.getDate() - retentionDays);

  const viejos = await HistorialMovimiento.findAll({
    where: { created_at: { [Op.lt]: limite } },
    raw: true,
  });
  if (!viejos.length) {
    console.log('[cold-storage] Sin movimientos para archivar.');
    return;
  }

  const mes    = new Date().toISOString().slice(0, 7); // "2026-06"
  const nombre = `historial-${mes}.json.gz`;
  // Uses COLD_STORAGE_PATH so NAS/custom mounts work the same as the main job
  const ruta   = path.join(COLD_STORAGE_PATH, nombre);
  fs.mkdirSync(COLD_STORAGE_PATH, { recursive: true });

  // Append mode: each weekly run adds a gzip member to the monthly file.
  // Concatenated gzip is standard — gunzip/zcat decompress all members correctly.
  await new Promise((resolve, reject) => {
    const gz  = zlib.createGzip();
    const out = fs.createWriteStream(ruta, { flags: 'a' });
    gz.on('error', reject);
    gz.pipe(out);
    gz.write(JSON.stringify(viejos));
    gz.end();
    out.on('finish', resolve);
    out.on('error', reject);
  });

  const ids = viejos.map(h => h.id);
  await HistorialMovimiento.destroy({ where: { id: { [Op.in]: ids } }, force: true });
  console.log(`[cold-storage] Archivados ${ids.length} movimientos → ${nombre}`);
}

function scheduleHistorial() {
  // Domingos a las 03:00
  cron.schedule('0 3 * * 0', async () => {
    try {
      await archivarHistorial();
    } catch (e) {
      console.error('[cold-storage] Error en archivarHistorial:', e.message);
    }
  });
  console.log('[ColdStorage] Historial scheduler registrado (domingos 3am).');
}

module.exports = { schedule, ejecutarColdStorage, archivarHistorial, scheduleHistorial };
