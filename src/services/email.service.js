const nodemailer = require('nodemailer');
const entorno = require('../config/environment');
const logger = require('../utils/logger');

const crearTransportador = () => {
  return nodemailer.createTransport({
    host: entorno.SMTP_HOST,
    port: parseInt(entorno.SMTP_PORT || '587', 10),
    secure: entorno.SMTP_PORT === '465',
    auth: {
      user: entorno.SMTP_USER,
      pass: entorno.SMTP_PASS,
    },
  });
};

exports.enviarCorreoConfirmacion = async (correo, token) => {
  if (!entorno.SMTP_USER || !entorno.SMTP_PASS || entorno.SMTP_USER === 'tu_correo@gmail.com') {
    logger.warn(`Credenciales de SMTP no configuradas o usando valores por defecto. Simulando envio de correo a ${correo}`);
    logger.warn(`Enlace de confirmacion: ${entorno.FRONTEND_URL}/confirmar/${token}`);
    return;
  }

  const transportador = crearTransportador();
  const urlConfirmacion = `${entorno.FRONTEND_URL}/confirmar/${token}`;

  const opcionesCorreo = {
    from: `"Soporte" <${entorno.SMTP_USER}>`,
    to: correo,
    subject: 'Confirma tu correo electrónico',
    html: `
      <h1>¡Bienvenido!</h1>
      <p>Por favor, confirma tu correo electrónico haciendo clic en el siguiente enlace:</p>
      <a href="${urlConfirmacion}" target="_blank">Confirmar mi correo</a>
      <p>O copia y pega esta URL en tu navegador: ${urlConfirmacion}</p>
    `,
  };

  logger.info(`Enviando correo de confirmacion a: ${correo}`);
  await transportador.sendMail(opcionesCorreo);
  logger.info(`Correo de confirmacion enviado con exito a: ${correo}`);
};
