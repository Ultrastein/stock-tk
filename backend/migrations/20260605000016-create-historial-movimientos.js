'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('historial_movimientos', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuario_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      accion:         { type: Sequelize.ENUM('checkout', 'checkin', 'merma', 'ajuste_stock', 'creacion', 'modificacion', 'baja', 'reparacion', 'recepcion_compra', 'reserva', 'cancelacion'), allowNull: false },
      entidad_tipo:   { type: Sequelize.STRING(100), allowNull: false },
      entidad_id:     { type: Sequelize.UUID, allowNull: false },
      producto_id:    { type: Sequelize.UUID, allowNull: true, references: { model: 'productos', key: 'id' } },
      activo_fijo_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'activos_fijos', key: 'id' } },
      kit_id:         { type: Sequelize.UUID, allowNull: true, references: { model: 'kits', key: 'id' } },
      cantidad:       { type: Sequelize.INTEGER, allowNull: true },
      numero_serie:   { type: Sequelize.STRING(255), allowNull: true },
      detalle:        { type: Sequelize.JSONB, allowNull: true },
      ip_address:     { type: Sequelize.STRING(45), allowNull: true },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      // Sin updated_at ni deleted_at — tabla inmutable
    });
    await queryInterface.addIndex('historial_movimientos', ['usuario_id']);
    await queryInterface.addIndex('historial_movimientos', ['accion']);
    await queryInterface.addIndex('historial_movimientos', ['entidad_tipo', 'entidad_id']);
    await queryInterface.addIndex('historial_movimientos', ['producto_id']);
    await queryInterface.addIndex('historial_movimientos', ['activo_fijo_id']);
    await queryInterface.addIndex('historial_movimientos', ['created_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('historial_movimientos');
  },
};
