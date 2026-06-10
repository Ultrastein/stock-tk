'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ubicaciones', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre:     { type: Sequelize.STRING(255), allowNull: false },
      tipo:       { type: Sequelize.ENUM('aula', 'deposito', 'laboratorio', 'otro'), allowNull: false, defaultValue: 'aula' },
      edificio:   { type: Sequelize.STRING(100), allowNull: true },
      piso:       { type: Sequelize.STRING(50), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ubicaciones');
  },
};
