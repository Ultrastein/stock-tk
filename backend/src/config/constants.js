// =====================================================
// CONSTANTES Y ENUMERACIONES DEL SISTEMA
// =====================================================

/** Roles de usuario */
const ROLES = {
  ADMIN: 'admin',
  KIOSCO: 'kiosco',
  DOCENTE: 'docente',
};

/** Tipos de producto */
const TIPO_PRODUCTO = {
  RETORNABLE: 'retornable',
  CONSUMIBLE: 'consumible',
};

/** Estados de activo fijo */
const ESTADO_ACTIVO = {
  DISPONIBLE: 'disponible',
  EN_USO: 'en_uso',
  EN_REPARACION: 'en_reparacion',
  DAÑADO: 'dañado',
  BAJA_DEFINITIVA: 'baja_definitiva',
};

/** Estados de kit */
const ESTADO_KIT = {
  DISPONIBLE: 'disponible',
  EN_USO: 'en_uso',
  INCOMPLETO: 'incompleto',
  EN_REPARACION: 'en_reparacion',
};

/** Tipos de despacho */
const TIPO_DESPACHO = {
  SALIDA: 'salida',
  DEVOLUCION: 'devolucion',
};

/** Estados de despacho */
const ESTADO_DESPACHO = {
  PENDIENTE: 'pendiente',
  EN_PROCESO: 'en_proceso',
  COMPLETADO: 'completado',
  COMPLETADO_PARCIAL: 'completado_parcial',
  CANCELADO: 'cancelado',
};

/** Estados de devolución de ítems */
const ESTADO_DEVOLUCION = {
  PENDIENTE: 'pendiente',
  DEVUELTO_FUNCIONAL: 'devuelto_funcional',
  DEVUELTO_DAÑADO: 'devuelto_dañado',
  DEVUELTO_REPARACION: 'devuelto_reparacion',
  MERMA: 'merma',
  PERDIDO: 'perdido',
};

/** Estados de reserva */
const ESTADO_RESERVA = {
  BORRADOR: 'borrador',
  CONFIRMADA: 'confirmada',
  CUMPLIDA: 'cumplida',
  CANCELADA: 'cancelada',
  VENCIDA: 'vencida',
};

/** Estados de ticket de mantenimiento */
const ESTADO_TICKET = {
  PENDIENTE: 'pendiente',
  EN_REPARACION: 'en_reparacion',
  RESUELTO: 'resuelto',
  RECHAZADO_BAJA: 'rechazado_baja',
};

/** Estados de pedido de reposición */
const ESTADO_PEDIDO = {
  BORRADOR: 'borrador',
  PENDIENTE_APROBACION: 'pendiente_aprobacion',
  APROBADO: 'aprobado',
  COMPRADO: 'comprado',
  EN_CAMINO: 'en_camino',
  RECIBIDO: 'recibido',
  RECHAZADO: 'rechazado',
};

/** Tipos de ubicación */
const TIPO_UBICACION = {
  AULA: 'aula',
  DEPOSITO: 'deposito',
  LABORATORIO: 'laboratorio',
  OTRO: 'otro',
};

/** Acciones del historial inmutable */
const ACCION_HISTORIAL = {
  CHECKOUT: 'checkout',
  CHECKIN: 'checkin',
  MERMA: 'merma',
  AJUSTE_STOCK: 'ajuste_stock',
  CREACION: 'creacion',
  MODIFICACION: 'modificacion',
  BAJA: 'baja',
  REPARACION: 'reparacion',
  RECEPCION_COMPRA: 'recepcion_compra',
  RESERVA: 'reserva',
  CANCELACION: 'cancelacion',
};

/** Tipos de alerta */
const TIPO_ALERTA = {
  STOCK_MINIMO:            'stock_minimo',
  DEVOLUCION_VENCIDA:      'devolucion_vencida',
  PEDIDO_ESTANCADO:        'pedido_estancado',
  MANTENIMIENTO_PENDIENTE: 'mantenimiento_pendiente',
  GARANTIA_POR_VENCER:     'garantia_por_vencer',
  MANTENIMIENTO_VENCIDO:   'mantenimiento_vencido',
};

/** Estados de inventario físico */
const ESTADO_INVENTARIO = {
  BORRADOR:    'borrador',
  EN_PROCESO:  'en_proceso',
  FINALIZADO:  'finalizado',
};

/** Frecuencia de mantenimiento preventivo */
const FRECUENCIA_MANTENIMIENTO = {
  SEMANAL:    'semanal',
  MENSUAL:    'mensual',
  TRIMESTRAL: 'trimestral',
  SEMESTRAL:  'semestral',
  ANUAL:      'anual',
};

// =====================================================
// Helpers para extraer valores de enum (para Sequelize)
// =====================================================
const values = (obj) => Object.values(obj);

module.exports = {
  ROLES,
  TIPO_PRODUCTO,
  ESTADO_ACTIVO,
  ESTADO_KIT,
  TIPO_DESPACHO,
  ESTADO_DESPACHO,
  ESTADO_DEVOLUCION,
  ESTADO_RESERVA,
  ESTADO_TICKET,
  ESTADO_PEDIDO,
  TIPO_UBICACION,
  ACCION_HISTORIAL,
  TIPO_ALERTA,
  ESTADO_INVENTARIO,
  FRECUENCIA_MANTENIMIENTO,
  values,
};
