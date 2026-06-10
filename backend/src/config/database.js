require('dotenv').config();
const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';

const DEFINE = {
  timestamps:      true,
  underscored:     true,
  freezeTableName: true,
};

let sequelize;

if (process.env.DATABASE_URL) {
  // Render / Railway / Supabase — conexión por URL única
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
    pool:    { max: 10, min: 0, acquire: 30000, idle: 10000 },
    logging: isProduction ? false : console.log,
    define:  DEFINE,
  });
} else {
  // Local on-premise — variables individuales
  sequelize = new Sequelize(
    process.env.DB_NAME     || 'control_stock',
    process.env.DB_USER     || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host:    process.env.DB_HOST || '127.0.0.1',
      port:    parseInt(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      dialectOptions: {},
      pool: {
        max:     parseInt(process.env.DB_POOL_MAX) || 10,
        min:     parseInt(process.env.DB_POOL_MIN) || 0,
        acquire: 30000,
        idle:    10000,
      },
      logging: isProduction ? false : console.log,
      define:  DEFINE,
    }
  );
}

module.exports = sequelize;

// Config para Sequelize CLI
module.exports.development = {
  username: process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME     || 'control_stock',
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT) || 5432,
  dialect:  'postgres',
};

module.exports.production = {
  use_env_variable: 'DATABASE_URL',
  dialect:          'postgres',
  dialectOptions:   { ssl: { require: true, rejectUnauthorized: false } },
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
};
