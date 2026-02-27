const express = require('express');
const { loginHandler, registerHandler } = require('../controllers/authController');
const { authRequired, requireRole } = require('../middlewares/authMiddleware');
const { ADMIN_ROLE } = require('../services/userService');

const router = express.Router();

// Login público (gera JWT)
router.post('/login', loginHandler);

// Registro de usuário – apenas ADMIN pode criar
router.post('/register', authRequired, requireRole(ADMIN_ROLE), registerHandler);

module.exports = router;

