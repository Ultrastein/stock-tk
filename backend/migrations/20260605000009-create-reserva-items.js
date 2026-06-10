'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reserva_items', {
      id:             { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      reserva_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'reservas', key: 'id' }, onDelete: 'CASCADE' },
      producto_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      activo_fijo_id: { type: Sequelize.UUID, allowNull: true,  references: { model: 'activos_fijos', key: 'id' } },
      kit_id:         { type: Sequelize.UUID, allowNull: true,  references: { model: 'kits', key: 'id' } },
      cantidad:       { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:     { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:     { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('reserva_items', ['reserva_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('reserva_items');
  },
};
