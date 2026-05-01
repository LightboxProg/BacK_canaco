require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const { inicializarSocket } = require('./src/config/socket');
const registrador = require('./src/utils/logger');
const entorno = require('./src/config/environment');

// 1. Crear el servidor HTTP utilizando la app de Express
const servidor = http.createServer(app);

// 2. Inicializar Socket.io adjuntándolo al servidor HTTP (para notificaciones en Angular)
inicializarSocket(servidor);

const PUERTO = entorno.PORT || 3000;

/**
 * Función principal para arrancar el backend.
 * Conecta a la base de datos y luego empieza a escuchar peticiones.
 */
const arrancarServidor = async () => {
  try {
    // Conectar a la base de datos MongoDB
    await connectDB();
    
    // Iniciar el servidor en el puerto especificado
    servidor.listen(PUERTO, () => {
      registrador.info(`Servidor ejecutándose en modo ${entorno.NODE_ENV} en el puerto ${PUERTO}`);
    });
  } catch (error) {
    registrador.error(`Fallo al arrancar el servidor: ${error.message}`);
    process.exit(1);
  }
};

arrancarServidor();

// 3. Capturar promesas rechazadas globalmente para evitar caídas silenciosas
process.on('unhandledRejection', (error) => {
  registrador.error(`Promesa no manejada (Rejection): ${error.message}`);
  servidor.close(() => process.exit(1));
});
