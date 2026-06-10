// =====================================================
// MODELO: CATEGORÍA
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Categoria extends Model {
    static associate(models) {
      Categoria.hasMany(models.Producto, {
        as: 'productos',
        foreignKey: 'categoria_id',
      });
    }
  }

  Categoria.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Categoria',
      tableName: 'categorias',
      paranoid: true,
    }
  );

  return Categoria;
};
