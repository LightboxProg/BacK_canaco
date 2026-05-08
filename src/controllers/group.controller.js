const Grupo = require('../models/Group');
const ContactoGrupo = require('../models/ContactGroup');
const Contacto = require('../models/Contact');

/**
 * Obtiene los grupos.
 */
exports.obtenerGrupos = async (req, res, next) => {
  try {
    const grupos = await Grupo.find();
    res.status(200).json({ estado: 'exito', datos: grupos });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un grupo.
 */
exports.crearGrupo = async (req, res, next) => {
  try {
    const grupo = await Grupo.create({ ...req.body, propietario: req.user._id });
    res.status(201).json({ estado: 'exito', datos: grupo });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene los contactos de un grupo específico.
 */
exports.obtenerMiembros = async (req, res, next) => {
  try {
    const { grupoId } = req.params;
    const relaciones = await ContactoGrupo.find({ grupo: grupoId }).populate('contacto');
    const contactos = relaciones.map(r => r.contacto);
    res.status(200).json({ estado: 'exito', datos: contactos });
  } catch (error) {
    next(error);
  }
};

/**
 * Añade un contacto a un grupo.
 */
exports.agregarMiembro = async (req, res, next) => {
  try {
    const { grupoId } = req.params;
    const { contactoId } = req.body;

    // Verificar que el contacto existe
    const contacto = await Contacto.findById(contactoId);
    if (!contacto) return res.status(404).json({ estado: 'error', mensaje: 'Contacto no encontrado' });

    const relacion = await ContactoGrupo.create({ grupo: grupoId, contacto: contactoId });
    res.status(201).json({ estado: 'exito', datos: relacion });
  } catch (error) {
    // Código 11000 = duplicate key (ya existe la relación)
    if (error.code === 11000) {
      return res.status(409).json({ estado: 'error', mensaje: 'El contacto ya pertenece a este grupo' });
    }
    next(error);
  }
};

/**
 * Elimina un contacto de un grupo.
 */
exports.eliminarMiembro = async (req, res, next) => {
  try {
    const { grupoId, contactoId } = req.params;
    await ContactoGrupo.findOneAndDelete({ grupo: grupoId, contacto: contactoId });
    res.status(200).json({ estado: 'exito', mensaje: 'Contacto eliminado del grupo' });
  } catch (error) {
    next(error);
  }
};
