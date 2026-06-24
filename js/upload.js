// ===== 五源兴 · 文件上传模块（支持编辑密码） =====

function uploadFile(file, callback) {
  var fd = new FormData();
  fd.append('file', file);
  fd.append('password', '87700020');
  var apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : (window.location.pathname.startsWith('/finance/') ? '/finance' : ''));
  var xhr = new XMLHttpRequest();
  xhr.open('POST', apiBase + '/api/public/upload', true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      try { var r = JSON.parse(xhr.responseText); callback(null, r.filename || r.path); }
      catch(e) { callback(null, file.name); }
    } else callback('上传失败');
  };
  xhr.onerror = function() { callback(null, file.name); };
  xhr.send(fd);
}

// 预览文件
function previewFile(path) {
  var apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : (window.location.pathname.startsWith('/finance/') ? '/finance' : ''));
  window.open(apiBase + '/uploads/vouchers/' + path, '_blank');
}

// 在编辑模式下，给凭证/发票等字段添加上传功能
function enableFileUploadOnFields() {
  if (!EDIT_MODE) return;
  document.querySelectorAll('.data-table td').forEach(function(td) {
    if (td.querySelector('.upload-trigger')) return;
    var colIdx = Array.from(td.parentNode.children).indexOf(td);
    var tr = td.closest('tr');
    var tbody = tr.closest('tbody');
    var fields = window.COL_FIELDS && window.COL_FIELDS[tbody.id];
    if (!fields) return;
    var field = fields[colIdx];
    // 只有凭证/发票/单据类字段才加上传
    if (!field || ['voucher','invoices','docs'].indexOf(field) < 0) return;
    if (td.classList.contains('op-cell')) return;

    var val = td.textContent.trim();
    if (val && val !== '—' && val !== '参考') {
      // 已有文件，显示预览链接
      td.innerHTML = '<span class="invoice-link" onclick="previewFile(\'' + val.replace(/'/g,"\\'") + '\')" style="cursor:pointer;color:#3182ce">📎 ' + val + '</span>';
    }
    // 添加上传触发按钮
    var upBtn = document.createElement('button');
    upBtn.className = 'upload-trigger';
    upBtn.textContent = '📤';
    upBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:14px;padding:2px 4px;opacity:0.5;margin-left:2px';
    upBtn.title = '上传文件';
    upBtn.onclick = function(e) {
      e.stopPropagation();
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.jpg,.jpeg,.png,.gif,.pdf,.ofd';
      inp.onchange = function() {
        if (!inp.files[0]) return;
        upBtn.textContent = '⏳';
        uploadFile(inp.files[0], function(err, filename) {
          if (err || !filename) { upBtn.textContent = '❌'; return; }
          // 更新单元格显示
          td.innerHTML = '<span class="invoice-link" onclick="previewFile(\'' + filename.replace(/'/g,"\\'") + '\')" style="cursor:pointer;color:#3182ce">📎 ' + filename + '</span>';
          td.appendChild(upBtn);
          upBtn.textContent = '📤';
          // 保存到数据
          var idx = parseInt(tr.getAttribute('data-idx'));
          if (!isNaN(idx) && window.onCellEdit) {
            window.onCellEdit(td, filename);
          }
        });
      };
      inp.click();
    };
    td.appendChild(upBtn);
  });
}
