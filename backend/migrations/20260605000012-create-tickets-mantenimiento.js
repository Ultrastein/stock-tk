'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets_mantenimiento', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:           { type: Sequelize.STRING(100), allowNull: false, unique: true },
      activo_fijo_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'activos_fijos', key: 'id' } },
      creador_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      tecnico_id:       { type: Sequelize.UUID, allowNull: true,  references: { model: 'usuarios', key: 'id' } },
      despacho_item_id: { type: Sequelize.UUID, allowNull: true,  references: { model: 'despacho_items', key: 'id' } },
      estado:           { type: Sequelize.ENUM('pendiente', 'en_reparacion', 'resuelto', 'rechazado_baja'), allowNull: false, defaultValue: 'pendiente' },
      diagnostico:      { type: Sequelize.TEXT, allowNull: true },
      solucion:         { type: Sequelize.TEXT, allowNull: true },
      costo_reparacion: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      fecha_inicio:     { type: Sequelize.DATE, allowNull: true },
      fecha_fin:        { type: Sequelize.DATE, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:       { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('tickets_mantenimiento', ['activo_fijo_id']);
    await queryInterface.addIndex('tickets_mantenimiento', ['estado']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tickets_mantenimiento');
  },
};
