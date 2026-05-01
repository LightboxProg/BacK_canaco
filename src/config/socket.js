const { Server } = require('socket.io');
const entorno = require('./environment');
const registrador = require('../utils/logger');

let io;

/**
 * Inicializa el servidor de WebSockets (Socket.io).
 * @param {Object} servidorHttp - Instancia del servidor HTTP de Node.js.
 * @returns {Object} Instancia configurada de Socket.io.
 */
const inicializarSocket = (servidorHttp) => {
  io = new Server(servidorHttp, {
    cors: {
      origin: entorno.ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    registrador.info(`Cliente conectado al socket: ${socket.id}`);

    socket.on('disconnect', () => {
      registrador.info(`Cliente desconectado del socket: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Obtiene la instancia activa de Socket.io.
 * @throws {Error} Si Socket.io no ha sido inicializado previamente.
 * @returns {Object} Instancia de Socket.io.
 */
const obtenerIO = () => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado');
  }
  return io;
};

module.exports = {
  inicializarSocket,
  obtenerIO
};
