// ===== 五源兴 · 后台管理 =====

// === API基础路径 ===
var API_BASE = (typeof window !== 'undefined' && window.location.pathname.startsWith('/finance/')) ? '/finance' : '';

// === 数据管理 ===
var DB = {
  get: function(key) {
    try { return JSON.parse(localStorage.getItem('wyx_' + key)) || []; } catch(e) { return []; }
  },
  set: function(key, data, noSync) {
    localStorage.setItem('wyx_' + key, JSON.stringify(data));
    if (!noSync) { DB.syncToServer(key, data); showSaved(); }
  },
  getAll: function() {
    var sections = ['incomeExpense','capital','bankFlow','income','pettyCash','reimburse','receivable','asset','management','salary','baseExpense','companyInfo','contracts','bankAccounts'];
    var all = {};
    sections.forEach(function(s) { all[s] = DB.get(s); });
    return all;
  },
  importAll: function(data) {
    for (var k in data) { DB.set(k, data[k]); }
  },
  // API同步（带状态反馈）
  syncToServer: function(section, data) {
    if (!window.API_TOKEN) { console.warn('未登录，无法同步'); return false; }
    var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    fetch(apiBase + '/api/data/' + section, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.API_TOKEN },
      body: JSON.stringify({ data: data })
    }).then(function(r) {
      if (r.ok) { console.log('✅ 已同步 ' + section + ' ' + data.length + '条'); return true; }
      else { console.error('❌ 同步 ' + section + ' 失败:', r.status); return false; }
    }).catch(function(e) { console.error('❌ 同步 ' + section + ' 网络错误:', e); });
    return true;
  },
  loadFromServer: function(section, callback) {
    if (!window.API_TOKEN) { if (callback) callback(DB.get(section)); return; }
    fetch(API_BASE + '/api/data/' + section, { headers: { 'Authorization': 'Bearer ' + window.API_TOKEN } })
      .then(function(r) { if (r.ok) return r.json(); throw 'err'; })
      .then(function(data) {
        if (data.length > 0) localStorage.setItem('wyx_' + section, JSON.stringify(data));
        if (callback) callback(data);
      })
      .catch(function() { if (callback) callback(DB.get(section)); });
  },
  // 批量从服务器加载全部
  loadAllFromServer: function(callback) {
    var sections = ['incomeExpense','capital','bankFlow','income','pettyCash','reimburse','receivable','asset','management','salary','baseExpense','companyInfo','contracts','bankAccounts'];
    var loaded = 0;
    sections.forEach(function(s) {
      DB.loadFromServer(s, function() {
        loaded++;
        if (loaded === sections.length && callback) callback();
      });
    });
  }
};

// === 版块列定义 ===
var COLUMNS = {
  incomeExpense: [
    {key:'date', label:'日期', type:'date'},
    {key:'type', label:'类型', type:'select', options:['收入','支出']},
    {key:'summary', label:'摘要/说明', type:'text'},
    {key:'income', label:'收入', type:'number'},
    {key:'expense', label:'支出', type:'number'},
    {key:'balance', label:'余额', type:'number'},
    {key:'invoices', label:'发票链接', type:'text'}
  ],
  capital: [
    {key:'date', label:'日期', type:'date'},
    {key:'name', label:'股东姓名', type:'text'},
    {key:'amount', label:'金额', type:'number'},
    {key:'method', label:'出资方式', type:'select', options:['银行转账','现金','实物','其他']},
    {key:'voucher', label:'入账凭据', type:'text'}
  ],
  bankFlow: [
    {key:'date', label:'交易时间', type:'text'},
    {key:'income', label:'收入金额', type:'number'},
    {key:'expense', label:'支出金额', type:'number'},
    {key:'counterparty_account', label:'对方账号', type:'text'},
    {key:'counterparty_name', label:'对方户名', type:'text'},
    {key:'purpose', label:'交易用途', type:'text'},
    {key:'summary', label:'摘要', type:'text'}
  ],
  income: [
    {key:'date', label:'日期', type:'date'},
    {key:'category', label:'类别', type:'text'},
    {key:'amount', label:'金额', type:'number'},
    {key:'source', label:'来源/归处', type:'text'},
    {key:'voucher', label:'凭证', type:'text'}
  ],
  pettyCash: [
    {key:'date', label:'日期', type:'date'},
    {key:'person', label:'人员', type:'select', options:['任海涛','庞尚韬']},
    {key:'type', label:'类型', type:'select', options:['领用','核销']},
    {key:'amount', label:'金额', type:'number'},
    {key:'summary', label:'摘要', type:'text'},
    {key:'voucher', label:'凭证', type:'text'}
  ],
  reimburse: [
    {key:'date', label:'日期', type:'date'},
    {key:'person', label:'人员', type:'select', options:['任海涛','庞尚韬','应红林']},
    {key:'amount', label:'金额', type:'number'},
    {key:'reason', label:'事由', type:'text'},
    {key:'docs', label:'单据文件', type:'text'},
    {key:'payment_method', label:'支付方式', type:'select', options:['','公司账户支付','备用金抵扣']}
  ],
  receivable: [
    {key:'date', label:'日期', type:'date'},
    {key:'party', label:'欠款方', type:'text'},
    {key:'amount', label:'金额', type:'number'},
    {key:'reason', label:'事由', type:'text'},
    {key:'status', label:'状态', type:'select', options:['未收回','部分收回','已收回']}
  ],
  asset: [
    {key:'date', label:'日期', type:'date'},
    {key:'name', label:'资产名称', type:'text'},
    {key:'amount', label:'金额', type:'number'},
    {key:'location', label:'存放地点', type:'text'},
    {key:'status', label:'状态', type:'select', options:['在用','闲置','已报废']}
  ],
  management: [
    {key:'date', label:'日期', type:'date'},
    {key:'category', label:'费用类别', type:'text'},
    {key:'amount', label:'金额', type:'number'},
    {key:'summary', label:'说明', type:'text'},
    {key:'invoices', label:'凭证', type:'text'}
  ],
  salary: [
    {key:'month', label:'月份', type:'month'},
    {key:'name', label:'姓名', type:'text'},
    {key:'position', label:'岗位', type:'text'},
    {key:'amount', label:'金额', type:'number'},
    {key:'payDate', label:'发放日期', type:'date'},
    {key:'voucher', label:'凭证', type:'text'}
  ],
  baseExpense: [
    {key:'date', label:'日期', type:'date'},
    {key:'base', label:'基地', type:'select', options:['金银花基地','党参基地','党参育苗基地']},
    {key:'item', label:'支出项目', type:'text'},
    {key:'amount', label:'金额', type:'number'},
    {key:'note', label:'说明', type:'text'},
    {key:'invoices', label:'凭证', type:'text'}
  ],
  bankAccounts: [
    {key:'bank_name', label:'银行', type:'text'},
    {key:'account_name', label:'户名', type:'text'},
    {key:'account_number', label:'账号', type:'text'},
    {key:'balance', label:'余额', type:'number'},
    {key:'note', label:'备注', type:'text'}
  ],
  contracts: [
    {key:'date', label:'日期', type:'date'},
    {key:'contract_name', label:'合同名称', type:'text'},
    {key:'party', label:'签约方', type:'text'},
    {key:'amount', label:'金额', type:'number'},
    {key:'status', label:'状态', type:'select', options:['进行中','已完成','已终止']},
    {key:'note', label:'备注', type:'text'}
  ],
  companyInfo: [
    {key:'field_name', label:'项目', type:'text'},
    {key:'field_value', label:'内容', type:'text'}
  ]
};

var SECTION_NAMES = {
  incomeExpense:'基本账户收支', capital:'股本金', income:'收入',
  pettyCash:'备用金', reimburse:'报销', receivable:'应收账款',
  asset:'固定资产', management:'管理费用', salary:'工资', baseExpense:'基地支出', bankFlow:'公司基本户收支', bankAccounts:'银行账户', contracts:'合同管理', companyInfo:'公司信息'
};

var currentSection = 'incomeExpense';

// === 初始化 ===
document.addEventListener('DOMContentLoaded', function() {
  initSampleData();
  switchSection('incomeExpense');
  updateColumnGuide();
});

function initSampleData() {
  // 如果没有数据，初始化示例数据
  var sections = Object.keys(COLUMNS);
  var hasData = false;
  sections.forEach(function(s) {
    if (DB.get(s).length > 0) hasData = true;
  });
  if (!hasData && typeof DataStore !== 'undefined') {
    // 从DataStore导入初始数据
    DB.set('incomeExpense', DataStore.incomeExpense || []);
    DB.set('capital', DataStore.capital || []);
    DB.set('income', DataStore.income || []);
    DB.set('pettyCash', DataStore.pettyCash ? DataStore.pettyCash.ren.concat(DataStore.pettyCash.pang) : []);
    DB.set('reimburse', (DataStore.reimburse ? (DataStore.reimburse.ren || []).concat(DataStore.reimburse.pang || []).concat(DataStore.reimburse.ying || []) : []));
    DB.set('receivable', DataStore.receivable || []);
    DB.set('asset', DataStore.asset || []);
    DB.set('management', DataStore.management || []);
    DB.set('salary', DataStore.salary || []);
    var bases = [];
    if (DataStore.baseExpense) {
      (DataStore.baseExpense.jinyinhua || []).forEach(function(r) { r.base='金银花基地'; bases.push(r); });
      (DataStore.baseExpense.dangshen || []).forEach(function(r) { r.base='党参基地'; bases.push(r); });
      (DataStore.baseExpense.seedling || []).forEach(function(r) { r.base='党参育苗基地'; bases.push(r); });
    }
    DB.set('baseExpense', bases);
  }
}

// === 标签切换 ===
document.querySelectorAll('.tool-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tool-tab').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    switchSection(btn.dataset.section);
  });
});

function switchSection(section) {
  // diagnostic removed
  currentSection = section;
  $title('sectionTitle').textContent = SECTION_NAMES[section] || section;
  renderEditTable(section);
}

// === 渲染可编辑表格 ===
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'\\n');
}

// === 单元格编辑 ===
function editCell(el) {
  var row = parseInt(el.dataset.row);
  var col = el.dataset.col;
  var val = el.value;
  var data = DB.get(currentSection);

  // 处理发票字段（分号分隔转数组）
  if (col === 'invoices' || col === 'docs') {
    data[row][col] = val ? val.split(';').map(function(s) { return s.trim(); }).filter(Boolean) : [];
  } else if (el.type === 'number') {
    data[row][col] = parseFloat(val) || 0;
  } else {
    data[row][col] = val;
  }

  DB.set(currentSection, data);
  showSaved();
}

// === 新增行 ===
function addRow() {
  var cols = COLUMNS[currentSection];
  var row = {};
  cols.forEach(function(c) {
    if (c.type === 'number') row[c.key] = 0;
    else if (c.type === 'select') row[c.key] = c.options[0];
    else if (c.key === 'invoices' || c.key === 'docs') row[c.key] = [];
    else row[c.key] = '';
  });
  row.date = new Date().toISOString().slice(0,10);
  row._key = 'k' + Date.now() + Math.random().toString(36).slice(2,6);
  if (currentSection === 'reimburse') row.reimburse_date = row.date;

  var data = DB.get(currentSection);
  data.push(row);
  DB.set(currentSection, data);
  renderEditTable(currentSection);
  showSaved();
}

// === 删除行 ===
function deleteRow(idx) {
  if (!confirm('确定删除第 ' + (idx+1) + ' 行？')) return;
  var data = DB.get(currentSection);
  data.splice(idx, 1);
  DB.set(currentSection, data);
  renderEditTable(currentSection);
  showSaved();
}

// === 导入Excel ===
function showImportModal() {
  $id('importModal').classList.add('show');
  $id('importOverlay').classList.add('show');
  $id('importPreview').innerHTML = '';
}

function closeImportModal() {
  $id('importModal').classList.remove('show');
  $id('importOverlay').classList.remove('show');
}

var importedData = [];

$id('fileInput').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'array'});
      var preview = $id('importPreview');
      var section = $id('importSection').value;
      var cols = COLUMNS[section];
      var sheetName = wb.SheetNames[0];
      var sheet = wb.Sheets[sheetName];
      var json = XLSX.utils.sheet_to_json(sheet, {header:1});

      // 找到表头行（匹配列名）
      var headerRow = -1;
      var headerMap = {};
      var colKeys = cols.map(function(c) { return c.key; });
      var colLabels = cols.map(function(c) { return c.label; });

      for (var i = 0; i < json.length; i++) {
        var row = json[i];
        if (!row || row.length === 0) continue;
        for (var j = 0; j < row.length; j++) {
          var cell = String(row[j] || '').trim();
          if (colLabels.indexOf(cell) !== -1) {
            headerRow = i;
            // 映射列索引到key
            row.forEach(function(h, hi) {
              var idx = colLabels.indexOf(String(h).trim());
              if (idx !== -1) headerMap[hi] = colKeys[idx];
            });
            break;
          }
        }
        if (headerRow !== -1) break;
      }

      if (headerRow === -1) {
        preview.innerHTML = '<p style="color:red;font-weight:700">❌ 未找到匹配的表头，请确保表头列名与系统一致</p>';
        return;
      }

      // 解析数据行
      importedData = [];
      for (var i = headerRow + 1; i < json.length; i++) {
        var rowData = json[i];
        if (!rowData || rowData.length === 0) continue;
        // 跳过空行
        var hasValue = false;
        for (var j = 0; j < rowData.length; j++) {
          if (rowData[j] !== undefined && rowData[j] !== null && rowData[j] !== '') { hasValue = true; break; }
        }
        if (!hasValue) continue;

        var item = {};
        for (var j in headerMap) {
          var key = headerMap[j];
          var val = rowData[j];
          if (colKeys.indexOf(key) !== -1) {
            if (key === 'invoices' || key === 'docs') {
              item[key] = val ? String(val).split(/[;,，、]/).map(function(s){return s.trim();}).filter(Boolean) : [];
            } else if (typeof val === 'number') {
              item[key] = val;
            } else {
              item[key] = val !== undefined && val !== null ? String(val).trim() : '';
            }
          }
        }
        importedData.push(item);
      }

      // 预览
      if (importedData.length === 0) {
        preview.innerHTML = '<p style="color:orange;font-weight:700">⚠️ 未解析到数据行</p>';
        return;
      }
      var html = '<p style="font-weight:700;margin-bottom:8px">📋 解析到 ' + importedData.length + ' 条数据，预览前5条：</p>';
      html += '<table class="preview-table"><thead><tr>';
      cols.forEach(function(c) { html += '<th>' + c.label + '</th>'; });
      html += '</tr></thead><tbody>';
      var previewCount = Math.min(importedData.length, 5);
      for (var i = 0; i < previewCount; i++) {
        html += '<tr>';
        cols.forEach(function(c) {
          var val = importedData[i][c.key];
          if (Array.isArray(val)) val = val.join('; ');
          html += '<td>' + (val !== undefined && val !== null ? val : '') + '</td>';
        });
        html += '</tr>';
      }
      html += '</tbody></table>';
      preview.innerHTML = html;
    } catch(err) {
      $id('importPreview').innerHTML = '<p style="color:red;font-weight:700">❌ 解析失败: ' + err.message + '</p>';
    }
  };
  reader.readAsArrayBuffer(file);
});

function confirmImport() {
  if (importedData.length === 0) { alert('请先选择Excel文件并确认数据正确'); return; }
  var section = $id('importSection').value;
  var existing = DB.get(section);
  var merged = existing.concat(importedData);
  DB.set(section, merged);
  importedData = [];
  closeImportModal();
  switchSection(section);
  showSaved();
  alert('✅ 成功导入 ' + (merged.length - existing.length) + ' 条数据到「' + SECTION_NAMES[section] + '」');
}

// === 导出Excel ===
function exportData() {
  var data = DB.get(currentSection);
  var cols = COLUMNS[currentSection];
  if (data.length === 0) { alert('当前版块无数据可导出'); return; }

  var wb = XLSX.utils.book_new();
  var exportData = data.map(function(row) {
    var obj = {};
    cols.forEach(function(c) {
      var val = row[c.key];
      obj[c.label] = Array.isArray(val) ? val.join('; ') : (val !== undefined && val !== null ? val : '');
    });
    return obj;
  });
  var ws = XLSX.utils.json_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, ws, SECTION_NAMES[currentSection]);
  var fileName = '五源兴_' + SECTION_NAMES[currentSection] + '_' + new Date().toISOString().slice(0,10) + '.xlsx';
  XLSX.writeFile(wb, fileName);
}

// === 清空确认 ===
function confirmClear() {
  var name = SECTION_NAMES[currentSection];
  if (!confirm('⚠️ 确定清空「' + name + '」所有数据？此操作不可撤销！')) return;
  if (!confirm('再次确认：清空 ' + DB.get(currentSection).length + ' 条数据？')) return;
  DB.set(currentSection, []);
  switchSection(currentSection);
  showSaved();
}

// === 更新列名提示 ===

function switchPersonTab(person, btn) {
  var p = btn.closest('.data-editor');
  if (p) { p.querySelectorAll('.sub-tab-btn').forEach(function(b){b.classList.remove('active')});p.querySelectorAll('.person-section').forEach(function(s){s.style.display='none'}); }
  btn.classList.add('active');
  var sec = document.getElementById('person_' + person);
  if (sec) sec.style.display = 'block';
}

function updateColumnGuide() {
  var html = '';
  for (var key in COLUMNS) {
    html += '<div class="cg-section"><span class="cg-name">' + SECTION_NAMES[key] + '</span>' +
      '<span class="cg-cols">' + COLUMNS[key].map(function(c) { return c.label; }).join(' ｜ ') + '</span></div>';
  }
  $id('columnGuide').innerHTML = html;
}

// === 工具函数 ===
function $id(id) { return document.getElementById(id); }
function $title(id) { return document.getElementById(id); }

var saveTimer = null;
function showToast(msg, type) {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var t = document.createElement('div');
  t.className = 'toast-msg ' + (type || 'success');
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 3000);
}

function showSaved(msg) {
  var el = $id('saveStatus');
  if (!el) return;
  el.textContent = '💾 ' + (msg || '保存中...');
  el.style.color = '#f39c12';
  el.classList.remove('save-flash');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function() {
    el.textContent = '✅ ' + (msg || '已保存');
    el.style.color = '#27ae60';
    el.classList.add('save-flash');
  }, msg ? 100 : 300);
}

// === 报销支付方式批量保存（之前遗漏的函数！） ===
function updateBatchPayment(el) {
  var date = el.dataset.date;
  var person = el.dataset.person;
  var val = el.value;
  var data = DB.get('reimburse');
  data.forEach(function(row) {
    if (row.person === person && row.reimburse_date === date) {
      row.payment_method = val;
    }
  });
  DB.set('reimburse', data);
  showSaved();
}

// === 显式保存按钮 ===
function saveData() {
  var data = DB.get(currentSection);
  DB.set(currentSection, data);
  showSaved();
  // 所有保存按钮文字反馈（顶部+底部）
  var btns = document.querySelectorAll('.btn-save');
  btns.forEach(function(btn) {
    btn.textContent = '✅ 已保存';
    btn.style.background = '#D35400';
    setTimeout(function() {
      btn.textContent = '💾 保存数据';
      btn.style.background = '';
    }, 1500);
  });
}

// === M-IuM-4vM-^XM-iM-uM-^PM-M-dM-^MM-!M-gM-^LM-^M-fM-^MM-^LM-dM-^MM-^M-dM-^M-^XM-dM-^MM-!M-gM-^LM-^M-dM-^MM-;M-fM-^LM-^IM-iM-^RM-. ===
function uploadDocsFile(fileInput) {
  if (!fileInput || !fileInput.files || !fileInput.files.length) return;
  if (!window.API_TOKEN) { alert("请先登录"); return; }
  // 通过文本输入框的 data-row 定位行
  var txtInput = fileInput.closest('.upload-inline').querySelector('input[type="text"]');
  if (!txtInput) { fileInput.closest('.upload-inline').querySelector('button[title="上传文件"]'); txtInput = fileInput.closest('.upload-inline').querySelector('input[type="text"]'); }
  if (!txtInput) return;
  var realIdx = parseInt(txtInput.dataset.row);
  if (isNaN(realIdx) || realIdx < 0) return;
  var viewBtn = txtInput.parentElement.querySelector('button:last-of-type');
  var files = Array.prototype.slice.call(fileInput.files);
  var existingNames = txtInput && txtInput.value && txtInput.value.indexOf("上传") === -1 ? txtInput.value.split(";").map(function(s){return s.trim();}).filter(Boolean) : [];
  if (txtInput) txtInput.value = "上传中...";
  var done = 0;
  files.forEach(function(file, fi) {
    var fd = new FormData();
    fd.append("file", file);
    var xhr = new XMLHttpRequest();
    var apiBase = (typeof API_BASE !== "undefined") ? API_BASE : "";
    xhr.open("POST", apiBase + "/api/upload", true);
    xhr.setRequestHeader("Authorization", "Bearer " + (window.API_TOKEN || ""));
    xhr.onload = function() {
      done++;
      var filename = file.name;
      if (xhr.status === 200) {
        try { var resp = JSON.parse(xhr.responseText); filename = resp.filename || resp.path || file.name; } catch(e) {}
      }
      existingNames.push(filename);
      if (done === files.length) {
        var namesStr = existingNames.join("; ");
        if (txtInput) txtInput.value = namesStr;
        // 通过 data-row 索引直接存
        var data = DB.get(currentSection);
        var rowFound = false;
        if (data[realIdx]) {
          data[realIdx].docs = namesStr;
          DB.set(currentSection, data);
          showSaved();
          rowFound = true;
        }
        if (!rowFound) {
          // 按内容匹配行
          var rAmt = parseFloat(txtInput.dataset.ramt || "-1");
          var rPerson = txtInput.dataset.rperson || "";
          for (var di = 0; di < data.length; di++) {
            if (data[di].person === rPerson && Math.abs((data[di].amount||0) - rAmt) < 0.01) {
              data[di].docs = namesStr;
              DB.set(currentSection, data);
              showSaved();
              break;
            }
          }
        }
        if (viewBtn) {
          viewBtn.style.display = "";
          // 找到删除按钮并显示
          var delBtn = viewBtn.nextElementSibling;
          if (delBtn && delBtn.tagName === 'BUTTON') delBtn.style.display = '';
        }
        fileInput.value = "";
      }
    };
    xhr.onerror = function() { done++; if (done === files.length) fileInput.value = ""; };
    xhr.send(fd);
  });
}// === 删除单据文件 ===
function clearDocs(rowKey, btn) {
  var txt = document.getElementById('docsTxt_' + rowKey);
  if (!txt) return;
  var realIdx = parseInt(txt.dataset.row);
  if (!isNaN(realIdx) && realIdx >= 0) {
    var data = DB.get(currentSection);
    if (data[realIdx]) {
      data[realIdx].docs = '';
      DB.set(currentSection, data);
      showSaved();
    }

// 上传按钮事件委托（稳定可靠）
document.addEventListener("click", function(e) {
  var btn = e.target.closest("[data-upload]");
  if (btn) { console.log("Upload btn clicked");
    var fi = btn.parentElement.querySelector('input[type="file"]');
    if (fi) fi.click();
  }
});
  }
  if (txt) txt.value = '';
  btn.style.display = 'none';
  var prev = btn.previousElementSibling;
  if (prev) prev.style.display = 'none';
}

// === 上传按钮事件绑定（所有版块通用） ===
function setupUploadEvents(wrap, section) {
  if (!wrap) return;
  var data = DB.get(section);
  wrap.querySelectorAll('.td-upload-cell').forEach(function(td) {
    var row = parseInt(td.dataset.row);
    var col = td.dataset.col;
    var txtInput = td.querySelector('input[type="text"]');
    var fileInput = td.querySelector('input[type="file"]');
    var upBtn = td.querySelector('.up-btn');
    var viewBtn = td.querySelector('.up-view');
    if (!upBtn || !fileInput) return;

    upBtn.onclick = function() { fileInput.click(); };

    fileInput.onchange = function() {
      if (!fileInput.files.length) return;
      var files = fileInput.files;
      var uploadNext = function(idx) {
        if (idx >= files.length) return;
        var file = files[idx];
        txtInput.value = file.name;
        if (viewBtn) viewBtn.style.display = '';
        var fd = new FormData();
        fd.append('file', file);
        var xhr = new XMLHttpRequest();
        var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '';
        xhr.open('POST', apiBase + '/api/upload', true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + (window.API_TOKEN || ''));
        xhr.onload = function() {
          if (xhr.status === 200) {
            try {
              var resp = JSON.parse(xhr.responseText);
              txtInput.value = resp.filename || resp.path || file.name;
              if (data[row]) {
                data[row][col] = txtInput.value;
                DB.set(section, data);
                showSaved();
              }
            } catch(e) {}
          }
          uploadNext(idx + 1);
        };
        xhr.onerror = function() { uploadNext(idx + 1); };
        xhr.send(fd);
      };
      uploadNext(0);
      fileInput.value = '';
    };

    if (viewBtn) {
      viewBtn.onclick = function() {
        if (txtInput && txtInput.value) {
          window.open('/finance/uploads/vouchers/' + txtInput.value, '_blank');
        }
      };
    }

    if (txtInput) {
      txtInput.onchange = function() {
        if (data[row]) {
          data[row][col] = txtInput.value;
          DB.set(section, data);
          showSaved();
        }
        if (viewBtn) viewBtn.style.display = txtInput.value ? '' : 'none';
      };
    }
  });
}

// === 强制同步当前版块到服务器 ===
var _filterKeyword = '';
function filterTable(keyword) {
  _filterKeyword = keyword.toLowerCase().trim();
  renderEditTable(currentSection);
}

// === 从服务器同步 ===
function syncFromServer() {
  var btn = document.querySelector('.tb-sync');
  btn.textContent = '⏳ 同步中...';
  btn.disabled = true;
  DB.loadAllFromServer(function() {
    renderEditTable(currentSection);
    btn.textContent = '✅ 同步完成';
    setTimeout(function() {
      btn.textContent = '🔄 同步';
      btn.disabled = false;
    }, 2000);
  });
}

// === 初始化 - 从服务器加载 ===
// 修改 renderEditTable 以支持搜索过滤
window.renderEditTable = function(section) {
  // diagnostic removed
  var data = DB.get(section);
  var cols = COLUMNS[section];
  var wrap = $id('tableEditWrap');

  // 搜索过滤
  if (_filterKeyword) {
    data = data.filter(function(row) {
      return cols.some(function(c) {
        var v = row[c.key];
        if (Array.isArray(v)) v = v.join(' ');
        return String(v || '').toLowerCase().indexOf(_filterKeyword) !== -1;
      });
    });
  }

  $id('recordCount').textContent = data.length + ' 条记录' + (_filterKeyword ? ' (筛选)' : '');

  if (!cols) { wrap.innerHTML = '<p style="padding:20px;color:#999">暂未定义此版块</p>'; return; }


  if (section === 'reimburse' || section === 'pettyCash') {
    var persons = section === 'reimburse' ? ['任海涛','庞尚韬','应红林'] : ['任海涛','庞尚韬'];
    var ph = '<div class="sub-tabs">';
    persons.forEach(function(p) {
      var pdata = data.filter(function(r){return r.person===p;});
      ph += '<button class="sub-tab-btn" data-person="' + p + '" onclick="switchPersonTab(this.dataset.person,this)" style="border-left:3px solid ' + (p==='任海涛'?'#3498db':p==='庞尚韬'?'#e74c3c':'#2ecc71') + '">' + p + '</button>';
    });
    ph += '</div>';
    persons.forEach(function(person) {
      var pdata = data.filter(function(r){return r.person===person;});
      var display = person === '任海涛' ? 'block' : 'none';
      ph += '<div class="person-section" id="person_' + person + '" style="display:' + display + '">';
      // 按报销日期分组
      var grps = {};
      pdata.forEach(function(r) { var rd = r.reimburse_date || '未分组'; if(!grps[rd]) grps[rd] = []; grps[rd].push(r); });
      var dates = Object.keys(grps).sort();
      dates.forEach(function(d) {
        var items = grps[d];
        var total = items.reduce(function(s,r){return s+(r.amount||0);},0);
        var pm = items[0].payment_method || '';
        ph += '<div style="margin:8px 0;border:1px solid #ddd;border-radius:4px;overflow:hidden">';
        ph += '<div style="background:#e8f4fd;padding:6px 10px;font-weight:700;font-size:0.82rem;border-bottom:1px solid #3498db;display:flex;justify-content:space-between;align-items:center">';
        ph += '<span>📅 报销日期 ' + d + ' · ' + items.length + '笔 · 合计 ¥' + total.toFixed(2) + '</span>';
        ph += '<select data-date="' + d + '" data-person="' + person + '" onchange="updateBatchPayment(this)" style="padding:2px 8px;font-size:0.75rem;border:1px solid #3498db;border-radius:3px;background:#fff">';
        ph += '<option value="">支付方式</option><option value="公司账户支付"' + (pm==='公司账户支付'?' selected':'') + '>公司账户支付</option><option value="备用金抵扣"' + (pm==='备用金抵扣'?' selected':'') + '>备用金抵扣</option>';
        ph += '</select></div>';
        ph += '<table class="edit-table" style="border:none"><thead><tr>';
        cols.forEach(function(c) { 
          if(c.key==='date') ph += '<th style="width:115px">' + c.label + '</th>';
          else if(c.key==='amount') ph += '<th style="width:115px">' + c.label + '</th>';
          else if(c.key==='reason') ph += '<th style="width:150px">' + c.label + '</th>';
          else if(c.key==='docs') ph += '<th style="width:130px">' + c.label + '</th>';
          else if(c.key!=='person'&&c.key!=='payment_method'&&c.key!=='reimburse_date') ph += '<th>' + c.label + '</th>';
        });
        ph += '<th style="width:36px">操作</th></tr></thead><tbody>';
        items.forEach(function(row) {
          var realIdx = data.indexOf(row); var rowKey = row._key || 'k' + Date.now() + Math.random().toString(36).slice(2,6);
          if (!row._key) row._key = rowKey;
          ph += '<tr>';
          cols.forEach(function(c) {
            if (c.key==='person'||c.key==='payment_method'||c.key==='reimburse_date') return;
            var val = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '';
            ph += '<td>';
            if (c.type === 'number') {
              ph += '<input type="number" step="0.01" value="' + (val||0) + '" data-row="' + realIdx + '" data-col="' + c.key + '" onchange="editCell(this)" style="width:100%;padding:2px 4px;border:1px solid #ccc">';
            } else if (c.type === 'date') {
              ph += '<input type="date" value="' + ((val||'').split(' ')[0]||'') + '" data-row="' + realIdx + '" data-col="' + c.key + '" onchange="editCell(this)" style="width:115px;padding:2px 4px;border:1px solid #ccc">';
            } else if (c.key === 'docs') {
              var display = Array.isArray(val) ? val.join('; ') : val;
              ph += '<div class="upload-inline" style="display:flex;gap:2px;align-items:center">';
              ph += '<input type="text" id="docsTxt_' + rowKey + '" value="' + escHtml(display) + '" data-row="' + realIdx + '" data-col="docs" data-date="' + (row.date||'') + '" data-person="' + (row.person||'') + '" data-amount="' + (row.amount||0) + '" style="flex:1;min-width:40px;padding:2px 4px;border:1px solid #ccc;font-size:0.65rem;font-family:inherit" readonly>';
              ph += '<button onclick="var v=document.getElementById(\'docsTxt_' + rowKey + '\').value;if(v)window.open(\'/finance/uploads/vouchers/\'+v,\'_blank\')" style="padding:3px 6px;border:1px solid #999;background:#fff;cursor:pointer;font-size:0.75rem' + (display ? '' : ';display:none') + '" title="预览">👁️</button>';
              ph += '<button onclick="clearDocs(\'' + rowKey + '\',this)" style="padding:3px 6px;border:1px solid #e74c3c;background:#fff;color:#e74c3c;cursor:pointer;font-size:0.75rem' + (display ? '' : ';display:none') + '" title="删除">✖</button>';
              ph += '<input type="file" accept=".jpg,.jpeg,.png,.gif,.pdf,.ofd,.xls,.xlsx" multiple onchange="uploadDocsFile(this)" style="padding:3px 6px;border:1px solid #999;background:#fff;cursor:pointer;font-size:0.75rem;width:28px" title="上传文件">';
              ph += '</div>';
            } else {
              ph += '<input type="text" value="' + escHtml(val) + '" data-row="' + realIdx + '" data-col="' + c.key + '" onchange="editCell(this)" style="width:100%;padding:2px 4px;border:1px solid #ccc">';
            }
            ph += '</td>';
          });
          ph += '<td><button class="row-del-btn" onclick="deleteRow(' + realIdx + ')" title="删除此行" style="width:24px;height:24px">✕</button></td></tr>';
        });
        ph += '</tbody></table></div>';
      });
      ph += '</div>';
    });
    // 底部保存条
    ph += '<div class="save-bar"><span style="font-size:0.75rem;font-weight:600;color:#555">编辑后记得点击保存按钮</span><button class="btn-save" onclick="saveData()">💾 保存数据</button></div>';
    wrap.innerHTML = ph;
    setupUploadEvents(wrap, section);
    return;
  }

  var html = '<table class="edit-table"><thead><tr>';
  cols.forEach(function(c) { 
    if(c.key==='date') html += '<th style="width:115px">' + c.label + '</th>';
    else if(c.key==='amount') html += '<th style="width:115px">' + c.label + '</th>';
    else if(c.key==='reason') html += '<th style="width:150px">' + c.label + '</th>';
    else if(c.key==='docs') html += '<th style="width:130px">' + c.label + '</th>';
    else html += '<th>' + c.label + '</th>';
  });
  html += '<th style="width:36px">操作</th></tr></thead><tbody>';

  if (data.length === 0) {
    html += '<tr><td colspan="' + (cols.length + 1) + '" style="text-align:center;padding:30px;color:#999">' +
      (_filterKeyword ? '未找到匹配 "' + _filterKeyword + '"' : '暂无数据，点击"＋ 新增一行"添加') + '</td></tr>';
  } else {
    data.forEach(function(row, idx) {
      var rowBg = section === 'bankFlow' ? (row.income > 0 ? '#f0faf4' : (row.expense > 0 ? '#fef2f2' : '')) : (section === 'capital' && row.name ? {'任海涛':'#e8f4fd','庞尚韬':'#fef2f2','吴生成':'#f0faf4','应红林':'#fdf6e3','陈洪斌':'#f5e6f0'}[row.name] || '' : '');
      html += '<tr style="background:' + rowBg + '">';
      cols.forEach(function(c) {
        var val = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '';
        if (c.key === 'invoices' || c.key === 'voucher' || c.key === 'docs') {
          var display = Array.isArray(val) ? val.join('; ') : val;
          var isMulti = (c.key === 'invoices' || c.key === 'docs');
          html += '<td class="td-upload-cell" data-row="' + idx + '" data-col="' + c.key + '" data-multi="' + isMulti + '" data-val="' + escHtml(display) + '">';
          html += '<div class="upload-inline" style="display:flex;gap:2px;align-items:center">';
          html += '<input type="text" value="' + escHtml(display) + '" style="flex:1;min-width:40px;padding:2px 4px;border:1px solid #ccc;font-size:0.65rem;font-family:inherit" readonly>';
          html += '<button class="up-view" title="预览" style="padding:3px 6px;border:1px solid #999;background:#fff;cursor:pointer;font-size:0.75rem;' + (display ? '' : 'display:none') + '">👁️</button>';
          html += '<input type="file" style="padding:3px 6px;border:1px solid #999;background:#fff;cursor:pointer;font-size:0.75rem;width:28px"' + (isMulti ? ' multiple' : '') + '>';
          html += '</div></td>';
        } else if (c.type === 'select') {
          html += '<td><select data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)">';
          c.options.forEach(function(o) {
            html += '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
          });
          html += '</select></td>';
        } else if (c.type === 'number') {
          if (section === 'bankAccounts' && c.key === 'balance') {
            var bfData = DB.get('bankFlow') || [];
            var calcBal = 0;
            bfData.forEach(function(br){ calcBal += (br.income||0) - (br.expense||0); });
            html += '<td><strong style="font-size:1rem;color:#D35400">¥' + calcBal.toFixed(2) + '</strong><input type="hidden" value="' + calcBal + '" data-row="' + idx + '" data-col="balance"></td>';
          } else {
            html += '<td><input type="number" step="0.01" value="' + (val || 0) + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)"></td>';
          }
        } else if (c.type === 'date') {
          html += '<td><input type="date" value="' + ((val||'').split(' ')[0]||'') + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)"></td>';
        } else if (c.type === 'month') {
          html += '<td><input type="month" value="' + (val || '') + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)"></td>';
        } else {
          html += '<td><input type="text" value="' + escHtml(val) + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)"></td>';
        }
      });
      html += '<td><button class="row-del-btn" onclick="deleteRow(' + idx + ')" title="删除此行">✕</button></td></tr>';
    });
  }
  html += '</tbody></table>';
  // 股本金合计行
  if (section === 'capital' && data.length > 0) {
    var ttl = data.reduce(function(s,r){return s+(r.amount||0);},0);
    html += '<tr style="background:#f5f0e8;font-weight:700"><td colspan="2">合计</td><td style="padding:6px 10px;border-top:3px solid #000;text-align:right">¥' + ttl.toFixed(2) + '</td><td colspan="3" style="border-top:3px solid #000"></td></tr>';
    html += '</tbody></table>';
  } else {
    html += '</tbody></table>';
  }
  // 底部保存条
  html += '<div class="save-bar"><span style="font-size:0.75rem;font-weight:600;color:#555">编辑后记得点击保存按钮</span><button class="btn-save" onclick="saveData()">💾 保存数据</button></div>';
  wrap.innerHTML = html;

  // 上传按钮事件
  setupUploadEvents(wrap, section);

  wrap.querySelectorAll('.td-upload').forEach(function(td) {
    td.style.cssText = 'cursor:pointer;padding:2px';
    td.title = '点击上传文件';
    td.addEventListener('click', function() {
      // 避免重复初始化
      if (td.querySelector('input')) return;
      var row = parseInt(td.dataset.row);
      var col = td.dataset.col;
      var val = td.dataset.val || '';
      var isMulti = (col === 'invoices' || col === 'docs');

      var data = DB.get(currentSection);
      var currentVal = data[row] ? data[row][col] : val;
      if (Array.isArray(currentVal)) currentVal = currentVal.join('; ');

      var input = document.createElement('input');
      input.type = 'text';
      input.value = currentVal || '';
      input.placeholder = isMulti ? '多个文件用;分隔，或点击📎上传' : '文件名或点击📎上传';
      input.style.cssText = 'width:100%;padding:4px 6px;border:1px solid #ccc;font-size:0.72rem;font-family:inherit';

      td.innerHTML = '';
      td.appendChild(input);

      // 替换为增强上传组件
      enhanceFileInput(input, isMulti);

      // 监听变化
      var observer = new MutationObserver(function() {
        var newInput = td.querySelector('input[type="text"]');
        if (newInput) {
          var newVal = newInput.value;
          td.dataset.val = newVal;
          if (data[row]) {
            if (isMulti) {
              data[row][col] = newVal ? newVal.split(';').map(function(s){return s.trim();}).filter(Boolean) : [];
            } else {
              data[row][col] = newVal;
            }
            DB.set(currentSection, data);
          }
        }
      });
      observer.observe(td, { childList: true, subtree: true });
    });
  });
};

// 启动时从服务器加载
document.addEventListener('DOMContentLoaded', function() {
  if (window.API_TOKEN) {
    DB.loadAllFromServer(function() {
      switchSection(currentSection);
    });
  }
});
