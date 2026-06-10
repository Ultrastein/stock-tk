'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categorias', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre:      { type: Sequelize.STRING(255), allowNull: false, unique: true },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:  { type: Sequelize.DATE, allowNull: true },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('categorias');
  },
};
