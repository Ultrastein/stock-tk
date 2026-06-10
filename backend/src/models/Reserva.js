// =====================================================
// MODELO: RESERVA
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ESTADO_RESERVA, values } = require('../config/constants');

module.exports = (sequelize) => {
  class Reserva extends Model {
    static associate(models) {
      Reserva.belongsTo(models.Usuario, {
        as: 'solicitante',
        foreignKey: 'solicitante_id',
      });
      Reserva.belongsTo(models.Ubicacion, {
        as: 'ubicacionDestino',
        foreignKey: 'ubicacion_destino_id',
      });
      Reserva.hasMany(models.ReservaItem, {
        as: 'items',
        foreignKey: 'reserva_id',
        onDelete: 'CASCADE',
      });
      Reserva.hasMany(models.Despacho, {
        as: 'despachos',
        foreignKey: 'reserva_id',
      });
    }
  }

  Reserva.init(
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
      ubicacion_destino_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'ubicaciones', key: 'id' },
      },
      estado: {
        type: DataTypes.ENUM(...values(ESTADO_RESERVA)),
        allowNull: false,
        defaultValue: ESTADO_RESERVA.BORRADOR,
      },
      fecha_reserva: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      hora_inicio: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      hora_fin: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Reserva',
      tableName: 'reservas',
      paranoid: true,
      indexes: [
        { fields: ['codigo'] },
        { fields: ['solicitante_id'] },
        { fields: ['estado'] },
        { fields: ['fecha_reserva'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return Reserva;
};
