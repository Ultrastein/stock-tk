function startScheduler() {
  require('./coldStorage.job').schedule();
  require('./alertas.job').schedule();
  console.log('✅ Jobs programados: coldStorage (1º de cada mes 2am), alertas (diario 8am)');
}

module.exports = { startScheduler };
