// =====================================================
// MODELO: UBICACIÓN
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Ubicacion extends Model {
    static associate(models) {
      Ubicacion.hasMany(models.Producto, {
        as: 'productos',
        foreignKey: 'ubicacion_id',
      });
      Ubicacion.hasMany(models.Despacho, {
        as: 'despachos',
        foreignKey: 'ubicacion_destino_id',
      });
      Ubicacion.hasMany(models.Reserva, {
        as: 'reservas',
        foreignKey: 'ubicacion_destino_id',
      });
    }
  }

  Ubicacion.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      tipo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'otro',
      },
      edificio: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      piso: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Ubicacion',
      tableName: 'ubicaciones',
      paranoid: true,
    }
  );

  return Ubicacion;
};
