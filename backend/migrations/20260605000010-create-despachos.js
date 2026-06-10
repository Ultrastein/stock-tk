'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('despachos', {
      id:                       { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:                   { type: Sequelize.STRING(100), allowNull: false, unique: true },
      tipo:                     { type: Sequelize.ENUM('salida', 'devolucion'), allowNull: false },
      estado:                   { type: Sequelize.ENUM('pendiente', 'en_proceso', 'completado', 'completado_parcial', 'cancelado'), allowNull: false, defaultValue: 'pendiente' },
      solicitante_id:           { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      responsable_id:           { type: Sequelize.UUID, allowNull: true,  references: { model: 'usuarios', key: 'id' } },
      ubicacion_destino_id:     { type: Sequelize.UUID, allowNull: true,  references: { model: 'ubicaciones', key: 'id' } },
      reserva_id:               { type: Sequelize.UUID, allowNull: true,  references: { model: 'reservas', key: 'id' } },
      fecha_despacho:           { type: Sequelize.DATE, allowNull: true },
      fecha_devolucion_esperada:{ type: Sequelize.DATE, allowNull: true },
      notas:                    { type: Sequelize.TEXT, allowNull: true },
      sync_id:                  { type: Sequelize.UUID, allowNull: true },
      created_offline:          { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:               { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:               { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:               { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('despachos', ['codigo']);
    await queryInterface.addIndex('despachos', ['tipo']);
    await queryInterface.addIndex('despachos', ['estado']);
    await queryInterface.addIndex('despachos', ['sync_id']);
    await queryInterface.addIndex('despachos', ['solicitante_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('despachos');
  },
};
