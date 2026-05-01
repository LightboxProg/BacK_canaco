/**
 * Envía una respuesta HTTP exitosa al cliente.
 * @param {Object} res - Objeto de respuesta de Express.
 * @param {number} codigoEstado - Código de estado HTTP (ej. 200, 201).
 * @param {Object} datos - Datos a enviar en el cuerpo de la respuesta.
 * @param {string} [mensaje='Éxito'] - Mensaje descriptivo de la operación.
 * @returns {Object} Respuesta JSON formateada.
 */
exports.enviarExito = (res, codigoEstado, datos, mensaje = 'Éxito') => {
  return res.status(codigoEstado).json({ estado: 'exito', mensaje, datos });
};

/**
 * Envía una respuesta HTTP de error al cliente.
 * @param {Object} res - Objeto de respuesta de Express.
 * @param {number} codigoEstado - Código de estado HTTP (ej. 400, 404, 500).
 * @param {string} mensaje - Mensaje descriptivo del error.
 * @returns {Object} Respuesta JSON formateada.
 */
exports.enviarError = (res, codigoEstado, mensaje) => {
  return res.status(codigoEstado).json({ estado: 'error', mensaje });
};
