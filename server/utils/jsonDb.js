const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readJson(fileName, defaultValue) {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return defaultValue;
    }
    throw err;
  }
}

async function writeJson(fileName, data) {
  await ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  const tmpPath = `${filePath}.tmp`;
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(tmpPath, json, 'utf8');
  await fs.rename(tmpPath, filePath);
}

module.exports = {
  readJson,
  writeJson
};

