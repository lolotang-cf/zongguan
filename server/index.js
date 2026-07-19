'use strict';
/**
 * 综管AI线上管理平台 V3 — 服务端入口
 * - 全部业务快照来自持久化层（首次用 seed 初始化，之后读 data/snapshots/*）
 * - 所有 /api/* 受 requireAuth 保护；敏感列表按角色脱敏
 * - 保留 V2 的全部 42 个 GET 路由契约（前端 app.js 无需改动取数逻辑）
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./store/db');
const seed = require('./store/seed');
const { requireAuth, requirePerm, desensitizeList } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const aiRouter = require('./routes/ai');
const opsRouter = require('./routes/ops');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_CLOUDBASE = !!process.env.CLOUDBASE_ENV_ID || !!process.env.TENCENTCLOUD_RUNENV;

app.use(cors());
app.use(express.json());
// 静态资源不鉴权（登录页/JS/CSS/图标）
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- 初始化持久化集合 ----------
const business = seed.buildBusinessSeed();
// 业务快照集合：把 business 的每个顶层键注册为一个集合
for (const key of Object.keys(business)) {
  db.register(key, () => JSON.parse(JSON.stringify(business[key])));
}
// 独立集合
db.register('users', seed.buildUsers);
db.register('tasks', seed.buildTasks);
db.register('goals', seed.buildGoals);
db.register('alerts', seed.buildAlerts);
// aiKnowledge 已随 business 注册；AI 路由内部读取 db.get('aiKnowledge')

// 便捷取数
const D = (name) => db.get(name);
const SENSITIVE = ['name', 'phone', 'mobile', 'contact', 'email', 'idCard', 'salary', 'wage'];

// ---------- 鉴权路由 ----------
app.use('/api/auth', authRouter);

// ---------- 全局鉴权：除登录/健康检查外全部拦截 ----------
app.use('/api', requireAuth);

// ---------- AI ----------
app.use('/api/ai', aiRouter);

// ---------- 可写业务（挂载在 /api/admin 下，与前端契约一致） ----------
app.use('/api/admin', opsRouter);

// ========== 业务只读路由（与 V2 契约一致） ==========
// 驾驶舱
app.get('/api/dashboard', (req, res) => res.json(D('dashboard')));
app.get('/api/recruit/funnel', (req, res) => res.json(D('recruitFunnel')));
app.get('/api/recruit/dashboard', (req, res) => res.json(D('dashboard').recruit));

// 培训
app.get('/api/train/talent-pool', requirePerm('train', 'view'), (req, res) => {
  const d = JSON.parse(JSON.stringify(D('talentPool')));
  d.detail = desensitizeList(d.detail || [], ['name'], req);
  res.json(d);
});
app.get('/api/train/new-train', (req, res) => res.json(D('newTrain')));
app.get('/api/train/knowledge', (req, res) => res.json(D('knowledgeBase')));
app.get('/api/train/knowledge/course/:id', (req, res) => {
  const kb = D('knowledgeBase');
  const course = (kb.courses || []).find((c) => String(c.id) === String(req.params.id));
  res.json(course || {});
});
app.get('/api/train/question-bank', (req, res) => res.json(D('questionBank')));
app.get('/api/train/instructor', (req, res) => res.json(D('instructor') || { list: [] }));
app.get('/api/train/course', (req, res) => res.json((D('knowledgeBase') || {}).courses || []));
app.get('/api/train/cadre-loss', (req, res) => res.json(D('cadreLoss') || { list: [] }));
app.get('/api/train/est-library', (req, res) => res.json(D('estLibrary') || { list: [] }));
app.get('/api/train/material', (req, res) => res.json(D('material') || { list: [] }));

// 人事
app.get('/api/hr/headcount', requirePerm('hr', 'view'), (req, res) => {
  const d = JSON.parse(JSON.stringify(D('headcount')));
  d.detail = desensitizeList(d.detail || [], ['name'], req);
  res.json(d);
});
app.get('/api/hr/processes', (req, res) => res.json(D('hrProcesses')));
app.get('/api/hr/contracts', requirePerm('hr', 'view'), (req, res) => {
  const d = JSON.parse(JSON.stringify(D('contracts')));
  d.list = desensitizeList(d.list || [], ['name', 'phone', 'email'], req);
  res.json(d);
});
app.get('/api/hr/turnover', (req, res) => res.json(D('turnover') || {
  overview: { totalHeadcount: 892, ytdTurnover: 156, ytdRate: 14.9, monthRate: 2.1 },
  monthly: [], byCenter: [], recent: []
}));
app.get('/api/hr/establishment', (req, res) => res.json(D('establishment') || {}));
app.get('/api/hr/probation', (req, res) => res.json(D('probation') || { list: [] }));
app.get('/api/hr/weekly-report', (req, res) => res.json(D('weeklyReport') || {}));
app.get('/api/hr/labor', requirePerm('hr', 'view'), (req, res) => {
  const d = JSON.parse(JSON.stringify(D('labor') || { list: [] }));
  d.list = desensitizeList(d.list || [], ['name', 'phone', 'employee'], req);
  res.json(d);
});
app.get('/api/hr/policy-knowledge', (req, res) => res.json(D('hrPolicyKnowledge') || { list: [] }));

// 行政
app.get('/api/admin/supplies', (req, res) => res.json({ items: D('supplies'), usage: D('suppliesUsage') }));
app.get('/api/admin/assets', (req, res) => res.json(D('assets')));
app.get('/api/admin/budget', (req, res) => res.json(D('adminBudget')));
app.get('/api/admin/workplace', requirePerm('admin', 'view'), (req, res) => {
  const d = JSON.parse(JSON.stringify(D('workplace') || { details: [] }));
  d.details = desensitizeList(d.details || [], ['address'], req);
  res.json(d);
});
app.get('/api/admin/gift', (req, res) => res.json(D('gift') || { items: [] }));
app.get('/api/admin/print', (req, res) => res.json(D('print') || { list: [] }));
app.get('/api/admin/regulation', (req, res) => res.json(D('regulation') || { list: [] }));
app.get('/api/admin/tasklist', (req, res) => res.json(db.get('tasks') || []));
app.get('/api/admin/goal', (req, res) => res.json(db.get('goals') || []));
app.get('/api/admin/kpi', (req, res) => res.json(D('adminKpi') || {}));
app.get('/api/admin/manual-knowledge', (req, res) => res.json(D('adminManualKnowledge') || { list: [] }));

// 公关
app.get('/api/pr/opinion', (req, res) => res.json(D('publicOpinion')));
app.get('/api/pr/crisis', (req, res) => res.json(D('crisis') || { list: [] }));
app.get('/api/pr/media', requirePerm('pr', 'view'), (req, res) => {
  const d = JSON.parse(JSON.stringify(D('media') || { list: [] }));
  d.list = desensitizeList(d.list || [], ['contact', 'phone', 'email', 'wechat'], req);
  res.json(d);
});

// 招聘（补充 V2 已有的 backoffice / rpo）
app.get('/api/recruit/backoffice', (req, res) => res.json(D('recruitBackoffice') || { list: [] }));
app.get('/api/recruit/rpo', (req, res) => res.json(D('recruitRpo') || { list: [] }));

// 系统（仅管理员可见权限配置）
app.get('/api/system/permission', requirePerm('system', 'view'), (req, res) => res.json(D('permission') || {}));
app.get('/api/system/integration', (req, res) => res.json(D('integration') || {}));

// 健康检查
app.get(['/health', '/api/health'], (req, res) => res.json({ ok: true, ts: Date.now() }));

// SPA 兜底
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// 进程退出前落盘
process.on('SIGINT', () => { db.persistAll(); process.exit(0); });
process.on('SIGTERM', () => { db.persistAll(); process.exit(0); });

if (!IS_CLOUDBASE) {
  app.listen(PORT, () => {
    console.log(`综管AI线上管理平台 V3 已启动: http://localhost:${PORT}`);
  });
} else {
  // CloudBase 托管由平台注入 PORT
  app.listen(PORT, () => console.log(`V3 listening on ${PORT}`));
}

module.exports = app;
