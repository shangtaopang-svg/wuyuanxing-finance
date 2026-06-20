// ===== 五源兴 · 后台管理 =====

// === API基础路径 ===
var API_BASE = (typeof window !== 'undefined' && window.location.pathname.startsWith('/finance/')) ? '/finance' : '';

// === 数据管理 ===
var DB = {
  get: function(key) {
    try { return JSON.parse(localStorage.getItem('wyx_' + key)) || []; } catch(e) { return []; }
  },
  set: function(key, data) {
    localStorage.setItem('wyx_' + key, JSON.stringify(data));
    DB.syncToServer(key, data);
  },
  getAll: function() {
    var sections = ['incomeExpense','capital','income','pettyCash','reimburse','receivable','asset','management','salary','baseExpense'];
    var all = {};
    sections.forEach(function(s) { all[s] = DB.get(s); });
    return all;
  },
  importAll: function(data) {
    for (var k in data) { DB.set(k, data[k]); }
  },
  // API同步
  syncToServer: function(section, data) {
    if (!window.API_TOKEN) return;
    fetch(API_BASE + '/api/data/' + section, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.API_TOKEN },
      body: JSON.stringify({ data: data })
    }).catch(function() {});
  },
  loadFromServer: function(section, callback) {
    if (!window.API_TOKEN) { if (callback) callback(DB.get(section)); return; }
    fetch(API_BASE + '/api/data/' + section, { headers: { 'Authorization': 'Bearer ' + window.API_TOKEN } })
      .then(function(r) { if (r.ok) return r.json(); throw 'err'; })
      .then(function(data) {
        localStorage.setItem('wyx_' + section, JSON.stringify(data));
        if (callback) callback(data);
      })
      .catch(function() { if (callback) callback(DB.get(section)); });
  },
  // 批量从服务器加载全部
  loadAllFromServer: function(callback) {
    var sections = ['incomeExpense','capital','income','pettyCash','reimburse','receivable','asset','management','salary','baseExpense'];
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
    {key:'docs', label:'单据文件', type:'text'}
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
  ]
};

var SECTION_NAMES = {
  incomeExpense:'基本账户收支', capital:'股本金', income:'收入',
  pettyCash:'备用金', reimburse:'报销', receivable:'应收账款',
  asset:'固定资产', management:'管理费用', salary:'工资', baseExpense:'基地支出'
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
  currentSection = section;
  $title('sectionTitle').textContent = SECTION_NAMES[section] || section;
  renderEditTable(section);
}

// === 渲染可编辑表格 ===
function renderEditTable(section) {
  var data = DB.get(section);
  var cols = COLUMNS[section];
  var wrap = $id('tableEditWrap');
  $id('recordCount').textContent = data.length + ' 条记录';

  if (!cols) { wrap.innerHTML = '<p style="padding:20px;color:#999">暂未定义此版块</p>'; return; }

  var html = '<table class="edit-table"><thead><tr>';
  cols.forEach(function(c) { html += '<th>' + c.label + '</th>'; });
  html += '<th style="width:36px">操作</th></tr></thead><tbody>';

  if (data.length === 0) {
    html += '<tr><td colspan="' + (cols.length + 1) + '" style="text-align:center;padding:30px;color:#999">暂无数据，点击"＋ 新增一行"添加</td></tr>';
  } else {
    data.forEach(function(row, idx) {
      html += '<tr>';
      cols.forEach(function(c) {
        var val = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '';
        if (c.key === 'invoices' || c.key === 'voucher' || c.key === 'docs') {
          // 数组转字符串显示
          var display = Array.isArray(val) ? val.join('; ') : val;
          html += '<td><input type="text" value="' + escHtml(display) + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)" placeholder="多个文件用;分隔"></td>';
        } else if (c.type === 'select') {
          html += '<td><select data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)">';
          c.options.forEach(function(o) {
            html += '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
          });
          html += '</select></td>';
        } else if (c.type === 'number') {
          html += '<td><input type="number" step="0.01" value="' + (val || 0) + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)"></td>';
        } else if (c.type === 'date') {
          html += '<td><input type="date" value="' + (val || '') + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)"></td>';
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
  wrap.innerHTML = html;
}

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
function showSaved() {
  var el = $id('saveStatus');
  if (!el) return;
  el.textContent = '💾 保存中...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function() {
    el.textContent = '✅ 已保存';
  }, 500);
}

// === 搜索/筛选 ===
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
var _origRenderEditTable = renderEditTable;
renderEditTable = function(section) {
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

  var html = '<table class="edit-table"><thead><tr>';
  cols.forEach(function(c) { html += '<th>' + c.label + '</th>'; });
  html += '<th style="width:36px">操作</th></tr></thead><tbody>';

  if (data.length === 0) {
    html += '<tr><td colspan="' + (cols.length + 1) + '" style="text-align:center;padding:30px;color:#999">' +
      (_filterKeyword ? '未找到匹配 "' + _filterKeyword + '"' : '暂无数据，点击"＋ 新增一行"添加') + '</td></tr>';
  } else {
    data.forEach(function(row, idx) {
      html += '<tr>';
      cols.forEach(function(c) {
        var val = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '';
        if (c.key === 'invoices' || c.key === 'voucher' || c.key === 'docs') {
          var display = Array.isArray(val) ? val.join('; ') : val;
          var isMulti = (c.key === 'invoices' || c.key === 'docs');
          html += '<td class="td-upload-cell" data-row="' + idx + '" data-col="' + c.key + '" data-multi="' + isMulti + '" data-val="' + escHtml(display) + '">';
          html += '<div class="upload-inline" style="display:flex;gap:2px;align-items:center">';
          html += '<input type="text" value="' + escHtml(display) + '" style="flex:1;min-width:60px;padding:3px 4px;border:1px solid #ccc;font-size:0.7rem;font-family:inherit" readonly>';
          html += '<button class="up-btn" title="上传文件" style="padding:3px 6px;border:1px solid #999;background:#fff;cursor:pointer;font-size:0.75rem">📎</button>';
          html += '<button class="up-view" title="预览" style="padding:3px 6px;border:1px solid #999;background:#fff;cursor:pointer;font-size:0.75rem;' + (display ? '' : 'display:none') + '">👁️</button>';
          html += '<input type="file" accept=".jpg,.jpeg,.png,.gif,.pdf,.ofd,.xls,.xlsx" style="display:none"' + (isMulti ? ' multiple' : '') + '>';
          html += '</div></td>';
        } else if (c.type === 'select') {
          html += '<td><select data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)">';
          c.options.forEach(function(o) {
            html += '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
          });
          html += '</select></td>';
        } else if (c.type === 'number') {
          html += '<td><input type="number" step="0.01" value="' + (val || 0) + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)"></td>';
        } else if (c.type === 'date') {
          html += '<td><input type="date" value="' + (val || '') + '" data-row="' + idx + '" data-col="' + c.key + '" onchange="editCell(this)"></td>';
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
  wrap.innerHTML = html;

  // 上传按钮事件
  wrap.querySelectorAll('.td-upload-cell').forEach(function(td) {
    var row = parseInt(td.dataset.row);
    var col = td.dataset.col;
    var isMulti = td.dataset.multi === 'true';
    var data = DB.get(section);
    var txtInput = td.querySelector('input[type="text"]');
    var fileInput = td.querySelector('input[type="file"]');
    var upBtn = td.querySelector('.up-btn');
    var viewBtn = td.querySelector('.up-view');

    upBtn.onclick = function() { fileInput.click(); };

    fileInput.onchange = function() {
      if (!fileInput.files.length) return;
      var uploadNext = function(files, idx) {
        if (idx >= files.length) return;
        var file = files[idx];
        txtInput.value = file.name;
        viewBtn.style.display = '';
        var fd = new FormData();
        fd.append('file', file);
        var xhr = new XMLHttpRequest();
        var apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '';
        xhr.open('POST', apiBase + '/api/upload', true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + (window.API_TOKEN || ''));
        xhr.onload = function() {
          if (xhr.status === 200) {
            var resp = JSON.parse(xhr.responseText);
            txtInput.value = resp.filename || resp.path || file.name;
            // 保存到DB
            if (data[row]) {
              data[row][col] = txtInput.value;
              DB.set(currentSection, data);
            }
          }
          uploadNext(files, idx + 1);
        };
        xhr.onerror = function() { uploadNext(files, idx + 1); };
        xhr.send(fd);
      };
      uploadNext(fileInput.files, 0);
      fileInput.value = '';
    };

    viewBtn.onclick = function() {
      if (txtInput.value) {
        window.open('/uploads/vouchers/' + txtInput.value, '_blank');
      }
    };

    txtInput.onchange = function() {
      if (data[row]) {
        data[row][col] = txtInput.value;
        DB.set(currentSection, data);
      }
      viewBtn.style.display = txtInput.value ? '' : 'none';
    };
  });

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
