const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';

function runPowerShell(scriptPath, args = [], options = {}) {
  const ps = isWindows ? 'powershell' : 'pwsh';
  const fullArgs = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    ...args
  ];
  return run(ps, fullArgs, options);
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const cwd = options.cwd || path.dirname(require.main.filename);
    const proc = spawn(cmd, args, {
      cwd: options.cwd || undefined,
      shell: options.shell !== false && isWindows,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => reject(err));
    proc.on('close', (code, signal) => {
      resolve({
        code: code ?? (signal ? -1 : 0),
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

module.exports = {
  run,
  runPowerShell,
  isWindows
};
