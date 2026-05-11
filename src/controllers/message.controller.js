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
    const { contactoId, contenido, tipo } = req.body;
    
    // 1. Verificar si el contacto existe
    const contacto = await Contacto.findById(contactoId);
    if (!contacto) return res.status(404).json({ estado: 'error', mensaje: 'Contacto no encontrado' });

    // 2. Guardar el mensaje saliente en la BD como 'pendiente'
    const mensaje = await Mensaje.create({
      contacto: contactoId,
      contenido,
      tipo: tipo || 'texto',
      direccion: 'saliente',
      estado: 'pendiente',
      remitenteUsuario: req.user ? req.user._id : undefined
    });

    // 3. Enviar el payload a través de n8n hacia Meta
    await n8nService.enviarMensajeIndividual({
      telefono: contacto.telefono,
      contenido,
      tipo: tipo || 'texto',
      mensajeId: mensaje._id
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
    const { gruposIds, contactosIds, contenido, nombrePlantilla } = req.body;

    // 1. Crear el trabajo en la BD (BulkJob)
    const trabajoMasivo = await BulkJob.create({
      createdBy: req.user._id,
      content: contenido,
      templateName: nombrePlantilla || 'plantilla_por_defecto',
      contactIds: contactosIds,
      groupIds: gruposIds,
      status: 'pending'
    });

    // 2. Procesar el trabajo masivo de manera asíncrona
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

    // 2. Si es una imagen u otro archivo con URL, descargarlo
    let archivoUrlLocal = null;
    let textoContenido = contenido || '';

    const tiposMultimedia = ['image', 'audio', 'video', 'document', 'sticker', 'voice'];
    if (tiposMultimedia.includes(tipo) && mediaUrl) {
      try {
        // En S3 o local, se necesita saber qué mimeType y url
        archivoUrlLocal = await mediaService.descargarMediaDeMeta(mediaUrl, mimeType || 'application/octet-stream');
        
        if (!textoContenido) {
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
        console.error(`Error descargando ${tipo} de Meta:`, err);
        textoContenido = `⚠️ [Error al descargar ${tipo}]`;
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

