const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { obtenerGrupos, crearGrupo, obtenerMiembros, agregarMiembro, eliminarMiembro } = require('../controllers/group.controller');

const router = express.Router();
router.use(proteger);

router.get('/', obtenerGrupos);
router.post('/', crearGrupo);

// Rutas de miembros
router.get('/:grupoId/miembros', obtenerMiembros);
router.post('/:grupoId/miembros', agregarMiembro);
router.delete('/:grupoId/miembros/:contactoId', eliminarMiembro);

module.exports = router;
