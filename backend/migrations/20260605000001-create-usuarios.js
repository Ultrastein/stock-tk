'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      email:         { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      nombre:        { type: Sequelize.STRING(255), allowNull: false },
      rol:           { type: Sequelize.ENUM('admin', 'kiosco', 'docente'), allowNull: false, defaultValue: 'docente' },
      activo:        { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:    { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('usuarios', ['email']);
    await queryInterface.addIndex('usuarios', ['deleted_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};
