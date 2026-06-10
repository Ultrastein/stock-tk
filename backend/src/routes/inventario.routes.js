const router = require('express').Router();
const { requiereRol } = require('../middleware/roles.middleware');
const ctrl = require('../controllers/inventario.controller');
const { ROLES } = require('../config/constants');

router.get('/',                            requiereRol(ROLES.ADMIN), ctrl.listar);
router.get('/:id',                         requiereRol(ROLES.ADMIN), ctrl.obtener);
router.post('/',                           requiereRol(ROLES.ADMIN), ctrl.crear);
router.post('/:id/iniciar',                requiereRol(ROLES.ADMIN), ctrl.iniciar);
router.patch('/:id/items/:itemId',         requiereRol(ROLES.ADMIN), ctrl.actualizarItem);
router.post('/:id/finalizar',             requiereRol(ROLES.ADMIN), ctrl.finalizar);

module.exports = router;
