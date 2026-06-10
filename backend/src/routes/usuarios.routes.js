const router = require('express').Router();
const ctrl = require('../controllers/usuarios.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',                  requiereRol(ROLES.ADMIN), ctrl.listar);
router.post('/',                 requiereRol(ROLES.ADMIN), ctrl.crear);
router.get('/:id',               ctrl.obtener);
router.put('/:id',               requiereRol(ROLES.ADMIN), ctrl.actualizar);
router.patch('/:id/desactivar',  requiereRol(ROLES.ADMIN), ctrl.desactivar);
router.patch('/:id/reactivar',   requiereRol(ROLES.ADMIN), ctrl.reactivar);

module.exports = router;
