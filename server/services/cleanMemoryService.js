const path = require('path');
const os = require('os');
const { runPowerShell } = require('../utils/runScript');
const { scriptsDir } = require('../utils/pathConfig');
const logService = require('./logService');

const scriptPath = path.join(scriptsDir, 'MemoryClean.ps1');

async function runMemoryCleanup(options = {}, user = {}) {
  const runGC = options.runGC !== false ? 1 : 0;
  const restartExplorer = options.restartExplorer ? 1 : 0;
  const flushDns = options.flushDns !== false ? 1 : 0;
  const emptyStandbyListPath = options.emptyStandbyListPath || '';

  const args = [runGC, restartExplorer, flushDns, `"${emptyStandbyListPath}"`];

  const { code, stdout, stderr } = await runPowerShell(scriptPath, args, {
    cwd: path.dirname(scriptPath)
  });

  const hostname = os.hostname();
  const details = [stdout, stderr].filter(Boolean).join('\n').slice(0, 2000);
  const status = code === 0 ? 'SUCESSO' : 'ERRO';

  await logService.appendLog({
    hostname,
    ip: '127.0.0.1',
    username: user.username || '-',
    timestamp: new Date(),
    status,
    details: details || 'Limpeza de memoria executada.'
  });

  return {
    success: code === 0,
    code,
    stdout,
    stderr,
    hostname,
    status
  };
}

module.exports = {
  runMemoryCleanup
};
