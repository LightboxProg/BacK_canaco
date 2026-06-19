const express = require('express');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const { sanitizeBody } = require('../middlewares/sanitize.middleware');
const { proteger, restringirA } = require('../middlewares/auth.middleware');
const { iniciarSesion, registrar, confirmarCorreo, cambiarContrasena, obtenerUsuarios } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/iniciar-sesion', authLimiter, sanitizeBody, iniciarSesion);
router.post('/registrar', proteger, restringirA('admin'), sanitizeBody, registrar);
router.get('/confirmar/:token', confirmarCorreo);
router.patch('/cambiar-contrasena', proteger, sanitizeBody, cambiarContrasena);
router.get('/usuarios', proteger, restringirA('admin'), obtenerUsuarios);

module.exports = router;

