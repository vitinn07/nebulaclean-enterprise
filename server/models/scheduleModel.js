const { readJson, writeJson } = require('../utils/jsonDb');

const FILE = 'schedule.json';

const DEFAULT = {
  enabled: false,
  dayOfWeek: 1,
  time: '03:00'
};

async function get() {
  const data = await readJson(FILE, DEFAULT);
  return {
    enabled: !!data.enabled,
    dayOfWeek: typeof data.dayOfWeek === 'number' ? data.dayOfWeek : DEFAULT.dayOfWeek,
    time: data.time || DEFAULT.time
  };
}

async function save(data) {
  const normalized = {
    enabled: !!data.enabled,
    dayOfWeek: Math.min(6, Math.max(0, parseInt(data.dayOfWeek, 10) || 0)),
    time: /^\d{1,2}:\d{2}$/.test(data.time) ? data.time : DEFAULT.time
  };
  await writeJson(FILE, normalized);
  return normalized;
}

module.exports = {
  get,
  save
};
