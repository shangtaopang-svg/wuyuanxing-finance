// ===== 五源兴农业 · 财务数据平台 =====

// === 工具函数 ===
function $(id) { return document.getElementById(id); }
function formatNum(n) { return '¥' + Number(n).toLocaleString('zh-CN', {minimumFractionDigits:2}); }
function today() { return new Date().toISOString().slice(0,10); }

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
  data.forEach(function(r) {
    body.innerHTML += '<tr><td>' + r.date + '</td><td><strong>' + r.name + '</strong></td>' +
      '<td class="amount green">' + formatNum(r.amount) + '</td><td>' + r.method + '</td>' +
      '<td>' + (r.voucher ? '<span class="invoice-link" onclick="previewFile(\'' + encodeURIComponent(r.voucher) + '\')">📎 回单</span>' : '—') + '</td></tr>';
  });
}

// ③ 收入
function renderIncome() {
  var data = DataStore.income;
  var body = $('incomeBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty3').style.display = 'block'; return; }
  $('empty3').style.display = 'none';
  data.forEach(function(r) {
    body.innerHTML += '<tr><td>' + r.date + '</td><td>' + r.category + '</td><td class="amount green">' + formatNum(r.amount) + '</td>' +
      '<td>' + (r.source || '—') + '</td><td>' + (r.voucher ? '<span class="invoice-link">📎 凭证</span>' : '—') + '</td></tr>';
  });
}

// ④ 备用金
function renderPettyCash() {
  ['ren','pang'].forEach(function(person) {
    var data = DataStore.pettyCash[person];
    var bodyId = person === 'ren' ? 'pettyRenBody' : 'pettyPangBody';
    var emptyId = person === 'ren' ? 'empty4a' : 'empty4b';
    var body = $(bodyId);
    body.innerHTML = '';
    if (data.length === 0) { $(emptyId).style.display = 'block'; return; }
    $(emptyId).style.display = 'none';
    data.forEach(function(r) {
      body.innerHTML += '<tr><td>' + r.date + '</td><td>' + r.type + '</td><td class="amount">' + formatNum(r.amount) + '</td>' +
        '<td>' + r.summary + '</td><td>' + (r.voucher ? '<span class="invoice-link">📎</span>' : '—') + '</td></tr>';
    });
  });
}

// ⑤ 报销
function renderReimburse() {
  ['ren','pang','ying'].forEach(function(person) {
    var data = DataStore.reimburse[person];
    var names = {ren:'RenBody', pang:'PangBody', ying:'YingBody'};
    var emptyIds = {ren:'empty5a', pang:'empty5b', ying:'empty5c'};
    var bodyId = 'reimburse' + names[person];
    var body = $(bodyId);
    body.innerHTML = '';
    var personName = person === 'ren' ? '任海涛' : (person === 'pang' ? '庞尚韬' : '应红林');
    if (!data || data.length === 0) { $(emptyIds[person]).style.display = 'block'; return; }
    $(emptyIds[person]).style.display = 'none';
    data.forEach(function(r) {
      body.innerHTML += '<tr><td>' + r.date + '</td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + r.reason + '</td><td>' +
        (r.docs && r.docs.length ? r.docs.map(function(f) { return '<a href="#" class="invoice-link" onclick="previewFile(\'' + encodeURIComponent(f) + '\')">📎 单据</a>'; }).join('') : '—') + '</td></tr>';
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
    body.innerHTML += '<tr><td>' + r.date + '</td><td><strong>' + r.name + '</strong></td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + r.location + '</td><td>' + r.status + '</td></tr>';
  });
}

// ⑧ 管理费用
function renderManagement() {
  var data = DataStore.management;
  var body = $('managementBody');
  body.innerHTML = '';
  if (data.length === 0) { $('empty8').style.display = 'block'; return; }
  $('empty8').style.display = 'none';
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
    body.innerHTML = '';
    if (!data || data.length === 0) { $(emptyIds[base]).style.display = 'block'; return; }
    $(emptyIds[base]).style.display = 'none';
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

  $('totalIncome').textContent = formatNum(totalIncome);
  $('totalExpense').textContent = formatNum(totalExpense);
  $('totalCapital').textContent = formatNum(totalCapital);
  $('totalReceivable').textContent = formatNum(totalReceivable);
}

// === 图表 ===
var charts = {};

function renderCharts() {
  var active = document.querySelector('.tab-panel.active');
  if (!active) return;
  var id = active.id;
  if (id === 'tab1') {
    renderChart1();
    renderChart1b();
  }
  // 可以按需为每个tab添加图表
}

function renderChart1() {
  var ctx = document.getElementById('chart1');
  if (!ctx) return;
  if (charts.chart1) charts.chart1.destroy();
  var data = DataStore.incomeExpense;
  var labels = data.map(function(r) { return r.date.slice(5); });
  var incomes = data.map(function(r) { return r.income || 0; });
  var expenses = data.map(function(r) { return r.expense || 0; });
  charts.chart1 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: '收入', data: incomes, backgroundColor: '#27ae60', borderColor: '#000', borderWidth: 2 },
        { label: '支出', data: expenses, backgroundColor: '#c0392b', borderColor: '#000', borderWidth: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11, weight: 'bold' } } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { ticks: { callback: function(v) { return '¥' + (v/1000).toFixed(0) + 'k'; }, font: { size: 10 } } }
      }
    }
  });
}

function renderChart1b() {
  var ctx = document.getElementById('chart1b');
  if (!ctx) return;
  if (charts.chart1b) charts.chart1b.destroy();
  var data = DataStore.incomeExpense;
  var expenseByType = {};
  data.forEach(function(r) {
    if (r.expense > 0) {
      if (!expenseByType[r.summary]) expenseByType[r.summary] = 0;
      expenseByType[r.summary] += r.expense;
    }
  });
  var labels = Object.keys(expenseByType);
  var values = labels.map(function(k) { return expenseByType[k]; });
  var colors = ['#D35400','#2b6cb0','#38a169','#d69e2e','#9f7aea','#e53e3e'];
  charts.chart1b = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderColor: '#000', borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10, weight: 'bold' }, boxWidth: 12 } } }
    }
  });
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
function renderAll() {
  renderIncomeExpense();
  renderCapital();
  renderIncome();
  renderPettyCash();
  renderReimburse();
  renderReceivable();
  renderAsset();
  renderManagement();
  renderSalary();
  renderBaseExpense();
  updateSummary();
  renderCharts();
}

// === 全局搜索 ===
function globalSearch(keyword) {
  keyword = keyword.toLowerCase().trim();
  document.querySelectorAll('.tab-panel').forEach(function(panel) {
    var rows = panel.querySelectorAll('.data-table tbody tr');
    if (!keyword) { rows.forEach(function(r) { r.style.display = ''; }); return; }
    rows.forEach(function(r) {
      var text = r.textContent.toLowerCase();
      r.style.display = text.indexOf(keyword) !== -1 ? '' : 'none';
    });
  });
}

// Chart.js 加载完成后初始化
// 页面加载时执行
document.addEventListener('DOMContentLoaded', function() {
  // 添加图表canvas
  addChartCanvases();
  renderAll();
});

function addChartCanvases() {
  // 为tab1添加图表
  var tab1 = $('tab1');
  var chartHtml = '<div class="chart-row"><div class="chart-card"><h4>📊 月度收支趋势</h4><div class="chart-box"><canvas id="chart1"></canvas></div></div>' +
    '<div class="chart-card"><h4>🧩 支出分类占比</h4><div class="chart-box"><canvas id="chart1b"></canvas></div></div></div>';
  tab1.insertAdjacentHTML('afterbegin', chartHtml);

  // 其他tab的图表可以类似添加
}
