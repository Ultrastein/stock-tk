'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedidos_reposicion', {
      id:                   { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:               { type: Sequelize.STRING(100), allowNull: false, unique: true },
      solicitante_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      aprobador_id:         { type: Sequelize.UUID, allowNull: true,  references: { model: 'usuarios', key: 'id' } },
      estado:               { type: Sequelize.ENUM('borrador', 'pendiente_aprobacion', 'aprobado', 'comprado', 'en_camino', 'recibido', 'rechazado'), allowNull: false, defaultValue: 'borrador' },
      monto_total_estimado: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      notas:                { type: Sequelize.TEXT, allowNull: true },
      fecha_aprobacion:     { type: Sequelize.DATE, allowNull: true },
      fecha_recepcion:      { type: Sequelize.DATE, allowNull: true },
      created_at:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:           { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('pedidos_reposicion', ['estado']);
    await queryInterface.addIndex('pedidos_reposicion', ['solicitante_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('pedidos_reposicion');
  },
};
