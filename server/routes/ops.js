'use strict';
/**
 * 可写业务路由：任务 / 目标 / 预警
 * 让原 V2 的「只读演示」变成「可协作工具」。所有写操作需要对应模块 edit 权限。
 */
const express = require('express');
const router = express.Router();
const db = require('../store/db');
const { requirePerm } = require('../middleware/auth');

// ---------- 任务 ----------
// 读取由 index.js 的 /api/admin/tasklist 提供；此处仅处理写操作
router.post('/tasks', requirePerm('admin', 'edit'), (req, res) => {
  const { title, module, owner, priority, due, status } = req.body || {};
  if (!title) return res.status(400).json({ error: '标题必填' });
  const tasks = db.get('tasks');
  const id = 'T-' + (1000 + tasks.length + Math.floor(Math.random() * 9000));
  const task = { id, title, module: module || 'admin', owner: owner || req.user.name,
    priority: priority || 'mid', due: due || '', status: status || 'todo', createdAt: Date.now() };
  tasks.unshift(task);
  db.save('tasks');
  res.json(task);
});

router.put('/tasks/:id', requirePerm('admin', 'edit'), (req, res) => {
  const tasks = db.get('tasks');
  const t = tasks.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: '任务不存在' });
  Object.assign(t, req.body);
  db.save('tasks');
  res.json(t);
});

router.delete('/tasks/:id', requirePerm('admin', 'edit'), (req, res) => {
  const tasks = db.get('tasks');
  const i = tasks.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: '任务不存在' });
  tasks.splice(i, 1);
  db.save('tasks');
  res.json({ ok: true });
});

// ---------- 目标 ----------
// 读取由 index.js 的 /api/admin/goal 提供
router.put('/goals/:id', requirePerm('admin', 'edit'), (req, res) => {
  const goals = db.get('goals');
  const g = goals.find((x) => x.id === req.params.id);
  if (!g) return res.status(404).json({ error: '目标不存在' });
  if (req.body.current != null) g.current = Number(req.body.current);
  db.save('goals');
  res.json(g);
});

// ---------- 预警 ----------
router.get('/alerts', (req, res) => res.json(db.get('alerts') || []));

router.put('/alerts/:id', requirePerm('admin', 'edit'), (req, res) => {
  const alerts = db.get('alerts');
  const a = alerts.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: '预警不存在' });
  if (req.body.status) a.status = req.body.status; // open/ack/closed
  db.save('alerts');
  res.json(a);
});

module.exports = router;
