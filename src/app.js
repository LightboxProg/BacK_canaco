const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const csurf = require('csurf');
const env = require('./config/environment');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middlewares/rateLimiter.middleware');
const errorHandler = require('./middlewares/errorHandler.middleware');
const routes = require('./routes');

const app = express();

// Serve uploaded files statically
app.use('/canaco/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Security Headers
app.use(helmet({
  contentSecurityPolicy: true,
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
}));
app.disable('x-powered-by');

// CORS for Angular frontend
app.use(cors({
  origin: env.ALLOWED_ORIGINS || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'CSRF-Token'],
  credentials: true,
  maxAge: 86400
}));

app.use(compression());
app.use(globalLimiter);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Sanitization (DOMPurify ya lo hace en rutas específicas y Zod valida estrictamente)
app.use(hpp());

// Cookie parser needed for csurf
app.use(cookieParser());

// CSRF Protection (Ignorado en rutas que usan JWT Bearer token o webhooks)
const csrfProtection = csurf({ cookie: { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict' } });
app.use((req, res, next) => {
  const url = req.originalUrl;
  // Las rutas protegidas con JWT Bearer no necesitan CSRF (el header Authorization actúa como protección)
  const sinCsrf = [
    '/canaco/internal',
    '/canaco/webhooks',
    '/canaco/auth/iniciar-sesion',
    '/canaco/auth/registrar',
    '/canaco/contacts',
    '/canaco/groups',
    '/canaco/messages',
    '/canaco/giros',
    '/canaco/templates',
  ];
  if (sinCsrf.some(ruta => url.startsWith(ruta))) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Proveer el token CSRF para Angular (Angular busca la cookie XSRF-TOKEN automáticamente)
app.use((req, res, next) => {
  if (req.csrfToken) {
    res.cookie('XSRF-TOKEN', req.csrfToken(), {
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }
  next();
});

// Endpoint explícito por si lo requieren manualmente
app.get('/canaco/csrf-token', csrfProtection, (req, res) => {
  res.status(200).json({ csrfToken: req.csrfToken() });
});

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Routes
app.use('/canaco', routes);

app.use((req, res, next) => {
  res.status(404).json({ status: 'error', message: `Not Found - ${req.originalUrl}` });
});

app.use(errorHandler);

module.exports = app;
