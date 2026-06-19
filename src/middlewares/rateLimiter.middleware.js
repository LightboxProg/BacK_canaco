const rateLimit = require('express-rate-limit');

exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Too many requests from this IP' }
});

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'error', message: 'Too many login attempts' }
});

exports.bulkLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50, // Increased to 10 requests per 5 minutes for testing
  keyGenerator: (req) => req.user ? req.user._id.toString() : 'anonymous',
  message: { status: 'error', message: 'Too many bulk messages allowed per 5 minutes' }
});

exports.internalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500, // 500 req/min for n8n
  message: { status: 'error', message: 'Too many internal requests' }
});
