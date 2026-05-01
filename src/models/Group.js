const mongoose = require('mongoose');

/**
 * Esquema de base de datos para los Grupos.
 * Agrupa contactos para envíos masivos.
 */
const esquemaGrupo = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  propietario: { type: mongoose.Schema.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

module.exports = mongoose.model('Grupo', esquemaGrupo);
