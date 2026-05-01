const express = require('express');
const { proteger } = require('../middlewares/auth.middleware');
const { obtenerContactos, crearContacto } = require('../controllers/contact.controller');

const router = express.Router();

// Protegemos todas las rutas con el token JWT
router.use(proteger);

router.get('/', obtenerContactos);
router.post('/', crearContacto);

module.exports = router;
