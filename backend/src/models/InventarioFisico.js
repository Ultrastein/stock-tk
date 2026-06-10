// =====================================================
// MODELO: INVENTARIO FÍSICO
// Sesión de conteo físico de inventario.
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ESTADO_INVENTARIO } = require('../config/constants');

module.exports = (sequelize) => {
  class InventarioFisico extends Model {
    static associate(models) {
      InventarioFisico.belongsTo(models.Usuario, {
        as: 'responsable',
        foreignKey: 'responsable_id',
      });
      InventarioFisico.hasMany(models.InventarioFisicoItem, {
        as: 'items',
        foreignKey: 'inventario_id',
        onDelete: 'CASCADE',
      });
    }
  }

  InventarioFisico.init(
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
      responsable_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      estado: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: ESTADO_INVENTARIO.BORRADOR,
        validate: { isIn: [Object.values(ESTADO_INVENTARIO)] },
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fecha_inicio: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fecha_fin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      diferencias_encontradas: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Cantidad de ítems con diferencia entre esperado y contado',
      },
    },
    {
      sequelize,
      modelName: 'InventarioFisico',
      tableName: 'inventarios_fisicos',
      paranoid: true,
      indexes: [
        { fields: ['codigo'] },
        { fields: ['estado'] },
        { fields: ['responsable_id'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return InventarioFisico;
};
