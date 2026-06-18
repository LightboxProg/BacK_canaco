const Contacto = require('../models/Contact');

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

    const contactosPopulated = await Contacto.populate(contactosConUltimoMensaje, { path: 'giro grupos' });
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
    const datosContacto = req.body;
    
    if (datosContacto.giro === '' || (Array.isArray(datosContacto.giro) && datosContacto.giro.length === 0)) {
      delete datosContacto.giro;
    }

    if (datosContacto.grupos === '' || (Array.isArray(datosContacto.grupos) && datosContacto.grupos.length === 0)) {
      delete datosContacto.grupos;
    }
    
    let contacto = await Contacto.create({ ...datosContacto, propietario: req.user._id });
    
    contacto = await contacto.populate('giro grupos');
    
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
    const contacto = await Contacto.findById(req.params.id).populate('giro grupos');
    if (!contacto) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contacto no encontrado' });
    }
    
    res.status(200).json({ estado: 'exito', datos: contacto });
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
    const datosContacto = req.body;
    
    if (datosContacto.giro === '' || (Array.isArray(datosContacto.giro) && datosContacto.giro.length === 0)) {
      datosContacto.giro = [];
    }

    if (datosContacto.grupos === '' || (Array.isArray(datosContacto.grupos) && datosContacto.grupos.length === 0)) {
      datosContacto.grupos = [];
    }

    let contacto = await Contacto.findById(req.params.id);

    if (!contacto) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contacto no encontrado' });
    }

    if (!datosContacto.propietario && !contacto.propietario) {
      datosContacto.propietario = req.user._id;
    }

    Object.assign(contacto, datosContacto);
    await contacto.save();

    contacto = await contacto.populate('giro grupos');
    
    res.status(200).json({ estado: 'exito', datos: contacto });
  } catch (error) {
    next(error);
  }
};
