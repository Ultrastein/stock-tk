'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedido_items', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      pedido_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'pedidos_reposicion', key: 'id' }, onDelete: 'CASCADE' },
      producto_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      cantidad:          { type: Sequelize.INTEGER, allowNull: false },
      precio_estimado:   { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      cantidad_recibida: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:        { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('pedido_items', ['pedido_id']);
    await queryInterface.addIndex('pedido_items', ['producto_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('pedido_items');
  },
};
