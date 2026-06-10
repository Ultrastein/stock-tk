// =====================================================
// MIDDLEWARE: CONTROL DE ROLES
// =====================================================
const { ROLES } = require('../config/constants');

/**
 * Factory que retorna un middleware para verificar
 * que el usuario tenga uno de los roles permitidos.
 * @param  {...string} roles - Roles permitidos (e.g. ROLES.ADMIN, ROLES.KIOSCO)
 * @returns {Function} Middleware de Express
 */
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado. Debe iniciar sesión.',
      });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'No tiene permisos para realizar esta acción.',
        rol_actual: req.user.rol,
        roles_requeridos: roles,
      });
    }

    next();
  };
}

module.exports = { requiereRol };
