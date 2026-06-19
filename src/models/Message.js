const mongoose = require('mongoose');

/**
 * Esquema de base de datos para los Mensajes.
 * Representa un mensaje enviado o recibido a través de la API de Meta/n8n.
 */
const esquemaMensaje = new mongoose.Schema({
  // ID del mensaje proporcionado por Meta
  metaMensajeId: { type: String },
  
  // Referencia al Contacto asociado a este mensaje
  contacto: { type: mongoose.Schema.Types.ObjectId, ref: 'Contacto', required: true },

  // Usuario del equipo que envió el mensaje (solo para mensajes salientes)
  remitenteUsuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  
  // Contenido de texto del mensaje
  contenido: { type: String },
  
  // Dirección del mensaje (entrante o saliente)
  direccion: { type: String, enum: ['entrante', 'saliente'], required: true },
  
  // Estado actual de entrega del mensaje
  estado: { type: String, enum: ['pendiente', 'enviado', 'entregado', 'leido', 'fallido'], default: 'pendiente' },
  
  // Tipo de mensaje (texto, imagen, document, audio, etc.)
  tipo: { type: String, default: 'texto' },

  // Si es un archivo, aquí se guarda la URL de Amazon S3
  archivoUrl: { type: String },

  // MIME type original del archivo (ej. image/jpeg)
  mimeType: { type: String },

  // Nombre original del archivo (opcional, útil para documentos)
  nombreArchivo: { type: String },
  esAutoRespuesta: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Mensaje', esquemaMensaje);
