// =====================================================
// MIDDLEWARE: AUTENTICACIÓN JWT
// =====================================================
const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación.
 * Extrae el token Bearer del header Authorization,
 * lo verifica y adjunta { id, email, rol } en req.user.
 */
function autenticar(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Acceso denegado. Token no proporcionado.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido.' });
    }
    return res.status(401).json({ error: 'Error de autenticación.' });
  }
}

module.exports = { autenticar };
