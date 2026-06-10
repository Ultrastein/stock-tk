// =====================================================
// UTILIDAD: COMPRESIÓN / DESCOMPRESIÓN JSON (GZIP)
// =====================================================
const zlib = require('zlib');

/**
 * Comprime un objeto/array JSON a un buffer gzip.
 * @param {*} data - Datos a comprimir (se serializa a JSON)
 * @returns {Promise<Buffer>} Buffer comprimido con gzip
 */
function comprimirJSON(data) {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(data);
    zlib.gzip(Buffer.from(jsonStr, 'utf-8'), (err, buffer) => {
      if (err) return reject(err);
      resolve(buffer);
    });
  });
}

/**
 * Descomprime un buffer gzip a un objeto JSON.
 * @param {Buffer} buffer - Buffer comprimido con gzip
 * @returns {Promise<*>} Datos descomprimidos y parseados
 */
function descomprimirJSON(buffer) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buffer, (err, result) => {
      if (err) return reject(err);
      try {
        const data = JSON.parse(result.toString('utf-8'));
        resolve(data);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

module.exports = {
  comprimirJSON,
  descomprimirJSON,
};
