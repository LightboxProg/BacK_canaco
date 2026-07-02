const BulkJob = require('../models/BulkJob');
const Contacto = require('../models/Contact');
const n8nService = require('./n8n.service');
const registrador = require('../utils/logger');

/**
 * Procesa en segundo plano un trabajo de envio masivo de mensajes.
 */
exports.procesarTrabajoMasivo = async (idTrabajo) => {
  try {
    const trabajo = await BulkJob.findById(idTrabajo);
    if (!trabajo) return;

    let contactosAProcesar = [];

    // 1. Juntar los ID de contactos individuales
    if (trabajo.contactosIds && trabajo.contactosIds.length > 0) {
      contactosAProcesar = trabajo.contactosIds.map(id => id.toString());
    }

    // 2. Extraer contactos de cada grupo (evitando que se dupliquen)
    if (trabajo.gruposIds && trabajo.gruposIds.length > 0) {
      for (const groupId of trabajo.gruposIds) {
        const contactosDelGrupo = await Contacto.find({ grupos: groupId }).select('_id');
        contactosDelGrupo.forEach(c => {
          const cId = c._id.toString();
          if (!contactosAProcesar.includes(cId)) {
            contactosAProcesar.push(cId);
          }
        });
      }
    }

    // 2.5 Extraer contactos de cada giro (evitando que se dupliquen)
    if (trabajo.girosIds && trabajo.girosIds.length > 0) {
      for (const giroId of trabajo.girosIds) {
        const contactosDelGiro = await Contacto.find({ giro: giroId }).select('_id');
        contactosDelGiro.forEach(c => {
          const cId = c._id.toString();
          if (!contactosAProcesar.includes(cId)) {
            contactosAProcesar.push(cId);
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

    // 5. Formatear la lista de contactos con sus respectivos componentes personalizados y evitar duplicidad de telefonos
    const telefonosVistos = new Set();
    const contactosFormateados = [];

    for (const c of contactos) {
      let telefonoFormateado = c.telefono || c.identificadorMeta;
      if (!telefonoFormateado) continue;

      if (telefonoFormateado.startsWith('521')) {
        telefonoFormateado = '52' + telefonoFormateado.substring(3);
      }

      if (telefonosVistos.has(telefonoFormateado)) {
        continue;
      }
      telefonosVistos.add(telefonoFormateado);

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
            let valorFinal = String(valor || '').trim();
            
            // Resuelve las variables dinamicas de forma independiente
            const contactName = c.nombre ? c.nombre.trim() : '';
            const companyName = c.empresa ? c.empresa.trim() : '';

            // Fallback: Nombre o Empresa
            let resolvedNombreOEmpresa = '';
            if (contactName && contactName.toLowerCase() !== 'desconocido') {
              resolvedNombreOEmpresa = contactName;
            } else if (companyName) {
              resolvedNombreOEmpresa = companyName;
            } else {
              resolvedNombreOEmpresa = contactName || 'Desconocido';
            }

            const resolvedNombre = contactName || 'Desconocido';
            const resolvedEmpresa = companyName || 'Desconocido';

            valorFinal = valorFinal.replace(/\{\{nombre_o_empresa\}\}/gi, resolvedNombreOEmpresa)
                                   .replace(/\{\{nombre\}\}/gi, resolvedNombre)
                                   .replace(/\{\{name\}\}/gi, resolvedNombre)
                                   .replace(/\{\{empresa\}\}/gi, resolvedEmpresa)
                                   .replace(/\{\{company\}\}/gi, resolvedEmpresa);

            // Asegura que no se envíe un texto vacío para evitar fallos en Meta API
            if (!valorFinal) {
              valorFinal = ' ';
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

      contactosFormateados.push({
        telefono: telefonoFormateado,
        nombre: c.nombre,
        componentes: componentes
      });
    }

    // Actualizar el estado del trabajo a "en ejecucion" (running) con el numero real de destinatarios unicos
    trabajo.estado = 'ejecutando';
    trabajo.totalContactos = contactosFormateados.length;
    await trabajo.save();

    // 6. Llamar al webhook de n8n pasandole los objetos formateados
    await n8nService.enviarMensajesMasivos({
      jobId: trabajo._id,
      plantilla: trabajo.nombrePlantilla,
      idioma: trabajo.idiomaPlantilla || 'es_MX',
      contactos: contactosFormateados
    });

    registrador.info(`Trabajo masivo ${trabajo._id} iniciado en n8n con ${contactosFormateados.length} destinatarios únicos`);

  } catch (error) {
    registrador.error(`Error procesando trabajo masivo: ${error.message}`);
    await BulkJob.findByIdAndUpdate(idTrabajo, { estado: 'fallido' });
  }
};
