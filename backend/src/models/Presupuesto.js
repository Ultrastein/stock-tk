// =====================================================
// MODELO: PRESUPUESTO
// Control presupuestario por categoría y período.
// =====================================================
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Presupuesto extends Model {
    static associate(models) {
      Presupuesto.belongsTo(models.Categoria, {
        as: 'categoria',
        foreignKey: 'categoria_id',
      });
    }
  }

  Presupuesto.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      anio: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      mes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 12 },
        comment: 'Null = presupuesto anual',
      },
      categoria_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'categorias', key: 'id' },
        comment: 'Null = presupuesto general',
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      monto_asignado: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      monto_ejecutado: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Se actualiza manualmente o al recibir pedidos',
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Presupuesto',
      tableName: 'presupuestos',
      paranoid: true,
      indexes: [
        { fields: ['anio'] },
        { fields: ['anio', 'mes'] },
        { fields: ['categoria_id'] },
        { fields: ['deleted_at'] },
      ],
    }
  );

  return Presupuesto;
};
