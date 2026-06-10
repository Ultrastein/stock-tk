'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('despacho_items', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      despacho_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'despachos', key: 'id' }, onDelete: 'CASCADE' },
      producto_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      activo_fijo_id:      { type: Sequelize.UUID, allowNull: true,  references: { model: 'activos_fijos', key: 'id' } },
      kit_id:              { type: Sequelize.UUID, allowNull: true,  references: { model: 'kits', key: 'id' } },
      cantidad_despachada: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      cantidad_devuelta:   { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estado_devolucion:   { type: Sequelize.ENUM('pendiente', 'devuelto_funcional', 'devuelto_dañado', 'devuelto_reparacion', 'merma', 'perdido'), allowNull: false, defaultValue: 'pendiente' },
      notas:               { type: Sequelize.TEXT, allowNull: true },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:          { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('despacho_items', ['despacho_id']);
    await queryInterface.addIndex('despacho_items', ['producto_id']);
    await queryInterface.addIndex('despacho_items', ['activo_fijo_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('despacho_items');
  },
};
