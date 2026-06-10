// =====================================================
// MODELO: PRODUCTO
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { TIPO_PRODUCTO, values } = require('../config/constants');

module.exports = (sequelize) => {
  class Producto extends Model {
    static associate(models) {
      // Categoría
      Producto.belongsTo(models.Categoria, {
        as: 'categoria',
        foreignKey: 'categoria_id',
        onDelete: 'SET NULL',
      });
      // Ubicación de almacenamiento
      Producto.belongsTo(models.Ubicacion, {
        as: 'ubicacion',
        foreignKey: 'ubicacion_id',
        onDelete: 'SET NULL',
      });
      // Activos fijos individuales (solo retornables)
      Producto.hasMany(models.ActivoFijo, {
        as: 'activosFijos',
        foreignKey: 'producto_id',
        onDelete: 'CASCADE',
      });
      // Ítems de despacho
      Producto.hasMany(models.DespachoItem, {
        as: 'despachoItems',
        foreignKey: 'producto_id',
      });
      // Componentes de kit
      Producto.hasMany(models.KitComponente, {
        as: 'enKits',
        foreignKey: 'producto_id',
      });
      // Ítems de pedido de reposición
      Producto.hasMany(models.PedidoItem, {
        as: 'pedidoItems',
        foreignKey: 'producto_id',
      });
      // Alertas
      Producto.hasMany(models.Alerta, {
        as: 'alertas',
        foreignKey: 'producto_id',
      });
      // Historial
      Producto.hasMany(models.HistorialMovimiento, {
        as: 'movimientos',
        foreignKey: 'producto_id',
      });
      // Reserva items
      Producto.hasMany(models.ReservaItem, {
        as: 'reservaItems',
        foreignKey: 'producto_id',
      });
    }
  }

  Producto.init(
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
      codigo_barras: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tipo: {
        type: DataTypes.ENUM(...values(TIPO_PRODUCTO)),
        allowNull: false,
      },
      categoria_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'categorias', key: 'id' },
      },
      ubicacion_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'ubicaciones', key: 'id' },
      },
      stock_actual: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      stock_minimo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      unidad_medida: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'unidades',
      },
      precio_referencia: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      imagen_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Producto',
      tableName: 'productos',
      paranoid: true,
      indexes: [
        { fields: ['codigo'] },
        { fields: ['codigo_barras'] },
        { fields: ['tipo'] },
        { fields: ['categoria_id'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return Producto;
};
