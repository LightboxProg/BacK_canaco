const env = require('../config/environment');
const { timingSafeEqual } = require('../utils/crypto');
const logger = require('../utils/logger');

exports.internalAuth = (req, res, next) => {
  const internalKey = req.header('X-Internal-Key');

  if (!internalKey || !timingSafeEqual(internalKey, env.INTERNAL_API_KEY)) {
    logger.warn('Unauthorized internal request attempted');
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  next();
};
