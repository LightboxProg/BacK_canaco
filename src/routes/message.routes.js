const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { bulkLimiter } = require('../middlewares/rateLimiter.middleware');
const { enviarIndividual, enviarMasivo } = require('../controllers/message.controller');

const router = express.Router();

// Todas estas rutas requieren estar autenticado
router.use(proteger);

// Rutas
router.post('/enviar', enviarIndividual);
router.post('/masivo', bulkLimiter, enviarMasivo);

module.exports = router;
