'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // Allow null password_hash (Firebase-only accounts have no password)
    await queryInterface.changeColumn('usuarios', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Add firebase_uid column for Google/Apple SSO
    await queryInterface.addColumn('usuarios', 'firebase_uid', {
      type: Sequelize.STRING(128),
      allowNull: true,
      unique: true,
      after: 'email',
    });

    await queryInterface.addIndex('usuarios', ['firebase_uid']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('usuarios', ['firebase_uid']);
    await queryInterface.removeColumn('usuarios', 'firebase_uid');
    await queryInterface.changeColumn('usuarios', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
