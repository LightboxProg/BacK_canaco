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
  capacitacion: { type: Boolean, default: false }
}, { timestamps: true });

/**
 * Normaliza los campos de telefono e identificadorMeta antes de guardar.
 */
esquemaContacto.pre('save', function() {
  if (this.telefono) {
    const telLimpio = this.telefono.replace(/\D/g, '');
    if (telLimpio.startsWith('521') && telLimpio.length === 13) {
      const base = telLimpio.substring(3);
      this.telefono = '52' + base;
      this.identificadorMeta = '521' + base;
    } else if (telLimpio.startsWith('52') && telLimpio.length === 12) {
      const base = telLimpio.substring(2);
      this.telefono = '52' + base;
      this.identificadorMeta = '521' + base;
    } else {
      this.telefono = telLimpio;
      this.identificadorMeta = telLimpio;
    }
  }
});

module.exports = mongoose.model('Contacto', esquemaContacto);

