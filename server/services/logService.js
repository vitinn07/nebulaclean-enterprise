const fs = require('fs').promises;
const path = require('path');
const { logsDir } = require('../utils/pathConfig');

const CLEANING_DIR = 'cleaning';

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(d) {
  const date = d instanceof Date ? d : new Date(d);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatLogEntry(entry) {
  const lines = [
    `[HOST: ${entry.hostname || 'LOCAL'}]`,
    `[IP: ${entry.ip || '127.0.0.1'}]`,
    `[USER: ${entry.username || '-'}]`,
    `[DATA: ${formatDate(entry.timestamp)}]`,
    `[HORA: ${formatTime(entry.timestamp)}]`,
    `[STATUS: ${(entry.status || 'SUCESSO').toUpperCase()}]`,
    `[DETALHES: ${entry.details || '-'}]`,
    ''
  ];
  return lines.join('\n');
}

async function ensureLogsDir() {
  const dir = path.join(logsDir, CLEANING_DIR);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function appendLog(entry) {
  const dir = await ensureLogsDir();
  const now = new Date();
  const hostPart = (entry.hostname || 'LOCAL').replace(/[^a-zA-Z0-9_-]/g, '_');
  const file = path.join(dir, `${hostPart}.log`);
  const line = formatLogEntry({
    hostname: entry.hostname,
    ip: entry.ip,
    username: entry.username,
    timestamp: entry.timestamp || now,
    status: entry.status,
    details: entry.details
  });
  await fs.appendFile(file, line, 'utf8');
  return { file, hostname: entry.hostname };
}

async function listLogFiles(options = {}) {
  const dir = path.join(logsDir, CLEANING_DIR);
  const isAdmin = options.admin === true;
  const username = options.username;
  try {
    const files = await fs.readdir(dir);
    const logFiles = files.filter((f) => f.endsWith('.log'));
    const result = [];
    for (const f of logFiles) {
      const filePath = path.join(dir, f);
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8').catch(() => '');
      const userMatch = content.match(/\[USER: ([^\]]+)\]/);
      const userFromLog = userMatch ? userMatch[1].trim() : null;
      if (isAdmin) {
        result.push({
          file: f,
          hostname: f.replace(/\.log$/, ''),
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          username: userFromLog
        });
      } else if (username && userFromLog === username) {
        result.push({
          file: f,
          hostname: f.replace(/\.log$/, ''),
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          username: userFromLog
        });
      }
    }
    result.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    return result;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function getLogContent(fileName, options = {}) {
  const dir = path.join(logsDir, CLEANING_DIR);
  const base = path.basename(fileName);
  if (!base || base.includes('..') || base.includes('/') || base.includes('\\')) {
    const err = new Error('Arquivo inválido.');
    err.status = 400;
    throw err;
  }
  const filePath = path.join(dir, base);
  const content = await fs.readFile(filePath, 'utf8').catch((e) => {
    if (e.code === 'ENOENT') return null;
    throw e;
  });
  if (content == null) return null;
  if (!options.admin) {
    const userMatch = content.match(/\[USER: ([^\]]+)\]/);
    const userFromLog = userMatch ? userMatch[1].trim() : null;
    if (userFromLog !== options.username) return null;
  }
  return content;
}

module.exports = {
  appendLog,
  listLogFiles,
  getLogContent,
  formatLogEntry,
  formatDate,
  formatTime
};
