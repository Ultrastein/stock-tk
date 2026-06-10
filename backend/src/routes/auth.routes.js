const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth.middleware');

router.post('/login',          ctrl.login);
router.post('/registrar',      ctrl.registrar);
router.post('/firebase-login', ctrl.firebaseLogin);   // Google / Apple via Firebase
router.get('/perfil',          autenticar, ctrl.perfil);

module.exports = router;
