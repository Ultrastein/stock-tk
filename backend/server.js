// =====================================================
// ENTRY POINT - SERVIDOR EXPRESS
// =====================================================
require('dotenv').config();
const app = require('./src/app');
const db = require('./src/models');
const { startScheduler } = require('./src/jobs/scheduler');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Verificar conexión a la base de datos
    await db.sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL local (On-Premise) establecida correctamente.');

    // Sincronizar modelos (en desarrollo, alter: true; en producción, usar migraciones)
    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos.');
    }

    // Iniciar cron jobs
    startScheduler();
    console.log('✅ Cron jobs programados.');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📋 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

bootstrap();
