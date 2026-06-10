'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('productos', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:            { type: Sequelize.STRING(100), allowNull: false, unique: true },
      codigo_barras:     { type: Sequelize.STRING(255), allowNull: true },
      nombre:            { type: Sequelize.STRING(255), allowNull: false },
      descripcion:       { type: Sequelize.TEXT, allowNull: true },
      tipo:              { type: Sequelize.ENUM('retornable', 'consumible'), allowNull: false },
      categoria_id:      { type: Sequelize.UUID, allowNull: true, references: { model: 'categorias', key: 'id' }, onDelete: 'SET NULL' },
      ubicacion_id:      { type: Sequelize.UUID, allowNull: true, references: { model: 'ubicaciones', key: 'id' }, onDelete: 'SET NULL' },
      stock_actual:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      stock_minimo:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      unidad_medida:     { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'unidades' },
      precio_referencia: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      imagen_url:        { type: Sequelize.STRING(500), allowNull: true },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:        { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('productos', ['codigo']);
    await queryInterface.addIndex('productos', ['tipo']);
    await queryInterface.addIndex('productos', ['deleted_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('productos');
  },
};
