// =====================================================
// UTILIDAD: PARSER CSV / EXCEL
// =====================================================
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

/**
 * Parsea un buffer CSV y retorna un array de objetos.
 * @param {Buffer} buffer - Buffer del archivo CSV
 * @returns {Array<Object>} Filas parseadas como objetos
 */
function parsearCSV(buffer) {
  const contenido = buffer.toString('utf-8');
  const registros = parse(contenido, {
    columns: true,          // Usa la primera fila como headers
    skip_empty_lines: true,
    trim: true,
    bom: true,              // Maneja BOM de UTF-8
  });
  return registros;
}

/**
 * Parsea un buffer Excel (.xlsx/.xls) y retorna un array de objetos.
 * Lee solo la primera hoja del libro.
 * @param {Buffer} buffer - Buffer del archivo Excel
 * @returns {Array<Object>} Filas parseadas como objetos
 */
function parsearExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const nombreHoja = workbook.SheetNames[0];
  const hoja = workbook.Sheets[nombreHoja];
  const registros = XLSX.utils.sheet_to_json(hoja, { defval: null });
  return registros;
}

module.exports = {
  parsearCSV,
  parsearExcel,
};
