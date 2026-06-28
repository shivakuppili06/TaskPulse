const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const TODOS_FILE = path.join(DATA_DIR, 'todos.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback = []) {
  ensureDir();
  if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  readTodos: () => {
    const todos = readJSON(TODOS_FILE, []);
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const kept = todos.filter(t => {
      if (!t.deletedAt) return true;
      const age = now - new Date(t.deletedAt).getTime();
      return age < THIRTY_DAYS_MS;
    });
    if (kept.length !== todos.length) {
      writeJSON(TODOS_FILE, kept);
    }
    return kept;
  },
  writeTodos: (d) => writeJSON(TODOS_FILE, d),
  readActivity: () => readJSON(ACTIVITY_FILE, []),
  writeActivity: (d) => writeJSON(ACTIVITY_FILE, d),
};
