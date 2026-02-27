const express = require('express');
const { authRequired } = require('../middlewares/authMiddleware');
const { getSchedule, setSchedule } = require('../controllers/scheduleController');

const router = express.Router();

router.get('/', authRequired, getSchedule);
router.post('/', authRequired, setSchedule);

module.exports = router;
