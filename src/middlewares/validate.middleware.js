exports.validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) req.body = schema.body.parse(req.body);
    if (schema.query) req.query = schema.query.parse(req.query);
    if (schema.params) req.params = schema.params.parse(req.params);
    next();
  } catch (error) {
    return res.status(400).json({ status: 'error', message: 'Validation failed', errors: error.errors });
  }
};
