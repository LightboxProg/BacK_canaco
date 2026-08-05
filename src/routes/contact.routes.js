const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { obtenerContactos, crearContacto, obtenerContacto, actualizarContacto, marcarAtendido } = require('../controllers/contact.controller');

const router = express.Router();

// Protegemos todas las rutas con el token JWT
router.use(proteger);

router.get('/', obtenerContactos);
router.post('/', crearContacto);
router.get('/:id', obtenerContacto);
router.put('/:id', actualizarContacto);
router.patch('/:id/atendido', marcarAtendido);

module.exports = router;
