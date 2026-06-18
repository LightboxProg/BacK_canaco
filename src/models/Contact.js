const mongoose = require('mongoose');

/**
 * Esquema de base de datos para los Contactos.
 * Almacena la informacion de los afiliados/destinatarios de CANACO.
 */
const esquemaContacto = new mongoose.Schema({
  telefono: { type: String, required: true, unique: true },
  nombre: { type: String },
  propietario: { type: mongoose.Schema.ObjectId, ref: 'Usuario' },
  region: { type: String },

  // Campos CANACO
  empresa: { type: String },
  codigoPostal: { type: String },
  numEmpleados: { type: Number },
  afiliacion: { type: Boolean, default: false },
  siem: { type: Boolean, default: false },
  sucursal: { type: String },
  giro: [{ type: mongoose.Schema.ObjectId, ref: 'Giro' }],
  grupos: [{ type: mongoose.Schema.ObjectId, ref: 'Grupo' }],
  vigente: { type: Boolean, default: false },
  afiliado1: { type: Boolean, default: false },
  afiliado2: { type: Boolean, default: false },
  afiliado3: { type: Boolean, default: false },
  registrado: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Contacto', esquemaContacto);

