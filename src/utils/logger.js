const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'messaging-backend' },
  transports: [
    new winston.transports.Console(
      process.env.NODE_ENV !== 'production'
        ? {
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          }
        : {}
    )
  ]
});

module.exports = logger;
