const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const cleanRoutes = require('./routes/cleanRoutes');
const logRoutes = require('./routes/logRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { ensureAdminUser } = require('./services/userService');

const app = express();

// Middlewares básicos
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Caminho do front-end
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// Prefixo de API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clean', cleanRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/schedule', scheduleRoutes);

// Fallback para SPA / páginas públicas (login, etc.)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientPath, 'pages', 'index.html'));
});

// Middlewares de erro
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

ensureAdminUser().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[NebulaClean] Falha ao garantir usuário ADMIN inicial:', err);
});

function startServer(port) {
  const server = app.listen(port, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`NebulaClean Node server rodando em http://${HOST}:${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < 3010) {
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}

startServer(PORT);

module.exports = app;

