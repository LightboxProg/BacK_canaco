const BulkJob = require('../models/BulkJob');
const Contacto = require('../models/Contact');
const ContactGroup = require('../models/ContactGroup');
const n8nService = require('./n8n.service');
const registrador = require('../utils/logger');

/**
 * Procesa en segundo plano un trabajo de envio masivo de mensajes.
 * Extrae los telefonos unicos desde los IDs de contactos o grupos seleccionados en la UI.
 * Limita el procesamiento a 1000 elementos para evitar colapso y bloqueos por rate limiting.
 */
exports.procesarTrabajoMasivo = async (idTrabajo) => {
  try {
    const trabajo = await BulkJob.findById(idTrabajo);
    if (!trabajo) return;

    let contactosAProcesar = [];

    // 1. Juntar los ID de contactos individuales
    if (trabajo.contactosIds && trabajo.contactosIds.length > 0) {
      contactosAProcesar = [...trabajo.contactosIds];
    }

    // 2. Extraer contactos de cada grupo (evitando que se dupliquen)
    if (trabajo.gruposIds && trabajo.gruposIds.length > 0) {
      for (const groupId of trabajo.gruposIds) {
        const relacionesContactos = await ContactGroup.find({ group: groupId }).select('contact');
        relacionesContactos.forEach(rel => {
          if (!contactosAProcesar.includes(rel.contact.toString())) {
            contactosAProcesar.push(rel.contact.toString());
          }
        });
      }
    }

    // 3. Limitamos por seguridad a rafagas de 1000 envios
    if (contactosAProcesar.length > 1000) {
      contactosAProcesar = contactosAProcesar.slice(0, 1000);
    }

    // 4. Obtener los datos reales (telefono y nombre) de la BD
    const contactos = await Contacto.find({ _id: { $in: contactosAProcesar } });

    // Actualizar el estado del trabajo a "en ejecucion" (running)
    trabajo.estado = 'ejecutando';
    trabajo.totalContactos = contactos.length;
    await trabajo.save();

    // 5. Formatear la lista de contactos con sus respectivos componentes personalizados
    const contactosFormateados = contactos.map(c => {
      const componentes = [];
      if (trabajo.componentesPlantilla) {
        const { urlImagen, valoresVariables } = trabajo.componentesPlantilla;

        // 1. Cabecera (Imagen)
        if (urlImagen) {
          componentes.push({
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  link: urlImagen
                }
              }
            ]
          });
        }

        // 2. Cuerpo (con variables personalizadas)
        if (valoresVariables && valoresVariables.length > 0) {
          const parametrosMapeados = valoresVariables.map(valor => {
            let valorFinal = String(valor);
            if (c.nombre) {
              valorFinal = valorFinal.replace(/\{\{nombre\}\}/gi, c.nombre)
                                     .replace(/\{\{name\}\}/gi, c.nombre);
            }
            return {
              type: 'text',
              text: valorFinal
            };
          });

          componentes.push({
            type: 'body',
            parameters: parametrosMapeados
          });
        }
      }

      let telefonoFormateado = c.telefono;
      if (telefonoFormateado && telefonoFormateado.startsWith('521')) {
        telefonoFormateado = '52' + telefonoFormateado.substring(3);
      }

      return {
        telefono: telefonoFormateado,
        nombre: c.nombre,
        componentes: componentes
      };
    });

    // 6. Llamar al webhook de n8n pasandole los objetos formateados en espanol
    await n8nService.enviarMensajesMasivos({
      jobId: trabajo._id,
      plantilla: trabajo.nombrePlantilla,
      idioma: trabajo.idiomaPlantilla || 'es_MX',
      contactos: contactosFormateados
    });

    registrador.info(`Trabajo masivo ${trabajo._id} iniciado en n8n con ${contactos.length} destinatarios`);

  } catch (error) {
    registrador.error(`Error procesando trabajo masivo: ${error.message}`);
    await BulkJob.findByIdAndUpdate(idTrabajo, { estado: 'fallido' });
  }
};
