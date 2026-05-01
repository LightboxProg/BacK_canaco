const Mensaje = require('../models/Message');
const Contacto = require('../models/Contact');
const { obtenerIO } = require('../config/socket');
const registrador = require('../utils/logger');

/**
 * Controlador para recibir mensajes entrantes desde n8n.
 * Busca o crea el contacto y guarda el mensaje en la base de datos.
 * @param {Object} req - Petición HTTP que contiene los datos del mensaje.
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Función para pasar el error al middleware de errores.
 */
exports.recibirMensaje = async (req, res, next) => {
  try {
    const { metaMessageId, contactPhone, contactName, content, type } = req.body;

    // 1. Buscar si el contacto ya existe por su teléfono
    let contacto = await Contacto.findOne({ telefono: contactPhone });
    
    // Si no existe, crearlo
    if (!contacto) {
      contacto = await Contacto.create({ telefono: contactPhone, nombre: contactName });
    }

    // 2. Crear el mensaje en la base de datos
    const nuevoMensaje = await Mensaje.create({
      metaMensajeId: metaMessageId,
      contacto: contacto._id,
      contenido: content,
      tipo: type || 'texto',
      direccion: 'entrante',
      estado: 'entregado'
    });

    // 3. Notificar al frontend en Angular vía Socket.io de que hay un nuevo mensaje
    try {
      obtenerIO().emit('nuevo_mensaje', { mensaje: nuevoMensaje });
    } catch (e) {
      registrador.warn('Socket no inicializado al emitir mensaje entrante');
    }

    res.status(201).json({ estado: 'exito' });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para actualizar el estado de un mensaje (leído, entregado, fallido).
 * Recibe el ID de Meta y actualiza el estado correspondiente en Mongo.
 * @param {Object} req - Petición HTTP con el nuevo estado.
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Función de error.
 */
exports.actualizarEstado = async (req, res, next) => {
  try {
    const { metaMessageId, status } = req.body;
    
    // 1. Buscar y actualizar el mensaje
    const mensajeActualizado = await Mensaje.findOneAndUpdate(
      { metaMensajeId: metaMessageId },
      { estado: status },
      { new: true } // Retorna el documento actualizado
    );

    // 2. Si se actualizó correctamente, emitir evento por sockets para reflejar los "palomitas" en frontend
    if (mensajeActualizado) {
      try {
        obtenerIO().emit('estado_mensaje', { mensajeId: mensajeActualizado._id, estado: status });
      } catch (e) {}
    }

    res.status(200).json({ estado: 'exito' });
  } catch (error) {
    next(error);
  }
};
