const { listUsers, getUserById, removeUser, sanitizeUser, ADMIN_ROLE } = require('../services/userService');

async function listUsersHandler(req, res, next) {
  try {
    const users = await listUsers();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
}

async function meHandler(req, res, next) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return next(err);
  }
}

async function deleteUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Não é permitido excluir o próprio usuário logado.' });
    }

    const ok = await removeUser(id);
    if (!ok) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function guardAtLeastOneAdmin(req, res, next) {
  try {
    if (req.user.role !== ADMIN_ROLE) {
      return next();
    }
    // Opcionalmente poderíamos garantir que ao excluir um usuário ADMIN
    // ainda reste pelo menos um outro ADMIN. Implementação futura se necessário.
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUsersHandler,
  meHandler,
  deleteUserHandler,
  guardAtLeastOneAdmin
};

