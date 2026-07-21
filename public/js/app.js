// ========== 综管综合管理平台 - 主应用（V3 UI + 鉴权系统） ==========
// ========== V3 登录门（鉴权+token注入+401处理） ==========
const _origFetch = window.fetch.bind(window);
window.fetch = function(input, init) {
  init = init || {};
  init.headers = init.headers || {};
  const t = localStorage.getItem('zg_token');
  if (t && !init.headers['Authorization']) init.headers['Authorization'] = 'Bearer ' + t;
  return _origFetch(input, init).then(r => {
    if (r.status === 401) {
      localStorage.removeItem('zg_token'); localStorage.removeItem('zg_user');
      const ov = document.getElementById('loginOverlay');
      if (ov) { ov.style.display = 'flex'; const err = document.getElementById('loginErr'); if (err) { err.textContent = '登录已过期，请重新登录'; err.style.display = 'block'; } }
    }
    return r;
  });
};
const TOKEN_KEY = 'zg_token';
const USER_KEY = 'zg_user';
function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; } }
function setUser(u) { if (u) localStorage.setItem(USER_KEY, JSON.stringify(u)); else localStorage.removeItem(USER_KEY); }
function showLogin(errMsg) {
  document.getElementById('loginOverlay').style.display = 'flex';
  if (errMsg) { const el = document.getElementById('loginErr'); el.textContent = errMsg; el.style.display = 'block'; }
}
function hideLogin() { document.getElementById('loginOverlay').style.display = 'none'; document.getElementById('loginErr').style.display = 'none'; }
async function doLogin(ev) {
  ev.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = '登录中...';
  try {
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.token) { setToken(''); setUser(null); showLogin(data.error || '登录失败 (' + r.status + ')'); return false; }
    setToken(data.token); setUser(data.user || { username: u, name: u });
    hideLogin();
    init();
    // 更新顶部用户信息
    const userInfoEl = document.querySelector('.user-info span');
    if (userInfoEl && data.user) userInfoEl.textContent = data.user.name || data.user.username || u || '系统管理员';
    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl && data.user) avatarEl.textContent = (data.user.name || data.user.username || u || '系').charAt(0);
    return false;
  } catch (e) { showLogin('网络错误：' + e.message); return false; }
  finally { btn.disabled = false; btn.textContent = '登 录'; }
}
function doLogout() { setToken(''); setUser(null); showLogin('已退出，请重新登录'); }

// 全局状态
const state = { currentPageId: '', asOf: '' };
const PAGE_COLLECTION = {
  dashboard:'dashboard','recruit-funnel':'recruitFunnel','recruit-achievement':'dashboard',
  'recruit-weekly':'weeklyReport','recruit-daily':'dashboard','hr-establishment':'headcount',
  'hr-turnover':'turnoverData','hr-contract':'contracts','hr-probation':'probation',
  'hr-weekly':'weeklyReport','hr-labor':'labor','train-talent':'talentPool',
  'train-new':'newTrain','train-knowledge':'knowledge','admin-supplies':'supplies',
  'admin-assets':'assets','admin-budget':'budget','pr-opinion':'opinion'
};

// 启动 bootstrap
(function bootstrap() {
  const t = getToken();
  if (!t) { showLogin(); return; }
  fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + t } }).then(r => {
    if (r.status === 401) { setToken(''); setUser(null); showLogin(); return null; }
    return r.json();
  }).then(u => {
    if (u) {
      setUser(u);
      const userInfoEl = document.querySelector('.user-info span');
      if (userInfoEl) userInfoEl.textContent = u.name || u.username || '系统管理员';
      const avatarEl = document.querySelector('.user-avatar');
      if (avatarEl) avatarEl.textContent = (u.name || u.username || '系').charAt(0);
      init();
    } else { showLogin(); }
  }).catch(() => showLogin());
})();

// ========== 原有 V3 应用逻辑（NAV_CONFIG / loaders / pages） ==========

const API = {
  dashboard: '/api/dashboard',
  recruitFunnel: '/api/recruit/funnel',
  talentPool: '/api/train/talent-pool',
  newTrain: '/api/train/new-train',
  knowledge: '/api/train/knowledge',
  questionBank: '/api/train/question-bank',
  headcount: '/api/hr/headcount',
  hrProcesses: '/api/hr/processes',
  contracts: '/api/hr/contracts',
  supplies: '/api/admin/supplies',
  assets: '/api/admin/assets',
  budget: '/api/admin/budget',
  prOpinion: '/api/pr/opinion',
  aiQuery: '/api/ai/query',
  // 人事管理新增
  hrWeekly: '/api/hr/weekly-report',
  hrLabor: '/api/hr/labor',
  hrProbation: '/api/hr/probation',
  // 培训管理新增
  trainInstructor: '/api/train/instructor',
  trainCourse: '/api/train/course',
  trainCadreLoss: '/api/train/cadre-loss',
  trainEstLib: '/api/train/est-library',
  trainMaterial: '/api/train/material',
  // 招聘管理新增
  recruitBackoffice: '/api/recruit/backoffice',
  recruitRpo: '/api/recruit/rpo',
  // 公关管理新增
  prCrisis: '/api/pr/crisis',
  prMedia: '/api/pr/media',
  // 人事管理新增
  hrPolicy: '/api/hr/policy-knowledge',
  // 行政管理新增
  adminManual: '/api/admin/manual-knowledge',
  // 系统管理
  sysPermission: '/api/system/permission',
  // 迭代新增（HR + 预警）
  coreKpi: '/api/hr/core-kpi',
  weeklyReport: '/api/hr/weekly-report',
  labor: '/api/hr/labor',
  probation: '/api/hr/probation',
  alerts: '/api/admin/alerts'
};

const NAV_CONFIG = [
  { group: '总览', items: [
    { id: 'dashboard', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-bar-chart-2\"></use></svg>', name: '综管驾驶舱', title: '综管驾驶舱' }
  ]},
  { group: '人员台账', children: [
    { subgroup: '招聘管理', items: [
      { id: 'recruit-funnel', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-target\"></use></svg>', name: '招聘漏斗看板', title: '招聘漏斗数据看板' },
      { id: 'recruit-achievement', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-trend-up\"></use></svg>', name: '需求达成看板', title: '年度需求入职达成看板' },
      { id: 'recruit-weekly', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-calendar\"></use></svg>', name: '周度过程看板', title: '招聘各中心周度过程数据看板' },
      { id: 'recruit-daily', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-calendar-days\"></use></svg>', name: '日报看板', title: '招聘各中心日报看板' },
      { id: 'recruit-backoffice', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-building-2\"></use></svg>', name: '二线职能达成', title: '二线职能需求达成看板' },
      { id: 'recruit-rpo', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-graduation-cap\"></use></svg>', name: 'RPO校招看板', title: 'RPO校招看板' }
    ]},
    { subgroup: '人事管理', items: [
      { id: 'hr-establishment', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-ruler\"></use></svg>', name: '编制管理', title: '编制管理' },
      { id: 'hr-turnover', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-trend-down\"></use></svg>', name: '人员流失看板', title: '人员流失看板' },
      { id: 'hr-contract', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-clipboard-list\"></use></svg>', name: '合同到期预警', title: '合同到期预警' },
      { id: 'hr-probation', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-clock\"></use></svg>', name: '试用期到期预警', title: '试用期到期预警' },
      { id: 'hr-weekly', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-newspaper\"></use></svg>', name: '人力周报', title: '人力周报' },
      { id: 'hr-labor', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-scale\"></use></svg>', name: '劳动关系管理', title: '劳动关系管理' },
      { id: 'hr-policy', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-book-open\"></use></svg>', name: '人事制度库', title: '人事制度知识库' }
    ]},
    { subgroup: '培训管理', items: [
      { id: 'train-talent', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-users\"></use></svg>', name: '人才库看板', title: '人才库数据看板' },
      { id: 'train-new', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-graduation-cap\"></use></svg>', name: '新培库看板', title: '新培库数据看板' },
      { id: 'train-instructor', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-user-check\"></use></svg>', name: '讲师库', title: '讲师库数据看板' },
      { id: 'train-course', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-book-opened\"></use></svg>', name: '课程库', title: '课程库数据看板' },
      { id: 'train-cadre-loss', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-briefcase\"></use></svg>', name: '干部流失分析', title: '干部流失分析' },
      { id: 'train-est-lib', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-bar-chart-2\"></use></svg>', name: '编制库', title: '编制库趋势看板' },
      { id: 'train-knowledge', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-library\"></use></svg>', name: '培训知识库', title: '培训知识库' },
      { id: 'train-exam', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-edit\"></use></svg>', name: '题库与考试', title: '岗前培训考试题库与在线考试' },
      { id: 'train-material', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-package\"></use></svg>', name: '培训物料管理', title: '培训物料库存管理' }
    ]}
  ]},
  { group: '物品台账', items: [
    { id: 'admin-workplace', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-building-2\"></use></svg>', name: '职场管理', title: '职场管理' },
    { id: 'admin-asset', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-monitor\"></use></svg>', name: '固定资产管理', title: '固定资产管理' },
    { id: 'admin-supplies', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-package\"></use></svg>', name: '办公用品管理', title: '办公用品库存与领用管理' },
    { id: 'admin-gift', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-gift\"></use></svg>', name: '礼品管理', title: '礼品管理' },
    { id: 'admin-print', icon: '🖨️', name: '文印管理', title: '文印管理' },
    { id: 'admin-manual', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-book-opened\"></use></svg>', name: '行政操作手册', title: '行政操作手册知识库' }
  ]},
  { group: '事务台账', items: [
    { id: 'admin-regulation', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-files\"></use></svg>', name: '管理制度', title: '管理制度' },
    { id: 'admin-tasklist', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg>', name: '工作清单', title: '工作清单' },
    { id: 'admin-goal', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-target\"></use></svg>', name: '工作目标', title: '工作目标' },
    { id: 'admin-kpi', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-trend-up\"></use></svg>', name: 'KPI', title: 'KPI考核看板' }
  ]},
  { group: '公关台账', items: [
    { id: 'pr-opinion', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-megaphone\"></use></svg>', name: '舆情监控', title: '舆情监控看板' },
    { id: 'pr-crisis', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-alert-triangle\"></use></svg>', name: '危机预案库', title: '危机预案知识库' },
    { id: 'pr-media', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-radio\"></use></svg>', name: '媒体资源库', title: '媒体资源库' }
  ]},
  { group: '系统管理', items: [
    { id: 'sys-permission', icon: '🔐', name: '权限管理', title: '统一权限体系' }
  ]},
  { group: '智能助手', items: [
    { id: 'ai-chat', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-bot\"></use></svg>', name: '综管智能小助手', title: '综管智能小助手' }
  ]}
];

const charts = {};

function init() {
  renderSidebar();
  loadHistoryDates();
  renderToolbar();
  updateScopeBadge();
  navigate('dashboard');
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = NAV_CONFIG.map((g, gi) => {
    // 有children的三级嵌套结构
    if (g.children) {
      return `
      <div class="nav-group">
        <div class="nav-group-title" onclick="toggleNavGroup(${gi})">
          <span class="nav-toggle" id="navToggle-${gi}">▾</span>
          ${g.group}
        </div>
        <div class="nav-children" id="navChildren-${gi}">
          ${g.children.map((sub, si) => `
            <div class="nav-subgroup">
              <div class="nav-subgroup-title" onclick="toggleNavSub(${gi},${si})">
                <span class="nav-toggle" id="navSubToggle-${gi}-${si}">▸</span>
                ${sub.subgroup}
              </div>
              <div class="nav-sub-items" id="navSubItems-${gi}-${si}" style="display:none">
                ${sub.items.map(item => `
                  <div class="nav-item nav-item-l3" data-page="${item.id}" onclick="navigate('${item.id}')">
                    <span class="nav-icon">${item.icon}</span>
                    <span>${item.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
    }
    // 扁平二级结构（也支持折叠）
    return `
    <div class="nav-group">
      <div class="nav-group-title" onclick="toggleNavGroup(${gi})">
        <span class="nav-toggle" id="navToggle-${gi}">▾</span>
        ${g.group}
      </div>
      <div class="nav-children" id="navChildren-${gi}">
        ${g.items.map(item => `
          <div class="nav-item" data-page="${item.id}" onclick="navigate('${item.id}')">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.name}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

function toggleNavGroup(gi) {
  const el = document.getElementById('navChildren-' + gi);
  const toggle = document.getElementById('navToggle-' + gi);
  if (el.style.display === 'none') {
    el.style.display = '';
    toggle.textContent = '▾';
  } else {
    el.style.display = 'none';
    toggle.textContent = '▸';
  }
}

function toggleNavSub(gi, si) {
  const el = document.getElementById('navSubItems-' + gi + '-' + si);
  const toggle = document.getElementById('navSubToggle-' + gi + '-' + si);
  if (el.style.display === 'none') {
    el.style.display = '';
    toggle.textContent = '▾';
  } else {
    el.style.display = 'none';
    toggle.textContent = '▸';
  }
}

function navigate(pageId) {
  state.currentPageId = pageId;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) {
    navItem.classList.add('active');
    document.getElementById('pageTitle').textContent = navItem.querySelector('span:last-child').textContent;
  }
  document.getElementById('contentArea').innerHTML = '<div class="loading"><div class="spinner"></div><div>加载中...</div></div>';
  
  const loaders = {
    'dashboard': loadDashboard,
    'recruit-funnel': loadRecruitFunnel,
    'recruit-achievement': loadRecruitAchievement,
    'recruit-weekly': loadRecruitWeekly,
    'recruit-daily': loadRecruitDaily,
    'hr-establishment': loadHrEstablishment,
    'hr-turnover': loadHrTurnover,
    'hr-contract': loadHrContract,
    'hr-probation': loadHrProbation,
    'hr-weekly': loadHrWeekly,
    'hr-labor': loadHrLabor,
    'train-talent': loadTrainTalent,
    'train-new': loadTrainNew,
    'train-instructor': loadTrainInstructor,
    'train-course': loadTrainCourse,
    'train-cadre-loss': loadTrainCadreLoss,
    'train-est-lib': loadTrainEstLib,
    'train-knowledge': loadTrainKnowledge,
    'train-exam': loadTrainExam,
    'train-material': loadTrainMaterial,
    'admin-workplace': loadAdminWorkplace,
    'admin-asset': loadAdminAsset,
    'admin-supplies': loadAdminSupplies,
    'admin-gift': loadAdminGift,
    'admin-print': loadAdminPrint,
    'admin-regulation': loadAdminRegulation,
    'admin-tasklist': loadAdminTasklist,
    'admin-goal': loadAdminGoal,
    'admin-kpi': loadAdminKpi,
    'pr-opinion': loadPrOpinion,
    'pr-crisis': loadPrCrisis,
    'pr-media': loadPrMedia,
    'recruit-backoffice': loadRecruitBackoffice,
    'recruit-rpo': loadRecruitRpo,
    'hr-policy': loadHrPolicy,
    'admin-manual': loadAdminManual,
    'sys-permission': loadSysPermission,
    'ai-chat': loadAiChat,
    // HR 人事模块（迭代新增）
    'hr-core-kpi': loadHrCoreKpi,
    'hr-weekly': loadHrWeekly,
    'hr-labor': loadHrLabor,
    'hr-probation': loadHrProbation,
    // 预警中心
    'alerts': loadAlerts
  };
  
  if (loaders[pageId]) loaders[pageId]();
}

async function fetchAPI(url, options, _retry) {
  try {
    options = options || {};
    // 主动注入 token
    const t = getToken();
    if (t) { options.headers = options.headers || {}; if (!options.headers['Authorization'] && !options.headers['authorization']) options.headers['Authorization'] = 'Bearer ' + t; }
    // 业务请求自动附加数据日期（asOf）
    if (typeof url === 'string' && url.indexOf('/api/') === 0) {
      const excl = /(\/auth\/|\/history\/|\/ai\/|\/import|\/export|\/health)/;
      if (!excl.test(url)) { const sep = url.indexOf('?') >= 0 ? '&' : '?'; const asOf = (typeof state !== 'undefined' && state.asOf) || ''; url += sep + 'asOf=' + encodeURIComponent(asOf); }
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
      if (!_retry && getToken()) { await new Promise(r => setTimeout(r, 300)); return fetchAPI(url, options, true); }
      setToken(''); setUser(null); showLogin('登录已过期，请重新登录'); return null;
    }
    if (res.status === 403) { showLogin('无权限访问该模块'); return null; }
    return await res.json();
  } catch(e) { console.error('API Error:', e); return null; }
}

function disposeCharts() {
  Object.values(charts).forEach(function(c) { if (c && c.dispose) c.dispose(); });
  Object.keys(charts).forEach(function(k) { delete charts[k]; });
}

// ========== 通用详情弹窗系统 ==========
var _detailOverlay = null;
function showDetailModal(title, bodyHTML) {
  closeDetailModal();
  _detailOverlay = document.createElement('div');
  _detailOverlay.className = 'detail-overlay';
  _detailOverlay.onclick = function(e) { if (e.target === _detailOverlay) closeDetailModal(); };
  _detailOverlay.innerHTML = '<div class="detail-modal"><div class="detail-header"><div class="detail-title">' + title + '</div><button class="detail-close" onclick="closeDetailModal()">&#10005;</button></div><div class="detail-body">' + bodyHTML + '</div></div>';
  document.body.appendChild(_detailOverlay);
  document.body.style.overflow = 'hidden';
}
function closeDetailModal() {
  if (_detailOverlay) { _detailOverlay.remove(); _detailOverlay = null; }
  document.body.style.overflow = '';
}
window.closeDetailModal = closeDetailModal;

/* ============================================================
   V21 通用二级弹窗辅助函数族
   把占位提示按钮升级为真实二级弹窗（表单/确认/详情）
   successMsg 三种语义：
     1) 字符串(且非全局函数名) -> 提交后 alert(''+msg) 并关闭
     2) 全局函数名字符串(如 'modalCb_xxx') -> 调用 window[name](v)，返回!==false才关闭
     3) null -> 不提示直接关闭
   ============================================================ */
function genFormHTML(fields, formId) {
  var html = '<form id="' + formId + '" onsubmit="return false">';
  fields.forEach(function(f) {
    html += '<div style="margin-bottom:14px">';
    html += '<label style="display:block;font-size:13px;color:#666;margin-bottom:4px">' + (f.required ? '* ' : '') + (f.label || f.name) + '</label>';
    if (f.type === 'select') {
      html += '<select name="' + f.name + '" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box">';
      (f.options || []).forEach(function(o) {
        var ov = (typeof o === 'object') ? o.value : o;
        var ot = (typeof o === 'object') ? o.text : o;
        html += '<option value="' + ov + '"' + (f.value === ov ? ' selected' : '') + '>' + ot + '</option>';
      });
      html += '</select>';
    } else if (f.type === 'textarea') {
      html += '<textarea name="' + f.name + '" rows="' + (f.rows || 3) + '" placeholder="' + (f.placeholder || '') + '" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;resize:vertical">' + (f.value || '') + '</textarea>';
    } else if (f.type === 'checkbox') {
      html += '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" name="' + f.name + '"' + (f.value ? ' checked' : '') + '> ' + (f.text || f.label || '') + '</label>';
    } else {
      html += '<input type="' + (f.type || 'text') + '" name="' + f.name + '" value="' + (f.value || '') + '" placeholder="' + (f.placeholder || '') + '"' + (f.min !== undefined ? ' min="' + f.min + '"' : '') + ' style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box">';
    }
    html += '</div>';
  });
  html += '</form>';
  return html;
}
window.showFormModal = function(title, fields, submitText, successMsg) {
  var formId = 'genForm_' + Math.random().toString(36).slice(2, 8);
  var body = genFormHTML(fields, formId);
  var safe = String(successMsg == null ? '' : successMsg).replace(/'/g, "\\'");
  var cbExpr = (successMsg == null) ? 'null'
    : ("(typeof '" + safe + "' === 'string' && window['" + safe + "'] && typeof window['" + safe + "'] === 'function' ? window['" + safe + "'] : null)");
  var actions = '<div class="detail-actions" style="margin-top:18px">'
    + '<button class="btn btn-primary" onclick="var f=document.getElementById(\'' + formId + '\');var v={};var ok=true;f.querySelectorAll(\'[name]\').forEach(function(el){v[el.name]=el.type===\'checkbox\'?el.checked:el.value;if(el.hasAttribute(\'required\')&&!el.value){ok=false;el.style.borderColor=\'#dc2626\'}});if(!ok){alert(\'请填写所有必填项\');return}'
    + 'var _cb=' + cbExpr + ';'
    + 'if(_cb){var _r=_cb(v);if(_r!==false){closeDetailModal()}}'
    + 'else{closeDetailModal();alert(\'' + (successMsg || '操作成功') + '\')}">'
    + (submitText || '提交') + '</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()">取消</button></div>';
  showDetailModal(title, body + actions);
};
window.showConfirmModal = function(title, descHTML, confirmText, successMsg) {
  var safe = String(successMsg == null ? '' : successMsg).replace(/'/g, "\\'");
  var cbExpr = (successMsg == null) ? 'null'
    : ("(typeof '" + safe + "' === 'string' && window['" + safe + "'] && typeof window['" + safe + "'] === 'function' ? window['" + safe + "'] : null)");
  var body = (descHTML || '') + '<div class="detail-actions" style="margin-top:18px">'
    + '<button class="btn btn-primary" onclick="var _cb=' + cbExpr + ';'
    + 'if(_cb){var _r=_cb();if(_r!==false){closeDetailModal()}}'
    + 'else{closeDetailModal();alert(\'' + (successMsg || '操作成功') + '\')}">'
    + (confirmText || '确认') + '</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()">取消</button></div>';
  showDetailModal(title, body);
};
window.showInfoModal = function(title, content) {
  var body;
  if (typeof content === 'string') { body = content; }
  else if (Array.isArray(content)) {
    body = '<div class="detail-grid">';
    content.forEach(function(it) { body += '<div class="detail-field"><span class="detail-label">' + it.label + '</span><span class="detail-value">' + (it.value != null ? it.value : '-') + '</span></div>'; });
    body += '</div>';
  }
  showDetailModal(title, body + '<div class="detail-actions" style="margin-top:16px"><button class="btn btn-outline" onclick="closeDetailModal()" style="margin-left:auto">关闭</button></div>');
};
window.mockSuccess = function(msg) { alert('' + msg); };

/* ===== 行数据读取助手：点击时从按钮所在行读取真实数据，避开循环变量作用域问题 ===== */
window.rowCellText = function(btn, idx) {
  var row = btn.closest('tr') || btn.closest('li') || btn.closest('[data-row]');
  if (!row) return '';
  var cell = row.children[idx];
  return cell ? cell.innerText.trim() : '';
};
window.rowDetailHTML = function(btn) {
  var row = btn.closest('tr') || btn.closest('li') || btn.closest('[data-row]');
  if (!row) return '<div style="color:#999;font-size:13px">无关联行数据</div>';
  var html = '<div class="detail-grid">';
  Array.prototype.forEach.call(row.children, function(td, i) {
    var v = td.innerText.trim();
    if (!v) return;
    html += '<div class="detail-field"><span class="detail-label">字段' + (i + 1) + '</span><span class="detail-value">' + v + '</span></div>';
  });
  html += '</div>';
  return html;
};

/* ===== 全局弹窗回调（需读取表单值 / 业务校验的场景） ===== */
window.modalCb_createRole = function(v) {
  var name = v.roleName || '新角色';
  alert('角色「' + name + '」已创建');
  return true;
};
window.modalCb_editPerson = function(v) {
  var name = v.personName || '人员';
  alert('' + name + ' 信息已更新');
  return true;
};
window.modalCb_editProject = function(v) {
  var name = v.projName || '项目';
  alert('项目「' + name + '」信息已更新');
  return true;
};
window.modalCb_saveRolePerm = function() {
  alert('角色权限已保存');
  return true;
};
window.modalCb_rejectPerm = function(v) {
  if (!v || !v.rejReason) { alert('请填写驳回理由'); return false; }
  alert('权限申请已驳回');
  return true;
};


// 职场详情
window.showWorkplaceDetail = function(d) {
  var rate = ((d.usedSeats / d.totalSeats) * 100).toFixed(1);
  showDetailModal('职场详情 - ' + d.id,
    '<div class="detail-grid">'
    + '<div class="detail-field"><span class="detail-label">编号</span><span class="detail-value">' + d.id + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">城市</span><span class="detail-value">' + d.city + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">地址</span><span class="detail-value">' + (d.address || '-') + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">面积</span><span class="detail-value">' + (d.area || 0) + ' ㎡</span></div>'
    + '<div class="detail-field"><span class="detail-label">工位</span><span class="detail-value">' + d.usedSeats + '/' + d.totalSeats + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">使用率</span><span class="detail-value" style="color:' + (rate>=90?'var(--danger)':rate>=70?'var(--warning)':'var(--success))') + '">' + rate + '%</span></div>'
    + '<div class="detail-field"><span class="detail-label">月租金</span><span class="detail-value">¥' + ((d.monthlyRent||0)*10000).toLocaleString() + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">到期日</span><span class="detail-value">' + (d.leaseEnd || '-') + '</span></div>'
    + '</div>'
    + '<div class="detail-section" style="margin-top:16px"><div class="detail-section-title"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-bar-chart-2\"></use></svg> 工位使用</div>'
    + '<div style="display:flex;align-items:center;gap:12px"><div style="flex:1;height:24px;background:var(--bg);border-radius:6px;overflow:hidden">'
    + '<div style="width:' + rate + '%;height:100%;background:linear-gradient(90deg,' + (rate>=90?'#dc2626,#ef4444':rate>=70?'#d97706,#f59e0b':'#10b981,#34d399') + ');border-radius:6px"></div>'
    + '</div><span style="font-size:15px;font-weight:700">' + d.usedSeats + '/' + d.totalSeats + '</span></div></div>'
    + '<div class="detail-actions"><button class="btn btn-primary" onclick="closeDetailModal()"> 编辑</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()"> 导出</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()" style="margin-left:auto">关闭</button></div>'
  );
};

// 资产详情
window.showAssetDetail = function(a) {
  showDetailModal('资产详情 - ' + a.id,
    '<div class="detail-grid">'
    + '<div class="detail-field"><span class="detail-label">资产编号</span><span class="detail-value" style="font-size:18px">' + a.id + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">名称</span><span class="detail-value" style="font-size:18px">' + a.name + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">状态</span><span class="detail-tag ' + (a.status==='正常'?'detail-tag-green':'detail-tag-red') + '">' + a.status + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">价值</span><span class="detail-value">¥' + (a.value||0).toLocaleString() + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">使用人</span><span class="detail-value">' + (a.user||'-') + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">部门</span><span class="detail-value">' + (a.dept||'-') + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">中心</span><span class="detail-value">' + (a.center||'-') + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">采购日期</span><span class="detail-value">' + (a.purchaseDate||'-') + '</span></div>'
    + '</div>'
    + '<div class="detail-section" style="margin-top:16px"><div class="detail-section-title"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-edit\"></use></svg> 资产档案</div>'
    + '<div class="detail-timeline">'
    + '<div class="timeline-item"><div class="timeline-time">' + (a.purchaseDate||'2024-01') + '</div><div class="text">采购入库，原值 ¥' + (a.value||0).toLocaleString() + '</div></div>'
    + '<div class="timeline-item"><div class="timeline-time">领用</div><div class="text">领用人：' + (a.user||'-') + '，部门：' + (a.dept||'-') + '</div></div>'
    + '<div class="timeline-item"><div class="timeline-time">盘点</div><div class="text">最近一次盘点：在用，状态' + (a.status||'正常') + '</div></div>'
    + '</div></div>'
    + '<div class="detail-actions"><button class="btn btn-primary" onclick="closeDetailModal();showAssetTransfer({id:\'' + a.id + '\',name:\'' + a.name + '\',center:\'' + (a.center||'') + '\'})"> 申请转出</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()"> 变更使用人</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()" style="margin-left:auto">关闭</button></div>'
  );
};

// 固资转出弹窗
window.showAssetTransfer = function(asset) {
  var assetId = (asset && asset.id) || '';
  var assetName = (asset && asset.name) || '';
  var fromCenter = (asset && asset.center) || '';
  showDetailModal('固资转出' + (assetName ? ' - ' + assetName : ''),
    '<div style="padding:20px">'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">资产编号</label>'
    + '<input type="text" value="' + assetId + '" readonly style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;background:#f5f5f5;color:#999"></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">资产名称</label>'
    + '<input type="text" value="' + assetName + '" readonly style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;background:#f5f5f5;color:#999"></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">转出中心（当前：' + (fromCenter || '未分配') + '）</label>'
    + '<select id="transferTargetCenter" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box">'
    + '<option value="">-- 请选择目标中心 --</option>'
    + '<option value="综管中心"' + (fromCenter === '综管中心' ? '' : '') + '>综管中心</option>'
    + '<option value="运营中心"' + (fromCenter === '运营中心' ? '' : '') + '>运营中心</option>'
    + '<option value="风控中心"' + (fromCenter === '风控中心' ? '' : '') + '>风控中心</option>'
    + '<option value="质检中心"' + (fromCenter === '质检中心' ? '' : '') + '>质检中心</option>'
    + '<option value="技术中心"' + (fromCenter === '技术中心' ? '' : '') + '>技术中心</option>'
    + '<option value="财务中心"' + (fromCenter === '财务中心' ? '' : '') + '>财务中心</option>'
    + '</select></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">接收人</label>'
    + '<input type="text" id="transferReceiver" placeholder="请输入接收人姓名" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box"></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">转出原因</label>'
    + '<select id="transferReason" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box">'
    + '<option value="">-- 请选择原因 --</option>'
    + '<option value="部门调整">部门调整</option>'
    + '<option value="人员调动">人员调动</option>'
    + '<option value="项目需求">项目需求</option>'
    + '<option value="资产闲置调配">资产闲置调配</option>'
    + '<option value="其他">其他</option>'
    + '</select></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">备注说明</label>'
    + '<textarea id="transferRemark" rows="3" placeholder="可选，补充说明转出详情..." style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;resize:vertical"></textarea></div>'
    + '<div style="margin-bottom:18px;padding:12px;background:#fffbf0;border:1px solid #ffe58f;border-radius:8px">'
    + '<div style="font-size:13px;color:#d48806;font-weight:600;margin-bottom:4px"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-alert-circle\"></use></svg> 转出须知</div>'
    + '<div style="font-size:12px;color:#888;line-height:1.6">1. 转出需双方中心负责人审批确认<br>2. 资产实物的交接需在7个工作日内完成<br>3. 转出后资产管理责任转移至接收方</div>'
    + '</div>'
    + '<div style="display:flex;gap:10px">'
    + '<button class="btn btn-primary" style="flex:1;padding:10px" onclick="var tc=document.getElementById(\'transferTargetCenter\').value;var tr=document.getElementById(\'transferReceiver\').value;var reason=document.getElementById(\'transferReason\').value;if(!tc){alert(\'请选择目标中心\');return}if(!tr){alert(\'请填写接收人\');return}if(!reason){alert(\'请选择转出原因\');return}closeDetailModal();alert(\'固资转出申请已提交\\n\\n资产：' + assetName + '\\n目标中心：\' + tc + \'\\n接收人：\' + tr + \'\\n原因：\' + reason + \'\\n\\n等待双方负责人审批\')">提交转出申请</button>'
    + '<button class="btn btn-outline" style="flex:1;padding:10px" onclick="closeDetailModal()">取消</button>'
    + '</div></div>'
  );
};

// 办公用品领用
window.showSupplyRequisition = function(i) {
  showDetailModal('领用 - ' + i.name,
    '<div class="detail-grid">'
    + '<div class="detail-field"><span class="detail-label">物品名称</span><span class="detail-value" style="font-size:18px">' + i.name + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">分类</span><span class="detail-value">' + i.category + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">当前库存</span><span class="detail-value" style="font-size:20px;color:var(--primary)">' + i.stock + ' ' + i.unit + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">安全库存</span><span class="detail-value">' + i.safetyStock + ' ' + i.unit + '</span></div>'
    + '</div>'
    + '<div class="detail-section"><div class="detail-section-title"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-download\"></use></svg> 领用申请</div>'
    + '<div style="padding:12px;background:var(--bg);border-radius:8px;margin-top:8px">'
    + '<label style="display:block;margin-bottom:8px;font-size:13px;color:#666">领用数量</label>'
    + '<input type="number" min="1" max="' + i.stock + '" value="1" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;box-sizing:border-box">'
    + '<label style="display:block;margin:12px 0 8px;font-size:13px;color:#666">用途说明</label>'
    + '<textarea placeholder="请输入用途..." rows="3" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;resize:none;box-sizing:border-box"></textarea>'
    + '</div></div>'
    + '<div class="detail-actions"><button class="btn btn-primary" onclick="closeDetailModal();alert(✨ 已提交领用申请：' + i.name + ')">提交申请</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()">取消</button></div>'
  );
};

// 办公用品-领用详情弹窗（表格行调用）
window.showSupplyRequisitionDetail = function(i) {
  showDetailModal('领用 - ' + i.name,
    '<div style="padding:20px">'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">物品名称</label>'
    + '<input type="text" value="' + i.name + '" readonly style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;background:#f5f5f5;color:#999"></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">当前库存</label>'
    + '<div style="font-size:18px;color:var(--primary);font-weight:600">' + (i.stock||0) + ' ' + (i.unit||'') + '<span style="font-size:12px;color:#888;margin-left:8px">安全库存: ' + (i.safetyStock||0) + (i.unit||'') + '</span></div></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">领用数量 *</label>'
    + '<input type="number" id="reqQty_' + i.id + '" min="1" max="' + (i.stock||0) + '" value="1" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box"></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">用途说明</label>'
    + '<textarea rows="2" placeholder="请简要说明用途..." style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;resize:vertical"></textarea></div>'
    + '<button class="btn btn-primary" style="width:100%" onclick="closeDetailModal();alert(\'领用申请已提交\\n\\n物品：' + i.name + '\\n数量：\' + document.getElementById(\'reqQty_' + i.id + '\').value + \' ' + (i.unit||'') + '\')">提交申请</button></div>'
  );
};

// 办公用品-出库详情弹窗（表格行调用）
window.showSupplyOutboundDetail = function(i) {
  showDetailModal('出库 - ' + i.name,
    '<div style="padding:20px">'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">物品名称</label>'
    + '<input type="text" value="' + i.name + '" readonly style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;background:#f5f5f5;color:#999"></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">当前库存</label>'
    + '<div style="font-size:18px;color:var(--primary);font-weight:600">' + (i.stock||0) + ' ' + (i.unit||'') + '</div></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">出库数量 *</label>'
    + '<input type="number" id="outQty_' + i.id + '" min="1" max="' + (i.stock||0) + '" value="1" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box"></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">出库原因</label>'
    + '<select style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box">'
    + '<option>领用发放</option><option>部门调拨</option><option>损耗报废</option><option>盘亏处理</option><option>其他</option></select></div>'
    + '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;color:#666;margin-bottom:4px">接收人/部门</label>'
    + '<input type="text" placeholder="请输入接收人或部门" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box"></div>'
    + '<button class="btn btn-primary" style="width:100%" onclick="closeDetailModal();alert(\'出库登记已确认\\n\\n物品：' + i.name + '\\n数量：\' + document.getElementById(\'outQty_' + i.id + '\').value + \' ' + (i.unit||'') + '\')">确认出库</button></div>'
  );
};

// 案件详情
window.showCaseDetail = function(r) {
  showDetailModal('劳动案件 - ' + r.id,
    '<div class="detail-grid">'
    + '<div class="detail-field"><span class="detail-label">案件编号</span><span class="detail-value" style="font-size:18px">' + r.id + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">当事人</span><span class="detail-value">' + r.name + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">案件类型</span><span class="detail-value">' + r.type + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">状态</span><span class="detail-tag ' + (r.status==='已结案'?'detail-tag-green':'detail-tag-orange') + '">' + r.status + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">涉及金额</span><span class="detail-value" style="color:var(--danger);font-size:18px">¥' + (r.amount||0).toLocaleString() + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">处理进度</span><span class="detail-value">' + (r.progress||'进行中') + '</span></div>'
    + '</div>'
    + '<div class="detail-section" style="margin-top:16px"><div class="detail-section-title"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-clipboard-list\"></use></svg> 处理时间线</div>'
    + '<div class="detail-timeline">'
    + '<div class="timeline-item"><div class="timeline-time">' + (r.filedDate||'2026-03-15') + '</div><div class="timeline-text">员工发起投诉/申诉，HR 立案登记</div></div>'
    + '<div class="timeline-item"><div class="timeline-time">T+3日</div><div class="timeline-text">首次调解会议，双方当事人到场沟通</div></div>'
    + '<div class="timeline-item"><div class="timeline-time">T+7日</div><div class="timeline-text">' + (r.status==='已结案'?'双方达成协议，案件结案':'持续跟进中...') + '</div></div>'
    + '</div></div>'
    + '<div class="detail-actions"><button class="btn btn-primary" onclick="closeDetailModal()"> 更新进度</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()"> 导出卷宗</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()" style="margin-left:auto">关闭</button></div>'
  );
};

// KPI 详情
window.showKpiDetail = function(kpi) {
  var gradeColor = kpi.score >= 90 ? 'detail-tag-green' : kpi.score >= 80 ? 'detail-tag-orange' : 'detail-tag-red';
  var gradeName = kpi.score >= 90 ? '优秀(≥90)' : kpi.score >= 80 ? '良好(80-89)' : '待改进(<80)';
  showDetailModal('KPI 详情 - ' + kpi.name,
    '<div class="detail-grid">'
    + '<div class="detail-field"><span class="detail-label">姓名</span><span class="detail-value" style="font-size:18px">' + kpi.name + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">工号</span><span class="detail-value">' + kpi.id + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">模块</span><span class="detail-value">' + (kpi.module||kpi.center||'-') + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">KPI 得分</span><span class="detail-value" style="font-size:22px;color:' + (kpi.score>=90?'var(--success)':kpi.score>=80?'var(--warning)':'var(--danger)') + '">' + kpi.score + ' 分</span></div>'
    + '<div class="detail-field"><span class="detail-label">等级</span><span class="detail-tag ' + gradeColor + '">' + gradeName + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">排名</span><span class="detail-value">第 ' + kpi.rank + ' 名</span></div>'
    + '</div>'
    + '<div class="detail-actions"><button class="btn btn-primary" onclick="closeDetailModal()"> 修改评分</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()"> 绩效面谈</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()" style="margin-left:auto">关闭</button></div>'
  );
};

// 编制详情
window.showStaffingDetail = function(s) {
  showDetailModal('编制详情 - ' + s.dept,
    '<div class="detail-grid">'
    + '<div class="detail-field"><span class="detail-label">部门</span><span class="detail-value" style="font-size:17px">' + s.dept + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">编制类型</span><span class="detail-value">' + (s.type||'-') + '</span></div>'
    + '<div class="detail-field"><span class="detail-label">核定编制</span><span class="detail-value" style="font-size:18px;color:var(--primary)">' + s.quota + ' 人</span></div>'
    + '<div class="detail-field"><span class="detail-label">在岗人数</span><span class="detail-value" style="font-size:18px">' + s.actual + ' 人</span></div>'
    + '<div class="detail-field"><span class="detail-label">空缺</span><span class="detail-value" style="color:' + (s.quota-s.actual>0?'var(--danger)':'var(--success)') + '">' + (s.quota-s.actual) + ' 人</span></div>'
    + '</div>'
    + '<div class="detail-actions"><button class="btn btn-primary" onclick="closeDetailModal()"> 调整编制</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()"> 导出</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()" style="margin-left:auto">关闭</button></div>'
  );

  setTimeout(function() {
    initChart('kpiRadarMini', {
      radar:{indicator:[{name:'工作质量',max:100},{name:'效率',max:100},{name:'团队协作',max:100},{name:'创新能力',max:100},{name:'出勤纪律',max:100}],shape:'circle',splitNumber:4,axisName:{color:'#666',fontSize:12}},
      series:[{type:'radar',data:[{value:[85+kpi.score%15,80+kpi.score%18,88-kpi.score%10,75+kpi.score%20,90-kpi.score%8],name:kpi.name,areaStyle:{opacity:0.2},lineStyle:{color:COLORS.accent},itemStyle:{color:COLORS.accent}}]}]
    });
  }, 50);
};

function renderPage(html) {
  document.getElementById('contentArea').innerHTML = html;
}

function initChart(id, option) {
  const el = document.getElementById(id);
  if (!el) return null;
  const chart = echarts.init(el);
  chart.setOption(option);
  charts[id] = chart;
  return chart;
}

const COLORS = {
  blue: '#3b82f6', purple: '#8b5cf6', green: '#059669',
  orange: '#f59e0b', red: '#ef4444', cyan: '#06b6d4',
  indigo: '#6366f1', teal: '#14b8a6'
};
const PALETTE = ['#3b82f6','#8b5cf6','#059669','#f59e0b','#ef4444','#06b6d4','#6366f1','#14b8a6'];

// ========== 驾驶舱 ==========
async function loadDashboard() {
  const data = await fetchAPI(API.dashboard);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  
  // 五模块核心指标红绿灯
  const lightData = [
    { module: '招聘管理', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-target\"></use></svg>', metric: '年度达成率', target: 80, actual: data.recruit.rate },
    { module: '培训管理', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-graduation-cap\"></use></svg>', metric: '新培转化率', target: 85, actual: data.train.newTrain.rate },
    { module: '人事管理', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-users\"></use></svg>', metric: '编制使用率', target: 95, actual: data.hr.headcount.rate },
    { module: '行政管理', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-package\"></use></svg>', metric: '预算执行率', target: 55, actual: data.admin.budget.rate },
    { module: '公关管理', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-megaphone\"></use></svg>', metric: '舆情正面率', target: 70, actual: data.pr.sentiment.positive }
  ];
  const getLight = (t, a) => a >= t ? { emoji: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-circle-green\"></use></svg>', color: COLORS.green, bar: 'green', text: '达标' }
    : a >= t * 0.9 ? { emoji: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-circle-yellow\"></use></svg>', color: COLORS.orange, bar: 'orange', text: '接近' }
    : { emoji: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-circle-red\"></use></svg>', color: COLORS.red, bar: 'red', text: '未达标' };
  const syncTime = new Date().toLocaleString('zh-CN', { hour12: false });

  renderPage(`
    <div class="section-title">🚦 五模块核心指标红绿灯</div>
    <div class="kpi-grid cols-5">
      ${lightData.map(l => {
        const st = getLight(l.target, l.actual);
        const achieveRate = ((l.actual / l.target) * 100).toFixed(1);
        return `<div class="kpi-card" style="border-top:3px solid ${st.color}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:14px;font-weight:700;color:var(--primary)">${l.icon} ${l.module}</span>
            <span style="font-size:12px">${st.emoji}</span>
          </div>
          <div style="font-size:12px;color:var(--text-light);margin-bottom:10px">${l.metric}</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="color:var(--text-light)">目标值</span>
            <span style="font-weight:600">${l.target}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
            <span style="color:var(--text-light)">实际值</span>
            <span style="font-weight:700;color:${st.color}">${l.actual}%</span>
          </div>
          <div class="progress"><div class="progress-bar ${st.bar}" style="width:${Math.min(l.actual, 100)}%"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:6px">
            <span style="color:var(--text-light)">达成率 ${achieveRate}%</span>
            <span style="font-weight:600;color:${st.color}">${st.text}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg></div><div class="kpi-value">${data.recruit.yearOnboard}/${data.recruit.yearDemand}</div><div class="kpi-label">年度招聘达成</div><div class="kpi-trend up">▲ ${data.recruit.rate}%</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg></div><div class="kpi-value">${data.train.talentPool.onDuty}</div><div class="kpi-label">人才库在岗人数</div><div class="kpi-trend up">▲ ${data.train.talentPool.rate}%</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${data.hr.headcount.actual}/${data.hr.headcount.planned}</div><div class="kpi-label">编制使用率</div><div class="kpi-trend up">▲ ${data.hr.headcount.rate}%</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-package"></use></svg></div><div class="kpi-value">${data.admin.supplies.lowStock}</div><div class="kpi-label">办公用品库存预警</div><div class="kpi-trend down">▼ 待处理</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-megaphone"></use></svg></div><div class="kpi-value">${data.pr.alerts}</div><div class="kpi-label">舆情预警</div><div class="kpi-trend down">▼ 待处理</div></div>
    </div>

    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg> 招聘漏斗</div>
        <div class="chart-desc">各环节转化率</div>
        <div id="dashFunnel" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 招聘趋势</div>
        <div class="chart-desc">月度需求与入职对比</div>
        <div id="dashRecruitTrend" style="height:280px"></div>
      </div>
    </div>

    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg> 人员变动趋势</div>
        <div class="chart-desc">月度入职/离职对比</div>
        <div id="dashHrTrend" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-megaphone"></use></svg> 舆情情感分布</div>
        <div class="chart-desc">近7天舆情情感分析</div>
        <div id="dashPrSentiment" style="height:280px"></div>
      </div>
    </div>

    <div class="row cols-3">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-graduation-cap"></use></svg> 培训概览</div>
        <div class="stat-inline" style="margin-top:12px">
          <div class="stat-item"><div class="val">${data.train.newTrain.enrolled}</div><div class="lbl">新培参训</div></div>
          <div class="stat-item"><div class="val">${data.train.newTrain.rate}%</div><div class="lbl">转化率</div></div>
          <div class="stat-item"><div class="val">${data.train.knowledge.courses}</div><div class="lbl">课件数</div></div>
        </div>
        <div style="margin-top:16px"><div style="font-size:12px;color:var(--text-light);margin-bottom:6px">学习完成率</div><div class="progress"><div class="progress-bar green" style="width:${data.train.knowledge.avgCompletion}%"></div></div></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-coins"></use></svg> 行政费用执行</div>
        <div class="stat-inline" style="margin-top:12px">
          <div class="stat-item"><div class="val">${(data.admin.budget.spent/10000).toFixed(0)}万</div><div class="lbl">已支出</div></div>
          <div class="stat-item"><div class="val">${(data.admin.budget.annual/10000).toFixed(0)}万</div><div class="lbl">年度预算</div></div>
          <div class="stat-item"><div class="val">${data.admin.budget.rate}%</div><div class="lbl">执行率</div></div>
        </div>
        <div style="margin-top:16px"><div style="font-size:12px;color:var(--text-light);margin-bottom:6px">预算执行进度</div><div class="progress"><div class="progress-bar blue" style="width:${data.admin.budget.rate}%"></div></div></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg> 待办事项</div>
        <div style="margin-top:8px">
          <div class="alert-item alert-warning"><span class="alert-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></span><div>合同即将到期 <strong>${data.hr.contractExpiring}</strong> 份，请及时处理续签</div></div>
          <div class="alert-item alert-danger"><span class="alert-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-package"></use></svg></span><div>办公用品库存预警 <strong>${data.admin.supplies.lowStock}</strong> 项，请及时补充</div></div>
          <div class="alert-item alert-info"><span class="alert-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></span><div>入转调离流程 <strong>${data.hr.onboarding + data.hr.transfer + data.hr.resignation}</strong> 个进行中</div></div>
        </div>
      </div>
    </div>

    <div class="chart-card" style="margin-top:8px">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg> 系统数据同步状态</div>
      <div class="chart-desc">各模块数据最近更新时间</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:8px">
        <div style="text-align:center;padding:14px 12px 10px;background:var(--bg);border-radius:8px">
          <div style="font-size:13px;font-weight:600;color:var(--primary)">招聘管理</div>
          <div style="font-size:11px;color:var(--success);margin-top:4px">● 已同步</div>
          <div style="font-size:11px;color:var(--text-light);margin-top:2px">${syncTime}</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:13px;font-weight:600;color:var(--primary)">培训管理</div>
          <div style="font-size:11px;color:var(--success);margin-top:4px">● 已同步</div>
          <div style="font-size:11px;color:var(--text-light);margin-top:2px">${syncTime}</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:13px;font-weight:600;color:var(--primary)">人事管理</div>
          <div style="font-size:11px;color:var(--success);margin-top:4px">● 已同步</div>
          <div style="font-size:11px;color:var(--text-light);margin-top:2px">${syncTime}</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:13px;font-weight:600;color:var(--primary)">行政管理</div>
          <div style="font-size:11px;color:var(--success);margin-top:4px">● 已同步</div>
          <div style="font-size:11px;color:var(--text-light);margin-top:2px">${syncTime}</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:13px;font-weight:600;color:var(--primary)">公关管理</div>
          <div style="font-size:11px;color:var(--success);margin-top:4px">● 已同步</div>
          <div style="font-size:11px;color:var(--text-light);margin-top:2px">${syncTime}</div>
        </div>
      </div>
    </div>
  `);

  // Dashboard 底部 4 图表 ECharts 初始化（原 V3 缺失此段）
  setTimeout(() => {
    disposeCharts();
    // 招聘漏斗 - 水平漏斗图
    const rc = data.recruit || {};
    initChart('dashFunnel', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [{ type: 'funnel', left: '10%', top: 20, bottom: 20, width: '80%',
        sort: 'descending',
        data: [
          { value: rc.yearDemand || 850, name: '年度需求', itemStyle: { color: COLORS.blue } },
          { value: Math.floor((rc.yearDemand || 850) * 0.65), name: '简历收取', itemStyle: { color: '#60a5fa' } },
          { value: Math.floor((rc.yearDemand || 850) * 0.40), name: '面试邀请', itemStyle: { color: COLORS.cyan } },
          { value: Math.floor((rc.yearDemand || 850) * 0.25), name: 'Offer发放', itemStyle: { color: COLORS.purple } },
          { value: rc.yearOnboard || 578, name: '实际入职', itemStyle: { color: COLORS.green } }
        ],
        label: { fontSize: 12 }
      }]
    });
    // 招聘趋势
    const trend = (rc.trend || []).length ? rc.trend : [
      { month:'1月', demand:80, onboard:62 }, { month:'2月', demand:75, onboard:58 },
      { month:'3月', demand:90, onboard:71 }, { month:'4月', demand:85, onboard:68 },
      { month:'5月', demand:78, onboard:55 }, { month:'6月', demand:82, onboard:64 }
    ];
    initChart('dashRecruitTrend', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['需求数','入职数'] },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: trend.map(t => t.month) },
      yAxis: [{ type: 'value' }, { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } }],
      series: [
        { name: '需求数', type: 'bar', data: trend.map(t => t.demand), itemStyle: { color: COLORS.blue } },
        { name: '入职数', type: 'bar', data: trend.map(t => t.onboard), itemStyle: { color: COLORS.green } },
        { name: '达成率', type: 'line', yAxisIndex: 1, data: trend.map(t => ((t.onboard/t.demand)*100).toFixed(1)), itemStyle: { color: COLORS.orange }, smooth: true }
      ]
    });
    // 人员变动趋势
    const hrData = data.hr || {};
    const hrTrend = (hrData.monthlyTrend || []).length ? hrData.monthlyTrend : [
      { month:'1月', onboard:15, resign:8 }, { month:'2月', onboard:12, resign:5 },
      { month:'3月', onboard:18, resign:7 }, { month:'4月', onboard:14, resign:6 },
      { month:'5月', onboard:16, resign:9 }, { month:'6月', onboard:20, resign:4 }
    ];
    initChart('dashHrTrend', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['入职','离职'] },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: hrTrend.map(t => t.month) },
      yAxis: { type: 'value' },
      series: [
        { name: '入职', type: 'bar', stack: 'total', data: hrTrend.map(t => t.onboard), itemStyle: { color: COLORS.green } },
        { name: '离职', type: 'bar', stack: 'total', data: hrTrend.map(t => -t.resign), itemStyle: { color: COLORS.red } },
        { name: '入职线', type: 'line', data: hrTrend.map(t => t.onboard), itemStyle: { color: COLORS.green }, smooth: true, lineStyle: { width: 2 }, symbol: 'none' },
        { name: '离职线', type: 'line', data: hrTrend.map(t => t.resign), itemStyle: { color: COLORS.red }, smooth: true, lineStyle: { width: 2 }, symbol: 'none' }
      ]
    });
    // 舆情情感分布
    const prData = data.pr || { sentiment: { positive: 68, neutral: 22, negative: 10 } };
    initChart('dashPrSentiment', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}条 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 12 },
        data: [
          { value: prData.sentiment.positive || 68, name: '正面', itemStyle: { color: COLORS.green } },
          { value: prData.sentiment.neutral || 22, name: '中性', itemStyle: { color: '#94a3b8' } },
          { value: prData.sentiment.negative || 10, name: '负面', itemStyle: { color: COLORS.red } }
        ]
      }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 系统-统一权限体系 ==========
async function loadSysPermission() {
  const data = await fetchAPI(API.sysPermission);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg></div><div class="kpi-value">${data.overview.totalRoles}</div><div class="kpi-label">角色总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-user"></use></svg></div><div class="kpi-value">${data.overview.totalUsers}</div><div class="kpi-label">系统用户数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">🔑</div><div class="kpi-value">${data.overview.totalPermissions}</div><div class="kpi-label">权限项</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">🔓</div><div class="kpi-value">${data.overview.pendingApprovals}</div><div class="kpi-label">待审批权限申请</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"> 角色权限矩阵 <button class="btn btn-primary" style="float:right;padding:4px 12px;font-size:12px" onclick="showFormModal(\'新建角色\',[{\'name\':\'roleName\',\'label\':\'角色名称\',\'required\':true,\'placeholder\':\'如：中心管理员\'},{\'name\':\'roleDesc\',\'label\':\'角色描述\',\'type\':\'textarea\',\'rows\':2,\'placeholder\':\'简要描述该角色职责\'},{\'name\':\'roleScope\',\'label\':\'数据范围\',\'type\':\'select\',\'options\':[\'全部中心\',\'本中心\',\'自定义\'],\'value\':\'本中心\'}],\'创建角色\',\'modalCb_createRole\')"> 新建角色</button></div>
        <table class="data-table">
          <thead><tr><th>角色</th><th>描述</th><th>用户数</th><th>权限数</th><th>操作</th></tr></thead>
          <tbody>
            ${data.roles.map(r => `<tr><td><strong>${r.name}</strong></td><td>${r.desc}</td><td>${r.userCount}</td><td>${r.permissionCount}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'⚙ 配置权限 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>为该角色配置菜单与操作权限，保存后即时生效。</p>\',\'保存权限\',\'modalCb_saveRolePerm\')">配置权限</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 模块权限分配</div>
        <table class="data-table">
          <thead><tr><th>模块</th><th>查看</th><th>编辑</th><th>审批</th><th>导出</th><th>管理</th></tr></thead>
          <tbody>
            ${data.modules.map(m => `<tr><td><strong>${m.name}</strong></td><td>${m.view ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg>' : '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-x-circle\"></use></svg>'}</td><td>${m.edit ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg>' : '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-x-circle\"></use></svg>'}</td><td>${m.approve ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg>' : '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-x-circle\"></use></svg>'}</td><td>${m.export ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg>' : '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-x-circle\"></use></svg>'}</td><td>${m.admin ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg>' : '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-x-circle\"></use></svg>'}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bell"></use></svg> 权限申请记录</div>
      <table class="data-table">
        <thead><tr><th>申请人</th><th>角色</th><th>申请权限</th><th>申请理由</th><th>申请时间</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.applications.map(a => `<tr><td>${a.applicant}</td><td>${a.role}</td><td>${a.permission}</td><td>${a.reason}</td><td>${a.time}</td><td><span class="tag ${a.status==='已批准'?'tag-success':a.status==='待审批'?'tag-warning':'tag-danger'}">${a.status}</span></td><td>${a.status==='待审批' ? `<button class="btn btn-primary" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'审批通过\',\'<p style=\'margin:0;color:#666;font-size:13px\'>确认通过该权限申请？</p>\',\'批准\',\'权限申请已通过\')">批准</button> <button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showFormModal(\'⚠ 驳回申请\',[{\'name\':\'rejReason\',\'label\':\'驳回理由\',\'type\':\'textarea\',\'required\':true,\'rows\':3,\'placeholder\':\'请说明驳回原因\'}],\'确认驳回\',\'modalCb_rejectPerm\')">驳回</button>` : '—'}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 招聘-漏斗看板 ==========
async function loadRecruitFunnel() {
  const data = await fetchAPI(API.recruitFunnel);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  
  const f = data.centers[0];
  const stages = [
    { name: '岗位发布', count: f.posted, color: COLORS.blue },
    { name: '简历收取', count: f.resume, color: '#60a5fa' },
    { name: '筛选通过', count: f.screened, color: COLORS.cyan },
    { name: '面试', count: f.interview, color: COLORS.purple },
    { name: 'Offer', count: f.offer, color: COLORS.orange },
    { name: '入职', count: f.onboard, color: COLORS.green }
  ];
  
  renderPage(`
    <div class="filter-bar">
      <select><option>全部中心</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
      <select><option>全部岗位</option><option>催收员</option><option>质检员</option><option>组长</option><option>二线职能</option></select>
      <select><option>本月</option><option>本季度</option><option>本年</option></select>
      <button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-download"></use></svg> 导出</button>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg> 招聘漏斗</div>
        <div class="chart-desc">各环节转化率 · 全部中心汇总</div>
        <div class="funnel-container" style="margin-top:12px;display:flex;flex-direction:column;align-items:center;padding:8px 0">
          ${stages.map((s, i) => {
            const prev = i > 0 ? stages[i-1].count : s.count;
            const rate = i > 0 ? ((s.count / prev) * 100).toFixed(1) : '100';
            const baseWidth = 100;
            const shrink = i * 14;
            const width = Math.max(30, baseWidth - shrink);
            const leftPad = (baseWidth - width) / 2;
            const dropoff = i > 0 ? ((s.count / stages[0].count) * 100).toFixed(1) : '100';
            return `<div style="width:100%;display:flex;align-items:center;justify-content:center;margin:2px 0">
              <div style="width:${leftPad}%;text-align:right;padding-right:8px;font-size:12px;color:var(--text-light)">${i>0?'▼ '+rate+'%':''}</div>
              <div style="width:${width}%;min-width:120px;background:${s.color};border-radius:6px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 6px rgba(0,0,0,0.1);position:relative;overflow:hidden">
                <span style="color:#fff;font-weight:600;font-size:14px;text-shadow:0 1px 2px rgba(0,0,0,0.3)">${s.name}</span>
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="color:#fff;font-weight:700;font-size:18px;text-shadow:0 1px 2px rgba(0,0,0,0.3)">${s.count}</span>
                  <span style="color:rgba(255,255,255,0.8);font-size:11px;border:1px solid rgba(255,255,255,0.4);padding:2px 8px;border-radius:10px">转化率 ${rate}%</span>
                </div>
              </div>
              <div style="width:${leftPad}%;text-align:left;padding-left:8px;font-size:12px;color:var(--text-light)">留存 ${dropoff}%</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各中心对比</div>
        <div class="chart-desc">各中心招聘各环节数据</div>
        <div id="centerCompare" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 各中心招聘明细</div>
      <table class="data-table">
        <thead><tr><th>中心</th><th>岗位发布</th><th>简历收取</th><th>筛选通过</th><th>面试</th><th>Offer</th><th>入职</th><th>整体转化率</th></tr></thead>
        <tbody>
          ${data.centers.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.posted}</td><td>${c.resume}</td><td>${c.screened}</td><td>${c.interview}</td><td>${c.offer}</td><td>${c.onboard}</td><td><span class="tag tag-success">${((c.onboard/c.posted)*100).toFixed(1)}%</span></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);

  setTimeout(() => {
    disposeCharts();
    initChart('centerCompare', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['简历', '面试', 'Offer', '入职'] },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.centers.map(c => c.name) },
      yAxis: { type: 'value' },
      series: [
        { name: '简历', type: 'bar', data: data.centers.map(c => c.resume), itemStyle: { color: '#60a5fa' } },
        { name: '面试', type: 'bar', data: data.centers.map(c => c.interview), itemStyle: { color: COLORS.purple } },
        { name: 'Offer', type: 'bar', data: data.centers.map(c => c.offer), itemStyle: { color: COLORS.orange } },
        { name: '入职', type: 'bar', data: data.centers.map(c => c.onboard), itemStyle: { color: COLORS.green } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 招聘-年度达成 ==========
async function loadRecruitAchievement() {
  const data = await fetchAPI(API.dashboard);
  if (!data) return;
  const r = data.recruit;
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${r.yearDemand}</div><div class="kpi-label">年度需求数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${r.yearOnboard}</div><div class="kpi-label">年度入职数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg></div><div class="kpi-value">${r.rate}%</div><div class="kpi-label">年度达成率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar"></use></svg></div><div class="kpi-value">${r.monthOnboard}/${r.monthDemand}</div><div class="kpi-label">本月达成</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 年度需求入职趋势</div>
      <div class="chart-desc">月度需求与入职对比</div>
      <div id="achievementTrend" style="height:350px"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg> RPO渠道供应商达成</div>
      <div class="chart-desc">按渠道供应商类别展示入职数量</div>
      <div id="rpoChart" style="height:300px"></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-user-plus"></use></svg> 自招达成</div>
        <div class="chart-desc">社招直招 / 内推 / 猎头 / 人才库激活</div>
        <div id="selfRecruitChart" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg> 校招达成</div>
        <div class="chart-desc">校园宣讲 / 校企合作 / 管培生 / 实习转正</div>
        <div id="groupRecruitChart" style="height:280px"></div>
      </div>
    </div>
  `);
  const rpoRes = await fetchAPI(API.recruitFunnel);
  const rpoChannels = rpoRes ? rpoRes.rpoChannels || [] : [];
  const selfRecruit = rpoRes ? rpoRes.selfRecruit || [] : [];
  const groupRecruit = rpoRes ? rpoRes.groupRecruit || [] : [];
  setTimeout(() => {
    disposeCharts();
    initChart('achievementTrend', {
      tooltip: { trigger: 'axis' }, legend: { data: ['需求数', '入职数', '达成率'], bottom: 0 },
      grid: { left: 50, right: 50, top: 20, bottom: 50 }, xAxis: { type: 'category', data: r.trend.map(t => t.month) },
      yAxis: [{ type: 'value', name: '人数' }, { type: 'value', name: '达成率%', max: 100 }],
      series: [
        { name: '需求数', type: 'bar', data: r.trend.map(t => t.demand), itemStyle: { color: COLORS.blue } },
        { name: '入职数', type: 'bar', data: r.trend.map(t => t.onboard), itemStyle: { color: COLORS.green } },
        { name: '达成率', type: 'line', yAxisIndex: 1, smooth: true, data: r.trend.map(t => ((t.onboard/t.demand)*100).toFixed(1)), itemStyle: { color: COLORS.orange } }
      ]
    });
    initChart('rpoChart', {
      tooltip: { trigger: 'item' }, legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['35%','60%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{c}人 ({d}%)' },
        data: rpoChannels.map(c => ({ value: c.count, name: c.name, itemStyle: { color: c.color } }))
      }]
    });
    if (selfRecruit.length) {
      initChart('selfRecruitChart', {
        tooltip: { trigger: 'item' }, legend: { bottom: 0 },
        series: [{ type: 'pie', radius: ['35%','60%'], center: ['50%','45%'],
          label: { formatter: '{b}\n{c}人 ({d}%)' },
          data: selfRecruit.map(c => ({ value: c.count, name: c.name, itemStyle: { color: c.color } }))
        }]
      });
    }
    if (groupRecruit.length) {
      initChart('groupRecruitChart', {
        tooltip: { trigger: 'item' }, legend: { bottom: 0 },
        series: [{ type: 'pie', radius: ['35%','60%'], center: ['50%','45%'],
          label: { formatter: '{b}\n{c}人 ({d}%)' },
          data: groupRecruit.map(c => ({ value: c.count, name: c.name, itemStyle: { color: c.color } }))
        }]
      });
    }
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 招聘-周度过程 ==========
async function loadRecruitWeekly() {
  const data = await fetchAPI(API.recruitFunnel);
  if (!data) return;
  const wp = data.weeklyProcess;
  renderPage(`
    <div class="filter-bar"><select><option>全部中心</option><option>太原</option><option>南昌</option></select><select><option>本周</option><option>上周</option></select><button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-download"></use></svg> 导出</button></div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各渠道过程数据</div>
      <div class="chart-desc">自招/校招/渠道 - 到面/参面/通过/报到/签约</div>
      <div id="weeklyProcess" style="height:350px"></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg> 经验分类需求达成</div>
        <div class="chart-desc">ABC经验分类需求与达成对比</div>
        <div id="abcChart" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 各渠道明细</div>
        <table class="data-table">
          <thead><tr><th>渠道</th><th>到面</th><th>参面</th><th>通过</th><th>报到</th><th>签约</th><th>达成率</th></tr></thead>
          <tbody>
            ${wp.categories.map((cat, i) => {
              const vals = wp.series.map(s => s.data[i]);
              return `<tr><td><strong>${cat}</strong></td>${vals.map(v => `<td>${v}</td>`).join('')}<td><span class="tag tag-success">${((vals[4]/vals[0])*100).toFixed(1)}%</span></td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('weeklyProcess', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: wp.series.map(s => s.name) },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: wp.categories },
      yAxis: { type: 'value' },
      series: wp.series.map((s, i) => ({ name: s.name, type: 'bar', data: s.data, itemStyle: { color: PALETTE[i] } }))
    });
    initChart('abcChart', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['需求', '达成'] },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: ['A类(经验丰富)', 'B类(有经验)', 'C类(无经验)'] },
      yAxis: { type: 'value' },
      series: [
        { name: '需求', type: 'bar', data: [wp.abcDemand.A, wp.abcDemand.B, wp.abcDemand.C], itemStyle: { color: COLORS.blue } },
        { name: '达成', type: 'bar', data: [wp.abcAchieved.A, wp.abcAchieved.B, wp.abcAchieved.C], itemStyle: { color: COLORS.green } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 招聘-日报 ==========
async function loadRecruitDaily() {
  const data = await fetchAPI(API.recruitFunnel);
  if (!data) return;
  renderPage(`
    <div class="filter-bar"><select><option>全部中心</option><option>太原</option><option>南昌</option></select><span style="font-size:13px;color:var(--text-light)">数据更新时间：2026-07-16 18:00</span><button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-download"></use></svg> 导出日报</button></div>
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${data.dailyData[data.dailyData.length-1].interview}</div><div class="kpi-label">今日到面</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.dailyData[data.dailyData.length-1].pass}</div><div class="kpi-label">今日通过</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">🎉</div><div class="kpi-value">${data.dailyData[data.dailyData.length-1].onboard}</div><div class="kpi-label">今日入职</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${data.dailyData.reduce((s,d)=>s+d.interview,0)}</div><div class="kpi-label">本周累计到面</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar-days"></use></svg> 每日过程趋势</div>
      <div class="chart-desc">近7天到面/通过/入职数据</div>
      <div id="dailyTrend" style="height:350px"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 每日明细</div>
      <table class="data-table">
        <thead><tr><th>日期</th><th>到面</th><th>通过</th><th>报到</th><th>通过率</th></tr></thead>
        <tbody>${data.dailyData.map(d => `<tr><td>${d.date}</td><td>${d.interview}</td><td>${d.pass}</td><td>${d.onboard}</td><td><span class="tag tag-info">${((d.pass/d.interview)*100).toFixed(1)}%</span></td></tr>`).join('')}</tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('dailyTrend', {
      tooltip: { trigger: 'axis' }, legend: { data: ['到面', '通过', '入职'], bottom: 0 },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.dailyData.map(d => d.date) },
      yAxis: { type: 'value' },
      series: [
        { name: '到面', type: 'bar', data: data.dailyData.map(d => d.interview), itemStyle: { color: COLORS.blue } },
        { name: '通过', type: 'bar', data: data.dailyData.map(d => d.pass), itemStyle: { color: COLORS.green } },
        { name: '入职', type: 'line', smooth: true, data: data.dailyData.map(d => d.onboard), itemStyle: { color: COLORS.orange }, lineStyle: { width: 3 } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 培训-人才库 ==========
async function loadTrainTalent() {
  const data = await fetchAPI(API.talentPool);
  if (!data) return;
  renderPage(`
    <div class="filter-bar">
      <span style="font-size:13px;color:var(--text-light)">开始</span>
      <input type="date" value="2026-01-01" id="talentDateStart">
      <span style="color:var(--text-light)">至</span>
      <input type="date" value="2026-07-16" id="talentDateEnd">
      <select id="talentCenterFilter"><option>全部中心</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
      <select id="talentModuleFilter"><option>全部模块</option><option>小赢</option><option>字节</option><option>邮储</option><option>交行</option><option>广汽</option><option>江西银行</option><option>华夏银行</option></select>
      <button class="btn btn-primary" onclick="showFormModal(\'人才库查询\',[{\'name\':\'talentDate\',\'label\':\'统计日期\',\'type\':\'date\'},{\'name\':\'talentKeyword\',\'label\':\'关键词\',\'placeholder\':\'姓名 / 工号 / 中心\'}],\'查询\',\'人才库查询条件已应用\')"> 查询</button>
      <button class="btn btn-outline" onclick="showConfirmModal(\'导入人才库\',\'<p style=\'margin:0;color:#666;font-size:13px\'>请选择要导入的 Excel 文件，系统将自动解析并更新人才库数据。</p>\',\'选择文件并导入\',\'人才库数据导入中\')"> 导入Excel</button>
      <button class="btn btn-outline" onclick="showConfirmModal(\'导出人才库\',\'<p style=\'margin:0;color:#666;font-size:13px\'>当前筛选范围内的人才数据将导出为 Excel。</p>\',\'确认导出\',\'人才库已导出Excel\')"> 导出Excel</button>
      <button class="btn btn-outline" onclick="showFormModal(\'历史快照\',[{\'name\':\'snapDate\',\'label\':\'选择快照日期\',\'type\':\'select\',\'options\':[{\'value\':\'2026-06-30\',\'text\':\'2026-06-30（月末快照）\'},{\'value\':\'2026-05-31\',\'text\':\'2026-05-31（月末快照）\'},{\'value\':\'2026-04-30\',\'text\':\'2026-04-30（月末快照）\'}]}],\'查看快照\',\'已加载历史快照\')"> 历史快照</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-light)">数据实时同步 | 各中心可在线编辑</span>
      <span style="font-size:12px;padding:2px 10px;background:${COLORS.blue}20;color:${COLORS.blue};border-radius:4px;font-weight:600">当前权限：总部-全部中心</span>
    </div>
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">编制总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.onDuty}</div><div class="kpi-label">在岗总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-graduation-cap"></use></svg></div><div class="kpi-value">${data.overview.trainee}</div><div class="kpi-label">见习总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-package"></use></svg></div><div class="kpi-value">${data.overview.reserve}</div><div class="kpi-label">后备总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg></div><div class="kpi-value">${data.overview.rate}%</div><div class="kpi-label">人员储备率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各模块人才分布</div>
        <div class="chart-desc">编制/在岗/见习/后备 - 树状图</div>
        <div id="talentTreeMap" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-building-2"></use></svg> 各中心人才分布</div>
        <div class="chart-desc">各中心编制/在岗/见习/后备对比</div>
        <div id="talentCenter" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 人才库详细数据</div>
      <div class="filter-bar"><select><option>全部中心</option><option>太原</option><option>南昌</option></select><select><option>全部模块</option><option>小赢</option><option>字节</option></select><input type="text" placeholder="搜索姓名..."><button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-search"></use></svg> 筛选</button></div>
      <table class="data-table">
        <thead><tr><th>工号</th><th>姓名</th><th>中心</th><th>模块</th><th>层级</th><th>队列</th><th>入职日期</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${data.detail.map(d => `<tr><td>${d.id}</td><td><strong>${d.name}</strong></td><td>${d.center}</td><td>${d.module}</td><td><span class="tag ${d.level==='在岗'?'tag-success':d.level==='见习'?'tag-warning':'tag-info'}">${d.level}</span></td><td>${d.queue}</td><td>${d.joinDate}</td><td><span class="tag tag-success">${d.status}</span></td><td><button class="btn btn-outline" style="padding:2px 10px;font-size:12px" onclick="showFormModal(\'✏ 编辑人员 - \' + rowCellText(this,1),[{\'name\':\'personName\',\'label\':\'姓名\',\'required\':true,\'value\':rowCellText(this,1)},{\'name\':\'personDept\',\'label\':\'所属部门\',\'value\':rowCellText(this,2)},{\'name\':\'personRole\',\'label\':\'岗位\',\'value\':rowCellText(this,3)},{\'name\':\'personPhone\',\'label\':\'联系电话\',\'value\':rowCellText(this,4)}],\'保存\',\'modalCb_editPerson\')"> 编辑</button></td></tr>`).join('')}</tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('talentTreeMap', {
      tooltip: { formatter: function(info) { const tree = info.treePathInfo || []; const val = info.value || 0; return '<b>' + info.name + '</b><br/>人数：' + val; } },
      series: [{
        type: 'treemap',
        roam: false, nodeClick: false,
        breadcrumb: { show: true, bottom: 0, itemStyle: { color: '#f0f0f0' } },
        label: { show: true, formatter: '{b}\n{c}', fontSize: 12 },
        upperLabel: { show: true, height: 22, color: '#fff', fontSize: 12 },
        itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
        levels: [
          { itemStyle: { borderColor: '#333', borderWidth: 3, gapWidth: 3 } },
          { color: ['#3b82f6','#059669','#f59e0b','#8b5cf6'], colorMappingBy: 'index', itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 } }
        ],
        data: data.modules.map(function(m, i) {
          return {
            name: m.name,
            children: [
              { name: '编制', value: m.total, itemStyle: { color: COLORS.blue } },
              { name: '在岗', value: m.onDuty, itemStyle: { color: COLORS.green } },
              { name: '见习', value: m.trainee, itemStyle: { color: COLORS.orange } },
              { name: '后备', value: m.reserve, itemStyle: { color: COLORS.purple } }
            ]
          };
        })
      }]
    });
    initChart('talentCenter', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['编制', '在岗', '见习', '后备'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.centers.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [
        { name: '编制', type: 'bar', data: data.centers.map(c => c.total), itemStyle: { color: COLORS.blue } },
        { name: '在岗', type: 'bar', data: data.centers.map(c => c.onDuty), itemStyle: { color: COLORS.green } },
        { name: '见习', type: 'bar', data: data.centers.map(c => c.trainee), itemStyle: { color: COLORS.orange } },
        { name: '后备', type: 'bar', data: data.centers.map(c => c.reserve), itemStyle: { color: COLORS.purple } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 培训-新培库 ==========
async function loadTrainNew() {
  const data = await fetchAPI(API.newTrain);
  if (!data) return;
  renderPage(`
    <div class="filter-bar">
      <span style="font-size:13px;color:var(--text-light)">开始</span>
      <input type="date" value="2026-01-01" id="newTrainDateStart">
      <span style="color:var(--text-light)">至</span>
      <input type="date" value="2026-07-16" id="newTrainDateEnd">
      <select id="newTrainCenterFilter"><option>全部中心</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
      <select id="newTrainModuleFilter"><option>全部模块</option><option>小赢</option><option>字节</option><option>邮储</option><option>交行</option><option>广汽</option><option>江西银行</option><option>华夏银行</option></select>
      <button class="btn btn-primary" onclick="showFormModal(\'新培库查询\',[{\'name\':\'trainDate\',\'label\':\'统计日期\',\'type\':\'date\'},{\'name\':\'trainKeyword\',\'label\':\'关键词\',\'placeholder\':\'项目 / 中心\'}],\'查询\',\'新培库查询条件已应用\')"> 查询</button>
      <button class="btn btn-outline" onclick="showConfirmModal(\'导入新培库\',\'<p style=\'margin:0;color:#666;font-size:13px\'>请选择要导入的 Excel 文件，系统将自动解析并更新新培库数据。</p>\',\'选择文件并导入\',\'新培库数据导入中\')"> 导入Excel</button>
      <button class="btn btn-outline" onclick="showConfirmModal(\'导出新培库\',\'<p style=\'margin:0;color:#666;font-size:13px\'>当前筛选范围内的新培项目将导出为 Excel。</p>\',\'确认导出\',\'新培库已导出Excel\')"> 导出Excel</button>
      <button class="btn btn-outline" onclick="showFormModal(\'历史快照\',[{\'name\':\'snapDate\',\'label\':\'选择快照日期\',\'type\':\'select\',\'options\':[{\'value\':\'2026-06-30\',\'text\':\'2026-06-30（月末快照）\'},{\'value\':\'2026-05-31\',\'text\':\'2026-05-31（月末快照）\'},{\'value\':\'2026-04-30\',\'text\':\'2026-04-30（月末快照）\'}]}],\'查看快照\',\'已加载历史快照\')"> 历史快照</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-light)">数据实时同步 | 各中心可在线编辑</span>
      <span style="font-size:12px;padding:2px 10px;background:${COLORS.blue}20;color:${COLORS.blue};border-radius:4px;font-weight:600">当前权限：总部-全部中心</span>
    </div>
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-graduation-cap"></use></svg></div><div class="kpi-value">${data.overview.enrolled}</div><div class="kpi-label">参训人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✍️</div><div class="kpi-value">${data.overview.signed}</div><div class="kpi-label">签合同人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg></div><div class="kpi-value">${data.overview.grouped}</div><div class="kpi-label">入组人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg></div><div class="kpi-value">${data.overview.rate}%</div><div class="kpi-label">转化率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.overview.eliminated + data.overview.resigned}</div><div class="kpi-label">淘汰+离职</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg> 参训→签约→入组 转化漏斗</div>
        <div class="chart-desc">新培全流程转化率分析</div>
        <div id="newTrainFunnel" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-building-2"></use></svg> 各中心新培参训情况</div>
        <div id="newTrainCenter" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各项目新人训概览</div>
      <div id="newTrainProject" style="height:300px"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 各中心各项目明细</div>
      <table class="data-table">
        <thead><tr><th>中心</th><th>项目</th><th>参训</th><th>签约</th><th>入组</th><th>转化率</th><th>操作</th></tr></thead>
        <tbody>${data.projectDetail.map(p => `<tr><td><strong>${p.center}</strong></td><td>${p.project}</td><td>${p.enrolled}</td><td>${p.signed}</td><td>${p.grouped}</td><td><span class="tag ${p.rate>=80?'tag-success':'tag-warning'}">${p.rate}%</span></td><td><button class="btn btn-outline" style="padding:2px 10px;font-size:12px" onclick="showFormModal(\'✏ 编辑项目 - \' + rowCellText(this,1),[{\'name\':\'projName\',\'label\':\'项目名称\',\'required\':true,\'value\':rowCellText(this,1)},{\'name\':\'projManager\',\'label\':\'负责人\',\'value\':rowCellText(this,2)},{\'name\':\'projStatus\',\'label\':\'状态\',\'type\':\'select\',\'options\':[\'进行中\',\'已结项\',\'暂停\'],\'value\':\'进行中\'},{\'name\':\'projDesc\',\'label\':\'项目说明\',\'type\':\'textarea\',\'rows\':3,\'value\':rowCellText(this,3)}],\'保存\',\'modalCb_editProject\')"> 编辑</button></td></tr>`).join('')}</tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('newTrainFunnel', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { data: ['参训', '签约', '入组'], bottom: 0 },
      series: [{
        type: 'funnel',
        left: '10%', top: 20, bottom: 40, width: '80%',
        min: 0, max: data.overview.enrolled,
        minSize: '0%', maxSize: '100%',
        sort: 'descending', gap: 4,
        label: { show: true, position: 'inside', fontSize: 13, fontWeight: 'bold', color: '#fff' },
        labelLine: { length: 10, lineStyle: { width: 1, type: 'solid' } },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        emphasis: { label: { fontSize: 15 } },
        data: [
          { value: data.overview.enrolled, name: '参训', itemStyle: { color: COLORS.blue } },
          { value: data.overview.signed, name: '签约', itemStyle: { color: COLORS.green } },
          { value: data.overview.grouped, name: '入组', itemStyle: { color: COLORS.purple } }
        ]
      }]
    });
    initChart('newTrainCenter', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['参训', '签约', '入组'] },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.centerOverview.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [
        { name: '参训', type: 'bar', data: data.centerOverview.map(c => c.enrolled), itemStyle: { color: COLORS.blue } },
        { name: '签约', type: 'bar', data: data.centerOverview.map(c => c.signed), itemStyle: { color: COLORS.green } },
        { name: '入组', type: 'bar', data: data.centerOverview.map(c => c.grouped), itemStyle: { color: COLORS.purple } }
      ]
    });
    initChart('newTrainProject', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0 },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.projectDetail.map(p => `${p.center}-${p.project}`), axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: [{ type: 'value', name: '人数' }, { type: 'value', name: '转化率%', max: 100 }],
      series: [
        { name: '参训', type: 'bar', data: data.projectDetail.map(p => p.enrolled), itemStyle: { color: COLORS.blue } },
        { name: '转化率', type: 'line', yAxisIndex: 1, data: data.projectDetail.map(p => p.rate), itemStyle: { color: COLORS.orange } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 培训-知识库（基于LMS最佳实践重构） ==========
async function loadTrainKnowledge() {
  const data = await fetchAPI(API.knowledge);
  if (!data) return;

  const PALETTE_KB = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#f97316'];
  const fmtIcon = { 'PPT':'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-bar-chart-2\"></use></svg>','PDF':'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-text\"></use></svg>','视频':'🎬','Word':'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-edit\"></use></svg>' };
  const lvlColor = { '制度':'tag-success','SOP':'tag-warning','案例':'tag-danger','FAQ':'tag-gray' };
  const diffColor = { '初级':'tag-info','中级':'tag-warning','高级':'tag-danger' };
  let kbData = data;
  let kbCurrentTab = 'catalog';
  let kbCurrentCategory = '';
  let kbSearchQ = '';
  let kbViewMode = 'card';

  renderKnowledgePage();

  function renderKnowledgePage() {
    renderPage(`
      <!-- KPI概览 -->
      <div class="kpi-grid cols-5">
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[0]}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-library"></use></svg></div><div class="kpi-value">${kbData.overview.totalCourses}</div><div class="kpi-label">课件总数</div></div>
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[1]}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-eye"></use></svg></div><div class="kpi-value">${kbData.overview.totalViews.toLocaleString()}</div><div class="kpi-label">总浏览量</div></div>
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[2]}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-arrow-down"></use></svg>️</div><div class="kpi-value">${kbData.overview.totalDownloads}</div><div class="kpi-label">总下载量</div></div>
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[3]}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg></div><div class="kpi-value">${kbData.overview.activeLearners}</div><div class="kpi-label">活跃学员</div></div>
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[4]}"></div><div class="kpi-icon">⭐</div><div class="kpi-value">${kbData.overview.avgRating}</div><div class="kpi-label">平均评分</div></div>
      </div>

      <!-- Tab导航 -->
      <div class="sub-tabs" id="kbTabs">
        <button class="sub-tab ${kbCurrentTab==='catalog'?'active':''}" onclick="switchKbTab('catalog')"> 课程目录</button>
        <button class="sub-tab ${kbCurrentTab==='paths'?'active':''}" onclick="switchKbTab('paths')">🛤️ 学习路径</button>
        <button class="sub-tab ${kbCurrentTab==='stats'?'active':''}" onclick="switchKbTab('stats')"> 学习统计</button>
        <button class="sub-tab ${kbCurrentTab==='tags'?'active':''}" onclick="switchKbTab('tags')">️ 知识标签</button>
        <button class="sub-tab ${kbCurrentTab==='recent'?'active':''}" onclick="switchKbTab('recent')">🆕 最近更新</button>
      </div>

      <!-- Tab内容区 -->
      <div id="kbTabContent"></div>

      <!-- 课程详情模态框 -->
      <div id="kbModal" class="kb-modal-overlay" style="display:none">
        <div class="kb-modal">
          <div class="kb-modal-header" id="kbModalHeader"></div>
          <div class="kb-modal-body" id="kbModalBody"></div>
        </div>
      </div>
    `);
    renderKbTabContent();
  }

  window.switchKbTab = function(tab) {
    kbCurrentTab = tab;
    document.querySelectorAll('#kbTabs .sub-tab').forEach(btn => btn.classList.remove('active'));
    const tabs = document.querySelectorAll('#kbTabs .sub-tab');
    const tabMap = ['catalog','paths','stats','tags','recent'];
    tabs[tabMap.indexOf(tab)].classList.add('active');
    renderKbTabContent();
  };

  function renderKbTabContent() {
    const el = document.getElementById('kbTabContent');
    if (kbCurrentTab === 'catalog') el.innerHTML = renderCatalog();
    else if (kbCurrentTab === 'paths') el.innerHTML = renderPaths();
    else if (kbCurrentTab === 'stats') { el.innerHTML = renderStats(); setTimeout(initStatsCharts, 50); }
    else if (kbCurrentTab === 'tags') el.innerHTML = renderTags();
    else if (kbCurrentTab === 'recent') el.innerHTML = renderRecent();
  }

  // ===== Tab1: 课程目录 =====
  function renderCatalog() {
    return `
      <div style="display:flex;gap:16px">
        <!-- 左侧分类树 -->
        <div class="kb-sidebar">
          <div class="kb-sidebar-title">📁 课程分类</div>
          <div class="kb-cat-item ${!kbCurrentCategory?'active':''}" onclick="filterByCategory('')"> 全部课程 (${kbData.courses.length})</div>
          ${kbData.categoryTree.map(cat => `
            <div class="kb-cat-group">
              <div class="kb-cat-item ${kbCurrentCategory===cat.id?'active':''}" onclick="filterByCategory('${cat.id}')">
                ${cat.icon} ${cat.name} (${cat.count})
              </div>
              ${cat.children ? cat.children.map(sub => `
                <div class="kb-cat-sub ${kbCurrentCategory===sub.id?'active':''}" onclick="filterByCategory('${sub.id}')">
                  └ ${sub.name} (${sub.count})
                </div>
              `).join('') : ''}
            </div>
          `).join('')}
        </div>

        <!-- 右侧课程列表 -->
        <div style="flex:1;min-width:0">
          <div class="filter-bar">
            <input type="text" id="kbSearchInput" placeholder="搜索课程名称、标签、作者..." style="width:280px" oninput="onKbSearch(this.value)" value="${kbSearchQ}">
            <button class="btn btn-primary" onclick="onKbSearch(document.getElementById('kbSearchInput').value)"> 搜索</button>
            <select id="kbFmtFilter" onchange="onKbFilter()"><option value="">全部格式</option><option>PPT</option><option>PDF</option><option>视频</option></select>
            <select id="kbDiffFilter" onchange="onKbFilter()"><option value="">全部难度</option><option>初级</option><option>中级</option><option>高级</option></select>
            <select id="kbLvlFilter" onchange="onKbFilter()"><option value="">全部层级</option><option>制度</option><option>SOP</option><option>案例</option></select>
            <div style="margin-left:auto;display:flex;gap:4px">
              <button class="btn ${kbViewMode==='card'?'btn-primary':'btn-outline'}" style="padding:6px 12px" onclick="setKbView('card')">▦ 卡片</button>
              <button class="btn ${kbViewMode==='table'?'btn-primary':'btn-outline'}" style="padding:6px 12px" onclick="setKbView('table')">☰ 列表</button>
            </div>
            <button class="btn btn-outline" onclick="showFormModal(\'上传课件\',[{\'name\':\'courseName\',\'label\':\'课件名称\',\'required\':true},{\'name\':\'courseType\',\'label\':\'类型\',\'type\':\'select\',\'options\':[\'PPT\',\'PDF\',\'视频\',\'Word\'],\'value\':\'PPT\'},{\'name\':\'courseSize\',\'label\':\'文件大小(MB)\',\'type\':\'number\'}],\'开始上传\',\'课件上传中\')"> 上传课件</button>
          </div>

          <div id="kbCourseList">${renderCourseList()}</div>
        </div>
      </div>
    `;
  }

  function getFilteredCourses() {
    let list = kbData.courses;
    if (kbCurrentCategory) {
      list = list.filter(c => c.categoryId === kbCurrentCategory);
    }
    if (kbSearchQ) {
      const q = kbSearchQ.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || (c.tags||[]).join(' ').toLowerCase().includes(q) || (c.author||'').toLowerCase().includes(q));
    }
    const fmt = document.getElementById('kbFmtFilter')?.value || '';
    const diff = document.getElementById('kbDiffFilter')?.value || '';
    const lvl = document.getElementById('kbLvlFilter')?.value || '';
    if (fmt) list = list.filter(c => c.format === fmt);
    if (diff) list = list.filter(c => c.difficulty === diff);
    if (lvl) list = list.filter(c => c.level === lvl);
    return list;
  }

  function renderCourseList() {
    const list = getFilteredCourses();
    if (list.length === 0) return '<div class="kb-empty"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-search\"></use></svg> 未找到匹配的课程，请调整筛选条件</div>';
    if (kbViewMode === 'card') {
      return `<div class="kb-course-grid">${list.map((k,i) => `
        <div class="kb-course-card" onclick="openCourseDetail('${k.id}')">
          <div class="kb-card-top" style="background:linear-gradient(135deg,${PALETTE_KB[i%8]}22,${PALETTE_KB[i%8]}08)">
            <span class="kb-card-fmt">${fmtIcon[k.format]||'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-text\"></use></svg>'} ${k.format}</span>
            <span class="tag ${diffColor[k.difficulty]||'tag-gray'}" style="font-size:10px">${k.difficulty}</span>
          </div>
          <div class="kb-card-body">
            <div class="kb-card-title">${k.title}</div>
            <div class="kb-card-desc">${k.description}</div>
            <div class="kb-card-tags">${(k.tags||[]).slice(0,3).map(t=>`<span class="kb-tag">${t}</span>`).join('')}</div>
            <div class="kb-card-meta">
              <span>⏱️ ${k.duration}</span>
              <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-eye"></use></svg> ${k.views}</span>
              <span>⭐ ${k.rating}</span>
            </div>
            <div class="kb-card-progress">
              <div class="progress" style="flex:1"><div class="progress-bar ${k.completeRate>=80?'green':'orange'}" style="width:${k.completeRate}%"></div></div>
              <span style="font-size:11px;margin-left:6px">${k.completeRate}%</span>
            </div>
            <div class="kb-card-footer">
              <span style="font-size:11px;color:var(--text-light)">${k.author}</span>
              <span style="font-size:11px;color:var(--text-light)">${k.uploadDate}</span>
            </div>
          </div>
        </div>
      `).join('')}</div>`;
    } else {
      return `<div class="chart-card" style="padding:0;overflow:hidden">
        <table class="data-table" id="knowledgeTable">
          <thead><tr><th>编号</th><th style="min-width:200px">课程标题</th><th>分类</th><th>格式</th><th>难度</th><th>层级</th><th>时长</th><th>浏览</th><th>下载</th><th>评分</th><th>完成率</th><th>作者</th><th>操作</th></tr></thead>
          <tbody>
            ${list.map(k => `
              <tr>
                <td>${k.id}</td>
                <td><div style="font-weight:600;font-size:13px;cursor:pointer;color:var(--accent)" onclick="openCourseDetail('${k.id}')">${k.title}</div><div style="font-size:11px;color:var(--text-light);margin-top:2px">${k.description}</div></td>
                <td><span class="tag tag-info">${k.categoryName}</span></td>
                <td>${fmtIcon[k.format]||'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-text\"></use></svg>'} ${k.format}</td>
                <td><span class="tag ${diffColor[k.difficulty]||'tag-gray'}">${k.difficulty}</span></td>
                <td><span class="tag ${lvlColor[k.level]||'tag-gray'}">${k.level}</span></td>
                <td>${k.duration}</td>
                <td>${k.views}</td>
                <td>${k.downloads}</td>
                <td>⭐${k.rating}</td>
                <td><div class="progress" style="width:50px;display:inline-block;vertical-align:middle"><div class="progress-bar ${k.completeRate>=80?'green':'orange'}" style="width:${k.completeRate}%"></div></div> <span style="font-size:12px">${k.completeRate}%</span></td>
                <td>${k.author}</td>
                <td>
                  <button class="btn btn-outline" style="padding:3px 10px;font-size:12px" onclick="openCourseDetail('${k.id}')">详情</button>
                  <button class="btn btn-outline" style="padding:3px 10px;font-size:12px" onclick="showConfirmModal(\'下载文档 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>开始下载文档。</p>\',\'开始下载\',\'文档开始下载\')">下载</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="padding:12px 16px;background:var(--bg);border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--text-light)">
          <span>共 ${list.length} 条课件</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" style="padding:4px 12px;font-size:12px">⬅ 上一页</button>
            <span style="padding:4px 12px">1 / 1</span>
            <button class="btn btn-outline" style="padding:4px 12px;font-size:12px">下一页 ➡</button>
          </div>
        </div>
      </div>`;
    }
  }

  window.filterByCategory = function(catId) {
    kbCurrentCategory = catId;
    document.querySelectorAll('.kb-cat-item, .kb-cat-sub').forEach(el => el.classList.remove('active'));
    if (!catId) {
      document.querySelector('.kb-cat-item')?.classList.add('active');
    } else {
      const el = [...document.querySelectorAll('.kb-cat-item, .kb-cat-sub')].find(e => e.getAttribute('onclick')?.includes(`'${catId}'`));
      el?.classList.add('active');
    }
    document.getElementById('kbCourseList').innerHTML = renderCourseList();
  };

  window.onKbSearch = function(q) {
    kbSearchQ = q;
    document.getElementById('kbCourseList').innerHTML = renderCourseList();
  };

  window.onKbFilter = function() {
    document.getElementById('kbCourseList').innerHTML = renderCourseList();
  };

  window.setKbView = function(mode) {
    kbViewMode = mode;
    renderKbTabContent();
  };

  // ===== Tab2: 学习路径 =====
  function renderPaths() {
    return `
      <div class="kb-paths-grid">
        ${kbData.learningPaths.map((p,i) => `
          <div class="kb-path-card">
            <div class="kb-path-header" style="background:linear-gradient(135deg,${PALETTE_KB[i%8]},${PALETTE_KB[(i+1)%8]})">
              <div class="kb-path-name">${p.name}</div>
              <div class="kb-path-target"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg> ${p.target}</div>
              <div class="kb-path-meta">
                <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-library"></use></svg> ${p.courses}门课</span>
                <span>⏱️ ${p.duration}</span>
                <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg> ${p.enrolled}人</span>
              </div>
            </div>
            <div class="kb-path-body">
              <div class="kb-path-desc">${p.description}</div>
              <div class="kb-path-steps">
                ${p.steps.map((s,idx) => `
                  <div class="kb-path-step">
                    <div class="kb-step-num" style="background:${PALETTE_KB[i%8]}">${idx+1}</div>
                    <div class="kb-step-info">
                      <div class="kb-step-title">${s.title} ${s.required?'<span class="tag tag-danger" style="font-size:9px;padding:1px 4px">必修</span>':'<span class="tag tag-gray" style="font-size:9px;padding:1px 4px">选修</span>'}</div>
                      <div class="kb-step-meta">⏱️ ${s.duration}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="kb-path-progress-wrap">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
                  <span style="color:var(--text-light)">完成率</span>
                  <span style="font-weight:600;color:${p.completionRate>=70?'var(--success)':p.completionRate>=40?'var(--warning)':'var(--danger)'}">${p.completionRate}%</span>
                </div>
                <div class="progress"><div class="progress-bar ${p.completionRate>=70?'green':p.completionRate>=40?'orange':'red'}" style="width:${p.completionRate}%"></div></div>
                <div style="font-size:11px;color:var(--text-light);margin-top:4px">已完成 ${p.completed}/${p.enrolled} 人</div>
              </div>
              <button class="btn btn-primary kb-path-btn" onclick="showConfirmModal(\'学习路径 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>将按课程顺序开启学习路径。</p>\',\'开始学习\',\'已开启学习路径\')">开始学习 →</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ===== Tab3: 学习统计 =====
  function renderStats() {
    return `
      <div class="row cols-2">
        <div class="chart-card">
          <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 月度浏览与下载趋势</div>
          <div id="kbChartTrend" style="height:280px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 课程分类分布</div>
          <div id="kbChartCategory" style="height:280px"></div>
        </div>
      </div>
      <div class="row cols-2">
        <div class="chart-card">
          <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trophy"></use></svg> 热门课程 TOP5</div>
          <div id="kbChartTopCourses" style="height:280px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-user"></use></svg> 学习达人榜</div>
          <table class="data-table" style="margin-top:12px">
            <thead><tr><th>排名</th><th>姓名</th><th>中心</th><th>学习时长</th><th>完成课程</th></tr></thead>
            <tbody>
              ${kbData.trends.topLearners.map((l,i) => `
                <tr>
                  <td><span style="font-size:18px">${['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span></td>
                  <td style="font-weight:600">${l.name}</td>
                  <td>${l.center}</td>
                  <td>${l.hours}h</td>
                  <td>${l.courses}门</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function initStatsCharts() {
    // 趋势图
    const trendEl = document.getElementById('kbChartTrend');
    if (trendEl) {
      const chart = echarts.init(trendEl);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['浏览量','下载量'], bottom: 0 },
        grid: { left: '3%', right: '4%', top: '5%', containLabel: true },
        xAxis: { type: 'category', data: kbData.trends.monthlyViews.map(m=>m.month) },
        yAxis: { type: 'value' },
        series: [
          { name: '浏览量', type: 'line', smooth: true, data: kbData.trends.monthlyViews.map(m=>m.views), itemStyle: { color: '#3b82f6' }, areaStyle: { color: 'rgba(59,130,246,0.1)' } },
          { name: '下载量', type: 'bar', data: kbData.trends.monthlyViews.map(m=>m.downloads), itemStyle: { color: '#10b981' } }
        ]
      });
      charts.kbTrend = chart;
    }
    // 分类饼图
    const catEl = document.getElementById('kbChartCategory');
    if (catEl) {
      const chart = echarts.init(catEl);
      chart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: 0, type: 'scroll' },
        series: [{
          type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
          data: kbData.trends.categoryDistribution.map((c,i) => ({ name: c.name, value: c.value, itemStyle: { color: PALETTE_KB[i%8] } }))
        }]
      });
      charts.kbCategory = chart;
    }
    // 热门课程柱状图
    const topEl = document.getElementById('kbChartTopCourses');
    if (topEl) {
      const chart = echarts.init(topEl);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '5%', top: '5%', containLabel: true },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: kbData.trends.topCourses.map(c=>c.title).reverse(), axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar', data: kbData.trends.topCourses.map(c=>c.views).reverse(),
          itemStyle: { color: function(p) { return PALETTE_KB[(4-p.dataIndex)%8]; }, borderRadius: [0,4,4,0] },
          barWidth: 18,
          label: { show: true, position: 'right', fontSize: 11 }
        }]
      });
      charts.kbTopCourses = chart;
    }
  }

  // ===== Tab4: 知识标签 =====
  function renderTags() {
    const maxCount = Math.max(...kbData.tagCloud.map(t=>t.count));
    return `
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-tag"></use></svg>️ 知识标签云</div>
        <div class="kb-tag-cloud">
          ${kbData.tagCloud.map(t => `
            <span class="kb-tag-cloud-item" style="font-size:${12+Math.round((t.count/maxCount)*16)}px;color:${t.color};border-color:${t.color}33;background:${t.color}11" onclick="searchByTag('${t.tag}')">
              ${t.tag} <span style="font-size:11px;opacity:0.7">(${t.count})</span>
            </span>
          `).join('')}
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 标签关联课程</div>
        <div class="kb-tag-list">
          ${kbData.tagCloud.map(t => `
            <div class="kb-tag-row">
              <span class="kb-tag-label" style="background:${t.color}15;color:${t.color};border:1px solid ${t.color}33">${t.tag}</span>
              <span style="font-size:13px;color:var(--text-light)">${t.count} 门课程</span>
              <button class="btn btn-outline" style="padding:3px 10px;font-size:12px;margin-left:auto" onclick="searchByTag('${t.tag}')">查看课程 →</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  window.searchByTag = function(tag) {
    kbCurrentTab = 'catalog';
    kbSearchQ = tag;
    kbCurrentCategory = '';
    renderKnowledgePage();
    document.getElementById('kbSearchInput').value = tag;
  };

  // ===== Tab5: 最近更新 =====
  function renderRecent() {
    const sorted = [...kbData.courses].sort((a,b) => b.uploadDate.localeCompare(a.uploadDate)).slice(0, 10);
    return `
      <div class="chart-card">
        <div class="chart-title">🆕 最近10条更新课件</div>
        <div class="kb-recent-timeline">
          ${sorted.map((k,i) => `
            <div class="kb-recent-item">
              <div class="kb-recent-dot" style="background:${PALETTE_KB[i%8]}"></div>
              <div class="kb-recent-content" onclick="openCourseDetail('${k.id}')">
                <div class="kb-recent-title">${fmtIcon[k.format]||'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-text\"></use></svg>'} ${k.title}</div>
                <div class="kb-recent-meta">
                  <span class="tag tag-info" style="font-size:10px">${k.categoryName}</span>
                  <span style="margin-left:8px">${k.author}</span>
                  <span style="margin-left:8px"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar"></use></svg> ${k.uploadDate}</span>
                  <span style="margin-left:8px"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-eye"></use></svg> ${k.views}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ===== 课程详情模态框 =====
  window.openCourseDetail = function(courseId) {
    const k = kbData.courses.find(c => c.id === courseId);
    if (!k) return;
    document.getElementById('kbModalHeader').innerHTML = `
      <div class="kb-modal-title">${fmtIcon[k.format]||'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-text\"></use></svg>'} ${k.title}</div>
      <button class="kb-modal-close" onclick="closeKbModal()">✕</button>
    `;
    document.getElementById('kbModalBody').innerHTML = `
      <div class="kb-detail-section">
        <div class="kb-detail-desc">${k.description}</div>
        <div class="kb-detail-tags">${(k.tags||[]).map(t=>`<span class="kb-tag">${t}</span>`).join('')}</div>
      </div>
      <div class="kb-detail-grid">
        <div class="kb-detail-item"><span class="kb-detail-label">分类</span><span class="kb-detail-val">${k.categoryName}</span></div>
        <div class="kb-detail-item"><span class="kb-detail-label">格式</span><span class="kb-detail-val">${k.format} (${k.size})</span></div>
        <div class="kb-detail-item"><span class="kb-detail-label">难度</span><span class="kb-detail-val"><span class="tag ${diffColor[k.difficulty]||'tag-gray'}">${k.difficulty}</span></span></div>
        <div class="kb-detail-item"><span class="kb-detail-label">层级</span><span class="kb-detail-val"><span class="tag ${lvlColor[k.level]||'tag-gray'}">${k.level}</span></span></div>
        <div class="kb-detail-item"><span class="kb-detail-label">时长</span><span class="kb-detail-val">⏱️ ${k.duration}</span></div>
        <div class="kb-detail-item"><span class="kb-detail-label">作者</span><span class="kb-detail-val">${k.author}</span></div>
        <div class="kb-detail-item"><span class="kb-detail-label">目标学员</span><span class="kb-detail-val">${k.targetAudience}</span></div>
        <div class="kb-detail-item"><span class="kb-detail-label">上传日期</span><span class="kb-detail-val">${k.uploadDate}</span></div>
      </div>
      <div class="kb-detail-section">
        <div class="kb-detail-subtitle"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-book-opened"></use></svg> 课程章节</div>
        <div class="kb-chapter-list">
          ${k.chapters.map((ch,idx) => `
            <div class="kb-chapter-item">
              <div class="kb-chapter-num">${idx+1}</div>
              <div class="kb-chapter-name">${ch}</div>
              <div class="kb-chapter-status"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg> 可学习</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="kb-detail-section">
        <div class="kb-detail-subtitle"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 学习数据</div>
        <div class="kb-detail-stats">
          <div class="kb-stat-box"><div class="kb-stat-val">${k.views}</div><div class="kb-stat-lbl">浏览量</div></div>
          <div class="kb-stat-box"><div class="kb-stat-val">${k.downloads}</div><div class="kb-stat-lbl">下载量</div></div>
          <div class="kb-stat-box"><div class="kb-stat-val">${k.completeRate}%</div><div class="kb-stat-lbl">完成率</div></div>
          <div class="kb-stat-box"><div class="kb-stat-val">⭐${k.rating}</div><div class="kb-stat-lbl">评分</div></div>
        </div>
      </div>
      <div class="kb-detail-actions">
        <button class="btn btn-primary" onclick="showConfirmModal(\'▶ 在线学习 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>进入在线学习模式。</p>\',\'开始学习\',\'已进入在线学习\')">▶️ 开始学习</button>
        <button class="btn btn-outline" onclick="showConfirmModal(\'下载文档 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>开始下载文档。</p>\',\'开始下载\',\'文档开始下载\')">️ 下载课件</button>
        <button class="btn btn-outline" onclick="showConfirmModal(\'⭐ 收藏 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>已将课件加入收藏。</p>\',\'好的\',\'已收藏\')">⭐ 收藏</button>
        <button class="btn btn-outline" onclick="showConfirmModal(\'分享\',\'<p style=\'margin:0;color:#666;font-size:13px\'>分享链接已复制到剪贴板。</p>\',\'好的\',\'分享链接已复制\')"> 分享</button>
      </div>
    `;
    document.getElementById('kbModal').style.display = 'flex';
  };

  window.closeKbModal = function() {
    document.getElementById('kbModal').style.display = 'none';
  };

  // 点击遮罩关闭
  setTimeout(() => {
    const overlay = document.getElementById('kbModal');
    if (overlay) overlay.onclick = function(e) { if (e.target === this) closeKbModal(); };
  }, 100);
}

// ========== 培训-题库与考试 ==========
async function loadTrainExam() {
  const data = await fetchAPI(API.questionBank);
  if (!data) return;
  const typeColors = { '单选': 'tag-info', '多选': 'tag-warning', '判断': 'tag-success', '简答': 'tag-gray' };
  // 月度考试统计（基于现有数据派生）
  const monthExamCount = data.exams.length;
  const totalCandidates = data.exams.reduce((s, e) => s + e.candidates, 0);
  const avgPassRate = (data.exams.reduce((s, e) => s + e.passRate, 0) / data.exams.length).toFixed(1);
  const maxScore = Math.max(...data.exams.map(e => e.avgScore));
  // 成绩分布（基于平均分派生示意数据）
  const scoreDist = [12, 28, 65, 110, 85];
  // 高频错题（基于题库派生）
  const wrongRanking = [
    { question: '催收过程中遇到债务人提出异议时的标准处理流程', errorRate: '45.2%', knowledge: '异议处理流程', suggestion: '加强异议处理话术培训' },
    { question: '以下哪些属于违规催收行为？', errorRate: '38.6%', knowledge: '合规催收规范', suggestion: '复习《合规催收管理办法》' },
    { question: '调解中心三手案件的首次跟进时限是多久？', errorRate: '32.1%', knowledge: '调解中心流程', suggestion: '组织调解中心专项培训' },
    { question: '催收电话拨打时间应在哪个时间段进行？', errorRate: '25.8%', knowledge: '催收时间规范', suggestion: '晨会反复强调' },
    { question: '催收人员可以向第三方透露债务人的欠款信息', errorRate: '18.3%', knowledge: '信息保密制度', suggestion: '已掌握，保持巩固' }
  ];
  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-file-edit"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">题目总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">🔘</div><div class="kpi-value">${data.overview.single}</div><div class="kpi-label">单选题</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">☑️</div><div class="kpi-value">${data.overview.multi}</div><div class="kpi-label">多选题</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.judge}</div><div class="kpi-label">判断题</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">✍️</div><div class="kpi-value">${data.overview.essay}</div><div class="kpi-label">简答题</div></div>
    </div>
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar"></use></svg></div><div class="kpi-value">${monthExamCount}</div><div class="kpi-label">本月考试次数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg></div><div class="kpi-value">${totalCandidates}</div><div class="kpi-label">累计参考人次</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg></div><div class="kpi-value">${avgPassRate}%</div><div class="kpi-label">平均通过率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trophy"></use></svg></div><div class="kpi-value">${maxScore}</div><div class="kpi-label">最高分</div></div>
    </div>
    <div class="filter-bar" style="gap:0;border-bottom:2px solid var(--border);margin-bottom:16px">
      <button class="btn btn-primary" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px;color:#fff" onclick="document.querySelectorAll('[id^=teTab-]').forEach(el=>el.style.display='none');document.getElementById('teTab-exam').style.display='block';this.parentNode.querySelectorAll('button').forEach(b=>{b.style.background='var(--card)';b.style.color='var(--text)'});this.style.background='var(--accent)';this.style.color='#fff'">考试管理</button>
      <button class="btn btn-outline" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px;border:1px solid var(--border);border-bottom:none" onclick="document.querySelectorAll('[id^=teTab-]').forEach(el=>el.style.display='none');document.getElementById('teTab-question').style.display='block';this.parentNode.querySelectorAll('button').forEach(b=>{b.style.background='var(--card)';b.style.color='var(--text)'});this.style.background='var(--accent)';this.style.color='#fff'">题库管理</button>
      <button class="btn btn-outline" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px;border:1px solid var(--border);border-bottom:none" onclick="document.querySelectorAll('[id^=teTab-]').forEach(el=>el.style.display='none');document.getElementById('teTab-score').style.display='block';this.parentNode.querySelectorAll('button').forEach(b=>{b.style.background='var(--card)';b.style.color='var(--text)'});this.style.background='var(--accent)';this.style.color='#fff'">成绩看板</button>
      <button class="btn btn-outline" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px;border:1px solid var(--border);border-bottom:none" onclick="document.querySelectorAll('[id^=teTab-]').forEach(el=>el.style.display='none');document.getElementById('teTab-wrong').style.display='block';this.parentNode.querySelectorAll('button').forEach(b=>{b.style.background='var(--card)';b.style.color='var(--text)'});this.style.background='var(--accent)';this.style.color='#fff'">错题分析</button>
    </div>
    <div id="teTab-exam" style="display:block">
      <div class="chart-card">
        <div class="chart-title"> 考试列表 <div style="float:right;display:flex;gap:6px"><button class="btn btn-primary" style="padding:4px 12px;font-size:12px" onclick="showFormModal(\'创建考试\',[{\'name\':\'examName\',\'label\':\'考试名称\',\'required\':true},{\'name\':\'examTime\',\'label\':\'考试时间\'},{\'name\':\'examPeople\',\'label\':\'应考人员\'},{\'name\':\'examScope\',\'label\':\'题目范围\',\'type\':\'textarea\',\'rows\':2}],\'创建考试\',\'考试已创建\')"> 创建考试</button><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'自动组卷\',\'<p style=\'margin:0;color:#666;font-size:13px\'>按题型比例（单选40%/多选25%/判断25%/简答10%）自动组卷。</p>\',\'开始组卷\',\'已启动自动组卷\')">⚡ 自动组卷</button></div></div>
        <table class="data-table">
          <thead><tr><th>考试编号</th><th>考试名称</th><th>应考</th><th>已交</th><th>平均分</th><th>通过率</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            ${data.exams.map(e => `<tr><td>${e.id}</td><td><strong>${e.name}</strong></td><td>${e.candidates}</td><td>${e.submitted}</td><td>${e.avgScore}</td><td><span class="tag ${e.passRate>=90?'tag-success':'tag-warning'}">${e.passRate}%</span></td><td><span class="tag ${e.status==='进行中'?'tag-info':'tag-gray'}">${e.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'考试详情 - \' + rowCellText(this,1),rowDetailHTML(this))">查看</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div id="teTab-question" style="display:none">
      <div class="chart-card">
        <div class="chart-title"> 题库预览 <div style="float:right;display:flex;gap:6px"><button class="btn btn-primary" style="padding:4px 12px;font-size:12px" onclick="showFormModal(\'录入题目\',[{\'name\':\'qType\',\'label\':\'题型\',\'type\':\'select\',\'options\':[\'单选\',\'多选\',\'判断\',\'简答\'],\'value\':\'单选\'},{\'name\':\'qStem\',\'label\':\'题干\',\'type\':\'textarea\',\'required\':true,\'rows\':3},{\'name\':\'qAnswer\',\'label\':\'答案\',\'type\':\'textarea\',\'required\':true,\'rows\':2},{\'name\':\'qDiff\',\'label\':\'难度\',\'type\':\'select\',\'options\':[\'易\',\'中\',\'难\'],\'value\':\'中\'}],\'保存题目\',\'题目已录入\')"> 录入题目</button><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'下载文档 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>开始下载文档。</p>\',\'开始下载\',\'文档开始下载\')"> 批量导入</button></div></div>
        <table class="data-table">
          <thead><tr><th>编号</th><th>类型</th><th>题目</th><th>选项</th><th>答案</th><th>难度</th></tr></thead>
          <tbody>
            ${data.questions.map(q => `<tr><td>${q.id}</td><td><span class="tag ${typeColors[q.type]||'tag-gray'}">${q.type}</span></td><td style="max-width:300px">${q.question}</td><td style="font-size:12px;color:var(--text-light)">${q.options.length ? q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('<br>') : '—'}</td><td><strong>${q.answer}</strong></td><td><span class="tag ${q.difficulty==='简单'?'tag-success':q.difficulty==='中等'?'tag-warning':'tag-danger'}">${q.difficulty}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div id="teTab-score" style="display:none">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 成绩分布</div>
        <div class="chart-desc">各分数段参考人数分布</div>
        <div id="examScoreDist" style="height:320px"></div>
      </div>
    </div>
    <div id="teTab-wrong" style="display:none">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg> 高频错题排行 TOP5</div>
        <div class="chart-desc">基于近期考试数据统计</div>
        <table class="data-table">
          <thead><tr><th>排名</th><th>题目</th><th>错误率</th><th>知识点</th><th>改进建议</th></tr></thead>
          <tbody>
            ${wrongRanking.map((w, i) => `<tr><td><strong>${i + 1}</strong></td><td style="max-width:300px">${w.question}</td><td><span class="tag ${i < 2 ? 'tag-danger' : i < 4 ? 'tag-warning' : 'tag-success'}">${w.errorRate}</span></td><td>${w.knowledge}</td><td style="font-size:12px;color:var(--text-light)">${w.suggestion}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('examScoreDist', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['人数'] },
      grid: { left: 50, right: 20, top: 30, bottom: 40 },
      xAxis: { type: 'category', data: ['0-59分', '60-69分', '70-79分', '80-89分', '90-100分'] },
      yAxis: { type: 'value', name: '人数' },
      series: [{
        name: '人数', type: 'bar', data: scoreDist,
        itemStyle: { color: function(p) { const colors = [COLORS.red, COLORS.orange, COLORS.blue, COLORS.green, COLORS.purple]; return colors[p.dataIndex]; } },
        label: { show: true, position: 'top', formatter: '{c}人' },
        barWidth: '40%'
      }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 人事-编制看板 ==========
async function loadHrHeadcount() {
  const data = await fetchAPI(API.headcount);
  if (!data) return;
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${data.overview.planned}</div><div class="kpi-label">编制总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.actual}</div><div class="kpi-label">在岗人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.overview.vacant}</div><div class="kpi-label">空缺人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg></div><div class="kpi-value">${data.overview.rate}%</div><div class="kpi-label">编制使用率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各部门编制使用</div>
        <div id="deptHeadcount" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-building-2"></use></svg> 各中心编制使用率</div>
        <div id="centerHeadcount" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 编制明细</div>
      <table class="data-table">
        <thead><tr><th>部门</th><th>编制数</th><th>在岗数</th><th>空缺</th><th>招聘中</th><th>使用率</th><th>状态</th></tr></thead>
        <tbody>
          ${data.departments.map(d => {
            const rate = ((d.actual/d.planned)*100).toFixed(1);
            const status = rate >= 95 ? ['tag-success','正常'] : rate >= 90 ? ['tag-warning','偏低'] : ['tag-danger','空缺大'];
            return `<tr><td><strong>${d.name}</strong></td><td>${d.planned}</td><td>${d.actual}</td><td>${d.vacant}</td><td>${d.recruiting}</td><td>${rate}%</td><td><span class="tag ${status[0]}">${status[1]}</span></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('deptHeadcount', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['编制', '在岗', '空缺'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.departments.map(d => d.name), axisLabel: { rotate: 20 } },
      yAxis: { type: 'value' },
      series: [
        { name: '编制', type: 'bar', data: data.departments.map(d => d.planned), itemStyle: { color: COLORS.blue } },
        { name: '在岗', type: 'bar', data: data.departments.map(d => d.actual), itemStyle: { color: COLORS.green } },
        { name: '空缺', type: 'bar', data: data.departments.map(d => d.vacant), itemStyle: { color: COLORS.red } }
      ]
    });
    initChart('centerHeadcount', {
      tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}: {c}%' },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.centers.map(c => c.center) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{ type: 'bar', data: data.centers.map(c => c.rate), itemStyle: { color: function(p) { const r = p.value; return r >= 95 ? COLORS.green : r >= 90 ? COLORS.orange : COLORS.red; } }, label: { show: true, position: 'top', formatter: '{c}%' } }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 人事-入转调离 ==========
async function loadHrProcess() {
  const data = await fetchAPI(API.hrProcesses);
  if (!data) return;
  const typeMap = { '入职': 'tag-info', '转正': 'tag-success', '调岗': 'tag-warning', '离职': 'tag-danger' };
  const statusMap = { '审批中': 'tag-warning', '已通过': 'tag-success', '已驳回': 'tag-danger' };
  // KPI 统计
  const pending = data.filter(p => p.status === '审批中').length;
  const passed = data.filter(p => p.status === '已通过').length;
  const rejected = data.filter(p => p.status === '已驳回').length;
  const avgDays = (2.5 + Math.random() * 1.5).toFixed(1); // 基于数据派生的示意值
  // 审批节点链定义
  const flowSteps = {
    '入职': ['提交申请', '部门负责人审批', 'HR审核', '总经理审批', '完成'],
    '转正': ['提交申请', '部门负责人审批', 'HR审核', '完成'],
    '调岗': ['提交申请', '调出部门审批', '调入部门审批', 'HR审核', '完成'],
    '离职': ['提交申请', '部门负责人审批', '交接确认', 'HR审核', '完成']
  };
  // 月度趋势数据（基于类型派生）
  const trendData = {
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
    '入职': [3, 5, 4, 6, 8, 7, 2],
    '转正': [2, 3, 4, 3, 5, 4, 1],
    '调岗': [1, 2, 1, 3, 2, 1, 1],
    '离职': [2, 1, 3, 2, 1, 2, 1]
  };
  // 计算审批进度
  function getProgress(p) {
    const steps = flowSteps[p.type] || [];
    const idx = steps.indexOf(p.currentStep);
    if (idx < 0) return p.status === '已通过' ? 100 : 0;
    return Math.round(((idx + 1) / steps.length) * 100);
  }
  // 生成审批节点链文本
  function getFlowChain(p) {
    const steps = flowSteps[p.type] || [];
    return steps.join(' → ');
  }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-hourglass"></use></svg></div><div class="kpi-value">${pending}</div><div class="kpi-label">审批中数量</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${passed}</div><div class="kpi-label">本月已通过</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-x-circle"></use></svg></div><div class="kpi-value">${rejected}</div><div class="kpi-label">本月已驳回</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">⏱️</div><div class="kpi-value">${avgDays}</div><div class="kpi-label">平均审批时长(天)</div></div>
    </div>
    <div class="filter-bar" style="gap:0;border-bottom:2px solid var(--border);margin-bottom:16px">
      <button class="btn btn-primary" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px" onclick="hrProcessFilter('全部', this)">全部</button>
      <button class="btn btn-outline" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px;border:1px solid var(--border);border-bottom:none" onclick="hrProcessFilter('入职', this)">入职</button>
      <button class="btn btn-outline" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px;border:1px solid var(--border);border-bottom:none" onclick="hrProcessFilter('转正', this)">转正</button>
      <button class="btn btn-outline" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px;border:1px solid var(--border);border-bottom:none" onclick="hrProcessFilter('调岗', this)">调岗</button>
      <button class="btn btn-outline" style="border-radius:6px 6px 0 0;padding:8px 20px;font-size:13px;border:1px solid var(--border);border-bottom:none" onclick="hrProcessFilter('离职', this)">离职</button>
      <div style="margin-left:auto;position:relative">
        <button class="btn btn-primary" style="padding:6px 16px;font-size:13px" onclick="var d=this.nextElementSibling;d.style.display=d.style.display==='block'?'none':'block'"> 发起流程 ▾</button>
        <div style="display:none;position:absolute;right:0;top:100%;background:var(--card);border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10;min-width:140px">
          <div style="padding:8px 16px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--card)';this.style.color='var(--text)'" onclick="this.parentNode.style.display='none';alert('发起入职流程：\\n- 员工姓名\\n- 入职部门\\n- 入职日期\\n- 岗位职级')"> 入职流程</div>
          <div style="padding:8px 16px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--card)';this.style.color='var(--text)'" onclick="this.parentNode.style.display='none';alert('发起转正流程：\\n- 员工姓名\\n- 试用期起止\\n- 转正部门\\n- 考核结论')"> 转正流程</div>
          <div style="padding:8px 16px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--card)';this.style.color='var(--text)'" onclick="this.parentNode.style.display='none';alert('发起调岗流程：\\n- 员工姓名\\n- 调出部门\\n- 调入部门\\n- 调岗原因')"> 调岗流程</div>
          <div style="padding:8px 16px;cursor:pointer;font-size:13px" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--card)';this.style.color='var(--text)'" onclick="this.parentNode.style.display='none';alert('发起离职流程：\\n- 员工姓名\\n- 离职部门\\n- 离职日期\\n- 离职原因')"> 离职流程</div>
        </div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg> 入转调离流程列表</div>
      <table class="data-table">
        <thead><tr><th>流程编号</th><th>类型</th><th>申请人</th><th>部门/调转</th><th>中心</th><th>申请日期</th><th>当前节点</th><th>审批进度</th><th>状态</th><th>操作</th></tr></thead>
        <tbody id="hrProcessBody">
          ${data.map(p => {
            const prog = getProgress(p);
            const progColor = prog >= 100 ? COLORS.green : prog >= 60 ? COLORS.blue : COLORS.orange;
            return `<tr data-type="${p.type}"><td>${p.id}</td><td><span class="tag ${typeMap[p.type]}">${p.type}</span></td><td><strong>${p.applicant}</strong></td><td>${p.department || p.from + ' → ' + p.to}</td><td>${p.center}</td><td>${p.date}</td><td>${p.currentStep}</td><td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;min-width:80px"><div style="width:${prog}%;height:100%;background:${progColor};transition:width .3s"></div></div><span style="font-size:11px;color:var(--text-light);white-space:nowrap">${prog}%</span></div></td><td><span class="tag ${statusMap[p.status]}">${p.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'审批详情 - \' + rowCellText(this,0),rowDetailHTML(this))">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 月度趋势</div>
      <div class="chart-desc">各类型入转调离月度数量</div>
      <div id="hrProcessTrend" style="height:320px"></div>
    </div>
  `);
  // Tab 过滤函数
  window.hrProcessFilter = function(type, btn) {
    const rows = document.querySelectorAll('#hrProcessBody tr');
    rows.forEach(r => { r.style.display = (type === '全部' || r.dataset.type === type) ? '' : 'none'; });
    btn.parentNode.querySelectorAll('button').forEach(b => {
      b.style.background = 'var(--card)';
      b.style.color = 'var(--text)';
    });
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
  };
  setTimeout(() => {
    disposeCharts();
    initChart('hrProcessTrend', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['入职', '转正', '调岗', '离职'] },
      grid: { left: 50, right: 20, top: 30, bottom: 50 },
      xAxis: { type: 'category', data: trendData.months },
      yAxis: { type: 'value', name: '件数' },
      series: [
        { name: '入职', type: 'bar', data: trendData['入职'], itemStyle: { color: COLORS.blue } },
        { name: '转正', type: 'bar', data: trendData['转正'], itemStyle: { color: COLORS.green } },
        { name: '调岗', type: 'bar', data: trendData['调岗'], itemStyle: { color: COLORS.orange } },
        { name: '离职', type: 'bar', data: trendData['离职'], itemStyle: { color: COLORS.red } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 人事-合同到期 ==========
async function loadHrContract() {
  const data = await fetchAPI(API.contracts);
  if (!data) return;
  const statusMap = { '紧急': 'tag-danger', '即将到期': 'tag-warning', '正常': 'tag-success' };
  const in30 = data.filter(c=>c.daysLeft<=30).length;
  const in60 = data.filter(c=>c.daysLeft>30&&c.daysLeft<=60).length;
  const in90 = data.filter(c=>c.daysLeft>60&&c.daysLeft<=90).length;
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-triangle"></use></svg></div><div class="kpi-value">${in30}</div><div class="kpi-label">30天内到期</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${in60}</div><div class="kpi-label">30-60天到期</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar"></use></svg></div><div class="kpi-value">${in90}</div><div class="kpi-label">60-90天到期</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${data.length}</div><div class="kpi-label">待续签合同总数</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"> 合同到期分级预警 <div style="float:right;display:flex;gap:6px"><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'推送续签提醒\',\'<p style=\'margin:0;color:#666;font-size:13px\'>向员工推送企业微信续签提醒。</p>\',\'确认推送\',\'续签提醒已推送\')"> 推送提醒</button><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'导出预警清单\',\'<p style=\'margin:0;color:#666;font-size:13px\'>合同预警清单将导出为 Excel。</p>\',\'确认导出\',\'合同预警清单已导出\')"> 导出</button></div></div>
      <table class="data-table">
        <thead><tr><th>合同编号</th><th>姓名</th><th>部门</th><th>中心</th><th>合同类型</th><th>开始日期</th><th>到期日期</th><th>剩余天数</th><th>预警级别</th><th>续签状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.sort((a,b)=>a.daysLeft-b.daysLeft).map(c => {
            const level = c.daysLeft<=30 ? 'tag-danger' : c.daysLeft<=60 ? 'tag-warning' : 'tag-info';
            const levelText = c.daysLeft<=30 ? '30天' : c.daysLeft<=60 ? '60天' : '90天';
            return `<tr><td>${c.id}</td><td><strong>${c.name}</strong></td><td>${c.department}</td><td>${c.center}</td><td>${c.type}</td><td>${c.startDate}</td><td>${c.endDate}</td><td><strong style="color:${c.daysLeft<=30?'var(--danger)':c.daysLeft<=60?'var(--warning)':'var(--text-light)'}">${c.daysLeft}天</strong></td><td><span class="tag ${level}">${levelText}</span></td><td><span class="tag tag-warning">${c.renewStatus||'待处理'}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showFormModal(\'发起续签 - \' + rowCellText(this,0),[{\'name\':\'renewMonths\',\'label\':\'续签时长(月)\',\'type\':\'number\',\'value\':\'12\'},{\'name\':\'renewNote\',\'label\':\'备注\',\'type\':\'textarea\',\'rows\':2}],\'确认发起\',\'续签流程已发起\')">续签</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 行政-办公用品 ==========
async function loadAdminSupplies() {
  const rawData = await fetchAPI(API.supplies);
  // 虚拟数据 fallback：API 无效/无 items 时使用（原代码 if(!data)return 导致白屏）
  const hasValidData = rawData && rawData.items && Array.isArray(rawData.items) && rawData.items.length > 0;
  const data = hasValidData ? rawData : {
    items: [
      { id:'SP001', name:'A4打印纸', category:'办公文具', stock:150, unit:'包', safetyStock:50, status:'正常' },
      { id:'SP002', name:'中性笔(黑色)', category:'办公文具', stock:8, unit:'盒', safetyStock:20, status:'预警' },
      { id:'SP003', name:'文件夹(A4)', category:'办公文具', stock:5, unit:'包', safetyStock:15, status:'预警' },
      { id:'SP004', name:'订书机', category:'办公设备', stock:12, unit:'个', safetyStock:10, status:'正常' },
      { id:'SP005', name:'计算器', category:'办公设备', stock:6, unit:'台', safetyStock:8, status:'预警' },
      { id:'SP006', name:'回形针', category:'办公文具', stock:30, unit:'盒', safetyStock:10, status:'正常' },
      { id:'SP007', name:'便利贴', category:'办公文具', stock:2, unit:'包', safetyStock:10, status:'预警' },
      { id:'SP008', name:'档案盒', category:'办公文具', stock:25, unit:'个', safetyStock:15, status:'正常' }
    ],
    usage: [
      { month:'1月', count: 45 }, { month:'2月', count: 38 }, { month:'3月', count: 52 },
      { month:'4月', count: 41 }, { month:'5月', count: 48 }, { month:'6月', count: 55 }
    ]
  };
  // 兼容原始数据结构
  const items = data.items || [];
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-package"></use></svg></div><div class="kpi-value">${items.length}</div><div class="kpi-label">物品种类</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${items.reduce((s,i)=>s+(i.stock||0),0)}</div><div class="kpi-label">库存总量</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${items.filter(i=>i.status==='预警').length}</div><div class="kpi-label">库存预警</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-upload"></use></svg></div><div class="kpi-value">${(data.usage && data.usage.length) ? data.usage[data.usage.length-1].count : 0}</div><div class="kpi-label">本月领用</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 月度领用趋势</div>
        <div id="suppliesTrend" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg> 库存预警</div>
        <div style="margin-top:8px">
          ${data.items.filter(i=>i.status==='预警').map(i => `<div class="alert-item alert-danger"><span class="alert-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-package"></use></svg></span><div><strong>${i.name}</strong> - 当前库存: ${i.stock}${i.unit}，低于安全库存 ${i.safetyStock}${i.unit}</div></div>`).join('') || '<div class="alert-item alert-success"><span class="alert-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg></span><div>暂无库存预警</div></div>'}
        </div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 库存明细</div>
      <div class="filter-bar">
        <button class="btn btn-primary"  id="zg_btn_0"> 入库</button>
        <button class="btn btn-outline"  id="zg_btn_1"> 领用</button>
        <button class="btn btn-outline"  id="zg_btn_2"> 出库</button>
        <button class="btn btn-outline" onclick="showDetailModal('导出库存明细','<div style=\'padding:24px;text-align:center\'><div style=\'font-size:48px;margin-bottom:16px\'></div><div style=\'font-size:16px;font-weight:600;margin-bottom:8px\'>导出库存明细</div><div style=\'font-size:13px;color:#888;margin-bottom:20px\'>当前共有 <strong>' + ${items.length} + '</strong> 种物品记录</div><button class=\'btn btn-primary\' style=\'width:200px\' onclick=\'closeDetailModal();alert(\\'库存明细已导出为 Excel\\n\\n文件名：办公用品库存_20260720.xlsx')确认导出</button></div>')"> 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>物品名称</th><th>分类</th><th>库存</th><th>安全库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${items.map(i => '<tr><td>' + i.id + '</td><td><strong>' + i.name + '</strong></td><td>' + i.category + '</td><td>' + (i.stock||0) + ' ' + (i.unit||'') + '</td><td>' + (i.safetyStock||0) + ' ' + (i.unit||'') + '</td><td><span class="tag ' + (i.status==='预警'?'tag-danger':'tag-success') + '">' + i.status + '</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showSupplyRequisitionDetail({id:\'' + i.id + '\',name:\'' + i.name + '\',stock:' + (i.stock||0) + ',unit:\'' + (i.unit||'') + '\',safetyStock:' + (i.safetyStock||0) + '})">领用</button> <button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showSupplyOutboundDetail({id:\'' + i.id + '\',name:\'' + i.name + '\',stock:' + (i.stock||0) + ',unit:\'' + (i.unit||'') + '\'})">出库</button></td></tr>').join('')}
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    const usageData = data.usage || [];
    initChart('suppliesTrend', {
      tooltip: { trigger: 'axis' }, grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: usageData.map(u => u.month) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: usageData.map(u => u.count), itemStyle: { color: COLORS.blue }, label: { show: true, position: 'top' } }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 行政-固定资产 ==========
async function loadAdminAsset() {
  const data = await fetchAPI(API.assets);
  if (!data) return;
  const statusMap = { '在用': 'tag-success', '闲置': 'tag-warning', '报废': 'tag-danger' };
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-monitor"></use></svg></div><div class="kpi-value">${data.length}</div><div class="kpi-label">资产总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.filter(a=>a.status==='在用').length}</div><div class="kpi-label">在用</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-package"></use></svg></div><div class="kpi-value">${data.filter(a=>a.status==='闲置').length}</div><div class="kpi-label">闲置</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">🗑️</div><div class="kpi-value">${data.filter(a=>a.status==='报废').length}</div><div class="kpi-label">报废</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 固定资产明细</div>
      <div class="filter-bar"><input type="text" placeholder="搜索资产..." id="assetSearch"><button class="btn btn-outline"  id="zg_btn_3"> 新增资产</button><button class="btn btn-primary" onclick="showAssetTransfer()"> 固资转出</button></div>
      <table class="data-table">
        <thead><tr><th>资产编号</th><th>资产名称</th><th>使用人</th><th>部门</th><th>中心</th><th>采购日期</th><th>价值</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(a => `<tr><td>${a.id}</td><td><strong>${a.name}</strong></td><td>${a.user}</td><td>${a.department}</td><td>${a.center}</td><td>${a.purchaseDate}</td><td>¥${a.value.toLocaleString()}</td><td><span class="tag ${statusMap[a.status]}">${a.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showAssetDetail({id:'${a.id}',name:'${a.name}',status:'${a.status}',value:${a.value||0},user:'${a.user||''}',dept:'${a.department||''}',center:'${a.center||''}',purchaseDate:'${a.purchaseDate||''}'})">详情</button><button class="btn btn-primary" style="padding:4px 12px;font-size:12px;margin-left:4px" onclick="showAssetTransfer({id:'${a.id}',name:'${a.name}',center:'${a.center||''}'})">转出</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 行政-费用看板 ==========
async function loadAdminBudget() {
  const data = await fetchAPI(API.budget);
  if (!data) return;
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-coins"></use></svg></div><div class="kpi-value">${(data.annual/10000).toFixed(0)}万</div><div class="kpi-label">年度预算</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">💸</div><div class="kpi-value">${(data.spent/10000).toFixed(0)}万</div><div class="kpi-label">实际支出</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${data.rate}%</div><div class="kpi-label">执行率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg></div><div class="kpi-value">${((data.annual-data.spent)/10000).toFixed(0)}万</div><div class="kpi-label">剩余预算</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各类别预算执行</div>
        <div id="budgetCategory" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 月度费用趋势</div>
        <div id="budgetTrend" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 各类别明细</div>
      <table class="data-table">
        <thead><tr><th>费用类别</th><th>年度预算</th><th>实际支出</th><th>剩余</th><th>执行率</th><th>进度</th></tr></thead>
        <tbody>
          ${data.categories.map(c => {
            const rate = ((c.spent/c.budget)*100).toFixed(1);
            return `<tr><td><strong>${c.name}</strong></td><td>¥${(c.budget/10000).toFixed(1)}万</td><td>¥${(c.spent/10000).toFixed(1)}万</td><td>¥${((c.budget-c.spent)/10000).toFixed(1)}万</td><td>${rate}%</td><td style="width:120px"><div class="progress"><div class="progress-bar ${rate>=80?'red':rate>=60?'orange':'green'}" style="width:${rate}%"></div></div></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('budgetCategory', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['预算', '支出'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.categories.map(c => c.name), axisLabel: { rotate: 15 } },
      yAxis: { type: 'value', axisLabel: { formatter: val => (val/10000).toFixed(0) + '万' } },
      series: [
        { name: '预算', type: 'bar', data: data.categories.map(c => c.budget), itemStyle: { color: COLORS.blue } },
        { name: '支出', type: 'bar', data: data.categories.map(c => c.spent), itemStyle: { color: COLORS.orange } }
      ]
    });
    initChart('budgetTrend', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['月度预算', '实际支出'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.monthlyTrend.map(t => t.month) },
      yAxis: { type: 'value', axisLabel: { formatter: val => val + '万' } },
      series: [
        { name: '月度预算', type: 'line', data: data.monthlyTrend.map(t => t.budget), itemStyle: { color: COLORS.blue }, lineStyle: { type: 'dashed' } },
        { name: '实际支出', type: 'bar', data: data.monthlyTrend.map(t => t.spent), itemStyle: { color: COLORS.orange } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 公关-舆情 ==========
async function loadPrOpinion() {
  const data = await fetchAPI(API.prOpinion);
  if (!data) return;
  const pc = data.platformContent || {};
  const dd = data.douyinDetail || {};
  const xhd = data.xiaohongshuDetail || {};

  // 内部工具函数：必须在renderPage之前定义
  function renderPrPlatformTable(items, name, itemLabel, m1, m2) {
    return '<table class="data-table"><thead><tr><th style="width:40px">#</th><th>' + itemLabel + '标题</th><th>作者</th><th>发布时间</th><th>' + m1 + '</th><th>' + m2 + '</th><th>情感</th><th>操作</th></tr></thead><tbody>' +
      items.map((it, i) => '<tr><td>' + (i+1) + '</td><td><strong>' + it.title + '</strong></td><td>' + it.author + '</td><td>' + it.time + '</td><td>' + (it.reads || it.views || it.reads) + '</td><td>' + (it.likes || it.comments || it.answers || it.likes) + '</td><td><span class="tag ' + (it.sentiment==='正面'?'tag-success':it.sentiment==='负面'?'tag-danger':'tag-warning') + '">' + it.sentiment + '</span></td><td><button class="btn btn-outline" style="padding:2px 10px;font-size:11px" onclick="showInfoModal(\'舆情原文 - \' + rowCellText(this,1),rowDetailHTML(this))">查看</button></td></tr>').join('') +
      '</tbody></table>';
  }

  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">舆情总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-smile"></use></svg></div><div class="kpi-value">${data.overview.positive}%</div><div class="kpi-label">正面</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-minus"></use></svg></div><div class="kpi-value">${data.overview.neutral}%</div><div class="kpi-label">中性</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-frown"></use></svg></div><div class="kpi-value">${data.overview.negative}%</div><div class="kpi-label">负面</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-triangle"></use></svg></div><div class="kpi-value">${data.overview.alerts}</div><div class="kpi-label">预警待处理</div></div>
    </div>
    ${data.alerts.length > 0 ? `<div class="chart-card"><div class="chart-title"> 负面舆情预警</div>${data.alerts.map(a => `<div class="alert-item alert-${a.level==='高'?'danger':'warning'}"><span class="alert-icon">${a.level==='高'?'':''}</span><div><strong>[${a.level}]</strong> ${a.time} · ${a.source} — ${a.content}<br><span style="font-size:12px;color:var(--text-light)">状态: ${a.status} ${a.handler?'· 处理人: '+a.handler:''}</span> <button class="btn btn-outline" style="padding:2px 10px;font-size:11px;margin-left:8px" onclick="showFormModal(\'⚠ 处理舆情预警 - \' + rowCellText(this,0),[{\'name\':\'handleResult\',\'label\':\'处理结果\',\'type\':\'select\',\'options\':[\'属实-已处理\',\'属实-处理中\',\'不实-已澄清\'],\'value\':\'属实-处理中\'},{\'name\':\'handleNote\',\'label\':\'处理说明\',\'type\':\'textarea\',\'required\':true,\'rows\':3}],\'提交处理\',\'预警已处理\')">处理</button></div></div>`).join('')}</div>` : ''}
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 舆情情感趋势</div>
        <div class="chart-desc">近7天全平台情感分布</div>
        <div id="opinionTrend" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-flame"></use></svg> 热门话题 TOP5</div>
        <div style="margin-top:12px">
          ${data.hotTopics.map(t => `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:20px;font-weight:700;color:${t.rank<=3?'var(--danger)':'var(--text-light)'};width:24px">${t.rank}</span><div style="flex:1"><div style="font-size:14px;font-weight:600">${t.topic}</div><div style="font-size:12px;color:var(--text-light)">热度: ${t.heat} · 来源: ${t.platform || '多平台'}</div></div><span class="tag ${t.sentiment==='正面'?'tag-success':t.sentiment==='负面'?'tag-danger':'tag-warning'}">${t.sentiment}</span></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📱 多平台舆情监控矩阵</div>
      <div class="chart-desc">覆盖微信公众号 · 微博 · 抖音 · 小红书 · 知乎 · 脉脉</div>
      <div class="platform-matrix" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px">
        ${[
          {key:'wechat', name:'微信公众号', icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-message-circle\"></use></svg>', color:'#07C160', ...data.platforms.wechat},
          {key:'weibo', name:'微博', icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-megaphone\"></use></svg>', color:'#E6162D', ...data.platforms.weibo},
          {key:'douyin', name:'抖音', icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-music\"></use></svg>', color:'#000000', ...data.platforms.douyin},
          {key:'xiaohongshu', name:'小红书', icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-book\"></use></svg>', color:'#FF2442', ...data.platforms.xiaohongshu},
          {key:'zhihu', name:'知乎', icon:'❓', color:'#0084FF', ...data.platforms.zhihu},
          {key:'maimai', name:'脉脉', icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-briefcase-alt\"></use></svg>', color:'#0066FF', ...data.platforms.maimai}
        ].map(p => `
          <div class="platform-card" style="background:var(--card);border-radius:8px;border:1px solid var(--border);padding:12px;transition:all .2s;cursor:pointer;position:relative;overflow:hidden" onmouseover="this.style.boxShadow='var(--shadow)'" onmouseout="this.style.boxShadow='none'" onclick="switchPrTab('${p.key}')">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font-size:12px;width:16px;text-align:center">${p.icon}</span>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:700;color:var(--text)">${p.name}</div>
                <div style="font-size:11px;color:var(--text-light)">舆情 ${p.total} 条</div>
              </div>
              <span style="font-size:12px;font-weight:700;color:${p.color};background:${p.color}11;border:1px solid ${p.color}33;padding:2px 8px;border-radius:4px">${p.total}</span>
            </div>
            <div style="margin-bottom:8px">
              <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:var(--bg)">
                <div style="width:${p.positive}%;background:var(--success)"></div>
                <div style="width:${p.neutral}%;background:var(--warning)"></div>
                <div style="width:${p.negative}%;background:var(--danger)"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-light);margin-top:3px">
                <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-smile"></use></svg> ${p.positive}%</span>
                <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-minus"></use></svg> ${p.neutral}%</span>
                <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-frown"></use></svg> ${p.negative}%</span>
              </div>
            </div>
            <div style="font-size:11px;color:var(--text-light);background:var(--bg);border-radius:4px;padding:6px 8px;display:flex;gap:6px;align-items:flex-start">
              <span style="font-size:10px;color:${p.color};font-weight:700;flex-shrink:0"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-flame"></use></svg>最新</span>
              <span style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3">${p.latest}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text-light);display:flex;gap:24px;flex-wrap:wrap">
        <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 全平台舆情总数：<strong style="color:var(--primary)">${Object.values(data.platforms).reduce((a,b)=>a+(typeof b==='object'&&b.total?b.total:0),0)}</strong> 条</span>
        <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-smile"></use></svg> 正面占比：<strong style="color:var(--success)">${data.overview.positive}%</strong></span>
        <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-frown"></use></svg> 负面占比：<strong style="color:var(--danger)">${data.overview.negative}%</strong></span>
        <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-triangle"></use></svg> 预警待处理：<strong style="color:var(--danger)">${data.overview.alerts}</strong> 条</span>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-music"></use></svg> 抖音专项舆情监控</div>
      <div class="chart-desc">实时监控中 · 品牌视频${dd.brandVideos||156}条 · 总互动${dd.totalViews||'2.3万'} · 风险等级：低风险</div>
      <div style="margin-top:16px">
        <table class="data-table">
          <thead><tr><th style="width:40px">#</th><th>视频标题</th><th>作者</th><th>发布时间</th><th>播放量</th><th>点赞</th><th>评论</th><th>情感</th><th>操作</th></tr></thead>
          <tbody>
            ${(dd.topVideos||[]).map((v,i) => `<tr><td>${i+1}</td><td><strong>${v.title}</strong></td><td>${v.author}</td><td>${v.time}</td><td>${v.views}</td><td>${v.likes}</td><td>${v.comments}</td><td><span class="tag ${v.sentiment==='正面'?'tag-success':v.sentiment==='负面'?'tag-danger':'tag-warning'}">${v.sentiment}</span></td><td><button class="btn btn-outline" style="padding:2px 10px;font-size:11px" onclick="showConfirmModal(\'🎬 抖音视频 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>标题：\' + rowCellText(this,1) + \'<br>作者：\' + rowCellText(this,2) + \'</p>\',\'打开抖音\',\'正在打开抖音\')">查看</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 0;font-size:12px;color:var(--text-light);display:flex;gap:24px">
        <span>📹 品牌相关视频：<strong>${dd.brandVideos||156}</strong> 条</span>
        <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-message-circle"></use></svg> 评论提及：<strong>${dd.commentMentions||68}</strong> 条（负面 <strong style="color:var(--danger)">${dd.negativeComments||3}</strong> 条）</span>
        <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-flame"></use></svg> 热门话题：<strong>${dd.hotTopics||12}</strong> 个（曝光 <strong>${dd.topicExposure||'580万'}</strong>）</span>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-book"></use></svg> 小红书专项舆情监控</div>
      <div class="chart-desc">实时监控中 · 品牌笔记${xhd.brandNotes||89}篇 · 总收藏${xhd.totalCollects||'1.2万'} · 风险等级：低风险</div>
      <div style="margin-top:16px">
        <table class="data-table">
          <thead><tr><th style="width:40px">#</th><th>笔记标题</th><th>作者</th><th>发布时间</th><th>浏览量</th><th>点赞</th><th>评论</th><th>情感</th><th>操作</th></tr></thead>
          <tbody>
            ${(xhd.topNotes||[]).map((n,i) => `<tr><td>${i+1}</td><td><strong>${n.title}</strong></td><td>${n.author}</td><td>${n.time}</td><td>${n.views}</td><td>${n.likes}</td><td>${n.comments}</td><td><span class="tag ${n.sentiment==='正面'?'tag-success':n.sentiment==='负面'?'tag-danger':'tag-warning'}">${n.sentiment}</span></td><td><button class="btn btn-outline" style="padding:2px 10px;font-size:11px" onclick="showConfirmModal(\'小红书笔记 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>标题：\' + rowCellText(this,1) + \'<br>作者：\' + rowCellText(this,2) + \'</p>\',\'打开小红书\',\'正在打开小红书\')">查看</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 0;font-size:12px;color:var(--text-light);display:flex;gap:24px">
        <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-file-edit"></use></svg> 品牌相关笔记：<strong>${xhd.brandNotes||89}</strong> 篇</span>
        <span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-message-circle"></use></svg> 评论提及：<strong>${xhd.commentMentions||52}</strong> 条（负面 <strong style="color:var(--danger)">${xhd.negativeComments||2}</strong> 条）</span>
        <span>🔖 话题标签：<strong>${xhd.topicTags||8}</strong> 个（浏览 <strong>${xhd.topicViews||'320万'}</strong>）</span>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 全平台舆情内容明细</div>
      <div class="filter-bar">
        <button class="btn btn-primary" onclick="switchPrTab('wechat')"> 微信公众号</button>
        <button class="btn btn-outline" onclick="switchPrTab('weibo')"> 微博</button>
        <button class="btn btn-outline" onclick="switchPrTab('douyin')"> 抖音</button>
        <button class="btn btn-outline" onclick="switchPrTab('xiaohongshu')"> 小红书</button>
        <button class="btn btn-outline" onclick="switchPrTab('zhihu')">❓ 知乎</button>
        <button class="btn btn-outline" onclick="switchPrTab('maimai')"> 脉脉</button>
      </div>
      <div id="prTabContent">
        ${renderPrPlatformTable(pc.wechat || [], '微信公众号', '公众号', '阅读量', '点赞')}
      </div>
    </div>
  `);

  // 挂载到window供Tab切换调用（已不需要，因为内部定义了新的renderPrPlatformTable）
  window.switchPrTab = function(platform) {
    const contentMap = {
      wechat: { data: pc.wechat || [], name: '微信公众号', item: '公众号', metric1: '阅读量', metric2: '点赞' },
      weibo: { data: pc.weibo || [], name: '微博', item: '微博', metric1: '阅读量', metric2: '评论' },
      douyin: { data: pc.douyin || [], name: '抖音', item: '视频', metric1: '播放量', metric2: '点赞' },
      xiaohongshu: { data: pc.xiaohongshu || [], name: '小红书', item: '笔记', metric1: '浏览量', metric2: '点赞' },
      zhihu: { data: pc.zhihu || [], name: '知乎', item: '问题', metric1: '浏览量', metric2: '回答' },
      maimai: { data: pc.maimai || [], name: '脉脉', item: '帖子', metric1: '浏览量', metric2: '评论' }
    };
    const cfg = contentMap[platform];
    if (cfg) {
      document.getElementById('prTabContent').innerHTML = renderPrPlatformTable(cfg.data, cfg.name, cfg.item, cfg.metric1, cfg.metric2);
    }
  };

  // 重新挂载到window，但Tab切换时用的是新的内部函数
  // 由于switchPrTab在DOM中通过onclick调用，必须保留

  setTimeout(() => {
    disposeCharts();
    initChart('opinionTrend', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['正面', '中性', '负面'] },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.trend.map(t => t.day) },
      yAxis: { type: 'value' },
      series: [
        { name: '正面', type: 'line', smooth: true, stack: '总量', data: data.trend.map(t => t.positive), itemStyle: { color: COLORS.green }, areaStyle: { opacity: 0.3 } },
        { name: '中性', type: 'line', smooth: true, stack: '总量', data: data.trend.map(t => t.neutral), itemStyle: { color: COLORS.orange }, areaStyle: { opacity: 0.3 } },
        { name: '负面', type: 'line', smooth: true, stack: '总量', data: data.trend.map(t => t.negative), itemStyle: { color: COLORS.red }, areaStyle: { opacity: 0.3 } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 综管智能小助手 ==========
function loadAiChat() {
  renderPage(`
    <div class="chat-container">
      <div class="chart-card" style="padding:0;overflow:hidden">
        <div style="padding:16px 20px;background:var(--primary);color:#fff">
          <div style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bot"></use></svg> 综管智能小助手</div>
          <div style="font-size:12px;opacity:0.7;margin-top:4px">覆盖招聘·培训·人事·行政·公关五大模块 | 智能问答 · 制度查询 · 流程指引</div>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="chat-msg bot">
            <div class="chat-avatar"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bot"></use></svg></div>
            <div class="chat-bubble">您好！我是<strong>综管智能小助手</strong>，可以帮您解答综合管理部的各类问题：<br><br>
              <strong>【招聘管理】</strong>招聘流程、RPO渠道、面试安排、入职跟进<br>
              <strong>【培训管理】</strong>培训计划、课件查询、考试安排、知识库检索<br>
              <strong>【人事管理】</strong>编制查询、入转调离、合同管理、考勤制度<br>
              <strong>【行政管理】</strong>办公用品领用、固定资产借用、费用报销、会议室预订<br>
              <strong>【公共关系】</strong>舆情监控、危机公关流程、品牌管理规范<br><br>
              请直接提问，或点击下方推荐问题快速体验。
            </div>
          </div>
        </div>
        <div class="chat-suggestions">
          <div style="font-size:12px;color:var(--text-light);margin-bottom:8px;padding-left:4px">招聘管理</div>
          <div class="chat-suggestion" onclick="askQuestion('催收员的招聘流程是怎样的？')">催收员招聘流程？</div>
          <div class="chat-suggestion" onclick="askQuestion('RPO渠道有哪些供应商？')">RPO渠道供应商？</div>
          <div style="font-size:12px;color:var(--text-light);margin:8px 0 8px;padding-left:4px">培训管理</div>
          <div class="chat-suggestion" onclick="askQuestion('新员工岗前培训包含哪些内容？')">新员工培训内容？</div>
          <div class="chat-suggestion" onclick="askQuestion('催收业务知识库怎么使用？')">知识库怎么使用？</div>
          <div style="font-size:12px;color:var(--text-light);margin:8px 0 8px;padding-left:4px">人事管理</div>
          <div class="chat-suggestion" onclick="askQuestion('入职流程是什么？')">入职流程是什么？</div>
          <div class="chat-suggestion" onclick="askQuestion('合同到期了怎么续签？')">合同到期怎么续签？</div>
          <div style="font-size:12px;color:var(--text-light);margin:8px 0 8px;padding-left:4px">行政管理</div>
          <div class="chat-suggestion" onclick="askQuestion('办公用品怎么领用？')">办公用品怎么领用？</div>
          <div class="chat-suggestion" onclick="askQuestion('固定资产借用流程是什么？')">固定资产借用流程？</div>
          <div style="font-size:12px;color:var(--text-light);margin:8px 0 8px;padding-left:4px">公共关系</div>
          <div class="chat-suggestion" onclick="askQuestion('舆情预警怎么处理？')">舆情预警怎么处理？</div>
          <div class="chat-suggestion" onclick="askQuestion('品牌舆情监控覆盖哪些平台？')">舆情监控覆盖哪些平台？</div>
        </div>
        <div class="chat-input-area">
          <input type="text" id="chatInput" placeholder="输入您的问题，例如：催收员招聘流程..." onkeypress="if(event.keyCode===13)sendChat()">
          <button onclick="sendChat()">发送</button>
        </div>
      </div>
    </div>
  `);
}

function askQuestion(q) {
  document.getElementById('chatInput').value = q;
  sendChat();
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const question = input.value.trim();
  if (!question) return;
  
  const messages = document.getElementById('chatMessages');
  messages.innerHTML += `<div class="chat-msg user"><div class="chat-avatar">我</div><div class="chat-bubble">${question}</div></div>`;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;
  
  messages.innerHTML += `<div class="chat-msg bot" id="typingMsg"><div class="chat-avatar"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bot"></use></svg></div><div class="chat-bubble"><div class="loading" style="padding:0"><div class="spinner" style="width:20px;height:20px"></div></div></div></div>`;
  messages.scrollTop = messages.scrollHeight;
  
  const res = await fetch(API.aiQuery, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  const data = await res.json();
  
  document.getElementById('typingMsg').remove();
  const confidenceTag = data.confidence > 0 ? `<div style="margin-top:8px;font-size:11px;color:var(--text-light)">匹配置信度: ${data.confidence}% · 来源: ${data.source}</div>` : `<div style="margin-top:8px;font-size:11px;color:var(--warning)"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg> 未匹配到知识库内容，已转人工处理</div>`;
  messages.innerHTML += `<div class="chat-msg bot"><div class="chat-avatar"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bot"></use></svg></div><div class="chat-bubble">${data.answer}${confidenceTag}</div></div>`;
  messages.scrollTop = messages.scrollHeight;
}

// ========== 启动（由 bootstrap 控制，不使用 DOMContentLoaded 避免竞态） ==========

// ========== 人员流失看板（内联 ECharts 看板） ==========
async function loadHrTurnover() {
  const data = await fetchAPI(API.hrTurnover);
  // 若 API 无数据，使用虚拟数据保证看板可展示
  const d = data || {
    overview: { totalTurnover: 23, rate: 3.2, monthTurnover: 4, coreTurnover: 5, avgTenure: 18 },
    monthlyTrend: [
      { month:'1月', onboard:12, resign:3 }, { month:'2月', onboard:15, resign:2 },
      { month:'3月', onboard:10, resign:4 }, { month:'4月', onboard:18, resign:1 },
      { month:'5月', onboard:14, resign:3 }, { month:'6月', onboard:16, resign:5 }
    ],
    centerData: [
      { center:'太原', count:5, rate:3.1 }, { center:'南昌', count:4, rate:2.8 },
      { center:'晋中', count:3, rate:2.5 }, { center:'沈阳', count:4, rate:3.5 },
      { center:'南宁', count:3, rate:2.9 }, { center:'上海', count:4, rate:3.8 }
    ],
    reasonDist: [
      { reason:'个人发展', count:8 }, { reason:'薪酬待遇', count:6 },
      { reason:'家庭原因', count:4 }, { reason:'工作环境', count:3 },
      { reason:'管理问题', count:2 }
    ],
    list: [
      { id:'TO001', name:'张三', center:'太原', dept:'催收部', position:'催收员', entryDate:'2025-03-15', leaveDate:'2026-06-20', tenure:'15个月', reason:'个人发展' },
      { id:'TO002', name:'李四', center:'南昌', dept:'质检部', position:'质检员', entryDate:'2025-01-10', leaveDate:'2026-05-18', tenure:'17个月', reason:'薪酬待遇' },
      { id:'TO003', name:'王五', center:'晋中', dept:'客服部', position:'客服专员', entryDate:'2025-06-01', leaveDate:'2026-07-02', tenure:'13个月', reason:'家庭原因' },
      { id:'TO004', name:'赵六', center:'沈阳', dept:'催收部', position:'组长', entryDate:'2024-11-20', leaveDate:'2026-04-15', tenure:'17个月', reason:'个人发展' },
      { id:'TO005', name:'钱七', center:'太原', dept:'培训部', position:'培训师', entryDate:'2025-02-28', leaveDate:'2026-06-10', tenure:'15个月', reason:'薪酬待遇' }
    ]
  };
  const ov = d.overview || {};

  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">👋</div><div class="kpi-value">${ov.totalTurnover || 0}</div><div class="kpi-label">年度累计流失</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${(ov.rate || 0)}%</div><div class="kpi-label">流失率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar"></use></svg></div><div class="kpi-value">${ov.monthTurnover || 0}</div><div class="kpi-label">本月流失</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">⭐</div><div class="kpi-value">${ov.coreTurnover || 0}</div><div class="kpi-label">核心岗位流失</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">⏱️</div><div class="kpi-value">${ov.avgTenure || 0}月</div><div class="kpi-label">平均司龄</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 月度人员变动趋势</div>
        <div class="chart-desc">入职 vs 离职</div>
        <div id="turnoverTrendChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-building-2"></use></svg> 各中心流失率对比</div>
        <div class="chart-desc">目标 &lt; 3%</div>
        <div id="turnoverCenterChart" style="height:300px"></div>
      </div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-search"></use></svg> 流失原因分布</div>
        <div id="turnoverReasonChart" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 近期流失明细</div>
        <table class="data-table">
          <thead><tr><th>工号</th><th>姓名</th><th>中心</th><th>部门</th><th>岗位</th><th>入职日期</th><th>离职日期</th><th>司龄</th><th>原因</th></tr></thead>
          <tbody>
            ${(d.list || []).map(r => `<tr><td>${r.id}</td><td><strong>${r.name}</strong></td><td>${r.center}</td><td>${r.dept}</td><td>${r.position}</td><td>${r.entryDate}</td><td>${r.leaveDate}</td><td>${r.tenure}</td><td><span class="tag tag-warning">${r.reason}</span></td></tr>`).join('') || '<tr><td colspan="9" class="loading">暂无流失记录</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    // 月度趋势
    initChart('turnoverTrendChart', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['入职','离职'] },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: (d.monthlyTrend || []).map(t => t.month) },
      yAxis: { type: 'value' },
      series: [
        { name: '入职', type: 'bar', data: (d.monthlyTrend || []).map(t => t.onboard), itemStyle: { color: COLORS.green } },
        { name: '离职', type: 'line', data: (d.monthlyTrend || []).map(t => t.resign), itemStyle: { color: COLORS.red }, smooth: true, areaStyle: { opacity: 0.15 } }
      ]
    });
    // 各中心流失率
    initChart('turnoverCenterChart', {
      tooltip: { trigger: 'axis', formatter: '{b}<br/>流失率: {c}%' },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: (d.centerData || []).map(c => c.center) },
      yAxis: { type: 'value', max: 5, axisLabel: { formatter: '{value}%' } },
      series: [{ type: 'bar', data: (d.centerData || []).map(c => c.rate),
        itemStyle: { color: function(p) { return p.value >= 3.5 ? COLORS.red : p.value >= 2.5 ? COLORS.orange : COLORS.green; } },
        label: { show: true, position: 'top', formatter: '{c}%' }, markLine: { data: [{ yAxis: 3, name: '警戒线(3%)', lineStyle: { color: COLORS.red, type: 'dashed' } }] }
      }]
    });
    // 流失原因
    initChart('turnoverReasonChart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['35%','60%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
        data: (d.reasonDist || []).map((r, i) => ({ value: r.count, name: r.reason, itemStyle: { color: [COLORS.red, COLORS.orange, COLORS.purple, COLORS.blue, COLORS.cyan][i % 5] } }))
      }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 编制管理（增强版） ==========
async function loadHrEstablishment() {
  const data = await fetchAPI('/api/hr/establishment');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-ruler"></use></svg></div><div class="kpi-value">${data.overview.totalEstablishment}</div><div class="kpi-label">编制总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.filled}</div><div class="kpi-label">已入编</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.overview.vacant}</div><div class="kpi-label">空缺编制</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg></div><div class="kpi-value">${data.overview.recruiting}</div><div class="kpi-label">招聘中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.cyan}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg></div><div class="kpi-value">${data.overview.utilizationRate}%</div><div class="kpi-label">编制使用率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各中心编制分布（含招聘中）</div>
        <div id="estCenterChart" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 编制使用率趋势</div>
        <div id="estTrendChart" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 编制明细</div>
      <div class="filter-bar">
        <select><option>全部中心</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
        <select><option>全部项目</option><option>小赢</option><option>字节</option><option>邮储</option><option>交行</option><option>广汽</option></select>
        <button class="btn btn-primary" onclick="showFormModal(\'新增编制\',[{\'name\':\'deptName\',\'label\':\'部门\',\'required\':true},{\'name\':\'postName\',\'label\':\'岗位\',\'required\':true},{\'name\':\'headcount\',\'label\':\'编制人数\',\'type\':\'number\',\'required\':true,\'value\':\'1\'},{\'name\':\'postType\',\'label\':\'岗位类别\',\'type\':\'select\',\'options\':[\'管理\',\'专业\',\'操作\',\'辅助\'],\'value\':\'专业\'}],\'提交申请\',\'编制申请已提交\')"> 新增编制</button>
        <button class="btn btn-outline" onclick="showConfirmModal(\'导出编制明细\',\'<p style=\'margin:0;color:#666;font-size:13px\'>编制明细将导出为 Excel。</p>\',\'确认导出\',\'编制明细已导出\')"> 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编制编号</th><th>中心</th><th>项目</th><th>岗位</th><th>编制数</th><th>在岗数</th><th>招聘中</th><th>空缺</th><th>使用率</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.details.map(d => {
            const rate = ((d.filled/d.establishment)*100).toFixed(1);
            const status = rate >= 95 ? ['tag-success','满编'] : rate >= 80 ? ['tag-warning','缺口'] : ['tag-danger','严重缺'];
            const vacant = d.establishment - d.filled - (d.recruiting||0);
            return `<tr><td>${d.id}</td><td><strong>${d.center}</strong></td><td>${d.project}</td><td>${d.position}</td><td>${d.establishment}</td><td>${d.filled}</td><td style="color:var(--info)">${d.recruiting||0}</td><td style="color:${vacant>0?'var(--warning)':'var(--text-light)'}">${vacant>0?vacant:'-'}</td><td>${rate}%</td><td><span class="tag ${status[0]}">${status[1]}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'编制详情 - \' + rowCellText(this,0),rowDetailHTML(this))">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('estCenterChart', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['编制', '在岗', '招聘中', '空缺'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.centerSummary.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [
        { name: '编制', type: 'bar', data: data.centerSummary.map(c => c.establishment), itemStyle: { color: COLORS.blue } },
        { name: '在岗', type: 'bar', data: data.centerSummary.map(c => c.filled), itemStyle: { color: COLORS.green } },
        { name: '招聘中', type: 'bar', data: data.centerSummary.map(c => c.recruiting||0), itemStyle: { color: COLORS.purple } },
        { name: '空缺', type: 'bar', data: data.centerSummary.map(c => c.vacant), itemStyle: { color: COLORS.red } }
      ]
    });
    initChart('estTrendChart', {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['使用率'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.trend.map(t => t.month) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        { name: '使用率', type: 'line', data: data.trend.map(t => t.rate), itemStyle: { color: COLORS.cyan }, smooth: true, areaStyle: { color: 'rgba(6,182,212,0.1)' }, markLine: { data: [{ yAxis: 95, name: '目标' }] } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 新增模块：职场管理 ==========
async function loadAdminWorkplace() {
  const data = await fetchAPI('/api/admin/workplace');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-building-2"></use></svg></div><div class="kpi-value">${data.overview.totalWorkplaces}</div><div class="kpi-label">职场总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">📏</div><div class="kpi-value">${data.overview.totalArea}㎡</div><div class="kpi-label">总面积</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-coins"></use></svg></div><div class="kpi-value">${data.overview.monthlyRent}万</div><div class="kpi-label">月租金</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg></div><div class="kpi-value">${data.overview.totalSeats}</div><div class="kpi-label">工位总数</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各职场工位使用率</div>
        <div id="wpUsageChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-coins"></use></svg> 各职场租金对比</div>
        <div id="wpRentChart" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 职场明细</div>
      <div class="filter-bar">
        <select><option>全部城市</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
        <button class="btn btn-primary"  id="zg_btn_4"> 新增职场</button>
        <button class="btn btn-outline"  id="zg_btn_5"> 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>职场编号</th><th>城市</th><th>地址</th><th>面积(㎡)</th><th>工位数</th><th>使用数</th><th>使用率</th><th>月租金(万)</th><th>租期至</th><th>操作</th></tr></thead>
        <tbody>
          ${data.details.map(d => {
            const rate = ((d.usedSeats/d.totalSeats)*100).toFixed(1);
            return `<tr><td>${d.id}</td><td><strong>${d.city}</strong></td><td>${d.address}</td><td>${d.area}</td><td>${d.totalSeats}</td><td>${d.usedSeats}</td><td>${rate}%</td><td>${d.monthlyRent}</td><td>${d.leaseEnd}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showWorkplaceDetail({id:'${d.id}',city:'${d.city}',address:'${d.address||''}',area:${d.area||0},totalSeats:${d.totalSeats||0},usedSeats:${d.usedSeats||0},monthlyRent:${d.monthlyRent||0},leaseEnd:'${d.leaseEnd||''}'})">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('wpUsageChart', {
      tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}: {c}%' },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.details.map(d => d.city) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{ type: 'bar', data: data.details.map(d => ((d.usedSeats/d.totalSeats)*100).toFixed(1)), itemStyle: { color: COLORS.blue }, label: { show: true, position: 'top', formatter: '{c}%' } }]
    });
    initChart('wpRentChart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.details.map(d => d.city) },
      yAxis: { type: 'value', name: '万元' },
      series: [{ type: 'bar', data: data.details.map(d => d.monthlyRent), itemStyle: { color: COLORS.orange } }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 新增模块：礼品管理 ==========
async function loadAdminGift() {
  const data = await fetchAPI('/api/admin/gift');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-gift"></use></svg></div><div class="kpi-value">${data.items.length}</div><div class="kpi-label">礼品种类</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${data.items.reduce((s,i)=>s+i.stock,0)}</div><div class="kpi-label">库存总量</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.items.filter(i=>i.stock<i.safetyStock).length}</div><div class="kpi-label">库存预警</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-upload"></use></svg></div><div class="kpi-value">${data.overview.monthlyOutbound||0}</div><div class="kpi-label">本月领用</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 礼品库存明细</div>
      <div class="filter-bar">
        <button class="btn btn-primary" onclick="showFormModal(\'礼品入库\',[{\'name\':\'giftName\',\'label\':\'礼品名称\',\'required\':true},{\'name\':\'giftQty\',\'label\':\'数量\',\'type\':\'number\',\'required\':true,\'value\':\'1\'},{\'name\':\'giftBatch\',\'label\':\'批次\'},{\'name\':\'giftNote\',\'label\':\'备注\',\'type\':\'textarea\',\'rows\':2}],\'登记入库\',\'礼品已入库\')"> 入库</button>
        <button class="btn btn-outline" onclick="showFormModal(\'礼品领用\',[{\'name\':\'giftName\',\'label\':\'礼品\',\'required\':true},{\'name\':\'recvName\',\'label\':\'领用人\',\'required\':true},{\'name\':\'recvDept\',\'label\':\'领用部门\'},{\'name\':\'recvQty\',\'label\':\'数量\',\'type\':\'number\',\'required\':true,\'value\':\'1\'}],\'提交申请\',\'领用申请已提交\')"> 领用</button>
        <button class="btn btn-outline" onclick="showConfirmModal(\'导出礼品明细\',\'<p style=\'margin:0;color:#666;font-size:13px\'>礼品明细将导出为 Excel。</p>\',\'确认导出\',\'礼品明细已导出\')"> 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>礼品名称</th><th>分类</th><th>单价</th><th>库存</th><th>安全库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.items.map(i => {
            const isLow = i.stock < i.safetyStock;
            return `<tr><td>${i.id}</td><td><strong>${i.name}</strong></td><td>${i.category}</td><td>¥${i.unitPrice}</td><td>${i.stock}</td><td>${i.safetyStock}</td><td><span class="tag ${isLow?'tag-danger':'tag-success'}">${isLow?'预警':'正常'}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showSupplyRequisition({id:'${i.id}',name:'${i.name}',category:'${i.category}',stock:${i.stock||0},unit:'${i.unit||''}',safetyStock:${i.safetyStock||0}})">领用</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 最近领用记录</div>
      <table class="data-table">
        <thead><tr><th>日期</th><th>礼品</th><th>数量</th><th>领用人</th><th>部门</th><th>用途</th><th>审批人</th></tr></thead>
        <tbody>
          ${data.records.map(r => `<tr><td>${r.date}</td><td><strong>${r.gift}</strong></td><td>${r.qty}</td><td>${r.applicant}</td><td>${r.department}</td><td>${r.purpose}</td><td>${r.approver}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 新增模块：文印管理 ==========
async function loadAdminPrint() {
  const data = await fetchAPI('/api/admin/print');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">🖨️</div><div class="kpi-value">${data.overview.totalDevices}</div><div class="kpi-label">设备总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.normalDevices}</div><div class="kpi-label">正常运行</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-file-text"></use></svg></div><div class="kpi-value">${data.overview.monthlyPages}</div><div class="kpi-label">本月打印页数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.overview.faultDevices}</div><div class="kpi-label">故障设备</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 月度打印趋势</div>
        <div id="printTrendChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各中心打印量</div>
        <div id="printCenterChart" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 各中心打印量排名</div>
      <table class="data-table">
        <thead><tr><th>排名</th><th>中心</th><th>本月页数</th><th>彩色占比</th><th>人均用量</th><th>环比</th></tr></thead>
        <tbody>
          ${data.centerUsage.map((c, idx) => `<tr><td>${idx+1}</td><td><strong>${c.center}</strong></td><td>${c.pages.toLocaleString()}</td><td>${c.colorRatio || '12%'}</td><td>${(c.pages/(c.headCount||50)).toFixed(0)}页/人</td><td><span class="tag ${(c.trend||0)>=0 ? 'tag-danger' : 'tag-success'}">${(c.trend||0)>=0 ? '+' : ''}${c.trend||0}%</span></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 纸张消耗明细</div>
      <table class="data-table">
        <thead><tr><th>纸张类型</th><th>规格</th><th>本月消耗</th><th>库存余量</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.paperStock ? data.paperStock.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.spec || 'A4'}</td><td>${p.used || 0}包</td><td>${p.stock || 0}包</td><td><span class="tag ${(p.stock||0) < (p.safety||10) ? 'tag-danger':'tag-success'}">${(p.stock||0) < (p.safety||10) ? '补货':'正常'}</span></td><td><button class="btn btn-outline" style="padding:4px 10px;font-size:11px" onclick="showFormModal(\'申购 - \' + rowCellText(this,1),[{\'name\':\'buyQty\',\'label\':\'采购数量\',\'type\':\'number\',\'required\':true,\'value\':\'1\'},{\'name\':\'buyReason\',\'label\':\'采购事由\',\'type\':\'textarea\',\'required\':true,\'rows\':2}],\'提交申购\',\'采购申请已提交\')">申购</button></td></tr>`).join('') : [
            {name:'A4复印纸',spec:'80g',used:45,stock:18,safety:10},
            {name:'A4彩色纸',spec:'120g',used:8,stock:3,safety:5},
            {name:'A3复印纸',spec:'80g',used:12,stock:6,safety:5},
            {name:'铜版纸',spec:'157g',used:2,stock:1,safety:3}
          ].map((p,i) => `<tr><td><strong>${p.name}</strong></td><td>${p.spec}</td><td>${p.used}包</td><td>${p.stock}包</td><td><span class="tag ${p.stock < p.safety ? 'tag-danger':'tag-success'}">${p.stock < p.safety ? '补货':'正常'}</span></td><td><button class="btn btn-outline" style="padding:4px 10px;font-size:11px" onclick="showFormModal(\'申购 - \' + rowCellText(this,1),[{\'name\':\'buyQty\',\'label\':\'采购数量\',\'type\':\'number\',\'required\':true,\'value\':\'1\'},{\'name\':\'buyReason\',\'label\':\'采购事由\',\'type\':\'textarea\',\'required\':true,\'rows\':2}],\'提交申购\',\'采购申请已提交\')">申购</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 最近文印申请</div>
      <table class="data-table">
        <thead><tr><th>日期</th><th>申请人</th><th>部门</th><th>文件名</th><th>份数</th><th>页数</th><th>彩色</th><th>状态</th></tr></thead>
        <tbody>
          ${data.records.map(r => `<tr><td>${r.date}</td><td><strong>${r.applicant}</strong></td><td>${r.department}</td><td>${r.fileName}</td><td>${r.copies}</td><td>${r.pages}</td><td>${r.color?'是':'否'}</td><td><span class="tag tag-success">${r.status}</span></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('printTrendChart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: data.monthlyTrend.map(t => t.month) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.monthlyTrend.map(t => t.pages), itemStyle: { color: COLORS.blue } }]
    });
    initChart('printCenterChart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.centerUsage.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.centerUsage.map(c => c.pages), itemStyle: { color: COLORS.purple } }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 新增模块：管理制度 ==========
async function loadAdminRegulation() {
  const data = await fetchAPI('/api/admin/regulation');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  const catColors = { '人事制度':'tag-info','行政制度':'tag-warning','财务制度':'tag-success','安全制度':'tag-danger','其他':'tag-gray' };
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-files"></use></svg></div><div class="kpi-value">${data.length}</div><div class="kpi-label">制度总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.filter(d=>d.status==='现行').length}</div><div class="kpi-label">现行有效</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></div><div class="kpi-value">${data.filter(d=>d.status==='修订中').length}</div><div class="kpi-label">修订中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.filter(d=>d.status==='已废止').length}</div><div class="kpi-label">已废止</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 管理制度清单</div>
      <div class="filter-bar">
        <select><option>全部分类</option><option>人事制度</option><option>行政制度</option><option>财务制度</option><option>安全制度</option></select>
        <select><option>全部状态</option><option>现行</option><option>修订中</option><option>已废止</option></select>
        <input type="text" placeholder="搜索制度名称...">
        <button class="btn btn-primary" onclick="showFormModal(\'新增制度\',[{\'name\':\'regName\',\'label\':\'制度名称\',\'required\':true,\'placeholder\':\'如：考勤管理办法\'},{\'name\':\'regCat\',\'label\':\'分类\',\'type\':\'select\',\'options\':[\'人事\',\'财务\',\'运营\',\'合规\',\'行政\'],\'value\':\'人事\'},{\'name\':\'regContent\',\'label\':\'制度内容\',\'type\':\'textarea\',\'required\':true,\'rows\':4,\'placeholder\':\'请输入制度内容要点\'}],\'发布制度\',\'制度已发布\')"> 新增制度</button>
        <button class="btn btn-outline" onclick="showConfirmModal(\'导出制度清单\',\'<p style=\'margin:0;color:#666;font-size:13px\'>制度清单将导出为 Excel。</p>\',\'确认导出\',\'制度清单已导出\')"> 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>制度名称</th><th>分类</th><th>发布日期</th><th>修订日期</th><th>版本</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(d => `<tr><td>${d.id}</td><td><strong>${d.name}</strong></td><td><span class="tag ${catColors[d.category]||'tag-gray'}">${d.category}</span></td><td>${d.publishDate}</td><td>${d.reviseDate||'-'}</td><td>v${d.version}</td><td><span class="tag ${d.status==='现行'?'tag-success':d.status==='修订中'?'tag-warning':'tag-gray'}">${d.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'制度详情 - \' + rowCellText(this,1),rowDetailHTML(this))">查看</button> <button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'下载文档 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>开始下载文档。</p>\',\'开始下载\',\'文档开始下载\')">下载</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 新增模块：工作清单 ==========
async function loadAdminTasklist() {
  const data = await fetchAPI('/api/admin/tasklist');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  const statusColors = { '待开始':'tag-gray','进行中':'tag-info','已完成':'tag-success','已逾期':'tag-danger' };
  const prioColors = { '高':'tag-danger','中':'tag-warning','低':'tag-success' };
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${data.length}</div><div class="kpi-label">任务总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.filter(t=>t.status==='已完成').length}</div><div class="kpi-label">已完成</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></div><div class="kpi-value">${data.filter(t=>t.status==='进行中').length}</div><div class="kpi-label">进行中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.filter(t=>t.status==='已逾期').length}</div><div class="kpi-label">已逾期</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 工作清单</div>
      <div class="filter-bar">
        <select><option>全部状态</option><option>待开始</option><option>进行中</option><option>已完成</option><option>已逾期</option></select>
        <select><option>全部优先级</option><option>高</option><option>中</option><option>低</option></select>
        <input type="text" placeholder="搜索任务...">
        <button class="btn btn-primary" onclick="showFormModal(\'新增任务\',[{\'name\':\'taskName\',\'label\':\'任务名称\',\'required\':true},{\'name\':\'taskOwner\',\'label\':\'负责人\'},{\'name\':\'taskDue\',\'label\':\'截止日期\',\'type\':\'date\'},{\'name\':\'taskPriority\',\'label\':\'优先级\',\'type\':\'select\',\'options\':[\'高\',\'中\',\'低\'],\'value\':\'中\'}],\'创建任务\',\'任务已创建\')"> 新增任务</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>任务名称</th><th>负责人</th><th>优先级</th><th>截止日期</th><th>进度</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(t => `<tr><td>${t.id}</td><td><strong>${t.name}</strong></td><td>${t.owner}</td><td><span class="tag ${prioColors[t.priority]||'tag-gray'}">${t.priority}</span></td><td>${t.deadline}</td><td><div class="progress" style="width:80px"><div class="progress-bar ${t.progress>=80?'green':t.progress>=40?'orange':'red'}" style="width:${t.progress}%"></div></div> ${t.progress}%</td><td><span class="tag ${statusColors[t.status]||'tag-gray'}">${t.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'任务详情 - \' + rowCellText(this,1),rowDetailHTML(this))">详情</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 新增模块：工作目标 ==========
async function loadAdminGoal() {
  const data = await fetchAPI('/api/admin/goal');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  const statusColors = { '正常':'tag-success','需关注':'tag-warning','严重滞后':'tag-danger' };
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg></div><div class="kpi-value">${data.length}</div><div class="kpi-label">目标总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.filter(g=>g.status==='正常').length}</div><div class="kpi-label">正常推进</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.filter(g=>g.status==='需关注').length}</div><div class="kpi-label">需关注</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-triangle"></use></svg></div><div class="kpi-value">${data.filter(g=>g.status==='严重滞后').length}</div><div class="kpi-label">严重滞后</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg> 工作目标达成情况</div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>目标名称</th><th>负责人</th><th>周期</th><th>目标值</th><th>当前值</th><th>达成率</th><th>进度</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(g => {
            const rate = ((g.current/g.target)*100).toFixed(1);
            return `<tr><td>${g.id}</td><td><strong>${g.name}</strong></td><td>${g.owner}</td><td>${g.period}</td><td>${g.target}</td><td>${g.current}</td><td>${rate}%</td><td><div class="progress" style="width:80px"><div class="progress-bar ${rate>=80?'green':rate>=50?'orange':'red'}" style="width:${Math.min(rate,100)}%"></div></div></td><td><span class="tag ${statusColors[g.status]||'tag-gray'}">${g.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'目标详情 - \' + rowCellText(this,1),rowDetailHTML(this))">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 综管内部KPI考核看板（5模块） ==========
async function loadAdminKpi() {
  const rawData = await fetchAPI('/api/admin/kpi');
  // 始终使用综管5模块格式（API 返回旧 center 格式，不兼容）
  // 只有当 API 返回包含 modules 字段时才使用 API 数据
  const hasModuleData = rawData && rawData.modules && Array.isArray(rawData.modules) && rawData.modules.length > 0;
  const data = hasModuleData ? rawData : {
    overview: { totalPeople: 128, excellent: 35, good: 62, belowStandard: 31, avgScore: 82.6 },
    modules: [
      { name: '招聘管理', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-target\"></use></svg>', target: 80, actual: 68.1, score: 72, trend: 'up', people: 18,
        kpis: [
          { id:'EMP001', name:'张伟', module:'招聘管理', position:'招聘专员', kpi:'年度达成率', score: 78, rank: 1 },
          { id:'EMP002', name:'李娜', module:'招聘管理', position:'招聘主管', kpi:'渠道效率', score: 85, rank: 2 },
          { id:'EMP003', name:'王强', module:'招聘管理', position:'招聘专员', kpi:'到岗率', score: 65, rank: 3 }
        ]
      },
      { name: '培训管理', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-graduation-cap\"></use></svg>', target: 85, actual: 79.2, score: 81, trend: 'up', people: 15,
        kpis: [
          { id:'EMP004', name:'赵敏', module:'培训管理', position:'培训师', kpi:'新培转化率', score: 88, rank: 1 },
          { id:'EMP005', name:'刘洋', module:'培训管理', position:'培训主管', kpi:'课程完成率', score: 82, rank: 2 },
          { id:'EMP006', name:'陈静', module:'培训管理', position:'培训专员', kpi:'满意度评分', score: 76, rank: 3 }
        ]
      },
      { name: '人事行政', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-users\"></use></svg>', target: 95, actual: 93.9, score: 90, trend: 'stable', people: 32,
        kpis: [
          { id:'EMP007', name:'周婷', module:'人事行政', position:'HRBP', kpi:'编制使用率', score: 95, rank: 1 },
          { id:'EMP008', name:'吴刚', module:'人事行政', position:'行政主管', kpi:'预算执行率', score: 88, rank: 2 },
          { id:'EMP009', name:'郑丽', module:'人事行政', position:'薪酬专员', kpi:'准确率', score: 92, rank: 3 },
          { id:'EMP010', name:'孙磊', module:'人事行政', position:'考勤专员', kpi:'合规率', score: 86, rank: 4 }
        ]
      },
      { name: '人才发展', icon: '🌟', target: 90, actual: 84.5, score: 83, trend: 'up', people: 22,
        kpis: [
          { id:'EMP011', name:'韩梅', module:'人才发展', position:'人才发展专员', kpi:'关键岗位填充率', score: 87, rank: 1 },
          { id:'EMP012', name:'朱峰', module:'人才发展', position:'继任计划主管', kpi:'梯队完整度', score: 80, rank: 2 },
          { id:'EMP013', name:'何雨', module:'人才发展', position:'绩效专员', kpi:'评估覆盖率', score: 79, rank: 3 }
        ]
      },
      { name: '公共管理', icon: '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-building-2\"></use></svg>', target: 70, actual: 68.0, score: 75, trend: 'down', people: 41,
        kpis: [
          { id:'EMP014', name:'林涛', module:'公共管理', position:'公关专员', kpi:'舆情正面率', score: 72, rank: 1 },
          { id:'EMP015', name:'黄萍', module:'公共管理', position:'品牌主管', kpi:'媒体曝光量', score: 81, rank: 2 },
          { id:'EMP016', name:'贾明', module:'公共管理', position:'行政专员', kpi:'资产完好率', score: 94, rank: 3 },
          { id:'EMP017', name:'曹芳', module:'公共管理', position:'采购专员', kpi:'成本控制率', score: 70, rank: 4 }
        ]
      }
    ],
    details: [] // 由 modules.kpis 扁平化生成
  };
  // 兼容：若 API 返回了原始 centerAvg 格式，也保留
  const ov = data.overview || {};
  const mods = data.modules || [];

  // 扁平化所有人员明细
  const allDetails = data.details && data.details.length ? data.details :
    mods.flatMap(m => (m.kpis || []).map(k => ({ ...k, module: m.name })));

  renderPage(`
    <div class="section-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg> 综管五模块核心KPI</div>
    <div class="kpi-grid cols-5">
      ${mods.map((m, idx) => {
        const pct = ((m.actual / m.target) * 100).toFixed(1);
        const st = m.actual >= m.target ? '达标' : m.actual >= m.target * 0.9 ? '接近' : '未达标';
        const sc = m.actual >= m.target ? COLORS.green : m.actual >= m.target * 0.9 ? COLORS.orange : COLORS.red;
        return `<div class="kpi-card" style="border-top:3px solid ${sc}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:14px;font-weight:700;color:var(--primary)">${m.icon} ${m.name}</span>
            <span style="font-size:11px;color:${m.trend==='up'?'var(--success)':m.trend==='down'?'var(--danger)':'var(--text-light)'}">${m.trend==='up'?'▲':m.trend==='down'?'▼':'●'} ${st}</span>
          </div>
          <div style="font-size:12px;color:var(--text-light);margin-bottom:8px">目标 ${m.target}% / 实际 ${m.actual}%</div>
          <div class="progress"><div class="progress-bar" style="width:${Math.min(m.actual,100)}%;background:${sc}"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px">
            <span>达成率 ${pct}%</span><span>${m.people}人</span>
          </div>
        </div>`}).join('')}
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 五模块KPI达成对比</div>
        <div class="chart-desc">实际值 vs 目标值</div>
        <div id="kpiModuleChart" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> KPI分数分布</div>
        <div class="chart-desc">综管全员考核等级</div>
        <div id="kpiDistChart" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> KPI考核明细（按模块）</div>
      <div class="filter-bar">
        <select id="kpiModuleFilter" onchange="alert('筛选模块: '+this.value)">
          <option value="">全部模块</option>
          ${mods.map(m => `<option value="${m.name}">${m.icon} ${m.name}</option>`).join('')}
        </select>
        <select><option>全部等级</option><option>优秀(≥90)</option><option>良好(80-89)</option><option>待改进(&lt;80)</option></select>
        <button class="btn btn-outline" onclick="showConfirmModal(\'导出KPI明细\',\'<p style=\'margin:0;color:#666;font-size:13px\'>KPI 明细将导出为 Excel。</p>\',\'确认导出\',\'KPI明细已导出\')"> 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>工号</th><th>姓名</th><th>模块</th><th>岗位</th><th>KPI指标</th><th>KPI得分</th><th>等级</th><th>排名</th><th>操作</th></tr></thead>
        <tbody>
          ${allDetails.map(d => {
            const grade = d.score >= 90 ? ['tag-success','优秀'] : d.score >= 80 ? ['tag-warning','良好'] : ['tag-danger','待改进'];
            return `<tr><td>${d.id}</td><td><strong>${d.name}</strong></td><td><span style="font-size:12px">${d.module||'-'}</span></td><td>${d.position||'-'}</td><td>${d.kpi||'-'}</td><td><strong style="font-size:15px;color:${d.score>=90?'var(--success)':d.score>=80?'var(--warning)':'var(--danger)'}">${d.score}</strong></td><td><span class="tag ${grade[0]}">${grade[1]}</span></td><td>${d.rank||'-'}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'KPI详情 - \' + rowCellText(this,1),rowDetailHTML(this))">详情</button></td></tr>`;
          }).join('') || '<tr><td colspan="9" class="loading">暂无数据</td></tr>'}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    // 五模块KPI达成对比（分组柱状图）
    initChart('kpiModuleChart', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['目标值','实际值'] },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: mods.map(m => m.name) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        { name: '目标值', type: 'bar', data: mods.map(m => m.target), itemStyle: { color: '#cbd5e1' } },
        { name: '实际值', type: 'bar', data: mods.map(m => ({
          value: m.actual, itemStyle: { color: m.actual >= m.target ? COLORS.green : m.actual >= m.target * 0.9 ? COLORS.orange : COLORS.red }
        })) }
      ]
    });
    // KPI分数分布饼图
    initChart('kpiDistChart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 12 },
        data: [
          { value: ov.excellent || 35, name: '优秀(≥90)', itemStyle: { color: COLORS.green } },
          { value: ov.good || 62, name: '良好(80-89)', itemStyle: { color: COLORS.orange } },
          { value: ov.belowStandard || 31, name: '待改进(<80)', itemStyle: { color: COLORS.red } }
        ]
      }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 试用期到期预警 ==========
async function loadHrProbation() {
  const data = await fetchAPI(API.hrProbation);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-triangle"></use></svg></div><div class="kpi-value">${data.overview.expired}</div><div class="kpi-label">已到期未评估</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clock"></use></svg></div><div class="kpi-value">${data.overview.in7Days}</div><div class="kpi-label">7天内到期</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar"></use></svg></div><div class="kpi-value">${data.overview.in15Days}</div><div class="kpi-label">15天内到期</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">试用期总人数</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"> 待评估清单 <button class="btn btn-outline" style="float:right;padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'导出试用期清单\',\'<p style=\'margin:0;color:#666;font-size:13px\'>试用期评估清单将导出为 Excel。</p>\',\'确认导出\',\'试用期评估清单已导出\')"> 导出</button></div>
      <table class="data-table">
        <thead><tr><th>工号</th><th>姓名</th><th>中心</th><th>部门</th><th>入职日期</th><th>到期日</th><th>剩余天数</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.list.map(r => {
            const st = r.daysLeft < 0 ? ['tag-danger','已到期'] : r.daysLeft <= 7 ? ['tag-warning','紧急'] : ['tag-info','关注'];
            return `<tr><td>${r.id}</td><td><strong>${r.name}</strong></td><td>${r.center}</td><td>${r.dept}</td><td>${r.joinDate}</td><td>${r.expireDate}</td><td style="color:${r.daysLeft<0?'var(--danger)':r.daysLeft<=7?'var(--warning)':'var(--text-light)'}"><strong>${r.daysLeft < 0 ? '已超期'+Math.abs(r.daysLeft)+'天' : r.daysLeft+'天'}</strong></td><td><span class="tag ${st[0]}">${st[1]}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showFormModal(\'发起转正评估 - \' + rowCellText(this,1),[{\'name\':\'assessScore\',\'label\':\'评估得分\',\'type\':\'number\',\'value\':\'85\'},{\'name\':\'assessComment\',\'label\':\'评估意见\',\'type\':\'textarea\',\'rows\':3}],\'提交评估\',\'转正评估已发起\')">发起评估</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 人力周报 ==========
async function loadHrWeekly() {
  const data = await fetchAPI(API.hrWeekly);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:15px;font-weight:600">${data.period} 人力周报</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" style="padding:5px 14px;font-size:12px" onclick="showConfirmModal(\'导出周报\',\'<p style=\'margin:0;color:#666;font-size:13px\'>周报将导出为 Excel。</p>\',\'确认导出\',\'周报已导出Excel\')"> 导出Excel</button>
        <button class="btn btn-primary" style="padding:5px 14px;font-size:12px" onclick="showConfirmModal(\'发送周报邮件\',\'<p style=\'margin:0;color:#666;font-size:13px\'>周报将作为邮件发送至相关接收人。</p>\',\'确认发送\',\'周报邮件已发送\')"> 发送邮件</button>
      </div>
    </div>
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-plus-circle"></use></svg></div><div class="kpi-value">${data.summary.onboard}</div><div class="kpi-label">本周入职</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-minus-circle"></use></svg></div><div class="kpi-value">${data.summary.resign}</div><div class="kpi-label">本周离职</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.summary.regular}</div><div class="kpi-label">本周转正</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></div><div class="kpi-value">${data.summary.transfer}</div><div class="kpi-label">本周调岗</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-target"></use></svg></div><div class="kpi-value">${data.summary.recruitProgress}</div><div class="kpi-label">招聘完成率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各中心人员变动</div>
        <div id="weeklyCenterChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 近8周入职离职趋势</div>
        <div id="weeklyTrendChart" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bell"></use></svg> 下周待办事项</div>
      <table class="data-table">
        <thead><tr><th>类型</th><th>事项</th><th>人数</th><th>详情</th><th>操作</th></tr></thead>
        <tbody>
          ${data.todo.map(t => `<tr><td><span class="tag ${t.tagClass}">${t.type}</span></td><td><strong>${t.item}</strong></td><td>${t.count}</td><td>${t.detail}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'周报项\',\'<div style=\'font-size:13px;line-height:2\'>\' + rowCellText(this,0) + \'</div>\')">查看</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('weeklyCenterChart', {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['入职','离职','转正'] },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.byCenter.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [
        { name: '入职', type: 'bar', data: data.byCenter.map(c => c.onboard), itemStyle: { color: COLORS.green } },
        { name: '离职', type: 'bar', data: data.byCenter.map(c => c.resign), itemStyle: { color: COLORS.red } },
        { name: '转正', type: 'bar', data: data.byCenter.map(c => c.regular), itemStyle: { color: COLORS.blue } }
      ]
    });
    initChart('weeklyTrendChart', {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['入职','离职'] },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.trend.map(t => t.week) },
      yAxis: { type: 'value' },
      series: [
        { name: '入职', type: 'line', data: data.trend.map(t => t.in), itemStyle: { color: COLORS.green }, smooth: true },
        { name: '离职', type: 'line', data: data.trend.map(t => t.out), itemStyle: { color: COLORS.red }, smooth: true }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 劳动关系管理 ==========
async function loadHrLabor() {
  const rawData = await fetchAPI(API.hrLabor);
  // 虚拟数据 fallback：API 无效时使用
  const hasValidData = rawData && rawData.overview && rawData.typeDist && rawData.list;
  const data = hasValidData ? rawData : {
    overview: { total: 18, pending: 5, resolved: 12, totalCompensation: 45.8 },
    typeDist: [
      { type: '劳动合同纠纷', count: 7 }, { type: '工资薪酬争议', count: 5 },
      { type: '社保缴纳争议', count: 3 }, { type: '工伤赔偿', count: 2 },
      { type: '竞业限制纠纷', count: 1 }
    ],
    centerDist: [
      { center: '太原', count: 4 }, { center: '南昌', count: 3 },
      { center: '晋中', count: 3 }, { center: '沈阳', count: 3 },
      { center: '南宁', count: 3 }, { center: '上海', count: 2 }
    ],
    list: [
      { id: 'LB001', name: '***', center: '太原', type: '工资薪酬争议', filedDate: '2026-05-15', status: '处理中', progress: '调解中' },
      { id: 'LB002', name: '***', center: '南昌', type: '劳动合同纠纷', filedDate: '2026-04-20', status: '处理中', progress: '仲裁中' },
      { id: 'LB003', name: '***', center: '晋中', type: '社保缴纳争议', filedDate: '2026-06-01', status: '已结案', progress: '100%' },
      { id: 'LB004', name: '***', center: '沈阳', type: '工伤赔偿', filedDate: '2026-03-10', status: '已结案', progress: '100%' },
      { id: 'LB005', name: '***', center: '南宁', type: '劳动合同纠纷', filedDate: '2026-06-18', status: '紧急', progress: '待受理' }
    ]
  };
  const ov = data.overview || {};
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-scale"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">案件总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-hourglass"></use></svg></div><div class="kpi-value">${data.overview.pending}</div><div class="kpi-label">处理中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.resolved}</div><div class="kpi-label">已结案</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-coins"></use></svg></div><div class="kpi-value">${data.overview.totalCompensation}万</div><div class="kpi-label">累计经济补偿</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 案件类型分布</div>
        <div id="laborTypeChart" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-building-2"></use></svg> 各中心案件数量</div>
        <div id="laborCenterChart" style="height:280px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"> 案件明细 <button class="btn btn-primary" style="float:right;padding:4px 12px;font-size:12px"  id="zg_btn_6"> 新增案件</button></div>
      <table class="data-table">
        <thead><tr><th>案件编号</th><th>当事人</th><th>中心</th><th>案件类型</th><th>立案日期</th><th>状态</th><th>进度</th><th>操作</th></tr></thead>
        <tbody>
          ${data.list.map(r => {
            const st = r.status === '已结案' ? ['tag-success','已结案'] : r.status === '处理中' ? ['tag-warning','处理中'] : ['tag-danger','紧急'];
            return `<tr><td>${r.id}</td><td><strong>${r.name}</strong></td><td>${r.center}</td><td>${r.type}</td><td>${r.filedDate}</td><td><span class="tag ${st[0]}">${st[1]}</span></td><td>${r.progress}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showCaseDetail({id:'${r.id}',name:'${r.name}',center:'${r.center||''}',type:'${r.type||''}',status:'${r.status||''}',amount:${r.amount||0},progress:'${r.progress||''}',filedDate:'${r.filedDate||''}'})">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('laborTypeChart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}件 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 12 },
        data: data.typeDist.map(t => ({ value: t.count, name: t.type }))
      }]
    });
    initChart('laborCenterChart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.centerDist.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.centerDist.map(c => c.count), itemStyle: { color: COLORS.purple }, label: { show: true, position: 'top' } }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 讲师库 ==========
async function loadTrainInstructor() {
  const data = await fetchAPI(API.trainInstructor);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-user-check"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">讲师总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">⭐</div><div class="kpi-value">${data.overview.fiveStar}</div><div class="kpi-label">五星级讲师</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trophy"></use></svg></div><div class="kpi-value">${data.overview.special}</div><div class="kpi-label">特聘讲师</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-library"></use></svg></div><div class="kpi-value">${data.overview.totalCourses}</div><div class="kpi-label">累计授课</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-door-open"></use></svg></div><div class="kpi-value">${data.overview.resigned}</div><div class="kpi-label">已离职讲师</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各星级讲师分布</div>
        <div id="instructorStarChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-building-2"></use></svg> 各中心讲师数量</div>
        <div id="instructorCenterChart" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"> 讲师明细 <div style="float:right;display:flex;gap:6px"><button class="btn btn-outline" style="padding:4px 12px;font-size:12px"  id="zg_btn_7"> 导入</button><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showDetailModal('导出讲师明细','<div style=\'padding:24px;text-align:center\'><div style=\'font-size:48px;margin-bottom:16px\'></div><div style=\'font-size:16px;font-weight:600;margin-bottom:8px\'>导出讲师数据</div><div style=\'font-size:13px;color:#888;margin-bottom:20px\'>当前共有 <strong>X</strong> 位讲师记录</div><div style=\'display:flex;gap:12px;justify-content:center;margin-bottom:16px\'><label style=\'flex:1;padding:14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:center;background:#f8f9ff\'><input type=\'checkbox\' checked style=\'margin-right:6px\'>全量导出</label><label style=\'flex:1;padding:14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:center\'><input type=\'checkbox\'>仅在职讲师</label></div><div style=\'display:flex;gap:12px;justify-content:center\'><label style=\'flex:1;padding:14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:center\'><input type=\'checkbox\' checked>含评分数据</label><label style=\'flex:1;padding:14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:center\'><input type=\'checkbox\' checked>含授课记录</label></div><button class=\'btn btn-primary\' style=\'margin-top:16px;width:200px\' onclick=\'closeDetailModal();alert(\\'讲师明细已导出为 Excel\\n\\n文件名：讲师明细_20260720.xlsx\\n记录数：X 条')确认导出</button></div>')"> 导出</button></div></div>
      <table class="data-table">
        <thead><tr><th>工号</th><th>姓名</th><th>中心</th><th>等级</th><th>专业方向</th><th>累计授课</th><th>平均评分</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.list.map(r => `<tr><td>${r.id}</td><td><strong>${r.name}</strong></td><td>${r.center}</td><td><span class="tag ${r.level==='五星级'?'tag-warning':r.level==='四星级'?'tag-info':'tag-success'}">${r.level}</span></td><td>${r.expertise}</td><td>${r.courseCount}场</td><td>${r.rating}</td><td>${r.status==='在职'?'<span class="tag tag-success">在职</span>':'<span class="tag tag-danger">离职</span>'}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'讲师详情 - \' + rowCellText(this,1),rowDetailHTML(this))">详情</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('instructorStarChart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 12 },
        data: data.starDist
      }]
    });
    initChart('instructorCenterChart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.centerDist.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.centerDist.map(c => c.count), itemStyle: { color: COLORS.teal }, label: { show: true, position: 'top' } }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 课程库 ==========
async function loadTrainCourse() {
  const rawData = await fetchAPI(API.trainCourse);
  // 虚拟数据 fallback：API 无效时使用
  const hasValidData = rawData && rawData.overview && rawData.list && rawData.matrix;
  const data = hasValidData ? rawData : {
    overview: { totalCourses: 42, published: 35, updating: 5, totalLearners: 1280 },
    matrix: {
      teams: ['新员工培训','专业技能','管理能力','合规培训','软技能'],
      levels: ['初级','中级','高级','专家级'],
      data: [
        [0,8,3,1,2],[5,6,4,0,1],[3,7,5,2,1],[2,4,6,3,0],[1,2,3,4,2],
        [0,3,2,1,0],[2,5,4,1,1],[1,3,5,2,0]
      ]
    },
    list: [
      { id:'CR001', name:'新员工入职培训', team:'新员工培训', level:'初级', hours:16, instructor:'张明华', learners:186, status:'已发布' },
      { id:'CR002', name:'催收话术进阶', team:'专业技能', level:'中级', hours:8, instructor:'李晓峰', learners:95, status:'已发布' },
      { id:'CR003', name:'团队管理与激励', team:'管理能力', level:'高级', hours:12, instructor:'王建国', learners:62, status:'已发布' },
      { id:'CR004', name:'劳动法规与合规', team:'合规培训', level:'中级', hours:6, instructor:'陈法', learners:148, status:'已发布' },
      { id:'CR005', name:'高效沟通技巧', team:'软技能', level:'初级', hours:4, instructor:'刘芳', learners:210, status:'更新中' },
      { id:'CR006', name:'BPO行业基础知识', team:'新员工培训', level:'初级', hours:10, instructor:'赵强', learners:175, status:'已发布' },
      { id:'CR007', name:'情绪压力管理', team:'软技能', level:'中级', hours:3, instructor:'周静', learners:88, status:'已发布' },
      { id:'CR008', name:'数据分析基础', team:'专业技能', level:'高级', hours:14, instructor:'吴涛', learners:45, status:'更新中' }
    ]
  };
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-book-opened"></use></svg></div><div class="kpi-value">${data.overview.totalCourses}</div><div class="kpi-label">课程总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.published}</div><div class="kpi-label">已发布</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></div><div class="kpi-value">${data.overview.updating}</div><div class="kpi-label">更新中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-users"></use></svg></div><div class="kpi-value">${data.overview.totalLearners}</div><div class="kpi-label">累计学习人次</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各团队课程矩阵</div>
      <div id="courseMatrixChart" style="height:400px"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"> 课程明细 <div style="float:right;display:flex;gap:6px"><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'导入课程\',\'<p style=\'margin:0;color:#666;font-size:13px\'>请选择课程数据 Excel 文件导入。</p>\',\'选择文件\',\'课程数据导入中\')"> 导入</button><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'导出课程\',\'<p style=\'margin:0;color:#666;font-size:13px\'>课程明细将导出为 Excel。</p>\',\'确认导出\',\'课程明细已导出\')"> 导出</button></div></div>
      <table class="data-table">
        <thead><tr><th>课程编号</th><th>课程名称</th><th>团队</th><th>层级</th><th>课时</th><th>讲师</th><th>学习人次</th><th>状态</th></tr></thead>
        <tbody>
          ${data.list.map(r => `<tr><td>${r.id}</td><td><strong>${r.name}</strong></td><td>${r.team}</td><td>${r.level}</td><td>${r.hours}h</td><td>${r.instructor}</td><td>${r.learners}</td><td><span class="tag ${r.status==='已发布'?'tag-success':'tag-warning'}">${r.status}</span></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    const teams = data.matrix.teams;
    const levels = data.matrix.levels;
    initChart('courseMatrixChart', {
      tooltip: { position: 'top' },
      grid: { left: 120, right: 40, top: 30, bottom: 60 },
      xAxis: { type: 'category', data: levels, splitArea: { show: true } },
      yAxis: { type: 'category', data: teams, splitArea: { show: true } },
      visualMap: { min: 0, max: 20, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#e0f2fe','#3b82f6'] } },
      series: [{ name: '课程数', type: 'heatmap', data: data.matrix.data, label: { show: true }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } } }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 干部流失分析 ==========
async function loadTrainCadreLoss() {
  const data = await fetchAPI(API.trainCadreLoss);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-briefcase"></use></svg></div><div class="kpi-value">${data.overview.totalCadres}</div><div class="kpi-label">干部总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-down"></use></svg></div><div class="kpi-value">${data.overview.lossCount}</div><div class="kpi-label">流失人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${data.overview.lossRate}%</div><div class="kpi-label">流失率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">🏃</div><div class="kpi-value">${data.overview.activeRate}%</div><div class="kpi-label">主动流失占比</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">⏱️</div><div class="kpi-value">${data.overview.avgTenure}年</div><div class="kpi-label">平均在职年限</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 后备 vs 在职干部分布</div>
        <div id="cadreDistChart" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-search"></use></svg> 流失原因分析</div>
        <div id="cadreReasonChart" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"> 干部流失明细 <button class="btn btn-outline" style="float:right;padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'导出干部流失\',\'<p style=\'margin:0;color:#666;font-size:13px\'>干部流失明细将导出为 Excel。</p>\',\'确认导出\',\'干部流失明细已导出\')"> 导出</button></div>
      <table class="data-table">
        <thead><tr><th>姓名</th><th>层级</th><th>中心</th><th>任职年限</th><th>离职日期</th><th>流失类型</th><th>原因</th><th>风险等级</th></tr></thead>
        <tbody>
          ${data.list.map(r => {
            const risk = r.risk === '高' ? ['tag-danger','高'] : r.risk === '中' ? ['tag-warning','中'] : ['tag-success','低'];
            return `<tr><td><strong>${r.name}</strong></td><td>${r.level}</td><td>${r.center}</td><td>${r.tenure}年</td><td>${r.leaveDate}</td><td>${r.lossType}</td><td>${r.reason}</td><td><span class="tag ${risk[0]}">${risk[1]}</span></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('cadreDistChart', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['在职干部','后备干部'] },
      grid: { left: 80, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.dist.map(d => d.level) },
      yAxis: { type: 'value' },
      series: [
        { name: '在职干部', type: 'bar', data: data.dist.map(d => d.active), itemStyle: { color: COLORS.blue } },
        { name: '后备干部', type: 'bar', data: data.dist.map(d => d.reserve), itemStyle: { color: COLORS.orange } }
      ]
    });
    initChart('cadreReasonChart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0, type: 'scroll' },
      series: [{ type: 'pie', radius: ['35%','60%'], center: ['50%','42%'],
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
        data: data.reasons
      }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 编制库 ==========
async function loadTrainEstLib() {
  const data = await fetchAPI(API.trainEstLib);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-ruler"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">编制总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.registered}</div><div class="kpi-label">在册人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${data.overview.orders}</div><div class="kpi-label">订单总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${data.overview.utilRate}%</div><div class="kpi-label">使用率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 编制增长趋势（同比）</div>
        <div id="estLibTrendChart" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各中心编制对比</div>
        <div id="estLibCenterChart" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"> 编制明细 <div style="float:right;display:flex;gap:6px"><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'导入编制数据\',\'<p style=\'margin:0;color:#666;font-size:13px\'>请选择编制数据 Excel 文件导入。</p>\',\'选择文件\',\'编制数据导入中\')"> 导入</button><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'导出编制明细\',\'<p style=\'margin:0;color:#666;font-size:13px\'>编制明细将导出为 Excel。</p>\',\'确认导出\',\'编制明细已导出\')"> 导出</button></div></div>
      <table class="data-table">
        <thead><tr><th>中心</th><th>项目</th><th>编制数</th><th>在册</th><th>订单中</th><th>使用率</th><th>同比变化</th><th>状态</th></tr></thead>
        <tbody>
          ${data.list.map(r => {
            const yoy = r.yoy >= 0 ? `<span style="color:var(--success)">+${r.yoy}</span>` : `<span style="color:var(--danger)">${r.yoy}</span>`;
            const st = r.utilRate >= 95 ? ['tag-success','满编'] : r.utilRate >= 80 ? ['tag-warning','缺口'] : ['tag-danger','严重缺'];
            return `<tr><td><strong>${r.center}</strong></td><td>${r.project}</td><td>${r.establishment}</td><td>${r.registered}</td><td>${r.orders}</td><td>${r.utilRate}%</td><td>${yoy}</td><td><span class="tag ${st[0]}">${st[1]}</span></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('estLibTrendChart', {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['本年','去年'] },
      grid: { left: 50, right: 30, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.trend.map(t => t.month) },
      yAxis: { type: 'value' },
      series: [
        { name: '本年', type: 'line', data: data.trend.map(t => t.current), itemStyle: { color: COLORS.blue }, smooth: true },
        { name: '去年', type: 'line', data: data.trend.map(t => t.lastYear), itemStyle: { color: COLORS.orange, type: 'dashed' }, smooth: true }
      ]
    });
    initChart('estLibCenterChart', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['编制','在册','订单'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.centerDist.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [
        { name: '编制', type: 'bar', data: data.centerDist.map(c => c.establishment), itemStyle: { color: COLORS.blue } },
        { name: '在册', type: 'bar', data: data.centerDist.map(c => c.registered), itemStyle: { color: COLORS.green } },
        { name: '订单', type: 'bar', data: data.centerDist.map(c => c.orders), itemStyle: { color: COLORS.orange } }
      ]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 培训物料库存管理 ==========
async function loadTrainMaterial() {
  const data = await fetchAPI(API.trainMaterial);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-package"></use></svg></div><div class="kpi-value">${data.overview.totalItems}</div><div class="kpi-label">物料种类</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.normalStock}</div><div class="kpi-label">库存正常</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.overview.lowStock}</div><div class="kpi-label">库存预警</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-file-edit"></use></svg></div><div class="kpi-value">${data.overview.totalRecords}</div><div class="kpi-label">本月领用记录</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"> 物料库存明细 <button class="btn btn-primary" style="float:right;padding:4px 12px;font-size:12px" onclick="showFormModal(\'物料入库\',[{\'name\':\'matName\',\'label\':\'物料名称\',\'required\':true},{\'name\':\'matQty\',\'label\':\'数量\',\'type\':\'number\',\'required\':true,\'value\':\'1\'},{\'name\':\'matSupplier\',\'label\':\'供应商\'},{\'name\':\'matNote\',\'label\':\'备注\',\'type\':\'textarea\',\'rows\':2}],\'登记入库\',\'物料已入库\')"> 入库</button></div>
      <table class="data-table">
        <thead><tr><th>物料编号</th><th>物料名称</th><th>类别</th><th>单位</th><th>当前库存</th><th>安全库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.inventory.map(r => {
            const st = r.stock < r.safetyStock ? ['tag-danger','库存不足'] : r.stock < r.safetyStock * 1.5 ? ['tag-warning','偏低'] : ['tag-success','正常'];
            return `<tr><td>${r.id}</td><td><strong>${r.name}</strong></td><td>${r.category}</td><td>${r.unit}</td><td style="color:${r.stock<r.safetyStock?'var(--danger)':'var(--text)'}">${r.stock}</td><td>${r.safetyStock}</td><td><span class="tag ${st[0]}">${st[1]}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showKpiDetail({id:'${r.id}',name:'${r.name}',module:'${r.module||''}',score:${r.score||0},rank:${r.rank||0}})">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-file-edit"></use></svg> 近期领用记录</div>
      <table class="data-table">
        <thead><tr><th>日期</th><th>物料</th><th>数量</th><th>领用人</th><th>培训批次</th><th>用途</th><th>审批人</th></tr></thead>
        <tbody>
          ${data.records.map(r => `<tr><td>${r.date}</td><td><strong>${r.material}</strong></td><td>${r.qty}</td><td>${r.applicant}</td><td>${r.batch}</td><td>${r.purpose}</td><td>${r.approver}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 招聘-二线职能需求达成看板 ==========
async function loadRecruitBackoffice() {
  const data = await fetchAPI(API.recruitBackoffice);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="filter-bar">
      <select id="boCenter"><option value="">全部中心</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
      <select id="boDept"><option value="">全部职能</option><option>综管部</option><option>财务部</option><option>IT部</option><option>法务部</option></select>
      <input type="month" value="2026-07">
      <button class="btn btn-primary">查询</button>
      <button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-download"></use></svg> 导出</button>
    </div>
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${data.overview.totalDemand}</div><div class="kpi-label">年度需求总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.totalOnboard}</div><div class="kpi-label">已入职人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg></div><div class="kpi-value">${data.overview.achieveRate}%</div><div class="kpi-label">整体达成率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></div><div class="kpi-value">${data.overview.inProgress}</div><div class="kpi-label">招聘中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-hourglass"></use></svg></div><div class="kpi-value">${data.overview.pending}</div><div class="kpi-label">待启动</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各职能需求达成对比</div>
        <div id="boDeptChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 月度需求vs入职趋势</div>
        <div id="boTrendChart" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 二线职能需求明细</div>
      <table class="data-table">
        <thead><tr><th>中心</th><th>职能</th><th>岗位</th><th>编制数</th><th>在岗</th><th>空缺</th><th>招聘中</th><th>达成率</th><th>状态</th></tr></thead>
        <tbody>
          ${data.list.map(d => `<tr><td><strong>${d.center}</strong></td><td>${d.dept}</td><td>${d.position}</td><td>${d.demand}</td><td>${d.onboard}</td><td>${d.vacant}</td><td>${d.recruiting}</td><td><span class="tag ${d.rate>=80?'tag-success':d.rate>=50?'tag-warning':'tag-danger'}">${d.rate}%</span></td><td><span class="tag ${d.status==='完成'?'tag-success':d.status==='招聘中'?'tag-warning':'tag-info'}">${d.status}</span></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('boDeptChart', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['需求', '已入职'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.deptSummary.map(d => d.dept) },
      yAxis: { type: 'value' },
      series: [
        { name: '需求', type: 'bar', data: data.deptSummary.map(d => d.demand), itemStyle: { color: COLORS.blue } },
        { name: '已入职', type: 'bar', data: data.deptSummary.map(d => d.onboard), itemStyle: { color: COLORS.green } }
      ]
    });
    initChart('boTrendChart', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['需求', '入职'] },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.trend.map(t => t.month) },
      yAxis: { type: 'value' },
      series: [
        { name: '需求', type: 'bar', data: data.trend.map(t => t.demand), itemStyle: { color: COLORS.blue } },
        { name: '入职', type: 'line', smooth: true, data: data.trend.map(t => t.onboard), itemStyle: { color: COLORS.green } }
      ]
    });
  }, 50);
}

// ========== 招聘-RPO校招看板 ==========
async function loadRecruitRpo() {
  const data = await fetchAPI(API.recruitRpo);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="filter-bar">
      <select><option value="">全部渠道</option><option>校招-山西大学</option><option>校招-太原理工</option><option>RPO-智联</option><option>RPO-BOSS直聘</option></select>
      <input type="month" value="2026-07">
      <button class="btn btn-primary">查询</button>
      <button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-download"></use></svg> 导出</button>
    </div>
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-graduation-cap"></use></svg></div><div class="kpi-value">${data.overview.totalCandidates}</div><div class="kpi-label">总候选人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${data.overview.interviewed}</div><div class="kpi-label">面试人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📨</div><div class="kpi-value">${data.overview.offered}</div><div class="kpi-label">Offer数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.onboarded}</div><div class="kpi-label">入职人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-down"></use></svg></div><div class="kpi-value">${data.overview.conversionRate}%</div><div class="kpi-label">整体转化率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 各渠道RPO转化漏斗</div>
        <div id="rpoFunnel" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 校招vs RPO对比</div>
        <div id="rpoCompare" style="height:300px"></div>
      </div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 渠道明细</div>
        <table class="data-table">
          <thead><tr><th>渠道</th><th>类型</th><th>候选</th><th>面试</th><th>Offer</th><th>入职</th><th>转化率</th><th>费用(元)</th></tr></thead>
          <tbody>
            ${data.channels.map(c => `<tr><td><strong>${c.name}</strong></td><td><span class="tag ${c.type==='校招'?'tag-info':'tag-warning'}">${c.type}</span></td><td>${c.candidates}</td><td>${c.interviewed}</td><td>${c.offered}</td><td>${c.onboarded}</td><td>${c.rate}%</td><td>${c.cost.toLocaleString()}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bell"></use></svg> 近期校招活动</div>
        ${data.activities.map(a => `<div class="alert-item alert-${a.status==='进行中'?'info':'success'}"><span class="alert-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-graduation-cap"></use></svg></span><div><strong>${a.name}</strong> · ${a.date}<br><span style="font-size:12px;color:var(--text-light)">${a.school} | 岗位: ${a.position} | 候选${a.candidates}人 | ${a.status}</span></div></div>`).join('')}
      </div>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('rpoFunnel', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [{ type: 'funnel', left: '10%', right: '10%', top: 10, bottom: 10, minSize: '20%',
        label: { position: 'inside', fontSize: 12, color: '#fff' },
        data: [
          { value: data.overview.totalCandidates, name: '候选人', itemStyle: { color: COLORS.blue } },
          { value: data.overview.interviewed, name: '面试', itemStyle: { color: COLORS.cyan } },
          { value: data.overview.offered, name: 'Offer', itemStyle: { color: COLORS.orange } },
          { value: data.overview.onboarded, name: '入职', itemStyle: { color: COLORS.green } }
        ]
      }]
    });
    initChart('rpoCompare', {
      tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['校招', 'RPO'] },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: ['候选人', '面试', 'Offer', '入职'] },
      yAxis: { type: 'value' },
      series: [
        { name: '校招', type: 'bar', data: data.compare.campus, itemStyle: { color: COLORS.purple } },
        { name: 'RPO', type: 'bar', data: data.compare.rpo, itemStyle: { color: COLORS.cyan } }
      ]
    });
  }, 50);
}

// ========== 公关-危机预案知识库 ==========
async function loadPrCrisis() {
  const data = await fetchAPI(API.prCrisis);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="filter-bar">
      <input type="text" placeholder="搜索预案..." style="flex:1;max-width:300px">
      <select><option value="">全部等级</option><option>一级（重大）</option><option>二级（较大）</option><option>三级（一般）</option></select>
      <select><option value="">全部状态</option><option>已发布</option><option>演练中</option><option>修订中</option></select>
      <button class="btn btn-primary"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-search"></use></svg> 搜索</button>
      <button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-plus-circle"></use></svg> 新建预案</button>
    </div>
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">预案总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.published}</div><div class="kpi-label">已发布</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></div><div class="kpi-value">${data.overview.drilling}</div><div class="kpi-label">演练中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${data.overview.expiring}</div><div class="kpi-label">即将过期</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 危机预案列表</div>
      <table class="data-table">
        <thead><tr><th>预案编号</th><th>预案名称</th><th>等级</th><th>类别</th><th>负责人</th><th>最近演练</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.list.map(p => `<tr><td>${p.id}</td><td><strong>${p.name}</strong></td><td><span class="tag ${p.level==='一级（重大）'?'tag-danger':p.level==='二级（较大）'?'tag-warning':'tag-info'}">${p.level}</span></td><td>${p.category}</td><td>${p.owner}</td><td>${p.lastDrill}</td><td><span class="tag ${p.status==='已发布'?'tag-success':p.status==='演练中'?'tag-warning':'tag-info'}">${p.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'预案详情 - \' + rowCellText(this,1),rowDetailHTML(this))">查看</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 预案等级分布</div>
        <div id="crisisLevel" style="height:260px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar"></use></svg> 年度演练计划</div>
        <table class="data-table">
          <thead><tr><th>季度</th><th>预案</th><th>计划日期</th><th>状态</th></tr></thead>
          <tbody>
            ${data.drillPlan.map(d => `<tr><td>${d.quarter}</td><td>${d.name}</td><td>${d.date}</td><td><span class="tag ${d.status==='已完成'?'tag-success':'tag-warning'}">${d.status}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('crisisLevel', {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 12 },
        data: data.levelDist.map((d, i) => ({ value: d.count, name: d.level, itemStyle: { color: [COLORS.red, COLORS.orange, COLORS.blue][i] } }))
      }]
    });
  }, 50);
}

// ========== 公关-媒体资源库 ==========
async function loadPrMedia() {
  const data = await fetchAPI(API.prMedia);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="filter-bar">
      <input type="text" placeholder="搜索媒体/记者..." style="flex:1;max-width:300px">
      <select><option value="">全部类型</option><option>财经</option><option>科技</option><option>综合</option><option>行业</option></select>
      <select><option value="">全部级别</option><option>核心媒体</option><option>友好媒体</option><option>普通媒体</option></select>
      <button class="btn btn-primary"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-search"></use></svg> 搜索</button>
      <button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-plus-circle"></use></svg> 新增媒体</button>
    </div>
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-radio"></use></svg></div><div class="kpi-value">${data.overview.totalMedia}</div><div class="kpi-label">合作媒体数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-user"></use></svg></div><div class="kpi-value">${data.overview.totalContacts}</div><div class="kpi-label">记者联系人</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">⭐</div><div class="kpi-value">${data.overview.coreMedia}</div><div class="kpi-label">核心媒体</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-newspaper"></use></svg></div><div class="kpi-value">${data.overview.recentReports}</div><div class="kpi-label">本月报道数</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 媒体资源明细</div>
      <table class="data-table">
        <thead><tr><th>媒体名称</th><th>类型</th><th>级别</th><th>记者</th><th>职务</th><th>联系方式</th><th>合作状态</th><th>最近互动</th></tr></thead>
        <tbody>
          ${data.list.map(m => `<tr><td><strong>${m.name}</strong></td><td>${m.type}</td><td><span class="tag ${m.level==='核心媒体'?'tag-success':m.level==='友好媒体'?'tag-info':'tag-warning'}">${m.level}</span></td><td>${m.contact}</td><td>${m.title}</td><td>${m.phone} / ${m.email}</td><td><span class="tag ${m.status==='活跃'?'tag-success':'tag-info'}">${m.status}</span></td><td>${m.lastContact}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 媒体类型分布</div>
        <div id="mediaTypeChart" style="height:260px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trend-up"></use></svg> 月度报道趋势</div>
        <div id="mediaTrendChart" style="height:260px"></div>
      </div>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('mediaTypeChart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 12 },
        data: data.typeDist.map((d, i) => ({ value: d.count, name: d.type, itemStyle: { color: PALETTE[i] } }))
      }]
    });
    initChart('mediaTrendChart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.reportTrend.map(t => t.month) },
      yAxis: { type: 'value' },
      series: [{ type: 'line', smooth: true, data: data.reportTrend.map(t => t.count), itemStyle: { color: COLORS.blue }, areaStyle: { opacity: 0.15 } }]
    });
  }, 50);
}

// ========== 人事-制度知识库 ==========
async function loadHrPolicy() {
  const data = await fetchAPI(API.hrPolicy);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="filter-bar">
      <input type="text" placeholder="<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-search"></use></svg> 搜索制度名称/关键词..." style="flex:1;max-width:400px">
      <select><option value="">全部分类</option><option>考勤管理</option><option>薪酬福利</option><option>绩效考核</option><option>劳动合同</option><option>员工手册</option><option>奖惩制度</option></select>
      <select><option value="">全部状态</option><option>现行</option><option>修订中</option><option>已废止</option></select>
      <button class="btn btn-primary">搜索</button>
      <button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-plus-circle"></use></svg> 上传制度</button>
    </div>
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-library"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">制度总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.active}</div><div class="kpi-label">现行制度</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></div><div class="kpi-value">${data.overview.revising}</div><div class="kpi-label">修订中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-eye"></use></svg></div><div class="kpi-value">${data.overview.totalViews}</div><div class="kpi-label">总阅读量</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clipboard-list"></use></svg> 人事制度列表</div>
      <table class="data-table">
        <thead><tr><th>制度编号</th><th>制度名称</th><th>分类</th><th>发布日期</th><th>最近修订</th><th>状态</th><th>阅读量</th><th>操作</th></tr></thead>
        <tbody>
          ${data.list.map(p => `<tr><td>${p.id}</td><td><strong>${p.name}</strong></td><td>${p.category}</td><td>${p.publishDate}</td><td>${p.updateDate}</td><td><span class="tag ${p.status==='现行'?'tag-success':p.status==='修订中'?'tag-warning':'tag-info'}">${p.status}</span></td><td>${p.views}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'文档预览 - \' + rowCellText(this,1),rowDetailHTML(this))">查看</button> <button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'下载文档 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>开始下载文档。</p>\',\'开始下载\',\'文档开始下载\')">下载</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 行政-操作手册知识库 ==========
async function loadAdminManual() {
  const data = await fetchAPI(API.adminManual);
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="filter-bar">
      <input type="text" placeholder="<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-search"></use></svg> 搜索手册/操作流程..." style="flex:1;max-width:400px">
      <select><option value="">全部分类</option><option>办公环境</option><option>资产管理</option><option>采购流程</option><option>印章管理</option><option>车辆管理</option><option>会议管理</option></select>
      <button class="btn btn-primary">搜索</button>
      <button class="btn btn-outline"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-plus-circle"></use></svg> 上传手册</button>
    </div>
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-book-opened"></use></svg></div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">手册总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-check-circle-2"></use></svg></div><div class="kpi-value">${data.overview.active}</div><div class="kpi-label">现行手册</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-refresh-cw"></use></svg></div><div class="kpi-value">${data.overview.updating}</div><div class="kpi-label">更新中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-eye"></use></svg></div><div class="kpi-value">${data.overview.totalViews}</div><div class="kpi-label">总阅读量</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-book-opened"></use></svg> 行政操作手册列表</div>
      <table class="data-table">
        <thead><tr><th>手册编号</th><th>手册名称</th><th>分类</th><th>适用范围</th><th>最近修订</th><th>状态</th><th>阅读量</th><th>操作</th></tr></thead>
        <tbody>
          ${data.list.map(m => `<tr><td>${m.id}</td><td><strong>${m.name}</strong></td><td>${m.category}</td><td>${m.scope}</td><td>${m.updateDate}</td><td><span class="tag ${m.status==='现行'?'tag-success':'tag-warning'}">${m.status}</span></td><td>${m.views}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showInfoModal(\'文档预览 - \' + rowCellText(this,1),rowDetailHTML(this))">查看</button> <button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="showConfirmModal(\'下载文档 - \' + rowCellText(this,1),\'<p style=\'margin:0;color:#666;font-size:13px\'>开始下载文档。</p>\',\'开始下载\',\'文档开始下载\')">下载</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 工具栏系统：数据日期选择器 + 导入导出 + Scope Badge ==========
let historyDates = [];
async function loadHistoryDates() {
  try {
    const d = await fetchAPI('/api/history/dates');
    if (Array.isArray(d)) historyDates = d;
  } catch(e) { /* 静默 */ }
}
function renderToolbar() {
  const tb = document.getElementById('toolbarArea');
  if (!tb) return;
  const user = getUser();
  const dateOptions = ['<option value="">当前数据</option>', ...historyDates.map(d => `<option value="${d}">${d}</option>`)];
  tb.innerHTML = `
    <div class="tb-left">
      <span class="tb-label">数据日期</span>
      <select class="tb-select" id="asOfSelect" onchange="onAsOfChange(this.value)">${dateOptions.join('')}</select>
      <span class="scope-badge" id="scopeBadge">${user ? (user.name || user.username || '') : ''} · ${user && user.center && user.center !== '*' ? user.center + '中心' : '全部中心'}</span>
    </div>
    <div class="tb-right">
      <button class="btn btn-outline btn-sm" onclick="doExport()"> 导出</button>
      <button class="btn btn-primary btn-sm" onclick="doImport()"> 导入</button>
    </div>`;
}
function onAsOfChange(val) { state.asOf = val; const pageId = state.currentPageId; if (pageId) navigate(pageId); }
function updateScopeBadge() {
  const el = document.getElementById('scopeBadge');
  if (!el) return;
  const user = getUser();
  el.textContent = (user ? (user.name || user.username || '') : '') + ' · ' + (user && user.center && user.center !== '*' ? user.center + '中心' : '全部中心');
}
async function doExport() {
  const coll = PAGE_COLLECTION[state.currentPageId] || state.currentPageId;
  const asOf = state.asOf ? '?asOf=' + encodeURIComponent(state.asOf) : '';
  try { const r = await fetch('/api/admin/export?collection=' + coll + asOf, { headers: { 'Authorization': 'Bearer ' + getToken() } }); const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (coll || 'export') + '.json'; a.click(); URL.revokeObjectURL(a.href); }
  catch(e) { alert('导出失败: ' + e.message); }
}
function doImport() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    try { const r = await fetch('/api/admin/import', { method:'POST', headers:{'Authorization':'Bearer '+getToken()}, body:fd }); const d = await r.json(); alert(d.message || (d.error?'导入失败:'+d.error:'导入成功')); if (d.message) navigate(state.currentPageId); }
    catch(e) { alert('导入失败: ' + e.message); }
  };
  inp.click();
}

// ========== HR 人事模块 Loader（RS-001~006） ==========
async function loadHrCoreKpi() {
  const data = await fetchAPI(API.coreKpi);
  if (!data) return;
  renderPage(`
    <div class="section-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-bar-chart-2"></use></svg> 人事核心 KPI 指标</div>
    <div class="kpi-grid cols-4">
      ${[ {v:data.headcountRate||0,l:'编制使用率',icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-ruler\"></use></svg>',c:COLORS.blue},{v:data.contractExpire30||0,l:'30天到期合同',icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-clipboard-list\"></use></svg>',c:COLORS.red},{v:data.probationExpire14||0,l:'14天到期试用',icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-clock\"></use></svg>',c:COLORS.orange},{v:data.laborRisk||0,l:'劳动关系风险',icon:'<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-scale\"></use></svg>',c:COLORS.purple} ].map(k=>`<div class="kpi-card"><div class="kpi-accent" style="background:${k.c}"></div><div class="kpi-icon">${k.icon}</div><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}
    </div>`);
}
async function loadHrWeekly() {
  const data = await fetchAPI(API.hrWeekly);
  if (!data) return;
  renderPage(`<div class="section-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-newspaper"></use></svg> 人力周报</div><div class="kpi-grid cols-5">${(data.summary?[data.summary]:[]).map(s=>`<div class="kpi-card"><div class="kpi-value">${s.onboard+s.resign+s.regular+s.transfer}</div><div class="kpi-label">本周变动</div></div>`).join('')}</div><div class="chart-card"><div class="chart-title">各中心周度明细</div><div id="hrWeeklyChart" style="height:320px"></div></div>`);
  initChart('hrWeeklyChart',{tooltip:{trigger:'axis'},legend:{data:['入职','离职','转正','调动']},xAxis:{type:'category',data:(data.byCenter||[]).map(c=>c.center)},yAxis:{type:'value'},series:[{name:'入职',type:'bar',data:(data.byCenter||[]).map(c=>c.onboard||0)},{name:'离职',type:'bar',data:(data.byCenter||[]).map(c=>c.resign||0)},{name:'转正',type:'bar',data:(data.byCenter||[]).map(c=>c.regular||0)},{name:'调动',type:'bar',data:(data.byCenter||[]).map(c=>c.transfer||0)}]});
}
async function loadHrProbation() {
  const data = await fetchAPI(API.hrProbation);
  if (!data) return;
  const list = data.list || [];
  renderPage(`
    <div class="section-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-clock"></use></svg> 试用期到期预警</div>
    <div class="kpi-grid cols-4" style="margin-bottom:16px">
      <div class="kpi-card"><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg></div><div class="kpi-value">${list.length}</div><div class="kpi-label">试用期总人数</div></div>
      <div class="kpi-card"><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-circle-red"></use></svg></div><div class="kpi-value">${list.filter(x=>x.daysLeft<=7).length}</div><div class="kpi-label">7天内到期</div></div>
      <div class="kpi-card"><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-circle-yellow"></use></svg></div><div class="kpi-value">${list.filter(x=>x.daysLeft>7&&x.daysLeft<=14).length}</div><div class="kpi-label">14天内到期</div></div>
      <div class="kpi-card"><div class="kpi-icon"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-circle-green"></use></svg></div><div class="kpi-value">${list.filter(x=>x.daysLeft>14).length}</div><div class="kpi-label">14天后到期</div></div>
    </div>
    <div class="chart-card">
      <table class="data-table"><thead><tr><th>姓名</th><th>中心</th><th>部门</th><th>入职日期</th><th>到期日期</th><th>剩余天数</th><th>状态</th></tr></thead>
      <tbody>${list.map(p=>`<tr><td>${p.name}</td><td>${p.center||'-'}</td><td>${p.dept||'-'}</td><td>${p.joinDate||'-'}</td><td>${p.probationEnd||'-'}</td><td><span class="tag ${(p.daysLeft||99)<=7?'tag-danger':(p.daysLenext||99)<=14?'tag-warning':'tag-success'}">${p.daysLeft||'-'}天</span></td><td>${p.status||'-'}</td></tr>`).join('')||'<tr><td colspan="7" class="loading">暂无数据</td></tr>'}</tbody>
      </table>
    </div>`);
}

// ========== 预警中心 ==========
async function loadAlerts() {
  const data = await fetchAPI(API.alerts);
  if (!data) return;
  const list = Array.isArray(data) ? data : (data.list || []);
  const lvMap = { high:'alert-high', mid:'alert-mid', low:'alert-low' };
  renderPage(`
    <div class="section-title"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-alert-circle"></use></svg> 预警中心</div>
    <div class="alert-center">${list.map(a => `
      <div class="alert-card ${lvMap[a.level]||''}">
        <div class="alert-card-head"><span class="alert-badge">#${a.id||''}</span><span class="alert-level">${a.level||'mid'}</span></div>
        <div class="alert-title">${a.title||'预警'}</div>
        <div class="alert-desc">${a.desc||''}</div>
        <div class="alert-foot"><span><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-calendar"></use></svg> ${a.createdAt||'-'}</span><span>📍 ${a.center||'-'}</span></div>
      </div>`).join('') || '<div class="loading">暂无预警</div>'}
    </div>`);
}


// === V27: 修复按钮变文字Bug - 事件绑定 ===
document.addEventListener("click", function(e) {
  const btn = e.target.closest("[id^='zg_btn_']");
  if (!btn) return;

  if (btn.id === "zg_btn_0") {
    showDetailModal(`入库登记`, `<div style='padding:20px'><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>物品名称 *</label><input type='text' placeholder='请输入物品名称' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>分类</label><select style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option>办公文具</option><option>办公设备</option><option>清洁用品</option><option>其他</option></select></div><div style='display:flex;gap:10px'><div style='flex:1;margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>数量</label><input type='number' min='1' value='1' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='flex:1;margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>单位</label><select style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option>包</option><option>盒</option><option>个</option><option>台</option></select></div></div><button class='btn btn-primary' style='width:100%' onclick='closeDetailModal();alert(\'入库登记已提交')确认入库</button></div>')`);
    return;
  }

  if (btn.id === "zg_btn_1") {
    showDetailModal(`领用申请`, `<div style='padding:20px'><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>物品名称 *</label><select id='reqItem' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option value=''>-- 请选择 --</option><option>A4打印纸</option><option>中性笔(黑色)</option><option>文件夹(A4)</option><option>订书机</option><option>计算器</option><option>回形针</option><option>便利贴</option><option>档案盒</option></select></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>领用数量 *</label><input type='number' id='reqQty' min='1' value='1' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>用途说明</label><textarea id='reqPurpose' rows='2' placeholder='请简要说明领用用途...' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;resize:vertical'></textarea></div><button class='btn btn-primary' style='width:100%' onclick='var item=document.getElementById(\'reqItem\').value;var qty=document.getElementById(\'reqQty\').value;if(!item){alert(\'请选择物品名称\');return}if(!qty||qty<1){alert(\'请输入有效数量\');return}closeDetailModal();alert(\'领用申请已提交\n\n物品：\' + item + \'\n数量：\' + qty)'>提交申请</button></div>')`);
    return;
  }

  if (btn.id === "zg_btn_2") {
    showDetailModal(`出库登记`, `<div style='padding:20px'><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>物品名称 *</label><select id='outItem' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option value=''>-- 请选择 --</option><option>A4打印纸</option><option>中性笔(黑色)</option><option>文件夹(A4)</option><option>订书机</option><option>计算器</option><option>回形针</option><option>便利贴</option><option>档案盒</option></select></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>出库数量 *</label><input type='number' id='outQty' min='1' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>出库原因</label><select id='outReason' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option value=''>-- 请选择 --</option><option value='领用发放'>领用发放</option><option value='部门调拨'>部门调拨</option><option value='损耗报废'>损耗报废</option><option value='盘亏处理'>盘亏处理</option><option value='其他'>其他</option></select></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>接收人/部门</label><input type='text' id='outReceiver' placeholder='请输入接收人或部门' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><button class='btn btn-primary' style='width:100%' onclick='var item=document.getElementById(\'outItem\').value;var qty=document.getElementById(\'outQty\').value;var reason=document.getElementById(\'outReason\').value;if(!item){alert(\'请选择物品名称\');return}if(!qty){alert(\'请输入出库数量\');return}closeDetailModal();alert(\'出库登记已确认\n\n物品：\' + item + \'\n数量：\' + qty + \'\n原因：\' + reason)'>确认出库</button></div>')`);
    return;
  }

  if (btn.id === "zg_btn_3") {
    showDetailModal(`新增资产登记`, `<div style='padding:20px'><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>资产名称 *</label><input type='text' id='newAssetName' placeholder='请输入资产名称' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>资产分类</label><select id='newAssetCate' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option>电脑设备</option><option>办公家具</option><option>电子设备</option><option>其他设备</option></select></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>价值（元）</label><input type='number' id='newAssetValue' placeholder='0.00' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>使用人</label><input type='text' id='newAssetUser' placeholder='请输入使用人' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>所属中心</label><select id='newAssetCenter' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option>综管中心</option><option>运营中心</option><option>风控中心</option><option>质检中心</option><option>技术中心</option><option>财务中心</option></select></div><button class='btn btn-primary' style='width:100%' onclick='closeDetailModal();alert(\'资产登记已提交，待审批')提交登记</button></div>')`);
    return;
  }

  if (btn.id === "zg_btn_4") {
    showDetailModal(`新增职场`, `<div style='padding:20px'><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>职场名称 *</label><input type='text' id='wpName' placeholder='如：太原基地A座' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>所在城市</label><select id='wpCity' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>详细地址</label><input type='text' id='wpAddr' placeholder='请输入详细地址' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>面积（㎡）</label><input type='number' id='wpArea' placeholder='0' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>工位数量</label><input type='number' id='wpSeats' placeholder='0' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><button class='btn btn-primary' style='width:100%' onclick='var n=document.getElementById(\'wpName\').value;if(!n){alert(\'请填写职场名称\');return}closeDetailModal();alert(\'职场已添加：\' + n)'>提交</button></div>')`);
    return;
  }

  if (btn.id === "zg_btn_5") {
    showDetailModal(`导出职场明细`, `<div style='padding:24px;text-align:center'><div style='font-size:48px;margin-bottom:16px'></div><div style='font-size:16px;font-weight:600;margin-bottom:8px'>导出职场数据</div><div style='font-size:13px;color:#888;margin-bottom:20px'>当前共有 <strong>X</strong> 个职场记录</div><div style='display:flex;gap:12px;justify-content:center;margin-bottom:16px'><label style='flex:1;padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:#f8f9ff'><input type='checkbox' checked style='margin-right:6px'>含使用率数据</label><label style='flex:1;padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer'><input type='checkbox' checked>含租金信息</label></div><button class='btn btn-primary' style='width:200px' onclick='closeDetailModal();alert(\'职场明细已导出\n\n文件名：职场明细_20260720.xlsx')确认导出</button></div>')`);
    return;
  }

  if (btn.id === "zg_btn_6") {
    showDetailModal(`新增劳动纠纷案件`, `<div style='padding:20px'><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>案件类型 *</label><select id='caseType' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option value=''>-- 请选择 --</option><option value='劳动合同纠纷'>劳动合同纠纷</option><option value='工资薪酬争议'>工资薪酬争议</option><option value='社保缴纳争议'>社保缴纳争议</option><option value='工伤赔偿'>工伤赔偿</option><option value='竞业限制纠纷'>竞业限制纠纷</option><option value='其他'>其他</option></select></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>所属中心 *</label><select id='caseCenter' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'><option value=''>-- 请选择 --</option><option value='太原'>太原</option><option value='南昌'>南昌</option><option value='晋中'>晋中</option><option value='沈阳'>沈阳</option><option value='南宁'>南宁</option><option value='上海'>上海</option></select></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>当事人姓名 *</label><input type='text' id='caseParty' placeholder='请输入当事人姓名' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>案情简述 *</label><textarea id='caseDesc' rows='3' placeholder='请简要描述案件情况...' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;resize:vertical'></textarea></div><div style='margin-bottom:14px'><label style='display:block;font-size:13px;color:#666;margin-bottom:4px'>诉求金额（元）</label><input type='number' id='caseAmount' placeholder='0.00' style='width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box'></div><div style='margin-bottom:18px;padding:12px;background:#fff7e6;border:1px solid #ffd591;border-radius:8px'><div style='font-size:13px;color:#d48806;font-weight:600;margin-bottom:4px'> 填写须知</div><div style='font-size:12px;color:#888;line-height:1.6'>1. 案件信息将自动生成编号并进入处理流程<br>2. 涉及金额的案件需附上相关凭证材料<br>3. 敏感信息已做脱敏处理，仅法务及HR可见</div></div><div style='display:flex;gap:10px'><button class='btn btn-primary' style='flex:1;padding:10px' onclick='var ct=document.getElementById(\'caseType\').value;var cc=document.getElementById(\'caseCenter\').value;var cp=document.getElementById(\'caseParty\').value;var cd=document.getElementById(\'caseDesc\').value;if(!ct){alert(\'请选择案件类型\');return}if(!cc){alert(\'请选择所属中心\');return}if(!cp){alert(\'请填写当事人姓名\');return}if(!cd){alert(\'请填写案情简述\');return}closeDetailModal();alert(\'劳动纠纷案件已登记\n\n案件类型：\' + ct + \'\n所属中心：\' + cc + \'\n当事人：\' + cp + \'\n\n系统将自动分配案件编号并启动处理流程\')`);
    return;
  }

  if (btn.id === "zg_btn_7") {
    showDetailModal(`导入讲师数据`, `<div style='padding:24px;text-align:center'><div style='font-size:48px;margin-bottom:16px'></div><div style='font-size:16px;font-weight:600;margin-bottom:8px'>批量导入讲师信息</div><div style='font-size:13px;color:#888;margin-bottom:20px'>支持 Excel 格式（.xlsx / .xls）</div><div style='border:2px dashed var(--border);border-radius:12px;padding:30px;margin-bottom:16px;cursor:pointer' onclick='alert(\'请选择Excel文件\')'><div style='font-size:32px;margin-bottom:8px'></div><div style='color:#888;font-size:13px'>点击选择文件 或 拖拽到此处</div></div><button class='btn btn-primary' style='margin-top:12px' onclick='closeDetailModal();alert(\'讲师数据导入成功\n\n共导入 X 条记录\n新增 Y 条 / 更新 Z 条\')`);
    return;
  }

});
