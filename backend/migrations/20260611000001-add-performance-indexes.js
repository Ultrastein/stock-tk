'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('reserva_items', ['producto_id'], { name: 'idx_reserva_items_producto' });
    await queryInterface.addIndex('reserva_items', ['activo_fijo_id'], { name: 'idx_reserva_items_activo' });
    await queryInterface.addIndex('activos_fijos', ['estado', 'deleted_at'], { name: 'idx_activos_estado_deleted' });
    await queryInterface.addIndex('productos', ['tipo', 'deleted_at'], { name: 'idx_productos_tipo_deleted' });
    await queryInterface.addIndex('productos', ['stock_actual', 'stock_minimo'], { name: 'idx_productos_stock' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('reserva_items', 'idx_reserva_items_producto');
    await queryInterface.removeIndex('reserva_items', 'idx_reserva_items_activo');
    await queryInterface.removeIndex('activos_fijos', 'idx_activos_estado_deleted');
    await queryInterface.removeIndex('productos', 'idx_productos_tipo_deleted');
    await queryInterface.removeIndex('productos', 'idx_productos_stock');
  },
};
