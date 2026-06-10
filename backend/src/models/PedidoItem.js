// =====================================================
// MODELO: PEDIDO ITEM
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class PedidoItem extends Model {
    static associate(models) {
      PedidoItem.belongsTo(models.PedidoReposicion, {
        as: 'pedido',
        foreignKey: 'pedido_id',
        onDelete: 'CASCADE',
      });
      PedidoItem.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
    }
  }

  PedidoItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      pedido_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'pedidos_reposicion', key: 'id' },
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'productos', key: 'id' },
      },
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
      },
      precio_estimado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      cantidad_recibida: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
    },
    {
      sequelize,
      modelName: 'PedidoItem',
      tableName: 'pedido_items',
      paranoid: true,
      indexes: [
        { fields: ['pedido_id'] },
        { fields: ['producto_id'] },
      ],
    }
  );

  return PedidoItem;
};
