const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { obtenerGrupos, crearGrupo } = require('../controllers/group.controller');

const router = express.Router();
router.use(proteger);

router.get('/', obtenerGrupos);
router.post('/', crearGrupo);

module.exports = router;
