'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activos_fijos', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      producto_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' }, onDelete: 'CASCADE' },
      numero_serie:      { type: Sequelize.STRING(255), allowNull: false, unique: true },
      mac_address:       { type: Sequelize.STRING(17), allowNull: true },
      codigo_qr:         { type: Sequelize.STRING(255), allowNull: true, unique: true },
      estado:            { type: Sequelize.ENUM('disponible', 'en_uso', 'en_reparacion', 'dañado', 'baja_definitiva'), allowNull: false, defaultValue: 'disponible' },
      fecha_adquisicion: { type: Sequelize.DATEONLY, allowNull: true },
      valor_adquisicion: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      notas:             { type: Sequelize.TEXT, allowNull: true },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:        { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('activos_fijos', ['numero_serie']);
    await queryInterface.addIndex('activos_fijos', ['estado']);
    await queryInterface.addIndex('activos_fijos', ['producto_id']);
    await queryInterface.addIndex('activos_fijos', ['deleted_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('activos_fijos');
  },
};
