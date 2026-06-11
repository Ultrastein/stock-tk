const db = require('../models');
const { InventarioFisico, InventarioFisicoItem, Producto, ActivoFijo } = db;
const { generarCodigo } = require('../utils/codeGenerator');
const { ESTADO_INVENTARIO } = require('../config/constants');
const { incrementarStock, decrementarStock } = require('../services/stock.service');

async function listar(req, res) {
  try {
    const data = await InventarioFisico.findAll({
      order: [['created_at', 'DESC']],
      include: [{ model: db.Usuario, as: 'responsable', attributes: ['id', 'nombre', 'email'] }],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener inventarios.' });
  }
}

async function obtener(req, res) {
  try {
    const item = await InventarioFisico.findByPk(req.params.id, {
      include: [
        { model: db.Usuario, as: 'responsable', attributes: ['id', 'nombre'] },
        {
          model: InventarioFisicoItem, as: 'items',
          include: [
            { model: Producto,   as: 'producto',   attributes: ['id', 'nombre', 'codigo', 'stock_actual', 'unidad_medida'] },
            { model: ActivoFijo, as: 'activoFijo', attributes: ['id', 'numero_serie', 'estado', 'codigo_qr'] },
          ],
        },
      ],
    });
    if (!item) return res.status(404).json({ error: 'Inventario no encontrado.' });
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener inventario.' });
  }
}

async function crear(req, res) {
  try {
    const { notas } = req.body;
    const inventario = await InventarioFisico.create({
      codigo: generarCodigo('INV'),
      responsable_id: req.user.id,
      estado: ESTADO_INVENTARIO.BORRADOR,
      notas: notas || null,
      fecha_inicio: new Date(),
    });
    return res.status(201).json({ data: inventario });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear inventario.' });
  }
}

// Iniciar el conteo: genera items pre-poblados con el stock actual del sistema
async function iniciar(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const inventario = await InventarioFisico.findByPk(req.params.id, { transaction: t });
    if (!inventario) { await t.rollback(); return res.status(404).json({ error: 'Inventario no encontrado.' }); }
    if (inventario.estado !== ESTADO_INVENTARIO.BORRADOR) {
      await t.rollback();
      return res.status(400).json({ error: 'Solo se pueden iniciar inventarios en borrador.' });
    }

    // Eliminar items previos si existen
    await InventarioFisicoItem.destroy({ where: { inventario_id: inventario.id }, transaction: t });

    // Cargar todos los productos consumibles
    const productos = await Producto.findAll({ where: { tipo: 'consumible' }, transaction: t });
    const itemsProductos = productos.map(p => ({
      inventario_id: inventario.id,
      producto_id: p.id,
      cantidad_esperada: p.stock_actual,
      cantidad_contada: null,
      diferencia: null,
    }));

    // Cargar todos los activos fijos (excepto dados de baja)
    const activos = await ActivoFijo.findAll({
      where: { estado: ['disponible', 'en_uso', 'en_reparacion', 'dañado'] },
      transaction: t,
    });
    const itemsActivos = activos.map(a => ({
      inventario_id: inventario.id,
      activo_fijo_id: a.id,
      cantidad_esperada: 1,
      cantidad_contada: null,
      diferencia: null,
    }));

    if (itemsProductos.length + itemsActivos.length > 0) {
      await InventarioFisicoItem.bulkCreate(
        [...itemsProductos, ...itemsActivos],
        { transaction: t }
      );
    }

    await inventario.update({ estado: ESTADO_INVENTARIO.EN_PROCESO }, { transaction: t });
    await t.commit();
    return res.json({ mensaje: 'Inventario iniciado.', items_generados: productos.length + activos.length });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al iniciar inventario.', detalle: e.message });
  }
}

// Actualizar un ítem del conteo (cantidad física real)
async function actualizarItem(req, res) {
  try {
    const item = await InventarioFisicoItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Ítem no encontrado.' });

    const { cantidad_contada, estado_fisico, notas } = req.body;
    const diferencia = (cantidad_contada != null && item.cantidad_esperada != null)
      ? cantidad_contada - item.cantidad_esperada
      : null;

    await item.update({ cantidad_contada, diferencia, estado_fisico: estado_fisico || null, notas: notas || null });
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar ítem.' });
  }
}

// Finalizar el inventario y aplicar ajustes de stock
async function finalizar(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const inventario = await InventarioFisico.findByPk(req.params.id, {
      include: [{ model: InventarioFisicoItem, as: 'items' }],
      transaction: t,
    });
    if (!inventario) { await t.rollback(); return res.status(404).json({ error: 'Inventario no encontrado.' }); }
    if (inventario.estado !== ESTADO_INVENTARIO.EN_PROCESO) {
      await t.rollback();
      return res.status(400).json({ error: 'El inventario no está en proceso.' });
    }

    let diferencias = 0;
    for (const item of inventario.items) {
      if (item.cantidad_contada == null) continue;
      if (item.diferencia !== 0 && item.diferencia != null) {
        diferencias++;
        // Ajustar stock de productos consumibles
        if (item.producto_id && item.diferencia !== 0) {
          if (item.diferencia > 0) {
            await incrementarStock(item.producto_id, item.diferencia, t);
          } else {
            await decrementarStock(item.producto_id, Math.abs(item.diferencia), t);
          }
        }
      }
    }

    await inventario.update({
      estado: ESTADO_INVENTARIO.FINALIZADO,
      fecha_fin: new Date(),
      diferencias_encontradas: diferencias,
    }, { transaction: t });

    await t.commit();
    return res.json({ data: inventario, diferencias_encontradas: diferencias });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al finalizar inventario.', detalle: e.message });
  }
}

module.exports = { listar, obtener, crear, iniciar, actualizarItem, finalizar };
