// =====================================================
// CONFIGURACIÓN DE SEQUELIZE — LOCAL ON-PREMISE
// Conexión directa a PostgreSQL en máquina de la red.
// Sin SSL: la base corre en la misma red privada.
// =====================================================
require('dotenv').config();
const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME     || 'control_stock',
  process.env.DB_USER     || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host:    process.env.DB_HOST || '127.0.0.1',
    port:    parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    // Sin SSL para conexiones locales de red privada
    dialectOptions: {},
    pool: {
      max:     parseInt(process.env.DB_POOL_MAX)  || 10,
      min:     parseInt(process.env.DB_POOL_MIN)  || 0,
      acquire: 30000,
      idle:    10000,
    },
    logging: isProduction ? false : console.log,
    define: {
      timestamps:    true,
      underscored:   true,      // snake_case en DB (created_at, updated_at)
      freezeTableName: true,    // No pluraliza nombres de tabla
    },
  }
);

module.exports = sequelize;

// Config para Sequelize CLI (archivo .sequelizerc apunta aquí)
module.exports.development = {
  username: process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME     || 'control_stock',
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT) || 5432,
  dialect:  'postgres',
};

module.exports.production = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 5432,
  dialect:  'postgres',
  pool: { max: 15, min: 2, acquire: 30000, idle: 10000 },
};
