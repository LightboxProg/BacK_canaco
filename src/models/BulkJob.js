const mongoose = require('mongoose');

/**
 * Esquema de base de datos para los Trabajos de Envio Masivo.
 */
const esquemaTrabajoMasivo = new mongoose.Schema({
  creadoPor: { type: mongoose.Schema.ObjectId, ref: 'Usuario', required: true },
  estado: { type: String, enum: ['pendiente', 'ejecutando', 'completado', 'fallido', 'cancelado'], default: 'pendiente' },
  contenido: { type: String, required: true },
  nombrePlantilla: { type: String, required: true },
  idiomaPlantilla: { type: String, default: 'es_MX' },
  componentesPlantilla: { type: mongoose.Schema.Types.Mixed },
  totalContactos: { type: Number, default: 0 },
  contactosIds: [{ type: mongoose.Schema.ObjectId, ref: 'Contacto' }],
  gruposIds: [{ type: mongoose.Schema.ObjectId, ref: 'Grupo' }],
  girosIds: [{ type: mongoose.Schema.ObjectId, ref: 'Giro' }]
}, { timestamps: true });

module.exports = mongoose.model('TrabajoMasivo', esquemaTrabajoMasivo);
