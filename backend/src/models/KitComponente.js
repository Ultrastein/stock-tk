// =====================================================
// MODELO: KIT COMPONENTE (Ítems dentro de un Kit)
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class KitComponente extends Model {
    static associate(models) {
      KitComponente.belongsTo(models.Kit, {
        as: 'kit',
        foreignKey: 'kit_id',
        onDelete: 'CASCADE',
      });
      KitComponente.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
      KitComponente.belongsTo(models.ActivoFijo, {
        as: 'activoFijo',
        foreignKey: 'activo_fijo_id',
      });
    }
  }

  KitComponente.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      kit_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'kits', key: 'id' },
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'productos', key: 'id' },
      },
      activo_fijo_id: {
        type: DataTypes.UUID,
        allowNull: true, // NULL para consumibles, UUID para retornables
        references: { model: 'activos_fijos', key: 'id' },
      },
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },
      es_obligatorio: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'KitComponente',
      tableName: 'kit_componentes',
      paranoid: true,
      indexes: [
        { fields: ['kit_id'] },
        { fields: ['producto_id'] },
        { fields: ['activo_fijo_id'] },
      ],
    }
  );

  return KitComponente;
};
