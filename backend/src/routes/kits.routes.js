const router = require('express').Router();
const ctrl = require('../controllers/kits.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listarKits);
router.get('/:id/despacho-activo', ctrl.getDespachoActivo);   // must be before /:id
router.get('/:id', ctrl.obtenerKit);
router.post('/',                requiereRol(ROLES.ADMIN), ctrl.crearKit);
router.post('/:kitId/checkout', requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.checkoutKit);
router.post('/:kitId/checkin',  requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.checkinKit);

module.exports = router;
