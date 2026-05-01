const crypto = require('crypto');

exports.timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};
