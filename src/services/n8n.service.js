const axios = require('axios');
const entorno = require('../config/environment');
const registrador = require('../utils/logger');

const n8nClient = axios.create({
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Función genérica que maneja reintentos con retraso exponencial (Exponential Backoff).
 * Muy útil para APIs de terceros inestables.
 * @param {Function} funcion - La petición asíncrona a ejecutar.
 * @param {number} [reintentos=3] - Número máximo de intentos.
 * @returns {Promise<any>}
 */
const conReintento = async (funcion, reintentos = 3) => {
  let intento = 0;
  while (intento < reintentos) {
    try {
      return await funcion();
    } catch (error) {
      intento++;
      registrador.warn(`Fallo en la llamada a n8n (intento ${intento}/${reintentos}): ${error.message}`);
      if (intento >= reintentos) throw error;
      // Retraso exponencial: 1s, 2s, 4s...
      await new Promise(res => setTimeout(res, Math.pow(2, intento) * 1000));
    }
  }
};

/**
 * Envía la información de un mensaje individual al webhook correspondiente en n8n.
 * @param {Object} datos - Payload (teléfono, contenido, tipo, idMensaje).
 */
exports.enviarMensajeIndividual = async (datos) => {
  return conReintento(() => n8nClient.post(entorno.N8N_MANDAR_MENSAJE, datos));
};

/**
 * Envía la petición para procesar el envío masivo al webhook en n8n.
 * Adjunta dinámicamente el WABA ID y el TOKEN provistos en el entorno para validar con Meta.
 * @param {Object} datos - Payload con la lista de teléfonos, plantilla, y configuraciones.
 */
exports.enviarMensajesMasivos = async (datos) => {
  // Sin reintentos: el bulk.service maneja errores por lote y los reintentos causan envios duplicados
  datos.wabaId = entorno.WABA_ID;
  datos.metaToken = entorno.META_TOKEN;
  
  return n8nClient.post(entorno.WEBHOOK_MASIVOS_N8N, datos);
};
