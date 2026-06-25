// ===== 五源兴农业 · 财务数据平台 =====

// === 工具函数 ===
function $(id) { return document.getElementById(id); }
function formatNum(n) { var v = Number(n); if (isNaN(v)) return '¥0.00'; return '¥' + v.toLocaleString('zh-CN', {minimumFractionDigits:2}); }

// 饼图中心文字插件
if (typeof Chart !== 'undefined') {
  Chart.register({
    id: 'centerText',
    beforeDraw: function(chart) {
      var opts = chart.options.plugins.centerText;
      if (!opts || !opts.text) return;
      if (chart.config.type !== 'doughnut') return;
      var ctx = chart.ctx;
      var w = chart.width, h = chart.height;
      ctx.save();
      var cx = w / 2, cy = h / 2 - 6;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px "Courier New",monospace';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(opts.text, cx, cy - 4);
      if (opts.sub) {
        ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText(opts.sub, cx, cy + 18);
      }
      ctx.restore();
    }
  });
}
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
var TAB_SECTION_MAP = { tab2:'capital', tab14:'bankFlow', tab4:'pettyDraw', tab5:'reimburse', tab6:'receivable', tab7:'asset', tab8:'management', tab9:'salary', tab10:'baseExpense', tab11:'companyInfo', tab12:'contracts', tab13:"bankAccounts",
  tab15:"farmerLedger" };
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
    window.frontSection = TAB_SECTION_MAP[btn.dataset.tab] || 'capital';
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
  var sub = $(btn.dataset.sub);
  if (sub) sub.classList.add('active');
  // 基地支出明细表切换
  if (btn.closest('#tab10')) renderBaseExpense();
});

// === 直接从服务器加载真实数据（简化版） ===
var API_BASE = window.location.pathname.startsWith('/finance/') ? '/finance' : '';
var SERVER_DATA = {};

function fetchAllServerData(callback) {
  var token = localStorage.getItem('wyx_token');
  if (!token) { if (callback) callback(); return; }

  var sections = ['incomeExpense','capital','income','pettyDraw','pettyWrite','pettyCash','reimburse','receivable','asset','management','salary','baseExpense','companyInfo','contracts','bankAccounts'];
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

// ④ 备用金 - 每人分领用/核销两张表
function renderPettyCash() {
  var allDraw = (typeof SERVER_DATA !== 'undefined' && SERVER_DATA.pettyDraw) || DataStore.pettyDraw || [];
  var allWrite = (typeof SERVER_DATA !== 'undefined' && SERVER_DATA.pettyWrite) || DataStore.pettyWrite || [];

  // === 领用/核销汇总表 ===
  var summaryBody = $('pettySummaryBody');
  if (summaryBody) {
    summaryBody.innerHTML = '';
    var persons = [{key:'ren',name:'任海涛'},{key:'pang',name:'庞尚韬'}];
    var gd=0,gw=0;
    persons.forEach(function(p){
      var draws=allDraw.filter(function(r){return r.person===p.name;});
      var writes=allWrite.filter(function(r){return r.person===p.name;});
      var dt=draws.reduce(function(s,r){return s+Number(r.amount||0);},0);
      var wt=writes.reduce(function(s,r){return s+Number(r.amount||0);},0);
      gd+=dt;gw+=wt;
      var allDt=draws.concat(writes).map(function(r){return r.date;}).filter(Boolean).sort();
      var bd='—';
      if(p.name==='任海涛') bd='2026-06-11';
      else if(allDt.length>0) bd=allDt[allDt.length-1].slice(0,10);
      summaryBody.innerHTML+='<tr><td><strong>'+p.name+'</strong></td><td style="color:#D35400;font-weight:700">'+formatNum(dt)+'</td><td style="color:#27ae60;font-weight:700">'+formatNum(wt)+'</td><td style="color:'+(dt>=wt?'#e53e3e':'#3182ce')+';font-weight:700">'+formatNum(Math.abs(dt-wt))+'</td><td>'+bd+'</td></tr>';
    });
    summaryBody.innerHTML+='<tr style="background:var(--bg);font-weight:800"><td>合计</td><td>'+formatNum(gd)+'</td><td>'+formatNum(gw)+'</td><td>'+formatNum(gd-gw)+'</td><td></td></tr>';
  }

  // === 明细表 ===
  ['ren','pang'].forEach(function(person) {
    var personName = person === 'ren' ? '任海涛' : '庞尚韬';
    var draws = allDraw.filter(function(r){return r.person===personName;});
    var writes = allWrite.filter(function(r){return r.person===personName;});
    var drawTotal = draws.reduce(function(s,r){return s+Number(r.amount||0);},0);
    var writeTotal = writes.reduce(function(s,r){return s+Number(r.amount||0);},0);
    // 领用表
    var drawBody = $(person === 'ren' ? 'pettyRenDrawBody' : 'pettyPangDrawBody');
    var drawEmpty = $(person === 'ren' ? 'empty4a-draw' : 'empty4b-draw');
    drawBody.innerHTML = '';
    if (draws.length === 0) { drawEmpty.style.display = 'block'; } else {
      drawEmpty.style.display = 'none';
      draws.forEach(function(r) {
        drawBody.innerHTML += '<tr><td>' + (r.date||'') + '</td><td style="color:#D35400;font-weight:600">' + formatNum(r.amount) + '</td>' +
          '<td>' + (r.account||'') + '</td><td>' + (r.summary||'') + '</td></tr>';
      });
      drawBody.innerHTML += '<tr style="background:var(--bg);font-weight:700"><td>合计</td><td style="color:#D35400">' + formatNum(drawTotal) + '</td><td></td><td></td></tr>';
    }
    // 核销表
    var writeBody = $(person === 'ren' ? 'pettyRenWriteBody' : 'pettyPangWriteBody');
    var writeEmpty = $(person === 'ren' ? 'empty4a-write' : 'empty4b-write');
    writeBody.innerHTML = '';
    if (writes.length === 0) { writeEmpty.style.display = 'block'; } else {
      writeEmpty.style.display = 'none';
      writes.forEach(function(r) {
        var noR = r.voucher === '无票据';
        writeBody.innerHTML += '<tr style="background:' + (noR?'#fff8f0':'') + '"><td>' + (r.date||'') + '</td><td style="color:#27ae60;font-weight:600">' + formatNum(r.amount) + '</td>' +
          '<td>' + (r.summary||'') + '</td><td>' + (noR?'<span style="color:#e53e3e;font-size:0.7rem">⚠️ 无票据</span>':(r.voucher||'')) + '</td></tr>';
      });
      writeBody.innerHTML += '<tr style="background:var(--bg);font-weight:700"><td>合计</td><td style="color:#27ae60">' + formatNum(writeTotal) + '</td><td></td><td></td></tr>';
    }
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
  data.forEach(function(r, i) {
    body.innerHTML += '<tr><td>' + (i+1) + '</td><td>' + r.party + '</td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + r.reason + '</td><td>' + r.status + '</td></tr>';
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
  var data = DataStore.salary || [];
  var regular = data.filter(function(r){ return r.name === '任海涛' || r.name === '庞尚韬' || (r.name === '施前华' && r.position !== '临时工'); });
  var temp = data.filter(function(r){ return r.name === '施前华' && r.position === '临时工'; });

  // === 正式员工：交叉表（姓名×月份） ===
  var rb = $('salaryRegularBody');
  var rh = $('salaryRegularHeader');
  if (rb && rh) {
    // 收集月份
    var months = [];
    var monthSet = {};
    regular.forEach(function(r){
      var m = r.month || '';
      if (m && !monthSet[m]) { monthSet[m] = true; months.push(m); }
    });
    months.sort();

    // 收集员工
    var employees = [];
    var empSet = {};
    regular.forEach(function(r){
      var key = r.name + '|' + r.position;
      if (!empSet[key]) { empSet[key] = true; employees.push({name: r.name, position: r.position}); }
    });

    // 构建查询表: name|month -> {amount, payDate}
    var lookup = {};
    regular.forEach(function(r){
      lookup[r.name + '|' + (r.month||'')] = {amount: r.amount, payDate: r.pay_date || ''};
    });

    // 表头（金额+发放日期双列）
    var headerHtml = '<th style="width:90px">姓名（岗位）</th>';
    months.forEach(function(m){
      headerHtml += '<th style="min-width:55px;text-align:center;border-right:1px solid #e8e5e0">' + m.replace('-', '/') + '<br><span style="font-weight:400;font-size:0.6rem">金额</span></th>';
      headerHtml += '<th style="min-width:65px;text-align:center;font-weight:400;font-size:0.6rem">发放日期</th>';
    });
    headerHtml += '<th style="width:60px;text-align:center">合计</th>';
    rh.innerHTML = headerHtml;

    // 表体
    var bodyHtml = '';
    employees.forEach(function(emp){
      var total = 0;
      var row = '<td><strong>' + emp.name + '</strong><br><span style="font-size:0.6rem;color:#999">' + emp.position + '</span></td>';
      months.forEach(function(m){
        var info = lookup[emp.name + '|' + m] || {amount: 0, payDate: ''};
        total += info.amount;
        row += '<td class="amount" style="text-align:center;font-size:0.75rem;border-right:1px solid #f0ede8">' + (info.amount > 0 ? '¥' + info.amount.toLocaleString() : '—') + '</td>';
        row += '<td style="text-align:center;font-size:0.65rem;color:#888">' + (info.payDate || '—') + '</td>';
      });
      row += '<td class="amount" style="text-align:center;font-weight:700;color:#2d5a27;font-size:0.8rem">¥' + total.toLocaleString() + '</td>';
      bodyHtml += '<tr>' + row + '</tr>';
    });
    rb.innerHTML = bodyHtml || '<tr><td colspan="' + (months.length*2+2) + '" style="text-align:center;color:#999;padding:20px">暂无数据</td></tr>';
  }

  // 临时工
  var tb = $('salaryTempBody');
  if (tb) {
    tb.innerHTML = '';
    if (temp.length) {
      temp.forEach(function(r) {
        tb.innerHTML += '<tr><td>' + (r.month||'') + '</td><td>' + (r.name||'') + '</td><td>' + (r.position||'') + '</td><td class="amount expense">' + formatNum(r.amount) + '</td><td>' + (r.payDate||'') + '</td><td>' +
          (r.voucher ? '<span class="invoice-link">📎</span>' : '—') + '</td></tr>';
      });
    } else {
      tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">暂无数据</td></tr>';
    }
  }

  var empty = $('empty9');
  if (empty) empty.style.display = (!regular.length && !temp.length) ? 'block' : 'none';

  // 月份卡片
  renderTempMonthCards();
}


function renderTempMonthCards() {
  var workers = DataStore.tempWorkers || [];
  var labor = DataStore.tempLabor || [];
  var container = $("tempMonthCards");
  if (!container) return;
  var md = {};
  workers.forEach(function(r){ var m = r.month||""; if(!md[m]) md[m]={w:[],l:[]}; md[m].w.push(r); });
  labor.forEach(function(r){ var m=(r.month||r.date||"").substring(0,7); if(!md[m]) md[m]={w:[],l:[]}; md[m].l.push(r); });
  var keys = Object.keys(md).sort();
  if (!keys.length) { container.innerHTML="<div style=\"text-align:center;padding:40px;color:#999\">\u6682\u65e0\u6570\u636e</div>"; return; }
  var tabs = [];
  if (md["2026-03"] && md["2026-04"]) {
    tabs.push({label:"2026\u5e744\u6708", d:{w:md["2026-03"].w.concat(md["2026-04"].w), l:md["2026-03"].l.concat(md["2026-04"].l)}});
    keys = keys.filter(function(k){ return k!=="2026-03"&&k!=="2026-04"; });
  }
  keys.forEach(function(k){ tabs.push({label:k.replace("-","\u5e74")+"\u6708", d:md[k]}); });
  var h = "<div style=\"display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;border-bottom:2px solid #e8e5e0;padding-bottom:4px;\">";
  tabs.forEach(function(t,i){ h += "<button class=\"cat-tab\" onclick=\"switchTempTab("+i+")\""+(i===0?" style=\"background:#b8860b;color:#fff;border-color:#b8860b\"":"")+">"+t.label+"</button>"; });
  h += "</div><div id=\"tempTabContent\">"+buildTabContent(tabs[0].d,tabs[0].label)+"</div>";
  container.innerHTML = h;
  container._tabs = tabs;
}
function switchTempTab(idx) {
  var c = $("tempMonthCards"); var tabs = c._tabs; if(!tabs||!tabs[idx]) return;
  c.querySelectorAll("button").forEach(function(b,i){ if(i===idx){ b.style.background="#b8860b"; b.style.color="#fff"; b.style.borderColor="#b8860b"; } else { b.style.background=""; b.style.color=""; b.style.borderColor=""; }});
  $("tempTabContent").innerHTML = buildTabContent(tabs[idx].d, tabs[idx].label);
}
function buildTabContent(d, label) {
  var w = d.w || [], l = d.l || [];
  var total = 0, wm = {};
  w.forEach(function(r){ total += r.amount||0; if(!wm[r.name]) wm[r.name]={name:r.name,card:r.id_card||"",total:0}; wm[r.name].total += r.amount||0; });
  var wk = Object.keys(wm);
  var wr = wk.map(function(k,i){ var p=wm[k]; return "<tr><td>"+(i+1)+"</td><td>"+p.name+"</td><td style=\"font-family:monospace;font-size:0.6rem\">"+p.card+"</td><td class=\"amount\" style=\"text-align:center\">"+formatNum(p.total)+"</td></tr>"; }).join("");
  // 收集备注
  var notes = []; w.forEach(function(r){ if(r.notes && notes.indexOf(r.notes)<0) notes.push(r.notes); });
  var la = 0; l.forEach(function(r){ la += r.amount||0; });
  var lr = l.length ? l.map(function(r){ var n=r.notes||""; if(n.indexOf("5.22\u53d1\u653e")>=0){n="<span style=\"display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.6rem;font-weight:600;background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7\">\u2705 "+n+"</span>";} else if(n.indexOf("6.19\u652f\u4ed8")>=0){n="<span style=\"display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.6rem;font-weight:600;background:#e3f2fd;color:#1565c0;border:1px solid #90caf9\">\u{1f4b3} "+n+"</span>";} return "<tr><td>"+(r.date||"")+"</td><td>"+(r.headcount||"")+"</td><td>"+(r.work_content||"")+"</td><td class=\"amount\">"+formatNum(r.amount)+"</td><td>"+n+"</td></tr>"; }).join("") : "<tr><td colspan=\"5\" style=\"text-align:center;color:#999;padding:20px\">\u6682\u65e0\u8bb0\u5f55</td></tr>";
  return "<div style=\"border:1px solid #b8860b;border-radius:8px;overflow:hidden;background:#fefcf5\">" +
    "<div style=\"background:#b8860b;color:#fff;padding:6px 12px;font-size:0.78rem;font-weight:600\">\u{1f4c5} "+label+"</div>" +
    "<div style=\"padding:8px 10px 4px\">" +
      "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:4px\"><span style=\"font-size:0.72rem;font-weight:600;color:#b8860b\">\u{1f4c4} \u5de5\u8d44\u5355\uff08\u8d22\u52a1\u6570\u636e\uff09</span><span style=\"font-size:0.78rem;font-weight:700;color:#b8860b\">"+wk.length+"\u4eba \u00b7 \u5408\u8ba1"+formatNum(total)+"</span></div>" +
      (notes.length?"<div style=\"margin-bottom:6px;padding:8px 10px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;font-size:0.78rem;font-weight:700;color:#856404\">\u{1f4dd} "+notes.join("<br>")+"</div>":"")+
      "<div style=\"overflow-x:auto;max-height:300px;overflow-y:auto;border:1px solid #e8e5e0;border-radius:6px\"><table class=\"data-table\" style=\"font-size:0.68rem;min-width:450px\"><thead><tr><th style=\"width:35px\">\u5e8f\u53f7</th><th>\u59d3\u540d</th><th>\u8eab\u4efd\u8bc1\u53f7\u7801</th><th style=\"width:80px\">\u91d1\u989d</th></tr></thead><tbody>"+wr+"</tbody></table></div>" +
    "</div>" +
    "<div style=\"padding:8px 10px 10px\">" +
      "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:4px\"><span style=\"font-size:0.72rem;font-weight:600;color:#b8860b\">\u{1f4cb} \u52b3\u52a1\u6e05\u5355</span><span style=\"font-size:0.78rem;font-weight:700;color:#b8860b\">\u5408\u8ba1"+formatNum(la)+"</span></div>" +
      "<div style=\"overflow-x:auto;max-height:200px;overflow-y:auto;border:1px solid #e8e5e0;border-radius:6px\"><table class=\"data-table\" style=\"font-size:0.68rem;min-width:450px\"><thead><tr><th>\u65e5\u671f</th><th>\u4eba\u6570</th><th>\u5de5\u4f5c\u5185\u5bb9</th><th>\u91d1\u989d</th><th>\u5907\u6ce8</th></tr></thead><tbody>"+lr+"</tbody></table></div>" +
    "</div></div>";
}

function showFullModal(cid, title) {
  var el = document.getElementById(cid);
  if (!el) return;
  var modal = document.getElementById('fullTableModal');
  if (!modal) return;
  document.getElementById('fullTableTitle').textContent = title || '查看';
  document.getElementById('fullTableBody').innerHTML = el.innerHTML;
  modal.style.display = 'block';
}
function closeFullModal() {
  var modal = document.getElementById('fullTableModal');
  if (modal) modal.style.display = 'none';
}
// 基地全屏查看
function openBaseFull(base, color, total, itemsJson) {
  var items = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
  var modal = document.getElementById('baseFullModal');
  var overlay = document.getElementById('baseFullOverlay');
  var title = document.getElementById('baseFullTitle');
  var body = document.getElementById('baseFullBody');
  if (!modal || !body) return;
  title.textContent = '🌿 ' + base + ' · ' + formatNum(total);

  // Build categories from items
  var cats = ['土地流转','土地处理','种苗采购','种苗运输','化肥农药','人工费用','其他'];
  var catColors = {'土地流转':'#8B4513','土地处理':'#D2691E','种苗采购':'#27ae60','种苗运输':'#2ecc71','化肥农药':'#f39c12','人工费用':'#e74c3c','其他':'#95a5a6'};
  var catTotals = {};
  cats.forEach(function(c){ catTotals[c] = 0; });
  items.forEach(function(r){ var cat=r.category||'其他'; if(catTotals[cat]!==undefined) catTotals[cat]+=r.amount||0; });

  var catRows = cats.filter(function(c){return catTotals[c]>0;}).map(function(c){
    return '<tr><td style="padding:6px 12px;font-size:0.8rem;border-bottom:1px solid #f0ede8"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+(catColors[c]||'#95a5a6')+';margin-right:8px"></span>'+c+'</td><td class="amount" style="padding:6px 12px;font-size:0.85rem;text-align:right;border-bottom:1px solid #f0ede8">'+formatNum(catTotals[c])+'</td><td style="padding:6px 12px;font-size:0.75rem;text-align:center;color:#888;border-bottom:1px solid #f0ede8">'+(total>0?(catTotals[c]/total*100).toFixed(1)+'%':'')+'</td></tr>';
  }).join('');

  var cats = ['土地流转','土地处理','种苗采购','种苗运输','化肥农药','人工费用','其他'];
  var sortedI = items.slice().sort(function(a,b){ var ai=cats.indexOf(a.category||'其他'),bi=cats.indexOf(b.category||'其他'); return ai-bi || ((a.date||'')>(b.date||'')?1:-1); });
  var detailRows = '', lastCat2 = '', catTotal2 = 0, catStarted = true;
  sortedI.forEach(function(r, idx){
    var cat = r.category||'其他';
    if (cat !== lastCat2 && !catStarted) {
      detailRows += '<tr style="border-top:2px solid #e8e5e0;background:#fff3cd"><td colspan="5" style="padding:4px 8px;font-size:0.75rem;font-weight:700;color:#856404;text-align:right">小计 ('+lastCat2+')</td><td style="padding:4px 8px;font-size:0.8rem;font-weight:700;color:#856404;text-align:center">'+formatNum(catTotal2)+'</td></tr>';
      catTotal2 = 0;
    }
    catStarted = false;
    catTotal2 += r.amount||0; lastCat2 = cat;
    var inv = r.invoices; var invHtml = '—'; if(inv && inv.length){try{var f=typeof inv==='string'?JSON.parse(inv):inv;if(f.length)invHtml=f.map(function(x){return '<span class="invoice-link" onclick="previewFile(\''+encodeURIComponent(x)+'\')">📎</span>';}).join('');}catch(e){}}
    var catBg = catColors[r.category]||'#666';
    detailRows += '<tr'+(idx%2===0?' style="background:#fafafa"':'')+'><td style="padding:3px 8px;font-size:0.7rem;font-weight:700;color:#fff;background:'+catBg+'88;border-radius:4px">'+(r.category||'')+'</td><td style="padding:5px 8px;font-size:0.72rem">'+(r.date||'')+'</td><td style="padding:5px 8px;font-size:0.72rem">'+(r.item||'')+'</td><td class="amount" style="padding:5px 8px;font-size:0.75rem;text-align:right">'+formatNum(r.amount)+'</td><td style="padding:5px 8px;font-size:0.65rem;color:#888">'+(r.note||'')+'</td><td style="padding:5px 8px;text-align:center">'+invHtml+'</td></tr>';
    if (idx === sortedI.length - 1) {
      detailRows += '<tr style="border-top:2px solid #e8e5e0;background:#fff3cd"><td colspan="5" style="padding:4px 8px;font-size:0.75rem;font-weight:700;color:#856404;text-align:right">小计 ('+cat+')</td><td style="padding:4px 8px;font-size:0.8rem;font-weight:700;color:#856404;text-align:center">'+formatNum(catTotal2)+'</td></tr>';
    }
  });

  body.innerHTML = '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:24px">' +
    '<div style="flex:1;min-width:250px;height:250px"><canvas id="baseFullChart"></canvas></div>' +
    '<div style="flex:1;min-width:250px"><h4 style="font-size:0.85rem;color:'+color+';margin:0 0 8px">📊 成本构成</h4>' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr style="border-bottom:2px solid '+color+'"><th style="padding:6px 12px;font-size:0.75rem;color:'+color+';text-align:left">类别</th><th style="padding:6px 12px;font-size:0.75rem;color:'+color+';text-align:right">金额</th><th style="padding:6px 12px;font-size:0.75rem;color:'+color+';text-align:center">占比</th></tr></thead>' +
        '<tbody>' + catRows + '<tr style="font-weight:700;background:'+color+'22"><td style="padding:6px 12px;font-size:0.8rem">合计</td><td class="amount" style="padding:6px 12px;font-size:0.85rem;text-align:right">'+formatNum(total)+'</td><td style="padding:6px 12px;font-size:0.8rem;text-align:center">100%</td></tr></tbody>' +
      '</table>' +
    '</div></div>' +
    '<h4 style="font-size:0.85rem;color:'+color+';margin:0 0 8px">📋 支出明细</h4>' +
    '<div style="overflow-x:auto"><table class="data-table" style="font-size:0.72rem;min-width:550px"><thead><tr><th>类别</th><th>日期</th><th>项目</th><th>金额</th><th>说明</th><th>票据</th></tr></thead><tbody>' + detailRows + '</tbody></table></div>';

  modal.style.display = 'block';
  overlay.style.display = 'block';

  // Render chart
  setTimeout(function(){
    var actCats = Object.keys(catTotals).filter(function(c){ return catTotals[c] > 0; });
    if (!actCats.length) return;
    var chart = charts['baseFullChart'];
    if (chart) chart.destroy();
    makeChart('baseFullChart', 'doughnut', actCats.map(function(c){ return c; }), [
      { data: actCats.map(function(c){ return catTotals[c]; }), backgroundColor: actCats.map(function(c){ return catColors[c]||'#95a5a6'; }), borderColor: '#fff', borderWidth: 3 }
    ]);
  }, 100);
}
function openAgentFull(data, total) {
  var modal = document.getElementById('baseFullModal');
  var overlay = document.getElementById('baseFullOverlay');
  var title = document.getElementById('baseFullTitle');
  var body = document.getElementById('baseFullBody');
  if (!modal || !body) return;
  title.textContent = '👤 杨德彪经手账单 · ' + formatNum(total);
  var rows = data.map(function(r, idx){
    return '<tr'+(idx%2===0?' style="background:#fafafa"':'')+'><td style="padding:4px 8px;font-size:0.7rem">'+(r.item||'')+'</td><td style="padding:4px 8px;font-size:0.68rem">'+(r.quantity||'')+'</td><td style="padding:4px 8px;font-size:0.68rem">¥'+(r.unit_price||0).toFixed(2)+'</td><td class="amount" style="padding:4px 8px;font-size:0.72rem;text-align:right">'+(r.amount?formatNum(r.amount):'—')+'</td><td class="amount" style="padding:4px 8px;font-size:0.72rem;text-align:right;font-weight:700;color:#8e44ad">'+(r.subtotal?formatNum(r.subtotal):'—')+'</td><td style="padding:4px 8px;font-size:0.6rem;color:#888">'+(r.notes||'')+'</td></tr>';
  }).join('');
  body.innerHTML = '<h4 style="font-size:0.9rem;color:#8e44ad;margin:0 0 12px">👤 杨德彪经手账单 · 合计'+formatNum(total)+'</h4>' +
    '<div style="overflow-x:auto"><table class="data-table" style="font-size:0.7rem;min-width:500px"><thead><tr><th>项目</th><th>数量(kg)</th><th>单价</th><th>金额</th><th>小计</th><th>备注</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  modal.style.display = 'block';
  overlay.style.display = 'block';
}
function closeBaseFull() {
  document.getElementById('baseFullModal').style.display = 'none';
  document.getElementById('baseFullOverlay').style.display = 'none';
}
function renderBaseExpense() {
  var allData = DataStore.baseExpense || [];
  var baseNames = ['金银花基地','党参基地','党参育苗基地'];
  var baseScales = {'金银花基地':'规模（流转）101.4亩','党参基地':'','党参育苗基地':''};
  var categories = ['土地流转','土地处理','种苗采购','种苗运输','化肥农药','人工费用','其他'];
  var catColors = {'土地流转':'#8B4513','土地处理':'#D2691E','种苗采购':'#27ae60','种苗运输':'#2ecc71','化肥农药':'#f39c12','人工费用':'#e74c3c','其他':'#95a5a6'};
  var coverColors = ['#27ae60','#3498db','#e67e22'];
  var emojis = ['🌿','🌱','🌰'];

  var container = $('baseCards');
  var emptyEl = $('empty10');
  if (!container) return;
  if (!allData.length) { container.innerHTML = ''; if(emptyEl) emptyEl.style.display='block'; return; }
  if(emptyEl) emptyEl.style.display='none';

  var baseMap = {};
  baseNames.forEach(function(b){ baseMap[b]=[]; });
  allData.forEach(function(r){ var n=r.base||''; if(baseMap[n]) baseMap[n].push(r); });

  var html = '';
  baseNames.forEach(function(base, bi){
    var items = baseMap[base] || [];
    var cc = coverColors[bi % 3];
    var total = items.reduce(function(s,r){return s+(r.amount||0);},0);
    var catTotals = {};
    categories.forEach(function(c){ catTotals[c]=0; });
    items.forEach(function(r){ var cat=r.category||'其他'; if(catTotals[cat]!==undefined) catTotals[cat]+=r.amount||0; });

    // Cover content
    var coverHtml = '<div class="cover" style="background:linear-gradient(135deg,'+cc+','+cc+'cc);color:#fff">' +
      '<div style="font-size:2rem;margin-bottom:6px">'+emojis[bi]+'</div>' +
      '<div style="font-size:0.9rem;font-weight:700">'+base+'</div>' +
      (baseScales[base]?'<div style="font-size:0.55rem;opacity:0.8;margin-top:2px;background:rgba(255,255,255,0.15);padding:1px 8px;border-radius:4px;display:inline-block">'+baseScales[base]+'</div>':'') +
      '<div style="font-size:0.6rem;opacity:0.7;margin-top:2px">'+items.length+'笔支出</div>' +
      '<div style="font-size:1.2rem;font-weight:800;margin-top:6px;letter-spacing:1px">'+formatNum(total)+'</div>' +
      '<div style="font-size:0.55rem;opacity:0.6;margin-top:10px;border-top:1px solid rgba(255,255,255,0.2);padding-top:6px;width:80%">hover 查看详情 →</div>' +
    '</div>';

    // Detail content
    var catRows = categories.filter(function(c){return catTotals[c]>0;}).map(function(c){
      return '<tr><td style="padding:2px 6px;font-size:0.6rem;color:'+cc+'">'+c+'</td><td class="amount" style="text-align:right;padding:2px 8px;font-size:0.65rem">'+formatNum(catTotals[c])+'</td><td style="text-align:center;font-size:0.55rem;color:#888">'+(total>0?(catTotals[c]/total*100).toFixed(1)+'%':'')+'</td></tr>';
    }).join('');
    catRows += '<tr style="background:rgba(255,255,255,0.05);font-weight:700"><td style="padding:2px 6px;font-size:0.6rem;color:#fff">合计</td><td class="amount" style="text-align:right;padding:2px 8px;font-size:0.7rem;color:#fff">'+formatNum(total)+'</td><td style="text-align:center;font-size:0.6rem;color:#fff">100%</td></tr>';

    var sorted = items.slice().sort(function(a,b){ var ai=categories.indexOf(a.category||'其他'),bi=categories.indexOf(b.category||'其他'); return ai-bi || ((a.date||'')>(b.date||'')?1:-1); });
    var detailRows = '';
    if (sorted.length) {
      var lastCat = '', catTotal = 0, catStart = true;
      sorted.forEach(function(r, idx){
        var cat = r.category||'其他';
        if (cat !== lastCat && !catStart) {
          // Subtotal for previous category
          detailRows += '<tr style="border-top:1px dashed rgba(255,255,255,0.15);background:rgba(255,255,255,0.06)"><td colspan="5" style="padding:3px 8px;font-size:0.6rem;font-weight:700;color:'+cc+';text-align:right">小计 ('+lastCat+')</td><td style="padding:3px 8px;font-size:0.65rem;font-weight:700;color:#fff;text-align:center">'+formatNum(catTotal)+'</td></tr>';
          catTotal = 0;
        }
        catStart = false;
        catTotal += r.amount||0;
        lastCat = cat;
        var inv = r.invoices; var invHtml = '—'; if(inv && inv.length){try{var f=typeof inv==='string'?JSON.parse(inv):inv;if(f.length)invHtml=f.map(function(x){return '<span class="invoice-link" onclick="previewFile(\''+encodeURIComponent(x)+'\')">📎</span>';}).join('');}catch(e){}}
        var catStyle = 'padding:2px 6px;font-size:0.55rem;font-weight:700;color:#fff;background:'+cc+'88;border-radius:3px';
        detailRows += '<tr><td style="'+catStyle+'">'+(r.category||'')+'</td><td style="padding:2px 6px;font-size:0.58rem">'+(r.date||'')+'</td><td style="padding:2px 6px;font-size:0.58rem">'+(r.item||'')+'</td><td class="amount" style="text-align:right;padding:2px 8px;font-size:0.6rem">'+formatNum(r.amount)+'</td><td style="padding:2px 6px;font-size:0.5rem;color:#888">'+(r.note||'')+'</td><td style="padding:2px 4px;font-size:0.5rem;text-align:center">'+invHtml+'</td></tr>';
        // Last item - show final subtotal
        if (idx === sorted.length - 1) {
          detailRows += '<tr style="border-top:1px dashed rgba(255,255,255,0.15);background:rgba(255,255,255,0.06)"><td colspan="5" style="padding:3px 8px;font-size:0.6rem;font-weight:700;color:'+cc+';text-align:right">小计 ('+cat+')</td><td style="padding:3px 8px;font-size:0.65rem;font-weight:700;color:#fff;text-align:center">'+formatNum(catTotal)+'</td></tr>';
        }
      });
    } else {
      detailRows = '<tr><td colspan="6" style="text-align:center;color:#999;padding:10px;font-size:0.6rem">暂无</td></tr>';
    }

    var detailHtml = '<div class="detail" style="background:#1a1a2e;color:#fff">' +
      '<div class="detail-inner" style="padding:6px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<span style="font-size:1.2rem">'+emojis[bi]+'</span>' +
          '<span style="font-size:0.72rem;font-weight:700">'+base+'</span>' +
          (baseScales[base]?'<span style="font-size:0.5rem;opacity:0.6;margin-left:6px">'+baseScales[base]+'</span>':'') +
          '<span style="margin-left:auto;font-size:0.65rem;color:'+cc+'">'+formatNum(total)+'</span>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
          '<div style="flex:1;min-width:0;height:80px"><canvas id="baseChart_'+bi+'"></canvas></div>' +
          '<div style="flex:1;min-width:0"><table style="width:100%;border-collapse:collapse">' +
            '<thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1)"><th style="padding:2px 6px;font-size:0.55rem;color:'+cc+';text-align:left">类别</th><th style="padding:2px 6px;font-size:0.55rem;color:'+cc+';text-align:right">金额</th><th style="padding:2px 6px;font-size:0.55rem;color:'+cc+';text-align:center">%</th></tr></thead><tbody>'+catRows+'</tbody></table></div>' +
        '</div>' +
        '<div style="margin-top:6px;overflow-x:auto">' +
          '<table style="width:100%;border-collapse:collapse;font-size:0.55rem"><thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1)"><th style="padding:2px 4px;color:#888">类别</th><th style="padding:2px 4px;color:#888">日期</th><th style="padding:2px 4px;color:#888">项目</th><th style="padding:2px 4px;color:#888;text-align:right">金额</th><th style="padding:2px 4px;color:#888">说明</th><th style="padding:2px 4px;color:#888">票据</th></tr></thead><tbody>'+detailRows+'</tbody></table>' +
        '</div>' +
      '</div>' +
    '</div>';

    html += '<div class="base-card" data-base="'+base+'" data-color="'+cc+'" data-total="'+total+'" style="border:1px solid '+cc+'22;box-shadow:0 2px 8px '+cc+'11">' +
      coverHtml + detailHtml +
    '</div>';

    // Chart render
    setTimeout(function(id, ct, bt){
      var cats = Object.keys(ct).filter(function(c){ return ct[c] > 0; });
      if (!cats.length) return;
      makeChart(id, 'doughnut', cats.map(function(c){ return c; }), [
        { data: cats.map(function(c){ return ct[c]; }), backgroundColor: cats.map(function(c){ return catColors[c]||'#95a5a6'; }), borderColor: '#1a1a2e', borderWidth: 1 }
      ]);
    }, 200, 'baseChart_'+bi, catTotals, total);
  });

  container.innerHTML = html;
  // 点击卡片全屏查看
  container.onclick = function(e) {
    var card = e.target.closest('.base-card');
    if (!card) return;
    var base = card.getAttribute('data-base');
    if (!base) return;
    var color = card.getAttribute('data-color');
    var total = parseFloat(card.getAttribute('data-total') || '0');
    var items = [];
    allData.forEach(function(r){ if (r.base === base) items.push({date:r.date,category:r.category,item:r.item,amount:r.amount,note:r.note,invoices:r.invoices}); });
    openBaseFull(base, color, total, items);
  };
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
  else if (id === "tab14") { renderChart14a(); renderChart14b(); }
  else if (id === "tab15") { renderChart15a(); renderChart15b(); renderChart15c(); renderChart15d(); }
}

function makeChart(id, type, labels, datasets, opts) {
  var ctx = document.getElementById(id);
  if (!ctx) return null;
  if (charts[id]) charts[id].destroy();
  var defaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { size: 14, weight: 'bold' }, boxWidth: 20, padding: 14, usePointStyle: true }, position: 'bottom' },
      datalabels: { display: false }
    },
    scales: type !== 'doughnut' && type !== 'pie' ? {
      x: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' } } },
      y: { ticks: { callback: function(v) { return '¥' + (v/1000).toFixed(0) + 'k'; }, font: { size: 11, weight: 'bold' } } }
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

// 图表全屏查看
function openChartViewer(canvasId) {
  var overlay = document.getElementById('chartViewer');
  var content = document.getElementById('chartViewerContent');
  if (!overlay || !content) return;
  var origCanvas = document.getElementById(canvasId);
  if (!origCanvas) return;
  // 在查看器中插入新的画布容器
  var newId = canvasId + '_full';
  content.innerHTML = '<div class="chart-box"><canvas id="' + newId + '"></canvas></div>';
  overlay.style.display = 'flex';
  // 在新画布上重建图表
  if (charts[canvasId]) {
    var cfg = charts[canvasId].config;
    var newCanvas = document.getElementById(newId);
    if (newCanvas) {
      charts[newId] = new Chart(newCanvas, cfg);
    }
  }
}
function closeChartViewer() {
  var overlay = document.getElementById('chartViewer');
  if (overlay) overlay.style.display = 'none';
  var content = document.getElementById('chartViewerContent');
  if (content) content.innerHTML = '';
}
// 点击图表卡片放大
document.addEventListener('click', function(e) {
  var card = e.target.closest('.chart-card');
  if (!card) return;
  var canvas = card.querySelector('canvas');
  if (canvas) openChartViewer(canvas.id);
});

// === 仪表盘图表 ===
// 异常检测（大额支出、余额不足）
function checkAnomalies() {
  var bar = document.getElementById('valBar');
  var txt = document.getElementById('valText');
  if (!bar || !txt) return;
  var bf = DataStore.bankFlow || [];
  if (!bf.length) return;
  var avg = 0, count = 0;
  bf.forEach(function(r) { if (r.expense > 0) { avg += r.expense; count++; } });
  if (!count) return;
  avg = avg / count;
  // 找出超过平均5倍的大额支出
  var bigs = bf.filter(function(r) { return r.expense > avg * 5 && r.expense > 10000; });
  if (bigs.length > 0) {
    bigs.sort(function(a,b){return b.expense - a.expense;});
    var msg = '⚠️ 发现 ' + bigs.length + ' 笔大额支出（最高 ¥' + Math.round(bigs[0].expense).toLocaleString('zh-CN') + '）';
    txt.textContent = msg;
    bar.style.display = 'block';
    bar.onclick = function(){ this.style.display='none'; };
  } else {
    bar.style.display = 'none';
  }
  // 余额不足预警
  var totalInc = 0, totalExp = 0;
  bf.forEach(function(r) { totalInc += r.income||0; totalExp += r.expense||0; });
  var balance = totalInc - totalExp;
  if (balance < 0 && balance > -50000) {
    bar.style.display = 'block';
    txt.textContent = '⚠️ 余额不足预警：可用余额 ¥' + Math.round(balance).toLocaleString('zh-CN');
  }
}

function renderDashCharts() {
  // 异常检测：大额支出提醒
  checkAnomalies();


  var bf = DataStore.bankFlow || [];
  var cap = DataStore.capital || [];
  var reim = DataStore._reimburseFlat || DataStore.reimburse || [];
  var reimCount = Array.isArray(reim) ? reim.length : 0;
  var totalIncome = bf.reduce(function(s,r) { return s + (r.income||0); }, 0);
  var totalExpense = bf.reduce(function(s,r) { return s + (r.expense||0); }, 0);
  var bases = DataStore.baseExpense || []; var totalCapital = cap.reduce(function(s,r) { return s + (r.amount||0); }, 0);

  $('dashIncome').textContent = formatNum(totalIncome);
  $('dashExpense').textContent = formatNum(totalExpense);
  $('dashBalance').textContent = formatNum(totalIncome - totalExpense);
  $('dashCapital').textContent = formatNum(totalCapital);
  $('dashReimburse').textContent = reimCount + '笔';
  $('dashBankFlow').textContent = bf.length + '笔';

  // ① 月度收支趋势
  var months = {};
  bf.forEach(function(r) {
    var m = (r.date||'').slice(0,7); if (!m) return;
    if (!months[m]) months[m] = { income:0, expense:0 };
    months[m].income += r.income||0; months[m].expense += r.expense||0;
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

  // ② 收支对比（总收入 vs 总支出 vs 净余额）
  makeChart('dashCompare', 'bar', ['收入', '支出', '净余额'], [
    { data: [totalIncome, totalExpense, totalIncome - totalExpense], backgroundColor: ['#27ae60','#e53e3e','#D35400'], borderColor: '#000', borderWidth: 2 }
  ], {
    indexAxis: 'y', plugins: { datalabels: { anchor:'end', align:'end', color:'#000', font:{weight:'bold',size:12}, formatter:function(v){return '¥' + Math.round(v).toLocaleString('zh-CN');} } }
  });

  // ③ 支出用途分类（按关键词匹配）
  var expCat = {};
  bf.forEach(function(r) {
    if (r.expense > 0 && r.purpose) {
      var t = r.purpose;
      var cat = '其他';
      if (/种苗|苗款|种籽|种子|苗$/.test(t)) cat = '种苗采购';
      else if (/农机|机械|犁|旋耕|覆膜/.test(t)) cat = '农业机械';
      else if (/化肥|农药|除草|肥料/.test(t)) cat = '化肥农药';
      else if (/土地流转|流转费/.test(t)) cat = '土地流转';
      else if (/分红/.test(t)) cat = '集体分红';
      else if (/工资|人工|民工|劳务|薪酬/.test(t)) cat = '人工工资';
      else if (/运输|运费|物流|货运|配送/.test(t)) cat = '运输费用';
      else if (/差旅|机票|车票|住宿|出差|交通/.test(t)) cat = '差旅开支';
      else if (/报销/.test(t)) cat = '差旅开支';
      else if (/备用金/.test(t)) cat = '人工工资';
      expCat[cat] = (expCat[cat]||0) + r.expense;
    }
  });
  var eLabels = ['种苗采购','人工工资','农业机械','化肥农药','土地流转','运输费用','差旅开支','集体分红','其他'].filter(function(c){return expCat[c];});
  var eValues = eLabels.map(function(c){return expCat[c]||0;});
  if (expCat['其他']) { eLabels.push('其他'); eValues.push(expCat['其他']); }
  var eColors = {'种苗采购':'#27ae60','人工工资':'#e53e3e','农业机械':'#D35400','化肥农药':'#f39c12','土地流转':'#3182ce','运输费用':'#9b59b6','差旅开支':'#1abc9c','集体分红':'#e67e22','其他':'#95a5a6'};
  makeChart('dashExpenseBar', 'bar', eLabels, [
    { data: eValues, backgroundColor: eLabels.map(function(c){return eColors[c];}), borderColor: '#000', borderWidth: 1 }
  ], {
    indexAxis: 'y', plugins: { datalabels: { anchor:'end', align:'end', color:'#000', font:{weight:'bold',size:10}, formatter:function(v){return '¥' + Math.round(v/10000).toLocaleString('zh-CN') + 'w';} } }
  });

  // ④ 股本金构成（水平柱状图）
  if (cap.length > 0) {
    var persons = {}; cap.forEach(function(r){ persons[r.name] = (persons[r.name]||0) + (r.amount||0); });
    var cLabels = Object.keys(persons);
    var cValues = cLabels.map(function(n){return persons[n];});
    makeChart('dashCapitalChart', 'bar', cLabels, [
      { data: cValues, backgroundColor: 'rgba(49,130,206,0.6)', borderColor: '#3182ce', borderWidth: 1 }
    ], {
      indexAxis: 'y', plugins: { datalabels: { anchor:'end', align:'end', color:'#000', font:{weight:'bold',size:10}, formatter:function(v){return '¥' + Math.round(v).toLocaleString('zh-CN');} } }
    });
  }
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
  var allDr = DataStore.pettyDraw||[], allWr = DataStore.pettyWrite||[];
  var ps = ['任海涛','庞尚韬'];
  var dr = ps.map(function(p){return allDr.filter(function(r){return r.person===p;}).reduce(function(s,r){return s+Number(r.amount||0);},0);});
  var wr = ps.map(function(p){return allWr.filter(function(r){return r.person===p;}).reduce(function(s,r){return s+Number(r.amount||0);},0);});
  var bl = dr.map(function(d,i){return d-wr[i];});
  makeChart('chart4a', 'bar', ps, [
    {label:'领用金额',data:dr,backgroundColor:'#D35400',borderColor:'#000',borderWidth:2},
    {label:'核销金额',data:wr,backgroundColor:'#27ae60',borderColor:'#000',borderWidth:2},
    {label:'退补金额',data:bl,backgroundColor:'#3498db',borderColor:'#000',borderWidth:2}
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
  // 从种苗和农资数据计算应收总额
  var slData = DataStore.seedlingBill || [];
  var mtData = DataStore.materialsBill || [];
  var totalSl = 0, totalMt = 0;
  slData.forEach(function(r){ if(!r.is_total) totalSl += r.unpaid||0; });
  mtData.forEach(function(r){ if(!r.is_total) totalMt += r.unpaid||0; });
  var grand = totalSl + totalMt;
  var pctSl = grand > 0 ? (totalSl/grand*100).toFixed(1) : 0;
  var pctMt = grand > 0 ? (totalMt/grand*100).toFixed(1) : 0;
  makeChart('chart6a', 'doughnut', [
    '种苗款 ¥' + totalSl.toLocaleString(),
    '农资款 ¥' + totalMt.toLocaleString()
  ], [
    { data: [totalSl, totalMt], backgroundColor: ['#27ae60','#f39c12'], borderColor: '#fff', borderWidth: 3 }
  ]);
  var chart = charts.chart6a;
  if (chart) {
    try {
      chart.options.plugins.legend.labels.font = { size: 13, weight: 'bold' };
      chart.options.plugins.datalabels = {
        display: true,
        formatter: function(v, ctx){
          var pcts = [pctSl, pctMt];
          return pcts[ctx.dataIndex] + '%\n¥' + v.toLocaleString();
        },
        color: '#fff', font: { weight: 'bold', size: 13 },
        anchor: 'center', align: 'center', textAlign: 'center'
      };
      chart.update();
    } catch(e){}
  }
}
function renderChart6b() {
  var data = DataStore.receivable || [];
  var items = data.filter(function(r){ return r.amount > 0; });
  if (!items.length) return;
  // 按金额从大到小排序
  items.sort(function(a,b){ return (b.amount||0) - (a.amount||0); });
  makeChart('chart6b', 'bar', items.map(function(r){ return r.party; }), [
    { data: items.map(function(r){ return r.amount||0; }), backgroundColor: '#e74c3c', borderColor: '#c0392b', borderWidth: 1 }
  ], {
    plugins: {
      tooltip: { callbacks: { label: function(ctx){ return '¥' + (ctx.raw||0).toLocaleString(); }}}
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 } } },
      y: { ticks: { callback: function(v){ return '¥' + (v/1000).toFixed(0) + 'k'; }, font: { size: 9 } } }
    }
  });
  // 金额标签
  var chart = charts.chart6b;
  if (chart) {
    try {
      chart.options.plugins.datalabels = {
        display: function(ctx){ return ctx.raw > 0; },
        formatter: function(v){ return '¥' + v.toLocaleString(); },
        color: '#1a1a1a', font: { weight: 'bold', size: 9 }, anchor: 'end', align: 'end'
      };
      chart.update();
    } catch(e){}
  }
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
  var regular = data.filter(function(r){ return r.name === '任海涛' || r.name === '庞尚韬' || (r.name === '施前华' && r.position !== '临时工'); });
  var temp = data.filter(function(r){ return r.name === '施前华' && r.position === '临时工'; });
  var monthSet = {};
  regular.forEach(function(r){ monthSet[r.month] = 1; });
  temp.forEach(function(r){ monthSet[r.month] = 1; });
  var months = Object.keys(monthSet).sort();
  if (!months.length) return;
  var regData = months.map(function(m){
    return regular.filter(function(r){return r.month===m;}).reduce(function(s,r){return s+(r.amount||0);},0);
  });
  var tempData = months.map(function(m){
    return temp.filter(function(r){return r.month===m;}).reduce(function(s,r){return s+(r.amount||0);},0);
  });
  makeChart('chart9a', 'bar', months.map(function(m){return m.replace('-','/');}), [
    { label: '正式员工', data: regData, backgroundColor: '#2d5a27' },
    { label: '临时工', data: tempData, backgroundColor: '#f39c12' }
  ], {
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, ticks: { callback: function(v){ return '¥'+(v/1000).toFixed(0)+'k'; } } }
    },
    plugins: {
      tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': ¥' + (ctx.raw||0).toLocaleString(); }}}
    }
  });
}
function renderChart9b() {
  var data = DataStore.salary || [];
  var pos = {};
  var capColors = {"任海涛":"#e8f4fd","庞尚韬":"#fef2f2","吴生成":"#f0faf4","应红林":"#fdf6e3","陈洪斌":"#f5e6f0"};
  data.forEach(function(r) { pos[r.position] = (pos[r.position]||0) + (r.amount||0); });
  var positionColors = {'董事长':'#e74c3c','总经理':'#3498db','基地管理员':'#2ecc71','临时工':'#f39c12'};
  var posColors = Object.keys(pos).map(function(k){ return positionColors[k] || '#9b59b6'; });
  makeChart('chart9b', 'doughnut', Object.keys(pos), [
    { data: Object.keys(pos).map(function(k){return pos[k];}), backgroundColor: posColors, borderColor: '#fff', borderWidth: 2 }
  ]);
}

// ⑩ 基地支出图表
function renderChart10a() {
  var data = DataStore.baseExpense || [];
  var catColors = {'土地流转':'#8B4513','土地处理':'#D2691E','种苗采购':'#27ae60','种苗运输':'#2ecc71','化肥农药':'#f39c12','人工费用':'#e74c3c','其他':'#95a5a6'};
  var categories = ['土地流转','土地处理','种苗采购','种苗运输','化肥农药','人工费用','其他'];
  var baseNames = ['金银花基地','党参基地','党参育苗基地'];
  // Aggregate: cat -> base -> amount
  var catBase = {};
  categories.forEach(function(c){ catBase[c]={}; baseNames.forEach(function(b){ catBase[c][b]=0; }); });
  data.forEach(function(r){
    var cat = r.category || '其他';
    var base = r.base || '';
    if (catBase[cat] && catBase[cat][base] !== undefined) catBase[cat][base] += r.amount||0;
  });
  makeChart('chart10a', 'bar', categories, baseNames.map(function(base){
    return {
      label: base,
      data: categories.map(function(c){ return catBase[c][base] || 0; }),
      backgroundColor: base === '金银花基地' ? '#27ae60' : base === '党参基地' ? '#3498db' : '#f39c12'
    };
  }), {
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: function(v){ return '¥'+(v/1000).toFixed(0)+'k'; } } } },
    plugins: { tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': ¥' + (ctx.raw||0).toLocaleString(); }} } }
  });
}
function renderChart10b() {
  var data = DataStore.baseExpense || [];
  var catColors = {'土地流转':'#8B4513','土地处理':'#D2691E','种苗采购':'#27ae60','种苗运输':'#2ecc71','化肥农药':'#f39c12','人工费用':'#e74c3c','其他':'#95a5a6'};
  var baseNames = ['金银花基地','党参基地','党参育苗基地'];
  var categories = ['土地流转','土地处理','种苗采购','种苗运输','化肥农药','人工费用','其他'].filter(function(c){
    return data.some(function(r){ return (r.category||'') === c; });
  });
  if (!categories.length) return;
  var totals = categories.map(function(c){
    return data.filter(function(r){return (r.category||'')===c;}).reduce(function(s,r){return s+(r.amount||0);},0);
  });
  var total = totals.reduce(function(s,v){return s+v;},0);
  makeChart('chart10b', 'doughnut', categories.map(function(c,i){
    return c + ' ' + (total>0?'('+(totals[i]/total*100).toFixed(1)+'%)':'');
  }), [
    { data: totals, backgroundColor: categories.map(function(c){ return catColors[c] || '#95a5a6'; }), borderColor: '#fff', borderWidth: 2 }
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
  var apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : '');
  var ext = decoded.split('.').pop().toLowerCase();
  var fileUrl = '/finance/uploads/vouchers/' + decoded;
  // 显示文件名
  var titleEl = document.querySelector('.viewer-title');
  if (titleEl) titleEl.textContent = '📎 ' + decoded;
  if (['jpg','jpeg','png','gif','webp'].indexOf(ext) !== -1) {
    $('previewImg').src = fileUrl;
    $('previewImg').style.display = '';
    $('previewPdf').style.display = 'none';
    $('imgViewer').classList.add('show');
    $('imgOverlay').classList.add('show');
  } else {
    $('previewImg').style.display = 'none';
    $('previewPdf').src = fileUrl;
    $('previewPdf').style.display = '';
    $('imgViewer').classList.add('show');
    $('imgOverlay').classList.add('show');
  }
}

function closeImgViewer() {
  $('imgViewer').classList.remove('show');
  $('imgOverlay').classList.remove('show');
  $('previewPdf').src = '';
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
  data.forEach(function(r, idx) {
    var bg = r.income > 0 ? "#f0faf4" : (r.expense > 0 ? "#fef2f2" : "");
    body.innerHTML += '<tr style="background:' + bg + '"><td style="text-align:center;color:#999;font-size:0.72rem">' + (idx+1) + '</td><td>' + (r.date||"") + '</td>' +
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
  renderFarmer();
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

// ⑮ 农户信息
function renderFarmer() {
  var body = $('farmerBody');
  if (body) body.innerHTML = ''; // legacy
  renderSeedlingBill();
  renderMaterialsBill();
  renderChart15a();
  renderChart15b();
}
function renderChart15a() {
  var data = DataStore.seedlingBill || [];
  // 使用合计行数据（is_total=1），确保包含所有数据
  var totalRow = data.filter(function(r){ return r.is_total; })[0];
  if (!totalRow) return;
  var total = totalRow.total_amount || 0;
  var prepaid = totalRow.prepaid || 0;
  var unpaid = totalRow.unpaid || 0;
  var pctPaid = total > 0 ? (prepaid/total*100).toFixed(1) : 0;
  var pctUnpaid = total > 0 ? (unpaid/total*100).toFixed(1) : 0;
  makeChart('chart15a', 'doughnut', ['✅ 已收 ¥' + prepaid.toLocaleString(), '❌ 未收 ¥' + unpaid.toLocaleString()], [
    { data: [prepaid, unpaid], backgroundColor: ['#27ae60','#e53e3e'], borderColor: '#fff', borderWidth: 3 }
  ]);
  var chart = charts.chart15a;
  if (chart) {
    try {
      chart.options.plugins.legend.labels.font = { size: 13, weight: 'bold' };
      chart.options.plugins.datalabels = {
        display: 'auto',
        formatter: function(v, ctx){
          var pcts = [pctPaid, pctUnpaid];
          return pcts[ctx.dataIndex] + '%\n¥' + v.toLocaleString();
        },
        color: '#1a1a1a',
        font: { weight: 'bold', size: 12 },
        anchor: 'end', align: 'end',
        offset: 6, textAlign: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 4,
        padding: { top: 3, bottom: 3, left: 6, right: 6 }
      };
      // Center total text
      chart.options.plugins.centerText = { text: '¥' + total.toLocaleString(), sub: '应收总额' };
      chart.update();
    } catch(e){}
  }
}
function renderChart15b() {
  var data = DataStore.seedlingBill || [];
  var totalRow = data.filter(function(r){ return r.is_total; })[0];
  if (!totalRow) return;
  var total = totalRow.total_amount || 0;
  var prepaid = totalRow.prepaid || 0;
  var unpaid = totalRow.unpaid || 0;
  var pctPaid = total > 0 ? (prepaid/total*100).toFixed(1) : 0;
  var pctUnpaid = total > 0 ? (unpaid/total*100).toFixed(1) : 0;
  makeChart('chart15b', 'bar', ['种苗'], [
    { label: '应收(总金额)', data: [total], backgroundColor: '#f39c12', borderColor: '#e67e00', borderWidth: 1 },
    { label: '已收(预付款)', data: [prepaid], backgroundColor: '#27ae60', borderColor: '#1e8449', borderWidth: 1 },
    { label: '未收', data: [unpaid], backgroundColor: '#e53e3e', borderColor: '#c0392b', borderWidth: 1 }
  ], {
    plugins: {
      tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': ¥' + (ctx.raw||0).toLocaleString(); }}}
    },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: function(v){ return '¥' + (v/1000).toFixed(0) + 'k'; }, font: { size: 9 } } }
    }
  });
  // Add percentage labels on bars
  var chart = charts.chart15b;
  if (chart) {
    try {
      chart.options.plugins.datalabels = {
        display: function(ctx){
          var vals = [total, prepaid, unpaid];
          return vals[ctx.datasetIndex] > 0;
        },
        formatter: function(v, ctx){
          var pcts = ['100%', pctPaid+'%', pctUnpaid+'%'];
          return pcts[ctx.datasetIndex] + '\n¥' + v.toLocaleString();
        },
        color: '#fff', font: { weight: 'bold', size: 12 }, anchor: 'center', align: 'center', textAlign: 'center'
      };
      chart.update();
    } catch(e){}
  }
}
function renderChart15c() {
  var data = DataStore.materialsBill || [];
  var totalRow = data.filter(function(r){ return r.is_total; })[0];
  if (!totalRow) return;
  var total = totalRow.total_amount || 0;
  var paid = totalRow.paid || 0;
  var unpaid = totalRow.unpaid || 0;
  var pctPaid = total > 0 ? (paid/total*100).toFixed(1) : 0;
  var pctUnpaid = total > 0 ? (unpaid/total*100).toFixed(1) : 0;
  makeChart('chart15c', 'doughnut', ['✅ 已收款 ¥' + paid.toLocaleString(), '❌ 未收款 ¥' + unpaid.toLocaleString()], [
    { data: [paid, unpaid], backgroundColor: ['#2980b9','#e67e22'], borderColor: '#fff', borderWidth: 3 }
  ]);
  var chart = charts.chart15c;
  if (chart) {
    try {
      chart.options.plugins.legend.labels.font = { size: 13, weight: 'bold' };
      chart.options.plugins.datalabels = {
        display: 'auto',
        formatter: function(v, ctx){
          var pcts = [pctPaid, pctUnpaid];
          return pcts[ctx.dataIndex] + '%\n¥' + v.toLocaleString();
        },
        color: '#1a1a1a',
        font: { weight: 'bold', size: 12 },
        anchor: 'end', align: 'end',
        offset: 6, textAlign: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 4,
        padding: { top: 3, bottom: 3, left: 6, right: 6 }
      };
      chart.options.plugins.centerText = { text: '¥' + total.toLocaleString(), sub: '应收总额' };
      chart.update();
    } catch(e){}
  }
}
function renderChart15d() {
  var data = DataStore.materialsBill || [];
  var totalRow = data.filter(function(r){ return r.is_total; })[0];
  if (!totalRow) return;
  var total = totalRow.total_amount || 0;
  var paid = totalRow.paid || 0;
  var unpaid = totalRow.unpaid || 0;
  var pctPaid = total > 0 ? (paid/total*100).toFixed(1) : 0;
  var pctUnpaid = total > 0 ? (unpaid/total*100).toFixed(1) : 0;
  makeChart('chart15d', 'bar', ['农资'], [
    { label: '应收(总金额)', data: [total], backgroundColor: '#f39c12', borderColor: '#e67e00', borderWidth: 1 },
    { label: '已收款', data: [paid], backgroundColor: '#2980b9', borderColor: '#1a5276', borderWidth: 1 },
    { label: '未收款', data: [unpaid], backgroundColor: '#e67e22', borderColor: '#ca6f1e', borderWidth: 1 }
  ], {
    plugins: {
      tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': ¥' + (ctx.raw||0).toLocaleString(); }}}
    },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: function(v){ return '¥' + (v/1000).toFixed(0) + 'k'; }, font: { size: 9 } } }
    }
  });
  var chart = charts.chart15d;
  if (chart) {
    try {
      chart.options.plugins.datalabels = {
        display: function(ctx){
          var vals = [total, paid, unpaid];
          return vals[ctx.datasetIndex] > 0;
        },
        formatter: function(v, ctx){
          var pcts = ['100%', pctPaid+'%', pctUnpaid+'%'];
          return pcts[ctx.datasetIndex] + '\n¥' + v.toLocaleString();
        },
        color: '#fff', font: { weight: 'bold', size: 12 }, anchor: 'center', align: 'center', textAlign: 'center'
      };
      chart.update();
    } catch(e){}
  }
}
function renderSeedlingBill() {
  var data = DataStore.seedlingBill || [];
  var body = $('seedlingBody');
  if (!body) return;
  body.innerHTML = '';
  if (!data.length) { var e=$('empty15'); if(e) e.style.display='block'; return; }
  var e=$('empty15'); if(e) e.style.display='none';
  data.forEach(function(r) {
    var cls = r.is_total ? ' class="row-total"' : r.is_subtotal ? ' class="row-subtotal"' : '';
    body.innerHTML += '<tr' + cls + '>' +
      '<td class="col-seq">' + (r.seq||'') + '</td>' +
      '<td class="col-name">' + (r.name||'') + '</td>' +
      '<td class="col-phone">' + (r.phone||'') + '</td>' +
      '<td class="col-num">' + (r.area||'') + '</td>' +
      '<td class="col-num">' + (r.bags||'') + '</td>' +
      '<td class="col-num">' + (r.price_per_bag||'') + '</td>' +
      '<td class="col-num">' + (r.weight_per_bag||'') + '</td>' +
      '<td class="col-amount">' + formatNum(r.total_amount||0) + '</td>' +
      '<td class="col-paid">' + formatNum(r.prepaid||0) + '</td>' +
      '<td class="col-unpaid">' + formatNum(r.unpaid||0) + '</td></tr>';
  });
}
function renderMaterialsBill() {
  var data = DataStore.materialsBill || [];
  var body = $('materialsBody');
  if (!body) return;
  body.innerHTML = '';
  if (!data.length) return;
  data.forEach(function(r) {
    var cls = r.is_total ? ' class="row-total"' : r.is_subtotal ? ' class="row-subtotal"' : '';
    body.innerHTML += '<tr' + cls + '>' +
      '<td class="col-seq">' + (r.seq||'') + '</td>' +
      '<td class="col-name">' + (r.name||'') + '</td>' +
      '<td class="col-phone">' + (r.phone||'') + '</td>' +
      '<td class="col-num">' + formatNum(r.fertilizer_a||0) + '</td>' +
      '<td class="col-num">' + formatNum(r.fertilizer_b||0) + '</td>' +
      '<td class="col-num">' + formatNum(r.herbicide||0) + '</td>' +
      '<td class="col-num">' + formatNum(r.sealant||0) + '</td>' +
      '<td class="col-num">' + formatNum(r.pesticide||0) + '</td>' +
      '<td class="col-amount">' + formatNum(r.total_amount||0) + '</td>' +
      '<td class="col-paid">' + formatNum(r.paid||0) + '</td>' +
      '<td class="col-unpaid">' + formatNum(r.unpaid||0) + '</td>' +
      '<td class="col-notes" style="font-size:0.6rem;color:#888;max-width:120px">' + (r.notes||'') + '</td></tr>';
  });
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
    var pubSections = ['capital','bankFlow','pettyDraw','pettyWrite','pettyCash','bankAccounts','contracts','companyInfo','receivable','asset','management','salary','baseExpense','farmerLedger','seedlingBill','materialsBill','tempLabor','tempWorkers','agentExpenses'];
  var pubLoaded = 0;
  pubSections.forEach(function(s) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (typeof API_BASE !== 'undefined' ? API_BASE : '') + '/api/public/' + s, true);
    xhr.onload = function() {
      try {
        var d = JSON.parse(xhr.responseText) || [];
        if (typeof DataStore === 'undefined') { pubLoaded++; return; }
        // 初始加载始终用服务器数据
        if (s === 'pettyCash') {
          DataStore.pettyCash = { ren: d.filter(function(x){return x.person==='任海涛';}), pang: d.filter(function(x){return x.person==='庞尚韬';}) };
          DataStore._pettyCashFlat = d;
        } else {
          DataStore[s] = d;
        }
        if (d.length > 0) localStorage.setItem('wyx_' + s, JSON.stringify(d));
      } catch(e) {}
      pubLoaded++;
      if (pubLoaded === pubSections.length) { try { renderAll(); } catch(e) { console.error(e); } updateSummary(); showLoading(false); setTimeout(animateSummaryNumbers, 400); setTimeout(renderCharts, 100); }
    };
    xhr.onerror = function() { pubLoaded++; if (pubLoaded === pubSections.length) { try { renderAll(); } catch(e) { console.error(e); } updateSummary(); showLoading(false); setTimeout(renderCharts, 100); } };
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


// 自动定时刷新（本地修改优先，不覆盖）
setInterval(function() {
  var sections = ['capital','bankFlow','pettyDraw','pettyWrite','pettyCash','receivable','asset','management','salary','baseExpense'];
  var loaded = 0;
  sections.forEach(function(s) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', (typeof API_BASE !== 'undefined' ? API_BASE : (window.location.pathname.startsWith('/finance/') ? '/finance' : '')) + '/api/public/' + s, true);
    xhr.onload = function() {
      try {
        var d = JSON.parse(xhr.responseText) || [];
        if (typeof DataStore === 'undefined') return;
        var localData = JSON.parse(localStorage.getItem('wyx_' + s)) || [];
        if (localData.length > 0) {
          // 有本地修改，用本地数据（不覆盖）
          if (s === 'pettyCash') {
            DataStore._pettyCashFlat = localData;
            DataStore.pettyCash = { ren: localData.filter(function(x){return x.person==='任海涛';}), pang: localData.filter(function(x){return x.person==='庞尚韬';}) };
            DataStore.pettyDraw = localData.filter(function(x){return x.type==='领用';});
            DataStore.pettyWrite = localData.filter(function(x){return x.type==='核销';});
          } else {
            DataStore[s] = localData;
          }
        } else if (d.length > 0) {
          // 无本地修改，用服务器数据
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

// 单据页内查看（手机友好）
function showDoc(filename) {
  var img = document.getElementById('previewImg');
  var pdf = document.getElementById('previewPdf');
  var viewer = document.getElementById('imgViewer');
  var overlay = document.getElementById('imgOverlay');
  if (!viewer || !overlay) { window.open("/finance/uploads/vouchers/" + filename, "_blank"); return; }
  var ext = filename.split('.').pop().toLowerCase();
  var url = '/finance/uploads/vouchers/' + filename;
  if (['jpg','jpeg','png','gif','webp'].indexOf(ext) !== -1) {
    img.src = url;
    img.style.display = '';
    pdf.style.display = 'none';
  } else {
    pdf.src = url;
    pdf.style.display = '';
    img.style.display = 'none';
  }
  viewer.classList.add('show');
  overlay.classList.add('show');
}

// showDoc的window.open备选
function fallbackOpen(filename) {
  window.open('/finance/uploads/vouchers/' + filename, '_blank');
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
              var docLink = docFiles.length ? docFiles.map(function(f){return f.trim();}).filter(Boolean).map(function(f){return '<a href="#" onclick="showDoc(\'' + f + '\')" style="color:#D35400;font-weight:700;text-decoration:none;border-bottom:1px dashed #D35400">📎 ' + f + '</a>';}).join(' ') : '—';
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


// === 编辑模式 - 前台直接编辑 ===

// 每个版块表格列对应的字段名
var COL_FIELDS = {
  capitalBody:        ['date','name','amount','method'],
  bankFlowBody:       ['_seq','date','income','expense','counterparty_account','counterparty_name','purpose','summary'],
  pettyRenDrawBody:   ['date','amount','account','summary'],
  pettyPangDrawBody:  ['date','amount','account','summary'],
  pettyRenWriteBody:  ['date','amount','summary','voucher'],
  pettyPangWriteBody: ['date','amount','summary','voucher'],
  receivableBody:     ['date','party','amount','reason','status'],
  assetBody:          ['date','name','amount','location','status'],
  managementBody:     ['date','category','amount','summary','invoices'],
  salaryBody:         ['month','name','position','amount','payDate','voucher'],
  reimburseRenBody:   ['date','amount','reason','_link','docs'],
  reimbursePangBody:  ['date','amount','reason','_link','docs'],
  reimburseYingBody:  ['date','amount','reason','_link','docs'],
  baseJinyinhuaBody:  ['date','item','amount','note','invoices'],
  baseDangshenBody:   ['date','item','amount','note','invoices'],
  baseSeedlingBody:   ['date','item','amount','note','invoices'],
  baseDetailBody:     ['date','category','item','amount','note','invoices'],
  companyInfoBody:    ['field_name','field_value'],
  contractsBody:      ['date','contract_name','party','amount','status','note'],
  bankAccountsBody:   ['bank_name','account_name','account_number','balance','note'],
  tempLaborBody:     ['date','headcount','work_content','amount','notes']
};

// 给所有数据行加上 data-idx 和删除按钮，以及表下方的"新增"按钮
function enableEditModeUI() {
  if (!EDIT_MODE) return;
  document.querySelectorAll('.data-table').forEach(function(table) {
    var tbody = table.querySelector('tbody');
    if (!tbody || !COL_FIELDS[tbody.id]) return;
    // 添加"操作"表头（仅一次）
    var thead = table.querySelector('thead');
    if (thead && !thead.querySelector('.op-head')) {
      var th = document.createElement('th');
      th.className = 'op-head';
      th.textContent = '操作';
      th.style.cssText = 'width:50px;text-align:center';
      thead.querySelector('tr').appendChild(th);
    }
    // 给每行加独立"操作"列
    var rows = tbody.querySelectorAll('tr:not(:last-child)');
    rows.forEach(function(tr, idx) {
      tr.setAttribute('data-idx', idx);
      if (!tr.querySelector('.op-cell')) {
        var opTd = document.createElement('td');
        opTd.className = 'op-cell';
        opTd.style.cssText = 'text-align:center;white-space:nowrap';
        var delBtn = document.createElement('button');
        delBtn.className = 'del-btn';
        delBtn.textContent = '🗑️';
        delBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:14px;padding:2px 6px;opacity:0.6';
        delBtn.title = '删除此行';
        delBtn.onclick = function(e) { e.stopPropagation(); deleteRow(tbody.id, idx); };
        opTd.appendChild(delBtn);
        tr.appendChild(opTd);
      }
    });
    // 表格下方工具栏（新增一行 + 导入Excel + 保存）
    if (!table.parentNode.querySelector('.add-row-bar[data-body="' + tbody.id + '"]')) {
      var addBar = document.createElement('div');
      addBar.className = 'add-row-bar';
      addBar.setAttribute('data-body', tbody.id);
      addBar.style.cssText = 'margin:6px 0 16px;display:flex;gap:6px;flex-wrap:wrap';
      var btnStyle = 'background:#22d3ee;color:#fff;border:none;font-size:0.72rem;padding:4px 10px;cursor:pointer;border-radius:3px;font-weight:600';
      var addBtn = document.createElement('button');
      addBtn.className = 'tb-btn';
      addBtn.innerHTML = '＋ 新增一行';
      addBtn.style.cssText = btnStyle;
      addBtn.onclick = function() { perTableAddRow(tbody.id); };
      addBar.appendChild(addBtn);
      var impBtn = document.createElement('button');
      impBtn.className = 'tb-btn';
      impBtn.innerHTML = '📥 导入Excel';
      impBtn.style.cssText = btnStyle.replace('#22d3ee','#f59e0b');
      impBtn.onclick = function() {
        var sec = sectionFromBodyId(tbody.id);
        if (sec) showFrontImport(sec);
      };
      addBar.appendChild(impBtn);
      var savBtn = document.createElement('button');
      savBtn.className = 'tb-btn';
      savBtn.innerHTML = '💾 保存';
      savBtn.style.cssText = btnStyle.replace('#22d3ee','#27ae60');
      savBtn.onclick = function() {
        var sec = sectionFromBodyId(tbody.id);
        if (sec) saveOneSection(sec);
      };
      addBar.appendChild(savBtn);
      table.parentNode.insertBefore(addBar, table.nextSibling);
    }
  });
  // 凭证字段上传功能
  if (typeof enableFileUploadOnFields === 'function') enableFileUploadOnFields();
}

// 按表格新增行（知道具体是哪个表）
function perTableAddRow(bodyId) {
  var section = sectionFromBodyId(bodyId);
  if (!section) return;
  // 直接从 DataStore 取最新数据（允许空表新增）
  if (typeof DataStore === 'undefined' || !Array.isArray(DataStore[section])) {
    showToast('⏳ 数据加载中，请稍后再试', 'warning');
    return;
  }
  var data = JSON.parse(JSON.stringify(DataStore[section]));
  // 根据 bodyId 确定默认值
  var defaults = {date:'', amount:0, summary:''};
  if (bodyId === 'capitalBody') defaults = {date:'', name:'', amount:0, method:'银行转账', voucher:''};
  else if (bodyId === 'bankFlowBody') defaults = {date:'', income:0, expense:0, counterparty_account:'', counterparty_name:'', purpose:'', summary:''};
  else if (bodyId === 'pettyRenDrawBody' || bodyId === 'pettyPangDrawBody') {
    var person = bodyId === 'pettyRenDrawBody' ? '任海涛' : '庞尚韬';
    defaults = {date:'', person:person, type:'领用', amount:0, account:'', summary:''};
  } else if (bodyId === 'pettyRenWriteBody' || bodyId === 'pettyPangWriteBody') {
    var person = bodyId === 'pettyRenWriteBody' ? '任海涛' : '庞尚韬';
    defaults = {date:'', person:person, type:'核销', amount:0, summary:'', voucher:''};
  } else if (bodyId === 'receivableBody') defaults = {date:'', party:'', amount:0, reason:'', status:'未收回'};
  else if (bodyId === 'assetBody') defaults = {date:'', name:'', amount:0, location:'', status:'在用'};
  else if (bodyId === 'managementBody') defaults = {date:'', category:'', amount:0, summary:'', invoices:''};
  else if (bodyId === 'salaryBody') defaults = {month:'', name:'', position:'', amount:0, payDate:'', voucher:''};
  else if (bodyId === 'salaryTempBody') defaults = {month:'', name:'施前华', position:'临时工', amount:0, payDate:'', voucher:''};
  else if (bodyId === 'reimburseRenBody' || bodyId === 'reimbursePangBody' || bodyId === 'reimburseYingBody') {
    var pmap = {reimburseRenBody:'任海涛', reimbursePangBody:'庞尚韬', reimburseYingBody:'应红林'};
    defaults = {date:'', person:pmap[bodyId], amount:0, reason:'', docs:[]};
  } else if (bodyId === 'baseJinyinhuaBody' || bodyId === 'baseDangshenBody' || bodyId === 'baseSeedlingBody') {
    var bmap = {baseJinyinhuaBody:'金银花基地', baseDangshenBody:'党参基地', baseSeedlingBody:'党参育苗基地'};
    defaults = {date:'', base:bmap[bodyId], item:'', amount:0, note:'', invoices:''};
  } else if (bodyId === 'baseDetailBody') {
    defaults = {date:'', category:'', item:'', amount:0, note:'', invoices:''};
  } else if (bodyId === 'tempLaborBody') {
    defaults = {date:'', headcount:1, work_content:'', amount:120, notes:''};
  }
  data.push(defaults);
  localStorage.setItem('wyx_' + section, JSON.stringify(data));
  syncDataStore(section, data);
  try { renderAll(); updateSummary(); } catch(e) { console.error(e); }
  if (EDIT_MODE) setTimeout(enableEditModeUI, 50);
  showToast('✅ 已新增一行', 'success');
}

// 双机编辑保存
window.onCellEdit = function(td, newVal) {
  if (!EDIT_MODE) return;
  var tr = td.closest('tr');
  var tbody = tr.closest('tbody');
  if (!tbody) return;
  var bodyId = tbody.id;
  var fields = COL_FIELDS[bodyId];
  if (!fields) return;
  var idx = parseInt(tr.getAttribute('data-idx'));
  if (isNaN(idx)) return;

  // 找到对应的 section 和字段
  var section = sectionFromBodyId(bodyId);
  if (!section) return;
  var tdIdx = Array.from(tr.children).indexOf(td);
  var field = fields[tdIdx];
  if (!field || field === '_link') return;

  // 更新 localStorage（如果为空则从 DataStore 恢复）
  var data = JSON.parse(localStorage.getItem('wyx_' + section)) || [];
  if (data.length === 0 && typeof DataStore !== 'undefined' && Array.isArray(DataStore[section])) {
    data = JSON.parse(JSON.stringify(DataStore[section]));
    localStorage.setItem('wyx_' + section, JSON.stringify(data));
  }
  if (idx >= data.length) return;
  if (field === 'docs') {
    var arr = Array.isArray(data[idx].docs) ? data[idx].docs : [];
    if (newVal && arr.indexOf(newVal) < 0) arr.push(newVal);
    data[idx].docs = arr;
  } else {
    data[idx][field] = field === 'amount' ? (parseFloat(newVal) || 0) : newVal;
  }
  localStorage.setItem('wyx_' + section, JSON.stringify(data));

  // 同步 DataStore
  syncDataStore(section, data);
  try { renderAll(); updateSummary(); } catch(e) {}
};

function sectionFromBodyId(bodyId) {
  var map = {
    capitalBody:'capital', bankFlowBody:'bankFlow',
    pettyRenDrawBody:'pettyDraw', pettyPangDrawBody:'pettyDraw',
    pettyRenWriteBody:'pettyWrite', pettyPangWriteBody:'pettyWrite',
    receivableBody:'receivable', assetBody:'asset', managementBody:'management',
    salaryBody:'salary', salaryTempBody:'salary',
    reimburseRenBody:'reimburse', reimbursePangBody:'reimburse', reimburseYingBody:'reimburse',
    baseJinyinhuaBody:'baseExpense', baseDangshenBody:'baseExpense', baseSeedlingBody:'baseExpense', baseDetailBody:'baseExpense',
    companyInfoBody:'companyInfo', contractsBody:'contracts', bankAccountsBody:'bankAccounts',
    tempLaborBody:'tempLabor'
  };
  return map[bodyId] || null;
}

function syncDataStore(section, data) {
  if (typeof DataStore === 'undefined') return;
  if (section === 'pettyDraw') {
    DataStore.pettyDraw = data;
    DataStore._pettyCashFlat = data;
    DataStore.pettyCash = {
      ren: data.filter(function(r){return r.person==='任海涛';}),
      pang: data.filter(function(r){return r.person==='庞尚韬';})
    };
    DataStore.pettyWrite = data.filter(function(r){return r.type==='核销';});
  } else if (section === 'pettyWrite') {
    DataStore.pettyWrite = data;
    DataStore._pettyCashFlat = data;
    DataStore.pettyCash = {
      ren: data.filter(function(r){return r.person==='任海涛';}),
      pang: data.filter(function(r){return r.person==='庞尚韬';})
    };
    DataStore.pettyDraw = data.filter(function(r){return r.type==='领用';});
  } else if (section === 'reimburse') {
    DataStore.reimburse = data;
    DataStore._reimburseFlat = data;
  } else {
    DataStore[section] = data;
  }
}

function deleteRow(bodyId, idx) {
  if (!confirm('确定删除此行？')) return;
  var section = sectionFromBodyId(bodyId);
  if (!section) return;
  var data = JSON.parse(localStorage.getItem('wyx_' + section)) || [];
  if (data.length === 0 && typeof DataStore !== 'undefined' && Array.isArray(DataStore[section])) {
    data = JSON.parse(JSON.stringify(DataStore[section]));
  }
  data.splice(idx, 1);
  localStorage.setItem('wyx_' + section, JSON.stringify(data));
  syncDataStore(section, data);
  try { renderAll(); updateSummary(); } catch(e) { console.error(e); }
  showToast('✅ 已删除（点💾保存存到服务器）', 'success');
}

function enableInlineEditing() {
  if (!EDIT_MODE) return;
  document.querySelectorAll('.data-table tbody tr').forEach(function(tr, idx) {
    tr.style.cursor = 'pointer';
    tr.addEventListener('dblclick', function(e) {
      if (!EDIT_MODE) return;
      var td = e.target.closest('td');
      if (!td || td.querySelector('input,select,button,.del-btn,.op-cell')) return;
      var val = td.textContent.trim().replace(/[¥,]/g, '');
      // 检测是否是日期字段，自动用日期选择器
      var trEl = td.closest('tr'), tbody = trEl.closest('tbody');
      var fields = window.COL_FIELDS && window.COL_FIELDS[tbody.id];
      var tdIdx = Array.from(trEl.children).indexOf(td);
      var isDate = fields && fields[tdIdx] && (fields[tdIdx].indexOf('date') >= 0 || fields[tdIdx] === 'month' || fields[tdIdx] === 'payDate');
      var inp = document.createElement('input');
      inp.className = 'editable-input';
      inp.type = isDate ? 'date' : 'text';
      inp.value = isDate ? val.replace(/(\d{4})-(\d{1,2})-(\d{1,2}).*$/, '$1-$2-$3') : val;
      inp.style.width = Math.max(60, td.offsetWidth - 10) + 'px';
      td.textContent = '';
      td.appendChild(inp);
      inp.focus();
      inp.onblur = function() {
        td.textContent = inp.value;
        if (window.onCellEdit) window.onCellEdit(td, inp.value);
      };
      inp.onkeydown = function(ev) {
        if (ev.key === 'Enter') inp.blur();
      };
    });
  });
}

// 观察DOM变化自动启用编辑和删除按钮
var editObserver = new MutationObserver(function() {
  if (EDIT_MODE) {
    setTimeout(function() {
      enableInlineEditing();
      enableEditModeUI();
    }, 100);
  }
});
document.addEventListener('DOMContentLoaded', function() {
  editObserver.observe(document.body, { childList: true, subtree: true });
});


// === 前台编辑功能 ===
function getCurrentSection() {
  return window.frontSection || 'capital';
}

function addFrontRow() {
  var section = getCurrentSection();
  // 优先从 localStorage 读取，如果为空则从 DataStore 恢复（防止覆盖服务器数据）
  var data = JSON.parse(localStorage.getItem('wyx_' + section)) || [];
  if (data.length === 0 && typeof DataStore !== 'undefined' && Array.isArray(DataStore[section])) {
    data = DataStore[section].slice();
  }
  var cols = {
    capital: {date:'', name:'', amount:0, method:'银行转账', voucher:''},
    bankFlow: {date:'', income:0, expense:0, counterparty_account:'', counterparty_name:'', purpose:'', summary:''},
    pettyDraw: {date:'', person:'任海涛', type:'领用', amount:0, summary:'', voucher:''},
    pettyWrite: {date:'', person:'庞尚韬', type:'核销', amount:0, summary:'', voucher:''},
    reimburse: {date:'', person:'任海涛', amount:0, reason:'', docs:[]},
    receivable: {date:'', party:'', amount:0, reason:'', status:'未收回'},
    asset: {date:'', name:'', amount:0, location:'', status:'在用'},
    management: {date:'', category:'', amount:0, summary:'', invoices:''},
    salary: {month:'', name:'', position:'', amount:0, payDate:'', voucher:''},
    baseExpense: {date:'', base:'金银花基地', item:'', amount:0, note:'', invoices:''}
  };
  data.push(cols[section] || {});
  localStorage.setItem('wyx_' + section, JSON.stringify(data));
  // 同步 DataStore 并刷新
  if (typeof DataStore !== 'undefined') {
    if (section === 'pettyDraw') {
      DataStore.pettyDraw = (DataStore.pettyDraw || []).concat(data.slice(-1));
      DataStore._pettyCashFlat = (DataStore._pettyCashFlat || []).concat(data.slice(-1));
      DataStore.pettyCash = {
        ren: (DataStore._pettyCashFlat||[]).filter(function(r){ return r.person === '任海涛'; }),
        pang: (DataStore._pettyCashFlat||[]).filter(function(r){ return r.person === '庞尚韬'; })
      };
      DataStore.pettyWrite = (DataStore._pettyCashFlat||[]).filter(function(r){ return r.type === '核销'; });
    } else if (section === 'pettyWrite') {
      DataStore.pettyWrite = (DataStore.pettyWrite || []).concat(data.slice(-1));
      DataStore._pettyCashFlat = (DataStore._pettyCashFlat || []).concat(data.slice(-1));
      DataStore.pettyCash = {
        ren: (DataStore._pettyCashFlat||[]).filter(function(r){ return r.person === '任海涛'; }),
        pang: (DataStore._pettyCashFlat||[]).filter(function(r){ return r.person === '庞尚韬'; })
      };
      DataStore.pettyDraw = (DataStore._pettyCashFlat||[]).filter(function(r){ return r.type === '领用'; });
    } else {
      DataStore[section] = data;
    }
  }
  try { renderAll(); updateSummary(); } catch(e) { console.error(e); }
  showToast('✅ 已新增一行', 'success');
}

function showFrontImport(section) {
  document.getElementById('importOverlay').style.display = 'block';
  document.getElementById('importModal').style.display = 'block';
  // 如果指定了版块，预选
  if (section) {
    var sel = document.getElementById('frontImportSection');
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === section) { sel.selectedIndex = i; break; }
    }
  }
  // 重置人员选择状态
  var grp = document.getElementById('frontImportPersonGroup');
  if (grp) { grp.style.display = 'none'; if (section === 'pettyDraw' || section === 'pettyWrite') grp.style.display = 'block'; }
}

function saveOneSection(section) {
  var data = JSON.parse(localStorage.getItem('wyx_' + section)) || [];
  if (data.length === 0 && typeof DataStore !== 'undefined' && Array.isArray(DataStore[section])) {
    data = JSON.parse(JSON.stringify(DataStore[section]));
  }
  if (data.length === 0) { showToast('⚠️ 该版块暂无数据', 'error'); return; }
  var apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : (window.location.pathname.startsWith('/finance/') ? '/finance' : ''));
  fetch(apiBase + '/api/public/save/' + section, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({data: data, password: '87700020'})
  }).then(function() { showToast('✅ 保存成功', 'success'); })
  .catch(function() { showToast('❌ 保存失败', 'error'); });
}

function toggleFrontImportPerson() {
  var sec = document.getElementById('frontImportSection').value;
  document.getElementById('frontImportPersonGroup').style.display = (sec === 'pettyDraw' || sec === 'pettyWrite') ? 'block' : 'none';
}

function closeFrontImport() {
  document.getElementById('importOverlay').style.display = 'none';
  document.getElementById('importModal').style.display = 'none';
}

function confirmFrontImport() {
  var file = document.getElementById('frontFileInput').files[0];
  if (!file) { alert('请选择文件'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'array'});
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var json = XLSX.utils.sheet_to_json(sheet, {header:1});
      if (json.length < 2) { alert('Excel数据为空'); return; }
      var section = document.getElementById('frontImportSection').value;
      var existing = JSON.parse(localStorage.getItem('wyx_' + section)) || [];
      // 中文列名 -> 英文字段名映射（支持模糊匹配）
      var FIELD_MAP = {
        '日期':'date','时间':'date','交易时间':'date','领用时间':'date',
        '月份':'month','发放日期':'payDate',
        '人员':'person','姓名':'name','员工':'name',
        '类别':'category','类型':'type','费用类别':'category',
        '金额':'amount','收入金额':'amount','支出金额':'amount','领用金额':'amount','核销金额':'amount',
        '收入':'income','支出':'expense',
        '摘要':'summary','说明':'note','备注':'note','事由':'reason',
        '来源':'account','来源/归处':'account','账户':'account','账号':'account',
        '户名':'accountName','账户名':'accountName',
        '对方账户':'counterparty_account','对方户名':'counterparty_name','用途':'purpose',
        '凭证':'voucher','发票':'invoices','单据文件':'docs',
        '状态':'status','存放地点':'location','资产名称':'name',
        '欠款方':'party','岗位':'position','基地':'base','支出项目':'item',
        '出资方式':'method','入账凭据':'voucher'
      };
      var headers = json[0];
      // 把列名映射成英文字段（自动去空格）
      var colKeys = [];
      for (var j = 0; j < headers.length; j++) {
        var h = String(headers[j]||'').trim();
        colKeys[j] = FIELD_MAP[h] || h;
      }
      var NUM_FIELDS = ['amount','income','expense','领用金额','核销金额','收入金额','支出金额','金额'];
      for (var i = 1; i < json.length; i++) {
        var row = {};
        var hasData = false;
        for (var j = 0; j < colKeys.length; j++) {
          var val = json[i][j];
          if (val === undefined || val === null) val = '';
          else { val = String(val).trim(); hasData = true; }
          // 金额字段转数字
          if (NUM_FIELDS.indexOf(colKeys[j]) >= 0 || NUM_FIELDS.indexOf(headers[j]) >= 0) {
            val = parseFloat(val) || 0;
          }
          row[colKeys[j]] = val;
        }
        if (!hasData) continue; // 跳过空行
        existing.push(row);
      }
      // 备用金子选项：自动设置人员和类型
      if (section === 'pettyDraw') {
        var p = document.getElementById('frontImportPerson').value;
        existing.forEach(function(r) { r.person = p; r.type = '领用'; });
      } else if (section === 'pettyWrite') {
        var p = document.getElementById('frontImportPerson').value;
        existing.forEach(function(r) { r.person = p; r.type = '核销'; });
      }
      localStorage.setItem('wyx_' + section, JSON.stringify(existing));
      // 同步到 DataStore 让数据立即显示
      if (typeof DataStore !== 'undefined') {
        if (section === 'pettyDraw') {
          DataStore.pettyDraw = existing;
          DataStore._pettyCashFlat = existing;
          DataStore.pettyCash = {
            ren: existing.filter(function(r){ return r.person === '任海涛'; }),
            pang: existing.filter(function(r){ return r.person === '庞尚韬'; })
          };
          DataStore.pettyWrite = existing.filter(function(r){ return r.type === '核销'; });
        } else if (section === 'pettyWrite') {
          DataStore.pettyWrite = existing;
          DataStore._pettyCashFlat = existing;
          DataStore.pettyCash = {
            ren: existing.filter(function(r){ return r.person === '任海涛'; }),
            pang: existing.filter(function(r){ return r.person === '庞尚韬'; })
          };
          DataStore.pettyDraw = existing.filter(function(r){ return r.type === '领用'; });
        } else {
          DataStore[section] = existing;
        }
      }
      closeFrontImport();
      try { renderAll(); updateSummary(); } catch(e) { console.error(e); }
    } catch(err) {
      alert('导入失败: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function saveFrontData() {
  showToast('⏳ 保存中...', 'info');
  var sections = ['capital','bankFlow','pettyDraw','pettyWrite','reimburse','receivable','asset','management','salary','baseExpense','tempLabor','tempWorkers','agentExpenses'];
  var done = 0, total = sections.length;
  var apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : (window.location.pathname.startsWith('/finance/') ? '/finance' : ''));
  sections.forEach(function(s) {
    var data = JSON.parse(localStorage.getItem('wyx_' + s)) || [];
    if (data.length === 0 && typeof DataStore !== 'undefined' && Array.isArray(DataStore[s])) {
      data = JSON.parse(JSON.stringify(DataStore[s]));
    }
    if (data.length === 0) { done++; if (done === total) showToast('✅ 全部保存成功', 'success'); return; }
    fetch(apiBase + '/api/public/save/' + s, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({data: data, password: '87700020'})
    }).then(function() {
      done++;
      if (done === total) showToast('✅ 全部保存成功', 'success');
    }).catch(function() {
      done++;
      if (done === total) showToast('✅ 全部保存成功', 'success');
    });
  });
}
