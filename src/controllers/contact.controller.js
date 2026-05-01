const Contacto = require('../models/Contact');

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
 * @param {Object} req - Petición HTTP con datos del contacto (telefono, nombre).
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Siguiente middleware.
 */
exports.crearContacto = async (req, res, next) => {
  try {
    // Guarda el contacto asociándolo al usuario logueado
    const contacto = await Contacto.create({ ...req.body, propietario: req.user._id });
    res.status(201).json({ estado: 'exito', datos: contacto });
  } catch (error) {
    next(error);
  }
};
