const express = require('express');
const { internalAuth } = require('../middlewares/internalAuth.middleware');
const { internalLimiter } = require('../middlewares/rateLimiter.middleware');
const { recibirMensaje, actualizarEstado } = require('../controllers/internal.controller');

const router = express.Router();

router.use(internalLimiter);
router.use(internalAuth);

router.post('/mensajes', recibirMensaje);
router.post('/mensajes/estado', actualizarEstado);

module.exports = router;
