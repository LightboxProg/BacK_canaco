const mongoose = require('mongoose');

/**
 * Esquema de base de datos para los Mensajes.
 * Representa un mensaje enviado o recibido a través de la API de Meta/n8n.
 */
const esquemaMensaje = new mongoose.Schema({
  // ID del mensaje proporcionado por Meta
  metaMensajeId: { type: String },
  
  // Referencia al Contacto asociado a este mensaje
  contacto: { type: mongoose.Schema.ObjectId, ref: 'Contacto', required: true },

  // Usuario del equipo que envió el mensaje (solo para mensajes salientes)
  remitenteUsuario: { type: mongoose.Schema.ObjectId, ref: 'Usuario' },
  
  // Contenido de texto del mensaje
  contenido: { type: String, required: true },
  
  // Dirección del mensaje (entrante o saliente)
  direccion: { type: String, enum: ['entrante', 'saliente'], required: true },
  
  // Estado actual de entrega del mensaje
  estado: { type: String, enum: ['pendiente', 'enviado', 'entregado', 'leido', 'fallido'], default: 'pendiente' },
  
  // Tipo de mensaje (texto, imagen, document, audio, etc.)
  tipo: { type: String, default: 'texto' },

  // Si es un archivo (imagen/audio), aquí se guarda la ruta local
  archivoUrl: { type: String },

  // MIME type original del archivo (ej. image/jpeg)
  mimeType: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Mensaje', esquemaMensaje);
