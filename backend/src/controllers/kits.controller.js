// =====================================================
// CONTROLADOR: KITS
// Incluye la lógica completa de Check-in (Devolución)
// de un Kit con manejo de faltantes, estados, tickets
// automáticos y transacciones atómicas.
// =====================================================
const db = require('../models');
const {
  Kit, KitComponente, Despacho, DespachoItem,
  ActivoFijo, Producto, TicketMantenimiento,
} = db;
const { registrarMovimiento, registrarMovimientosBulk } = require('../services/historial.service');
const { incrementarStock } = require('../services/stock.service');
const { generarCodigo, generarCodigoQR } = require('../utils/codeGenerator');
const {
  ESTADO_ACTIVO, ESTADO_KIT, ESTADO_DESPACHO,
  ESTADO_DEVOLUCION, ESTADO_TICKET, TIPO_DESPACHO,
  ACCION_HISTORIAL, TIPO_PRODUCTO,
} = require('../config/constants');

// =====================================================
// CHECK-IN DE KIT (DEVOLUCIÓN)
// =====================================================
/**
 * Procesa la devolución (check-in) de un Kit completo.
 *
 * Lógica:
 * 1. Valida que el kit tenga un despacho activo de tipo 'salida'
 * 2. Recibe un array de items_devueltos del operario
 * 3. Por cada componente del kit:
 *    - Si es RETORNABLE: registra estado (funcional/dañado/reparacion)
 *    - Si es CONSUMIBLE: registra cantidad devuelta
 *    - Si NO fue reportado: se marca como merma/perdido
 * 4. Dispara TicketMantenimiento si hay daño
 * 5. Actualiza stock de consumibles devueltos
 * 6. Determina estado final del kit (completo/incompleto)
 * 7. Registra todo en historial inmutable
 * 8. TODO dentro de una transacción atómica
 *
 * @route POST /api/kits/:kitId/checkin
 */
async function checkinKit(req, res) {
  const { kitId } = req.params;
  const { despacho_id, items_devueltos, notas } = req.body;
  const usuarioId = req.user.id;
  const ipAddress = req.ip;

  // Validación básica de entrada
  if (!despacho_id) {
    return res.status(400).json({ error: 'Se requiere despacho_id.' });
  }
  if (!items_devueltos || !Array.isArray(items_devueltos)) {
    return res.status(400).json({
      error: 'Se requiere un array items_devueltos con los componentes escaneados.',
    });
  }

  const t = await db.sequelize.transaction();

  try {
    // ─────────────────────────────────────────────────
    // PASO 1: Validar Kit y Despacho activo
    // ─────────────────────────────────────────────────
    const kit = await Kit.findByPk(kitId, {
      include: [
        {
          model: KitComponente,
          as: 'componentes',
          include: [
            { model: Producto, as: 'producto' },
            { model: ActivoFijo, as: 'activoFijo' },
          ],
        },
      ],
      transaction: t,
    });

    if (!kit) {
      await t.rollback();
      return res.status(404).json({ error: 'Kit no encontrado.' });
    }

    if (kit.estado !== ESTADO_KIT.EN_USO) {
      await t.rollback();
      return res.status(400).json({
        error: `El kit "${kit.nombre}" no está en uso (estado actual: ${kit.estado}).`,
      });
    }

    // Buscar el despacho de salida activo
    const despacho = await Despacho.findOne({
      where: {
        id: despacho_id,
        tipo: TIPO_DESPACHO.SALIDA,
        estado: [ESTADO_DESPACHO.COMPLETADO, ESTADO_DESPACHO.EN_PROCESO],
      },
      include: [
        {
          model: DespachoItem,
          as: 'items',
          where: { kit_id: kitId },
          required: false,
        },
      ],
      transaction: t,
    });

    if (!despacho) {
      await t.rollback();
      return res.status(404).json({
        error: 'No se encontró un despacho de salida activo para este kit.',
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 2: Crear Despacho de Devolución
    // ─────────────────────────────────────────────────
    const despachoDevolucion = await Despacho.create(
      {
        codigo: generarCodigo('DEV'),
        tipo: TIPO_DESPACHO.DEVOLUCION,
        estado: ESTADO_DESPACHO.EN_PROCESO,
        solicitante_id: despacho.solicitante_id,
        responsable_id: usuarioId,
        ubicacion_destino_id: despacho.ubicacion_destino_id,
        fecha_despacho: new Date(),
        notas: notas || `Devolución de Kit: ${kit.nombre}`,
      },
      { transaction: t }
    );

    // ─────────────────────────────────────────────────
    // PASO 3: Procesar cada componente del Kit
    // ─────────────────────────────────────────────────

    // Crear un mapa de items devueltos para búsqueda rápida
    // Clave: activo_fijo_id para retornables, producto_id para consumibles
    const devueltosMap = new Map();
    for (const item of items_devueltos) {
      const key = item.activo_fijo_id || `consumible_${item.producto_id}`;
      devueltosMap.set(key, item);
    }

    const movimientosHistorial = [];
    const ticketsCrear = [];
    let kitCompleto = true;
    let hayDaños = false;
    const resumenComponentes = [];

    for (const componente of kit.componentes) {
      const producto = componente.producto;
      const activoFijo = componente.activoFijo;
      const esRetornable = producto.tipo === TIPO_PRODUCTO.RETORNABLE;

      if (esRetornable && activoFijo) {
        // ─── RETORNABLE (Activo Fijo) ───
        const key = activoFijo.id;
        const devuelto = devueltosMap.get(key);

        if (devuelto) {
          // Activo devuelto - registrar su estado
          let nuevoEstadoActivo;
          let estadoDevolucion;

          switch (devuelto.estado) {
            case 'funcional':
              nuevoEstadoActivo = ESTADO_ACTIVO.DISPONIBLE;
              estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_FUNCIONAL;
              break;
            case 'dañado':
              nuevoEstadoActivo = ESTADO_ACTIVO.DAÑADO;
              estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_DAÑADO;
              hayDaños = true;
              break;
            case 'requiere_reparacion':
              nuevoEstadoActivo = ESTADO_ACTIVO.EN_REPARACION;
              estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_REPARACION;
              hayDaños = true;
              break;
            default:
              nuevoEstadoActivo = ESTADO_ACTIVO.DISPONIBLE;
              estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_FUNCIONAL;
          }

          // Actualizar estado del activo fijo
          const estadoAnterior = activoFijo.estado;
          await activoFijo.update(
            { estado: nuevoEstadoActivo },
            { transaction: t }
          );

          // Crear ítem de despacho de devolución
          const despachoItem = await DespachoItem.create(
            {
              despacho_id: despachoDevolucion.id,
              producto_id: producto.id,
              activo_fijo_id: activoFijo.id,
              kit_id: kitId,
              cantidad_despachada: 1,
              cantidad_devuelta: 1,
              estado_devolucion: estadoDevolucion,
              notas: devuelto.notas || null,
            },
            { transaction: t }
          );

          // Si está dañado o requiere reparación → crear ticket
          if (
            nuevoEstadoActivo === ESTADO_ACTIVO.DAÑADO ||
            nuevoEstadoActivo === ESTADO_ACTIVO.EN_REPARACION
          ) {
            ticketsCrear.push({
              activo_fijo_id: activoFijo.id,
              despacho_item_id: despachoItem.id,
              diagnostico: devuelto.notas || `Reportado como ${devuelto.estado} al devolver Kit ${kit.nombre}`,
              estado_activo: nuevoEstadoActivo,
            });
          }

          // Registrar en historial
          movimientosHistorial.push({
            usuario_id: usuarioId,
            accion: ACCION_HISTORIAL.CHECKIN,
            entidad_tipo: 'ActivoFijo',
            entidad_id: activoFijo.id,
            producto_id: producto.id,
            activo_fijo_id: activoFijo.id,
            kit_id: kitId,
            cantidad: 1,
            numero_serie: activoFijo.numero_serie,
            detalle: {
              estado_anterior: estadoAnterior,
              estado_nuevo: nuevoEstadoActivo,
              estado_devolucion: estadoDevolucion,
              kit_codigo: kit.codigo,
              despacho_devolucion_id: despachoDevolucion.id,
            },
            ip_address: ipAddress,
          });

          resumenComponentes.push({
            componente_id: componente.id,
            producto: producto.nombre,
            numero_serie: activoFijo.numero_serie,
            tipo: 'retornable',
            estado: estadoDevolucion,
          });
        } else {
          // ─── ACTIVO NO DEVUELTO → PERDIDO ───
          if (componente.es_obligatorio) kitCompleto = false;

          await activoFijo.update(
            { estado: ESTADO_ACTIVO.BAJA_DEFINITIVA },
            { transaction: t }
          );

          await DespachoItem.create(
            {
              despacho_id: despachoDevolucion.id,
              producto_id: producto.id,
              activo_fijo_id: activoFijo.id,
              kit_id: kitId,
              cantidad_despachada: 1,
              cantidad_devuelta: 0,
              estado_devolucion: ESTADO_DEVOLUCION.PERDIDO,
              notas: 'No devuelto con el kit - marcado como perdido',
            },
            { transaction: t }
          );

          // Decrementar stock del producto
          await Producto.decrement('stock_actual', {
            by: 1,
            where: { id: producto.id },
            transaction: t,
          });

          movimientosHistorial.push({
            usuario_id: usuarioId,
            accion: ACCION_HISTORIAL.MERMA,
            entidad_tipo: 'ActivoFijo',
            entidad_id: activoFijo.id,
            producto_id: producto.id,
            activo_fijo_id: activoFijo.id,
            kit_id: kitId,
            cantidad: 1,
            numero_serie: activoFijo.numero_serie,
            detalle: {
              motivo: 'No devuelto con el kit',
              estado_anterior: ESTADO_ACTIVO.EN_USO,
              estado_nuevo: ESTADO_ACTIVO.BAJA_DEFINITIVA,
              kit_codigo: kit.codigo,
            },
            ip_address: ipAddress,
          });

          resumenComponentes.push({
            componente_id: componente.id,
            producto: producto.nombre,
            numero_serie: activoFijo.numero_serie,
            tipo: 'retornable',
            estado: 'perdido',
          });
        }
      } else {
        // ─── CONSUMIBLE ───
        const key = `consumible_${producto.id}`;
        const devuelto = devueltosMap.get(key);

        const cantidadEsperada = componente.cantidad;
        const cantidadDevuelta = devuelto ? (devuelto.cantidad_devuelta || 0) : 0;
        const cantidadMerma = cantidadEsperada - cantidadDevuelta;

        let estadoDevolucion;
        if (cantidadDevuelta < cantidadEsperada) {
          estadoDevolucion = ESTADO_DEVOLUCION.MERMA;
          if (componente.es_obligatorio) kitCompleto = false;
        } else {
          estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_FUNCIONAL;
        }

        // Crear ítem de despacho
        await DespachoItem.create(
          {
            despacho_id: despachoDevolucion.id,
            producto_id: producto.id,
            kit_id: kitId,
            cantidad_despachada: cantidadEsperada,
            cantidad_devuelta: cantidadDevuelta,
            estado_devolucion: estadoDevolucion,
            notas: devuelto?.notas || null,
          },
          { transaction: t }
        );

        // Devolver stock de consumibles devueltos
        if (cantidadDevuelta > 0) {
          await incrementarStock(producto.id, cantidadDevuelta, t);

          movimientosHistorial.push({
            usuario_id: usuarioId,
            accion: ACCION_HISTORIAL.CHECKIN,
            entidad_tipo: 'Producto',
            entidad_id: producto.id,
            producto_id: producto.id,
            kit_id: kitId,
            cantidad: cantidadDevuelta,
            detalle: {
              tipo: 'consumible_devolucion',
              cantidad_esperada: cantidadEsperada,
              cantidad_devuelta: cantidadDevuelta,
              kit_codigo: kit.codigo,
            },
            ip_address: ipAddress,
          });
        }

        // Registrar merma si hay faltantes
        if (cantidadMerma > 0) {
          movimientosHistorial.push({
            usuario_id: usuarioId,
            accion: ACCION_HISTORIAL.MERMA,
            entidad_tipo: 'Producto',
            entidad_id: producto.id,
            producto_id: producto.id,
            kit_id: kitId,
            cantidad: cantidadMerma,
            detalle: {
              tipo: 'consumible_merma',
              cantidad_esperada: cantidadEsperada,
              cantidad_devuelta: cantidadDevuelta,
              kit_codigo: kit.codigo,
            },
            ip_address: ipAddress,
          });
        }

        resumenComponentes.push({
          componente_id: componente.id,
          producto: producto.nombre,
          tipo: 'consumible',
          cantidad_esperada: cantidadEsperada,
          cantidad_devuelta: cantidadDevuelta,
          cantidad_merma: cantidadMerma,
          estado: estadoDevolucion,
        });
      }
    }

    // ─────────────────────────────────────────────────
    // PASO 4: Crear Tickets de Mantenimiento automáticos
    // ─────────────────────────────────────────────────
    const ticketsCreados = [];
    for (const ticketData of ticketsCrear) {
      const ticket = await TicketMantenimiento.create(
        {
          codigo: generarCodigo('TKT'),
          activo_fijo_id: ticketData.activo_fijo_id,
          creador_id: usuarioId,
          estado: ESTADO_TICKET.PENDIENTE,
          diagnostico: ticketData.diagnostico,
          despacho_item_id: ticketData.despacho_item_id,
        },
        { transaction: t }
      );

      ticketsCreados.push(ticket);

      movimientosHistorial.push({
        usuario_id: usuarioId,
        accion: ACCION_HISTORIAL.REPARACION,
        entidad_tipo: 'TicketMantenimiento',
        entidad_id: ticket.id,
        activo_fijo_id: ticketData.activo_fijo_id,
        kit_id: kitId,
        detalle: {
          ticket_codigo: ticket.codigo,
          diagnostico: ticketData.diagnostico,
          tipo: 'ticket_automatico_checkin_kit',
        },
        ip_address: ipAddress,
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 5: Actualizar estado del Kit
    // ─────────────────────────────────────────────────
    let nuevoEstadoKit;
    if (kitCompleto && !hayDaños) {
      nuevoEstadoKit = ESTADO_KIT.DISPONIBLE;
    } else if (hayDaños) {
      nuevoEstadoKit = ESTADO_KIT.EN_REPARACION;
    } else {
      nuevoEstadoKit = ESTADO_KIT.INCOMPLETO;
    }

    const estadoKitAnterior = kit.estado;
    await kit.update({ estado: nuevoEstadoKit }, { transaction: t });

    // ─────────────────────────────────────────────────
    // PASO 6: Actualizar estado del Despacho de Devolución
    // ─────────────────────────────────────────────────
    const estadoDespachoFinal = kitCompleto
      ? ESTADO_DESPACHO.COMPLETADO
      : ESTADO_DESPACHO.COMPLETADO_PARCIAL;

    await despachoDevolucion.update(
      { estado: estadoDespachoFinal },
      { transaction: t }
    );

    // ─────────────────────────────────────────────────
    // PASO 7: Registrar movimiento del Kit en historial
    // ─────────────────────────────────────────────────
    movimientosHistorial.push({
      usuario_id: usuarioId,
      accion: ACCION_HISTORIAL.CHECKIN,
      entidad_tipo: 'Kit',
      entidad_id: kit.id,
      kit_id: kit.id,
      detalle: {
        kit_codigo: kit.codigo,
        kit_nombre: kit.nombre,
        estado_anterior: estadoKitAnterior,
        estado_nuevo: nuevoEstadoKit,
        completo: kitCompleto,
        tiene_daños: hayDaños,
        despacho_original_id: despacho.id,
        despacho_devolucion_id: despachoDevolucion.id,
        tickets_generados: ticketsCreados.map(tk => tk.codigo),
        resumen_componentes: resumenComponentes,
      },
      ip_address: ipAddress,
    });

    // Registrar todos los movimientos en bulk
    await registrarMovimientosBulk(movimientosHistorial, t);

    // ─────────────────────────────────────────────────
    // PASO 8: COMMIT de la transacción
    // ─────────────────────────────────────────────────
    await t.commit();

    // ─────────────────────────────────────────────────
    // Respuesta exitosa
    // ─────────────────────────────────────────────────
    return res.status(200).json({
      mensaje: kitCompleto
        ? `Kit "${kit.nombre}" devuelto completamente.`
        : `Kit "${kit.nombre}" devuelto con faltantes o daños.`,
      kit: {
        id: kit.id,
        codigo: kit.codigo,
        nombre: kit.nombre,
        estado_anterior: estadoKitAnterior,
        estado_nuevo: nuevoEstadoKit,
      },
      despacho_devolucion: {
        id: despachoDevolucion.id,
        codigo: despachoDevolucion.codigo,
        estado: estadoDespachoFinal,
      },
      resumen: {
        completo: kitCompleto,
        tiene_daños: hayDaños,
        total_componentes: kit.componentes.length,
        componentes: resumenComponentes,
      },
      tickets_mantenimiento: ticketsCreados.map((tk) => ({
        id: tk.id,
        codigo: tk.codigo,
        estado: tk.estado,
        diagnostico: tk.diagnostico,
      })),
    });
  } catch (error) {
    // Rollback en caso de cualquier error
    await t.rollback();
    console.error('❌ Error en check-in de kit:', error);
    return res.status(500).json({
      error: 'Error al procesar la devolución del kit.',
      detalle: error.message,
    });
  }
}

// =====================================================
// CRUD BÁSICO DE KITS
// =====================================================

/** Listar todos los kits */
async function listarKits(req, res) {
  try {
    const where = {};
    if (req.query.codigo_qr) where.codigo_qr = req.query.codigo_qr;
    if (req.query.codigo)    where.codigo    = req.query.codigo;
    if (req.query.estado)    where.estado    = req.query.estado;

    const kits = await Kit.findAll({
      where,
      include: [
        {
          model: KitComponente,
          as: 'componentes',
          include: [
            { model: Producto,  as: 'producto',  attributes: ['id', 'nombre', 'codigo', 'tipo'] },
            { model: ActivoFijo, as: 'activoFijo', attributes: ['id', 'numero_serie', 'estado'] },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ data: kits });
  } catch (error) {
    console.error('Error al listar kits:', error);
    return res.status(500).json({ error: 'Error al obtener kits.' });
  }
}

/** Obtener un kit por ID */
async function obtenerKit(req, res) {
  try {
    const kit = await Kit.findByPk(req.params.id, {
      include: [
        {
          model: KitComponente,
          as: 'componentes',
          include: [
            { model: Producto, as: 'producto' },
            { model: ActivoFijo, as: 'activoFijo' },
          ],
        },
      ],
    });

    if (!kit) {
      return res.status(404).json({ error: 'Kit no encontrado.' });
    }

    return res.json({ data: kit });
  } catch (error) {
    console.error('Error al obtener kit:', error);
    return res.status(500).json({ error: 'Error al obtener el kit.' });
  }
}

/** Crear un nuevo kit con componentes */
async function crearKit(req, res) {
  const { nombre, descripcion, componentes } = req.body;
  const t = await db.sequelize.transaction();

  try {
    const kit = await Kit.create(
      {
        codigo: generarCodigo('KIT'),
        codigo_qr: generarCodigoQR(),
        nombre,
        descripcion,
        estado: ESTADO_KIT.DISPONIBLE,
      },
      { transaction: t }
    );

    // Crear componentes
    if (componentes && Array.isArray(componentes)) {
      for (const comp of componentes) {
        await KitComponente.create(
          {
            kit_id: kit.id,
            producto_id: comp.producto_id,
            activo_fijo_id: comp.activo_fijo_id || null,
            cantidad: comp.cantidad || 1,
            es_obligatorio: comp.es_obligatorio !== false,
          },
          { transaction: t }
        );
      }
    }

    // Historial
    await registrarMovimiento(
      {
        usuario_id: req.user.id,
        accion: ACCION_HISTORIAL.CREACION,
        entidad_tipo: 'Kit',
        entidad_id: kit.id,
        kit_id: kit.id,
        detalle: {
          nombre,
          cantidad_componentes: componentes?.length || 0,
        },
        ip_address: req.ip,
      },
      t
    );

    await t.commit();

    // Recargar con asociaciones
    const kitCompleto = await Kit.findByPk(kit.id, {
      include: [
        {
          model: KitComponente,
          as: 'componentes',
          include: [
            { model: Producto, as: 'producto' },
            { model: ActivoFijo, as: 'activoFijo' },
          ],
        },
      ],
    });

    return res.status(201).json({ data: kitCompleto });
  } catch (error) {
    await t.rollback();
    console.error('Error al crear kit:', error);
    return res.status(500).json({ error: 'Error al crear el kit.' });
  }
}

/** Checkout de Kit (Despacho de salida) */
async function checkoutKit(req, res) {
  const { kitId } = req.params;
  const { solicitante_id, ubicacion_destino_id, reserva_id, notas } = req.body;
  const usuarioId = req.user.id;

  const t = await db.sequelize.transaction();

  try {
    const kit = await Kit.findByPk(kitId, {
      include: [
        {
          model: KitComponente,
          as: 'componentes',
          include: [
            { model: Producto, as: 'producto' },
            { model: ActivoFijo, as: 'activoFijo' },
          ],
        },
      ],
      transaction: t,
    });

    if (!kit) {
      await t.rollback();
      return res.status(404).json({ error: 'Kit no encontrado.' });
    }

    if (kit.estado !== ESTADO_KIT.DISPONIBLE) {
      await t.rollback();
      return res.status(400).json({
        error: `Kit no disponible (estado: ${kit.estado}).`,
      });
    }

    // Crear despacho de salida
    const despacho = await Despacho.create(
      {
        codigo: generarCodigo('DES'),
        tipo: TIPO_DESPACHO.SALIDA,
        estado: ESTADO_DESPACHO.COMPLETADO,
        solicitante_id: solicitante_id || usuarioId,
        responsable_id: usuarioId,
        ubicacion_destino_id,
        reserva_id: reserva_id || null,
        fecha_despacho: new Date(),
        notas: notas || `Despacho de Kit: ${kit.nombre}`,
      },
      { transaction: t }
    );

    // Procesar cada componente
    const movimientos = [];

    for (const componente of kit.componentes) {
      const producto = componente.producto;
      const activoFijo = componente.activoFijo;

      // Crear ítem de despacho
      await DespachoItem.create(
        {
          despacho_id: despacho.id,
          producto_id: producto.id,
          activo_fijo_id: activoFijo?.id || null,
          kit_id: kitId,
          cantidad_despachada: componente.cantidad,
          cantidad_devuelta: 0,
          estado_devolucion: ESTADO_DEVOLUCION.PENDIENTE,
        },
        { transaction: t }
      );

      // Si es retornable, marcar activo como en uso
      if (activoFijo) {
        await activoFijo.update(
          { estado: ESTADO_ACTIVO.EN_USO },
          { transaction: t }
        );
      }

      // Si es consumible, decrementar stock
      if (producto.tipo === TIPO_PRODUCTO.CONSUMIBLE) {
        await Producto.decrement('stock_actual', {
          by: componente.cantidad,
          where: { id: producto.id },
          transaction: t,
        });
      }

      movimientos.push({
        usuario_id: usuarioId,
        accion: ACCION_HISTORIAL.CHECKOUT,
        entidad_tipo: activoFijo ? 'ActivoFijo' : 'Producto',
        entidad_id: activoFijo?.id || producto.id,
        producto_id: producto.id,
        activo_fijo_id: activoFijo?.id || null,
        kit_id: kitId,
        cantidad: componente.cantidad,
        numero_serie: activoFijo?.numero_serie || null,
        detalle: {
          kit_codigo: kit.codigo,
          despacho_id: despacho.id,
        },
        ip_address: req.ip,
      });
    }

    // Marcar kit como en uso
    await kit.update({ estado: ESTADO_KIT.EN_USO }, { transaction: t });

    // Registrar movimientos
    movimientos.push({
      usuario_id: usuarioId,
      accion: ACCION_HISTORIAL.CHECKOUT,
      entidad_tipo: 'Kit',
      entidad_id: kit.id,
      kit_id: kit.id,
      detalle: {
        kit_codigo: kit.codigo,
        kit_nombre: kit.nombre,
        despacho_id: despacho.id,
        componentes_count: kit.componentes.length,
      },
      ip_address: req.ip,
    });

    await registrarMovimientosBulk(movimientos, t);
    await t.commit();

    return res.status(200).json({
      mensaje: `Kit "${kit.nombre}" despachado correctamente.`,
      despacho: {
        id: despacho.id,
        codigo: despacho.codigo,
      },
      kit: {
        id: kit.id,
        codigo: kit.codigo,
        estado: ESTADO_KIT.EN_USO,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error('Error en checkout de kit:', error);
    return res.status(500).json({ error: 'Error al despachar el kit.' });
  }
}

/**
 * Busca el despacho de salida activo (tipo=salida, estado=completado o en_proceso)
 * que tenga un ítem con kit_id = :id.
 * @route GET /api/kits/:id/despacho-activo
 */
async function getDespachoActivo(req, res) {
  const { id: kitId } = req.params;

  try {
    const despacho = await Despacho.findOne({
      where: {
        tipo: TIPO_DESPACHO.SALIDA,
        estado: [ESTADO_DESPACHO.COMPLETADO, ESTADO_DESPACHO.EN_PROCESO],
      },
      include: [
        {
          model: DespachoItem,
          as: 'items',
          where: { kit_id: kitId },
          required: true,
        },
      ],
      order: [['created_at', 'DESC']],
    });

    if (!despacho) {
      return res.status(404).json({ error: 'No hay despacho de salida activo para este kit.' });
    }

    return res.json({ data: despacho });
  } catch (error) {
    console.error('Error al buscar despacho activo del kit:', error);
    return res.status(500).json({ error: 'Error al obtener despacho activo.' });
  }
}

module.exports = {
  listarKits,
  obtenerKit,
  crearKit,
  checkoutKit,
  checkinKit,
  getDespachoActivo,
};
