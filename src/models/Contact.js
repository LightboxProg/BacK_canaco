const mongoose = require('mongoose');

/**
 * Esquema de base de datos para los Contactos.
 * Almacena la información de los destinatarios de los mensajes.
 */
const esquemaContacto = new mongoose.Schema({
  // Número de teléfono único del contacto (usualmente con código de país)
  telefono: { type: String, required: true, unique: true },
  
  // Nombre legible del contacto
  nombre: { type: String },
  
  // Referencia al usuario propietario/creador de este contacto
  propietario: { type: mongoose.Schema.ObjectId, ref: 'Usuario' },

  // Región o lada del contacto
  region: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Contacto', esquemaContacto);
