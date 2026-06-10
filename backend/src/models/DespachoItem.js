// =====================================================
// MODELO: DESPACHO ITEM (Línea de detalle de un despacho)
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ESTADO_DEVOLUCION, values } = require('../config/constants');

module.exports = (sequelize) => {
  class DespachoItem extends Model {
    static associate(models) {
      DespachoItem.belongsTo(models.Despacho, {
        as: 'despacho',
        foreignKey: 'despacho_id',
        onDelete: 'CASCADE',
      });
      DespachoItem.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
      });
      DespachoItem.belongsTo(models.ActivoFijo, {
        as: 'activoFijo',
        foreignKey: 'activo_fijo_id',
      });
      DespachoItem.belongsTo(models.Kit, {
        as: 'kit',
        foreignKey: 'kit_id',
      });
      // Ticket originado desde este ítem
      DespachoItem.hasOne(models.TicketMantenimiento, {
        as: 'ticket',
        foreignKey: 'despacho_item_id',
      });
    }
  }

  DespachoItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      despacho_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'despachos', key: 'id' },
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: false,
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
      cantidad_despachada: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },
      cantidad_devuelta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      estado_devolucion: {
        type: DataTypes.ENUM(...values(ESTADO_DEVOLUCION)),
        allowNull: false,
        defaultValue: ESTADO_DEVOLUCION.PENDIENTE,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'DespachoItem',
      tableName: 'despacho_items',
      paranoid: true,
      indexes: [
        { fields: ['despacho_id'] },
        { fields: ['producto_id'] },
        { fields: ['activo_fijo_id'] },
        { fields: ['kit_id'] },
        { fields: ['estado_devolucion'] },
      ],
    }
  );

  return DespachoItem;
};
