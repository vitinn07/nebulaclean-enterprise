const { verifyToken } = require('../services/authService');

function extractToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) return null;
  const parts = String(header).split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return null;
}

function authRequired(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado para este perfil.' });
    }
    return next();
  };
}

module.exports = {
  authRequired,
  requireRole
};

