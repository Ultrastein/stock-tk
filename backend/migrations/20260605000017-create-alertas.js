'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('alertas', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tipo:               { type: Sequelize.ENUM('stock_minimo', 'devolucion_vencida', 'pedido_estancado', 'mantenimiento_pendiente'), allowNull: false },
      producto_id:        { type: Sequelize.UUID, allowNull: true, references: { model: 'productos', key: 'id' } },
      activo_fijo_id:     { type: Sequelize.UUID, allowNull: true, references: { model: 'activos_fijos', key: 'id' } },
      mensaje:            { type: Sequelize.TEXT, allowNull: false },
      leida:              { type: Sequelize.BOOLEAN, defaultValue: false },
      usuario_destino_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      created_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:         { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('alertas', ['usuario_destino_id']);
    await queryInterface.addIndex('alertas', ['leida']);
    await queryInterface.addIndex('alertas', ['tipo']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('alertas');
  },
};
