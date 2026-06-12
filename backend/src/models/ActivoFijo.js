// =====================================================
// MODELO: ACTIVO FIJO (Equipos individuales serializados)
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ESTADO_ACTIVO, values } = require('../config/constants');

module.exports = (sequelize) => {
  class ActivoFijo extends Model {
    static associate(models) {
      // Producto padre
      ActivoFijo.belongsTo(models.Producto, {
        as: 'producto',
        foreignKey: 'producto_id',
        onDelete: 'CASCADE',
      });
      // Tickets de mantenimiento
      ActivoFijo.hasMany(models.TicketMantenimiento, {
        as: 'tickets',
        foreignKey: 'activo_fijo_id',
      });
      // Ítems de despacho
      ActivoFijo.hasMany(models.DespachoItem, {
        as: 'despachoItems',
        foreignKey: 'activo_fijo_id',
      });
      // Componentes de kit
      ActivoFijo.hasMany(models.KitComponente, {
        as: 'enKits',
        foreignKey: 'activo_fijo_id',
      });
      // Historial
      ActivoFijo.hasMany(models.HistorialMovimiento, {
        as: 'movimientos',
        foreignKey: 'activo_fijo_id',
      });
      // Alertas
      ActivoFijo.hasMany(models.Alerta, {
        as: 'alertas',
        foreignKey: 'activo_fijo_id',
      });
      // Reserva items
      ActivoFijo.hasMany(models.ReservaItem, {
        as: 'reservaItems',
        foreignKey: 'activo_fijo_id',
      });
      // Proveedor
      ActivoFijo.belongsTo(models.Proveedor, {
        as: 'proveedor',
        foreignKey: 'proveedor_id',
      });
      // Mantenimiento preventivo
      ActivoFijo.hasMany(models.MantenimientoPreventivo, {
        as: 'mantenimientosPreventivos',
        foreignKey: 'activo_fijo_id',
      });
    }
  }

  ActivoFijo.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'productos', key: 'id' },
      },
      numero_serie: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      mac_address: {
        type: DataTypes.STRING(17), // XX:XX:XX:XX:XX:XX
        allowNull: true,
      },
      codigo_qr: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      estado: {
        type: DataTypes.ENUM(...values(ESTADO_ACTIVO)),
        allowNull: false,
        defaultValue: ESTADO_ACTIVO.DISPONIBLE,
      },
      fecha_adquisicion: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      valor_adquisicion: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      fecha_garantia: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha de vencimiento de la garantía del fabricante',
      },
      vida_util_anos: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1 },
        comment: 'Vida útil estimada en años (para proyección de reposición)',
      },
      imagen_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL de foto del activo',
      },
      proveedor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'proveedores', key: 'id' },
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ActivoFijo',
      tableName: 'activos_fijos',
      paranoid: true,
      indexes: [
        { fields: ['numero_serie'] },
        { fields: ['mac_address'] },
        { fields: ['codigo_qr'] },
        { fields: ['estado'] },
        { fields: ['producto_id'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return ActivoFijo;
};
