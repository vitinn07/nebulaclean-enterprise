const path = require('path');
const { runPowerShell } = require('../utils/runScript');
const { scriptsDir } = require('../utils/pathConfig');
const logService = require('./logService');

const discoverPath = path.join(scriptsDir, 'Discover-Network.ps1');
const remotePath = path.join(scriptsDir, 'Run-RemoteClean.ps1');
const localCleanPath = path.join(scriptsDir, 'Clean-Local.ps1');

async function discoverMachines() {
  const { code, stdout } = await runPowerShell(discoverPath, [], { cwd: path.dirname(discoverPath) });
  if (code !== 0) return [];
  try {
    const arr = JSON.parse(stdout || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function runRemoteClean(computers = [], user = {}) {
  const list = computers.filter((c) => c && String(c).trim());
  if (list.length === 0) {
    return { results: [], message: 'Nenhuma máquina selecionada.' };
  }

  const computerStr = list.join(',');
  const args = [computerStr, localCleanPath];

  const { code, stdout, stderr } = await runPowerShell(remotePath, args, {
    cwd: path.dirname(remotePath)
  });

  let results = [];
  try {
    results = JSON.parse(stdout || '[]');
    if (!Array.isArray(results)) results = [];
  } catch {
    results = [{ Computer: 'batch', Success: false, Error: stdout || stderr }];
  }

  const username = user.username || '-';
  for (const r of results) {
    const hostname = r.Computer || r.computer || '?';
    const ip = hostname;
    const status = r.Success !== false ? 'SUCESSO' : 'ERRO';
    const details = [r.Output, r.Error].filter(Boolean).join(' ').slice(0, 1500);

    await logService.appendLog({
      hostname,
      ip,
      username,
      timestamp: new Date(),
      status,
      details: details || (status === 'SUCESSO' ? 'Limpeza remota executada.' : 'Falha na execucao remota.')
    });
  }

  return {
    success: results.every((r) => r.Success !== false),
    results
  };
}

module.exports = {
  discoverMachines,
  runRemoteClean
};
