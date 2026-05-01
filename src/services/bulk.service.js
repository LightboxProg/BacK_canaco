const BulkJob = require('../models/BulkJob');
const Contacto = require('../models/Contact');
const ContactGroup = require('../models/ContactGroup');
const n8nService = require('./n8n.service');
const registrador = require('../utils/logger');

/**
 * Procesa en segundo plano un trabajo de envío masivo de mensajes.
 * Extrae los teléfonos únicos desde los IDs de contactos o grupos seleccionados en la UI.
 * Limita el procesamiento a 1000 elementos para evitar colapso y bloqueos por rate limiting.
 * @param {string} idTrabajo - El ObjectId del registro BulkJob.
 */
exports.procesarTrabajoMasivo = async (idTrabajo) => {
  try {
    const trabajo = await BulkJob.findById(idTrabajo);
    if (!trabajo) return;

    let contactosAProcesar = [];

    // 1. Juntar los ID de contactos individuales
    if (trabajo.contactIds && trabajo.contactIds.length > 0) {
      contactosAProcesar = [...trabajo.contactIds];
    }

    // 2. Extraer contactos de cada grupo (evitando que se dupliquen)
    if (trabajo.groupIds && trabajo.groupIds.length > 0) {
      for (const groupId of trabajo.groupIds) {
        const relacionesContactos = await ContactGroup.find({ group: groupId }).select('contact');
        relacionesContactos.forEach(rel => {
          if (!contactosAProcesar.includes(rel.contact.toString())) {
            contactosAProcesar.push(rel.contact.toString());
          }
        });
      }
    }

    // 3. Limitamos por seguridad a ráfagas de 1000 envíos
    if (contactosAProcesar.length > 1000) {
      contactosAProcesar = contactosAProcesar.slice(0, 1000);
    }

    // 4. Obtener los datos reales (teléfono y nombre) de la BD
    const contactos = await Contacto.find({ _id: { $in: contactosAProcesar } });

    // Actualizar el estado del trabajo a "en ejecución" (running)
    trabajo.status = 'running';
    trabajo.totalContacts = contactos.length;
    await trabajo.save();

    // 5. Llamar al webhook de n8n pasándole los objetos formateados
    await n8nService.enviarMensajesMasivos({
      jobId: trabajo._id,
      contacts: contactos.map(c => ({ phone: c.telefono, name: c.nombre })),
      templateName: trabajo.templateName,
      content: trabajo.content
    });

    registrador.info(`Trabajo masivo ${trabajo._id} iniciado en n8n con ${contactos.length} destinatarios`);

  } catch (error) {
    registrador.error(`Error procesando trabajo masivo: ${error.message}`);
    // Si falla, marcamos el job como fallido
    await BulkJob.findByIdAndUpdate(idTrabajo, { status: 'failed' });
  }
};
