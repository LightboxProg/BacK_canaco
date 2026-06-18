const Mensaje = require('../models/Message');
const Contacto = require('../models/Contact');
const mediaService = require('../services/media.service');
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
    const { metaMessageId, contactPhone, contactName, content, type, mimeType, mediaUrl, fileName, base64Media } = req.body;

    if (!contactPhone) {
      return res.status(400).json({ estado: 'error', mensaje: 'Teléfono es obligatorio' });
    }

    const telLimpio = contactPhone.replace(/\D/g, '');
    let identificadorMeta = telLimpio;
    let telefonoWhatsapp = telLimpio;

    if (telLimpio.startsWith('521') && telLimpio.length === 13) {
      identificadorMeta = telLimpio;
      telefonoWhatsapp = '52' + telLimpio.substring(3);
    } else if (telLimpio.startsWith('52') && telLimpio.length === 12) {
      identificadorMeta = '521' + telLimpio.substring(2);
      telefonoWhatsapp = telLimpio;
    }

    // 1. Buscar o crear el contacto buscando por ambos identificadores
    let contacto = await Contacto.findOne({
      $or: [
        { identificadorMeta: identificadorMeta },
        { telefono: telefonoWhatsapp },
        { telefono: identificadorMeta },
        { identificadorMeta: telefonoWhatsapp }
      ]
    });
    
    // Si no existe, crearlo
    if (!contacto) {
      contacto = await Contacto.create({ 
        telefono: telefonoWhatsapp, 
        identificadorMeta: identificadorMeta,
        nombre: contactName || 'Desconocido'
      });
    } else {
      let modificado = false;
      if (!contacto.identificadorMeta) {
        contacto.identificadorMeta = identificadorMeta;
        modificado = true;
      }
      if (contacto.telefono !== telefonoWhatsapp) {
        contacto.telefono = telefonoWhatsapp;
        modificado = true;
      }
      if (modificado) {
        await contacto.save();
      }
    }

    // 2. Si es un archivo multimedia o documento, procesarlo
    let archivoUrlLocal = null;
    let textoContenido = content || '';

    const tiposMultimedia = ['image', 'audio', 'video', 'document', 'sticker', 'voice'];

    if (tiposMultimedia.includes(type)) {
      try {
        if (base64Media) {
          archivoUrlLocal = await mediaService.guardarMediaBase64(base64Media, mimeType || 'application/octet-stream');
        } else if (mediaUrl) {
          archivoUrlLocal = await mediaService.descargarMediaDeMeta(mediaUrl, mimeType || 'application/octet-stream');
        }
        
        if (!textoContenido && archivoUrlLocal) {
          const iconos = { 
            'image': '📷 Imagen', 
            'audio': '🎵 Audio', 
            'video': '🎥 Video', 
            'document': '📄 Documento', 
            'sticker': '✨ Sticker', 
            'voice': '🎤 Nota de voz' 
          };
          textoContenido = `${iconos[type] || '📎 Archivo'} recibido`;
        }
      } catch (err) {
        registrador.error(`Error procesando multimedia ${type} en webhook interno:`, err);
        textoContenido = ` [Error al procesar/descargar ${type}]`;
      }
    }

    // 3. Crear el mensaje en la base de datos
    const nuevoMensaje = await Mensaje.create({
      metaMensajeId: metaMessageId,
      contacto: contacto._id,
      contenido: textoContenido,
      tipo: type || 'texto',
      direccion: 'entrante',
      estado: 'entregado',
      archivoUrl: archivoUrlLocal,
      mimeType: mimeType,
      nombreArchivo: fileName || (type === 'document' ? 'Documento' : undefined)
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
      { returnDocument: 'after' } // Retorna el documento actualizado
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
