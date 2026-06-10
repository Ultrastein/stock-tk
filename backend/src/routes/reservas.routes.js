const router = require('express').Router();
const ctrl = require('../controllers/reservas.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',      ctrl.crear);
router.put('/:id',    ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);
router.patch('/:id/confirmar', requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.confirmar);
router.patch('/:id/cancelar',  ctrl.cancelar);

module.exports = router;
