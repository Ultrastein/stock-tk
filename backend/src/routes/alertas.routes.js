const router = require('express').Router();
const ctrl = require('../controllers/alertas.controller');

router.get('/',              ctrl.listar);
router.patch('/leer-todas',  ctrl.marcarTodasLeidas);
router.patch('/:id/leer',    ctrl.marcarLeida);

module.exports = router;
