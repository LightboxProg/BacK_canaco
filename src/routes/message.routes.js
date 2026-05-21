const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { bulkLimiter } = require('../middlewares/rateLimiter.middleware');
const { enviarIndividual, enviarMasivo, recibirMensaje, obtenerConversacion, subirMedia } = require('../controllers/message.controller');

const router = express.Router();

// Webhook para recibir mensajes (no requiere auth de usuario)
router.post('/recibir', recibirMensaje);

// Todas estas rutas requieren estar autenticado
router.use(proteger);

// Rutas
router.post('/enviar', enviarIndividual);
router.post('/masivo', bulkLimiter, enviarMasivo);
router.post('/upload', subirMedia);
router.get('/conversacion/:contactoId', obtenerConversacion); // Obtener historial

module.exports = router;
