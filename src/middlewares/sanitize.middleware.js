const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const sanitizeData = (data) => {
  if (typeof data === 'string') return purify.sanitize(data);
  if (Array.isArray(data)) return data.map(item => sanitizeData(item));
  if (typeof data === 'object' && data !== null) {
    const sanitizedObj = {};
    for (const key in data) {
      sanitizedObj[key] = sanitizeData(data[key]);
    }
    return sanitizedObj;
  }
  return data;
};

exports.sanitizeBody = (req, res, next) => {
  if (req.body) req.body = sanitizeData(req.body);
  
  if (req.query) {
    const sanitizedQuery = sanitizeData(req.query);
    for (const key in req.query) delete req.query[key];
    Object.assign(req.query, sanitizedQuery);
  }
  
  if (req.params) {
    const sanitizedParams = sanitizeData(req.params);
    for (const key in req.params) delete req.params[key];
    Object.assign(req.params, sanitizedParams);
  }
  
  next();
};
