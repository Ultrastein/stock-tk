'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kits', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:      { type: Sequelize.STRING(100), allowNull: false, unique: true },
      codigo_qr:   { type: Sequelize.STRING(255), allowNull: true, unique: true },
      nombre:      { type: Sequelize.STRING(255), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      estado:      { type: Sequelize.ENUM('disponible', 'en_uso', 'incompleto', 'en_reparacion'), allowNull: false, defaultValue: 'disponible' },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:  { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('kits', ['codigo']);
    await queryInterface.addIndex('kits', ['estado']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('kits');
  },
};
