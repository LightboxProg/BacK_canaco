const mongoose = require('mongoose');

/**
 * Esquema de base de datos para los Contactos.
 * Almacena la informacion de los afiliados/destinatarios de CANACO.
 */
const esquemaContacto = new mongoose.Schema({
  telefono: { type: String, required: true, unique: true },
  identificadorMeta: { type: String, unique: true, sparse: true },
  nombre: { type: String },
  propietario: { type: mongoose.Schema.ObjectId, ref: 'Usuario' },
  region: { type: String },
  genero: { type: String },

  // Campos CANACO
  empresa: { type: String },
  codigoPostal: { type: String },
  numEmpleados: { type: Number },
  afiliado: { type: Boolean, default: false },
  siem: { type: Boolean, default: false },
  sucursal: { type: String },
  giro: [{ type: mongoose.Schema.ObjectId, ref: 'Giro' }],
  grupos: [{ type: mongoose.Schema.ObjectId, ref: 'Grupo' }],
  vigente: { type: Boolean, default: false },
  capacitacion: { type: Boolean, default: false },
  ultimoAutoEnvio: { type: Date }
}, { timestamps: true });

/**
 * Normaliza los campos de telefono e identificadorMeta antes de guardar.
 */
esquemaContacto.pre('save', function() {
  if (this.telefono) {
    const telLimpio = this.telefono.replace(/\D/g, '');
    
    // Normalizar solo el campo telefono a 52 para estandarizar la base de datos
    if (telLimpio.startsWith('521') && telLimpio.length === 13) {
      this.telefono = '52' + telLimpio.substring(3);
    } else {
      this.telefono = telLimpio;
    }

    // Preservar el identificadorMeta original (wa_id). Si no existe, usar el telefono.
    if (!this.identificadorMeta) {
      this.identificadorMeta = telLimpio;
    }
  }
});

module.exports = mongoose.model('Contacto', esquemaContacto);

