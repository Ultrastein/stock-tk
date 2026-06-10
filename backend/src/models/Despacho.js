// =====================================================
// MODELO: DESPACHO (Movimiento de entrada/salida)
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { TIPO_DESPACHO, ESTADO_DESPACHO, values } = require('../config/constants');

module.exports = (sequelize) => {
  class Despacho extends Model {
    static associate(models) {
      // Solicitante
      Despacho.belongsTo(models.Usuario, {
        as: 'solicitante',
        foreignKey: 'solicitante_id',
      });
      // Responsable de entrega/recepción
      Despacho.belongsTo(models.Usuario, {
        as: 'responsable',
        foreignKey: 'responsable_id',
      });
      // Ubicación de destino
      Despacho.belongsTo(models.Ubicacion, {
        as: 'ubicacionDestino',
        foreignKey: 'ubicacion_destino_id',
      });
      // Reserva asociada
      Despacho.belongsTo(models.Reserva, {
        as: 'reserva',
        foreignKey: 'reserva_id',
      });
      // Ítems del despacho
      Despacho.hasMany(models.DespachoItem, {
        as: 'items',
        foreignKey: 'despacho_id',
        onDelete: 'CASCADE',
      });
    }
  }

  Despacho.init(
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
      tipo: {
        type: DataTypes.ENUM(...values(TIPO_DESPACHO)),
        allowNull: false,
      },
      estado: {
        type: DataTypes.ENUM(...values(ESTADO_DESPACHO)),
        allowNull: false,
        defaultValue: ESTADO_DESPACHO.PENDIENTE,
      },
      solicitante_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      responsable_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
      },
      ubicacion_destino_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'ubicaciones', key: 'id' },
      },
      reserva_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'reservas', key: 'id' },
      },
      fecha_despacho: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fecha_devolucion_esperada: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sync_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID generado offline para deduplicación en sincronización',
      },
      created_offline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Indica si el despacho fue creado sin conexión',
      },
    },
    {
      sequelize,
      modelName: 'Despacho',
      tableName: 'despachos',
      paranoid: true,
      indexes: [
        { fields: ['codigo'] },
        { fields: ['tipo'] },
        { fields: ['estado'] },
        { fields: ['solicitante_id'] },
        { fields: ['responsable_id'] },
        { fields: ['reserva_id'] },
        { fields: ['sync_id'] },
        { fields: ['fecha_despacho'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return Despacho;
};
