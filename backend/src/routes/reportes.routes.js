const router = require('express').Router();
const { requiereRol } = require('../middleware/roles.middleware');
const ctrl = require('../controllers/reportes.controller');
const { ROLES } = require('../config/constants');

router.get('/resumen',              requiereRol(ROLES.ADMIN), ctrl.resumen);
router.get('/prestamos-activos',    requiereRol(ROLES.ADMIN), ctrl.prestamosActivos);
router.get('/stock-critico',        requiereRol(ROLES.ADMIN), ctrl.stockCritico);
router.get('/garantias',            requiereRol(ROLES.ADMIN), ctrl.garantias);
router.get('/movimientos-mes',      requiereRol(ROLES.ADMIN), ctrl.movimientosMes);
router.get('/presupuesto/:anio',    requiereRol(ROLES.ADMIN), ctrl.presupuestoAnio);

module.exports = router;
