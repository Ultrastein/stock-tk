// =====================================================
// MODELO: PEDIDO DE REPOSICIÓN
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ESTADO_PEDIDO, values } = require('../config/constants');

module.exports = (sequelize) => {
  class PedidoReposicion extends Model {
    static associate(models) {
      PedidoReposicion.belongsTo(models.Usuario, {
        as: 'solicitante',
        foreignKey: 'solicitante_id',
      });
      PedidoReposicion.belongsTo(models.Usuario, {
        as: 'aprobador',
        foreignKey: 'aprobador_id',
      });
      PedidoReposicion.hasMany(models.PedidoItem, {
        as: 'items',
        foreignKey: 'pedido_id',
        onDelete: 'CASCADE',
      });
      PedidoReposicion.hasMany(models.ProveedorCotizacion, {
        as: 'cotizaciones',
        foreignKey: 'pedido_id',
        onDelete: 'CASCADE',
      });
    }
  }

  PedidoReposicion.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      codigo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      solicitante_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      aprobador_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
      },
      estado: {
        type: DataTypes.ENUM(...values(ESTADO_PEDIDO)),
        allowNull: false,
        defaultValue: ESTADO_PEDIDO.BORRADOR,
      },
      monto_total_estimado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fecha_aprobacion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fecha_recepcion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PedidoReposicion',
      tableName: 'pedidos_reposicion',
      paranoid: true,
      indexes: [
        { fields: ['codigo'] },
        { fields: ['solicitante_id'] },
        { fields: ['estado'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return PedidoReposicion;
};
