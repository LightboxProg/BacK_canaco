const BulkJob = require('../models/BulkJob');
const Contacto = require('../models/Contact');
const Mensaje = require('../models/Message');
const { obtenerIO } = require('../config/socket');
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
      let telefonoReal = c.telefono || c.identificadorMeta;
      if (!telefonoReal) continue;

      // Extraer el numero base (sin 52 ni 521)
      let base = telefonoReal.replace(/\D/g, '');
      if (base.startsWith('521') && base.length === 13) base = base.substring(3);
      else if (base.startsWith('52') && base.length === 12) base = base.substring(2);

      // Agregamos a la lista de telefonos unicos para el conteo oficial
      if (telefonosVistos.has(base)) {
        continue;
      }
      telefonosVistos.add(base);

      const componentes = [];
      if (trabajo.componentesPlantilla) {
        const { urlImagen, valoresVariables } = trabajo.componentesPlantilla;

        // 1. Cabecera (Imagen / Documento / Video)
        if (urlImagen) {
          const { headerTipo, fileName } = trabajo.componentesPlantilla;
          const tipoParametro = (headerTipo || 'IMAGE').toLowerCase();
          const parametro = { type: tipoParametro };

          if (tipoParametro === 'document') {
            parametro.document = {
              link: urlImagen,
              filename: fileName || 'documento'
            };
          } else if (tipoParametro === 'video') {
            parametro.video = {
              link: urlImagen
            };
          } else {
            parametro.image = {
              link: urlImagen
            };
          }

          componentes.push({
            type: 'header',
            parameters: [parametro]
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

            // Resolución de género
            const esM = c.genero === 'Masculino';
            const esF = c.genero === 'Femenino';
            const esSoloEmpresa = !contactName || contactName.toLowerCase() === 'desconocido';

            if (esSoloEmpresa) {
              valorFinal = valorFinal.replace(/Estimado\/a/gi, 'Estimado(a)')
                                     .replace(/Estimado\(a\)/gi, 'Estimado(a)')
                                     .replace(/Bienvenido\/a/gi, 'Bienvenido(a)')
                                     .replace(/Bienvenido\(a\)/gi, 'Bienvenido(a)')
                                     .replace(/el\/la/gi, 'el/la')
                                     .replace(/un\/a/gi, 'un/a');
            } else if (esM) {
              valorFinal = valorFinal.replace(/Estimado\/a/gi, 'Estimado')
                                     .replace(/Estimado\(a\)/gi, 'Estimado')
                                     .replace(/Bienvenido\/a/gi, 'Bienvenido')
                                     .replace(/Bienvenido\(a\)/gi, 'Bienvenido')
                                     .replace(/el\/la/gi, 'el')
                                     .replace(/un\/a/gi, 'un');
            } else if (esF) {
              valorFinal = valorFinal.replace(/Estimado\/a/gi, 'Estimada')
                                     .replace(/Estimado\(a\)/gi, 'Estimada')
                                     .replace(/Bienvenido\/a/gi, 'Bienvenida')
                                     .replace(/Bienvenido\(a\)/gi, 'Bienvenida')
                                     .replace(/el\/la/gi, 'la')
                                     .replace(/un\/a/gi, 'una');
            } else {
              valorFinal = valorFinal.replace(/Estimado\/a/gi, 'Estimado(a)')
                                     .replace(/Estimado\(a\)/gi, 'Estimado(a)')
                                     .replace(/Bienvenido\/a/gi, 'Bienvenido(a)')
                                     .replace(/Bienvenido\(a\)/gi, 'Bienvenido(a)')
                                     .replace(/el\/la/gi, 'el/la')
                                     .replace(/un\/a/gi, 'un/a');
            }

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

      // Reconstruye el texto completo del mensaje resuelto para guardar en el historial
      let textoMensaje = (trabajo.contenido || '').replace(/<\/?b>/gi, '');
      const contactName = c.nombre ? c.nombre.trim() : '';
      const companyName = c.empresa ? c.empresa.trim() : '';

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

      if (trabajo.componentesPlantilla && trabajo.componentesPlantilla.valoresVariables) {
        trabajo.componentesPlantilla.valoresVariables.forEach((valor, idx) => {
          let valorFinal = String(valor || '').trim();
          valorFinal = valorFinal.replace(/\{\{nombre_o_empresa\}\}/gi, resolvedNombreOEmpresa)
                                 .replace(/\{\{nombre\}\}/gi, resolvedNombre)
                                 .replace(/\{\{name\}\}/gi, resolvedNombre)
                                 .replace(/\{\{empresa\}\}/gi, resolvedEmpresa)
                                 .replace(/\{\{company\}\}/gi, resolvedEmpresa);

          const esM = c.genero === 'Masculino';
          const esF = c.genero === 'Femenino';
          const esSoloEmpresa = !contactName || contactName.toLowerCase() === 'desconocido';

          if (esSoloEmpresa) {
            valorFinal = valorFinal.replace(/Estimado\/a/gi, 'Estimado(a)')
                                   .replace(/Estimado\(a\)/gi, 'Estimado(a)')
                                   .replace(/Bienvenido\/a/gi, 'Bienvenido(a)')
                                   .replace(/Bienvenido\(a\)/gi, 'Bienvenido(a)')
                                   .replace(/el\/la/gi, 'el/la')
                                   .replace(/un\/a/gi, 'un/a')
                                   .replace(/o\/a/gi, 'o/a');
          } else if (esM) {
            valorFinal = valorFinal.replace(/Estimado\/a/gi, 'Estimado')
                                   .replace(/Estimado\(a\)/gi, 'Estimado')
                                   .replace(/Bienvenido\/a/gi, 'Bienvenido')
                                   .replace(/Bienvenido\(a\)/gi, 'Bienvenido')
                                   .replace(/el\/la/gi, 'el')
                                   .replace(/un\/a/gi, 'un')
                                   .replace(/o\/a/gi, 'o');
          } else if (esF) {
            valorFinal = valorFinal.replace(/Estimado\/a/gi, 'Estimada')
                                   .replace(/Estimado\(a\)/gi, 'Estimada')
                                   .replace(/Bienvenido\/a/gi, 'Bienvenida')
                                   .replace(/Bienvenido\(a\)/gi, 'Bienvenida')
                                   .replace(/el\/la/gi, 'la')
                                   .replace(/un\/a/gi, 'una')
                                   .replace(/o\/a/gi, 'a');
          } else {
            valorFinal = valorFinal.replace(/Estimado\/a/gi, 'Estimado(a)')
                                   .replace(/Estimado\(a\)/gi, 'Estimado(a)')
                                   .replace(/Bienvenido\/a/gi, 'Bienvenido(a)')
                                   .replace(/Bienvenido\(a\)/gi, 'Bienvenido(a)')
                                   .replace(/el\/la/gi, 'el/la')
                                   .replace(/un\/a/gi, 'un/a')
                                   .replace(/o\/a/gi, 'o/a');
          }

          textoMensaje = textoMensaje.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), valorFinal);
        });
      }

      // Crea el registro del mensaje de forma asincrona en la base de datos
      Mensaje.create({
        contacto: c._id,
        remitenteUsuario: trabajo.creadoPor,
        contenido: textoMensaje || `Plantilla: ${trabajo.nombrePlantilla}`,
        direccion: 'saliente',
        estado: 'enviado',
        tipo: 'template',
        archivoUrl: trabajo.componentesPlantilla?.urlImagen || undefined
      }).then(async (msgCreado) => {
        try {
          const msgPoblado = await Mensaje.findById(msgCreado._id)
            .populate('contacto', 'nombre telefono region')
            .populate('remitenteUsuario', 'correo rol nombre');
          obtenerIO().emit('nuevo_mensaje', { mensaje: msgPoblado });
        } catch (se) {}
      }).catch(() => {});

      contactosFormateados.push({
        _id: c._id,
        base: base,
        telefono: c.telefono,
        nombre: c.nombre,
        componentes: componentes
      });
    }

    // Actualizar el estado del trabajo a "en ejecucion" (running) con el numero real de destinatarios unicos
    trabajo.estado = 'ejecutando';
    trabajo.totalContactos = contactosFormateados.length;
    await trabajo.save();

    // 6. Enviar en lotes para evitar timeout de axios y rate limiting de Meta
    const TAMANO_LOTE = 50;
    const PAUSA_ENTRE_LOTES_MS = 3000;
    let enviados = 0;
    let fallidos = 0;

    for (let i = 0; i < contactosFormateados.length; i += TAMANO_LOTE) {
      const lote = contactosFormateados.slice(i, i + TAMANO_LOTE);
      const numeroLote = Math.floor(i / TAMANO_LOTE) + 1;
      const totalLotes = Math.ceil(contactosFormateados.length / TAMANO_LOTE);

      try {
        await n8nService.enviarMensajesMasivos({
          jobId: trabajo._id,
          plantilla: trabajo.nombrePlantilla,
          idioma: trabajo.idiomaPlantilla || 'es_MX',
          contactos: lote
        });
        enviados += lote.length;
        registrador.info(`Lote ${numeroLote}/${totalLotes} enviado (${lote.length} contactos)`);
      } catch (error) {
        fallidos += lote.length;
        registrador.error(`Lote ${numeroLote}/${totalLotes} falló: ${error.message}`);
      }

      // Pausa entre lotes para no saturar Meta API
      if (i + TAMANO_LOTE < contactosFormateados.length) {
        await new Promise(resolve => setTimeout(resolve, PAUSA_ENTRE_LOTES_MS));
      }
    }

    const estadoFinal = fallidos === 0 ? 'completado' : (enviados === 0 ? 'fallido' : 'completado');
    await BulkJob.findByIdAndUpdate(idTrabajo, { estado: estadoFinal });

    registrador.info(`Trabajo masivo ${trabajo._id} finalizado: ${enviados} enviados, ${fallidos} fallidos de ${contactosFormateados.length} total`);

  } catch (error) {
    registrador.error(`Error procesando trabajo masivo: ${error.message}`);
    await BulkJob.findByIdAndUpdate(idTrabajo, { estado: 'fallido' });
  }
};
