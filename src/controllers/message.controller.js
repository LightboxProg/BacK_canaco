const Mensaje = require('../models/Message');
const BulkJob = require('../models/BulkJob');
const n8nService = require('../services/n8n.service');
const bulkService = require('../services/bulk.service');
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
      estado: 'pendiente'
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
