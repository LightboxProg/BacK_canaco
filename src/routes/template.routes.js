const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { obtenerPlantillas } = require('../controllers/template.controller');

const router = express.Router();

router.use(proteger);

router.get('/', obtenerPlantillas);

module.exports = router;
