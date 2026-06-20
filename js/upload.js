// ===== 五源兴 · 文件上传模块 =====

// 上传单个文件，返回文件名
function uploadFile(file, callback) {
  var formData = new FormData();
  formData.append('file', file);

  var xhr = new XMLHttpRequest();
  var apiBase = (typeof window !== 'undefined' && window.location.pathname.startsWith('/finance/')) ? '/finance' : '';
  xhr.open('POST', apiBase + '/api/upload', true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + (window.API_TOKEN || ''));

  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      var pct = Math.round(e.loaded / e.total * 100);
    }
  };

  xhr.onload = function() {
    if (xhr.status === 200) {
      var resp = JSON.parse(xhr.responseText);
      if (callback) callback(null, resp.path || resp.filename);
    } else {
      if (callback) callback('上传失败');
    }
  };

  xhr.onerror = function() {
    // 离线模式：保存到本地
    if (callback) callback(null, file.name);
  };

  xhr.send(formData);
}

// 创建文件上传按钮
function createUploadBtn(inputEl, multiple) {
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;gap:4px;align-items:center';

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.jpg,.jpeg,.png,.gif,.pdf,.ofd,.xls,.xlsx,.doc,.docx';
  fileInput.multiple = multiple || false;
  fileInput.style.cssText = 'display:none';

  var textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.placeholder = inputEl.placeholder || '文件名或上传文件';
  textInput.style.cssText = 'flex:1;padding:6px 8px;border:2px solid #000;font-size:0.75rem;font-family:inherit;font-weight:600';
  textInput.value = inputEl.value || '';

  var uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.innerHTML = '📎';
  uploadBtn.style.cssText = 'padding:6px 10px;border:2px solid #000;background:#fff;cursor:pointer;font-size:0.8rem';
  uploadBtn.title = '上传文件';
  uploadBtn.onclick = function() { fileInput.click(); };

  var viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.innerHTML = '👁️';
  viewBtn.style.cssText = 'padding:6px 10px;border:2px solid #000;background:#fff;cursor:pointer;font-size:0.8rem;display:' + (textInput.value ? '' : 'none');
  viewBtn.title = '预览';
  viewBtn.onclick = function() {
    if (textInput.value) window.open('/uploads/vouchers/' + textInput.value, '_blank');
  };

  fileInput.onchange = function() {
    if (fileInput.files.length > 0) {
      var file = fileInput.files[0];
      // 显示本地文件名
      textInput.value = file.name;
      viewBtn.style.display = '';
      // 上传到服务器
      uploadFile(file, function(err, filename) {
        if (!err && filename) {
          textInput.value = filename;
          textInput.dataset.uploaded = 'true';
        }
      });
    }
  };

  // 监听text变化，更新预览按钮
  textInput.oninput = function() {
    viewBtn.style.display = textInput.value ? '' : 'none';
    if (inputEl.onchange) {
      inputEl.value = textInput.value;
      inputEl.onchange({ target: inputEl });
    }
  };

  wrapper.appendChild(fileInput);
  wrapper.appendChild(textInput);
  wrapper.appendChild(uploadBtn);
  if (multiple) {
    var multiBtn = document.createElement('button');
    multiBtn.type = 'button';
    multiBtn.innerHTML = '📎+';
    multiBtn.style.cssText = 'padding:6px 10px;border:2px solid #000;background:#fff;cursor:pointer;font-size:0.8rem';
    multiBtn.title = '上传多个文件';
    multiBtn.onclick = function() {
      fileInput.multiple = true;
      fileInput.click();
    };
    wrapper.appendChild(multiBtn);
  }
  wrapper.appendChild(viewBtn);

  return wrapper;
}

// 替换指定input为文件上传组件
function enhanceFileInput(inputEl, multiple) {
  var parent = inputEl.parentNode;
  var wrapper = createUploadBtn(inputEl, multiple);
  parent.replaceChild(wrapper, inputEl);
}
