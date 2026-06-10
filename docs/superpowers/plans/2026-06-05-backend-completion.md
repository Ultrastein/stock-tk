# Backend Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el backend del sistema de control de stock: rutas, controladores de negocio, jobs de cron y migraciones Sequelize.

**Architecture:** Express Router modular (un archivo por recurso en `src/routes/`), un controlador por recurso en `src/controllers/`. Transacciones atómicas en toda operación multi-tabla. Historial inmutable registrado en cada operación de negocio. Jobs de cron centralizados en `src/jobs/scheduler.js`.

**Tech Stack:** Node.js, Express, Sequelize 6, PostgreSQL, node-cron, @supabase/supabase-js, multer, csv-parse, xlsx.

---

## Mapa de archivos

```
backend/
├── src/
│   ├── routes/
│   │   ├── index.js                     CREATE
│   │   ├── auth.routes.js               CREATE
│   │   ├── usuarios.routes.js           CREATE
│   │   ├── categorias.routes.js         CREATE
│   │   ├── ubicaciones.routes.js        CREATE
│   │   ├── productos.routes.js          CREATE
│   │   ├── activos.routes.js            CREATE
│   │   ├── kits.routes.js               CREATE
│   │   ├── despachos.routes.js          CREATE
│   │   ├── reservas.routes.js           CREATE
│   │   ├── pedidos.routes.js            CREATE
│   │   ├── tickets.routes.js            CREATE
│   │   ├── alertas.routes.js            CREATE
│   │   ├── importacion.routes.js        CREATE
│   │   └── historial.routes.js          CREATE
│   ├── controllers/
│   │   ├── categorias.controller.js     CREATE
│   │   ├── ubicaciones.controller.js    CREATE
│   │   ├── usuarios.controller.js       CREATE
│   │   ├── despachos.controller.js      CREATE
│   │   ├── reservas.controller.js       CREATE
│   │   ├── pedidos.controller.js        CREATE
│   │   ├── tickets.controller.js        CREATE
│   │   ├── alertas.controller.js        CREATE
│   │   ├── historial.controller.js      CREATE
│   │   └── importacion.controller.js    CREATE
│   └── jobs/
│       ├── scheduler.js                 CREATE
│       ├── coldStorage.job.js           CREATE
│       └── alertas.job.js               CREATE
└── migrations/
    ├── 20260605000001-create-usuarios.js
    ├── 20260605000002-create-categorias.js
    ├── 20260605000003-create-ubicaciones.js
    ├── 20260605000004-create-productos.js
    ├── 20260605000005-create-activos-fijos.js
    ├── 20260605000006-create-kits.js
    ├── 20260605000007-create-kit-componentes.js
    ├── 20260605000008-create-reservas.js
    ├── 20260605000009-create-reserva-items.js
    ├── 20260605000010-create-despachos.js
    ├── 20260605000011-create-despacho-items.js
    ├── 20260605000012-create-tickets-mantenimiento.js
    ├── 20260605000013-create-pedidos-reposicion.js
    ├── 20260605000014-create-pedido-items.js
    ├── 20260605000015-create-proveedores-cotizacion.js
    ├── 20260605000016-create-historial-movimientos.js
    └── 20260605000017-create-alertas.js
```

---

## Task 1: Routes (todos los archivos)

**Files:** Create `backend/src/routes/index.js` + 14 route files

- [ ] **Crear `backend/src/routes/index.js`**

```js
const router = require('express').Router();
const { autenticar } = require('../middleware/auth.middleware');

router.use('/auth',        require('./auth.routes'));
router.use('/usuarios',    autenticar, require('./usuarios.routes'));
router.use('/categorias',  autenticar, require('./categorias.routes'));
router.use('/ubicaciones', autenticar, require('./ubicaciones.routes'));
router.use('/productos',   autenticar, require('./productos.routes'));
router.use('/activos',     autenticar, require('./activos.routes'));
router.use('/kits',        autenticar, require('./kits.routes'));
router.use('/despachos',   autenticar, require('./despachos.routes'));
router.use('/reservas',    autenticar, require('./reservas.routes'));
router.use('/pedidos',     autenticar, require('./pedidos.routes'));
router.use('/tickets',     autenticar, require('./tickets.routes'));
router.use('/alertas',     autenticar, require('./alertas.routes'));
router.use('/importacion', autenticar, require('./importacion.routes'));
router.use('/historial',   autenticar, require('./historial.routes'));

module.exports = router;
```

- [ ] **Crear `backend/src/routes/auth.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth.middleware');

router.post('/login',     ctrl.login);
router.post('/registrar', ctrl.registrar);
router.get('/perfil',     autenticar, ctrl.perfil);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/categorias.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/categorias.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',       requiereRol(ROLES.ADMIN), ctrl.crear);
router.put('/:id',    requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.delete('/:id', requiereRol(ROLES.ADMIN), ctrl.eliminar);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/ubicaciones.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/ubicaciones.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',       requiereRol(ROLES.ADMIN), ctrl.crear);
router.put('/:id',    requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.delete('/:id', requiereRol(ROLES.ADMIN), ctrl.eliminar);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/usuarios.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/usuarios.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',                  requiereRol(ROLES.ADMIN), ctrl.listar);
router.get('/:id',               ctrl.obtener);
router.put('/:id',               requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.patch('/:id/desactivar',  requiereRol(ROLES.ADMIN), ctrl.desactivar);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/productos.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/productos.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',       requiereRol(ROLES.ADMIN), ctrl.crear);
router.put('/:id',    requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.delete('/:id', requiereRol(ROLES.ADMIN), ctrl.eliminar);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/activos.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/activos.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',       requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.crear);
router.put('/:id',    requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.delete('/:id', requiereRol(ROLES.ADMIN), ctrl.eliminar);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/kits.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/kits.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listarKits);
router.get('/:id', ctrl.obtenerKit);
router.post('/',                    requiereRol(ROLES.ADMIN), ctrl.crearKit);
router.post('/:kitId/checkout',     requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.checkoutKit);
router.post('/:kitId/checkin',      requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.checkinKit);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/despachos.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/despachos.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/checkout',        requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.checkout);
router.post('/:id/checkin',     requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.checkin);
router.patch('/:id/cancelar',   requiereRol(ROLES.ADMIN), ctrl.cancelar);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/reservas.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/reservas.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',      ctrl.crear);
router.put('/:id',   ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);
router.patch('/:id/confirmar', requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.confirmar);
router.patch('/:id/cancelar',  ctrl.cancelar);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/pedidos.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/pedidos.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',      ctrl.crear);
router.put('/:id',   ctrl.actualizar);
router.delete('/:id', requiereRol(ROLES.ADMIN), ctrl.eliminar);
router.patch('/:id/estado',                              ctrl.avanzarEstado);
router.post('/:id/cotizaciones',                         ctrl.agregarCotizacion);
router.patch('/:id/cotizaciones/:cotId/seleccionar',
  requiereRol(ROLES.ADMIN), ctrl.seleccionarCotizacion);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/tickets.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/tickets.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',   ctrl.crear);
router.patch('/:id/estado',  requiereRol(ROLES.ADMIN), ctrl.avanzarEstado);
router.patch('/:id/tecnico', requiereRol(ROLES.ADMIN), ctrl.asignarTecnico);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/alertas.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/alertas.controller');

router.get('/',              ctrl.listar);
router.patch('/:id/leer',   ctrl.marcarLeida);
router.patch('/leer-todas', ctrl.marcarTodasLeidas);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/importacion.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/importacion.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const multer = require('multer');
const { ROLES } = require('../config/constants');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/productos', requiereRol(ROLES.ADMIN), upload.single('archivo'), ctrl.importarProductos);
router.post('/activos',   requiereRol(ROLES.ADMIN), upload.single('archivo'), ctrl.importarActivos);

module.exports = router;
```

- [ ] **Crear `backend/src/routes/historial.routes.js`**

```js
const router = require('express').Router();
const ctrl = require('../controllers/historial.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',                    requiereRol(ROLES.ADMIN), ctrl.listar);
router.get('/entidad/:tipo/:id',   ctrl.listarPorEntidad);

module.exports = router;
```

- [ ] **Commit**

```
git add backend/src/routes/
git commit -m "feat: add all route files"
```

---

## Task 2: Controladores CRUD simples (categorias, ubicaciones)

**Files:**
- Create: `backend/src/controllers/categorias.controller.js`
- Create: `backend/src/controllers/ubicaciones.controller.js`

- [ ] **Crear `backend/src/controllers/categorias.controller.js`**

```js
const db = require('../models');
const { Categoria } = db;

async function listar(req, res) {
  try {
    const data = await Categoria.findAll({ order: [['nombre', 'ASC']] });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener categorías.' });
  }
}

async function obtener(req, res) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada.' });
    return res.json({ data: categoria });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener categoría.' });
  }
}

async function crear(req, res) {
  try {
    const categoria = await Categoria.create(req.body);
    return res.status(201).json({ data: categoria });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear categoría.' });
  }
}

async function actualizar(req, res) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada.' });
    await categoria.update(req.body);
    return res.json({ data: categoria });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar categoría.' });
  }
}

async function eliminar(req, res) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada.' });
    await categoria.destroy();
    return res.json({ mensaje: 'Categoría eliminada.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar categoría.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
```

- [ ] **Crear `backend/src/controllers/ubicaciones.controller.js`**

```js
const db = require('../models');
const { Ubicacion } = db;

async function listar(req, res) {
  try {
    const data = await Ubicacion.findAll({ order: [['nombre', 'ASC']] });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener ubicaciones.' });
  }
}

async function obtener(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ error: 'Ubicación no encontrada.' });
    return res.json({ data: ubicacion });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener ubicación.' });
  }
}

async function crear(req, res) {
  try {
    const ubicacion = await Ubicacion.create(req.body);
    return res.status(201).json({ data: ubicacion });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear ubicación.' });
  }
}

async function actualizar(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ error: 'Ubicación no encontrada.' });
    await ubicacion.update(req.body);
    return res.json({ data: ubicacion });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar ubicación.' });
  }
}

async function eliminar(req, res) {
  try {
    const ubicacion = await Ubicacion.findByPk(req.params.id);
    if (!ubicacion) return res.status(404).json({ error: 'Ubicación no encontrada.' });
    await ubicacion.destroy();
    return res.json({ mensaje: 'Ubicación eliminada.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar ubicación.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
```

- [ ] **Commit**

```
git add backend/src/controllers/categorias.controller.js backend/src/controllers/ubicaciones.controller.js
git commit -m "feat: add categorias and ubicaciones controllers"
```

---

## Task 3: Usuarios controller

**Files:** Create `backend/src/controllers/usuarios.controller.js`

- [ ] **Crear `backend/src/controllers/usuarios.controller.js`**

```js
const db = require('../models');
const { Usuario } = db;

async function listar(req, res) {
  try {
    const data = await Usuario.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['nombre', 'ASC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
}

async function obtener(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    return res.json({ data: usuario });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener usuario.' });
  }
}

async function actualizar(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    // No permitir cambiar password_hash directamente por esta ruta
    const { password_hash, ...datos } = req.body;
    await usuario.update(datos);

    const { password_hash: _, ...result } = usuario.toJSON();
    return res.json({ data: result });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
}

async function desactivar(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    await usuario.update({ activo: false });
    return res.json({ mensaje: 'Usuario desactivado.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al desactivar usuario.' });
  }
}

module.exports = { listar, obtener, actualizar, desactivar };
```

- [ ] **Commit**

```
git add backend/src/controllers/usuarios.controller.js
git commit -m "feat: add usuarios controller"
```

---

## Task 4: Despachos controller (checkout/checkin individual)

**Files:** Create `backend/src/controllers/despachos.controller.js`

- [ ] **Crear `backend/src/controllers/despachos.controller.js`**

```js
const db = require('../models');
const {
  Despacho, DespachoItem, Producto, ActivoFijo, TicketMantenimiento,
} = db;
const { registrarMovimiento, registrarMovimientosBulk } = require('../services/historial.service');
const { incrementarStock, decrementarStock } = require('../services/stock.service');
const { generarCodigo } = require('../utils/codeGenerator');
const {
  TIPO_DESPACHO, ESTADO_DESPACHO, ESTADO_DEVOLUCION,
  ESTADO_ACTIVO, ESTADO_TICKET, ACCION_HISTORIAL, TIPO_PRODUCTO,
} = require('../config/constants');

async function listar(req, res) {
  try {
    const { tipo, estado, solicitante_id } = req.query;
    const where = {};
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (solicitante_id) where.solicitante_id = solicitante_id;

    const data = await Despacho.findAll({
      where,
      include: [
        { model: DespachoItem, as: 'items',
          include: [
            { model: Producto, as: 'producto', attributes: ['id','nombre','codigo','tipo'] },
            { model: ActivoFijo, as: 'activoFijo', attributes: ['id','numero_serie','estado'] },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error al obtener despachos.' });
  }
}

async function obtener(req, res) {
  try {
    const despacho = await Despacho.findByPk(req.params.id, {
      include: [
        { model: DespachoItem, as: 'items',
          include: [
            { model: Producto, as: 'producto' },
            { model: ActivoFijo, as: 'activoFijo' },
          ],
        },
      ],
    });
    if (!despacho) return res.status(404).json({ error: 'Despacho no encontrado.' });
    return res.json({ data: despacho });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener despacho.' });
  }
}

/**
 * POST /api/despachos/checkout
 * Body: {
 *   solicitante_id, ubicacion_destino_id?, reserva_id?, notas?,
 *   items: [{ producto_id, activo_fijo_id?, cantidad }]
 * }
 */
async function checkout(req, res) {
  const { solicitante_id, ubicacion_destino_id, reserva_id, notas, items } = req.body;
  const usuarioId = req.user.id;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Se requiere al menos un ítem.' });
  }

  const t = await db.sequelize.transaction();

  try {
    const despacho = await Despacho.create({
      codigo: generarCodigo('DES'),
      tipo: TIPO_DESPACHO.SALIDA,
      estado: ESTADO_DESPACHO.EN_PROCESO,
      solicitante_id: solicitante_id || usuarioId,
      responsable_id: usuarioId,
      ubicacion_destino_id: ubicacion_destino_id || null,
      reserva_id: reserva_id || null,
      fecha_despacho: new Date(),
      notas: notas || null,
      sync_id: req.headers['x-sync-id'] || null,
      created_offline: !!req.headers['x-sync-id'],
    }, { transaction: t });

    const movimientos = [];

    for (const item of items) {
      const producto = await Producto.findByPk(item.producto_id, { transaction: t });
      if (!producto) {
        await t.rollback();
        return res.status(404).json({ error: `Producto ${item.producto_id} no encontrado.` });
      }

      let activoFijo = null;
      if (item.activo_fijo_id) {
        activoFijo = await ActivoFijo.findByPk(item.activo_fijo_id, { transaction: t });
        if (!activoFijo) {
          await t.rollback();
          return res.status(404).json({ error: `Activo ${item.activo_fijo_id} no encontrado.` });
        }
        if (activoFijo.estado !== ESTADO_ACTIVO.DISPONIBLE) {
          await t.rollback();
          return res.status(400).json({
            error: `Activo ${activoFijo.numero_serie} no está disponible (estado: ${activoFijo.estado}).`,
          });
        }
        await activoFijo.update({ estado: ESTADO_ACTIVO.EN_USO }, { transaction: t });
      }

      if (producto.tipo === TIPO_PRODUCTO.CONSUMIBLE) {
        await decrementarStock(producto.id, item.cantidad, t);
      }

      await DespachoItem.create({
        despacho_id: despacho.id,
        producto_id: producto.id,
        activo_fijo_id: activoFijo?.id || null,
        cantidad_despachada: item.cantidad,
        cantidad_devuelta: 0,
        estado_devolucion: ESTADO_DEVOLUCION.PENDIENTE,
      }, { transaction: t });

      movimientos.push({
        usuario_id: usuarioId,
        accion: ACCION_HISTORIAL.CHECKOUT,
        entidad_tipo: activoFijo ? 'ActivoFijo' : 'Producto',
        entidad_id: activoFijo?.id || producto.id,
        producto_id: producto.id,
        activo_fijo_id: activoFijo?.id || null,
        cantidad: item.cantidad,
        numero_serie: activoFijo?.numero_serie || null,
        detalle: { despacho_id: despacho.id },
        ip_address: req.ip,
      });
    }

    await despacho.update({ estado: ESTADO_DESPACHO.COMPLETADO }, { transaction: t });
    await registrarMovimientosBulk(movimientos, t);
    await t.commit();

    return res.status(201).json({ data: { id: despacho.id, codigo: despacho.codigo } });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al procesar checkout.' });
  }
}

/**
 * POST /api/despachos/:id/checkin
 * Body: {
 *   items_devueltos: [{ despacho_item_id, activo_fijo_id?, estado?, cantidad_devuelta, notas? }]
 * }
 * estado: 'funcional' | 'dañado' | 'requiere_reparacion'
 */
async function checkin(req, res) {
  const { items_devueltos } = req.body;
  const usuarioId = req.user.id;

  if (!items_devueltos || !items_devueltos.length) {
    return res.status(400).json({ error: 'Se requiere items_devueltos.' });
  }

  const t = await db.sequelize.transaction();

  try {
    const despachoOriginal = await Despacho.findByPk(req.params.id, {
      include: [{ model: DespachoItem, as: 'items' }],
      transaction: t,
    });

    if (!despachoOriginal || despachoOriginal.tipo !== TIPO_DESPACHO.SALIDA) {
      await t.rollback();
      return res.status(404).json({ error: 'Despacho de salida no encontrado.' });
    }
    if (despachoOriginal.estado !== ESTADO_DESPACHO.COMPLETADO) {
      await t.rollback();
      return res.status(400).json({ error: 'El despacho no está en estado COMPLETADO.' });
    }

    const devolucion = await Despacho.create({
      codigo: generarCodigo('DEV'),
      tipo: TIPO_DESPACHO.DEVOLUCION,
      estado: ESTADO_DESPACHO.EN_PROCESO,
      solicitante_id: despachoOriginal.solicitante_id,
      responsable_id: usuarioId,
      ubicacion_destino_id: despachoOriginal.ubicacion_destino_id,
      fecha_despacho: new Date(),
    }, { transaction: t });

    const movimientos = [];
    const ticketsCreados = [];
    let completado = true;

    for (const dev of items_devueltos) {
      const itemOriginal = despachoOriginal.items.find(i => i.id === dev.despacho_item_id);
      if (!itemOriginal) continue;

      const producto = await Producto.findByPk(itemOriginal.producto_id, { transaction: t });
      let nuevoEstadoActivo = null;
      let estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_FUNCIONAL;

      if (itemOriginal.activo_fijo_id) {
        const activo = await ActivoFijo.findByPk(itemOriginal.activo_fijo_id, { transaction: t });
        const estadoAnterior = activo.estado;

        switch (dev.estado) {
          case 'dañado':
            nuevoEstadoActivo = ESTADO_ACTIVO.DAÑADO;
            estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_DAÑADO;
            break;
          case 'requiere_reparacion':
            nuevoEstadoActivo = ESTADO_ACTIVO.EN_REPARACION;
            estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_REPARACION;
            break;
          default:
            nuevoEstadoActivo = ESTADO_ACTIVO.DISPONIBLE;
            estadoDevolucion = ESTADO_DEVOLUCION.DEVUELTO_FUNCIONAL;
        }

        await activo.update({ estado: nuevoEstadoActivo }, { transaction: t });

        const despachoItem = await DespachoItem.create({
          despacho_id: devolucion.id,
          producto_id: producto.id,
          activo_fijo_id: activo.id,
          cantidad_despachada: 1,
          cantidad_devuelta: 1,
          estado_devolucion: estadoDevolucion,
          notas: dev.notas || null,
        }, { transaction: t });

        if (nuevoEstadoActivo === ESTADO_ACTIVO.DAÑADO || nuevoEstadoActivo === ESTADO_ACTIVO.EN_REPARACION) {
          const ticket = await TicketMantenimiento.create({
            codigo: generarCodigo('TKT'),
            activo_fijo_id: activo.id,
            creador_id: usuarioId,
            estado: ESTADO_TICKET.PENDIENTE,
            diagnostico: dev.notas || `Reportado como ${dev.estado} al devolver despacho ${despachoOriginal.codigo}`,
            despacho_item_id: despachoItem.id,
          }, { transaction: t });
          ticketsCreados.push(ticket.codigo);
        }

        movimientos.push({
          usuario_id: usuarioId,
          accion: ACCION_HISTORIAL.CHECKIN,
          entidad_tipo: 'ActivoFijo',
          entidad_id: activo.id,
          producto_id: producto.id,
          activo_fijo_id: activo.id,
          numero_serie: activo.numero_serie,
          detalle: { estado_anterior: estadoAnterior, estado_nuevo: nuevoEstadoActivo, estadoDevolucion },
          ip_address: req.ip,
        });

        await itemOriginal.update({ estado_devolucion: estadoDevolucion, cantidad_devuelta: 1 }, { transaction: t });

      } else {
        // consumible
        const cantDevuelta = dev.cantidad_devuelta || 0;
        const cantEsperada = itemOriginal.cantidad_despachada;
        estadoDevolucion = cantDevuelta < cantEsperada ? ESTADO_DEVOLUCION.MERMA : ESTADO_DEVOLUCION.DEVUELTO_FUNCIONAL;
        if (cantDevuelta < cantEsperada) completado = false;

        if (cantDevuelta > 0) await incrementarStock(producto.id, cantDevuelta, t);

        await DespachoItem.create({
          despacho_id: devolucion.id,
          producto_id: producto.id,
          cantidad_despachada: cantEsperada,
          cantidad_devuelta: cantDevuelta,
          estado_devolucion: estadoDevolucion,
          notas: dev.notas || null,
        }, { transaction: t });

        movimientos.push({
          usuario_id: usuarioId,
          accion: cantDevuelta > 0 ? ACCION_HISTORIAL.CHECKIN : ACCION_HISTORIAL.MERMA,
          entidad_tipo: 'Producto',
          entidad_id: producto.id,
          producto_id: producto.id,
          cantidad: cantDevuelta,
          detalle: { cantidad_esperada: cantEsperada, cantidad_devuelta: cantDevuelta },
          ip_address: req.ip,
        });

        await itemOriginal.update({ estado_devolucion: estadoDevolucion, cantidad_devuelta: cantDevuelta }, { transaction: t });
      }
    }

    const estadoFinal = completado ? ESTADO_DESPACHO.COMPLETADO : ESTADO_DESPACHO.COMPLETADO_PARCIAL;
    await devolucion.update({ estado: estadoFinal }, { transaction: t });
    await registrarMovimientosBulk(movimientos, t);
    await t.commit();

    return res.json({
      data: { id: devolucion.id, codigo: devolucion.codigo, estado: estadoFinal },
      tickets_creados: ticketsCreados,
    });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al procesar checkin.' });
  }
}

async function cancelar(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const despacho = await Despacho.findByPk(req.params.id, {
      include: [{ model: DespachoItem, as: 'items' }],
      transaction: t,
    });
    if (!despacho) { await t.rollback(); return res.status(404).json({ error: 'Despacho no encontrado.' }); }
    if (despacho.estado === ESTADO_DESPACHO.CANCELADO) {
      await t.rollback();
      return res.status(400).json({ error: 'El despacho ya está cancelado.' });
    }
    if (despacho.tipo === TIPO_DESPACHO.SALIDA && despacho.estado === ESTADO_DESPACHO.COMPLETADO) {
      await t.rollback();
      return res.status(400).json({ error: 'No se puede cancelar un despacho ya completado. Use checkin.' });
    }

    await despacho.update({ estado: ESTADO_DESPACHO.CANCELADO }, { transaction: t });
    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.CANCELACION,
      entidad_tipo: 'Despacho',
      entidad_id: despacho.id,
      detalle: { codigo: despacho.codigo },
      ip_address: req.ip,
    }, t);
    await t.commit();

    return res.json({ mensaje: 'Despacho cancelado.' });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ error: 'Error al cancelar despacho.' });
  }
}

module.exports = { listar, obtener, checkout, checkin, cancelar };
```

- [ ] **Commit**

```
git add backend/src/controllers/despachos.controller.js
git commit -m "feat: add despachos controller with checkout/checkin"
```

---

## Task 5: Reservas controller

**Files:** Create `backend/src/controllers/reservas.controller.js`

- [ ] **Crear `backend/src/controllers/reservas.controller.js`**

```js
const db = require('../models');
const { Reserva, ReservaItem, Producto, ActivoFijo, Kit } = db;
const { registrarMovimiento } = require('../services/historial.service');
const { generarCodigo } = require('../utils/codeGenerator');
const { ESTADO_RESERVA, ACCION_HISTORIAL } = require('../config/constants');

async function listar(req, res) {
  try {
    const where = {};
    if (req.user.rol !== 'admin') where.solicitante_id = req.user.id;
    const data = await Reserva.findAll({
      where,
      include: [{ model: ReservaItem, as: 'items',
        include: [
          { model: Producto, as: 'producto', attributes: ['id','nombre','codigo'] },
          { model: ActivoFijo, as: 'activoFijo', attributes: ['id','numero_serie'] },
          { model: Kit, as: 'kit', attributes: ['id','nombre','codigo'] },
        ],
      }],
      order: [['fecha_reserva', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener reservas.' });
  }
}

async function obtener(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id, {
      include: [{ model: ReservaItem, as: 'items' }],
    });
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    return res.json({ data: reserva });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener reserva.' });
  }
}

async function crear(req, res) {
  const { items, ...datosReserva } = req.body;
  const t = await db.sequelize.transaction();
  try {
    const reserva = await Reserva.create({
      ...datosReserva,
      codigo: generarCodigo('RES'),
      solicitante_id: req.user.id,
      estado: ESTADO_RESERVA.BORRADOR,
    }, { transaction: t });

    if (items?.length) {
      for (const item of items) {
        await ReservaItem.create({
          reserva_id: reserva.id,
          producto_id: item.producto_id,
          activo_fijo_id: item.activo_fijo_id || null,
          kit_id: item.kit_id || null,
          cantidad: item.cantidad || 1,
        }, { transaction: t });
      }
    }

    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.RESERVA,
      entidad_tipo: 'Reserva',
      entidad_id: reserva.id,
      detalle: { codigo: reserva.codigo, fecha: reserva.fecha_reserva },
      ip_address: req.ip,
    }, t);

    await t.commit();
    return res.status(201).json({ data: reserva });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ error: 'Error al crear reserva.' });
  }
}

async function actualizar(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (reserva.estado !== ESTADO_RESERVA.BORRADOR) {
      return res.status(400).json({ error: 'Solo se pueden editar reservas en borrador.' });
    }
    await reserva.update(req.body);
    return res.json({ data: reserva });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar reserva.' });
  }
}

async function eliminar(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (!['borrador', 'cancelada'].includes(reserva.estado)) {
      return res.status(400).json({ error: 'Solo se pueden eliminar reservas en borrador o canceladas.' });
    }
    await reserva.destroy();
    return res.json({ mensaje: 'Reserva eliminada.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar reserva.' });
  }
}

async function confirmar(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (reserva.estado !== ESTADO_RESERVA.BORRADOR) {
      return res.status(400).json({ error: `No se puede confirmar desde estado "${reserva.estado}".` });
    }
    await reserva.update({ estado: ESTADO_RESERVA.CONFIRMADA });
    return res.json({ data: reserva });
  } catch (e) {
    return res.status(500).json({ error: 'Error al confirmar reserva.' });
  }
}

async function cancelar(req, res) {
  try {
    const reserva = await Reserva.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada.' });
    if (reserva.estado === ESTADO_RESERVA.CUMPLIDA) {
      return res.status(400).json({ error: 'No se puede cancelar una reserva ya cumplida.' });
    }
    await reserva.update({ estado: ESTADO_RESERVA.CANCELADA });
    return res.json({ data: reserva });
  } catch (e) {
    return res.status(500).json({ error: 'Error al cancelar reserva.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, confirmar, cancelar };
```

- [ ] **Commit**

```
git add backend/src/controllers/reservas.controller.js
git commit -m "feat: add reservas controller"
```

---

## Task 6: Pedidos controller (state machine + auto-stock)

**Files:** Create `backend/src/controllers/pedidos.controller.js`

- [ ] **Crear `backend/src/controllers/pedidos.controller.js`**

```js
const db = require('../models');
const { PedidoReposicion, PedidoItem, ProveedorCotizacion, Producto } = db;
const { registrarMovimiento } = require('../services/historial.service');
const { incrementarStock } = require('../services/stock.service');
const { generarCodigo } = require('../utils/codeGenerator');
const { ESTADO_PEDIDO, ACCION_HISTORIAL, ROLES } = require('../config/constants');

// Transiciones válidas del state machine
const TRANSICIONES = {
  [ESTADO_PEDIDO.BORRADOR]:              [ESTADO_PEDIDO.PENDIENTE_APROBACION],
  [ESTADO_PEDIDO.PENDIENTE_APROBACION]:  [ESTADO_PEDIDO.APROBADO, ESTADO_PEDIDO.RECHAZADO],
  [ESTADO_PEDIDO.APROBADO]:              [ESTADO_PEDIDO.COMPRADO],
  [ESTADO_PEDIDO.COMPRADO]:              [ESTADO_PEDIDO.EN_CAMINO],
  [ESTADO_PEDIDO.EN_CAMINO]:             [ESTADO_PEDIDO.RECIBIDO],
};

// Estados que requieren rol ADMIN
const SOLO_ADMIN = [
  ESTADO_PEDIDO.APROBADO,
  ESTADO_PEDIDO.RECHAZADO,
  ESTADO_PEDIDO.COMPRADO,
  ESTADO_PEDIDO.EN_CAMINO,
  ESTADO_PEDIDO.RECIBIDO,
];

async function listar(req, res) {
  try {
    const where = {};
    if (req.user.rol !== ROLES.ADMIN) where.solicitante_id = req.user.id;
    const data = await PedidoReposicion.findAll({
      where,
      include: [
        { model: PedidoItem, as: 'items',
          include: [{ model: Producto, as: 'producto', attributes: ['id','nombre','codigo'] }] },
        { model: ProveedorCotizacion, as: 'cotizaciones' },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener pedidos.' });
  }
}

async function obtener(req, res) {
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id, {
      include: [
        { model: PedidoItem, as: 'items', include: [{ model: Producto, as: 'producto' }] },
        { model: ProveedorCotizacion, as: 'cotizaciones' },
      ],
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
    return res.json({ data: pedido });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener pedido.' });
  }
}

async function crear(req, res) {
  const { items, ...datosPedido } = req.body;
  const t = await db.sequelize.transaction();
  try {
    const pedido = await PedidoReposicion.create({
      ...datosPedido,
      codigo: generarCodigo('PED'),
      solicitante_id: req.user.id,
      estado: ESTADO_PEDIDO.BORRADOR,
    }, { transaction: t });

    if (items?.length) {
      for (const item of items) {
        await PedidoItem.create({
          pedido_id: pedido.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_estimado: item.precio_estimado || null,
        }, { transaction: t });
      }
    }

    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.CREACION,
      entidad_tipo: 'PedidoReposicion',
      entidad_id: pedido.id,
      detalle: { codigo: pedido.codigo },
      ip_address: req.ip,
    }, t);

    await t.commit();
    return res.status(201).json({ data: pedido });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ error: 'Error al crear pedido.' });
  }
}

async function actualizar(req, res) {
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (pedido.estado !== ESTADO_PEDIDO.BORRADOR) {
      return res.status(400).json({ error: 'Solo se pueden editar pedidos en borrador.' });
    }
    await pedido.update(req.body);
    return res.json({ data: pedido });
  } catch (e) {
    return res.status(500).json({ error: 'Error al actualizar pedido.' });
  }
}

async function eliminar(req, res) {
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (pedido.estado !== ESTADO_PEDIDO.BORRADOR) {
      return res.status(400).json({ error: 'Solo se pueden eliminar pedidos en borrador.' });
    }
    await pedido.destroy();
    return res.json({ mensaje: 'Pedido eliminado.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al eliminar pedido.' });
  }
}

/**
 * PATCH /api/pedidos/:id/estado
 * Body: { estado, items_recibidos?: [{ pedido_item_id, cantidad_recibida }] }
 */
async function avanzarEstado(req, res) {
  const { estado, items_recibidos } = req.body;
  if (!estado) return res.status(400).json({ error: 'Se requiere el campo estado.' });

  if (SOLO_ADMIN.includes(estado) && req.user.rol !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Solo un administrador puede aprobar, comprar o recibir un pedido.' });
  }

  const t = await db.sequelize.transaction();
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id, {
      include: [{ model: PedidoItem, as: 'items' }],
      transaction: t,
    });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: 'Pedido no encontrado.' }); }

    const permitidos = TRANSICIONES[pedido.estado] || [];
    if (!permitidos.includes(estado)) {
      await t.rollback();
      return res.status(400).json({
        error: `Transición inválida de "${pedido.estado}" a "${estado}".`,
        permitidos,
      });
    }

    const update = { estado };
    if (estado === ESTADO_PEDIDO.APROBADO) update.aprobador_id = req.user.id;
    if (estado === ESTADO_PEDIDO.APROBADO) update.fecha_aprobacion = new Date();
    if (estado === ESTADO_PEDIDO.RECIBIDO) update.fecha_recepcion = new Date();

    await pedido.update(update, { transaction: t });

    // Al recibir: incrementar stock por cada ítem
    if (estado === ESTADO_PEDIDO.RECIBIDO) {
      for (const item of pedido.items) {
        const recibido = items_recibidos?.find(r => r.pedido_item_id === item.id);
        const cantidadRecibida = recibido?.cantidad_recibida ?? item.cantidad;

        if (cantidadRecibida > 0) {
          await incrementarStock(item.producto_id, cantidadRecibida, t);
          await item.update({ cantidad_recibida: cantidadRecibida }, { transaction: t });

          await registrarMovimiento({
            usuario_id: req.user.id,
            accion: ACCION_HISTORIAL.RECEPCION_COMPRA,
            entidad_tipo: 'Producto',
            entidad_id: item.producto_id,
            producto_id: item.producto_id,
            cantidad: cantidadRecibida,
            detalle: { pedido_codigo: pedido.codigo, pedido_id: pedido.id },
            ip_address: req.ip,
          }, t);
        }
      }
    }

    await t.commit();
    return res.json({ data: pedido });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al avanzar estado del pedido.' });
  }
}

async function agregarCotizacion(req, res) {
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
    const cotizacion = await ProveedorCotizacion.create({
      ...req.body,
      pedido_id: pedido.id,
    });
    return res.status(201).json({ data: cotizacion });
  } catch (e) {
    return res.status(500).json({ error: 'Error al agregar cotización.' });
  }
}

async function seleccionarCotizacion(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const pedido = await PedidoReposicion.findByPk(req.params.id, { transaction: t });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: 'Pedido no encontrado.' }); }

    // Desmarcar todas las cotizaciones del pedido
    await ProveedorCotizacion.update(
      { seleccionado: false },
      { where: { pedido_id: pedido.id }, transaction: t }
    );

    // Marcar la elegida
    const cotizacion = await ProveedorCotizacion.findOne({
      where: { id: req.params.cotId, pedido_id: pedido.id },
      transaction: t,
    });
    if (!cotizacion) { await t.rollback(); return res.status(404).json({ error: 'Cotización no encontrada.' }); }

    await cotizacion.update({ seleccionado: true }, { transaction: t });
    await t.commit();
    return res.json({ data: cotizacion });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ error: 'Error al seleccionar cotización.' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, avanzarEstado, agregarCotizacion, seleccionarCotizacion };
```

- [ ] **Commit**

```
git add backend/src/controllers/pedidos.controller.js
git commit -m "feat: add pedidos controller with state machine and auto-stock"
```

---

## Task 7: Tickets controller (state machine + impacto en activo)

**Files:** Create `backend/src/controllers/tickets.controller.js`

- [ ] **Crear `backend/src/controllers/tickets.controller.js`**

```js
const db = require('../models');
const { TicketMantenimiento, ActivoFijo } = db;
const { registrarMovimiento } = require('../services/historial.service');
const { generarCodigo } = require('../utils/codeGenerator');
const { ESTADO_TICKET, ESTADO_ACTIVO, ACCION_HISTORIAL } = require('../config/constants');

const TRANSICIONES = {
  [ESTADO_TICKET.PENDIENTE]:     [ESTADO_TICKET.EN_REPARACION, ESTADO_TICKET.RECHAZADO_BAJA],
  [ESTADO_TICKET.EN_REPARACION]: [ESTADO_TICKET.RESUELTO, ESTADO_TICKET.RECHAZADO_BAJA],
};

async function listar(req, res) {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.activo_fijo_id) where.activo_fijo_id = req.query.activo_fijo_id;

    const data = await TicketMantenimiento.findAll({
      where,
      include: [{ model: ActivoFijo, as: 'activoFijo', attributes: ['id','numero_serie','estado'] }],
      order: [['created_at', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener tickets.' });
  }
}

async function obtener(req, res) {
  try {
    const ticket = await TicketMantenimiento.findByPk(req.params.id, {
      include: [{ model: ActivoFijo, as: 'activoFijo' }],
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });
    return res.json({ data: ticket });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener ticket.' });
  }
}

async function crear(req, res) {
  try {
    const activo = await ActivoFijo.findByPk(req.body.activo_fijo_id);
    if (!activo) return res.status(404).json({ error: 'Activo fijo no encontrado.' });

    const ticket = await TicketMantenimiento.create({
      ...req.body,
      codigo: generarCodigo('TKT'),
      creador_id: req.user.id,
      estado: ESTADO_TICKET.PENDIENTE,
    });

    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.REPARACION,
      entidad_tipo: 'TicketMantenimiento',
      entidad_id: ticket.id,
      activo_fijo_id: activo.id,
      detalle: { ticket_codigo: ticket.codigo, diagnostico: ticket.diagnostico },
      ip_address: req.ip,
    });

    return res.status(201).json({ data: ticket });
  } catch (e) {
    return res.status(500).json({ error: 'Error al crear ticket.' });
  }
}

/**
 * PATCH /api/tickets/:id/estado
 * Body: { estado, diagnostico?, solucion?, costo_reparacion? }
 */
async function avanzarEstado(req, res) {
  const { estado, diagnostico, solucion, costo_reparacion } = req.body;
  if (!estado) return res.status(400).json({ error: 'Se requiere estado.' });

  const t = await db.sequelize.transaction();
  try {
    const ticket = await TicketMantenimiento.findByPk(req.params.id, { transaction: t });
    if (!ticket) { await t.rollback(); return res.status(404).json({ error: 'Ticket no encontrado.' }); }

    const permitidos = TRANSICIONES[ticket.estado] || [];
    if (!permitidos.includes(estado)) {
      await t.rollback();
      return res.status(400).json({ error: `Transición inválida de "${ticket.estado}" a "${estado}".`, permitidos });
    }

    const activo = await ActivoFijo.findByPk(ticket.activo_fijo_id, { transaction: t });
    const estadoActivoAnterior = activo.estado;
    let nuevoEstadoActivo = activo.estado;

    const update = { estado };
    if (diagnostico) update.diagnostico = diagnostico;
    if (solucion) update.solucion = solucion;
    if (costo_reparacion !== undefined) update.costo_reparacion = costo_reparacion;

    if (estado === ESTADO_TICKET.EN_REPARACION) {
      update.fecha_inicio = new Date();
      nuevoEstadoActivo = ESTADO_ACTIVO.EN_REPARACION;
    }
    if (estado === ESTADO_TICKET.RESUELTO) {
      update.fecha_fin = new Date();
      nuevoEstadoActivo = ESTADO_ACTIVO.DISPONIBLE;
    }
    if (estado === ESTADO_TICKET.RECHAZADO_BAJA) {
      update.fecha_fin = new Date();
      nuevoEstadoActivo = ESTADO_ACTIVO.BAJA_DEFINITIVA;
    }

    await ticket.update(update, { transaction: t });
    await activo.update({ estado: nuevoEstadoActivo }, { transaction: t });

    await registrarMovimiento({
      usuario_id: req.user.id,
      accion: ACCION_HISTORIAL.REPARACION,
      entidad_tipo: 'TicketMantenimiento',
      entidad_id: ticket.id,
      activo_fijo_id: activo.id,
      numero_serie: activo.numero_serie,
      detalle: {
        estado_ticket_anterior: ticket.estado,
        estado_ticket_nuevo: estado,
        estado_activo_anterior: estadoActivoAnterior,
        estado_activo_nuevo: nuevoEstadoActivo,
      },
      ip_address: req.ip,
    }, t);

    await t.commit();
    return res.json({ data: ticket });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ error: 'Error al avanzar estado del ticket.' });
  }
}

async function asignarTecnico(req, res) {
  try {
    const { tecnico_id } = req.body;
    if (!tecnico_id) return res.status(400).json({ error: 'Se requiere tecnico_id.' });

    const ticket = await TicketMantenimiento.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado.' });

    await ticket.update({ tecnico_id });
    return res.json({ data: ticket });
  } catch (e) {
    return res.status(500).json({ error: 'Error al asignar técnico.' });
  }
}

module.exports = { listar, obtener, crear, avanzarEstado, asignarTecnico };
```

- [ ] **Commit**

```
git add backend/src/controllers/tickets.controller.js
git commit -m "feat: add tickets controller with state machine"
```

---

## Task 8: Alertas + Historial controllers

**Files:**
- Create: `backend/src/controllers/alertas.controller.js`
- Create: `backend/src/controllers/historial.controller.js`

- [ ] **Crear `backend/src/controllers/alertas.controller.js`**

```js
const db = require('../models');
const { Alerta } = db;
const { Op } = db.Sequelize;

async function listar(req, res) {
  try {
    const where = {};
    // Admin ve todas; otros solo las propias
    if (req.user.rol !== 'admin') where.usuario_destino_id = req.user.id;
    if (req.query.leida !== undefined) where.leida = req.query.leida === 'true';
    if (req.query.tipo) where.tipo = req.query.tipo;

    const data = await Alerta.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(req.query.limit) || 50,
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener alertas.' });
  }
}

async function marcarLeida(req, res) {
  try {
    const alerta = await Alerta.findByPk(req.params.id);
    if (!alerta) return res.status(404).json({ error: 'Alerta no encontrada.' });
    if (req.user.rol !== 'admin' && alerta.usuario_destino_id !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos para esta alerta.' });
    }
    await alerta.update({ leida: true });
    return res.json({ data: alerta });
  } catch (e) {
    return res.status(500).json({ error: 'Error al marcar alerta.' });
  }
}

async function marcarTodasLeidas(req, res) {
  try {
    const where = { leida: false };
    if (req.user.rol !== 'admin') where.usuario_destino_id = req.user.id;
    await Alerta.update({ leida: true }, { where });
    return res.json({ mensaje: 'Alertas marcadas como leídas.' });
  } catch (e) {
    return res.status(500).json({ error: 'Error al marcar alertas.' });
  }
}

module.exports = { listar, marcarLeida, marcarTodasLeidas };
```

- [ ] **Crear `backend/src/controllers/historial.controller.js`**

```js
const db = require('../models');
const { HistorialMovimiento } = db;
const { Op } = db.Sequelize;

async function listar(req, res) {
  try {
    const { accion, entidad_tipo, usuario_id, desde, hasta, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (accion) where.accion = accion;
    if (entidad_tipo) where.entidad_tipo = entidad_tipo;
    if (usuario_id) where.usuario_id = usuario_id;
    if (desde || hasta) {
      where.created_at = {};
      if (desde) where.created_at[Op.gte] = new Date(desde);
      if (hasta) where.created_at[Op.lte] = new Date(hasta);
    }

    const data = await HistorialMovimiento.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 500),
      offset: parseInt(offset),
    });
    return res.json({ data: data.rows, total: data.count });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener historial.' });
  }
}

async function listarPorEntidad(req, res) {
  try {
    const { tipo, id } = req.params;
    const data = await HistorialMovimiento.findAll({
      where: { entidad_tipo: tipo, entidad_id: id },
      order: [['created_at', 'DESC']],
    });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Error al obtener historial de entidad.' });
  }
}

module.exports = { listar, listarPorEntidad };
```

- [ ] **Commit**

```
git add backend/src/controllers/alertas.controller.js backend/src/controllers/historial.controller.js
git commit -m "feat: add alertas and historial controllers"
```

---

## Task 9: Importación controller

**Files:** Create `backend/src/controllers/importacion.controller.js`

- [ ] **Crear `backend/src/controllers/importacion.controller.js`**

```js
const db = require('../models');
const { Producto, ActivoFijo } = db;
const { parsearCSV, parsearExcel } = require('../utils/csvParser');
const { generarCodigo, generarCodigoQR } = require('../utils/codeGenerator');
const { registrarMovimiento } = require('../services/historial.service');
const { ACCION_HISTORIAL, TIPO_PRODUCTO } = require('../config/constants');

function parsearArchivo(file) {
  const mime = file.mimetype;
  if (mime === 'text/csv' || file.originalname.endsWith('.csv')) {
    return parsearCSV(file.buffer);
  }
  return parsearExcel(file.buffer);
}

/**
 * POST /api/importacion/productos
 * Archivo CSV/Excel con columnas: nombre, tipo, categoria_id?, ubicacion_id?,
 *   stock_actual?, stock_minimo?, unidad_medida?, precio_referencia?, descripcion?
 */
async function importarProductos(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo.' });

  let filas;
  try {
    filas = parsearArchivo(req.file);
  } catch (e) {
    return res.status(400).json({ error: 'No se pudo parsear el archivo.', detalle: e.message });
  }

  const exitosos = [];
  const errores = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    try {
      if (!fila.nombre || !fila.tipo) {
        errores.push({ fila: i + 2, error: 'nombre y tipo son requeridos.' });
        continue;
      }
      if (!Object.values(TIPO_PRODUCTO).includes(fila.tipo)) {
        errores.push({ fila: i + 2, error: `tipo inválido: "${fila.tipo}".` });
        continue;
      }

      const producto = await Producto.create({
        codigo:          fila.codigo || generarCodigo('PRD'),
        codigo_barras:   fila.codigo_barras || null,
        nombre:          fila.nombre,
        descripcion:     fila.descripcion || null,
        tipo:            fila.tipo,
        categoria_id:    fila.categoria_id || null,
        ubicacion_id:    fila.ubicacion_id || null,
        stock_actual:    parseInt(fila.stock_actual) || 0,
        stock_minimo:    parseInt(fila.stock_minimo) || 0,
        unidad_medida:   fila.unidad_medida || 'unidades',
        precio_referencia: parseFloat(fila.precio_referencia) || null,
      });

      await registrarMovimiento({
        usuario_id: req.user.id,
        accion: ACCION_HISTORIAL.CREACION,
        entidad_tipo: 'Producto',
        entidad_id: producto.id,
        producto_id: producto.id,
        detalle: { importacion: true, fila: i + 2 },
        ip_address: req.ip,
      });

      exitosos.push({ fila: i + 2, id: producto.id, nombre: producto.nombre });
    } catch (e) {
      errores.push({ fila: i + 2, error: e.message });
    }
  }

  return res.json({
    resumen: { total: filas.length, exitosos: exitosos.length, errores: errores.length },
    exitosos,
    errores,
  });
}

/**
 * POST /api/importacion/activos
 * Archivo CSV/Excel con columnas: producto_id, numero_serie, mac_address?,
 *   fecha_adquisicion?, valor_adquisicion?, notas?
 */
async function importarActivos(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo.' });

  let filas;
  try {
    filas = parsearArchivo(req.file);
  } catch (e) {
    return res.status(400).json({ error: 'No se pudo parsear el archivo.', detalle: e.message });
  }

  const exitosos = [];
  const errores = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    try {
      if (!fila.producto_id || !fila.numero_serie) {
        errores.push({ fila: i + 2, error: 'producto_id y numero_serie son requeridos.' });
        continue;
      }

      const activo = await ActivoFijo.create({
        producto_id:      fila.producto_id,
        numero_serie:     fila.numero_serie,
        mac_address:      fila.mac_address || null,
        codigo_qr:        fila.codigo_qr || generarCodigoQR(),
        fecha_adquisicion: fila.fecha_adquisicion || null,
        valor_adquisicion: parseFloat(fila.valor_adquisicion) || null,
        notas:            fila.notas || null,
      });

      await registrarMovimiento({
        usuario_id: req.user.id,
        accion: ACCION_HISTORIAL.CREACION,
        entidad_tipo: 'ActivoFijo',
        entidad_id: activo.id,
        activo_fijo_id: activo.id,
        producto_id: activo.producto_id,
        numero_serie: activo.numero_serie,
        detalle: { importacion: true, fila: i + 2 },
        ip_address: req.ip,
      });

      exitosos.push({ fila: i + 2, id: activo.id, numero_serie: activo.numero_serie });
    } catch (e) {
      errores.push({ fila: i + 2, error: e.message });
    }
  }

  return res.json({
    resumen: { total: filas.length, exitosos: exitosos.length, errores: errores.length },
    exitosos,
    errores,
  });
}

module.exports = { importarProductos, importarActivos };
```

- [ ] **Commit**

```
git add backend/src/controllers/importacion.controller.js
git commit -m "feat: add importacion controller for CSV/Excel bulk upload"
```

---

## Task 10: Jobs (scheduler + coldStorage + alertas)

**Files:**
- Create: `backend/src/jobs/scheduler.js`
- Create: `backend/src/jobs/coldStorage.job.js`
- Create: `backend/src/jobs/alertas.job.js`

- [ ] **Crear `backend/src/jobs/scheduler.js`**

```js
const cron = require('node-cron');

function startScheduler() {
  require('./coldStorage.job').schedule();
  require('./alertas.job').schedule();
  console.log('✅ Jobs programados: coldStorage (1º de cada mes, 2am), alertas (diario 8am)');
}

module.exports = { startScheduler };
```

- [ ] **Crear `backend/src/jobs/coldStorage.job.js`**

```js
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const db = require('../models');
const { HistorialMovimiento } = db;
const { Op } = db.Sequelize;
const { comprimirJSON } = require('../utils/compression');

async function ejecutarColdStorage() {
  console.log('[ColdStorage] Iniciando archivado...');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const retentionYears = parseInt(process.env.COLD_STORAGE_RETENTION_YEARS) || 3;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - retentionYears);

  // 1. Leer registros viejos
  const registros = await HistorialMovimiento.findAll({
    where: { created_at: { [Op.lt]: cutoff } },
    raw: true,
  });

  if (!registros.length) {
    console.log('[ColdStorage] Sin registros a archivar.');
    return;
  }

  console.log(`[ColdStorage] Archivando ${registros.length} registros...`);

  // 2. Comprimir a gzip
  const buffer = await comprimirJSON(registros);

  // 3. Subir a Supabase Storage
  const fecha = new Date().toISOString().slice(0, 10);
  const nombreArchivo = `historial-${fecha}-${registros.length}registros.json.gz`;

  const { error: uploadError } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || 'cold-storage-archive')
    .upload(nombreArchivo, buffer, {
      contentType: 'application/gzip',
      upsert: false,
    });

  if (uploadError) {
    console.error('[ColdStorage] Error al subir archivo:', uploadError.message);
    throw new Error(uploadError.message);
  }

  // 4. Hard delete de los registros archivados
  const ids = registros.map(r => r.id);
  const deleted = await HistorialMovimiento.destroy({
    where: { id: { [Op.in]: ids } },
    force: true,  // hard delete (paranoid: false en este modelo, pero por claridad)
  });

  console.log(`[ColdStorage] Archivados y eliminados ${deleted} registros. Archivo: ${nombreArchivo}`);
}

function schedule() {
  // Ejecutar el 1º de cada mes a las 2am
  cron.schedule('0 2 1 * *', async () => {
    try {
      await ejecutarColdStorage();
    } catch (e) {
      console.error('[ColdStorage] Error:', e.message);
    }
  });
}

module.exports = { schedule, ejecutarColdStorage };
```

- [ ] **Crear `backend/src/jobs/alertas.job.js`**

```js
const cron = require('node-cron');
const db = require('../models');
const { Producto, Despacho, DespachoItem, PedidoReposicion, Alerta, Usuario } = db;
const { Op } = db.Sequelize;
const { TIPO_ALERTA, ESTADO_DESPACHO, TIPO_DESPACHO, ESTADO_PEDIDO, ROLES } = require('../config/constants');

async function verificarStockMinimo() {
  const productos = await Producto.findAll({
    where: db.Sequelize.where(
      db.Sequelize.col('stock_actual'),
      { [Op.lte]: db.Sequelize.col('stock_minimo') }
    ),
  });

  const admins = await Usuario.findAll({ where: { rol: ROLES.ADMIN, activo: true } });

  for (const producto of productos) {
    for (const admin of admins) {
      // Evitar duplicados: no crear alerta si ya existe una no leída para este producto
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
        mensaje: `Stock mínimo alcanzado para "${producto.nombre}". Actual: ${producto.stock_actual}, Mínimo: ${producto.stock_minimo}.`,
        usuario_destino_id: admin.id,
      });
    }
  }

  if (productos.length) {
    console.log(`[AlertasJob] ${productos.length} producto(s) con stock mínimo.`);
  }
}

async function verificarDevolucionesVencidas() {
  const ahora = new Date();

  const despachos = await Despacho.findAll({
    where: {
      tipo: TIPO_DESPACHO.SALIDA,
      estado: ESTADO_DESPACHO.COMPLETADO,
      fecha_devolucion_esperada: { [Op.lt]: ahora },
    },
    include: [{ model: DespachoItem, as: 'items',
      where: { estado_devolucion: 'pendiente' },
    }],
  });

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
        mensaje: `Devolución vencida para despacho ${despacho.codigo}. Fecha esperada: ${despacho.fecha_devolucion_esperada.toLocaleDateString()}.`,
        usuario_destino_id: admin.id,
      });
    }
  }
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
}

async function ejecutarTodos() {
  try { await verificarStockMinimo(); } catch (e) { console.error('[AlertasJob] stockMinimo:', e.message); }
  try { await verificarDevolucionesVencidas(); } catch (e) { console.error('[AlertasJob] devoluciones:', e.message); }
  try { await verificarPedidosEstancados(); } catch (e) { console.error('[AlertasJob] pedidos:', e.message); }
}

function schedule() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[AlertasJob] Ejecutando verificaciones diarias...');
    await ejecutarTodos();
  });
}

module.exports = { schedule, ejecutarTodos };
```

- [ ] **Commit**

```
git add backend/src/jobs/
git commit -m "feat: add scheduler, coldStorage and alertas cron jobs"
```

---

## Task 11: Migraciones Sequelize (17 tablas)

**Files:** Crear `backend/migrations/` con 17 archivos en orden de dependencias.

> **Nota:** Ejecutar con `cd backend && npx sequelize-cli db:migrate`

- [ ] **Crear `backend/migrations/20260605000001-create-usuarios.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      email:         { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      nombre:        { type: Sequelize.STRING(255), allowNull: false },
      rol:           { type: Sequelize.ENUM('admin','kiosco','docente'), allowNull: false, defaultValue: 'docente' },
      activo:        { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:    { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('usuarios', ['email']);
    await queryInterface.addIndex('usuarios', ['deleted_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('usuarios'); },
};
```

- [ ] **Crear `backend/migrations/20260605000002-create-categorias.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categorias', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre:      { type: Sequelize.STRING(255), allowNull: false, unique: true },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:  { type: Sequelize.DATE, allowNull: true },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('categorias'); },
};
```

- [ ] **Crear `backend/migrations/20260605000003-create-ubicaciones.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ubicaciones', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nombre:     { type: Sequelize.STRING(255), allowNull: false },
      tipo:       { type: Sequelize.ENUM('aula','deposito','laboratorio','otro'), allowNull: false, defaultValue: 'aula' },
      edificio:   { type: Sequelize.STRING(100), allowNull: true },
      piso:       { type: Sequelize.STRING(50), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('ubicaciones'); },
};
```

- [ ] **Crear `backend/migrations/20260605000004-create-productos.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('productos', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:           { type: Sequelize.STRING(100), allowNull: false, unique: true },
      codigo_barras:    { type: Sequelize.STRING(255), allowNull: true },
      nombre:           { type: Sequelize.STRING(255), allowNull: false },
      descripcion:      { type: Sequelize.TEXT, allowNull: true },
      tipo:             { type: Sequelize.ENUM('retornable','consumible'), allowNull: false },
      categoria_id:     { type: Sequelize.UUID, allowNull: true, references: { model: 'categorias', key: 'id' } },
      ubicacion_id:     { type: Sequelize.UUID, allowNull: true, references: { model: 'ubicaciones', key: 'id' } },
      stock_actual:     { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      stock_minimo:     { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      unidad_medida:    { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'unidades' },
      precio_referencia:{ type: Sequelize.DECIMAL(12,2), allowNull: true },
      imagen_url:       { type: Sequelize.STRING(500), allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:       { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('productos', ['codigo']);
    await queryInterface.addIndex('productos', ['tipo']);
  },
  async down(queryInterface) { await queryInterface.dropTable('productos'); },
};
```

- [ ] **Crear `backend/migrations/20260605000005-create-activos-fijos.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activos_fijos', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      producto_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      numero_serie:      { type: Sequelize.STRING(255), allowNull: false, unique: true },
      mac_address:       { type: Sequelize.STRING(17), allowNull: true },
      codigo_qr:         { type: Sequelize.STRING(255), allowNull: true, unique: true },
      estado:            { type: Sequelize.ENUM('disponible','en_uso','en_reparacion','dañado','baja_definitiva'), allowNull: false, defaultValue: 'disponible' },
      fecha_adquisicion: { type: Sequelize.DATEONLY, allowNull: true },
      valor_adquisicion: { type: Sequelize.DECIMAL(12,2), allowNull: true },
      notas:             { type: Sequelize.TEXT, allowNull: true },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:        { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('activos_fijos', ['numero_serie']);
    await queryInterface.addIndex('activos_fijos', ['estado']);
  },
  async down(queryInterface) { await queryInterface.dropTable('activos_fijos'); },
};
```

- [ ] **Crear `backend/migrations/20260605000006-create-kits.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kits', {
      id:          { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:      { type: Sequelize.STRING(100), allowNull: false, unique: true },
      codigo_qr:   { type: Sequelize.STRING(255), allowNull: true, unique: true },
      nombre:      { type: Sequelize.STRING(255), allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      estado:      { type: Sequelize.ENUM('disponible','en_uso','incompleto','en_reparacion'), allowNull: false, defaultValue: 'disponible' },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:  { type: Sequelize.DATE, allowNull: true },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('kits'); },
};
```

- [ ] **Crear `backend/migrations/20260605000007-create-kit-componentes.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kit_componentes', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      kit_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'kits', key: 'id' }, onDelete: 'CASCADE' },
      producto_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      activo_fijo_id:{ type: Sequelize.UUID, allowNull: true, references: { model: 'activos_fijos', key: 'id' } },
      cantidad:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      es_obligatorio:{ type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:    { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('kit_componentes', ['kit_id']);
    await queryInterface.addIndex('kit_componentes', ['producto_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('kit_componentes'); },
};
```

- [ ] **Crear `backend/migrations/20260605000008-create-reservas.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reservas', {
      id:                   { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:               { type: Sequelize.STRING(100), allowNull: false, unique: true },
      solicitante_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      ubicacion_destino_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'ubicaciones', key: 'id' } },
      estado:               { type: Sequelize.ENUM('borrador','confirmada','cumplida','cancelada','vencida'), allowNull: false, defaultValue: 'borrador' },
      fecha_reserva:        { type: Sequelize.DATEONLY, allowNull: false },
      hora_inicio:          { type: Sequelize.TIME, allowNull: true },
      hora_fin:             { type: Sequelize.TIME, allowNull: true },
      notas:                { type: Sequelize.TEXT, allowNull: true },
      created_at:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:           { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:           { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('reservas', ['solicitante_id']);
    await queryInterface.addIndex('reservas', ['estado']);
    await queryInterface.addIndex('reservas', ['fecha_reserva']);
  },
  async down(queryInterface) { await queryInterface.dropTable('reservas'); },
};
```

- [ ] **Crear `backend/migrations/20260605000009-create-reserva-items.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reserva_items', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      reserva_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'reservas', key: 'id' }, onDelete: 'CASCADE' },
      producto_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      activo_fijo_id:{ type: Sequelize.UUID, allowNull: true, references: { model: 'activos_fijos', key: 'id' } },
      kit_id:        { type: Sequelize.UUID, allowNull: true, references: { model: 'kits', key: 'id' } },
      cantidad:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:    { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('reserva_items', ['reserva_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('reserva_items'); },
};
```

- [ ] **Crear `backend/migrations/20260605000010-create-despachos.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('despachos', {
      id:                      { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:                  { type: Sequelize.STRING(100), allowNull: false, unique: true },
      tipo:                    { type: Sequelize.ENUM('salida','devolucion'), allowNull: false },
      estado:                  { type: Sequelize.ENUM('pendiente','en_proceso','completado','completado_parcial','cancelado'), allowNull: false, defaultValue: 'pendiente' },
      solicitante_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      responsable_id:          { type: Sequelize.UUID, allowNull: true,  references: { model: 'usuarios', key: 'id' } },
      ubicacion_destino_id:    { type: Sequelize.UUID, allowNull: true,  references: { model: 'ubicaciones', key: 'id' } },
      reserva_id:              { type: Sequelize.UUID, allowNull: true,  references: { model: 'reservas', key: 'id' } },
      fecha_despacho:          { type: Sequelize.DATE, allowNull: true },
      fecha_devolucion_esperada:{ type: Sequelize.DATE, allowNull: true },
      notas:                   { type: Sequelize.TEXT, allowNull: true },
      sync_id:                 { type: Sequelize.UUID, allowNull: true },
      created_offline:         { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:              { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:              { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:              { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('despachos', ['codigo']);
    await queryInterface.addIndex('despachos', ['tipo']);
    await queryInterface.addIndex('despachos', ['estado']);
    await queryInterface.addIndex('despachos', ['sync_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('despachos'); },
};
```

- [ ] **Crear `backend/migrations/20260605000011-create-despacho-items.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('despacho_items', {
      id:                 { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      despacho_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'despachos', key: 'id' }, onDelete: 'CASCADE' },
      producto_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      activo_fijo_id:     { type: Sequelize.UUID, allowNull: true,  references: { model: 'activos_fijos', key: 'id' } },
      kit_id:             { type: Sequelize.UUID, allowNull: true,  references: { model: 'kits', key: 'id' } },
      cantidad_despachada:{ type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      cantidad_devuelta:  { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estado_devolucion:  { type: Sequelize.ENUM('pendiente','devuelto_funcional','devuelto_dañado','devuelto_reparacion','merma','perdido'), allowNull: false, defaultValue: 'pendiente' },
      notas:              { type: Sequelize.TEXT, allowNull: true },
      created_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:         { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('despacho_items', ['despacho_id']);
    await queryInterface.addIndex('despacho_items', ['producto_id']);
    await queryInterface.addIndex('despacho_items', ['activo_fijo_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('despacho_items'); },
};
```

- [ ] **Crear `backend/migrations/20260605000012-create-tickets-mantenimiento.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets_mantenimiento', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:           { type: Sequelize.STRING(100), allowNull: false, unique: true },
      activo_fijo_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'activos_fijos', key: 'id' } },
      creador_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      tecnico_id:       { type: Sequelize.UUID, allowNull: true,  references: { model: 'usuarios', key: 'id' } },
      despacho_item_id: { type: Sequelize.UUID, allowNull: true,  references: { model: 'despacho_items', key: 'id' } },
      estado:           { type: Sequelize.ENUM('pendiente','en_reparacion','resuelto','rechazado_baja'), allowNull: false, defaultValue: 'pendiente' },
      diagnostico:      { type: Sequelize.TEXT, allowNull: true },
      solucion:         { type: Sequelize.TEXT, allowNull: true },
      costo_reparacion: { type: Sequelize.DECIMAL(12,2), allowNull: true },
      fecha_inicio:     { type: Sequelize.DATE, allowNull: true },
      fecha_fin:        { type: Sequelize.DATE, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:       { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('tickets_mantenimiento', ['activo_fijo_id']);
    await queryInterface.addIndex('tickets_mantenimiento', ['estado']);
  },
  async down(queryInterface) { await queryInterface.dropTable('tickets_mantenimiento'); },
};
```

- [ ] **Crear `backend/migrations/20260605000013-create-pedidos-reposicion.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedidos_reposicion', {
      id:                    { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      codigo:                { type: Sequelize.STRING(100), allowNull: false, unique: true },
      solicitante_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      aprobador_id:          { type: Sequelize.UUID, allowNull: true,  references: { model: 'usuarios', key: 'id' } },
      estado:                { type: Sequelize.ENUM('borrador','pendiente_aprobacion','aprobado','comprado','en_camino','recibido','rechazado'), allowNull: false, defaultValue: 'borrador' },
      monto_total_estimado:  { type: Sequelize.DECIMAL(12,2), allowNull: true },
      notas:                 { type: Sequelize.TEXT, allowNull: true },
      fecha_aprobacion:      { type: Sequelize.DATE, allowNull: true },
      fecha_recepcion:       { type: Sequelize.DATE, allowNull: true },
      created_at:            { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:            { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:            { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('pedidos_reposicion', ['estado']);
    await queryInterface.addIndex('pedidos_reposicion', ['solicitante_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('pedidos_reposicion'); },
};
```

- [ ] **Crear `backend/migrations/20260605000014-create-pedido-items.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedido_items', {
      id:                { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      pedido_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'pedidos_reposicion', key: 'id' }, onDelete: 'CASCADE' },
      producto_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'productos', key: 'id' } },
      cantidad:          { type: Sequelize.INTEGER, allowNull: false },
      precio_estimado:   { type: Sequelize.DECIMAL(12,2), allowNull: true },
      cantidad_recibida: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:        { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('pedido_items', ['pedido_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('pedido_items'); },
};
```

- [ ] **Crear `backend/migrations/20260605000015-create-proveedores-cotizacion.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('proveedores_cotizacion', {
      id:               { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      pedido_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'pedidos_reposicion', key: 'id' }, onDelete: 'CASCADE' },
      nombre_proveedor: { type: Sequelize.STRING(255), allowNull: false },
      url:              { type: Sequelize.STRING(1000), allowNull: true },
      precio_cotizado:  { type: Sequelize.DECIMAL(12,2), allowNull: true },
      notas:            { type: Sequelize.TEXT, allowNull: true },
      seleccionado:     { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:       { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('proveedores_cotizacion', ['pedido_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('proveedores_cotizacion'); },
};
```

- [ ] **Crear `backend/migrations/20260605000016-create-historial-movimientos.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('historial_movimientos', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      usuario_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      accion:        { type: Sequelize.ENUM('checkout','checkin','merma','ajuste_stock','creacion','modificacion','baja','reparacion','recepcion_compra','reserva','cancelacion'), allowNull: false },
      entidad_tipo:  { type: Sequelize.STRING(100), allowNull: false },
      entidad_id:    { type: Sequelize.UUID, allowNull: false },
      producto_id:   { type: Sequelize.UUID, allowNull: true, references: { model: 'productos', key: 'id' } },
      activo_fijo_id:{ type: Sequelize.UUID, allowNull: true, references: { model: 'activos_fijos', key: 'id' } },
      kit_id:        { type: Sequelize.UUID, allowNull: true, references: { model: 'kits', key: 'id' } },
      cantidad:      { type: Sequelize.INTEGER, allowNull: true },
      numero_serie:  { type: Sequelize.STRING(255), allowNull: true },
      detalle:       { type: Sequelize.JSONB, allowNull: true },
      ip_address:    { type: Sequelize.STRING(45), allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      // Sin updated_at ni deleted_at — tabla inmutable
    });
    await queryInterface.addIndex('historial_movimientos', ['usuario_id']);
    await queryInterface.addIndex('historial_movimientos', ['accion']);
    await queryInterface.addIndex('historial_movimientos', ['entidad_tipo', 'entidad_id']);
    await queryInterface.addIndex('historial_movimientos', ['created_at']);
  },
  async down(queryInterface) { await queryInterface.dropTable('historial_movimientos'); },
};
```

- [ ] **Crear `backend/migrations/20260605000017-create-alertas.js`**

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('alertas', {
      id:                  { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tipo:                { type: Sequelize.ENUM('stock_minimo','devolucion_vencida','pedido_estancado','mantenimiento_pendiente'), allowNull: false },
      producto_id:         { type: Sequelize.UUID, allowNull: true, references: { model: 'productos', key: 'id' } },
      activo_fijo_id:      { type: Sequelize.UUID, allowNull: true, references: { model: 'activos_fijos', key: 'id' } },
      mensaje:             { type: Sequelize.TEXT, allowNull: false },
      leida:               { type: Sequelize.BOOLEAN, defaultValue: false },
      usuario_destino_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      deleted_at:          { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('alertas', ['usuario_destino_id']);
    await queryInterface.addIndex('alertas', ['leida']);
    await queryInterface.addIndex('alertas', ['tipo']);
  },
  async down(queryInterface) { await queryInterface.dropTable('alertas'); },
};
```

- [ ] **Commit**

```
git add backend/migrations/
git commit -m "feat: add all 17 Sequelize migrations"
```

---

## Task 12: Verificar arranque del servidor

- [ ] **Instalar dependencias si faltan**

```powershell
cd "C:\Users\nicol\Documents\GitHub\control stock tk\backend"
npm install
```

- [ ] **Verificar que el servidor arranca (sin DB)**

```powershell
node -e "require('./src/routes/index.js'); console.log('Routes OK')"
```

Esperado: `Routes OK` sin errores de módulo faltante.

- [ ] **Con .env configurado, arrancar en desarrollo**

```powershell
npm run dev
```

Esperado en consola:
```
✅ Conexión a PostgreSQL establecida correctamente.
✅ Modelos sincronizados con la base de datos.
✅ Jobs programados: coldStorage (1º de cada mes, 2am), alertas (diario 8am)
🚀 Servidor corriendo en http://localhost:3000
```

- [ ] **Smoke test de rutas principales**

```powershell
# Login
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@test.com","password":"admin123"}'

# Listar productos (con token)
curl http://localhost:3000/api/productos `
  -H "Authorization: Bearer <TOKEN>"

# Health check
curl http://localhost:3000/health
```

- [ ] **Commit final**

```
git add -A
git commit -m "feat: complete backend - all routes, controllers, jobs and migrations"
```

---

## Resumen de endpoints creados

| Método | Ruta | Rol mínimo |
|--------|------|-----------|
| POST | `/api/auth/login` | público |
| POST | `/api/auth/registrar` | público |
| GET | `/api/auth/perfil` | autenticado |
| GET/POST | `/api/categorias` | GET: todos / POST: admin |
| GET/POST | `/api/ubicaciones` | GET: todos / POST: admin |
| GET | `/api/usuarios` | admin |
| PUT/PATCH | `/api/usuarios/:id` | admin |
| GET/POST | `/api/productos` | GET: todos / POST: admin |
| GET/POST | `/api/activos` | GET: todos / POST: admin/kiosco |
| GET/POST | `/api/kits` | todos |
| POST | `/api/kits/:id/checkout` | admin/kiosco |
| POST | `/api/kits/:id/checkin` | admin/kiosco |
| GET | `/api/despachos` | todos |
| POST | `/api/despachos/checkout` | admin/kiosco |
| POST | `/api/despachos/:id/checkin` | admin/kiosco |
| GET/POST | `/api/reservas` | todos |
| PATCH | `/api/reservas/:id/confirmar` | admin/kiosco |
| GET/POST | `/api/pedidos` | todos |
| PATCH | `/api/pedidos/:id/estado` | según estado |
| POST | `/api/pedidos/:id/cotizaciones` | todos |
| GET/POST | `/api/tickets` | todos |
| PATCH | `/api/tickets/:id/estado` | admin |
| GET | `/api/alertas` | propias / admin: todas |
| POST | `/api/importacion/productos` | admin |
| POST | `/api/importacion/activos` | admin |
| GET | `/api/historial` | admin |
| GET | `/api/historial/entidad/:tipo/:id` | autenticado |
