'use strict';
/**
 * 轻量级持久化层（零原生依赖）
 * - 启动：从 seed 初始化内存数据；若 data/ 下已有快照则优先加载快照（保证重启不丢数据）
 * - 写入：所有写操作走 save()/update()，自动防抖落盘到 data/<collection>.json
 * - 集合：dashboard 系各业务快照 + users + tasks + goals + alerts（可写）
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

/** @type {Record<string, any>} 内存集合 */
const collections = {};
const writeTimers = {};

function collectionFile(name) {
  return path.join(SNAPSHOT_DIR, name + '.json');
}

function loadSnapshot(name) {
  const f = collectionFile(name);
  if (fs.existsSync(f)) {
    try {
      return JSON.parse(fs.readFileSync(f, 'utf-8'));
    } catch (e) {
      console.warn('[store] 快照读取失败，将用种子数据重建:', name, e.message);
    }
  }
  return null;
}

function flush(name) {
  const f = collectionFile(name);
  fs.writeFileSync(f, JSON.stringify(collections[name], null, 2), 'utf-8');
}

/**
 * 注册集合：若已有快照则加载快照，否则用种子并立即落盘
 * @param {string} name 集合名
 * @param {() => any} seedFactory 种子工厂（无快照时调用）
 */
function register(name, seedFactory) {
  const snap = loadSnapshot(name);
  if (snap !== null) {
    collections[name] = snap;
  } else {
    collections[name] = seedFactory();
    flush(name);
  }
  return collections[name];
}

/** 取得集合（只读引用，修改后需调用 save） */
function get(name) {
  return collections[name];
}

/** 标记集合已变更并落盘（防抖 300ms） */
function save(name) {
  if (!collections[name]) return;
  clearTimeout(writeTimers[name]);
  writeTimers[name] = setTimeout(() => flush(name), 300);
}

/** 同步强制落盘（进程退出前调用） */
function persistAll() {
  Object.keys(collections).forEach((name) => {
    clearTimeout(writeTimers[name]);
    flush(name);
  });
}

/** 重置某集合到种子（管理后台用） */
function reset(name, seedFactory) {
  collections[name] = seedFactory();
  flush(name);
}

module.exports = { register, get, save, persistAll, reset, DATA_DIR };
