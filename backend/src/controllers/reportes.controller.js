const db = require('../models');
const { Op } = db.Sequelize;
const {
  Producto, ActivoFijo, Despacho, DespachoItem,
  Categoria, Ubicacion, HistorialMovimiento, Alerta,
  Kit, TicketMantenimiento, PedidoReposicion, Presupuesto,
} = db;
const { ESTADO_ACTIVO, ESTADO_DESPACHO, TIPO_DESPACHO, ESTADO_DEVOLUCION } = require('../config/constants');

/** GET /api/reportes/resumen
 * Resumen general del estado del sistema.
 */
async function resumen(req, res) {
  try {
    const [
      totalProductos,
      totalActivos,
      activosDisponibles,
      activosEnUso,
      activosEnReparacion,
      activosDanados,
      stockCritico,
      totalKits,
      ticketsPendientes,
      pedidosPendientes,
      alertasNoLeidas,
    ] = await Promise.all([
      Producto.count({ where: { deleted_at: null } }),
      ActivoFijo.count({ where: { deleted_at: null } }),
      ActivoFijo.count({ where: { estado: ESTADO_ACTIVO.DISPONIBLE, deleted_at: null } }),
      ActivoFijo.count({ where: { estado: ESTADO_ACTIVO.EN_USO, deleted_at: null } }),
      ActivoFijo.count({ where: { estado: ESTADO_ACTIVO.EN_REPARACION, deleted_at: null } }),
      ActivoFijo.count({ where: { estado: ESTADO_ACTIVO.DAÑADO, deleted_at: null } }),
      Producto.count({ where: { deleted_at: null, [Op.and]: [db.sequelize.where(db.sequelize.col('stock_actual'), { [Op.lte]: db.sequelize.col('stock_minimo') })] } }),
      Kit.count({ where: { deleted_at: null } }),
      TicketMantenimiento.count({ where: { estado: ['pendiente', 'en_reparacion'], deleted_at: null } }),
      PedidoReposicion.count({ where: { estado: ['borrador', 'pendiente_aprobacion', 'aprobado'], deleted_at: null } }),
      Alerta.count({ where: { leida: false, deleted_at: null } }),
    ]);

    return res.json({
      data: {
        inventario: { totalProductos, totalActivos, activosDisponibles, activosEnUso, activosEnReparacion, activosDanados, stockCritico },
        operaciones: { totalKits, ticketsPendientes, pedidosPendientes },
        alertasNoLeidas,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al generar resumen.' });
  }
}

/** GET /api/reportes/prestamos-activos
 * Despachos de salida completados con ítems aún pendientes de devolución.
 */
async function prestamosActivos(req, res) {
  try {
    const data = await Despacho.findAll({
      where: { tipo: TIPO_DESPACHO.SALIDA, estado: ESTADO_DESPACHO.COMPLETADO },
      include: [
        {
          model: DespachoItem, as: 'items',
          where: { estado_devolucion: ESTADO_DEVOLUCION.PENDIENTE },
          required: true,
          include: [
            { model: Producto,   as: 'producto',   attributes: ['id', 'nombre', 'codigo', 'tipo'] },
            { model: ActivoFijo, as: 'activoFijo', attributes: ['id', 'numero_serie', 'estado'] },
          ],
        },
        { model: db.Usuario,   as: 'solicitante', attributes: ['id', 'nombre', 'email'] },
        { model: Ubicacion,    as: 'ubicacionDestino', attributes: ['id', 'nombre'] },
      ],
      order: [['fecha_despacho', 'ASC']],
    });

    // Calcular días de demora si tiene fecha_devolucion_esperada
    const ahora = new Date();
    const enriched = data.map(d => {
      const plain = d.get({ plain: true });
      if (plain.fecha_devolucion_esperada) {
        const esperada = new Date(plain.fecha_devolucion_esperada);
        plain.dias_demora = Math.floor((ahora - esperada) / 86400000);
        plain.vencido = plain.dias_demora > 0;
      }
      return plain;
    });

    return res.json({ data: enriched });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al obtener préstamos activos.' });
  }
}

/** GET /api/reportes/stock-critico
 * Productos con stock ≤ stock_mínimo.
 */
async function stockCritico(req, res) {
  try {
    const data = await Producto.findAll({
      where: {
        deleted_at: null,
        [Op.and]: [db.sequelize.where(db.sequelize.col('stock_actual'), { [Op.lte]: db.sequelize.col('stock_minimo') })],
      },
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Ubicacion, as: 'ubicacion', attributes: ['id', 'nombre'] },
      ],
      order: [['stock_actual', 'ASC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener stock crítico.' });
  }
}

/** GET /api/reportes/garantias
 * Activos con garantía por vencer (próximos 60 días) o ya vencida.
 */
async function garantias(req, res) {
  try {
    const hoy = new Date();
    const en60Dias = new Date(); en60Dias.setDate(hoy.getDate() + 60);

    const data = await ActivoFijo.findAll({
      where: {
        deleted_at: null,
        fecha_garantia: { [Op.ne]: null },
        estado: { [Op.ne]: ESTADO_ACTIVO.BAJA_DEFINITIVA },
      },
      include: [
        { model: Producto,   as: 'producto',   attributes: ['id', 'nombre'] },
        { model: db.Proveedor, as: 'proveedor', attributes: ['id', 'nombre', 'contacto_telefono'] },
      ],
      order: [['fecha_garantia', 'ASC']],
    });

    const enriched = data.map(a => {
      const plain = a.get({ plain: true });
      const g = new Date(plain.fecha_garantia);
      plain.garantia_vencida = g < hoy;
      plain.garantia_proxima = !plain.garantia_vencida && g <= en60Dias;
      plain.dias_restantes   = Math.floor((g - hoy) / 86400000);
      return plain;
    });

    return res.json({ data: enriched });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener garantías.' });
  }
}

/** GET /api/reportes/movimientos-mes
 * Cantidad de movimientos por día del mes actual.
 */
async function movimientosMes(req, res) {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const movimientos = await HistorialMovimiento.findAll({
      where: { created_at: { [Op.gte]: inicioMes } },
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'fecha'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'cantidad'],
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    return res.json({ data: movimientos });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener movimientos del mes.' });
  }
}

/** GET /api/reportes/presupuesto/:anio
 * Resumen presupuestario del año.
 */
async function presupuestoAnio(req, res) {
  try {
    const anio = parseInt(req.params.anio) || new Date().getFullYear();
    const data = await Presupuesto.findAll({
      where: { anio, deleted_at: null },
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
      order: [['mes', 'ASC']],
    });

    const total = data.reduce((acc, p) => {
      acc.asignado  += parseFloat(p.monto_asignado)  || 0;
      acc.ejecutado += parseFloat(p.monto_ejecutado) || 0;
      return acc;
    }, { asignado: 0, ejecutado: 0 });

    return res.json({ data, total });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener presupuesto anual.' });
  }
}

module.exports = { resumen, prestamosActivos, stockCritico, garantias, movimientosMes, presupuestoAnio };
