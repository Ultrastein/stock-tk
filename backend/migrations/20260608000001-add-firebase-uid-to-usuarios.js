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
    const desc = await queryInterface.describeTable('usuarios');

    // Skip if already added by an earlier migration
    if (!desc.firebase_uid) {
      await queryInterface.addColumn('usuarios', 'firebase_uid', {
        type:      Sequelize.STRING(128),
        allowNull: true,
        unique:    true,
      });

      await queryInterface.addIndex('usuarios', ['firebase_uid'], {
        name:   'usuarios_firebase_uid_idx',
        unique: true,
        where:  { firebase_uid: { [Sequelize.Op.ne]: null } },
      });
    }

    // Safe to run even if already nullable
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
