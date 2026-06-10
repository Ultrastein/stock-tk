const router = require('express').Router();
const { requiereRol } = require('../middleware/roles.middleware');
const ctrl = require('../controllers/presupuesto.controller');
const { ROLES } = require('../config/constants');

router.get('/',                    requiereRol(ROLES.ADMIN), ctrl.listar);
router.post('/',                   requiereRol(ROLES.ADMIN), ctrl.crear);
router.put('/:id',                 requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.patch('/:id',               requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.post('/:id/gasto',          requiereRol(ROLES.ADMIN), ctrl.registrarGasto);
router.delete('/:id',              requiereRol(ROLES.ADMIN), ctrl.eliminar);

module.exports = router;
