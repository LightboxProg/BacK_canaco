const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const https = require('https');
const entorno = require('../config/environment');
const logger = require('../utils/logger');

// Configuración del cliente de S3
const s3Client = new S3Client({
  region: entorno.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: entorno.AWS_ACCESS_KEY_ID,
    secretAccessKey: entorno.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Descarga un archivo multimedia desde la URL autenticada de Meta y lo sube directamente a AWS S3
 * @param {string} url - URL de Meta para descargar el archivo.
 * @param {string} mimeType - El mime type para saber qué extensión darle (ej. image/jpeg)
 * @returns {Promise<string>} - Retorna la URL pública de S3
 */
exports.descargarMediaDeMeta = async (mediaUrlOrId, mimeType) => {
  let downloadUrl = mediaUrlOrId;

  // Si no es una URL completa (es un ID de Meta), obtenemos la URL real primero
  if (!mediaUrlOrId.startsWith('http')) {
    const metaApiUrl = `https://graph.facebook.com/v19.0/${mediaUrlOrId}`;
    try {
      const response = await fetch(metaApiUrl, {
        headers: { 'Authorization': `Bearer ${entorno.META_TOKEN}` }
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      downloadUrl = data.url;
    } catch (err) {
      throw new Error(`Fallo al obtener la URL del media ID ${mediaUrlOrId}: ${err.message}`);
    }
  }

  return new Promise((resolve, reject) => {
    // Generar un nombre aleatorio para el archivo en S3
    const ext = mimeType.split('/')[1] || 'bin';
    const filename = `whatsapp_media/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

    const options = {
      headers: {
        'Authorization': `Bearer ${entorno.META_TOKEN}`
      }
    };

    // Hacer la petición GET a Meta
    https.get(downloadUrl, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Fallo al descargar archivo de Meta. Status: ${res.statusCode}`));
        return;
      }

      // Usar la respuesta (que es un Stream) directamente como Body para la subida a S3
      const s3Upload = new Upload({
        client: s3Client,
        params: {
          Bucket: entorno.AWS_BUCKET_NAME || 's3-canaco',
          Key: filename,
          Body: res, // Pasa el stream de lectura directamente
          ContentType: mimeType,
          // ACL: 'public-read' // Opcional: Descomenta si tu bucket permite ACLs públicos directos
        }
      });

      s3Upload.done()
        .then(data => {
          logger.info(`Archivo subido exitosamente a S3: ${data.Location}`);
          // Devolver la URL del archivo subido en S3
          resolve(data.Location || `https://${entorno.AWS_BUCKET_NAME}.s3.${entorno.AWS_REGION}.amazonaws.com/${filename}`);
        })
        .catch(err => {
          logger.error(`Error subiendo a S3: ${err.message}`);
          reject(err);
        });

    }).on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Guarda un archivo en formato Base64 directamente a AWS S3
 * @param {string} base64Data - Datos del archivo en formato base64
 * @param {string} mimeType - El mime type para saber qué extensión darle (ej. image/jpeg)
 * @returns {Promise<string>} - Retorna la URL pública de S3
 */
exports.guardarMediaBase64 = async (base64Data, mimeType) => {
  return new Promise((resolve, reject) => {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = mimeType.split('/')[1] || 'bin';
      const filename = `whatsapp_media/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

      const s3Upload = new Upload({
        client: s3Client,
        params: {
          Bucket: entorno.AWS_BUCKET_NAME || 's3-canaco',
          Key: filename,
          Body: buffer,
          ContentType: mimeType,
          // ACL: 'public-read' // Descomentar si el bucket lo permite/requiere
        }
      });

      s3Upload.done()
        .then(data => {
          logger.info(`Archivo base64 subido exitosamente a S3: ${data.Location}`);
          resolve(data.Location || `https://${entorno.AWS_BUCKET_NAME}.s3.${entorno.AWS_REGION}.amazonaws.com/${filename}`);
        })
        .catch(err => {
          logger.error(`Error subiendo base64 a S3: ${err.message}`);
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
};
