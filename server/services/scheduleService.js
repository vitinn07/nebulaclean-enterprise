const { spawn } = require('child_process');
const path = require('path');
const scheduleModel = require('../models/scheduleModel');
const { scriptsDir } = require('../utils/pathConfig');

const TASK_NAME = 'NebulaCleanEnterprise';
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function runSchtasks(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('schtasks', args, { windowsHide: true, shell: true });
    let stderr = '';
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => resolve({ code, stderr }));
  });
}

async function getSchedule() {
  return scheduleModel.get();
}

async function setSchedule(data) {
  const config = await scheduleModel.save(data);

  await runSchtasks(['/Delete', '/TN', TASK_NAME, '/F']).catch(() => {});

  if (!config.enabled) {
    return config;
  }

  const day = DAYS[config.dayOfWeek] || 'MON';
  const time = config.time || '03:00';
  const batPath = path.join(scriptsDir, 'run-scheduled-clean.bat');
  const tr = `"${batPath}"`;

  const { code, stderr } = await runSchtasks([
    '/Create',
    '/SC', 'WEEKLY',
    '/D', day,
    '/TN', TASK_NAME,
    '/TR', tr,
    '/ST', time,
    '/F'
  ]);

  if (code !== 0) {
    const err = new Error('Falha ao criar tarefa agendada. Execute como administrador.');
    err.status = 500;
    err.details = stderr;
    throw err;
  }

  return config;
}

module.exports = {
  getSchedule,
  setSchedule
};
