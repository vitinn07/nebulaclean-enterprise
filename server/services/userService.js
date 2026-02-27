const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const userModel = require('../models/userModel');

const ADMIN_ROLE = 'ADMIN';
const USER_ROLE = 'USER';

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

async function listUsers() {
  const users = await userModel.getAllUsers();
  return users.map(sanitizeUser);
}

async function getUserById(id) {
  const user = await userModel.findById(id);
  return sanitizeUser(user);
}

async function createUser({ username, password, role }) {
  const existing = await userModel.findByUsername(username);
  if (existing) {
    const err = new Error('Usuário já existe.');
    err.status = 409;
    err.code = 'USER_EXISTS';
    err.publicMessage = 'Já existe um usuário com esse login.';
    throw err;
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const user = {
    id,
    username,
    passwordHash,
    role: role === ADMIN_ROLE ? ADMIN_ROLE : USER_ROLE,
    active: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };

  await userModel.createUser(user);
  return sanitizeUser(user);
}

async function validateCredentials(username, password) {
  const user = await userModel.findByUsername(username);
  if (!user || !user.active) {
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  user.lastLoginAt = new Date().toISOString();
  const all = await userModel.getAllUsers();
  const idx = all.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    all[idx] = user;
    await userModel.saveAllUsers(all);
  }

  return sanitizeUser(user);
}

async function removeUser(id) {
  const deleted = await userModel.deleteUser(id);
  return deleted;
}

async function ensureAdminUser() {
  const users = await userModel.getAllUsers();
  if (users.some((u) => u.role === ADMIN_ROLE)) {
    return;
  }

  const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
  const defaultPassword = process.env.ADMIN_PASSWORD || 'ChangeMe!123';

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const now = new Date().toISOString();

  const adminUser = {
    id,
    username: defaultUsername,
    passwordHash,
    role: ADMIN_ROLE,
    active: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };

  users.push(adminUser);
  await userModel.saveAllUsers(users);

  // eslint-disable-next-line no-console
  console.log(
    `[NebulaClean] Usuário ADMIN inicial criado: "${defaultUsername}". ` +
      'Altere a senha assim que possível.'
  );
}

module.exports = {
  ADMIN_ROLE,
  USER_ROLE,
  sanitizeUser,
  listUsers,
  getUserById,
  createUser,
  validateCredentials,
  removeUser,
  ensureAdminUser
};

