
// ========== 迭代新增：全局状态 / 工具栏 / 人事模块 / 预警中心 ==========
let currentPageId = 'dashboard';
const state = { asOf: '', historyDates: [], userCenter: '*' };

const PAGE_COLLECTION = {
  'train-talent': 'talentPool', 'train-new': 'newTrain', 'train-knowledge': 'knowledgeBase',
  'train-exam': 'questionBank', 'train-cadre': 'cadreLoss', 'train-est': 'estLibrary',
  'hr-core-kpi': 'headcount', 'hr-establishment': 'establishment', 'hr-labor': 'labor',
  'hr-probation': 'probation', 'hr-contract': 'contracts', 'hr-turnover': 'turnover', 'hr-processes': 'hrProcesses',
  'recruit-funnel': 'recruitFunnel', 'recruit-achievement': 'dashboard', 'recruit-weekly': 'recruitFunnel',
  'recruit-daily': 'recruitFunnel', 'recruit-backoffice': 'recruitBackoffice', 'recruit-rpo': 'recruitRpo',
  'admin-workplace': 'workplace', 'admin-asset': 'assets', 'admin-supplies': 'supplies',
  'admin-gift': 'gift', 'admin-print': 'print', 'admin-regulation': 'regulation',
  'admin-kpi': 'adminKpi', 'admin-tasklist': 'adminTasklist', 'admin-goal': 'adminGoal',
  'pr-opinion': 'publicOpinion', 'pr-crisis': 'crisis'
};

const LOADERS = {
  'dashboard': loadDashboard,
  'recruit-funnel': loadRecruitFunnel,
  'recruit-achievement': loadRecruitAchievement,
  'recruit-weekly': loadRecruitWeekly,
  'recruit-daily': loadRecruitDaily,
  'hr-core-kpi': loadHrCoreKpi,
  'hr-weekly': loadHrWeekly,
  'hr-establishment': loadHrEstablishment,
  'hr-labor': loadHrLabor,
  'hr-probation': loadHrProbation,
  'hr-turnover': loadHrTurnover,
  'hr-contract': loadHrContract,
  'train-talent': loadTrainTalent,
  'train-new': loadTrainNew,
  'train-knowledge': loadTrainKnowledge,
  'train-exam': loadTrainExam,
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
  'alerts': loadAlerts,
  'ai-chat': loadAiChat
};

function updateScopeBadge() {
  const u = getUser();
  const center = u && u.center;
  const span = document.querySelector('.user-info span');
  if (span) span.textContent = (u ? u.name : '系统管理员') + (center && center !== '*' ? ' · ' + center + '中心' : ' · 全部中心');
}

async function loadHistoryDates() {
  const d = await fetchAPI('/api/history/dates');
  if (Array.isArray(d)) state.historyDates = d;
  if (currentPageId) renderToolbar(currentPageId);
}

function renderToolbar(pageId) {
  const tb = document.getElementById('toolbarArea');
  if (!tb) return;
  const col = PAGE_COLLECTION[pageId];
  if (!col) { tb.innerHTML = ''; return; }
  const dates = (state.historyDates || []).map(function(d){ return '<option value="' + d + '" ' + (state.asOf === d ? 'selected' : '') + '>' + d + '</option>'; }).join('');
  tb.innerHTML = ''
    + '<div class="tb-left">'
    + '<span class="tb-label"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-calendar\"></use></svg> 数据日期</span>'
    + '<select id="asOfSelect" onchange="onAsOfChange()" class="tb-select"><option value="">最新</option>' + dates + '</select>'
    + '</div>'
    + '<div class="tb-right">'
    + '<button class="btn btn-outline btn-sm" onclick="doExport(\'' + col + '\')"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-download\"></use></svg> 导出</button>'
    + '<button class="btn btn-primary btn-sm" onclick="doImport(\'' + col + '\')"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-upload\"></use></svg> 导入</button>'
    + '</div>';
}

function onAsOfChange() {
  const sel = document.getElementById('asOfSelect');
  state.asOf = sel ? sel.value : '';
  if (LOADERS[currentPageId]) LOADERS[currentPageId]();
}

async function doExport(collection) {
  const asOf = state.asOf || '';
  try {
    const r = await authFetch('/api/admin/export?collection=' + encodeURIComponent(collection) + '&format=json&asOf=' + encodeURIComponent(asOf));
    if (!r.ok) { alert('导出失败：权限不足或无数据'); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = collection + '.json'; a.click();
    URL.revokeObjectURL(url);
  } catch (e) { alert('导出出错：' + e.message); }
}

function doImport(collection) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,.csv';
  inp.onchange = async function() {
    const f = inp.files[0]; if (!f) return;
    let text; try { text = await f.text(); } catch (e) { alert('读取文件失败'); return; }
    let data; try { data = JSON.parse(text); } catch (e) { alert('仅支持 JSON 格式（需求模板请先转为 JSON）'); return; }
    try {
      const r = await authFetch('/api/admin/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collection: collection, data: data }) });
      const j = await r.json().catch(function(){ return {}; });
      if (j.ok) { alert('导入成功：' + j.count + ' 条，已生成 ' + j.date + ' 快照'); state.asOf = ''; await loadHistoryDates(); if (LOADERS[currentPageId]) LOADERS[currentPageId](); }
      else alert('导入失败：' + (j.error || '未知错误'));
    } catch (e) { alert('导入出错：' + e.message); }
  };
  inp.click();
}

async function loadHrCoreKpi() {
  const data = await fetchAPI(API.coreKpi);
  if (!data) return;
  const g = {}; (data.goals || []).forEach(function(x){ g[x.module] = x; });
  const est = data.establishment || {}; const rec = data.recruit || {}; const loss = data.loss || {}; const adm = data.admin || {};
  const trainRate = (data.train && data.train.newTrain && data.train.newTrain.rate) || 0;
  const admRate = (adm.budget && adm.budget.rate) || 0;
  const kpis = [
    { n: '编制达成率', v: (est.rate || 0) + '%', t: '目标 ' + (g.hr ? g.hr.target : '-') + '%', s: (est.rate || 0) >= (g.hr ? g.hr.target : 0) },
    { n: '招聘完成率', v: (rec.rate || 0) + '%', t: '目标 ' + (g.recruit ? g.recruit.target : '-') + '%', s: (rec.rate || 0) >= (g.recruit ? g.recruit.target : 0) },
    { n: '流失率(年度)', v: (loss.ytdRate || 0) + '%', t: '目标 ≤' + (g.hr ? g.hr.target : '-') + '%', s: true },
    { n: '培训覆盖率', v: trainRate + '%', t: '目标 ' + (g.train ? g.train.target : '-') + '%', s: true },
    { n: '人均效能', v: '—', t: '指标搭建中', s: null },
    { n: '行政费用执行率', v: admRate + '%', t: '目标 ' + (g.admin ? g.admin.target : '-') + '%', s: admRate >= (g.admin ? g.admin.target : 0) }
  ];
  let rows = '';
  kpis.filter(function(k){ return k.s !== null; }).forEach(function(k) {
    rows += '<tr><td>' + k.n + '</td><td>' + k.v + '</td><td>' + k.t.replace('目标 ', '') + '</td><td><span class="tag ' + (k.s ? 'tag-success' : 'tag-danger') + '">' + (k.s ? '达标' : '未达标') + '</span></td></tr>';
  });
  let cards = '';
  kpis.forEach(function(k) {
    const bg = k.s === true ? COLORS.green : k.s === false ? COLORS.red : COLORS.blue;
    const ic = k.s === true ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-circle-green\"></use></svg>' : k.s === false ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-circle-red\"></use></svg>' : '🔵';
    const tr = k.s === true ? 'up' : k.s === false ? 'down' : 'up';
    cards += '<div class="kpi-card"><div class="kpi-accent" style="background:' + bg + '"></div><div class="kpi-icon">' + ic + '</div><div class="kpi-value">' + k.v + '</div><div class="kpi-label">' + k.n + '</div><div class="kpi-trend ' + tr + '">' + k.t + ' ' + (k.s === true ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg>' : k.s === false ? '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-alert-circle\"></use></svg>' : '') + '</div></div>';
  });
  renderPage('<div class="kpi-grid cols-3">' + cards + '</div><div class="chart-card"><div class="chart-title"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-target\"></use></svg> 核心指标红绿灯（目标 vs 实际）</div><table class="data-table"><thead><tr><th>指标</th><th>实际</th><th>目标</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
}

async function loadHrWeekly() {
  const data = await fetchAPI(API.weeklyReport);
  if (!data) return;
  const s = data.summary || {};
  const todo = data.todo || [];
  let byCenter = '';
  (data.byCenter || []).forEach(function(c) {
    const net = (c.entry || 0) - (c.leave || 0);
    byCenter += '<tr><td>' + c.center + '</td><td>' + (c.entry || 0) + '</td><td>' + (c.leave || 0) + '</td><td>' + (net >= 0 ? '+' : '') + net + '</td></tr>';
  });
  let todos = '';
  (todo || []).forEach(function(t) { todos += '<div class="todo-item"><span class="todo-dot"></span>' + (t.text || t) + '</div>'; });
  if (!todos) todos = '<div class="todo-item">暂无待办</div>';
  renderPage(
    '<div class="kpi-grid cols-4">'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.green + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-plus-circle\"></use></svg></div><div class="kpi-value">' + (s.entry || 0) + '</div><div class="kpi-label">本周入职</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.red + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-minus-circle\"></use></svg></div><div class="kpi-value">' + (s.leave || 0) + '</div><div class="kpi-label">本周离职</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.blue + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg></div><div class="kpi-value">' + (s.regular || 0) + '</div><div class="kpi-label">转正</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.orange + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-refresh-cw\"></use></svg></div><div class="kpi-value">' + (s.transfer || 0) + '</div><div class="kpi-label">调岗</div></div>'
    + '</div><div class="row cols-2">'
    + '<div class="chart-card"><div class="chart-title"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-calendar\"></use></svg> 各中心人员变动</div><table class="data-table"><thead><tr><th>中心</th><th>入职</th><th>离职</th><th>净增减</th></tr></thead><tbody>' + byCenter + '</tbody></table></div>'
    + '<div class="chart-card"><div class="chart-title">📌 下周待办事项</div><div class="todo-list">' + todos + '</div></div>'
    + '</div>'
  );
}

async function loadHrLabor() {
  const data = await fetchAPI(API.labor);
  if (!data) return;
  const list = data.list || [];
  let rows = '';
  list.forEach(function(x) {
    const st = x.status === '已结案' ? 'tag-success' : x.status === '处理中' ? 'tag-warning' : 'tag-danger';
    rows += '<tr><td>' + x.id + '</td><td><strong>' + x.name + '</strong></td><td>' + x.center + '</td><td>' + (x.type || '-') + '</td><td><span class="tag ' + st + '">' + x.status + '</span></td><td>' + (x.progress || '-') + '</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert(\'编辑: ' + x.id + '\')">编辑</button></td></tr>';
  });
  renderPage(
    '<div class="kpi-grid cols-3">'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.blue + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-scale\"></use></svg></div><div class="kpi-value">' + list.length + '</div><div class="kpi-label">劳动关系案件</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.orange + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-hourglass\"></use></svg></div><div class="kpi-value">' + list.filter(function(x){ return x.status === '处理中'; }).length + '</div><div class="kpi-label">处理中</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.green + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-check-circle-2\"></use></svg></div><div class="kpi-value">' + list.filter(function(x){ return x.status === '已结案'; }).length + '</div><div class="kpi-label">已结案</div></div>'
    + '</div><div class="filter-bar"><button class="btn btn-primary" onclick="alert(\'新增劳动关系案件\')"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-plus-circle\"></use></svg> 新增案件</button><button class="btn btn-outline" onclick="alert(\'导出案件台账\')"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-download\"></use></svg> 导出</button></div>'
    + '<div class="chart-card"><div class="chart-title"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-scale\"></use></svg> 劳动关系台账（敏感信息已脱敏）</div><table class="data-table"><thead><tr><th>编号</th><th>姓名</th><th>中心</th><th>类型</th><th>状态</th><th>进展</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
  );
}

async function loadHrProbation() {
  const data = await fetchAPI(API.probation);
  if (!data) return;
  const list = (data.list || []).slice().sort(function(a, b){ return (a.daysLeft || 0) - (b.daysLeft || 0); });
  let rows = '';
  list.forEach(function(x) {
    const col = (x.daysLeft || 0) <= 7 ? 'var(--danger)' : (x.daysLeft || 0) <= 15 ? 'var(--warning)' : 'var(--text-light)';
    rows += '<tr><td>' + x.id + '</td><td><strong>' + x.name + '</strong></td><td>' + x.center + '</td><td>' + x.dept + '</td><td>' + x.joinDate + '</td><td>' + x.expireDate + '</td><td><strong style="color:' + col + '">' + x.daysLeft + '天</strong></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert(\'发起转正评估: ' + x.name + '\')">转正评估</button></td></tr>';
  });
  renderPage(
    '<div class="kpi-grid cols-3">'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.red + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-alert-triangle\"></use></svg></div><div class="kpi-value">' + list.filter(function(x){ return (x.daysLeft || 0) <= 7; }).length + '</div><div class="kpi-label">7天内到期</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.orange + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-alert-circle\"></use></svg></div><div class="kpi-value">' + list.filter(function(x){ return (x.daysLeft || 0) <= 15; }).length + '</div><div class="kpi-label">15天内到期</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.blue + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-edit\"></use></svg></div><div class="kpi-value">' + list.length + '</div><div class="kpi-label">试用期总人数</div></div>'
    + '</div><div class="chart-card"><div class="chart-title"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-file-edit\"></use></svg> 试用期到期提醒（提前7/15天推送）</div><table class="data-table"><thead><tr><th>工号</th><th>姓名</th><th>中心</th><th>部门</th><th>入职日</th><th>到期日</th><th>剩余</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
  );
}

async function loadAlerts() {
  const data = await fetchAPI(API.alerts);
  if (!data) return;
  const list = (data || []).slice().sort(function(a, b){ return (a.level === 'high' ? 0 : a.level === 'mid' ? 1 : 2) - (b.level === 'high' ? 0 : b.level === 'mid' ? 1 : 2); });
  const cnt = { high: 0, mid: 0, low: 0 }; list.forEach(function(a){ cnt[a.level] = (cnt[a.level] || 0) + 1; });
  let cards = '';
  list.forEach(function(a) {
    const lv = a.level === 'high' ? '紧急' : a.level === 'mid' ? '中期' : '提示';
    cards += '<div class="alert-card alert-' + a.level + '"><div class="alert-card-head"><span class="alert-badge">' + a.type + '</span><span class="alert-level">' + lv + '</span></div><div class="alert-title">' + a.title + '</div><div class="alert-desc">' + a.desc + '</div><div class="alert-foot"><span>中心：' + (a.center || '全部') + '</span><button class="btn btn-outline btn-sm" onclick="alert(\'处理预警: ' + a.id + '\')">处理</button></div></div>';
  });
  renderPage(
    '<div class="kpi-grid cols-3">'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.red + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-alert-triangle\"></use></svg></div><div class="kpi-value">' + (cnt.high || 0) + '</div><div class="kpi-label">紧急预警</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.orange + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-alert-circle\"></use></svg></div><div class="kpi-value">' + (cnt.mid || 0) + '</div><div class="kpi-label">中期预警</div></div>'
    + '<div class="kpi-card"><div class="kpi-accent" style="background:' + COLORS.blue + '"></div><div class="kpi-icon"><svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><use href=\"#icon-clipboard-list\"></use></svg></div><div class="kpi-value">' + (cnt.low || 0) + '</div><div class="kpi-label">提示</div></div>'
    + '</div><div class="alert-center">' + cards + '</div>'
  );
}
