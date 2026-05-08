const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const entorno = require('../config/environment');
const Usuario = require('../models/User');
const { enviarCorreoConfirmacion } = require('../services/email.service');

const firmarToken = id => jwt.sign({ id }, entorno.JWT_SECRET, { expiresIn: '24h' });
const firmarTokenRefresco = id => jwt.sign({ id }, entorno.JWT_SECRET, { expiresIn: '7d' });

/**
 * Registra un nuevo usuario (Agente).
 */
exports.registrar = async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body;
    const tokenConfirmacion = crypto.randomBytes(32).toString('hex');
    
    const nuevoUsuario = await Usuario.create({ 
      correo, 
      contrasena, 
      rol: 'agente',
      confirmado: false,
      tokenConfirmacion
    });
    
    await enviarCorreoConfirmacion(nuevoUsuario.correo, tokenConfirmacion);
    
    res.status(201).json({ 
      estado: 'exito', 
      mensaje: 'Registro exitoso. Por favor revisa tu correo electrónico para confirmar tu cuenta.' 
    });
  } catch (error) {
    next(error);
  }
};

exports.confirmarCorreo = async (req, res, next) => {
  try {
    const { token } = req.params;
    const usuario = await Usuario.findOne({ tokenConfirmacion: token });
    
    if (!usuario) {
      return res.status(400).json({ estado: 'error', mensaje: 'Token de confirmación inválido o expirado' });
    }
    
    usuario.confirmado = true;
    usuario.tokenConfirmacion = undefined;
    await usuario.save({ validateBeforeSave: false });
    
    res.status(200).json({ estado: 'exito', mensaje: 'Correo electrónico confirmado exitosamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Inicia sesión para un usuario.
 */
exports.iniciarSesion = async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body;
    const usuario = await Usuario.findOne({ correo }).select('+contrasena');
    if (!usuario) return res.status(401).json({ estado: 'error', mensaje: 'Credenciales inválidas' });

    if (!usuario.confirmado) {
      return res.status(403).json({ estado: 'error', mensaje: 'Por favor confirma tu correo electrónico antes de iniciar sesión' });
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > Date.now()) {
      return res.status(403).json({ estado: 'error', mensaje: 'Cuenta bloqueada temporalmente' });
    }

    const esValida = await usuario.contrasenaCorrecta(contrasena, usuario.contrasena);
    if (!esValida) {
      usuario.intentosFallidosLogin += 1;
      if (usuario.intentosFallidosLogin >= 5) usuario.bloqueadoHasta = Date.now() + 15 * 60 * 1000;
      await usuario.save({ validateBeforeSave: false });
      return res.status(401).json({ estado: 'error', mensaje: 'Credenciales inválidas' });
    }

    usuario.intentosFallidosLogin = 0;
    usuario.bloqueadoHasta = undefined;
    await usuario.save({ validateBeforeSave: false });

    const token = firmarToken(usuario._id);
    const tokenRefresco = firmarTokenRefresco(usuario._id);

    res.cookie('jwt', token, { httpOnly: true, secure: entorno.NODE_ENV === 'production', sameSite: 'strict', maxAge: 24 * 60 * 60 * 1000 });
    usuario.contrasena = undefined;
    
    res.status(200).json({ estado: 'exito', datos: { token, tokenRefresco, usuario } });
  } catch (error) {
    next(error);
  }
};
