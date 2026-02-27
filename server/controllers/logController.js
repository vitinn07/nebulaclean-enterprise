const logService = require('../services/logService');

async function listMyLogs(req, res, next) {
  try {
    const files = await logService.listLogFiles({ username: req.user.username });
    return res.json({ files });
  } catch (err) {
    return next(err);
  }
}

async function listAllLogs(req, res, next) {
  try {
    const files = await logService.listLogFiles({ admin: true });
    return res.json({ files });
  } catch (err) {
    return next(err);
  }
}

async function getLogContent(req, res, next) {
  try {
    const file = req.params.file || '';
    const isAdmin = req.user.role === 'ADMIN';
    const content = await logService.getLogContent(file, {
      admin: isAdmin,
      username: req.user.username
    });
    if (content == null) {
      return res.status(404).json({ error: 'Log não encontrado ou acesso negado.' });
    }
    return res.type('text/plain').send(content);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMyLogs,
  listAllLogs,
  getLogContent
};
