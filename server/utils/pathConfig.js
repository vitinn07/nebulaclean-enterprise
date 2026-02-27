const path = require('path');

const serverDir = path.join(__dirname, '..');
const projectRoot = path.join(serverDir, '..');
const logsDir = path.join(projectRoot, 'logs');
const scriptsDir = path.join(serverDir, 'scripts');
const engineDir = path.join(projectRoot, 'engine');
const configDir = path.join(projectRoot, 'config');

module.exports = {
  serverDir,
  projectRoot,
  logsDir,
  scriptsDir,
  engineDir,
  configDir
};
