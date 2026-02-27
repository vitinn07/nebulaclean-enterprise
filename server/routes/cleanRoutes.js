const express = require('express');
const { authRequired, requireRole } = require('../middlewares/authMiddleware');
const { ADMIN_ROLE } = require('../services/userService');
const {
  localClean,
  memoryClean,
  networkDiscover,
  networkRun
} = require('../controllers/cleanController');

const router = express.Router();

router.post('/local', authRequired, localClean);
router.post('/memory', authRequired, memoryClean);

router.get('/network/discover', authRequired, requireRole(ADMIN_ROLE), networkDiscover);
router.post('/network/run', authRequired, requireRole(ADMIN_ROLE), networkRun);

module.exports = router;
