// =====================================================
// MODELO: HISTORIAL DE MOVIMIENTOS (INMUTABLE - SIN SOFT DELETE)
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ACCION_HISTORIAL, values } = require('../config/constants');

module.exports = (sequelize) => {
  class HistorialMovimiento extends Model {
    static associate(models) {
      HistorialMovimiento.belongsTo(models.Usuario, {
        as: 'usuario',
        foreignKey: 'usuario_id',
      });
      HistorialMovimiento.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
      HistorialMovimiento.belongsTo(models.ActivoFijo, {
        as: 'activoFijo',
        foreignKey: 'activo_fijo_id',
      });
      HistorialMovimiento.belongsTo(models.Kit, {
        as: 'kit',
        foreignKey: 'kit_id',
      });
    }
  }

  HistorialMovimiento.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      accion: {
        type: DataTypes.ENUM(...values(ACCION_HISTORIAL)),
        allowNull: false,
      },
      entidad_tipo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del modelo afectado (Producto, ActivoFijo, Kit, etc.)',
      },
      entidad_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID del registro afectado',
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
      kit_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'kits', key: 'id' },
      },
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      numero_serie: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      detalle: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Datos adicionales: estado anterior/nuevo, motivo, etc.',
      },
      ip_address: {
        type: DataTypes.STRING(45), // IPv4 e IPv6
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'HistorialMovimiento',
      tableName: 'historial_movimientos',
      paranoid: false,       // ⚠️ NO soft delete - tabla inmutable
      timestamps: true,
      updatedAt: false,      // Solo createdAt - nunca se modifica
      indexes: [
        { fields: ['usuario_id'] },
        { fields: ['accion'] },
        { fields: ['entidad_tipo', 'entidad_id'] },
        { fields: ['producto_id'] },
        { fields: ['activo_fijo_id'] },
        { fields: ['kit_id'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return HistorialMovimiento;
};
