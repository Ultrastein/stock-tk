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
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Permitir requests sin origin (Postman, mobile, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origen no permitido: ${origin}`));
  },
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
