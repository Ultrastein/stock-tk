// =====================================================
// MODELO: KIT (Bill of Materials)
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ESTADO_KIT, values } = require('../config/constants');

module.exports = (sequelize) => {
  class Kit extends Model {
    static associate(models) {
      // Componentes del kit
      Kit.hasMany(models.KitComponente, {
        as: 'componentes',
        foreignKey: 'kit_id',
        onDelete: 'CASCADE',
      });
      // Ítems de despacho del kit
      Kit.hasMany(models.DespachoItem, {
        as: 'despachoItems',
        foreignKey: 'kit_id',
      });
      // Historial
      Kit.hasMany(models.HistorialMovimiento, {
        as: 'movimientos',
        foreignKey: 'kit_id',
      });
      // Reserva items
      Kit.hasMany(models.ReservaItem, {
        as: 'reservaItems',
        foreignKey: 'kit_id',
      });
    }
  }

  Kit.init(
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
      codigo_qr: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      estado: {
        type: DataTypes.ENUM(...values(ESTADO_KIT)),
        allowNull: false,
        defaultValue: ESTADO_KIT.DISPONIBLE,
      },
    },
    {
      sequelize,
      modelName: 'Kit',
      tableName: 'kits',
      paranoid: true,
      indexes: [
        { fields: ['codigo'] },
        { fields: ['codigo_qr'] },
        { fields: ['estado'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return Kit;
};
