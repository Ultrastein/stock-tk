const router = require('express').Router();
const ctrl = require('../controllers/pedidos.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',      ctrl.crear);
router.put('/:id',    ctrl.actualizar);
router.delete('/:id', requiereRol(ROLES.ADMIN), ctrl.eliminar);
router.patch('/:id/estado',                           ctrl.avanzarEstado);
router.post('/:id/cotizaciones',                      ctrl.agregarCotizacion);
router.patch('/:id/cotizaciones/:cotId/seleccionar',  requiereRol(ROLES.ADMIN), ctrl.seleccionarCotizacion);

module.exports = router;
