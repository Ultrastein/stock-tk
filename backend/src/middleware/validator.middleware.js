// =====================================================
// MIDDLEWARE: VALIDACIÓN DE CAMPOS
// =====================================================

/**
 * Factory que retorna un middleware para validar
 * que los campos requeridos existan en req.body.
 * @param {string[]} campos - Nombres de campos requeridos
 * @returns {Function} Middleware de Express
 */
function validarCampos(campos) {
  return (req, res, next) => {
    const faltantes = campos.filter(
      (campo) => req.body[campo] === undefined || req.body[campo] === null || req.body[campo] === ''
    );

    if (faltantes.length > 0) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes.',
        campos_faltantes: faltantes,
      });
    }

    next();
  };
}

module.exports = { validarCampos };
