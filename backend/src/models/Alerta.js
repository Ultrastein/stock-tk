// =====================================================
// MODELO: ALERTA
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { TIPO_ALERTA, values } = require('../config/constants');

module.exports = (sequelize) => {
  class Alerta extends Model {
    static associate(models) {
      Alerta.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
      Alerta.belongsTo(models.ActivoFijo, {
        as: 'activoFijo',
        foreignKey: 'activo_fijo_id',
      });
      Alerta.belongsTo(models.Usuario, {
        as: 'usuarioDestino',
        foreignKey: 'usuario_destino_id',
      });
    }
  }

  Alerta.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tipo: {
        type: DataTypes.ENUM(...values(TIPO_ALERTA)),
        allowNull: false,
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
      mensaje: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      leida: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      usuario_destino_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'Alerta',
      tableName: 'alertas',
      paranoid: true,
      indexes: [
        { fields: ['tipo'] },
        { fields: ['usuario_destino_id'] },
        { fields: ['leida'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return Alerta;
};
