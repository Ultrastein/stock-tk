const router = require('express').Router();
const ctrl = require('../controllers/tickets.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/',   ctrl.crear);
router.patch('/:id/estado',  requiereRol(ROLES.ADMIN), ctrl.avanzarEstado);
router.patch('/:id/tecnico', requiereRol(ROLES.ADMIN), ctrl.asignarTecnico);

module.exports = router;
