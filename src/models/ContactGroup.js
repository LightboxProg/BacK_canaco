const mongoose = require('mongoose');

/**
 * Relación N a N entre Contactos y Grupos.
 */
const esquemaContactoGrupo = new mongoose.Schema({
  contacto: { type: mongoose.Schema.ObjectId, ref: 'Contacto', required: true },
  grupo: { type: mongoose.Schema.ObjectId, ref: 'Grupo', required: true }
}, { timestamps: true });

// Evitar que un mismo contacto esté en el mismo grupo más de una vez
esquemaContactoGrupo.index({ contacto: 1, grupo: 1 }, { unique: true });

module.exports = mongoose.model('ContactoGrupo', esquemaContactoGrupo);
