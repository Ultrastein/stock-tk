'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('proveedores_cotizacion', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      pedido_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'pedidos_reposicion', key: 'id' }, onDelete: 'CASCADE' },
      nombre_proveedor: { type: Sequelize.STRING(255), allowNull: false },
      url:              { type: Sequelize.STRING(1000), allowNull: true },
      precio_cotizado:  { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      notas:            { type: Sequelize.TEXT, allowNull: true },
      seleccionado:     { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:       { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('proveedores_cotizacion', ['pedido_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('proveedores_cotizacion');
  },
};
