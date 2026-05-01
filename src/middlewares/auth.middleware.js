const jwt = require('jsonwebtoken');
const entorno = require('../config/environment');
const Usuario = require('../models/User');

/**
 * Middleware para proteger rutas requeridas de autenticación.
 */
exports.proteger = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({ estado: 'error', mensaje: 'No autorizado' });
    }

    const decodificado = jwt.verify(token, entorno.JWT_SECRET);
    const usuarioActual = await Usuario.findById(decodificado.id);
    
    if (!usuarioActual) {
      return res.status(401).json({ estado: 'error', mensaje: 'El usuario ya no existe' });
    }

    req.user = usuarioActual;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restringe el acceso a roles específicos.
 */
exports.restringirA = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ estado: 'error', mensaje: 'Prohibido' });
    }
    next();
  };
};
