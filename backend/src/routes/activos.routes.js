const router = require('express').Router();
const ctrl = require('../controllers/activos.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',      requiereRol(ROLES.ADMIN, ROLES.KIOSCO), ctrl.crear);
router.put('/:id',    requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.patch('/:id',  requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.delete('/:id', requiereRol(ROLES.ADMIN), ctrl.eliminar);

module.exports = router;
