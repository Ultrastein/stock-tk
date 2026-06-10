const router = require('express').Router();
const ctrl = require('../controllers/despachos.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/checkout',      requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.checkout);
router.post('/:id/checkin',   requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.checkin);
router.patch('/:id/cancelar', requiereRol(ROLES.ADMIN), ctrl.cancelar);

module.exports = router;
