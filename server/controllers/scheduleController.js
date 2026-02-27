const scheduleService = require('../services/scheduleService');

async function getSchedule(req, res, next) {
  try {
    const config = await scheduleService.getSchedule();
    return res.json(config);
  } catch (err) {
    return next(err);
  }
}

async function setSchedule(req, res, next) {
  try {
    const body = req.body || {};
    const config = await scheduleService.setSchedule({
      enabled: body.enabled,
      dayOfWeek: body.dayOfWeek,
      time: body.time
    });
    return res.json(config);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getSchedule,
  setSchedule
};
