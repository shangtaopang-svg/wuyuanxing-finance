// ===== 五源兴农业 · 财务数据平台 =====

// === 工具函数 ===
function $(id) { return document.getElementById(id); }
function formatNum(n) { return '¥' + Number(n).toLocaleString('zh-CN', {minimumFractionDigits:2}); }
// === 品牌开场动画 ===
function hideSplash() {
  var el = document.getElementById('splashScreen');
  if (el) { el.classList.add('hide'); setTimeout(function() { el.style.display = 'none'; }, 900); }
}

// === 全局提示 ===
function showError(msg) { var el=document.getElementById('errorToast'); if(!el)return; el.textContent=msg; el.classList.add('show'); setTimeout(function(){el.classList.remove('show');},3000); }

// === 加载状态 ===
function showLoading(show) { var el=document.getElementById('globalLoading'); if(!el)return; if(show)el.classList.add('show'); else el.classList.remove('show'); }

// === 数字滚动动画 ===
function animateNumber(el, target, duration, prefix) {
  if (!el) return;
  prefix = prefix || '';
  var start = 0;
  var startTime = null;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var progress = Math.min((timestamp - startTime) / duration, 1);
    // easeOutCubic
    var eased = 1 - Math.pow(1 - progress, 3);
    var current = Math.round(start + (target - start) * eased);
    el.textContent = prefix + current.toLocaleString('zh-CN', {minimumFractionDigits:2});
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = prefix + target.toLocaleString('zh-CN', {minimumFractionDigits:2});
  }
  requestAnimationFrame(step);
}

function animateSummaryNumbers() {
  var items = [
    { id:'sIncome', prefix:'¥' },
    { id:'sExpense', prefix:'¥' },
    { id:'sCapital', prefix:'¥' },
    { id:'sReceivable', prefix:'¥' }
  ];
  items.forEach(function(item) {
    var el = document.getElementById(item.id);
    if (!el) return;
    var text = el.textContent.replace(/[¥,\s]/g, '');
    var target = parseFloat(text) || 0;
    el.textContent = item.prefix + '0.00';
    setTimeout(function() {
      animateNumber(el, target, 1200, item.prefix);
    }, 300);
  });
}

function today() {
  var d = new Date();
  return d.toLocaleDateString('zh-CN', {timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit'}).replace(/\//g, '-');
}

// === 标签页导航 ===
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
    // 触发图表重绘
    setTimeout(function() { renderCharts(); }, 100);
  });
});

// === 跨版块跳转 ===
function switchTab(tabNum) {
  var btn = document.querySelector('.tab-btn[data-tab="tab' + tabNum + '"]');
  if (btn) btn.click();
}

// === 子标签导航 ===
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.sub-tab-btn');
  if (!btn) return;
  var parent = btn.closest('.tab-panel');
  parent.querySelectorAll('.sub-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  parent.querySelectorAll('.sub-panel').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  $(btn.dataset.sub).classList.add('active');
});

// === 直接从服务器加载真实数据（简化版） ===
var API_BASE = window.location.pathname.startsWith('/finance/') ? '/finance' : '';
var SERVER_DATA = {};

function fetchAllServerData(callback) {
  var token = localStorage.getItem('wyx_token');
  if (!token) { if (callback) callback(); return; }

  var sections = ['incomeExpense','capital','income','pettyCash','reimburse','receivable','asset','management','salary','baseExpense','companyInfo','contracts','bankAccounts'];
  var done = 0;

  sections.forEach(function(s) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/api/data/' + s, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.onload = function() {
      try { SERVER_DATA[s] = JSON.parse(xhr.responseText) || []; } catch(e) { SERVER_DATA[s] = []; }
      done++;
      if (done === sections.length && callback) callback();
    };
    xhr.onerror = function() { SERVER_DATA[s] = []; done++; if (done === sections.length && callback) callback(); };
    xhr.send();
  });
}

// 从服务器获取汇总数据（用于仪表盘）
function fetchDashData(callback) {
  var token = localStorage.getItem('wyx_token');
  if (!token) { if (callback) callback(null); return; }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', API_BASE + '/api/validate', true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.onload = function() {
    try { if (callback) callback(JSON.parse(xhr.responseText)); } catch(e) { if (callback) callback(null); }
  };
  xhr.onerror = function() { if (callback) callback(null); };
  xhr.send();
}

// === 汇总横幅点击动态效果 ===
document.querySelectorAll('.sum-item').forEach(function(el) {
  el.addEventListener('click', function() {
    this.classList.remove('pop');
    void this.offsetWidth;
    this.classList.add('pop');
  });
});

// === 日期显示 ===
$('topDate').textContent = today();

// === 渲染函数 ===

// ① 基本账户收支
function renderIncomeExpense() {
  var data = DataStore.incomeExpense;
  var body = $('incomeExpenseBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty1').style.display = 'block'; return; }
  $('empty1').style.display = 'none';
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
    body.innerHTML += '<tr><td>' + r.date + '</td><td><strong>' + r.type + '</strong></td><td>' + r.summary + '</td>' +
      '<td class="amount income">' + (r.income ? formatNum(r.income) : '') + '</td>' +
      '<td class="amount expense">' + (r.expense ? formatNum(r.expense) : '') + '</td>' +
      '<td class="amount">' + formatNum(r.balance) + '</td>' +
      '<td>' + (r.invoices.length ? r.invoices.map(function(f) { return '<a href="#" class="invoice-link" onclick="previewFile(\'' + encodeURIComponent(f) + '\')">📎 ' + f + '</a>'; }).join('') : '—') + '</td></tr>';
  });
}

// ② 股本金
function renderCapital() {
  var data = DataStore.capital;
  var body = $('capitalBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty2').style.display = 'block'; return; }
  $('empty2').style.display = 'none';
  var total = 0;
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
    total += r.amount || 0;
    body.innerHTML += '<tr><td>' + r.date + '</td><td><strong>' + r.name + '</strong></td>' +
      '<td class="amount green">' + formatNum(r.amount) + '</td><td>' + r.method + '</td>' +
      '<td>' + (r.voucher ? '<span class="invoice-link" onclick="previewFile(\'' + encodeURIComponent(r.voucher) + '\')">📎 回单</span>' : '—') + '</td></tr>';
  });
  body.innerHTML += '<tr style="background:#f5f0e8;font-weight:700"><td colspan="2">合计</td><td class="amount green">' + formatNum(total) + '</td><td colspan="2"></td></tr>';
}

// ③ 收入
function renderIncome() {
  var data = DataStore.income;
  var body = $('incomeBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty3').style.display = 'block'; return; }
  $('empty3').style.display = 'none';
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
    body.innerHTML += '<tr><td>' + r.date + '</td><td>' + r.category + '</td><td class="amount green">' + formatNum(r.amount) + '</td>' +
      '<td>' + (r.source || '—') + '</td><td>' + (r.voucher ? '<span class="invoice-link">📎 凭证</span>' : '—') + '</td></tr>';
  });
}

// ④ 备用金（含报销关联）
function renderPettyCash() {
  var allReimburse = DataStore._reimburseFlat || DataStore.reimburse || [];
  ['ren','pang'].forEach(function(person) {
    var data = DataStore.pettyCash[person] || [];
    var personName = person === 'ren' ? '任海涛' : '庞尚韬';
    var bodyId = person === 'ren' ? 'pettyRenBody' : 'pettyPangBody';
    var emptyId = person === 'ren' ? 'empty4a' : 'empty4b';
    var body = $(bodyId);
    body.innerHTML = '';
    if (data.length === 0) { $(emptyId).style.display = 'block'; return; }
    $(emptyId).style.display = 'none';
    var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
      // 查找关联报销
      var relatedReimburse = allReimburse.filter(function(rm) {
        return rm.person === personName && Math.abs((new Date(rm.date)) - (new Date(r.date))) < 7*24*60*60*1000;
      });
      var link = relatedReimburse.length > 0
        ? '<span class="invoice-link" onclick="switchTab(5)">📎 关联报销(' + relatedReimburse.length + ')</span>'
        : '—';
      body.innerHTML += '<tr><td>' + r.date + '</td><td>' + r.type + '</td><td class="amount">' + formatNum(r.amount) + '</td>' +
        '<td>' + r.summary + '</td><td>' + link + '</td></tr>';
    });
  });
}

// ⑤ 报销（含备用金关联）
function renderReimburse() {
  var allReimburse = (typeof SERVER_DATA !== 'undefined' && SERVER_DATA.reimburse) || DataStore.reimburse || DataStore._reimburseFlat || [];
  var allPetty = (typeof SERVER_DATA !== 'undefined' && SERVER_DATA.pettyCash) || DataStore._pettyCashFlat || [];
  var personMap = {'任海涛':'ren','庞尚韬':'pang','应红林':'ying'};
  ['任海涛','庞尚韬','应红林'].forEach(function(personName) {
    var pkey = personMap[personName];
    var data = Array.isArray(allReimburse) ? allReimburse.filter(function(r){return r.person===personName;}) : [];
    var bodyId = 'reimburse' + (pkey==='ren'?'RenBody':pkey==='pang'?'PangBody':'YingBody');
    var emptyId = 'empty5' + (pkey==='ren'?'a':pkey==='pang'?'b':'c');
    var body = $(bodyId);
    if (!body) return;
    body.innerHTML = '';
    if (!data || data.length === 0) { var e = $(emptyId); if(e) e.style.display = 'block'; return; }
    var e = $(emptyId); if(e) e.style.display = 'none';
    var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
      var relatedPetty = Array.isArray(allPetty) ? allPetty.filter(function(p) {
        return p.person === personName && Math.abs((new Date(p.date)) - (new Date(r.date))) < 7*24*60*60*1000;
      }) : [];
      var link = relatedPetty.length > 0
        ? '<span class="invoice-link" onclick="switchTab(4)">💰 关联备用金(' + relatedPetty.length + ')</span>'
        : '—';
      body.innerHTML += '<tr><td>' + (r.date||'') + '</td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + (r.reason||'') + '</td><td>' + link + '</td>' +
        '<td>' + (r.docs && r.docs.length ? r.docs.map(function(f) { return '<span class="invoice-link">📎 单据</span>'; }).join('') : '—') + '</td></tr>';
    });
  });
}

// ⑥ 应收账款
function renderReceivable() {
  var data = DataStore.receivable;
  var body = $('receivableBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty6').style.display = 'block'; return; }
  $('empty6').style.display = 'none';
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
    body.innerHTML += '<tr><td>' + r.date + '</td><td>' + r.party + '</td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + r.reason + '</td><td>' + r.status + '</td></tr>';
  });
}

// ⑦ 固定资产
function renderAsset() {
  var data = DataStore.asset;
  var body = $('assetBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty7').style.display = 'block'; return; }
  $('empty7').style.display = 'none';
    data.forEach(function(r) {
    var capBg = capColors[r.name] || "";
    body.innerHTML += '<tr style="background:' + capBg + '"><td>' + r.date + '</td><td><strong>' + r.name + '</strong></td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + r.location + '</td><td>' + r.status + '</td></tr>';
  });
}

// ⑧ 管理费用
function renderManagement() {
  var data = DataStore.management;
  var body = $('managementBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty8').style.display = 'block'; return; }
  $('empty8').style.display = 'none';
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
    body.innerHTML += '<tr><td>' + r.date + '</td><td>' + r.category + '</td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + r.summary + '</td><td>' +
      (r.invoices && r.invoices.length ? r.invoices.map(function(f) { return '<span class="invoice-link">📎 ' + f + '</span>'; }).join('') : '—') + '</td></tr>';
  });
}

// ⑨ 工资
function renderSalary() {
  var data = DataStore.salary;
  var body = $('salaryBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty9').style.display = 'block'; return; }
  $('empty9').style.display = 'none';
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
    body.innerHTML += '<tr><td>' + r.month + '</td><td>' + r.name + '</td><td>' + r.position + '</td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + r.payDate + '</td><td>' +
      (r.voucher ? '<span class="invoice-link">📎</span>' : '—') + '</td></tr>';
  });
}

// ⑩ 基地支出
function renderBaseExpense() {
  ['jinyinhua','dangshen','seedling'].forEach(function(base) {
    var data = DataStore.baseExpense[base];
    var names = {jinyinhua:'JinyinhuaBody', dangshen:'DangshenBody', seedling:'SeedlingBody'};
    var emptyIds = {jinyinhua:'empty10a', dangshen:'empty10b', seedling:'empty10c'};
      var body = $(names[base]);
      if (!body) return;
      body.innerHTML = '';
    var e=$(emptyIds[base]);if(e)e.style.display = 'none';
    var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
      body.innerHTML += '<tr><td>' + r.date + '</td><td>' + r.item + '</td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + (r.note || '') + '</td><td>' +
        (r.invoices && r.invoices.length ? r.invoices.map(function(f) { return '<a href="#" class="invoice-link" onclick="previewFile(\'' + encodeURIComponent(f) + '\')">📎 ' + f + '</a>'; }).join('') : '—') + '</td></tr>';
    });
  });
}

// === 汇总数字更新 ===
function updateSummary() {
  var totalIncome = DataStore.income.reduce(function(s, r) { return s + (r.amount || 0); }, 0);
  var totalExpense = DataStore.incomeExpense.reduce(function(s, r) { return s + (r.expense || 0); }, 0);
  var totalCapital = DataStore.capital.reduce(function(s, r) { return s + (r.amount || 0); }, 0);
  var totalReceivable = DataStore.receivable.reduce(function(s, r) { return s + (r.amount || 0); }, 0);

  var ei=$('totalIncome');if(ei)ei.textContent = formatNum(totalIncome);
  var ee=$('totalExpense');if(ee)ee.textContent = formatNum(totalExpense);
  var ec=$('totalCapital');if(ec)ec.textContent = formatNum(totalCapital);
  var er=$('totalReceivable');if(er)er.textContent = formatNum(totalReceivable);
}

// === 图表 ===
var charts = {};
if (typeof Chart !== "undefined" && typeof ChartDataLabels !== "undefined") { try { Chart.register(ChartDataLabels); } catch(e) {} }

function renderCharts() {
  var active = document.querySelector('.tab-panel.active');
  if (!active) return;
  var id = active.id;
  if (id === 'tab0') { renderDashCharts(); }
  else if (id === 'tab2') { renderChart2a(); renderChart2b(); }
  else if (id === 'tab4') { renderChart4a(); renderChart4b(); }
  else if (id === 'tab5') { renderChart5a(); renderChart5b(); }
  else if (id === 'tab6') { renderChart6a(); renderChart6b(); }
  else if (id === 'tab7') { renderChart7a(); renderChart7b(); }
  else if (id === 'tab8') { renderChart8a(); renderChart8b(); }
  else if (id === 'tab9') { renderChart9a(); renderChart9b(); }
  else if (id === 'tab14') { renderChart14a(); renderChart14b(); }
}

function makeChart(id, type, labels, datasets, opts) {
  var ctx = document.getElementById(id);
  if (!ctx) return null;
  if (charts[id]) charts[id].destroy();
  var defaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { font: { size: 13, weight: 'bold' }, boxWidth: 16, padding: 12, usePointStyle: true }, position: 'bottom' } },
    scales: type !== 'doughnut' && type !== 'pie' ? {
      x: { grid: { display: false }, ticks: { font: { size: 9 } } },
      y: { ticks: { callback: function(v) { return '¥' + (v/1000).toFixed(0) + 'k'; }, font: { size: 9 } } }
    } : undefined
  };
  var config = JSON.parse(JSON.stringify(defaults));
  if (opts) {
    if (opts.plugins && config.plugins) {
      Object.assign(config.plugins, opts.plugins);
      delete opts.plugins;
    }
    Object.assign(config, opts);
  }
  charts[id] = new Chart(ctx, { type: type, data: { labels: labels, datasets: datasets }, options: config });
  return charts[id];
}

// === 仪表盘图表 ===
function renderDashCharts() {
  var bf = DataStore.bankFlow || [];
  var cap = DataStore.capital || [];
  var reim = DataStore._reimburseFlat || DataStore.reimburse || [];
  var reimCount = Array.isArray(reim) ? reim.length : 0;
  var totalIncome = bf.reduce(function(s,r) { return s + (r.income||0); }, 0);
  var totalExpense = bf.reduce(function(s,r) { return s + (r.expense||0); }, 0);
  var totalCapital = cap.reduce(function(s,r) { return s + (r.amount||0); }, 0);

  $('dashIncome').textContent = formatNum(totalIncome);
  $('dashExpense').textContent = formatNum(totalExpense);
  $('dashBalance').textContent = formatNum(totalIncome - totalExpense);
  $('dashCapital').textContent = formatNum(totalCapital);
  $('dashReimburse').textContent = reimCount + '笔';
  $('dashBankFlow').textContent = bf.length + '笔';

  // 月度收支趋势（使用bankFlow数据）
  var months = {};
  bf.forEach(function(r) {
    var m = (r.date||'').slice(0,7);
    if (!m) return;
    if (!months[m]) months[m] = { income:0, expense:0 };
    months[m].income += r.income||0;
    months[m].expense += r.expense||0;
  });
  var mLabels = Object.keys(months).sort();
  var mIncome = mLabels.map(function(m){return months[m].income;});
  var mExpense = mLabels.map(function(m){return months[m].expense;});
  makeChart('dashChart', 'bar', mLabels, [
    { label: '收入', data: mIncome, backgroundColor: 'rgba(39,174,96,0.7)', borderColor: '#27ae60', borderWidth: 2 },
    { label: '支出', data: mExpense, backgroundColor: 'rgba(229,62,62,0.7)', borderColor: '#e53e3e', borderWidth: 2 }
  ], {
    plugins: { datalabels: { anchor:'end', align:'end', color:'#000', font:{weight:'bold',size:9}, formatter:function(v){return '¥' + Math.round(v).toLocaleString('zh-CN');} } }
  });

  // 支出用途占比（从基本户取）
  var expByPurpose = {};
  bf.forEach(function(r) { if (r.expense > 0 && r.purpose) { var p = r.purpose.slice(0,4); expByPurpose[p] = (expByPurpose[p]||0) + r.expense; } });
  var eLabels = Object.keys(expByPurpose).sort(function(a,b){return expByPurpose[b]-expByPurpose[a];}).slice(0,8);
  var eValues = eLabels.map(function(k) { return expByPurpose[k]; });
  makeChart('dashPie', 'doughnut', eLabels, [
    { data: eValues, backgroundColor: ['#D35400','#2b6cb0','#38a169','#d69e2e','#9f7aea','#e53e3e','#1abc9c','#34495e'], borderColor: '#000', borderWidth: 2 }
  ], {
    plugins: { datalabels: { color:'#fff', font:{weight:'bold',size:10}, formatter:function(v,ctx){var t=ctx.dataset.data.reduce(function(a,b){return a+b;},0);return (v/t*100).toFixed(1)+'%';} } }
  });

  // 股本金构成
  var cLabels = cap.map(function(r) { return r.name; });
  var cValues = cap.map(function(r) { return r.amount||0; });
  makeChart('dashChart3', 'doughnut', cLabels, [
    { data: cValues, backgroundColor: ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6'], borderColor: '#000', borderWidth: 2 }
  ]);

  // 基地支出对比
  var baseMap = {};
  bases.forEach(function(r) { baseMap[r.base] = (baseMap[r.base]||0) + (r.amount||0); });
  var bLabels = Object.keys(baseMap);
  var bValues = bLabels.map(function(k) { return baseMap[k]; });
  makeChart('dashChart4', 'bar', bLabels, [
    { data: bValues, backgroundColor: '#27ae60', borderColor: '#000', borderWidth: 2 }
  ]);
}

// ① 收支图表
function renderChart1a() { renderChart1(); }
function renderChart1b() { renderChart1Donut(); }

// ② 股本金图表
function renderChart2a() {
  var data = DataStore.capital || [];
  // 按股东姓名汇总
  var persons = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { persons[r.name] = (persons[r.name]||0) + (r.amount||0); });
  var names = Object.keys(persons);
  var amounts = names.map(function(n){return persons[n];});
  var total = amounts.reduce(function(s,v){return s+v;},0);
  var colors = ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e','#16a085','#c0392b','#2980b9','#8e44ad','#d35400','#2c3e50','#27ae60','#7f8c8d'];
  var opts = {};
  if (typeof ChartDataLabels !== 'undefined') {
    opts.plugins = { datalabels: {
      color: '#fff', font: { weight: 'bold', size: 11 },
      formatter: function(v) { return (v/total*100).toFixed(1) + '%'; }
    }};
  }
  makeChart('chart2a', 'doughnut', names, [
    { data: amounts, backgroundColor: colors.slice(0, names.length), borderColor: '#000', borderWidth: 2 }
  ], opts);
}
function renderChart2b() {
  var data = DataStore.capital || [];
  var methods = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { methods[r.method] = (methods[r.method]||0) + (r.amount||0); });
  makeChart('chart2b', 'pie', Object.keys(methods), [
    { data: Object.keys(methods).map(function(k){return methods[k];}), backgroundColor: ['#3498db','#e74c3c','#2ecc71'], borderColor: '#000', borderWidth: 2 }
  ]);
}

// ③ 收入图表
function renderChart3a() {
  var data = DataStore.income || [];
  makeChart('chart3a', 'bar', data.map(function(r){return r.date.slice(5);}), [
    { label: '收入', data: data.map(function(r){return r.amount||0;}), backgroundColor: '#27ae60', borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart3b() {
  var data = DataStore.income || [];
  var cats = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { cats[r.category] = (cats[r.category]||0) + (r.amount||0); });
  makeChart('chart3b', 'doughnut', Object.keys(cats), [
    { data: Object.keys(cats).map(function(k){return cats[k];}), backgroundColor: ['#2ecc71','#3498db','#f39c12','#e74c3c'], borderColor: '#000', borderWidth: 2 }
  ]);
}

// ④ 备用金图表
function renderChart4a() {
  var data = DataStore.pettyCash || DataStore._pettyCashFlat || [];
  var draw = data.filter(function(r){return r.type==='领用'}).reduce(function(s,r){return s+(r.amount||0);},0);
  var wo = data.filter(function(r){return r.type==='核销'}).reduce(function(s,r){return s+(r.amount||0);},0);
  makeChart('chart4a', 'bar', ['领用','核销'], [
    { data: [draw, wo], backgroundColor: ['#f39c12','#27ae60'], borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart4b() {
  var data = DataStore.pettyCash || DataStore._pettyCashFlat || [];
  var persons = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { persons[r.person] = (persons[r.person]||0) + (r.amount||0); });
  makeChart('chart4b', 'doughnut', Object.keys(persons), [
    { data: Object.keys(persons).map(function(k){return persons[k];}), backgroundColor: ['#3498db','#e74c3c'], borderColor: '#000', borderWidth: 2 }
  ]);
}

// ⑤ 报销图表
function renderChart5a() {
  var data = DataStore.reimburse || DataStore._reimburseFlat || [];
  var persons = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { persons[r.person] = (persons[r.person]||0) + (r.amount||0); });
  makeChart('chart5a', 'bar', Object.keys(persons), [
    { data: Object.keys(persons).map(function(k){return persons[k];}), backgroundColor: ['#3498db','#e74c3c','#2ecc71'], borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart5b() {
  var data = DataStore.reimburse || DataStore._reimburseFlat || [];
  var persons = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { persons[r.person] = (persons[r.person]||0) + 1; });
  makeChart('chart5b', 'doughnut', Object.keys(persons), [
    { data: Object.keys(persons).map(function(k){return persons[k];}), backgroundColor: ['#3498db','#e74c3c','#2ecc71'], borderColor: '#000', borderWidth: 2 }
  ]);
}

// ⑥ 应收款图表
function renderChart6a() {
  var data = DataStore.receivable || [];
  var statuses = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { statuses[r.status] = (statuses[r.status]||0) + (r.amount||0); });
  makeChart('chart6a', 'doughnut', Object.keys(statuses), [
    { data: Object.keys(statuses).map(function(k){return statuses[k];}), backgroundColor: ['#e74c3c','#f39c12','#27ae60'], borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart6b() {
  var data = DataStore.receivable || [];
  makeChart('chart6b', 'bar', data.map(function(r){return r.date.slice(5);}), [
    { data: data.map(function(r){return r.amount||0;}), backgroundColor: '#e74c3c', borderColor: '#000', borderWidth: 2 }
  ]);
}

// ⑦ 固定资产图表
function renderChart7a() {
  var data = DataStore.asset || [];
  makeChart('chart7a', 'doughnut', data.map(function(r){return r.name;}), [
    { data: data.map(function(r){return r.amount||0;}), backgroundColor: ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6'], borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart7b() {
  var data = DataStore.asset || [];
  var statuses = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { statuses[r.status] = (statuses[r.status]||0) + 1; });
  makeChart('chart7b', 'pie', Object.keys(statuses), [
    { data: Object.keys(statuses).map(function(k){return statuses[k];}), backgroundColor: ['#27ae60','#f39c12','#e74c3c'], borderColor: '#000', borderWidth: 2 }
  ]);
}

// ⑧ 管理费图表
function renderChart8a() {
  var data = DataStore.management || [];
  var cats = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { cats[r.category] = (cats[r.category]||0) + (r.amount||0); });
  makeChart('chart8a', 'doughnut', Object.keys(cats), [
    { data: Object.keys(cats).map(function(k){return cats[k];}), backgroundColor: ['#3498db','#e74c3c','#2ecc71','#f39c12'], borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart8b() {
  var data = DataStore.management || [];
  makeChart('chart8b', 'bar', data.map(function(r){return r.date.slice(5);}), [
    { data: data.map(function(r){return r.amount||0;}), backgroundColor: '#3498db', borderColor: '#000', borderWidth: 2 }
  ]);
}

// ⑨ 工资图表
function renderChart9a() {
  var data = DataStore.salary || [];
  var months = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { months[r.month] = (months[r.month]||0) + (r.amount||0); });
  makeChart('chart9a', 'bar', Object.keys(months), [
    { data: Object.keys(months).map(function(k){return months[k];}), backgroundColor: '#e74c3c', borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart9b() {
  var data = DataStore.salary || [];
  var pos = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { pos[r.position] = (pos[r.position]||0) + (r.amount||0); });
  makeChart('chart9b', 'doughnut', Object.keys(pos), [
    { data: Object.keys(pos).map(function(k){return pos[k];}), backgroundColor: ['#3498db','#e74c3c','#2ecc71'], borderColor: '#000', borderWidth: 2 }
  ]);
}

// ⑩ 基地支出图表
function renderChart10a() {
  var data = DataStore.baseExpense || [];
  var bases = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { bases[r.base] = (bases[r.base]||0) + (r.amount||0); });
  makeChart('chart10a', 'bar', Object.keys(bases), [
    { data: Object.keys(bases).map(function(k){return bases[k];}), backgroundColor: '#27ae60', borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart10b() {
  var data = DataStore.baseExpense || [];
  var items = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { items[r.item] = (items[r.item]||0) + (r.amount||0); });
  var sorted = Object.keys(items).sort(function(a,b){return items[b]-items[a];}).slice(0,8);
  makeChart('chart10b', 'doughnut', sorted, [
    { data: sorted.map(function(k){return items[k];}), backgroundColor: ['#3498db','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#D35400','#2980b9'], borderColor: '#000', borderWidth: 2 }
  ]);
}

// 保留原有图表函数兼容
function renderChart1() {
  var data = DataStore.incomeExpense || [];
  makeChart('chart1a', 'bar', data.map(function(r){return r.date.slice(5);}), [
    { label: '收入', data: data.map(function(r){return r.income||0;}), backgroundColor: '#27ae60', borderColor: '#000', borderWidth: 2 },
    { label: '支出', data: data.map(function(r){return r.expense||0;}), backgroundColor: '#c0392b', borderColor: '#000', borderWidth: 2 }
  ]);
}
function renderChart1Donut() {
  var data = DataStore.incomeExpense || [];
  var expByType = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { if (r.expense > 0) { expByType[r.summary] = (expByType[r.summary]||0) + r.expense; } });
  var labels = Object.keys(expByType);
  var values = labels.map(function(k) { return expByType[k]; });
  makeChart('chart1b', 'doughnut', labels, [
    { data: values, backgroundColor: ['#D35400','#2b6cb0','#38a169','#d69e2e','#9f7aea','#e53e3e'], borderColor: '#000', borderWidth: 2 }
  ]);
}

// === 文件预览 ===
function previewFile(path) {
  var decoded = decodeURIComponent(path);
  // 检查文件扩展名
  var ext = decoded.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].indexOf(ext) !== -1) {
    $('previewImg').src = 'uploads/vouchers/' + decoded;
    $('imgViewer').classList.add('show');
    $('imgOverlay').classList.add('show');
  } else {
    // PDF/Excel文件尝试打开
    window.open('uploads/vouchers/' + decoded, '_blank');
  }
}

function closeImgViewer() {
  $('imgViewer').classList.remove('show');
  $('imgOverlay').classList.remove('show');
}

// === 添加数据弹窗 ===
var currentForm = '';

function showAddForm(type) {
  currentForm = type;
  var title = {
    incomeExpense: '添加收支记录',
    capital: '添加股本金',
    income: '添加收入',
    pettyCash: '添加备用金',
    reimburse: '添加报销',
    receivable: '添加应收款',
    asset: '添加固定资产',
    management: '添加管理费用',
    salary: '添加工资',
    baseExpense: '添加基地支出'
  }[type] || '添加记录';

  $('modalTitle').textContent = title;

  var html = '';
  if (type === 'incomeExpense') {
    html = '<div class="form-row"><div class="form-group"><label>日期</label><input type="date" id="fDate" value="' + today() + '"></div>' +
      '<div class="form-group"><label>类型</label><select id="fType"><option>收入</option><option>支出</option></select></div></div>' +
      '<div class="form-group"><label>摘要</label><input id="fSummary" placeholder="支出用途说明"></div>' +
      '<div class="form-row"><div class="form-group"><label>金额</label><input type="number" id="fAmount" placeholder="0.00"></div>' +
      '<div class="form-group"><label>余额</label><input type="number" id="fBalance" placeholder="0.00"></div></div>' +
      '<div class="form-group"><label>发票/凭证（支持jpg/png/pdf，放到 uploads/vouchers/ 目录）</label><input id="fInvoice" placeholder="文件名"></div>';
  } else if (type === 'capital') {
    html = '<div class="form-row"><div class="form-group"><label>日期</label><input type="date" id="fDate" value="' + today() + '"></div>' +
      '<div class="form-group"><label>股东姓名</label><input id="fName" placeholder="股东姓名"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>金额</label><input type="number" id="fAmount" placeholder="0.00"></div>' +
      '<div class="form-group"><label>出资方式</label><select id="fMethod"><option>银行转账</option><option>现金</option><option>其他</option></select></div></div>' +
      '<div class="form-group"><label>入账凭据</label><input id="fVoucher" placeholder="文件名（回单照片/PDF）"></div>';
  } else if (type === 'income') {
    html = '<div class="form-row"><div class="form-group"><label>日期</label><input type="date" id="fDate" value="' + today() + '"></div>' +
      '<div class="form-group"><label>类别</label><input id="fCategory" placeholder="如：药材销售"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>金额</label><input type="number" id="fAmount" placeholder="0.00"></div>' +
      '<div class="form-group"><label>来源/归处</label><input id="fSource" placeholder="来源"></div></div>';
  } else if (type === 'pettyCash') {
    html = '<div class="form-row"><div class="form-group"><label>日期</label><input type="date" id="fDate" value="' + today() + '"></div>' +
      '<div class="form-group"><label>人员</label><select id="fPerson"><option>任海涛</option><option>庞尚韬</option></select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>类型</label><select id="fType2"><option>领用</option><option>核销</option></select></div>' +
      '<div class="form-group"><label>金额</label><input type="number" id="fAmount" placeholder="0.00"></div></div>' +
      '<div class="form-group"><label>摘要</label><input id="fSummary" placeholder="摘要"></div>';
  } else if (type === 'reimburse') {
    html = '<div class="form-row"><div class="form-group"><label>日期</label><input type="date" id="fDate" value="' + today() + '"></div>' +
      '<div class="form-group"><label>人员</label><select id="fPerson"><option>任海涛</option><option>庞尚韬</option><option>应红林</option></select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>金额</label><input type="number" id="fAmount" placeholder="0.00"></div></div>' +
      '<div class="form-group"><label>事由</label><input id="fReason" placeholder="报销事由"></div>';
  } else if (type === 'salary') {
    html = '<div class="form-row"><div class="form-group"><label>月份</label><input type="month" id="fMonth"></div>' +
      '<div class="form-group"><label>姓名</label><input id="fName" placeholder="姓名"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>岗位</label><input id="fPos" placeholder="岗位"></div>' +
      '<div class="form-group"><label>金额</label><input type="number" id="fAmount" placeholder="0.00"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>发放日期</label><input type="date" id="fPayDate"></div></div>';
  } else if (type === 'baseExpense') {
    html = '<div class="form-row"><div class="form-group"><label>日期</label><input type="date" id="fDate" value="' + today() + '"></div>' +
      '<div class="form-group"><label>基地</label><select id="fBase"><option>金银花基地</option><option>党参基地</option><option>党参育苗基地</option></select></div></div>' +
      '<div class="form-group"><label>支出项目</label><input id="fItem" placeholder="项目名称"></div>' +
      '<div class="form-row"><div class="form-group"><label>金额</label><input type="number" id="fAmount" placeholder="0.00"></div></div>' +
      '<div class="form-group"><label>说明</label><input id="fNote" placeholder="说明"></div>';
  }

  html += '<div class="form-actions"><button class="btn-cancel" onclick="closeModal()">取消</button><button class="btn-submit" onclick="submitForm()">保存</button></div>';
  $('modalBody').innerHTML = html;
  $('modal').classList.add('show');
  $('modalOverlay').classList.add('show');
}

function closeModal() {
  $('modal').classList.remove('show');
  $('modalOverlay').classList.remove('show');
}

function submitForm() {
  // 这里可以扩展为实际保存到 localStorage 或发送到服务器
  alert('✅ 记录已添加（数据当前保存在内存中，刷新后重置。正式使用时需连接数据库）');
  closeModal();
}

// === 初始化全量渲染 ===
function renderBankFlow() {
  var data = DataStore.bankFlow || [];
  var body = $('bankFlowBody');
  if (!body) return;
  body.innerHTML = '';
  // 汇总统计
  var incCount = 0, incTotal = 0, expCount = 0, expTotal = 0;
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
    if (r.income > 0) { incCount++; incTotal += r.income; }
    if (r.expense > 0) { expCount++; expTotal += r.expense; }
  });
  var balance = incTotal - expTotal;
  // 截至日期（取最新交易日期或今天）
  var cutoffDate = '—';
  if (data.length > 0) {
    var dates = data.map(function(r){return r.date;}).filter(Boolean).sort();
    cutoffDate = dates[dates.length-1] || new Date().toISOString().slice(0,10);
  }
  var summaryHtml = '<div style="text-align:right;font-size:0.75rem;font-weight:700;color:#888;margin-bottom:8px">📅 数据截至：' + cutoffDate + '</div>' +
    '<div class="summary-bar" style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">' +
    '<div class="sum-item" style="flex:1;text-align:center;padding:8px 6px;border:1px solid #000;background:#f0faf4;border-left:4px solid #27ae60;border-radius:4px">' +
      '<span class="sum-num" style="display:block;font-size:1.1rem;font-weight:900;color:#27ae60">' + incCount + '</span>' +
      '<span style="font-size:0.7rem;font-weight:700">总收入笔数</span></div>' +
    '<div class="sum-item" style="flex:1;text-align:center;padding:8px 6px;border:1px solid #000;background:#f0faf4;border-left:4px solid #27ae60;border-radius:4px">' +
      '<span class="sum-num" style="display:block;font-size:1.1rem;font-weight:900;color:#27ae60">' + formatNum(incTotal) + '</span>' +
      '<span style="font-size:0.7rem;font-weight:700">总收入金额</span></div>' +
    '<div class="sum-item" style="flex:1;text-align:center;padding:8px 6px;border:1px solid #000;background:#fef2f2;border-left:4px solid #e53e3e;border-radius:4px">' +
      '<span class="sum-num" style="display:block;font-size:1.1rem;font-weight:900;color:#e53e3e">' + expCount + '</span>' +
      '<span style="font-size:0.7rem;font-weight:700">总支出笔数</span></div>' +
    '<div class="sum-item" style="flex:1;text-align:center;padding:8px 6px;border:1px solid #000;background:#fef2f2;border-left:4px solid #e53e3e;border-radius:4px">' +
      '<span class="sum-num" style="display:block;font-size:1.1rem;font-weight:900;color:#e53e3e">' + formatNum(expTotal) + '</span>' +
      '<span style="font-size:0.7rem;font-weight:700">总支出金额</span></div>' +
    '<div class="sum-item" style="flex:1;text-align:center;padding:8px 6px;border:1px solid #000;background:#ebf8ff;border-left:4px solid #3182ce;border-radius:4px">' +
      '<span class="sum-num" style="display:block;font-size:1.1rem;font-weight:900;color:' + (balance >= 0 ? '#3182ce' : '#e53e3e') + '">' + formatNum(balance) + '</span>' +
      '<span style="font-size:0.7rem;font-weight:700">余额</span></div></div>';
  var panel = body.closest('section') || body.parentElement;
  var existingSummary = panel.querySelector('.bankflow-summary');
  if (existingSummary) existingSummary.remove();
  var summaryDiv = document.createElement('div');
  summaryDiv.className = 'bankflow-summary';
  summaryDiv.innerHTML = summaryHtml;
  panel.insertBefore(summaryDiv, panel.querySelector('.table-wrap') || body.parentElement);
  // 数据行
  if (data.length === 0) { var e = $('empty14'); if(e) e.style.display = 'block'; return; }
  var e = $('empty14'); if(e) e.style.display = 'none';
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) {
    var bg = r.income > 0 ? "#f0faf4" : (r.expense > 0 ? "#fef2f2" : "");
    body.innerHTML += '<tr style="background:' + bg + '"><td>' + (r.date||"") + '</td>' +
      '<td class="amount" style="color:#27ae60;font-weight:700">' + (r.income > 0 ? formatNum(r.income) : "") + '</td>' +
      '<td class="amount" style="color:#e53e3e;font-weight:700">' + (r.expense > 0 ? formatNum(r.expense) : "") + '</td>' +
      '<td>' + (r.counterparty_account||"") + '</td>' +
      '<td>' + (r.counterparty_name||"") + '</td>' +
      '<td>' + (r.purpose||"") + '</td>' +
      '<td>' + (r.summary||"") + '</td></tr>';
  });
}

// ①④ 月度收支趋势（公司基本户）
function renderChart14a() {
  var data = DataStore.bankFlow || [];
  if (!data.length) return;
  var months = {};
  data.forEach(function(r) {
    var m = (r.date||'').slice(0,7);
    if (!m) return;
    if (!months[m]) months[m] = { income:0, expense:0 };
    months[m].income += r.income||0;
    months[m].expense += r.expense||0;
  });
  var labels = Object.keys(months).sort();
  var incomeData = labels.map(function(m){return months[m].income;});
  var expenseData = labels.map(function(m){return months[m].expense;});
  makeChart('chart14a', 'bar', labels, [
    { label:'收入', data:incomeData, backgroundColor:'rgba(39,174,96,0.7)', borderColor:'#27ae60', borderWidth:2 },
    { label:'支出', data:expenseData, backgroundColor:'rgba(229,62,62,0.7)', borderColor:'#e53e3e', borderWidth:2 }
  ], {
    scales: { y: { ticks: { callback: function(v) { return '¥' + Math.round(v).toLocaleString('zh-CN'); }, font: { size: 9 } } } },
    plugins: {
      legend: { position:'top', labels:{font:{size:11,weight:'bold'},boxWidth:14,usePointStyle:true} },
      datalabels: {
        anchor: 'end', align: 'end', color: '#000',
        font: { weight: 'bold', size: 10 },
        formatter: function(v) { return '¥' + Math.round(v).toLocaleString('zh-CN'); }
      }
    }
  });
}

// 收支结构占比 + 余额
function renderChart14b() {
  var data = DataStore.bankFlow || [];
  if (!data.length) return;
  var totalInc = 0, totalExp = 0;
  data.forEach(function(r) { totalInc += r.income||0; totalExp += r.expense||0; });
  var balance = totalInc - totalExp;
  var colors = ['#27ae60', '#e53e3e'];
  var ctx = document.getElementById('chart14b');
  if (!ctx) return;
  if (charts['chart14b']) charts['chart14b'].destroy();
  var balColor = balance >= 0 ? '#27ae60' : '#e53e3e';
  charts['chart14b'] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['收入', '支出'], datasets: [{ data: [totalInc, totalExp], backgroundColor: colors, borderColor: '#000', borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position:'bottom', labels:{font:{size:12,weight:'bold'},boxWidth:16,usePointStyle:true} },
        datalabels: {
          color: '#fff', font: { weight: 'bold', size: 13 },
          formatter: function(v, ctx2) {
            var total = ctx2.dataset.data.reduce(function(a,b){return a+b;},0);
            return (v/total*100).toFixed(1) + '%';
          }
        }
      }
    },
    plugins: [{
      id: 'centerText',
      afterDraw: function(chart) {
        var w = chart.width, h = chart.height;
        var ctx3 = chart.ctx;
        ctx3.save();
        ctx3.textAlign = 'center';
        ctx3.textBaseline = 'middle';
        ctx3.font = '700 12px sans-serif';
        ctx3.fillStyle = '#888';
        ctx3.fillText('余额', w/2, h/2 - 16);
        ctx3.font = '700 18px sans-serif';
        ctx3.fillStyle = balColor;
        ctx3.fillText('¥' + Math.round(balance).toLocaleString('zh-CN'), w/2, h/2 + 10);
        ctx3.restore();
      }
    }]
  });
}

function renderAll() {
  renderCapital();
  renderBankFlow();
  renderPettyCash();
  renderReceivable();
  renderAsset();
  renderManagement();
  renderSalary();
  renderBaseExpense();
  renderCompanyInfo();
  renderContracts();
  renderBankAccounts();
  updateSummary();
}

// === 全局搜索（跨版块） ===
function globalSearch(keyword) {
  keyword = keyword.toLowerCase().trim();

  // 在当前版块内搜索过滤
  document.querySelectorAll('.tab-panel').forEach(function(panel) {
    var rows = panel.querySelectorAll('.data-table tbody tr');
    if (!keyword) { rows.forEach(function(r) { r.style.display = ''; }); return; }
    rows.forEach(function(r) {
      var text = r.textContent.toLowerCase();
      r.style.display = text.indexOf(keyword) !== -1 ? '' : 'none';
    });
  });

  // 同时更新搜索结果计数
  if (keyword && keyword.length > 0) {
    var total = 0;
    document.querySelectorAll('.tab-panel').forEach(function(panel) {
      var visible = panel.querySelectorAll('.data-table tbody tr[style*="display: ""]').length;
      total += visible;
    });
  }
}

// === 跨版块高级搜索（弹窗） ===
function showGlobalSearch() {
  var overlay = document.getElementById('searchOverlay');
  if (overlay) {
    overlay.classList.add('show');
    document.getElementById('gsInput').focus();
    return;
  }
  // 创建搜索弹窗
  var html = '<div class="modal-overlay" id="searchOverlay" onclick="hideGlobalSearch()"></div>' +
    '<div class="modal" id="searchModal" style="max-width:800px">' +
    '<div class="modal-header"><h3>🔍 跨版块搜索</h3><button class="modal-close" onclick="hideGlobalSearch()">✕</button></div>' +
    '<div class="modal-body">' +
    '<div class="form-group"><input type="text" id="gsInput" placeholder="输入关键词搜索全部10个版块..." oninput="doGlobalSearch(this.value)" style="width:100%;padding:10px 14px;border:3px solid #000;font-size:0.9rem;font-family:inherit;font-weight:600"></div>' +
    '<div id="gsResults" style="max-height:50vh;overflow-y:auto;margin-top:8px"></div>' +
    '</div></div>';
  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  setTimeout(function() { document.getElementById('gsInput').focus(); }, 100);
}

function hideGlobalSearch() {
  var o = document.getElementById('searchOverlay');
  var m = document.getElementById('searchModal');
  if (o) o.classList.remove('show');
  if (m) m.style.display = 'none';
}

function doGlobalSearch(keyword) {
  keyword = keyword.toLowerCase().trim();
  var resultsDiv = document.getElementById('gsResults');
  if (!resultsDiv) return;
  if (!keyword) { resultsDiv.innerHTML = '<p style="text-align:center;padding:20px;color:#999">输入关键词开始搜索</p>'; return; }

  var allSections = {
    'incomeExpense': { name: '💳 收支', data: DataStore.incomeExpense || [] },
    'capital': { name: '🏦 股本金', data: DataStore.capital || [] },
    'income': { name: '📈 收入', data: DataStore.income || [] },
    'pettyCash': { name: '💰 备用金', data: (DataStore._pettyCashFlat || DataStore.pettyCash || []) },
    'reimburse': { name: '🧾 报销', data: (DataStore._reimburseFlat || DataStore.reimburse || []) },
    'receivable': { name: '📤 应收款', data: DataStore.receivable || [] },
    'asset': { name: '🏗️ 固定资产', data: DataStore.asset || [] },
    'management': { name: '📋 管理费', data: DataStore.management || [] },
    'salary': { name: '👷 工资', data: DataStore.salary || [] },
    'baseExpense': { name: '🌿 基地支出', data: DataStore.baseExpense || [] }
  };

  var totalMatches = 0;
  var html = '';
  for (var key in allSections) {
    var section = allSections[key];
    var matches = [];
    section.data.forEach(function(row, idx) {
      var text = JSON.stringify(row).toLowerCase();
      if (text.indexOf(keyword) !== -1) {
        // 提取匹配片段
        var snippet = '';
        for (var k in row) {
          var v = row[k];
          if (Array.isArray(v)) v = v.join(', ');
          if (v && String(v).toLowerCase().indexOf(keyword) !== -1) {
            snippet += k + ':' + String(v).substring(0, 40) + ' ';
          }
        }
        matches.push({ index: idx, snippet: snippet || JSON.stringify(row).substring(0, 60) });
      }
    });
    if (matches.length > 0) {
      totalMatches += matches.length;
      html += '<div style="margin-bottom:8px;border:2px solid #000;padding:8px 10px;background:var(--card)">' +
        '<div style="font-weight:800;font-size:0.78rem;margin-bottom:4px">' + section.name + ' <span style="color:#888;font-weight:600">(' + matches.length + '条)</span></div>';
      matches.slice(0, 5).forEach(function(m) {
        html += '<div style="font-size:0.72rem;padding:3px 6px;border-bottom:1px solid #eee;color:#555">' +
          '#' + (m.index + 1) + ' → ' + m.snippet.substring(0, 80) + '</div>';
      });
      if (matches.length > 5) html += '<div style="font-size:0.65rem;color:#888;padding:3px 6px">…还有' + (matches.length - 5) + '条</div>';
      html += '</div>';
    }
  }

  if (totalMatches === 0) {
    html = '<p style="text-align:center;padding:20px;color:#999">未找到 "' + keyword + '" 的相关记录</p>';
  }
  resultsDiv.innerHTML = '<p style="font-weight:700;font-size:0.78rem;margin-bottom:8px">共 ' + totalMatches + ' 条匹配结果</p>' + html;
}

// === 新加版块渲染 ===
function renderCompanyInfo() {
  var data = (typeof SERVER_DATA !== 'undefined' ? SERVER_DATA : {}).companyInfo || DataStore.companyInfo || [];
  var body = document.getElementById('companyInfoBody');
  if (!body) return;
  body.innerHTML = '';
  if (!data.length) { var e=document.getElementById('empty11'); if(e)e.style.display='block'; return; }
  var e=document.getElementById('empty11'); if(e)e.style.display='none';
  data.forEach(function(r){ body.innerHTML += '<tr><td style="font-weight:700;width:120px">'+(r.field_name||'')+'</td><td>'+(r.field_value||'')+'</td></tr>'; });
}
function renderContracts() {
  var data = (typeof SERVER_DATA !== 'undefined' ? SERVER_DATA : {}).contracts || DataStore.contracts || [];
  var body = document.getElementById('contractsBody');
  if (!body) return;
  body.innerHTML = '';
  if (!data.length) { var e=document.getElementById('empty12'); if(e)e.style.display='block'; return; }
  var e=document.getElementById('empty12'); if(e)e.style.display='none';
  data.forEach(function(r){ body.innerHTML += '<tr><td>'+(r.date||'')+'</td><td>'+(r.contract_name||'')+'</td><td>'+(r.party||'')+'</td><td class="amount">'+formatNum(r.amount||0)+'</td><td>'+(r.status||'')+'</td><td>'+(r.note||'')+'</td></tr>'; });
}
function renderBankAccounts() {
  var data = (typeof SERVER_DATA !== 'undefined' ? SERVER_DATA : {}).bankAccounts || DataStore.bankAccounts || [];
  var body = document.getElementById('bankAccountsBody');
  if (!body) return;
  body.innerHTML = '';
  // 自动计算余额（从公司基本户收支）
  var bankFlowData = DataStore.bankFlow || [];
  var calcBalance = 0;
  bankFlowData.forEach(function(r){ calcBalance += (r.income||0) - (r.expense||0); });
  if (!data.length) {
    if (calcBalance !== 0) {
      body.innerHTML += '<tr style="background:#ebf8ff"><td>自动汇总</td><td>—</td><td>—</td><td class="amount" style="font-weight:900;font-size:1.1rem;color:#3182ce">'+formatNum(calcBalance)+'</td><td style="color:#888;font-size:0.7rem">由流水自动计算</td></tr>';
    }
    var e=document.getElementById('empty13'); if(e)e.style.display='none'; return;
  }
  var e=document.getElementById('empty13'); if(e)e.style.display='none';
  data.forEach(function(r){ body.innerHTML += '<tr><td>'+(r.bank_name||'')+'</td><td>'+(r.account_name||'')+'</td><td style="font-family:monospace;font-size:0.75rem">'+(r.account_number||'')+'</td><td class="amount">'+formatNum(r.balance||0)+'</td><td>'+(r.note||'')+'</td></tr>'; });
  // 如果手动输入的余额与自动计算不一致，显示自动计算的参考值
  if (Math.abs(calcBalance) > 0) {
    body.innerHTML += '<tr style="background:#f8f8f8;font-size:0.75rem"><td colspan="3" style="text-align:right;color:#888">流水计算余额：</td><td class="amount" style="font-weight:700;color:'+(calcBalance>=0?'#3182ce':'#e53e3e')+'">'+formatNum(calcBalance)+'</td><td style="color:#888">仅供参考</td></tr>';
  }
}

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
  addChartCanvases();
  try { renderAll(); } catch(e) { console.error(e); }
  // 品牌开场动画 2.5秒后自动消失
  setTimeout(hideSplash, 2500);
  showLoading(true);

  // 从公共API加载数据（无需登录，确保数据最新）
  showLoading(true);
  var pubSections = ['capital','bankFlow','pettyCash','bankAccounts','contracts','companyInfo','receivable','asset','management','salary','baseExpense'];
  var pubLoaded = 0;
  pubSections.forEach(function(s) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (typeof API_BASE !== 'undefined' ? API_BASE : '') + '/api/public/' + s, true);
    xhr.onload = function() {
      try {
        var d = JSON.parse(xhr.responseText) || [];
        if (typeof DataStore !== 'undefined') {
          if (s === 'pettyCash') {
            DataStore.pettyCash = { ren: d.filter(function(x){return x.person==='任海涛';}), pang: d.filter(function(x){return x.person==='庞尚韬';}) };
            DataStore._pettyCashFlat = d;
          } else {
            DataStore[s] = d;
          }
        }
      } catch(e) {}
      pubLoaded++;
      if (pubLoaded === pubSections.length) { try { renderAll(); } catch(e) { console.error(e); } updateSummary(); showLoading(false); setTimeout(animateSummaryNumbers, 400); }
    };
    xhr.onerror = function() { pubLoaded++; if (pubLoaded === pubSections.length) { try { renderAll(); } catch(e) { console.error(e); } updateSummary(); showLoading(false); } };
    xhr.send();
  });    // 加载完成后校验数据
    var _token = localStorage.getItem('wyx_token');
    if (_token && typeof API_BASE !== 'undefined') {
      var vxhr = new XMLHttpRequest();
      vxhr.open('GET', API_BASE + '/api/validate', true);
      vxhr.setRequestHeader("Authorization", "Bearer " + _token);
      vxhr.onload = function() {
        try {
          var vd = JSON.parse(vxhr.responseText);
          if (vd.errors && vd.errors.length > 0) {
            var bar = document.getElementById('valBar');
            var txt = document.getElementById('valText');
            if (bar && txt) {
              var errs = vd.errors.filter(function(e){return e.type==='err'});
              var warns = vd.errors.filter(function(e){return e.type==='warn'});
              var infos = vd.errors.filter(function(e){return e.type==='info'});
              var parts = [];
              if (errs.length) parts.push(errs.length + '个错误');
              if (warns.length) parts.push(warns.length + '个警告');
              if (infos.length) parts.push(infos.length + '条提示');
              txt.textContent = '数据校验：发现 ' + parts.join('，') + '。点击查看详情（点击此条关闭）';
              bar.style.display = 'block';
              bar.title = vd.errors.map(function(e){return '['+e.type+'] '+e.msg}).join('\n');
            }
          }
        } catch(e) {}
      };
      vxhr.send();
    }
});


// 自动定时刷新（保持与后台数据同步）
setInterval(function() {
  var sections = ['capital','bankFlow','pettyCash','receivable','asset','management','salary','baseExpense'];
  var loaded = 0;
  sections.forEach(function(s) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (typeof API_BASE !== 'undefined' ? API_BASE : (window.location.pathname.startsWith('/finance/') ? '/finance' : '')) + '/api/public/' + s, true);
    xhr.onload = function() {
      try {
        var d = JSON.parse(xhr.responseText) || [];
        if (typeof DataStore !== 'undefined' && d.length > 0) {
          if (s === 'pettyCash') {
            DataStore.pettyCash = { ren: d.filter(function(x){return x.person==='任海涛';}), pang: d.filter(function(x){return x.person==='庞尚韬';}) };
            DataStore._pettyCashFlat = d;
          } else {
            DataStore[s] = d;
          }
        }
      } catch(e) {}
      loaded++;
      if (loaded === sections.length) { try { renderAll(); } catch(e) { console.error(e); } }
    };
    xhr.send();
  });
}, 30000); // 每30秒自动刷新

function addChartCanvases() {
  // 图表容器已在HTML中预置，无需动态添加
}

// === 公开数据加载器（按批次显示） ===
(function() {
  var apiBase = typeof API_BASE !== "undefined" ? API_BASE : (window.location.pathname.startsWith("/finance/") ? "/finance" : "");
  function loadPublicData() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiBase + '/api/public/reimburse', true);
    xhr.onload = function() {
      try {
        var data = JSON.parse(xhr.responseText);
        if (!data || !data.length) return;
        if (typeof DataStore !== 'undefined') { DataStore._reimburseFlat = data; }
        ['任海涛','庞尚韬','应红林'].forEach(function(person) {
          var suffix = person === '任海涛' ? 'Ren' : person === '庞尚韬' ? 'Pang' : 'Ying';
          var emptyId = person === '任海涛' ? 'empty5a' : person === '庞尚韬' ? 'empty5b' : 'empty5c';
          var body = document.getElementById('reimburse' + suffix + 'Body');
          if (!body) return;
          var items = data.filter(function(r){return r.person===person;});
          body.innerHTML = '';
          // 按批次号分组
          var batches = {};
          items.forEach(function(r) {
            var b = r.reimburse_date || r.date || '未分组';
            if(!batches[b]) batches[b] = [];
            batches[b].push(r);
          });
          var batchIds = Object.keys(batches).sort();
          batchIds.forEach(function(bid, bi) {
            var grp = batches[bid];
            var batchTotal = grp.reduce(function(s,r){return s+(r.amount||0);},0);
            body.innerHTML += '<tr style="background:#e8f4fd;font-weight:700"><td colspan="5" style="padding:8px 10px;font-size:0.85rem;border-bottom:2px solid #3498db">📅 报销日期 ' + bid + ' · ' + grp.length + '笔 · 合计 ¥' + batchTotal.toFixed(2) + '  [' + (grp[0].payment_method || '未指定') + ']' + '</td></tr>';

            grp.forEach(function(r) {
              var hasDoc = r.docs && (typeof r.docs === "string" || r.docs.length > 0);
              var docFiles = hasDoc ? (typeof r.docs === "string" ? r.docs.split(";") : r.docs) : [];
              var docLink = docFiles.length ? docFiles.map(function(f){return f.trim();}).filter(Boolean).map(function(f){return "<a href=\"/finance/uploads/vouchers/" + f + "\" target=\"_blank\" style=\"color:#D35400;font-weight:700;text-decoration:none;border-bottom:1px dashed #D35400\">📎 " + f + "</a>";}).join(" ") : "—";
              body.innerHTML += '<tr><td>' + (r.date||'') + '</td><td class="amount expense">' + String.fromCharCode(165) + (r.amount||0).toFixed(2) + '</td><td>' + (r.reason||'') + '</td><td>' + String.fromCharCode(8212) + '</td><td>' + docLink + '</td></tr>';
            });
          });
          var allTotal = items.reduce(function(s,r){return s+(r.amount||0);},0);
          body.innerHTML += '<tr style="background:#f5f0e8;font-weight:700"><td>总计</td><td>¥' + allTotal.toFixed(2) + '</td><td colspan="3"></td></tr>';
          var e = document.getElementById(emptyId);
          if (e) e.style.display = 'none';
          if (typeof renderCharts === "function") setTimeout(renderCharts, 300);
        });
      } catch(e) { setTimeout(loadPublicData, 2000); }
    };
    xhr.onerror = function() { setTimeout(loadPublicData, 2000); };
    xhr.send();
  }
  loadPublicData();
})();
