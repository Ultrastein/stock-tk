const router = require('express').Router();
const ctrl = require('../controllers/historial.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const { ROLES } = require('../config/constants');

router.get('/',                  requiereRol(ROLES.ADMIN), ctrl.listar);
router.get('/entidad/:tipo/:id', ctrl.listarPorEntidad);

module.exports = router;
