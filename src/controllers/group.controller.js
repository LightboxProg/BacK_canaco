const Grupo = require('../models/Group');
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
    const { contactos, ...datosGrupo } = req.body;
    const grupo = await Grupo.create({ ...datosGrupo, propietario: req.user._id });

    if (contactos && Array.isArray(contactos) && contactos.length > 0) {
      await Contacto.updateMany(
        { _id: { $in: contactos } },
        { $addToSet: { grupos: grupo._id } }
      );
    }

    res.status(201).json({ estado: 'exito', datos: grupo });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un grupo.
 */
exports.actualizarGrupo = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    const grupo = await Grupo.findByIdAndUpdate(
      req.params.id,
      { nombre, descripcion },
      { new: true, runValidators: true }
    );

    if (!grupo) {
      return res.status(404).json({ estado: 'error', mensaje: 'Grupo no encontrado' });
    }

    res.status(200).json({ estado: 'exito', datos: grupo });
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
    const contactos = await Contacto.find({ grupos: grupoId }).populate('giro grupos');
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

    const contacto = await Contacto.findByIdAndUpdate(
      contactoId,
      { $addToSet: { grupos: grupoId } },
      { new: true }
    );

    if (!contacto) return res.status(404).json({ estado: 'error', mensaje: 'Contacto no encontrado' });

    res.status(200).json({ estado: 'exito', datos: contacto });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un contacto de un grupo.
 */
exports.eliminarMiembro = async (req, res, next) => {
  try {
    const { grupoId, contactoId } = req.params;
    await Contacto.findByIdAndUpdate(
      contactoId,
      { $pull: { grupos: grupoId } }
    );
    res.status(200).json({ estado: 'exito', mensaje: 'Contacto eliminado del grupo' });
  } catch (error) {
    next(error);
  }
};
