const Mensaje = require('../models/Message');
const BulkJob = require('../models/BulkJob');
const n8nService = require('../services/n8n.service');
const bulkService = require('../services/bulk.service');
const mediaService = require('../services/media.service');
const Contacto = require('../models/Contact');

/**
 * Controlador para enviar un mensaje individual a un contacto específico.
 * Llama al webhook individual de n8n de manera asíncrona.
 */
exports.enviarIndividual = async (req, res, next) => {
  try {
    const { contactoId, contenido, tipo, base64Media, mimeType, fileName } = req.body;
    
    // 1. Verificar si el contacto existe
    const contacto = await Contacto.findById(contactoId);
    if (!contacto) return res.status(404).json({ estado: 'error', mensaje: 'Contacto no encontrado' });

    let archivoUrl = null;

    // 2. Si hay un archivo adjunto, subirlo a S3 primero
    if (base64Media && (tipo === 'image' || tipo === 'document' || tipo === 'video' || tipo === 'audio')) {
      archivoUrl = await mediaService.guardarMediaBase64(base64Media, mimeType);
    }

    // 3. Guardar el mensaje saliente en la BD como 'pendiente'
    const mensaje = await Mensaje.create({
      contacto: contactoId,
      contenido,
      tipo: tipo || 'texto',
      direccion: 'saliente',
      estado: 'pendiente',
      archivoUrl,
      mimeType,
      nombreArchivo: fileName,
      remitenteUsuario: req.user ? req.user._id : undefined
    });

    // 4. Enviar el payload a través de n8n hacia Meta
    await n8nService.enviarMensajeIndividual({
      telefono: contacto.telefono,
      contenido,
      tipo: tipo || 'texto',
      mensajeId: mensaje._id,
      mediaUrl: archivoUrl,
      fileName
    });

    res.status(201).json({ estado: 'exito', datos: mensaje });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para enviar un mensaje masivo utilizando plantillas de Meta.
 * Carga un Job que se procesa en background limitando la inyección de la API.
 */
exports.enviarMasivo = async (req, res, next) => {
  try {
    const { gruposIds, contactosIds, contenido, nombrePlantilla, idiomaPlantilla, componentesPlantilla } = req.body;

    // 1. Crear el trabajo en la BD (BulkJob)
    const trabajoMasivo = await BulkJob.create({
      creadoPor: req.user._id,
      contenido,
      nombrePlantilla: nombrePlantilla || 'plantilla_por_defecto',
      idiomaPlantilla: idiomaPlantilla || 'es_MX',
      componentesPlantilla: componentesPlantilla || null,
      contactosIds: contactosIds,
      gruposIds: gruposIds,
      estado: 'pendiente'
    });

    // 2. Procesar el trabajo masivo de manera asincrona
    bulkService.procesarTrabajoMasivo(trabajoMasivo._id);

    // Responder inmediatamente sin esperar a n8n
    res.status(201).json({ estado: 'exito', datos: trabajoMasivo });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para recibir un mensaje entrante de n8n/Meta.
 * Guarda el mensaje y asocia/crea el contacto si no existe.
 */
exports.recibirMensaje = async (req, res, next) => {
  try {
    const { telefono, contenido, tipo, metaMensajeId, nombre, region, mimeType, mediaUrl, nombreArchivo } = req.body;

    if (!telefono) {
      return res.status(400).json({ estado: 'error', mensaje: 'Teléfono es obligatorio' });
    }

    // 1. Buscar o crear el contacto
    let contacto = await Contacto.findOne({ telefono });
    if (!contacto) {
      contacto = await Contacto.create({ 
        telefono, 
        nombre: nombre || 'Desconocido',
        region: region || ''
      });
    } else if (region && !contacto.region) {
      contacto.region = region;
      await contacto.save();
    }

    // 2. Si es una imagen u otro archivo con URL o Base64, procesarlo
    let archivoUrlLocal = null;
    let textoContenido = contenido || '';

    const tiposMultimedia = ['image', 'audio', 'video', 'document', 'sticker', 'voice'];
    const { base64Media } = req.body; // n8n puede enviar el archivo en base64

    if (tiposMultimedia.includes(tipo)) {
      try {
        if (base64Media) {
          // Si n8n ya descargó el archivo y lo envió como base64
          archivoUrlLocal = await mediaService.guardarMediaBase64(base64Media, mimeType || 'application/octet-stream');
        } else if (mediaUrl) {
          // Si n8n solo mandó la URL, descargamos de Meta
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
          textoContenido = `${iconos[tipo] || '📎 Archivo'} recibido`;
        }
      } catch (err) {
        console.error(`Error procesando multimedia ${tipo}:`, err);
        textoContenido = ` [Error al procesar/descargar ${tipo}]`;
      }
    }

    // 3. Guardar el mensaje entrante
    const mensaje = await Mensaje.create({
      metaMensajeId,
      contacto: contacto._id,
      contenido: textoContenido,
      tipo: tipo || 'texto',
      direccion: 'entrante',
      estado: 'entregado',
      archivoUrl: archivoUrlLocal,
      mimeType: mimeType,
      nombreArchivo: nombreArchivo || (tipo === 'document' ? 'Documento' : undefined)
    });

    res.status(201).json({ estado: 'exito', datos: mensaje });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para obtener la conversación con un contacto.
 */
exports.obtenerConversacion = async (req, res, next) => {
  try {
    const { contactoId } = req.params;
    console.log(`[Backend] Petición GET /conversacion/${contactoId}`);

    const mensajes = await Mensaje.find({ contacto: contactoId })
      .populate('contacto', 'nombre telefono region')
      .populate('remitenteUsuario', 'correo rol nombre')
      .sort({ createdAt: 1 }); // Orden cronológico (antiguos primero)

    console.log(`[Backend] Se encontraron ${mensajes.length} mensajes para el contacto ${contactoId}. Enviando respuesta 200.`);
    res.status(200).json({ estado: 'exito', datos: mensajes });
  } catch (error) {
    console.error(`[Backend] Error en obtenerConversacion:`, error);
    next(error);
  }
};

/**
 * Sube un archivo en formato Base64 a S3.
 */
exports.subirMedia = async (req, res, next) => {
  try {
    const { base64Media, mimeType } = req.body;
    if (!base64Media || !mimeType) {
      return res.status(400).json({ estado: 'error', mensaje: 'base64Media y mimeType son requeridos' });
    }
    const fileUrl = await mediaService.guardarMediaBase64(base64Media, mimeType);
    res.status(200).json({ estado: 'exito', datos: { url: fileUrl } });
  } catch (error) {
    next(error);
  }
};


