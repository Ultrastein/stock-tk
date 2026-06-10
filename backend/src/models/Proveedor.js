// =====================================================
// MODELO: PROVEEDOR
// Directorio de proveedores de la institución.
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Proveedor extends Model {
    static associate(models) {
      // Un proveedor puede estar asociado a muchos activos fijos
      Proveedor.hasMany(models.ActivoFijo, {
        as: 'activos',
        foreignKey: 'proveedor_id',
      });
    }
  }

  Proveedor.init(
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
      cuit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
      },
      contacto_nombre: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      contacto_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: { isEmail: true },
      },
      contacto_telefono: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      sitio_web: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      rubro: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Proveedor',
      tableName: 'proveedores',
      paranoid: true,
      indexes: [
        { fields: ['nombre'] },
        { fields: ['cuit'] },
        { fields: ['activo'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return Proveedor;
};
