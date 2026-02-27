function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint não encontrado.' });
  }
  return next();
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    error: err.publicMessage || 'Erro interno no servidor.',
    code: err.code || undefined
  };

  if (process.env.NODE_ENV === 'development') {
    payload.details = err.message;
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler
};

