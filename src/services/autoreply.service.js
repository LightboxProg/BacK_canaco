const Mensaje = require('../models/Message');
const Contacto = require('../models/Contact');
const mongoose = require('mongoose');
const n8nService = require('./n8n.service');
const { obtenerIO } = require('../config/socket');
const entorno = require('../config/environment');
const registrador = require('../utils/logger');

/**
 * Comprueba si la hora actual esta fuera del horario de atencion de Mexico.
 * @returns {boolean}
 */
exports.estaFueraDeHorario = () => {
  const mxTime = new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" });
  const dateMx = new Date(mxTime);
  const dia = dateMx.getDay();
  const hora = dateMx.getHours();
  const minutos = dateMx.getMinutes();

  if (dia === 0 || dia === 6) {
    return true;
  }

  const totalMinutos = hora * 60 + minutos;
  const minutosInicio = 8 * 60 + 30;
  const minutosFin = 16 * 60 + 30;

  if (totalMinutos < minutosInicio || totalMinutos >= minutosFin) {
    return true;
  }

  return false;
};

/**
 * Evalua y envia una auto-respuesta si se cumplen las condiciones de fuera de horario.
 */
exports.manejarAutoRespuesta = async (contactoId, telefono) => {
  try {
    if (!exports.estaFueraDeHorario()) {
      return;
    }

    const contacto = await Contacto.findById(contactoId);
    if (!contacto) {
      registrador.warn(`Contacto no encontrado para auto-respuesta: ${contactoId}`);
      return;
    }

    const doceHorasAtras = new Date(Date.now() - 12 * 60 * 60 * 1000);
    if (contacto.ultimoAutoEnvio && contacto.ultimoAutoEnvio >= doceHorasAtras) {
      return;
    }

    contacto.ultimoAutoEnvio = new Date();
    await contacto.save();

    let telefonoDestino = telefono;
    if (telefonoDestino && telefonoDestino.startsWith('521')) {
      telefonoDestino = '52' + telefonoDestino.substring(3);
    }

    const tempMensajeId = new mongoose.Types.ObjectId().toString();

    n8nService.enviarMensajeIndividual({
      telefono: telefonoDestino,
      mensaje: entorno.OUT_OF_OFFICE_MESSAGE,
      contenido: entorno.OUT_OF_OFFICE_MESSAGE,
      tipo: 'text',
      mensajeId: tempMensajeId
    }).catch((err) => {
      registrador.error(`Error al enviar auto-respuesta a n8n para ${telefono}: ${err.message}`);
    });

  } catch (error) {
    registrador.error(`Error en servicio de auto-respuesta: ${error.message}`);
  }
};
