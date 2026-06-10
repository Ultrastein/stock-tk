'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reservas', {
      id:                   { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:               { type: Sequelize.STRING(100), allowNull: false, unique: true },
      solicitante_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      ubicacion_destino_id: { type: Sequelize.UUID, allowNull: true,  references: { model: 'ubicaciones', key: 'id' } },
      estado:               { type: Sequelize.ENUM('borrador', 'confirmada', 'cumplida', 'cancelada', 'vencida'), allowNull: false, defaultValue: 'borrador' },
      fecha_reserva:        { type: Sequelize.DATEONLY, allowNull: false },
      hora_inicio:          { type: Sequelize.TIME, allowNull: true },
      hora_fin:             { type: Sequelize.TIME, allowNull: true },
      notas:                { type: Sequelize.TEXT, allowNull: true },
      created_at:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:           { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('reservas', ['solicitante_id']);
    await queryInterface.addIndex('reservas', ['estado']);
    await queryInterface.addIndex('reservas', ['fecha_reserva']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('reservas');
  },
};
