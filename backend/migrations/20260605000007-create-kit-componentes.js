'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kit_componentes', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      kit_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'kits', key: 'id' }, onDelete: 'CASCADE' },
      producto_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      activo_fijo_id: { type: Sequelize.UUID, allowNull: true,  references: { model: 'activos_fijos', key: 'id' } },
      cantidad:       { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      es_obligatorio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:     { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('kit_componentes', ['kit_id']);
    await queryInterface.addIndex('kit_componentes', ['producto_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('kit_componentes');
  },
};
