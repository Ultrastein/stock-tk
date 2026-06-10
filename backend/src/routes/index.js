const router = require('express').Router();
const { autenticar } = require('../middleware/auth.middleware');

router.use('/auth',                     require('./auth.routes'));
router.use('/usuarios',                 autenticar, require('./usuarios.routes'));
router.use('/categorias',               autenticar, require('./categorias.routes'));
router.use('/ubicaciones',              autenticar, require('./ubicaciones.routes'));
router.use('/productos',                autenticar, require('./productos.routes'));
router.use('/activos',                  autenticar, require('./activos.routes'));
router.use('/kits',                     autenticar, require('./kits.routes'));
router.use('/despachos',                autenticar, require('./despachos.routes'));
router.use('/reservas',                 autenticar, require('./reservas.routes'));
router.use('/pedidos',                  autenticar, require('./pedidos.routes'));
router.use('/tickets',                  autenticar, require('./tickets.routes'));
router.use('/alertas',                  autenticar, require('./alertas.routes'));
router.use('/importacion',              autenticar, require('./importacion.routes'));
router.use('/historial',                autenticar, require('./historial.routes'));
// Nuevos módulos
router.use('/proveedores',              autenticar, require('./proveedores.routes'));
router.use('/inventario',               autenticar, require('./inventario.routes'));
router.use('/mantenimiento-preventivo', autenticar, require('./mantenimiento.preventivo.routes'));
router.use('/presupuesto',              autenticar, require('./presupuesto.routes'));
router.use('/reportes',                 autenticar, require('./reportes.routes'));

module.exports = router;
