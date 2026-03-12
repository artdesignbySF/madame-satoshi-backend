const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

function loadDb() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return {}; }
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function dbGet(key) { return loadDb()[key] ?? null; }
function dbSet(key, value) { const d = loadDb(); d[key] = value; saveDb(d); }
function dbDelete(key) { const d = loadDb(); delete d[key]; saveDb(d); }

function getUserBalance(userId) {
  return Math.max(0, parseInt(dbGet(`balance_${userId}`) || 0));
}

function updateUserBalance(userId, amount) {
  const next = Math.max(0, getUserBalance(userId) + Math.floor(amount));
  dbSet(`balance_${userId}`, next);
  return next;
}

function getJackpot() {
  return Math.max(0, parseInt(dbGet('currentJackpotPool_v1') || 0));
}

function updateJackpot(amount) {
  const next = Math.max(0, getJackpot() + Math.floor(amount));
  dbSet('currentJackpotPool_v1', next);
  return next;
}

function hasReceivedBonus(userId) {
  return dbGet(`bonus_given_${userId}`) === true;
}

function markBonusReceived(userId) {
  dbSet(`bonus_given_${userId}`, true);
}

module.exports = {
  loadDb, saveDb,
  dbGet, dbSet, dbDelete,
  getUserBalance, updateUserBalance,
  getJackpot, updateJackpot,
  hasReceivedBonus, markBonusReceived
};