'use strict';
/**
 * 鉴权与 RBAC 中间件
 * - signToken / verifyToken：JWT（密钥取自环境变量，缺失则用一次性随机值并打印告警）
 * - requireAuth：校验 Authorization: Bearer <token>
 * - requirePerm(module, action)：按角色权限表放行
 * - publicPaths：白名单（登录、静态资源、健康检查）
 */
const jwt = require('jsonwebtoken');
const { ROLE_PERMISSIONS } = require('../store/seed');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const s = require('crypto').randomBytes(32).toString('hex');
  console.warn('[auth] 未设置 JWT_SECRET，使用进程内随机密钥（重启后旧 token 失效）。生产请配置环境变量。');
  return s;
})();

const TOKEN_TTL = process.env.JWT_TTL || '12h';

function signToken(user) {
  return jwt.sign(
    { uid: user.id, username: user.username, role: user.role, name: user.name,
      center: user.center || '*', mustChangePwd: !!user.mustChangePwd },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function extractToken(req) {
  const h = req.headers['authorization'] || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  // 兼容 cookie（可选）
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

const publicPaths = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/health',
  '/api/health'
];

function requireAuth(req, res, next) {
  // 用 originalUrl（不被挂载前缀剥离）做白名单判断，避免 app.use('/api', ...) 导致 req.path 前缀丢失
  const url = (req.originalUrl || req.url || '').split('?')[0];
  if (publicPaths.some((p) => url.startsWith(p))) return next();
  const token = extractToken(req);
  const payload = token && verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '未登录或登录已过期', code: 'UNAUTHENTICATED' });
  }
  req.user = payload;
  next();
}

/**
 * 模块权限校验。module: 业务模块( recruit/train/hr/admin/pr/dashboard/system )
 * action: view/edit/approve/export
 * super_admin / admin_zg 拥有全部；其余按 ROLE_PERMISSIONS 字典。
 */
function requirePerm(module, action = 'view') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '未登录', code: 'UNAUTHENTICATED' });
    const perms = ROLE_PERMISSIONS[req.user.role] || {};
    const wildcard = perms['*'];
    const modPerm = perms[module];
    const allowed = (wildcard && wildcard[action]) || (modPerm && modPerm[action]);
    if (!allowed) {
      return res.status(403).json({ error: `无权限：${module}.${action}`, code: 'FORBIDDEN' });
    }
    next();
  };
}

/** 脱敏工具：对列表中的敏感字段做掩码（普通员工/非本人不可见全名与联系方式） */
function desensitizeList(rows, fields, req) {
  // 仅当请求者非管理员且字段属敏感时脱敏
  const isPrivileged = req.user && (req.user.role === 'super_admin' || req.user.role === 'admin_zg');
  if (isPrivileged) return rows;
  if (!Array.isArray(rows)) return rows;
  const mask = (v) => {
    if (typeof v !== 'string' || !v) return v;
    if (/1[3-9]\d{9}/.test(v)) return v.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'); // 手机号
    if (/@/.test(v)) return v.replace(/(.{2}).*(@.*)/, '$1***$2'); // 邮箱
    if (v.length <= 1) return v;
    return v[0] + '*'.repeat(Math.max(1, v.length - 1)); // 姓名
  };
  return rows.map((row) => {
    const r = { ...row };
    fields.forEach((f) => { if (r[f] != null) r[f] = mask(String(r[f])); });
    return r;
  });
}

module.exports = { signToken, verifyToken, requireAuth, requirePerm, desensitizeList, JWT_SECRET };
