const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(err.stack);

  if (err.name === 'CastError') error = { message: 'Recurso no encontrado', statusCode: 404, isOperational: true };
  if (err.code === 11000) error = { message: 'El correo o registro ya existe', statusCode: 400, isOperational: true };
  if (err.name === 'ValidationError') error = { message: 'Error de validación', statusCode: 400, isOperational: true };
  if (err.name === 'JsonWebTokenError') error = { message: 'Token inválido', statusCode: 401, isOperational: true };
  if (err.name === 'TokenExpiredError') error = { message: 'Token expirado', statusCode: 401, isOperational: true };

  const statusCode = error.statusCode || err.statusCode || 500;
  
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({ status: 'error', message: error.message || err.message, stack: err.stack });
  } else {
    res.status(statusCode).json({
      status: 'error',
      message: error.isOperational ? error.message : 'Something went wrong'
    });
  }
};
