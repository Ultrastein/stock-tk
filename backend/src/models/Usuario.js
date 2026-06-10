// =====================================================
// MODELO: USUARIO
// =====================================================
const { DataTypes, Model } = require('sequelize');
const { ROLES, values } = require('../config/constants');

module.exports = (sequelize) => {
  class Usuario extends Model {
    static associate(models) {
      // Despachos donde el usuario es solicitante
      Usuario.hasMany(models.Despacho, {
        as: 'despachosSolicitados',
        foreignKey: 'solicitante_id',
      });
      // Despachos donde el usuario es responsable de entrega
      Usuario.hasMany(models.Despacho, {
        as: 'despachosResponsables',
        foreignKey: 'responsable_id',
      });
      // Reservas creadas
      Usuario.hasMany(models.Reserva, {
        as: 'reservas',
        foreignKey: 'solicitante_id',
      });
      // Tickets creados
      Usuario.hasMany(models.TicketMantenimiento, {
        as: 'ticketsCreados',
        foreignKey: 'creador_id',
      });
      // Tickets asignados como técnico
      Usuario.hasMany(models.TicketMantenimiento, {
        as: 'ticketsAsignados',
        foreignKey: 'tecnico_id',
      });
      // Pedidos solicitados
      Usuario.hasMany(models.PedidoReposicion, {
        as: 'pedidosSolicitados',
        foreignKey: 'solicitante_id',
      });
      // Pedidos aprobados
      Usuario.hasMany(models.PedidoReposicion, {
        as: 'pedidosAprobados',
        foreignKey: 'aprobador_id',
      });
      // Historial de movimientos
      Usuario.hasMany(models.HistorialMovimiento, {
        as: 'movimientos',
        foreignKey: 'usuario_id',
      });
      // Alertas recibidas
      Usuario.hasMany(models.Alerta, {
        as: 'alertas',
        foreignKey: 'usuario_destino_id',
      });
    }
  }

  Usuario.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      firebase_uid: {
        type: DataTypes.STRING(128),
        allowNull: true,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,   // null para usuarios que solo usan Firebase (Google/Apple)
      },
      nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      rol: {
        type: DataTypes.ENUM(...values(ROLES)),
        allowNull: false,
        defaultValue: ROLES.DOCENTE,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Usuario',
      tableName: 'usuarios',
      paranoid: true, // Soft delete
    }
  );

  return Usuario;
};
