'use strict';
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../store/db');
const { signToken } = require('../middleware/auth');
const { ROLE_PERMISSIONS } = require('../store/seed');

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '请输入账号和密码' });
  const users = db.get('users') || [];
  const user = users.find((u) => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  const token = signToken(user);
  // 不返回密码哈希
  const { passwordHash, ...safe } = user;
  res.json({
    token,
    user: safe,
    permissions: ROLE_PERMISSIONS[user.role] || {},
    mustChangePwd: !!user.mustChangePwd
  });
});

router.post('/logout', (req, res) => {
  // 无状态 JWT：前端丢弃 token 即可；此处仅作约定端点
  res.json({ ok: true });
});

router.post('/change-pwd', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const { verifyToken } = require('../middleware/auth');
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: '未登录' });
  const { oldPwd, newPwd } = req.body || {};
  if (!oldPwd || !newPwd || newPwd.length < 6) return res.status(400).json({ error: '密码需至少 6 位' });
  const users = db.get('users') || [];
  const user = users.find((u) => u.id === payload.uid);
  if (!user || !bcrypt.compareSync(oldPwd, user.passwordHash)) return res.status(400).json({ error: '原密码错误' });
  user.passwordHash = bcrypt.hashSync(newPwd, 10);
  user.mustChangePwd = false;
  db.save('users');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  const users = db.get('users') || [];
  const user = users.find((u) => u.id === req.user.uid);
  const { passwordHash, ...safe } = user || {};
  res.json({ user: safe, permissions: ROLE_PERMISSIONS[req.user.role] || {} });
});

module.exports = router;
