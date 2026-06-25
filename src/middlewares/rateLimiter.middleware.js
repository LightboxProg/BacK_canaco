const rateLimit = require('express-rate-limit');

// Obtiene la IP real del cliente considerando los encabezados del proxy.
const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.socket.remoteAddress || '127.0.0.1';
};

exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  keyGenerator: (req) => getClientIp(req) + '_ip',
  message: { status: 'error', message: 'Too many requests from this IP' }
});

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: (req) => getClientIp(req) + '_ip',
  message: { status: 'error', message: 'Too many login attempts' }
});

exports.bulkLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user ? req.user._id.toString() : getClientIp(req) + '_ip',
  message: { status: 'error', message: 'Too many bulk messages allowed per 5 minutes' }
});

exports.internalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  keyGenerator: (req) => getClientIp(req) + '_ip',
  message: { status: 'error', message: 'Too many internal requests' }
});
