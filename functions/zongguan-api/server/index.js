'use strict';
/**
 * 综管AI线上管理平台 V3 — 服务端入口（迭代版）
 * - 全部业务快照来自持久化层（首次用 seed 初始化，之后读 data/snapshots/*）
 * - 所有 /api/* 受 requireAuth 保护；敏感列表按角色脱敏
 * - 数据范围：用户带 center，明细按 center 隔离（总部 center='*' 看全部）
 * - 历史快照：看板顶部时间选择器按 asOf 读取 data/history/<date>/ 快照
 * - 导入导出 / 预警中心 / 人事模块（RS-001~006）均已接入
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./store/db');
const seed = require('./store/seed');
const { requireAuth, requirePerm, desensitizeList } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const aiRouter = require('./routes/ai');
const opsRouter = require('./routes/ops');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_CLOUDBASE = !!process.env.CLOUDBASE_ENV_ID || !!process.env.TENCENTCLOUD_RUNENV;
// 云函数（HTTP 函数）模式下由平台调用 app(req,res)，不应自行 listen
const IS_SCF = !!process.env.TCB_HTTP_FN || process.env.DEPLOY_MODE === 'scf' || !!process.env.SCF_RUNTIME;

app.use(cors());
app.use(express.json());
// 静态资源不鉴权（登录页/JS/CSS/图标）
// 开发迭代阶段：全部 no-cache，避免 JS/CSS 改了浏览器不刷新（immutable 坑）
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// ---------- 初始化持久化集合 ----------
const business = seed.buildBusinessSeed();
for (const key of Object.keys(business)) {
  db.register(key, () => JSON.parse(JSON.stringify(business[key])));
}
db.register('users', seed.buildUsers);
db.register('tasks', seed.buildTasks);
db.register('goals', seed.buildGoals);
db.register('alerts', () => seed.computeAlerts(business));

const D = (name) => db.get(name);

// ---------- helper: 历史快照读取 ----------
function bizData(name, req) {
  const asOf = req && req.query && req.query.asOf;
  if (asOf) { const h = db.getHistory(name, asOf); if (h) return h; }
  return D(name);
}

// ---------- helper: center 数据范围过滤（递归） ----------
function scopeData(o, user) {
  const c = user && user.center;
  if (c === '*' || !c) return o;
  return deepScope(o, c);
}
function deepScope(o, center) {
  if (Array.isArray(o)) {
    return o.filter(x => !(x && typeof x === 'object' && 'center' in x) || x.center === center)
            .map(x => deepScope(x, center));
  }
  if (o && typeof o === 'object') {
    const r = {};
    for (const k in o) r[k] = deepScope(o[k], center);
    return r;
  }
  return o;
}

// ---------- helper: 脱敏 ----------
function applyDesensitize(d, cfg, req) {
  if (cfg.field && d && Array.isArray(d[cfg.field])) {
    d[cfg.field] = desensitizeList(d[cfg.field], cfg.fields, req);
  } else if (Array.isArray(d)) {
    return desensitizeList(d, cfg.fields, req);
  }
  return d;
}

// ---------- helper: 业务路由工厂（权限 + 数据范围 + asOf） ----------
function biz(name, opts = {}) {
  const mws = [];
  if (opts.perm) mws.push(requirePerm(opts.perm[0], opts.perm[1]));
  mws.push((req, res) => {
    let d = bizData(name, req);
    if (opts.transform) d = opts.transform(d, req);
    if (opts.desensitize) d = applyDesensitize(d, opts.desensitize, req);
    res.json(scopeData(d, req.user));
  });
  return mws;
}

// 写权限：除普通员工 staff 外均可写
function requireWriter(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  if (req.user.role === 'staff') return res.status(403).json({ error: '无写入权限' });
  next();
}

// ---------- 鉴权路由 ----------
// 注意：requireAuth 必须挂载在业务/子路由之前，否则 /api/auth/me 等依赖 req.user 的路由拿不到用户信息。
// /api/auth/login 已在 publicPaths 白名单内，requireAuth 会自动放行。
app.use('/api', requireAuth);
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', opsRouter);

// ========== 业务只读路由（与 V2 契约一致 + 迭代增强） ==========
// 驾驶舱
app.get('/api/dashboard', ...biz('dashboard'));
app.get('/api/recruit/funnel', ...biz('recruitFunnel'));
app.get('/api/recruit/dashboard', (req, res) => res.json(scopeData(bizData('dashboard', req).recruit, req.user)));

// 培训
app.get('/api/train/talent-pool', ...biz('talentPool', { perm: ['train', 'view'], desensitize: { field: 'detail', fields: ['name'] } }));
app.get('/api/train/new-train', ...biz('newTrain'));
app.get('/api/train/knowledge', ...biz('knowledgeBase'));
app.get('/api/train/knowledge/course/:id', (req, res) => {
  const kb = bizData('knowledgeBase', req);
  const c = (kb.courses || []).find(x => String(x.id) === String(req.params.id));
  res.json(scopeData(c || {}, req.user));
});
app.get('/api/train/question-bank', ...biz('questionBank'));
app.get('/api/train/instructor', ...biz('instructor'));
app.get('/api/train/course', (req, res) => res.json(scopeData((bizData('knowledgeBase', req).courses) || [], req.user)));
app.get('/api/train/cadre-loss', ...biz('cadreLoss'));
app.get('/api/train/est-library', ...biz('estLibrary'));
app.get('/api/train/material', ...biz('material'));

// 人事（RS-001~006）
app.get('/api/hr/core-kpi', (req, res) => {
  const b = bizData('dashboard', req);
  const goals = D('goals') || [];
  const kpi = {
    establishment: b.hr.headcount,
    recruit: b.recruit,
    turnover: b.hr.headcount ? { rate: (b.hr.headcount.rate || 0) } : {},
    loss: bizData('turnover', req).overview,
    train: { newTrain: b.train.newTrain, knowledge: b.train.knowledge },
    admin: b.admin,
    goals
  };
  res.json(scopeData(kpi, req.user));
});
app.get('/api/hr/headcount', ...biz('headcount', { perm: ['hr', 'view'], desensitize: { field: 'detail', fields: ['name'] } }));
app.get('/api/hr/processes', ...biz('hrProcesses'));
app.get('/api/hr/contracts', ...biz('contracts', { perm: ['hr', 'view'], desensitize: { field: null, fields: ['name', 'phone', 'email'] } }));
app.get('/api/hr/turnover', ...biz('turnover'));
app.get('/api/hr/establishment', ...biz('establishment'));
app.get('/api/hr/probation', ...biz('probation', { desensitize: { field: 'list', fields: ['name'] } }));
app.get('/api/hr/weekly-report', ...biz('weeklyReport'));
app.get('/api/hr/labor', ...biz('labor', { perm: ['hr', 'view'], desensitize: { field: 'list', fields: ['name', 'phone', 'employee'] } }));
app.get('/api/hr/policy-knowledge', ...biz('hrPolicyKnowledge'));

// 行政
app.get('/api/admin/supplies', ...biz('supplies'));
app.get('/api/admin/assets', ...biz('assets'));
app.get('/api/admin/budget', ...biz('adminBudget'));
app.get('/api/admin/workplace', ...biz('workplace', { perm: ['admin', 'view'], desensitize: { field: 'details', fields: ['address'] } }));
app.get('/api/admin/gift', ...biz('gift'));
app.get('/api/admin/print', ...biz('print'));
app.get('/api/admin/regulation', ...biz('regulation'));
app.get('/api/admin/tasklist', ...biz('adminTasklist'));
app.get('/api/admin/goal', ...biz('adminGoal'));
app.get('/api/admin/kpi', ...biz('adminKpi'));
app.get('/api/admin/manual-knowledge', ...biz('adminManualKnowledge'));

// 公关
app.get('/api/pr/opinion', ...biz('publicOpinion'));
app.get('/api/pr/crisis', ...biz('crisis'));
app.get('/api/pr/media', ...biz('media', { perm: ['pr', 'view'], desensitize: { field: 'list', fields: ['contact', 'phone', 'email', 'wechat'] } }));

// 招聘（补充 V2 已有的 backoffice / rpo）
app.get('/api/recruit/backoffice', ...biz('recruitBackoffice'));
app.get('/api/recruit/rpo', ...biz('recruitRpo'));

// 系统
app.get('/api/system/permission', ...biz('permission', { perm: ['system', 'view'] }));
app.get('/api/system/integration', ...biz('integration'));

// ========== 迭代新增：历史 / 导入导出 / 预警 ==========
const WRITABLE = Object.keys(business).concat(['tasks', 'goals']);

// 历史日期列表
app.get('/api/history/dates', (req, res) => res.json(db.listHistoryDates()));

// 导入（写集合 + 生成当天快照）
app.post('/api/admin/import', requireWriter, (req, res) => {
  const { collection, data, date } = req.body || {};
  if (!WRITABLE.includes(collection)) return res.status(400).json({ error: '不允许导入该集合：' + collection });
  if (data == null) return res.status(400).json({ error: '数据为空' });
  db.reset(collection, () => data);
  if (collection in business) business[collection] = data;
  const d = date || new Date().toISOString().slice(0, 10);
  db.saveHistory(collection, d, data);
  refreshAlerts();
  res.json({ ok: true, collection, date: d, count: Array.isArray(data) ? data.length : Object.keys(data || {}).length });
});

// 导出（JSON / CSV，按数据范围过滤）
app.get('/api/admin/export', requireWriter, (req, res) => {
  const { collection, format = 'json', asOf } = req.query;
  if (!WRITABLE.includes(collection)) return res.status(400).json({ error: '不允许导出该集合：' + collection });
  let data = scopeData(bizData(collection, { query: { asOf } }), req.user);
  if (format === 'csv') {
    const csv = toCSV(data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${collection}.csv"`);
    return res.send('﻿' + csv);
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${collection}.json"`);
  res.send(JSON.stringify(data, null, 2));
});

// 预警列表（预警中心）
app.get('/api/admin/alerts', requireWriter, (req, res) => {
  res.json(scopeData(D('alerts') || [], req.user));
});

// 健康检查
app.get(['/health', '/api/health'], (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------- CSV 转换 ----------
function toCSV(data) {
  let rows = null;
  if (Array.isArray(data)) rows = data;
  else if (data && Array.isArray(data.list)) rows = data.list;
  else if (data && Array.isArray(data.detail)) rows = data.detail;
  else if (data && Array.isArray(data.records)) rows = data.records;
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = (v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)));
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [headers.join(',')].concat(rows.map(r => headers.map(h => esc(r[h])).join(','))).join('\n');
}

// ---------- 历史快照演示数据（首次启动生成） ----------
function scaleBusiness(bizDataSrc, factor) {
  function walk(o) {
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === 'object') {
      const r = {};
      for (const k in o) {
        const v = o[k];
        r[k] = (typeof v === 'number') ? Math.round(v * factor * 10) / 10 : walk(v);
      }
      return r;
    }
    return o;
  }
  return walk(JSON.parse(JSON.stringify(bizDataSrc)));
}
(function initHistory() {
  const hd = db.listHistoryDates();
  if (hd.length === 0) {
    const demo = [['2026-06-30', 0.92], ['2026-07-07', 0.96], ['2026-07-15', 0.98]];
    for (const [d, f] of demo) {
      const snap = scaleBusiness(business, f);
      for (const k of Object.keys(snap)) db.saveHistory(k, d, snap[k]);
    }
    console.log('[history] 已生成演示历史快照:', demo.map(x => x[0]).join(', '));
  } else {
    console.log('[history] 已有历史快照:', hd.join(', '));
  }
})();

// ---------- 预警引擎 ----------
function refreshAlerts() {
  try { db.reset('alerts', () => seed.computeAlerts(business)); }
  catch (e) { console.warn('[alerts] 刷新失败:', e.message); }
}
refreshAlerts();
setInterval(refreshAlerts, 60 * 1000);

// SPA 兜底
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// 进程退出前落盘
process.on('SIGINT', () => { db.persistAll(); process.exit(0); });
process.on('SIGTERM', () => { db.persistAll(); process.exit(0); });

if (!IS_SCF) {
  app.listen(PORT, () => {
    console.log(`综管AI线上管理平台 V3(迭代版) 已启动: http://localhost:${PORT}`);
  });
}

module.exports = app;
