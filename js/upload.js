// ===== 五源兴 · 文件上传模块（支持多文件） =====

function uploadFile(file, callback) {
  var fd = new FormData();
  fd.append('file', file);
  var apiBase = (typeof window !== 'undefined' && window.location.pathname.startsWith('/finance/')) ? '/finance' : '';
  var xhr = new XMLHttpRequest();
  xhr.open('POST', apiBase + '/api/upload', true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + (window.API_TOKEN || ''));
  xhr.onload = function() {
    if (xhr.status === 200) { try { var r = JSON.parse(xhr.responseText); callback(null, r.filename || r.path); } catch(e) { callback(null, file.name); } }
    else callback('上传失败');
  };
  xhr.onerror = function() { callback(null, file.name); };
  xhr.send(fd);
}

function enhanceFileInput(container, currentVal, isMulti, onChange) {
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;gap:3px;min-width:120px';

  // 已有文件列表
  var files = currentVal ? currentVal.split(';').map(function(s){return s.trim();}).filter(Boolean) : [];
  var listDiv = document.createElement('div');
  listDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px';

  files.forEach(function(f) {
    var tag = document.createElement('span');
    tag.style.cssText = 'display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border:1px solid #ccc;border-radius:3px;font-size:0.68rem;background:#f5f5f5';
    tag.innerHTML = f +
      '<button onclick="previewFile(\'' + f + '\')" style="border:none;background:none;cursor:pointer;font-size:0.65rem;padding:0 2px" title="预览">👁️</button>' +
      '<button onclick="this.parentElement.remove();updateFiles(this)" style="border:none;background:none;cursor:pointer;font-size:0.65rem;padding:0 2px;color:red" title="删除" data-container="' + container.id + '">✕</button>';
    listDiv.appendChild(tag);
  });

  // 上传按钮
  var btnDiv = document.createElement('div');
  btnDiv.style.cssText = 'display:flex;gap:3px;align-items:center';

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.jpg,.jpeg,.png,.gif,.pdf,.ofd,.xls,.xlsx';
  fileInput.multiple = isMulti;
  fileInput.style.display = 'none';

  var upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.innerHTML = '📎 ' + (isMulti ? '上传文件' : '选择文件');
  upBtn.style.cssText = 'padding:3px 8px;border:1px solid #999;background:#fff;cursor:pointer;font-size:0.7rem;border-radius:3px';
  upBtn.onclick = function() { fileInput.click(); };

  var status = document.createElement('span');
  status.style.cssText = 'font-size:0.65rem;color:#888';

  fileInput.onchange = function() {
    if (!fileInput.files.length) return;
    status.textContent = '上传中...';
    var total = fileInput.files.length;
    var done = 0;

    for (var i = 0; i < total; i++) {
      (function(f) {
        uploadFile(f, function(err, filename) {
          done++;
          if (!err && filename) {
            // 添加到列表
            var tag = document.createElement('span');
            tag.style.cssText = 'display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border:1px solid #ccc;border-radius:3px;font-size:0.68rem;background:#f5f5f5';
            tag.innerHTML = filename +
              '<button onclick="previewFile(\'' + filename + '\')" style="border:none;background:none;cursor:pointer;font-size:0.65rem;padding:0 2px" title="预览">👁️</button>' +
              '<button onclick="this.parentElement.remove();updateFiles(this)" style="border:none;background:none;cursor:pointer;font-size:0.65rem;padding:0 2px;color:red" title="删除" data-container="' + container.id + '">✕</button>';
            listDiv.appendChild(tag);
            updateFiles(listDiv);
          }
          status.textContent = done === total ? '✅ 完成' : (done + '/' + total);
          setTimeout(function() { if (done === total) status.textContent = ''; }, 1500);
        });
      })(fileInput.files[i]);
    }
    fileInput.value = '';
  };

  btnDiv.appendChild(upBtn);
  btnDiv.appendChild(status);
  container.appendChild(listDiv);
  container.appendChild(btnDiv);
  container.appendChild(fileInput);

  // 存储更新函数
  container._updateFiles = function() { updateFiles(listDiv); };
}

function updateFiles(listDiv) {
  var tags = listDiv.querySelectorAll('span');
  var names = [];
  tags.forEach(function(t) {
    var text = t.textContent.replace('👁️✕', '').trim();
    if (text) names.push(text);
  });
  var val = names.join('; ');

  // 查找最近的父级td，触发数据更新
  var td = listDiv.closest('td');
  if (td) {
    var row = parseInt(td.dataset.row);
    var col = td.dataset.col;
    if (!isNaN(row) && col) {
      var data = (typeof DB !== 'undefined') ? DB.get(typeof currentSection !== 'undefined' ? currentSection : '') : [];
      if (data && data[row]) {
        data[row][col] = val;
        if (typeof DB !== 'undefined') DB.set(typeof currentSection !== 'undefined' ? currentSection : '', data);
      }
    }
  }
}

// 预览文件
function previewFile(path) {
  window.open('/finance/uploads/vouchers/' + path, '_blank');
}
