'use strict';

/**
 * Migración: agrega soporte para autenticación con Firebase (Google / Apple).
 *
 * Cambios:
 *  - Columna firebase_uid (VARCHAR 128, nullable, unique) — guarda el UID de Firebase
 *  - password_hash pasa a ser nullable — los usuarios que se autentican con Firebase
 *    no tienen contraseña propia en nuestra base de datos
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Agregar columna firebase_uid
    await queryInterface.addColumn('usuarios', 'firebase_uid', {
      type:      Sequelize.STRING(128),
      allowNull: true,
      unique:    true,
      after:     'email',          // Postgres ignora "after" pero no rompe
    });

    // 2. Índice para búsquedas rápidas por firebase_uid
    await queryInterface.addIndex('usuarios', ['firebase_uid'], {
      name:   'usuarios_firebase_uid_idx',
      unique: true,
      where:  { firebase_uid: { [Sequelize.Op.ne]: null } },
    });

    // 3. Hacer password_hash nullable
    await queryInterface.changeColumn('usuarios', 'password_hash', {
      type:      Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('usuarios', 'usuarios_firebase_uid_idx');
    await queryInterface.removeColumn('usuarios', 'firebase_uid');
    await queryInterface.changeColumn('usuarios', 'password_hash', {
      type:      Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
