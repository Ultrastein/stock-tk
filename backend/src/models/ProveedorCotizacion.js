// =====================================================
// MODELO: PROVEEDOR / COTIZACIÓN
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ProveedorCotizacion extends Model {
    static associate(models) {
      ProveedorCotizacion.belongsTo(models.PedidoReposicion, {
        as: 'pedido',
        foreignKey: 'pedido_id',
        onDelete: 'CASCADE',
      });
    }
  }

  ProveedorCotizacion.init(
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
      nombre_proveedor: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        validate: { isUrl: true },
      },
      precio_cotizado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      seleccionado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'ProveedorCotizacion',
      tableName: 'proveedores_cotizacion',
      paranoid: true,
      indexes: [
        { fields: ['pedido_id'] },
      ],
    }
  );

  return ProveedorCotizacion;
};
