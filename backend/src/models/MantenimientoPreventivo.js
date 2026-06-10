// =====================================================
// MODELO: MANTENIMIENTO PREVENTIVO
// Plan de mantenimiento programado por activo.
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { FRECUENCIA_MANTENIMIENTO } = require('../config/constants');

module.exports = (sequelize) => {
  class MantenimientoPreventivo extends Model {
    static associate(models) {
      MantenimientoPreventivo.belongsTo(models.ActivoFijo, {
        as: 'activoFijo',
        foreignKey: 'activo_fijo_id',
      });
      MantenimientoPreventivo.belongsTo(models.Usuario, {
        as: 'responsable',
        foreignKey: 'responsable_id',
      });
    }
  }

  MantenimientoPreventivo.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      activo_fijo_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'activos_fijos', key: 'id' },
      },
      descripcion: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Qué debe hacerse: "Limpiar filtro", "Calibrar batería", etc.',
      },
      frecuencia: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: FRECUENCIA_MANTENIMIENTO.ANUAL,
        validate: { isIn: [Object.values(FRECUENCIA_MANTENIMIENTO)] },
      },
      ultima_ejecucion: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      proxima_ejecucion: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      responsable_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'MantenimientoPreventivo',
      tableName: 'mantenimiento_preventivo',
      paranoid: true,
      indexes: [
        { fields: ['activo_fijo_id'] },
        { fields: ['proxima_ejecucion'] },
        { fields: ['activo'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return MantenimientoPreventivo;
};
