// =====================================================
// EXPRESS APPLICATION SETUP
// =====================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const routes = require('./routes');

const app = express();

// =====================================================
// MIDDLEWARE GLOBALES
// =====================================================

// Seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Sync-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por ventana
  message: { error: 'Demasiadas solicitudes, intente nuevamente más tarde.' },
});
app.use('/api/', limiter);

// Parseo de body
app.use(express.json({ limit: '50mb' }));       // Para importaciones masivas
app.use(express.urlencoded({ extended: true }));

// Compresión gzip
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =====================================================
// RUTAS
// =====================================================
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================================================
// MANEJO DE ERRORES GLOBAL
// =====================================================

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('❌ Error:', err);

  // Error de Sequelize (validación)
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      detalles: err.errors.map(e => ({
        campo: e.path,
        mensaje: e.message,
      })),
    });
  }

  // Error de Sequelize (constraint único)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Registro duplicado',
      detalles: err.errors.map(e => ({
        campo: e.path,
        mensaje: e.message,
      })),
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor.',
  });
});

module.exports = app;
