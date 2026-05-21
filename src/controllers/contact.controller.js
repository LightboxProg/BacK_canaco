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
    // Busca los contactos asociados a esta base de datos
    const contactos = await Contacto.find();
    res.status(200).json({ estado: 'exito', datos: contactos });
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
    
    // Guarda el contacto asociándolo al usuario logueado
    const contacto = await Contacto.create({ ...datosContacto, propietario: req.user._id });
    
    // Si se enviaron grupos, asocia el contacto a esos grupos
    if (grupos && Array.isArray(grupos) && grupos.length > 0) {
      const relaciones = grupos.map(grupoId => ({
        grupo: grupoId,
        contacto: contacto._id
      }));
      await ContactoGrupo.insertMany(relaciones);
    }
    
    res.status(201).json({ estado: 'exito', datos: contacto });
  } catch (error) {
    next(error);
  }
};
