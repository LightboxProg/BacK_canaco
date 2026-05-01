const express = require('express');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const { sanitizeBody } = require('../middlewares/sanitize.middleware');
const { iniciarSesion, registrar, confirmarCorreo } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/iniciar-sesion', authLimiter, sanitizeBody, iniciarSesion);
router.post('/registrar', authLimiter, sanitizeBody, registrar);
router.get('/confirmar/:token', confirmarCorreo);

module.exports = router;
