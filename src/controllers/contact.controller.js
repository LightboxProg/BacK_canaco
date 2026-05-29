const Contacto = require('../models/Contact');
const ContactoGrupo = require('../models/ContactGroup');

/**
 * Controlador para obtener la lista de contactos del usuario autenticado.
 * @param {Object} req - Petición HTTP.
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Siguiente middleware.
 */
exports.obtenerContactos = async (req, res, next) => {
  try {
    const contactosConUltimoMensaje = await Contacto.aggregate([
      {
        $lookup: {
          from: 'mensajes',
          let: { contactoId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$contacto', '$$contactoId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'ultimoMensaje'
        }
      },
      {
        $addFields: {
          ultimoMensaje: { $arrayElemAt: ['$ultimoMensaje', 0] }
        }
      },
      {
        $addFields: {
          noRespondido: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$ultimoMensaje', null] },
                  { $eq: ['$ultimoMensaje.direccion', 'entrante'] }
                ]
              },
              then: true,
              else: false
            }
          }
        }
      }
    ]);

    const contactosPopulated = await Contacto.populate(contactosConUltimoMensaje, { path: 'giro' });
    res.status(200).json({ estado: 'exito', datos: contactosPopulated });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para crear un nuevo contacto de manera manual en la agenda.
 * @param {Object} req - Petición HTTP con datos del contacto (telefono, nombre, grupos).
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Siguiente middleware.
 */
exports.crearContacto = async (req, res, next) => {
  try {
    const { grupos, ...datosContacto } = req.body;
    
    if (datosContacto.giro === '') {
      delete datosContacto.giro;
    }
    
    let contacto = await Contacto.create({ ...datosContacto, propietario: req.user._id });
    
    if (grupos && Array.isArray(grupos) && grupos.length > 0) {
      const relaciones = grupos.map(grupoId => ({
        grupo: grupoId,
        contacto: contacto._id
      }));
      await ContactoGrupo.insertMany(relaciones);
    }
    
    contacto = await contacto.populate('giro');
    
    res.status(201).json({ estado: 'exito', datos: contacto });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para obtener los detalles de un contacto especifico.
 * @param {Object} req - Petición HTTP.
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Siguiente middleware.
 */
exports.obtenerContacto = async (req, res, next) => {
  try {
    const contacto = await Contacto.findById(req.params.id).populate('giro');
    if (!contacto) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contacto no encontrado' });
    }
    
    // Obtener los grupos a los que pertenece el contacto
    const grupos = await ContactoGrupo.find({ contacto: req.params.id }).populate('grupo');
    const gruposAsignados = grupos.map(g => g.grupo);
    
    // Convertir a un objeto plano para poder agregarle los grupos
    const datosContacto = contacto.toObject();
    datosContacto.grupos = gruposAsignados;

    res.status(200).json({ estado: 'exito', datos: datosContacto });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para actualizar un contacto existente.
 * @param {Object} req - Petición HTTP.
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Siguiente middleware.
 */
exports.actualizarContacto = async (req, res, next) => {
  try {
    const { grupos, ...datosContacto } = req.body;
    
    if (datosContacto.giro === '') {
      datosContacto.giro = null;
    }

    datosContacto.registrado = true;

    let contacto = await Contacto.findByIdAndUpdate(
      req.params.id,
      datosContacto,
      { new: true, runValidators: true }
    );

    if (!contacto) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contacto no encontrado' });
    }

    // Actualizar grupos si se envían
    if (grupos && Array.isArray(grupos)) {
      // Eliminar relaciones anteriores
      await ContactoGrupo.deleteMany({ contacto: contacto._id });
      
      if (grupos.length > 0) {
        // Crear nuevas relaciones
        const relaciones = grupos.map(grupoId => ({
          grupo: grupoId,
          contacto: contacto._id
        }));
        await ContactoGrupo.insertMany(relaciones);
      }
    }

    contacto = await contacto.populate('giro');
    
    res.status(200).json({ estado: 'exito', datos: contacto });
  } catch (error) {
    next(error);
  }
};
