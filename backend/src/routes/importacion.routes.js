const router = require('express').Router();
const ctrl = require('../controllers/importacion.controller');
const { requiereRol } = require('../middleware/roles.middleware');
const multer = require('multer');
const { ROLES } = require('../config/constants');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get ('/plantilla', requiereRol(ROLES.ADMIN), ctrl.generarPlantilla);
router.post('/productos', requiereRol(ROLES.ADMIN), upload.single('archivo'), ctrl.importarProductos);
router.post('/activos',   requiereRol(ROLES.ADMIN), upload.single('archivo'), ctrl.importarActivos);

module.exports = router;
