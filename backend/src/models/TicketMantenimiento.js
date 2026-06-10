// =====================================================
// MODELO: TICKET DE MANTENIMIENTO
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ESTADO_TICKET, values } = require('../config/constants');

module.exports = (sequelize) => {
  class TicketMantenimiento extends Model {
    static associate(models) {
      TicketMantenimiento.belongsTo(models.ActivoFijo, {
        as: 'activoFijo',
        foreignKey: 'activo_fijo_id',
      });
      TicketMantenimiento.belongsTo(models.Usuario, {
        as: 'creador',
        foreignKey: 'creador_id',
      });
      TicketMantenimiento.belongsTo(models.Usuario, {
        as: 'tecnico',
        foreignKey: 'tecnico_id',
      });
      TicketMantenimiento.belongsTo(models.DespachoItem, {
        as: 'despachoItemOrigen',
        foreignKey: 'despacho_item_id',
      });
    }
  }

  TicketMantenimiento.init(
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
      activo_fijo_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'activos_fijos', key: 'id' },
      },
      creador_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      tecnico_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
      },
      estado: {
        type: DataTypes.ENUM(...values(ESTADO_TICKET)),
        allowNull: false,
        defaultValue: ESTADO_TICKET.PENDIENTE,
      },
      diagnostico: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      solucion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      costo_reparacion: {
        type: DataTypes.DECIMAL(12, 2),
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
      despacho_item_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'despacho_items', key: 'id' },
        comment: 'Ítem de despacho que originó el ticket (check-in con daño)',
      },
    },
    {
      sequelize,
      modelName: 'TicketMantenimiento',
      tableName: 'tickets_mantenimiento',
      paranoid: true,
      indexes: [
        { fields: ['codigo'] },
        { fields: ['activo_fijo_id'] },
        { fields: ['creador_id'] },
        { fields: ['tecnico_id'] },
        { fields: ['estado'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return TicketMantenimiento;
};
