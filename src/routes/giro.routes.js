const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { obtenerGiros, crearGiro } = require('../controllers/giro.controller');

const router = express.Router();
router.use(proteger);

router.get('/', obtenerGiros);
router.post('/', crearGiro);

module.exports = router;
