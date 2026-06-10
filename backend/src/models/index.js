// =====================================================
// MODEL LOADER + ASOCIACIONES
// Carga automática de todos los modelos y ejecuta
// las asociaciones después de que todos están registrados.
// =====================================================
'use strict';

const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const basename = path.basename(__filename);

const db = {};

// Auto-importar todos los archivos .js del directorio models/
// excepto index.js
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, sequelize.constructor.DataTypes);
    db[model.name] = model;
  });

// Ejecutar asociaciones DESPUÉS de que todos los modelos estén cargados
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = sequelize.constructor;

module.exports = db;
