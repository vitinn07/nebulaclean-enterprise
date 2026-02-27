const express = require('express');
const { authRequired, requireRole } = require('../middlewares/authMiddleware');
const { ADMIN_ROLE } = require('../services/userService');
const {
  listMyLogs,
  listAllLogs,
  getLogContent
} = require('../controllers/logController');

const router = express.Router();

router.get('/me', authRequired, listMyLogs);
router.get('/all', authRequired, requireRole(ADMIN_ROLE), listAllLogs);
router.get('/file/:file', authRequired, getLogContent);

module.exports = router;
