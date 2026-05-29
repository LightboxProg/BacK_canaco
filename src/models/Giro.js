const mongoose = require('mongoose');

/**
 * Esquema de base de datos para los Giros comerciales.
 * Representa el sector o actividad económica de un contacto.
 */
const esquemaGiro = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String },
  propietario: { type: mongoose.Schema.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

module.exports = mongoose.model('Giro', esquemaGiro);
