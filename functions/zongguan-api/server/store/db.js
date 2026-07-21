'use strict';
/**
 * 轻量级持久化层（零原生依赖）
 * - 启动：从 seed 初始化内存数据；若 data/snapshots/ 下已有快照则优先加载（保证重启不丢数据）
 * - 写入：所有写操作走 save() 防抖落盘到 data/snapshots/<collection>.json（当前值）
 * - 历史：data/history/<YYYY-MM-DD>/<collection>.json（按日期留档，支持"查看某天数据"）
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

[DATA_DIR, SNAPSHOT_DIR, HISTORY_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

/** @type {Record<string, any>} 内存集合（当前值） */
const collections = {};
const writeTimers = {};

function snapshotFile(name) { return path.join(SNAPSHOT_DIR, name + '.json'); }
function historyFile(name, date) { return path.join(HISTORY_DIR, date, name + '.json'); }

function loadSnapshot(name) {
  const f = snapshotFile(name);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); }
    catch (e) { console.warn('[store] 快照读取失败，将用种子重建:', name, e.message); }
  }
  return null;
}

function flush(name) {
  const f = snapshotFile(name);
  fs.writeFileSync(f, JSON.stringify(collections[name], null, 2), 'utf-8');
}

/** 注册集合：若已有当前快照则加载，否则用种子并立即落盘 */
function register(name, seedFactory) {
  const snap = loadSnapshot(name);
  if (snap !== null) collections[name] = snap;
  else { collections[name] = seedFactory(); flush(name); }
  return collections[name];
}

function get(name) { return collections[name]; }

/** 标记集合已变更并落盘（防抖 300ms） */
function save(name) {
  if (!collections[name]) return;
  clearTimeout(writeTimers[name]);
  writeTimers[name] = setTimeout(() => flush(name), 300);
}

function persistAll() {
  Object.keys(collections).forEach((name) => { clearTimeout(writeTimers[name]); flush(name); });
}

function reset(name, seedFactory) {
  collections[name] = seedFactory();
  flush(name);
}

// ---------- 历史快照 ----------
function listHistoryDates() {
  if (!fs.existsSync(HISTORY_DIR)) return [];
  return fs.readdirSync(HISTORY_DIR)
    .filter(d => fs.statSync(path.join(HISTORY_DIR, d)).isDirectory())
    .sort();
}

function getHistory(name, date) {
  const f = historyFile(name, date);
  if (fs.existsSync(f)) {
    try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch (e) { return null; }
  }
  return null;
}

function saveHistory(name, date, data) {
  const dir = path.join(HISTORY_DIR, date);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(historyFile(name, date), JSON.stringify(data, null, 2), 'utf-8');
}

/** 把当前所有集合快照到指定日期 */
function snapshotAll(date) {
  Object.keys(collections).forEach((n) => saveHistory(n, date, collections[n]));
}

/** 删除某个历史日期目录 */
function deleteHistory(date) {
  const dir = path.join(HISTORY_DIR, date);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { register, get, save, persistAll, reset, snapshotAll, listHistoryDates, getHistory, saveHistory, deleteHistory, DATA_DIR };
