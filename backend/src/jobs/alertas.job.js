const cron = require('node-cron');
const db = require('../models');
const { Producto, Despacho, DespachoItem, PedidoReposicion, Alerta, Usuario, ActivoFijo, MantenimientoPreventivo } = db;
const { Op } = db.Sequelize;
const { TIPO_ALERTA, ESTADO_DESPACHO, TIPO_DESPACHO, ESTADO_PEDIDO, ROLES, ESTADO_ACTIVO } = require('../config/constants');

async function verificarStockMinimo() {
  const productos = await Producto.findAll({
    where: db.sequelize.where(
      db.sequelize.col('stock_actual'),
      { [Op.lte]: db.sequelize.col('stock_minimo') }
    ),
  });
  if (!productos.length) return;

  const admins = await Usuario.findAll({ where: { rol: ROLES.ADMIN, activo: true } });

  for (const producto of productos) {
    for (const admin of admins) {
      const existe = await Alerta.findOne({
        where: {
          tipo: TIPO_ALERTA.STOCK_MINIMO,
          producto_id: producto.id,
          usuario_destino_id: admin.id,
          leida: false,
        },
      });
      if (existe) continue;

      await Alerta.create({
        tipo: TIPO_ALERTA.STOCK_MINIMO,
        producto_id: producto.id,
        mensaje: `Stock mínimo: "${producto.nombre}". Actual: ${producto.stock_actual}, Mínimo: ${producto.stock_minimo}.`,
        usuario_destino_id: admin.id,
      });
    }
  }

  console.log(`[AlertasJob] ${productos.length} producto(s) con stock mínimo.`);
}

async function verificarDevolucionesVencidas() {
  const ahora = new Date();
  const despachos = await Despacho.findAll({
    where: {
      tipo: TIPO_DESPACHO.SALIDA,
      estado: ESTADO_DESPACHO.COMPLETADO,
      fecha_devolucion_esperada: { [Op.lt]: ahora },
    },
    include: [{
      model: DespachoItem, as: 'items',
      where: { estado_devolucion: 'pendiente' },
      required: true,
    }],
  });
  if (!despachos.length) return;

  const admins = await Usuario.findAll({ where: { rol: ROLES.ADMIN, activo: true } });

  for (const despacho of despachos) {
    for (const admin of admins) {
      const existe = await Alerta.findOne({
        where: {
          tipo: TIPO_ALERTA.DEVOLUCION_VENCIDA,
          usuario_destino_id: admin.id,
          leida: false,
          mensaje: { [Op.like]: `%${despacho.codigo}%` },
        },
      });
      if (existe) continue;

      await Alerta.create({
        tipo: TIPO_ALERTA.DEVOLUCION_VENCIDA,
        mensaje: `Devolución vencida: despacho ${despacho.codigo}. Esperada: ${despacho.fecha_devolucion_esperada.toLocaleDateString('es-AR')}.`,
        usuario_destino_id: admin.id,
      });
    }
  }

  console.log(`[AlertasJob] ${despachos.length} despacho(s) con devolución vencida.`);
}

async function verificarPedidosEstancados() {
  const haceSieteDias = new Date();
  haceSieteDias.setDate(haceSieteDias.getDate() - 7);

  const pedidos = await PedidoReposicion.findAll({
    where: {
      estado: ESTADO_PEDIDO.PENDIENTE_APROBACION,
      updated_at: { [Op.lt]: haceSieteDias },
    },
  });
  if (!pedidos.length) return;

  const admins = await Usuario.findAll({ where: { rol: ROLES.ADMIN, activo: true } });

  for (const pedido of pedidos) {
    for (const admin of admins) {
      const existe = await Alerta.findOne({
        where: {
          tipo: TIPO_ALERTA.PEDIDO_ESTANCADO,
          usuario_destino_id: admin.id,
          leida: false,
          mensaje: { [Op.like]: `%${pedido.codigo}%` },
        },
      });
      if (existe) continue;

      await Alerta.create({
        tipo: TIPO_ALERTA.PEDIDO_ESTANCADO,
        mensaje: `Pedido ${pedido.codigo} lleva más de 7 días pendiente de aprobación.`,
        usuario_destino_id: admin.id,
      });
    }
  }

  console.log(`[AlertasJob] ${pedidos.length} pedido(s) estancado(s).`);
}

async function verificarGarantiasPorVencer() {
  const hoy = new Date();
  const en30Dias = new Date(); en30Dias.setDate(hoy.getDate() + 30);

  // Activos con garantía vencida o por vencer en 30 días
  const activos = await ActivoFijo.findAll({
    where: {
      fecha_garantia: { [Op.between]: [hoy, en30Dias] },
      estado: { [Op.ne]: ESTADO_ACTIVO.BAJA_DEFINITIVA },
    },
  });
  if (!activos.length) return;

  const admins = await Usuario.findAll({ where: { rol: ROLES.ADMIN, activo: true } });
  for (const activo of activos) {
    for (const admin of admins) {
      const existe = await Alerta.findOne({
        where: {
          tipo: TIPO_ALERTA.GARANTIA_POR_VENCER,
          activo_fijo_id: activo.id,
          usuario_destino_id: admin.id,
          leida: false,
        },
      });
      if (existe) continue;
      const dias = Math.floor((new Date(activo.fecha_garantia) - hoy) / 86400000);
      await Alerta.create({
        tipo: TIPO_ALERTA.GARANTIA_POR_VENCER,
        activo_fijo_id: activo.id,
        mensaje: `Garantía por vencer: "${activo.numero_serie}". Vence en ${dias} día(s) — ${activo.fecha_garantia}.`,
        usuario_destino_id: admin.id,
      });
    }
  }
  console.log(`[AlertasJob] ${activos.length} activo(s) con garantía por vencer.`);
}

async function verificarMantenimientoVencido() {
  const hoy = new Date().toISOString().split('T')[0];

  const planes = await MantenimientoPreventivo.findAll({
    where: {
      activo: true,
      proxima_ejecucion: { [Op.lte]: hoy },
    },
  });
  if (!planes.length) return;

  const admins = await Usuario.findAll({ where: { rol: ROLES.ADMIN, activo: true } });
  for (const plan of planes) {
    for (const admin of admins) {
      const existe = await Alerta.findOne({
        where: {
          tipo: TIPO_ALERTA.MANTENIMIENTO_VENCIDO,
          activo_fijo_id: plan.activo_fijo_id,
          usuario_destino_id: admin.id,
          leida: false,
        },
      });
      if (existe) continue;
      await Alerta.create({
        tipo: TIPO_ALERTA.MANTENIMIENTO_VENCIDO,
        activo_fijo_id: plan.activo_fijo_id,
        mensaje: `Mantenimiento vencido: "${plan.descripcion}". Debía ejecutarse el ${plan.proxima_ejecucion}.`,
        usuario_destino_id: admin.id,
      });
    }
  }
  console.log(`[AlertasJob] ${planes.length} plan(es) de mantenimiento vencido(s).`);
}

async function ejecutarTodos() {
  try { await verificarStockMinimo(); }          catch (e) { console.error('[AlertasJob] stockMinimo:', e.message); }
  try { await verificarDevolucionesVencidas(); }  catch (e) { console.error('[AlertasJob] devoluciones:', e.message); }
  try { await verificarPedidosEstancados(); }     catch (e) { console.error('[AlertasJob] pedidos:', e.message); }
  try { await verificarGarantiasPorVencer(); }    catch (e) { console.error('[AlertasJob] garantias:', e.message); }
  try { await verificarMantenimientoVencido(); }  catch (e) { console.error('[AlertasJob] mantenimiento:', e.message); }
}

function schedule() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[AlertasJob] Ejecutando verificaciones diarias...');
    await ejecutarTodos();
  });
}

module.exports = { schedule, ejecutarTodos };
