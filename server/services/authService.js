const jwt = require('jsonwebtoken');
const { validateCredentials } = require('./userService');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_SECRET_NEBULACLEAN';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function generateToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN
  });
}

async function login(username, password) {
  const user = await validateCredentials(username, password);
  if (!user) {
    const err = new Error('Credenciais inválidas.');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    err.publicMessage = 'Usuário ou senha inválidos.';
    throw err;
  }

  const token = generateToken(user);
  return { user, token };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  login,
  verifyToken
};

