// =====================================================
// MODELO: RESERVA ITEM
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ReservaItem extends Model {
    static associate(models) {
      ReservaItem.belongsTo(models.Reserva, {
        as: 'reserva',
        foreignKey: 'reserva_id',
        onDelete: 'CASCADE',
      });
      ReservaItem.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
      ReservaItem.belongsTo(models.ActivoFijo, {
        as: 'activoFijo',
        foreignKey: 'activo_fijo_id',
      });
      ReservaItem.belongsTo(models.Kit, {
        as: 'kit',
        foreignKey: 'kit_id',
      });
    }
  }

  ReservaItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      reserva_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'reservas', key: 'id' },
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'productos', key: 'id' },
      },
      activo_fijo_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'activos_fijos', key: 'id' },
      },
      kit_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'kits', key: 'id' },
      },
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },
    },
    {
      sequelize,
      modelName: 'ReservaItem',
      tableName: 'reserva_items',
      paranoid: true,
      indexes: [
        { fields: ['reserva_id'] },
        { fields: ['producto_id'] },
      ],
    }
  );

  return ReservaItem;
};
