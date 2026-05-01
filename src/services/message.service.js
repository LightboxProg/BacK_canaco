const Mensaje = require('../models/Message');
const registrador = require('../utils/logger');
const { obtenerIO } = require('../config/socket');

/**
 * Procesa un mensaje entrante desde el webhook de n8n.
 * Guarda el mensaje en la base de datos y emite una notificación por WebSockets.
 * 
 * @param {Object} datosMensaje - Objeto que contiene los detalles del mensaje entrante.
 * @returns {Promise<Object>} El documento del nuevo mensaje guardado.
 */
exports.manejarMensajeEntrante = async (datosMensaje) => {
  try {
    const nuevoMensaje = await Mensaje.create({
      metaMensajeId: datosMensaje.metaMessageId,
      contacto: datosMensaje.contactId,
      contenido: datosMensaje.content,
      direccion: 'entrante',
      tipo: datosMensaje.type || 'texto',
      estado: 'entregado'
    });

    registrador.info(`Mensaje entrante guardado con ID: ${nuevoMensaje._id}`);
    
    try {
      const io = obtenerIO();
      // Notificar al Frontend en Angular
      io.emit('nuevo_mensaje', { mensaje: nuevoMensaje });
    } catch (err) {
      registrador.warn('Socket no inicializado al emitir evento');
    }
    
    return nuevoMensaje;
  } catch (error) {
    registrador.error(`Error al manejar mensaje entrante: ${error.message}`);
    throw error;
  }
};
