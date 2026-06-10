const router = require('express').Router();
const { requiereRol } = require('../middleware/roles.middleware');
const ctrl = require('../controllers/mantenimiento.preventivo.controller');
const { ROLES } = require('../config/constants');

router.get('/',                    ctrl.listar);
router.post('/',                   requiereRol(ROLES.ADMIN), ctrl.crear);
router.put('/:id',                 requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.patch('/:id',               requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.post('/:id/ejecutar',       requiereRol(ROLES.ADMIN), ctrl.marcarEjecutado);
router.delete('/:id',              requiereRol(ROLES.ADMIN), ctrl.eliminar);

module.exports = router;
