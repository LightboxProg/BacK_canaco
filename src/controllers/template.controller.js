const entorno = require('../config/environment');
const logger = require('../utils/logger');

/**
 * Obtiene las plantillas aprobadas de WhatsApp Business desde la Graph API de Meta.
 */
exports.obtenerPlantillas = async (req, res, next) => {
  try {
    const url = `https://graph.facebook.com/v19.0/${entorno.WABA_ID}/message_templates?limit=100`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${entorno.META_TOKEN}` }
    });

    const data = await response.json();

    if (data.error) {
      logger.error(`Error de Meta API: ${data.error.message}`);
      return res.status(502).json({ estado: 'error', mensaje: data.error.message });
    }

    const plantillas = (data.data || [])
      .filter(t => t.status === 'APPROVED')
      .map(t => clasificarPlantilla(t));

    res.status(200).json({ estado: 'exito', datos: plantillas });
  } catch (error) {
    next(error);
  }
};

/**
 * Clasifica una plantilla de Meta segun sus componentes (solo_texto, solo_imagen, texto_imagen).
 */
function clasificarPlantilla(template) {
  const components = template.components || [];

  const header = components.find(c => c.type === 'HEADER');
  const body = components.find(c => c.type === 'BODY');
  const footer = components.find(c => c.type === 'FOOTER');

  let tipoPlantilla = 'solo_texto';
  let headerImageExample = null;

  if (header) {
    if (header.format === 'IMAGE' || header.format === 'VIDEO' || header.format === 'DOCUMENT') {
      tipoPlantilla = body ? 'texto_imagen' : 'solo_imagen';

      if (header.example && header.example.header_handle) {
        headerImageExample = header.example.header_handle[0] || null;
      }
    }
  }

  const bodyParams = [];
  if (body && body.example && body.example.body_text) {
    body.example.body_text[0].forEach((val, idx) => {
      bodyParams.push({ index: idx + 1, ejemplo: val });
    });
  }

  return {
    nombre: template.name,
    idioma: template.language,
    categoria: template.category,
    estado: template.status,
    tipoPlantilla,
    componentes: {
      header: header ? {
        tipo: header.format || 'TEXT',
        texto: header.text || null,
        imagenEjemplo: headerImageExample
      } : null,
      body: body ? {
        texto: body.text || '',
        parametros: bodyParams
      } : null,
      footer: footer ? {
        texto: footer.text || ''
      } : null
    }
  };
}
