const Grupo = require('../models/Group');

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
