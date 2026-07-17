// ========== 综管AI线上管理平台 - 主应用 ==========

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
  aiQuery: '/api/ai/query'
};

const NAV_CONFIG = [
  { group: '总览', items: [
    { id: 'dashboard', icon: '📊', name: '综管驾驶舱', title: '综管驾驶舱' }
  ]},
  { group: '人员台账', children: [
    { subgroup: '招聘管理', items: [
      { id: 'recruit-funnel', icon: '🎯', name: '招聘漏斗看板', title: '招聘漏斗数据看板' },
      { id: 'recruit-achievement', icon: '📈', name: '需求达成看板', title: '年度需求入职达成看板' },
      { id: 'recruit-weekly', icon: '📅', name: '周度过程看板', title: '招聘各中心周度过程数据看板' },
      { id: 'recruit-daily', icon: '📆', name: '日报看板', title: '招聘各中心日报看板' }
    ]},
    { subgroup: '人事管理', items: [
      { id: 'hr-establishment', icon: '📐', name: '编制管理', title: '编制管理' },
      { id: 'hr-turnover', icon: '📉', name: '人员流失看板', title: '人员流失看板' },
      { id: 'hr-contract', icon: '📋', name: '合同到期预警', title: '合同到期预警' }
    ]},
    { subgroup: '培训管理', items: [
      { id: 'train-talent', icon: '👥', name: '人才库看板', title: '人才库数据看板' },
      { id: 'train-new', icon: '🎓', name: '新培库看板', title: '新培库数据看板' },
      { id: 'train-knowledge', icon: '📚', name: '培训知识库', title: '培训知识库' },
      { id: 'train-exam', icon: '📝', name: '题库与考试', title: '岗前培训考试题库与在线考试' }
    ]}
  ]},
  { group: '物品台账', items: [
    { id: 'admin-workplace', icon: '🏢', name: '职场管理', title: '职场管理' },
    { id: 'admin-asset', icon: '💻', name: '固定资产管理', title: '固定资产管理' },
    { id: 'admin-supplies', icon: '📦', name: '办公用品管理', title: '办公用品库存与领用管理' },
    { id: 'admin-gift', icon: '🎁', name: '礼品管理', title: '礼品管理' },
    { id: 'admin-print', icon: '🖨️', name: '文印管理', title: '文印管理' }
  ]},
  { group: '事务台账', items: [
    { id: 'admin-regulation', icon: '📑', name: '管理制度', title: '管理制度' },
    { id: 'admin-tasklist', icon: '✅', name: '工作清单', title: '工作清单' },
    { id: 'admin-goal', icon: '🎯', name: '工作目标', title: '工作目标' },
    { id: 'admin-kpi', icon: '📈', name: 'KPI', title: 'KPI考核看板' }
  ]},
  { group: '智能助手', items: [
    { id: 'ai-chat', icon: '🤖', name: '综管智能小助手', title: '综管智能小助手' }
  ]}
];

const charts = {};

function init() {
  renderSidebar();
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
    'ai-chat': loadAiChat
  };
  
  if (loaders[pageId]) loaders[pageId]();
}

async function fetchAPI(url, options) {
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch(e) {
    console.error('API Error:', e);
    return null;
  }
}

function disposeCharts() {
  Object.values(charts).forEach(c => { if (c && c.dispose) c.dispose(); });
  Object.keys(charts).forEach(k => delete charts[k]);
}

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
  
  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">🎯</div><div class="kpi-value">${data.recruit.yearOnboard}/${data.recruit.yearDemand}</div><div class="kpi-label">年度招聘达成</div><div class="kpi-trend up">▲ ${data.recruit.rate}%</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">👥</div><div class="kpi-value">${data.train.talentPool.onDuty}</div><div class="kpi-label">人才库在岗人数</div><div class="kpi-trend up">▲ ${data.train.talentPool.rate}%</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">📊</div><div class="kpi-value">${data.hr.headcount.actual}/${data.hr.headcount.planned}</div><div class="kpi-label">编制使用率</div><div class="kpi-trend up">▲ ${data.hr.headcount.rate}%</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📦</div><div class="kpi-value">${data.admin.supplies.lowStock}</div><div class="kpi-label">办公用品库存预警</div><div class="kpi-trend down">▼ 待处理</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">📢</div><div class="kpi-value">${data.pr.alerts}</div><div class="kpi-label">舆情预警</div><div class="kpi-trend down">▼ 待处理</div></div>
    </div>

    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">🎯 招聘漏斗</div>
        <div class="chart-desc">各环节转化率</div>
        <div id="dashFunnel" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">📈 招聘趋势</div>
        <div class="chart-desc">月度需求与入职对比</div>
        <div id="dashRecruitTrend" style="height:280px"></div>
      </div>
    </div>

    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">👥 人员变动趋势</div>
        <div class="chart-desc">月度入职/离职对比</div>
        <div id="dashHrTrend" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">📢 舆情情感分布</div>
        <div class="chart-desc">近7天舆情情感分析</div>
        <div id="dashPrSentiment" style="height:280px"></div>
      </div>
    </div>

    <div class="row cols-3">
      <div class="chart-card">
        <div class="chart-title">🎓 培训概览</div>
        <div class="stat-inline" style="margin-top:12px">
          <div class="stat-item"><div class="val">${data.train.newTrain.enrolled}</div><div class="lbl">新培参训</div></div>
          <div class="stat-item"><div class="val">${data.train.newTrain.rate}%</div><div class="lbl">转化率</div></div>
          <div class="stat-item"><div class="val">${data.train.knowledge.courses}</div><div class="lbl">课件数</div></div>
        </div>
        <div style="margin-top:16px"><div style="font-size:12px;color:var(--text-light);margin-bottom:6px">学习完成率</div><div class="progress"><div class="progress-bar green" style="width:${data.train.knowledge.avgCompletion}%"></div></div></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">💰 行政费用执行</div>
        <div class="stat-inline" style="margin-top:12px">
          <div class="stat-item"><div class="val">${(data.admin.budget.spent/10000).toFixed(0)}万</div><div class="lbl">已支出</div></div>
          <div class="stat-item"><div class="val">${(data.admin.budget.annual/10000).toFixed(0)}万</div><div class="lbl">年度预算</div></div>
          <div class="stat-item"><div class="val">${data.admin.budget.rate}%</div><div class="lbl">执行率</div></div>
        </div>
        <div style="margin-top:16px"><div style="font-size:12px;color:var(--text-light);margin-bottom:6px">预算执行进度</div><div class="progress"><div class="progress-bar blue" style="width:${data.admin.budget.rate}%"></div></div></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">⚠️ 待办事项</div>
        <div style="margin-top:8px">
          <div class="alert-item alert-warning"><span class="alert-icon">📋</span><div>合同即将到期 <strong>${data.hr.contractExpiring}</strong> 份，请及时处理续签</div></div>
          <div class="alert-item alert-danger"><span class="alert-icon">📦</span><div>办公用品库存预警 <strong>${data.admin.supplies.lowStock}</strong> 项，请及时补充</div></div>
          <div class="alert-item alert-info"><span class="alert-icon">🔄</span><div>入转调离流程 <strong>${data.hr.onboarding + data.hr.transfer + data.hr.resignation}</strong> 个进行中</div></div>
        </div>
      </div>
    </div>
  `);

  setTimeout(() => {
    disposeCharts();
    const f = data.recruit.funnel;
    initChart('dashFunnel', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [{ type: 'funnel', left: '10%', right: '10%', top: 10, bottom: 10, minSize: '20%',
        label: { position: 'inside', fontSize: 12, color: '#fff' },
        data: [
          { value: f.posted, name: '岗位发布', itemStyle: { color: COLORS.blue } },
          { value: f.resume, name: '简历收取', itemStyle: { color: '#60a5fa' } },
          { value: f.screened, name: '筛选通过', itemStyle: { color: COLORS.cyan } },
          { value: f.interview, name: '面试', itemStyle: { color: COLORS.purple } },
          { value: f.offer, name: 'Offer', itemStyle: { color: COLORS.orange } },
          { value: f.onboard, name: '入职', itemStyle: { color: COLORS.green } }
        ]
      }]
    });
    initChart('dashRecruitTrend', {
      tooltip: { trigger: 'axis' }, legend: { data: ['需求', '入职'], bottom: 0 },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.recruit.trend.map(t => t.month) },
      yAxis: { type: 'value' },
      series: [
        { name: '需求', type: 'bar', data: data.recruit.trend.map(t => t.demand), itemStyle: { color: COLORS.blue } },
        { name: '入职', type: 'bar', data: data.recruit.trend.map(t => t.onboard), itemStyle: { color: COLORS.green } }
      ]
    });
    initChart('dashHrTrend', {
      tooltip: { trigger: 'axis' }, legend: { data: ['入职', '离职'], bottom: 0 },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.hr.monthlyChange.map(t => t.month) },
      yAxis: { type: 'value' },
      series: [
        { name: '入职', type: 'line', smooth: true, data: data.hr.monthlyChange.map(t => t.in), itemStyle: { color: COLORS.green }, areaStyle: { opacity: 0.1 } },
        { name: '离职', type: 'line', smooth: true, data: data.hr.monthlyChange.map(t => t.out), itemStyle: { color: COLORS.red }, areaStyle: { opacity: 0.1 } }
      ]
    });
    initChart('dashPrSentiment', {
      tooltip: { trigger: 'item' }, legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 12 },
        data: [
          { value: data.pr.sentiment.positive, name: '正面', itemStyle: { color: COLORS.green } },
          { value: data.pr.sentiment.neutral, name: '中性', itemStyle: { color: COLORS.orange } },
          { value: data.pr.sentiment.negative, name: '负面', itemStyle: { color: COLORS.red } }
        ]
      }]
    });
    const dashData = data;
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
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
      <button class="btn btn-outline">📥 导出</button>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">🎯 招聘漏斗</div>
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
        <div class="chart-title">📊 各中心对比</div>
        <div class="chart-desc">各中心招聘各环节数据</div>
        <div id="centerCompare" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 各中心招聘明细</div>
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📋</div><div class="kpi-value">${r.yearDemand}</div><div class="kpi-label">年度需求数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${r.yearOnboard}</div><div class="kpi-label">年度入职数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📈</div><div class="kpi-value">${r.rate}%</div><div class="kpi-label">年度达成率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">📅</div><div class="kpi-value">${r.monthOnboard}/${r.monthDemand}</div><div class="kpi-label">本月达成</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📈 年度需求入职趋势</div>
      <div class="chart-desc">月度需求与入职对比</div>
      <div id="achievementTrend" style="height:350px"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">🎯 RPO渠道供应商达成</div>
      <div class="chart-desc">按渠道供应商类别展示入职数量</div>
      <div id="rpoChart" style="height:300px"></div>
    </div>
  `);
  const rpoRes = await fetchAPI(API.recruitFunnel);
  const rpoChannels = rpoRes ? rpoRes.rpoChannels || [] : [];
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
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}

// ========== 招聘-周度过程 ==========
async function loadRecruitWeekly() {
  const data = await fetchAPI(API.recruitFunnel);
  if (!data) return;
  const wp = data.weeklyProcess;
  renderPage(`
    <div class="filter-bar"><select><option>全部中心</option><option>太原</option><option>南昌</option></select><select><option>本周</option><option>上周</option></select><button class="btn btn-outline">📥 导出</button></div>
    <div class="chart-card">
      <div class="chart-title">📊 各渠道过程数据</div>
      <div class="chart-desc">自招/校招/渠道 - 到面/参面/通过/报到/签约</div>
      <div id="weeklyProcess" style="height:350px"></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">🎯 经验分类需求达成</div>
        <div class="chart-desc">ABC经验分类需求与达成对比</div>
        <div id="abcChart" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">📋 各渠道明细</div>
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
    <div class="filter-bar"><select><option>全部中心</option><option>太原</option><option>南昌</option></select><span style="font-size:13px;color:var(--text-light)">数据更新时间：2026-07-16 18:00</span><button class="btn btn-outline">📥 导出日报</button></div>
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📋</div><div class="kpi-value">${data.dailyData[data.dailyData.length-1].interview}</div><div class="kpi-label">今日到面</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.dailyData[data.dailyData.length-1].pass}</div><div class="kpi-label">今日通过</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">🎉</div><div class="kpi-value">${data.dailyData[data.dailyData.length-1].onboard}</div><div class="kpi-label">今日入职</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📊</div><div class="kpi-value">${data.dailyData.reduce((s,d)=>s+d.interview,0)}</div><div class="kpi-label">本周累计到面</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📆 每日过程趋势</div>
      <div class="chart-desc">近7天到面/通过/入职数据</div>
      <div id="dailyTrend" style="height:350px"></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 每日明细</div>
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
    <div class="filter-bar"><input type="date" value="2026-01-01"> <span style="color:var(--text-light)">至</span> <input type="date" value="2026-07-16"><button class="btn btn-primary">查询</button><button class="btn btn-outline">📥 导出</button><span style="margin-left:auto;font-size:12px;color:var(--text-light)">数据实时同步 | 各中心可在线编辑</span></div>
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">👥</div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">编制总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.overview.onDuty}</div><div class="kpi-label">在岗总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">🎓</div><div class="kpi-value">${data.overview.trainee}</div><div class="kpi-label">见习总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">📦</div><div class="kpi-value">${data.overview.reserve}</div><div class="kpi-label">后备总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">📈</div><div class="kpi-value">${data.overview.rate}%</div><div class="kpi-label">人员储备率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📊 各模块人才分布</div>
        <div class="chart-desc">编制/在岗/见习/后备 - 树状图</div>
        <div id="talentModule" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🏢 各中心人才分布</div>
        <div class="chart-desc">各中心编制/在岗/见习/后备对比</div>
        <div id="talentCenter" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 人才库详细数据</div>
      <div class="filter-bar"><select><option>全部中心</option><option>太原</option><option>南昌</option></select><select><option>全部模块</option><option>小赢</option><option>字节</option></select><input type="text" placeholder="搜索姓名..."><button class="btn btn-outline">🔍 筛选</button></div>
      <table class="data-table">
        <thead><tr><th>工号</th><th>姓名</th><th>中心</th><th>模块</th><th>层级</th><th>队列</th><th>入职日期</th><th>状态</th></tr></thead>
        <tbody>${data.detail.map(d => `<tr><td>${d.id}</td><td><strong>${d.name}</strong></td><td>${d.center}</td><td>${d.module}</td><td><span class="tag ${d.level==='在岗'?'tag-success':d.level==='见习'?'tag-warning':'tag-info'}">${d.level}</span></td><td>${d.queue}</td><td>${d.joinDate}</td><td><span class="tag tag-success">${d.status}</span></td></tr>`).join('')}</tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('talentModule', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['编制', '在岗', '见习', '后备'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.modules.map(m => m.name), axisLabel: { rotate: 20 } },
      yAxis: { type: 'value' },
      series: [
        { name: '编制', type: 'bar', data: data.modules.map(m => m.total), itemStyle: { color: COLORS.blue } },
        { name: '在岗', type: 'bar', data: data.modules.map(m => m.onDuty), itemStyle: { color: COLORS.green } },
        { name: '见习', type: 'bar', data: data.modules.map(m => m.trainee), itemStyle: { color: COLORS.orange } },
        { name: '后备', type: 'bar', data: data.modules.map(m => m.reserve), itemStyle: { color: COLORS.purple } }
      ]
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
    <div class="filter-bar"><input type="date" value="2026-01-01"> <span style="color:var(--text-light)">至</span> <input type="date" value="2026-07-16"><button class="btn btn-primary">查询</button><button class="btn btn-outline">📥 导出</button><span style="margin-left:auto;font-size:12px;color:var(--text-light)">数据实时同步 | 各中心可在线编辑</span></div>
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">🎓</div><div class="kpi-value">${data.overview.enrolled}</div><div class="kpi-label">参训人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✍️</div><div class="kpi-value">${data.overview.signed}</div><div class="kpi-label">签合同人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">👥</div><div class="kpi-value">${data.overview.grouped}</div><div class="kpi-label">入组人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📈</div><div class="kpi-value">${data.overview.rate}%</div><div class="kpi-label">转化率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.overview.eliminated + data.overview.resigned}</div><div class="kpi-label">淘汰+离职</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">🏢 各中心新培参训情况</div>
        <div id="newTrainCenter" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">📊 各项目新人训概览</div>
        <div id="newTrainProject" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 各中心各项目明细</div>
      <table class="data-table">
        <thead><tr><th>中心</th><th>项目</th><th>参训</th><th>签约</th><th>入组</th><th>转化率</th></tr></thead>
        <tbody>${data.projectDetail.map(p => `<tr><td><strong>${p.center}</strong></td><td>${p.project}</td><td>${p.enrolled}</td><td>${p.signed}</td><td>${p.grouped}</td><td><span class="tag ${p.rate>=80?'tag-success':'tag-warning'}">${p.rate}%</span></td></tr>`).join('')}</tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
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
  const fmtIcon = { 'PPT':'📊','PDF':'📄','视频':'🎬','Word':'📝' };
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
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[0]}"></div><div class="kpi-icon">📚</div><div class="kpi-value">${kbData.overview.totalCourses}</div><div class="kpi-label">课件总数</div></div>
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[1]}"></div><div class="kpi-icon">👁️</div><div class="kpi-value">${kbData.overview.totalViews.toLocaleString()}</div><div class="kpi-label">总浏览量</div></div>
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[2]}"></div><div class="kpi-icon">⬇️</div><div class="kpi-value">${kbData.overview.totalDownloads}</div><div class="kpi-label">总下载量</div></div>
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[3]}"></div><div class="kpi-icon">👥</div><div class="kpi-value">${kbData.overview.activeLearners}</div><div class="kpi-label">活跃学员</div></div>
        <div class="kpi-card"><div class="kpi-accent" style="background:${PALETTE_KB[4]}"></div><div class="kpi-icon">⭐</div><div class="kpi-value">${kbData.overview.avgRating}</div><div class="kpi-label">平均评分</div></div>
      </div>

      <!-- Tab导航 -->
      <div class="sub-tabs" id="kbTabs">
        <button class="sub-tab ${kbCurrentTab==='catalog'?'active':''}" onclick="switchKbTab('catalog')">📖 课程目录</button>
        <button class="sub-tab ${kbCurrentTab==='paths'?'active':''}" onclick="switchKbTab('paths')">🛤️ 学习路径</button>
        <button class="sub-tab ${kbCurrentTab==='stats'?'active':''}" onclick="switchKbTab('stats')">📊 学习统计</button>
        <button class="sub-tab ${kbCurrentTab==='tags'?'active':''}" onclick="switchKbTab('tags')">🏷️ 知识标签</button>
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
          <div class="kb-cat-item ${!kbCurrentCategory?'active':''}" onclick="filterByCategory('')">📋 全部课程 (${kbData.courses.length})</div>
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
            <button class="btn btn-primary" onclick="onKbSearch(document.getElementById('kbSearchInput').value)">🔍 搜索</button>
            <select id="kbFmtFilter" onchange="onKbFilter()"><option value="">全部格式</option><option>PPT</option><option>PDF</option><option>视频</option></select>
            <select id="kbDiffFilter" onchange="onKbFilter()"><option value="">全部难度</option><option>初级</option><option>中级</option><option>高级</option></select>
            <select id="kbLvlFilter" onchange="onKbFilter()"><option value="">全部层级</option><option>制度</option><option>SOP</option><option>案例</option></select>
            <div style="margin-left:auto;display:flex;gap:4px">
              <button class="btn ${kbViewMode==='card'?'btn-primary':'btn-outline'}" style="padding:6px 12px" onclick="setKbView('card')">▦ 卡片</button>
              <button class="btn ${kbViewMode==='table'?'btn-primary':'btn-outline'}" style="padding:6px 12px" onclick="setKbView('table')">☰ 列表</button>
            </div>
            <button class="btn btn-outline" onclick="alert('打开课件上传窗口，支持PPT/PDF/视频/Word格式，单次最大500MB')">📤 上传课件</button>
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
    if (list.length === 0) return '<div class="kb-empty">🔍 未找到匹配的课程，请调整筛选条件</div>';
    if (kbViewMode === 'card') {
      return `<div class="kb-course-grid">${list.map((k,i) => `
        <div class="kb-course-card" onclick="openCourseDetail('${k.id}')">
          <div class="kb-card-top" style="background:linear-gradient(135deg,${PALETTE_KB[i%8]}22,${PALETTE_KB[i%8]}08)">
            <span class="kb-card-fmt">${fmtIcon[k.format]||'📄'} ${k.format}</span>
            <span class="tag ${diffColor[k.difficulty]||'tag-gray'}" style="font-size:10px">${k.difficulty}</span>
          </div>
          <div class="kb-card-body">
            <div class="kb-card-title">${k.title}</div>
            <div class="kb-card-desc">${k.description}</div>
            <div class="kb-card-tags">${(k.tags||[]).slice(0,3).map(t=>`<span class="kb-tag">${t}</span>`).join('')}</div>
            <div class="kb-card-meta">
              <span>⏱️ ${k.duration}</span>
              <span>👁️ ${k.views}</span>
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
                <td>${fmtIcon[k.format]||'📄'} ${k.format}</td>
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
                  <button class="btn btn-outline" style="padding:3px 10px;font-size:12px" onclick="alert('开始下载：${k.title}（${k.size}）')">下载</button>
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
              <div class="kb-path-target">🎯 ${p.target}</div>
              <div class="kb-path-meta">
                <span>📚 ${p.courses}门课</span>
                <span>⏱️ ${p.duration}</span>
                <span>👥 ${p.enrolled}人</span>
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
              <button class="btn btn-primary kb-path-btn" onclick="alert('开始学习路径：${p.name}\\n共${p.courses}门课程，预计${p.duration}')">开始学习 →</button>
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
          <div class="chart-title">📈 月度浏览与下载趋势</div>
          <div id="kbChartTrend" style="height:280px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">📊 课程分类分布</div>
          <div id="kbChartCategory" style="height:280px"></div>
        </div>
      </div>
      <div class="row cols-2">
        <div class="chart-card">
          <div class="chart-title">🏆 热门课程 TOP5</div>
          <div id="kbChartTopCourses" style="height:280px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">👤 学习达人榜</div>
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
        <div class="chart-title">🏷️ 知识标签云</div>
        <div class="kb-tag-cloud">
          ${kbData.tagCloud.map(t => `
            <span class="kb-tag-cloud-item" style="font-size:${12+Math.round((t.count/maxCount)*16)}px;color:${t.color};border-color:${t.color}33;background:${t.color}11" onclick="searchByTag('${t.tag}')">
              ${t.tag} <span style="font-size:11px;opacity:0.7">(${t.count})</span>
            </span>
          `).join('')}
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">📋 标签关联课程</div>
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
                <div class="kb-recent-title">${fmtIcon[k.format]||'📄'} ${k.title}</div>
                <div class="kb-recent-meta">
                  <span class="tag tag-info" style="font-size:10px">${k.categoryName}</span>
                  <span style="margin-left:8px">${k.author}</span>
                  <span style="margin-left:8px">📅 ${k.uploadDate}</span>
                  <span style="margin-left:8px">👁️ ${k.views}</span>
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
      <div class="kb-modal-title">${fmtIcon[k.format]||'📄'} ${k.title}</div>
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
        <div class="kb-detail-subtitle">📖 课程章节</div>
        <div class="kb-chapter-list">
          ${k.chapters.map((ch,idx) => `
            <div class="kb-chapter-item">
              <div class="kb-chapter-num">${idx+1}</div>
              <div class="kb-chapter-name">${ch}</div>
              <div class="kb-chapter-status">✅ 可学习</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="kb-detail-section">
        <div class="kb-detail-subtitle">📊 学习数据</div>
        <div class="kb-detail-stats">
          <div class="kb-stat-box"><div class="kb-stat-val">${k.views}</div><div class="kb-stat-lbl">浏览量</div></div>
          <div class="kb-stat-box"><div class="kb-stat-val">${k.downloads}</div><div class="kb-stat-lbl">下载量</div></div>
          <div class="kb-stat-box"><div class="kb-stat-val">${k.completeRate}%</div><div class="kb-stat-lbl">完成率</div></div>
          <div class="kb-stat-box"><div class="kb-stat-val">⭐${k.rating}</div><div class="kb-stat-lbl">评分</div></div>
        </div>
      </div>
      <div class="kb-detail-actions">
        <button class="btn btn-primary" onclick="alert('开始在线学习：${k.title}\\n首章：${k.chapters[0]}')">▶️ 开始学习</button>
        <button class="btn btn-outline" onclick="alert('开始下载：${k.title}（${k.size}）')">⬇️ 下载课件</button>
        <button class="btn btn-outline" onclick="alert('已收藏：${k.title}')">⭐ 收藏</button>
        <button class="btn btn-outline" onclick="alert('分享链接已复制')">🔗 分享</button>
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
  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📝</div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">题目总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">🔘</div><div class="kpi-value">${data.overview.single}</div><div class="kpi-label">单选题</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">☑️</div><div class="kpi-value">${data.overview.multi}</div><div class="kpi-label">多选题</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.overview.judge}</div><div class="kpi-label">判断题</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">✍️</div><div class="kpi-value">${data.overview.essay}</div><div class="kpi-label">简答题</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📊 考试列表</div>
      <table class="data-table">
        <thead><tr><th>考试编号</th><th>考试名称</th><th>应考</th><th>已交</th><th>平均分</th><th>通过率</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.exams.map(e => `<tr><td>${e.id}</td><td><strong>${e.name}</strong></td><td>${e.candidates}</td><td>${e.submitted}</td><td>${e.avgScore}</td><td><span class="tag ${e.passRate>=90?'tag-success':'tag-warning'}">${e.passRate}%</span></td><td><span class="tag ${e.status==='进行中'?'tag-info':'tag-gray'}">${e.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看考试: ${e.name}')">查看</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 题库预览</div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>类型</th><th>题目</th><th>选项</th><th>答案</th><th>难度</th></tr></thead>
        <tbody>
          ${data.questions.map(q => `<tr><td>${q.id}</td><td><span class="tag ${typeColors[q.type]||'tag-gray'}">${q.type}</span></td><td style="max-width:300px">${q.question}</td><td style="font-size:12px;color:var(--text-light)">${q.options.length ? q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('<br>') : '—'}</td><td><strong>${q.answer}</strong></td><td><span class="tag ${q.difficulty==='简单'?'tag-success':q.difficulty==='中等'?'tag-warning':'tag-danger'}">${q.difficulty}</span></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 人事-编制看板 ==========
async function loadHrHeadcount() {
  const data = await fetchAPI(API.headcount);
  if (!data) return;
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📋</div><div class="kpi-value">${data.overview.planned}</div><div class="kpi-label">编制总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.overview.actual}</div><div class="kpi-label">在岗人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.overview.vacant}</div><div class="kpi-label">空缺人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">📈</div><div class="kpi-value">${data.overview.rate}%</div><div class="kpi-label">编制使用率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📊 各部门编制使用</div>
        <div id="deptHeadcount" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🏢 各中心编制使用率</div>
        <div id="centerHeadcount" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 编制明细</div>
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
  renderPage(`
    <div class="filter-bar"><select><option>全部类型</option><option>入职</option><option>转正</option><option>调岗</option><option>离职</option></select><select><option>全部状态</option><option>审批中</option><option>已通过</option><option>已驳回</option></select><button class="btn btn-primary">➕ 发起流程</button></div>
    <div class="chart-card">
      <div class="chart-title">🔄 入转调离流程列表</div>
      <table class="data-table">
        <thead><tr><th>流程编号</th><th>类型</th><th>申请人</th><th>部门/调转</th><th>中心</th><th>申请日期</th><th>当前节点</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(p => `<tr><td>${p.id}</td><td><span class="tag ${typeMap[p.type]}">${p.type}</span></td><td><strong>${p.applicant}</strong></td><td>${p.department || p.from + ' → ' + p.to}</td><td>${p.center}</td><td>${p.date}</td><td>${p.currentStep}</td><td><span class="tag ${statusMap[p.status]}">${p.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看流程: ${p.id}')">详情</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 人事-合同到期 ==========
async function loadHrContract() {
  const data = await fetchAPI(API.contracts);
  if (!data) return;
  const statusMap = { '紧急': 'tag-danger', '即将到期': 'tag-warning', '正常': 'tag-success' };
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">🚨</div><div class="kpi-value">${data.filter(c=>c.status==='紧急').length}</div><div class="kpi-label">30天内到期</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.filter(c=>c.status==='即将到期').length}</div><div class="kpi-label">60天内到期</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.filter(c=>c.status==='正常').length}</div><div class="kpi-label">正常</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📋</div><div class="kpi-value">${data.length}</div><div class="kpi-label">合同总数</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 合同到期预警列表</div>
      <table class="data-table">
        <thead><tr><th>合同编号</th><th>姓名</th><th>部门</th><th>中心</th><th>合同类型</th><th>开始日期</th><th>到期日期</th><th>剩余天数</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.sort((a,b)=>a.daysLeft-b.daysLeft).map(c => `<tr><td>${c.id}</td><td><strong>${c.name}</strong></td><td>${c.department}</td><td>${c.center}</td><td>${c.type}</td><td>${c.startDate}</td><td>${c.endDate}</td><td><strong style="color:${c.daysLeft<=30?'var(--danger)':c.daysLeft<=60?'var(--warning)':'var(--text-light)'}">${c.daysLeft}天</strong></td><td><span class="tag ${statusMap[c.status]}">${c.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('发起续签: ${c.name}')">续签</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 行政-办公用品 ==========
async function loadAdminSupplies() {
  const data = await fetchAPI(API.supplies);
  if (!data) return;
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📦</div><div class="kpi-value">${data.items.length}</div><div class="kpi-label">物品种类</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">📊</div><div class="kpi-value">${data.items.reduce((s,i)=>s+i.stock,0)}</div><div class="kpi-label">库存总量</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.items.filter(i=>i.status==='预警').length}</div><div class="kpi-label">库存预警</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📤</div><div class="kpi-value">${data.usage[data.usage.length-1].count}</div><div class="kpi-label">本月领用</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📊 月度领用趋势</div>
        <div id="suppliesTrend" style="height:280px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">⚠️ 库存预警</div>
        <div style="margin-top:8px">
          ${data.items.filter(i=>i.status==='预警').map(i => `<div class="alert-item alert-danger"><span class="alert-icon">📦</span><div><strong>${i.name}</strong> - 当前库存: ${i.stock}${i.unit}，低于安全库存 ${i.safetyStock}${i.unit}</div></div>`).join('') || '<div class="alert-item alert-success"><span class="alert-icon">✅</span><div>暂无库存预警</div></div>'}
        </div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 库存明细</div>
      <div class="filter-bar">
        <button class="btn btn-primary" onclick="alert('打开入库登记窗口')">➕ 入库</button>
        <button class="btn btn-outline" onclick="alert('打开领用申请窗口')">📤 领用</button>
        <button class="btn btn-outline" onclick="alert('打开出库登记窗口')">📦 出库</button>
        <button class="btn btn-outline" onclick="alert('导出库存明细Excel')">📥 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>物品名称</th><th>分类</th><th>库存</th><th>安全库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.items.map(i => `<tr><td>${i.id}</td><td><strong>${i.name}</strong></td><td>${i.category}</td><td>${i.stock} ${i.unit}</td><td>${i.safetyStock} ${i.unit}</td><td><span class="tag ${i.status==='预警'?'tag-danger':'tag-success'}">${i.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('领用: ${i.name}')">领用</button> <button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('出库: ${i.name}')">出库</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('suppliesTrend', {
      tooltip: { trigger: 'axis' }, grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: data.usage.map(u => u.month) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.usage.map(u => u.count), itemStyle: { color: COLORS.blue }, label: { show: true, position: 'top' } }]
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">💻</div><div class="kpi-value">${data.length}</div><div class="kpi-label">资产总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.filter(a=>a.status==='在用').length}</div><div class="kpi-label">在用</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📦</div><div class="kpi-value">${data.filter(a=>a.status==='闲置').length}</div><div class="kpi-label">闲置</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">🗑️</div><div class="kpi-value">${data.filter(a=>a.status==='报废').length}</div><div class="kpi-label">报废</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 固定资产明细</div>
      <div class="filter-bar"><input type="text" placeholder="搜索资产..." id="assetSearch"><button class="btn btn-primary" onclick="alert('打开扫码盘点界面，请对准资产二维码')">📱 扫码盘点</button><button class="btn btn-outline" onclick="alert('打开新增资产登记窗口')">➕ 新增资产</button></div>
      <table class="data-table">
        <thead><tr><th>资产编号</th><th>资产名称</th><th>使用人</th><th>部门</th><th>中心</th><th>采购日期</th><th>价值</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(a => `<tr><td>${a.id}</td><td><strong>${a.name}</strong></td><td>${a.user}</td><td>${a.department}</td><td>${a.center}</td><td>${a.purchaseDate}</td><td>¥${a.value.toLocaleString()}</td><td><span class="tag ${statusMap[a.status]}">${a.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看资产: ${a.id}')">详情</button></td></tr>`).join('')}
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">💰</div><div class="kpi-value">${(data.annual/10000).toFixed(0)}万</div><div class="kpi-label">年度预算</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">💸</div><div class="kpi-value">${(data.spent/10000).toFixed(0)}万</div><div class="kpi-label">实际支出</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">📊</div><div class="kpi-value">${data.rate}%</div><div class="kpi-label">执行率</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">📈</div><div class="kpi-value">${((data.annual-data.spent)/10000).toFixed(0)}万</div><div class="kpi-label">剩余预算</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📊 各类别预算执行</div>
        <div id="budgetCategory" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">📈 月度费用趋势</div>
        <div id="budgetTrend" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 各类别明细</div>
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
      items.map((it, i) => '<tr><td>' + (i+1) + '</td><td><strong>' + it.title + '</strong></td><td>' + it.author + '</td><td>' + it.time + '</td><td>' + (it.reads || it.views || it.reads) + '</td><td>' + (it.likes || it.comments || it.answers || it.likes) + '</td><td><span class="tag ' + (it.sentiment==='正面'?'tag-success':it.sentiment==='负面'?'tag-danger':'tag-warning') + '">' + it.sentiment + '</span></td><td><button class="btn btn-outline" style="padding:2px 10px;font-size:11px" onclick="alert(\'查看' + name + '原文\\n' + it.title + '\\n作者：' + it.author + '\')">查看</button></td></tr>').join('') +
      '</tbody></table>';
  }

  renderPage(`
    <div class="kpi-grid cols-5">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📊</div><div class="kpi-value">${data.overview.total}</div><div class="kpi-label">舆情总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">😊</div><div class="kpi-value">${data.overview.positive}%</div><div class="kpi-label">正面</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">😐</div><div class="kpi-value">${data.overview.neutral}%</div><div class="kpi-label">中性</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">😞</div><div class="kpi-value">${data.overview.negative}%</div><div class="kpi-label">负面</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">🚨</div><div class="kpi-value">${data.overview.alerts}</div><div class="kpi-label">预警待处理</div></div>
    </div>
    ${data.alerts.length > 0 ? `<div class="chart-card"><div class="chart-title">🚨 负面舆情预警</div>${data.alerts.map(a => `<div class="alert-item alert-${a.level==='高'?'danger':'warning'}"><span class="alert-icon">${a.level==='高'?'🚨':'⚠️'}</span><div><strong>[${a.level}]</strong> ${a.time} · ${a.source} — ${a.content}<br><span style="font-size:12px;color:var(--text-light)">状态: ${a.status} ${a.handler?'· 处理人: '+a.handler:''}</span> <button class="btn btn-outline" style="padding:2px 10px;font-size:11px;margin-left:8px" onclick="alert('处理预警: ${a.id}\\n\\n处理流程：\\n1. 核实舆情真实性\\n2. 评估影响范围\\n3. 制定回应策略\\n4. 提交公关部审核\\n5. 发布官方声明')">处理</button></div></div>`).join('')}</div>` : ''}
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📈 舆情情感趋势</div>
        <div class="chart-desc">近7天全平台情感分布</div>
        <div id="opinionTrend" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🔥 热门话题 TOP5</div>
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
          {key:'wechat', name:'微信公众号', icon:'💬', color:'#07C160', ...data.platforms.wechat},
          {key:'weibo', name:'微博', icon:'📢', color:'#E6162D', ...data.platforms.weibo},
          {key:'douyin', name:'抖音', icon:'🎵', color:'#000000', ...data.platforms.douyin},
          {key:'xiaohongshu', name:'小红书', icon:'📕', color:'#FF2442', ...data.platforms.xiaohongshu},
          {key:'zhihu', name:'知乎', icon:'❓', color:'#0084FF', ...data.platforms.zhihu},
          {key:'maimai', name:'脉脉', icon:'💼', color:'#0066FF', ...data.platforms.maimai}
        ].map(p => `
          <div class="platform-card" style="background:var(--card);border-radius:8px;border:1px solid var(--border);padding:12px;transition:all .2s;cursor:pointer;position:relative;overflow:hidden" onmouseover="this.style.boxShadow='var(--shadow)'" onmouseout="this.style.boxShadow='none'" onclick="switchPrTab('${p.key}')">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font-size:20px;width:28px;text-align:center">${p.icon}</span>
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
                <span>😊 ${p.positive}%</span>
                <span>😐 ${p.neutral}%</span>
                <span>😞 ${p.negative}%</span>
              </div>
            </div>
            <div style="font-size:11px;color:var(--text-light);background:var(--bg);border-radius:4px;padding:6px 8px;display:flex;gap:6px;align-items:flex-start">
              <span style="font-size:10px;color:${p.color};font-weight:700;flex-shrink:0">🔥最新</span>
              <span style="overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3">${p.latest}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text-light);display:flex;gap:24px;flex-wrap:wrap">
        <span>📊 全平台舆情总数：<strong style="color:var(--primary)">${Object.values(data.platforms).reduce((a,b)=>a+(typeof b==='object'&&b.total?b.total:0),0)}</strong> 条</span>
        <span>😊 正面占比：<strong style="color:var(--success)">${data.overview.positive}%</strong></span>
        <span>😞 负面占比：<strong style="color:var(--danger)">${data.overview.negative}%</strong></span>
        <span>🚨 预警待处理：<strong style="color:var(--danger)">${data.overview.alerts}</strong> 条</span>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">🎵 抖音专项舆情监控</div>
      <div class="chart-desc">实时监控中 · 品牌视频${dd.brandVideos||156}条 · 总互动${dd.totalViews||'2.3万'} · 风险等级：低风险</div>
      <div style="margin-top:16px">
        <table class="data-table">
          <thead><tr><th style="width:40px">#</th><th>视频标题</th><th>作者</th><th>发布时间</th><th>播放量</th><th>点赞</th><th>评论</th><th>情感</th><th>操作</th></tr></thead>
          <tbody>
            ${(dd.topVideos||[]).map((v,i) => `<tr><td>${i+1}</td><td><strong>${v.title}</strong></td><td>${v.author}</td><td>${v.time}</td><td>${v.views}</td><td>${v.likes}</td><td>${v.comments}</td><td><span class="tag ${v.sentiment==='正面'?'tag-success':v.sentiment==='负面'?'tag-danger':'tag-warning'}">${v.sentiment}</span></td><td><button class="btn btn-outline" style="padding:2px 10px;font-size:11px" onclick="alert('跳转至抖音查看原视频\\n${v.title}\\n作者：${v.author}')">查看</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 0;font-size:12px;color:var(--text-light);display:flex;gap:24px">
        <span>📹 品牌相关视频：<strong>${dd.brandVideos||156}</strong> 条</span>
        <span>💬 评论提及：<strong>${dd.commentMentions||68}</strong> 条（负面 <strong style="color:var(--danger)">${dd.negativeComments||3}</strong> 条）</span>
        <span>🔥 热门话题：<strong>${dd.hotTopics||12}</strong> 个（曝光 <strong>${dd.topicExposure||'580万'}</strong>）</span>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📕 小红书专项舆情监控</div>
      <div class="chart-desc">实时监控中 · 品牌笔记${xhd.brandNotes||89}篇 · 总收藏${xhd.totalCollects||'1.2万'} · 风险等级：低风险</div>
      <div style="margin-top:16px">
        <table class="data-table">
          <thead><tr><th style="width:40px">#</th><th>笔记标题</th><th>作者</th><th>发布时间</th><th>浏览量</th><th>点赞</th><th>评论</th><th>情感</th><th>操作</th></tr></thead>
          <tbody>
            ${(xhd.topNotes||[]).map((n,i) => `<tr><td>${i+1}</td><td><strong>${n.title}</strong></td><td>${n.author}</td><td>${n.time}</td><td>${n.views}</td><td>${n.likes}</td><td>${n.comments}</td><td><span class="tag ${n.sentiment==='正面'?'tag-success':n.sentiment==='负面'?'tag-danger':'tag-warning'}">${n.sentiment}</span></td><td><button class="btn btn-outline" style="padding:2px 10px;font-size:11px" onclick="alert('跳转至小红书查看原笔记\\n${n.title}\\n作者：${n.author}')">查看</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 0;font-size:12px;color:var(--text-light);display:flex;gap:24px">
        <span>📝 品牌相关笔记：<strong>${xhd.brandNotes||89}</strong> 篇</span>
        <span>💬 评论提及：<strong>${xhd.commentMentions||52}</strong> 条（负面 <strong style="color:var(--danger)">${xhd.negativeComments||2}</strong> 条）</span>
        <span>🔖 话题标签：<strong>${xhd.topicTags||8}</strong> 个（浏览 <strong>${xhd.topicViews||'320万'}</strong>）</span>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 全平台舆情内容明细</div>
      <div class="filter-bar">
        <button class="btn btn-primary" onclick="switchPrTab('wechat')">💬 微信公众号</button>
        <button class="btn btn-outline" onclick="switchPrTab('weibo')">📢 微博</button>
        <button class="btn btn-outline" onclick="switchPrTab('douyin')">🎵 抖音</button>
        <button class="btn btn-outline" onclick="switchPrTab('xiaohongshu')">📕 小红书</button>
        <button class="btn btn-outline" onclick="switchPrTab('zhihu')">❓ 知乎</button>
        <button class="btn btn-outline" onclick="switchPrTab('maimai')">💼 脉脉</button>
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
          <div style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px">🤖 综管智能小助手</div>
          <div style="font-size:12px;opacity:0.7;margin-top:4px">覆盖招聘·培训·人事·行政·公关五大模块 | 智能问答 · 制度查询 · 流程指引</div>
        </div>
        <div class="chat-messages" id="chatMessages">
          <div class="chat-msg bot">
            <div class="chat-avatar">🤖</div>
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
  
  messages.innerHTML += `<div class="chat-msg bot" id="typingMsg"><div class="chat-avatar">🤖</div><div class="chat-bubble"><div class="loading" style="padding:0"><div class="spinner" style="width:20px;height:20px"></div></div></div></div>`;
  messages.scrollTop = messages.scrollHeight;
  
  const res = await fetch(API.aiQuery, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  const data = await res.json();
  
  document.getElementById('typingMsg').remove();
  const confidenceTag = data.confidence > 0 ? `<div style="margin-top:8px;font-size:11px;color:var(--text-light)">匹配置信度: ${data.confidence}% · 来源: ${data.source}</div>` : `<div style="margin-top:8px;font-size:11px;color:var(--warning)">⚠️ 未匹配到知识库内容，已转人工处理</div>`;
  messages.innerHTML += `<div class="chat-msg bot"><div class="chat-avatar">🤖</div><div class="chat-bubble">${data.answer}${confidenceTag}</div></div>`;
  messages.scrollTop = messages.scrollHeight;
}

// ========== 启动 ==========
document.addEventListener('DOMContentLoaded', init);

// ========== 人员流失看板（iframe嵌入完整独立看板） ==========
async function loadHrTurnover() {
  renderPage(`
    <div style="position:relative;margin:-24px;border-radius:0;overflow:hidden">
      <iframe id="turnoverFrame"
        src="turnover-dashboard.html?v=6"
        style="width:100%;height:calc(100vh - 56px);min-height:700px;border:0;display:block"
        allowfullscreen
        onload="this.style.opacity=1"
      ></iframe>
    </div>
  `);
}

// ========== 新增模块：编制管理 ==========
async function loadHrEstablishment() {
  const data = await fetchAPI('/api/hr/establishment');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📐</div><div class="kpi-value">${data.overview.totalEstablishment}</div><div class="kpi-label">编制总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.overview.filled}</div><div class="kpi-label">已入编</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.overview.vacant}</div><div class="kpi-label">空缺编制</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">📈</div><div class="kpi-value">${data.overview.utilizationRate}%</div><div class="kpi-label">编制使用率</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📊 各中心编制分布</div>
        <div id="estCenterChart" style="height:320px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🏢 各项目编制对比</div>
        <div id="estProjectChart" style="height:320px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 编制明细</div>
      <div class="filter-bar">
        <select><option>全部中心</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
        <select><option>全部项目</option><option>小赢</option><option>字节</option><option>邮储</option><option>交行</option><option>广汽</option></select>
        <button class="btn btn-primary" onclick="alert('打开新增编制申请窗口')">➕ 新增编制</button>
        <button class="btn btn-outline" onclick="alert('导出编制明细Excel')">📥 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编制编号</th><th>中心</th><th>项目</th><th>岗位</th><th>编制数</th><th>在岗数</th><th>空缺</th><th>使用率</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.details.map(d => {
            const rate = ((d.filled/d.establishment)*100).toFixed(1);
            const status = rate >= 95 ? ['tag-success','满编'] : rate >= 80 ? ['tag-warning','缺口'] : ['tag-danger','严重缺'];
            return `<tr><td>${d.id}</td><td><strong>${d.center}</strong></td><td>${d.project}</td><td>${d.position}</td><td>${d.establishment}</td><td>${d.filled}</td><td>${d.establishment-d.filled}</td><td>${rate}%</td><td><span class="tag ${status[0]}">${status[1]}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看编制: ${d.id}')">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('estCenterChart', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['编制', '在岗', '空缺'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.centerSummary.map(c => c.center) },
      yAxis: { type: 'value' },
      series: [
        { name: '编制', type: 'bar', data: data.centerSummary.map(c => c.establishment), itemStyle: { color: COLORS.blue } },
        { name: '在岗', type: 'bar', data: data.centerSummary.map(c => c.filled), itemStyle: { color: COLORS.green } },
        { name: '空缺', type: 'bar', data: data.centerSummary.map(c => c.vacant), itemStyle: { color: COLORS.red } }
      ]
    });
    initChart('estProjectChart', {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['编制', '在岗'] },
      grid: { left: 50, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.projectSummary.map(p => p.project), axisLabel: { rotate: 20 } },
      yAxis: { type: 'value' },
      series: [
        { name: '编制', type: 'bar', data: data.projectSummary.map(p => p.establishment), itemStyle: { color: COLORS.blue } },
        { name: '在岗', type: 'bar', data: data.projectSummary.map(p => p.filled), itemStyle: { color: COLORS.green } }
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">🏢</div><div class="kpi-value">${data.overview.totalWorkplaces}</div><div class="kpi-label">职场总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">📏</div><div class="kpi-value">${data.overview.totalArea}㎡</div><div class="kpi-label">总面积</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">💰</div><div class="kpi-value">${data.overview.monthlyRent}万</div><div class="kpi-label">月租金</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.purple}"></div><div class="kpi-icon">👥</div><div class="kpi-value">${data.overview.totalSeats}</div><div class="kpi-label">工位总数</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📊 各职场工位使用率</div>
        <div id="wpUsageChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">💰 各职场租金对比</div>
        <div id="wpRentChart" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 职场明细</div>
      <div class="filter-bar">
        <select><option>全部城市</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
        <button class="btn btn-primary" onclick="alert('打开新增职场窗口')">➕ 新增职场</button>
        <button class="btn btn-outline" onclick="alert('导出职场明细')">📥 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>职场编号</th><th>城市</th><th>地址</th><th>面积(㎡)</th><th>工位数</th><th>使用数</th><th>使用率</th><th>月租金(万)</th><th>租期至</th><th>操作</th></tr></thead>
        <tbody>
          ${data.details.map(d => {
            const rate = ((d.usedSeats/d.totalSeats)*100).toFixed(1);
            return `<tr><td>${d.id}</td><td><strong>${d.city}</strong></td><td>${d.address}</td><td>${d.area}</td><td>${d.totalSeats}</td><td>${d.usedSeats}</td><td>${rate}%</td><td>${d.monthlyRent}</td><td>${d.leaseEnd}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看职场: ${d.id}')">详情</button></td></tr>`;
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">🎁</div><div class="kpi-value">${data.items.length}</div><div class="kpi-label">礼品种类</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">📊</div><div class="kpi-value">${data.items.reduce((s,i)=>s+i.stock,0)}</div><div class="kpi-label">库存总量</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.items.filter(i=>i.stock<i.safetyStock).length}</div><div class="kpi-label">库存预警</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📤</div><div class="kpi-value">${data.overview.monthlyOutbound||0}</div><div class="kpi-label">本月领用</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 礼品库存明细</div>
      <div class="filter-bar">
        <button class="btn btn-primary" onclick="alert('打开入库登记窗口')">➕ 入库</button>
        <button class="btn btn-outline" onclick="alert('打开领用申请窗口')">📤 领用</button>
        <button class="btn btn-outline" onclick="alert('导出礼品明细')">📥 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>礼品名称</th><th>分类</th><th>单价</th><th>库存</th><th>安全库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.items.map(i => {
            const isLow = i.stock < i.safetyStock;
            return `<tr><td>${i.id}</td><td><strong>${i.name}</strong></td><td>${i.category}</td><td>¥${i.unitPrice}</td><td>${i.stock}</td><td>${i.safetyStock}</td><td><span class="tag ${isLow?'tag-danger':'tag-success'}">${isLow?'预警':'正常'}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('领用: ${i.name}')">领用</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 最近领用记录</div>
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.overview.normalDevices}</div><div class="kpi-label">正常运行</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📄</div><div class="kpi-value">${data.overview.monthlyPages}</div><div class="kpi-label">本月打印页数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.overview.faultDevices}</div><div class="kpi-label">故障设备</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📈 月度打印趋势</div>
        <div id="printTrendChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">📊 各中心打印量</div>
        <div id="printCenterChart" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 设备明细</div>
      <table class="data-table">
        <thead><tr><th>设备编号</th><th>设备名称</th><th>中心</th><th>类型</th><th>本月页数</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.devices.map(d => `<tr><td>${d.id}</td><td><strong>${d.name}</strong></td><td>${d.center}</td><td>${d.type}</td><td>${d.monthlyPages}</td><td><span class="tag ${d.status==='正常'?'tag-success':'tag-danger'}">${d.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看设备: ${d.id}')">详情</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 最近文印申请</div>
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📑</div><div class="kpi-value">${data.length}</div><div class="kpi-label">制度总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.filter(d=>d.status==='现行').length}</div><div class="kpi-label">现行有效</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">🔄</div><div class="kpi-value">${data.filter(d=>d.status==='修订中').length}</div><div class="kpi-label">修订中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.filter(d=>d.status==='已废止').length}</div><div class="kpi-label">已废止</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 管理制度清单</div>
      <div class="filter-bar">
        <select><option>全部分类</option><option>人事制度</option><option>行政制度</option><option>财务制度</option><option>安全制度</option></select>
        <select><option>全部状态</option><option>现行</option><option>修订中</option><option>已废止</option></select>
        <input type="text" placeholder="搜索制度名称...">
        <button class="btn btn-primary" onclick="alert('打开新增制度窗口')">➕ 新增制度</button>
        <button class="btn btn-outline" onclick="alert('导出制度清单')">📥 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>制度名称</th><th>分类</th><th>发布日期</th><th>修订日期</th><th>版本</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(d => `<tr><td>${d.id}</td><td><strong>${d.name}</strong></td><td><span class="tag ${catColors[d.category]||'tag-gray'}">${d.category}</span></td><td>${d.publishDate}</td><td>${d.reviseDate||'-'}</td><td>v${d.version}</td><td><span class="tag ${d.status==='现行'?'tag-success':d.status==='修订中'?'tag-warning':'tag-gray'}">${d.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看制度: ${d.name}')">查看</button> <button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('下载: ${d.name}')">下载</button></td></tr>`).join('')}
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📋</div><div class="kpi-value">${data.length}</div><div class="kpi-label">任务总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.filter(t=>t.status==='已完成').length}</div><div class="kpi-label">已完成</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">🔄</div><div class="kpi-value">${data.filter(t=>t.status==='进行中').length}</div><div class="kpi-label">进行中</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.filter(t=>t.status==='已逾期').length}</div><div class="kpi-label">已逾期</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 工作清单</div>
      <div class="filter-bar">
        <select><option>全部状态</option><option>待开始</option><option>进行中</option><option>已完成</option><option>已逾期</option></select>
        <select><option>全部优先级</option><option>高</option><option>中</option><option>低</option></select>
        <input type="text" placeholder="搜索任务...">
        <button class="btn btn-primary" onclick="alert('打开新增任务窗口')">➕ 新增任务</button>
      </div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>任务名称</th><th>负责人</th><th>优先级</th><th>截止日期</th><th>进度</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(t => `<tr><td>${t.id}</td><td><strong>${t.name}</strong></td><td>${t.owner}</td><td><span class="tag ${prioColors[t.priority]||'tag-gray'}">${t.priority}</span></td><td>${t.deadline}</td><td><div class="progress" style="width:80px"><div class="progress-bar ${t.progress>=80?'green':t.progress>=40?'orange':'red'}" style="width:${t.progress}%"></div></div> ${t.progress}%</td><td><span class="tag ${statusColors[t.status]||'tag-gray'}">${t.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看任务: ${t.name}')">详情</button></td></tr>`).join('')}
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
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">🎯</div><div class="kpi-value">${data.length}</div><div class="kpi-label">目标总数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.filter(g=>g.status==='正常').length}</div><div class="kpi-label">正常推进</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.filter(g=>g.status==='需关注').length}</div><div class="kpi-label">需关注</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">🚨</div><div class="kpi-value">${data.filter(g=>g.status==='严重滞后').length}</div><div class="kpi-label">严重滞后</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">🎯 工作目标达成情况</div>
      <table class="data-table">
        <thead><tr><th>编号</th><th>目标名称</th><th>负责人</th><th>周期</th><th>目标值</th><th>当前值</th><th>达成率</th><th>进度</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${data.map(g => {
            const rate = ((g.current/g.target)*100).toFixed(1);
            return `<tr><td>${g.id}</td><td><strong>${g.name}</strong></td><td>${g.owner}</td><td>${g.period}</td><td>${g.target}</td><td>${g.current}</td><td>${rate}%</td><td><div class="progress" style="width:80px"><div class="progress-bar ${rate>=80?'green':rate>=50?'orange':'red'}" style="width:${Math.min(rate,100)}%"></div></div></td><td><span class="tag ${statusColors[g.status]||'tag-gray'}">${g.status}</span></td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看目标: ${g.name}')">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// ========== 新增模块：KPI ==========
async function loadAdminKpi() {
  const data = await fetchAPI('/api/admin/kpi');
  if (!data) { renderPage('<div class="loading">数据加载失败</div>'); return; }
  renderPage(`
    <div class="kpi-grid cols-4">
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.blue}"></div><div class="kpi-icon">📈</div><div class="kpi-value">${data.overview.totalPeople}</div><div class="kpi-label">考核人数</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.green}"></div><div class="kpi-icon">✅</div><div class="kpi-value">${data.overview.excellent}</div><div class="kpi-label">优秀(≥90)</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.orange}"></div><div class="kpi-icon">📊</div><div class="kpi-value">${data.overview.good}</div><div class="kpi-label">良好(80-89)</div></div>
      <div class="kpi-card"><div class="kpi-accent" style="background:${COLORS.red}"></div><div class="kpi-icon">⚠️</div><div class="kpi-value">${data.overview.belowStandard}</div><div class="kpi-label">待改进(<80)</div></div>
    </div>
    <div class="row cols-2">
      <div class="chart-card">
        <div class="chart-title">📊 KPI分数分布</div>
        <div id="kpiDistChart" style="height:300px"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🏢 各中心KPI均值</div>
        <div id="kpiCenterChart" style="height:300px"></div>
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">📋 KPI考核明细</div>
      <div class="filter-bar">
        <select><option>全部中心</option><option>太原</option><option>南昌</option><option>晋中</option><option>沈阳</option><option>南宁</option><option>上海</option></select>
        <select><option>全部等级</option><option>优秀</option><option>良好</option><option>待改进</option></select>
        <button class="btn btn-outline" onclick="alert('导出KPI明细')">📥 导出</button>
      </div>
      <table class="data-table">
        <thead><tr><th>工号</th><th>姓名</th><th>中心</th><th>项目</th><th>岗位</th><th>KPI得分</th><th>等级</th><th>排名</th><th>操作</th></tr></thead>
        <tbody>
          ${data.details.map(d => {
            const grade = d.score >= 90 ? ['tag-success','优秀'] : d.score >= 80 ? ['tag-warning','良好'] : ['tag-danger','待改进'];
            return `<tr><td>${d.id}</td><td><strong>${d.name}</strong></td><td>${d.center}</td><td>${d.project}</td><td>${d.position}</td><td><strong style="font-size:15px;color:${d.score>=90?'var(--success)':d.score>=80?'var(--warning)':'var(--danger)'}">${d.score}</strong></td><td><span class="tag ${grade[0]}">${grade[1]}</span></td><td>${d.rank}</td><td><button class="btn btn-outline" style="padding:4px 12px;font-size:12px" onclick="alert('查看KPI详情: ${d.name}')">详情</button></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `);
  setTimeout(() => {
    disposeCharts();
    initChart('kpiDistChart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','45%'],
        label: { formatter: '{b}\n{d}%', fontSize: 12 },
        data: [
          { value: data.overview.excellent, name: '优秀(≥90)', itemStyle: { color: COLORS.green } },
          { value: data.overview.good, name: '良好(80-89)', itemStyle: { color: COLORS.orange } },
          { value: data.overview.belowStandard, name: '待改进(<80)', itemStyle: { color: COLORS.red } }
        ]
      }]
    });
    initChart('kpiCenterChart', {
      tooltip: { trigger: 'axis', formatter: '{b}<br/>平均KPI: {c}' },
      grid: { left: 50, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: data.centerAvg.map(c => c.center) },
      yAxis: { type: 'value', min: 70, max: 100 },
      series: [{ type: 'bar', data: data.centerAvg.map(c => c.avgScore), itemStyle: { color: function(p) { return p.value >= 90 ? COLORS.green : p.value >= 80 ? COLORS.orange : COLORS.red; } }, label: { show: true, position: 'top' } }]
    });
    window.addEventListener('resize', () => Object.values(charts).forEach(c => c && c.resize && c.resize()));
  }, 50);
}
