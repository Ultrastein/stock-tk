function startScheduler() {
  const coldStorage = require('./coldStorage.job');
  coldStorage.schedule();
  coldStorage.scheduleHistorial();
  require('./alertas.job').schedule();
  console.log('✅ Jobs programados: coldStorage (1º de cada mes 2am), historial (domingos 3am), alertas (diario 8am)');
}

module.exports = { startScheduler };
