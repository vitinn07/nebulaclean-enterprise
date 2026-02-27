const express = require('express');
const { authRequired, requireRole } = require('../middlewares/authMiddleware');
const {
  listUsersHandler,
  meHandler,
  deleteUserHandler,
  guardAtLeastOneAdmin
} = require('../controllers/userController');
const { ADMIN_ROLE } = require('../services/userService');

const router = express.Router();

// Dados do usuário logado
router.get('/me', authRequired, meHandler);

// Admin: listar todos os usuários
router.get('/', authRequired, requireRole(ADMIN_ROLE), listUsersHandler);

// Admin: remover usuário
router.delete(
  '/:id',
  authRequired,
  requireRole(ADMIN_ROLE),
  guardAtLeastOneAdmin,
  deleteUserHandler
);

module.exports = router;

