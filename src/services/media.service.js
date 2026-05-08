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
exports.descargarMediaDeMeta = (url, mimeType) => {
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
    https.get(url, options, (res) => {
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
