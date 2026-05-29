const Giro = require('../models/Giro');

/**
 * Obtiene todos los giros comerciales ordenados alfabéticamente.
 */
exports.obtenerGiros = async (req, res, next) => {
  try {
    const giros = await Giro.find().sort({ nombre: 1 });
    res.status(200).json({ estado: 'exito', datos: giros });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo giro comercial.
 */
exports.crearGiro = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;

    const existeGiro = await Giro.findOne({ nombre: { $regex: new RegExp(`^${nombre.trim()}$`, 'i') } });
    if (existeGiro) {
      return res.status(400).json({ estado: 'error', mensaje: 'El giro ya existe' });
    }

    const giro = await Giro.create({
      nombre: nombre.trim(),
      descripcion,
      propietario: req.user._id
    });

    res.status(201).json({ estado: 'exito', datos: giro });
  } catch (error) {
    next(error);
  }
};
