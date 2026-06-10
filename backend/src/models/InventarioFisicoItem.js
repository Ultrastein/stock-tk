// =====================================================
// MODELO: ÍTEM DE INVENTARIO FÍSICO
// Cada producto/activo contado en una sesión.
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class InventarioFisicoItem extends Model {
    static associate(models) {
      InventarioFisicoItem.belongsTo(models.InventarioFisico, {
        as: 'inventario',
        foreignKey: 'inventario_id',
      });
      InventarioFisicoItem.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
      InventarioFisicoItem.belongsTo(models.ActivoFijo, {
        as: 'activoFijo',
        foreignKey: 'activo_fijo_id',
      });
    }
  }

  InventarioFisicoItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      inventario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'inventarios_fisicos', key: 'id' },
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'productos', key: 'id' },
      },
      activo_fijo_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'activos_fijos', key: 'id' },
      },
      cantidad_esperada: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Stock registrado en el sistema al momento del conteo',
      },
      cantidad_contada: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Cantidad física real encontrada',
      },
      diferencia: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'contada - esperada (negativo = faltante, positivo = sobrante)',
      },
      estado_fisico: {
        type: DataTypes.STRING(30),
        allowNull: true,
        validate: { isIn: [['funcional', 'dañado', 'para_baja']] },
        comment: 'Estado físico observado del activo',
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'InventarioFisicoItem',
      tableName: 'inventario_fisico_items',
      paranoid: true,
      indexes: [
        { fields: ['inventario_id'] },
        { fields: ['producto_id'] },
        { fields: ['activo_fijo_id'] },
      ],
    }
  );

  return InventarioFisicoItem;
};
