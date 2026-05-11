const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Esquema de base de datos para los Usuarios.
 * Administra el acceso al panel.
 */
const esquemaUsuario = new mongoose.Schema({
  nombre: { type: String, default: 'Agente' },
  correo: { type: String, required: true, unique: true, lowercase: true },
  contrasena: { type: String, required: true, minlength: 8, select: false },
  rol: { type: String, enum: ['admin', 'agente'], default: 'agente' },
  confirmado: { type: Boolean, default: false },
  tokenConfirmacion: { type: String },
  intentosFallidosLogin: { type: Number, default: 0 },
  bloqueadoHasta: { type: Date }
}, { timestamps: true });

esquemaUsuario.pre('save', async function() {
  if (!this.isModified('contrasena')) return;
  this.contrasena = await bcrypt.hash(this.contrasena, 12);
});

esquemaUsuario.methods.contrasenaCorrecta = async function(contrasenaCandidata, contrasenaUsuario) {
  return await bcrypt.compare(contrasenaCandidata, contrasenaUsuario);
};

module.exports = mongoose.model('Usuario', esquemaUsuario);
