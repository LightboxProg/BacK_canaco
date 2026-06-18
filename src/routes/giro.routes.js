const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { obtenerGiros, crearGiro, actualizarGiro } = require('../controllers/giro.controller');

const router = express.Router();
router.use(proteger);

router.get('/', obtenerGiros);
router.post('/', crearGiro);
router.put('/:id', actualizarGiro);

module.exports = router;
