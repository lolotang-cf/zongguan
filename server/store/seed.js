'use strict';
/**
 * 种子数据：由 V2 全量路由抓取而来（seed_business.json），
 * 完整保留 V2 所有业务的字段口径，并修正了已确认的数据自相矛盾项。
 *
 * 修正记录：
 *  1. talentPool.overview.total 原=850，但 onDuty(792)+trainee(45)+reserve(58)=895，
 *     各模块合计亦为 895，故将 overview.total 修正为 895，rate 同步为 100。
 */
const fs = require('fs');
const path = require('path');

const BUSINESS_FILE = path.join(__dirname, '..', '..', 'data', 'seed_business.json');

function loadBusiness() {
  try {
    return JSON.parse(fs.readFileSync(BUSINESS_FILE, 'utf-8'));
  } catch (e) {
    console.warn('[seed] 未找到 seed_business.json，使用空种子:', e.message);
    return {};
  }
}

function buildBusinessSeed() {
  const raw = loadBusiness();
  if (!raw || Object.keys(raw).length === 0) return {};
  // 修正 talentPool 自相矛盾
  if (raw.talentPool && raw.talentPool.overview) {
    const o = raw.talentPool.overview;
    const realTotal = (o.onDuty || 0) + (o.trainee || 0) + (o.reserve || 0);
    if (realTotal !== o.total) {
      console.log(`[seed] 修正 talentPool.total: ${o.total} -> ${realTotal}`);
      o.total = realTotal;
      o.rate = 100;
    }
  }
  return raw;
}

/** 用户表（用于真实登录 + RBAC）。密码为初始密码，首次登录建议修改。 */
function buildUsers() {
  // 默认账号（生产环境请通过环境变量覆盖或接入企业微信 SSO）
  const defaultPwd = process.env.DEFAULT_PWD || 'Zg@2026!';
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync(defaultPwd, 10);
  return [
    { id: 'U001', username: 'admin',   name: '系统管理员', role: 'super_admin',  dept: '综管部', title: '负责人',     passwordHash: hash, mustChangePwd: false },
    { id: 'U002', username: 'zhao',    name: '赵主管', role: 'admin_zg',     dept: '综管部', title: '综管主管',   passwordHash: hash, mustChangePwd: true },
    { id: 'U003', username: 'recruit', name: '招聘主管', role: 'recruit_lead', dept: '招聘', title: '招聘主管', passwordHash: hash, mustChangePwd: true },
    { id: 'U004', username: 'train',   name: '培训主管', role: 'train_lead',   dept: '培训', title: '培训主管', passwordHash: hash, mustChangePwd: true },
    { id: 'U005', username: 'hr',      name: '人事专员', role: 'hr_clerk',     dept: '人事', title: '人事专员', passwordHash: hash, mustChangePwd: true },
    { id: 'U006', username: 'adminc',  name: '行政专员', role: 'admin_clerk',  dept: '行政', title: '行政专员', passwordHash: hash, mustChangePwd: true },
    { id: 'U007', username: 'pr',      name: '公关专员', role: 'pr_clerk',     dept: '公关', title: '公关专员', passwordHash: hash, mustChangePwd: true },
    { id: 'U008', username: 'staff',   name: '普通员工', role: 'staff',        dept: '全员', title: '员工',     passwordHash: hash, mustChangePwd: true }
  ];
}

/** 角色 -> 模块权限映射（view/edit/approve/export） */
const ROLE_PERMISSIONS = {
  super_admin:  { '*': { view: true, edit: true, approve: true, export: true } },
  admin_zg:     { '*': { view: true, edit: true, approve: true, export: true } },
  recruit_lead: { recruit: { view: true, edit: true, approve: false, export: true }, dashboard: { view: true } },
  train_lead:   { train: { view: true, edit: true, approve: true, export: true }, dashboard: { view: true } },
  hr_clerk:     { hr: { view: true, edit: true, approve: true, export: true }, dashboard: { view: true } },
  admin_clerk:  { admin: { view: true, edit: true, approve: false, export: true }, dashboard: { view: true } },
  pr_clerk:     { pr: { view: true, edit: true, approve: false, export: false }, dashboard: { view: true } },
  staff:        { dashboard: { view: true }, recruit: { view: true }, train: { view: true }, hr: { view: true }, admin: { view: true }, pr: { view: true } }
};

/** 任务（可写，综管部待办） */
function buildTasks() {
  const now = Date.now();
  return [
    { id: 'T-1001', title: 'HR SaaS 数据映射确认', module: 'system', owner: '赵主管', priority: 'high',   due: '2026-07-25', status: 'doing',   createdAt: now },
    { id: 'T-1002', title: '电子合同平台联调测试', module: 'system', owner: '李经理', priority: 'high',   due: '2026-07-28', status: 'doing',   createdAt: now },
    { id: 'T-1003', title: '7月招聘达成率复盘',     module: 'recruit', owner: '招聘主管', priority: 'mid', due: '2026-07-31', status: 'todo', createdAt: now },
    { id: 'T-1004', title: '新员工培训转化提升',   module: 'train',  owner: '培训主管', priority: 'mid',   due: '2026-08-05', status: 'todo', createdAt: now },
    { id: 'T-1005', title: '职场租赁合同续签提醒', module: 'admin',  owner: '行政专员', priority: 'low',   due: '2026-09-30', status: 'todo', createdAt: now }
  ];
}

/** 目标（可写，OKR 式） */
function buildGoals() {
  return [
    { id: 'G-1', module: 'recruit', name: '年度招聘达成率', target: 80, current: 68.1, unit: '%', owner: '招聘主管' },
    { id: 'G-2', module: 'train',   name: '新培转化率',     target: 85, current: 79.2, unit: '%', owner: '培训主管' },
    { id: 'G-3', module: 'hr',      name: '编制使用率',     target: 95, current: 93.9, unit: '%', owner: '人事专员' },
    { id: 'G-4', module: 'admin',   name: '预算执行率',     target: 60, current: 60.0, unit: '%', owner: '行政专员' },
    { id: 'G-5', module: 'pr',      name: '舆情正面率',     target: 70, current: 68.0, unit: '%', owner: '公关专员' }
  ];
}

/** 预警（可写，预警中心） */
function buildAlerts() {
  const now = Date.now();
  return [
    { id: 'A-1', level: 'high',   module: 'hr',     title: '太原中心编制空缺超阈值', desc: '太原空缺编制 15 人，招聘中 12 人，缺口 3 人', status: 'open',   createdAt: now },
    { id: 'A-2', level: 'mid',    module: 'pr',     title: '负面舆情上升',         desc: '近 7 日负面舆情占比上升至 7%',           status: 'open',   createdAt: now },
    { id: 'A-3', level: 'low',    module: 'admin',  title: '物料低库存预警',       desc: '7 类物料低于安全库存，建议补货',         status: 'ack',    createdAt: now },
    { id: 'A-4', level: 'mid',    module: 'train',  title: '新人淘汰率偏高',       desc: '本期新人淘汰 8 人、离职 5 人',           status: 'open',   createdAt: now }
  ];
}

module.exports = {
  buildBusinessSeed,
  buildUsers,
  buildTasks,
  buildGoals,
  buildAlerts,
  ROLE_PERMISSIONS
};
