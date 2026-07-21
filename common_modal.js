/* ============================================================
   V21 通用二级弹窗辅助函数族
   把占位提示按钮升级为真实二级弹窗（表单/确认/详情）
   successMsg 三种语义：
     1) 字符串(且非全局函数名) -> 提交后 alert('✅ '+msg) 并关闭
     2) 全局函数名字符串(如 'modalCb_xxx') -> 调用 window[name](v)，返回!==false才关闭
     3) null -> 不提示直接关闭
   ============================================================ */
function genFormHTML(fields, formId) {
  var html = '<form id="' + formId + '" onsubmit="return false">';
  fields.forEach(function(f) {
    html += '<div style="margin-bottom:14px">';
    html += '<label style="display:block;font-size:13px;color:#666;margin-bottom:4px">' + (f.required ? '* ' : '') + (f.label || f.name) + '</label>';
    if (f.type === 'select') {
      html += '<select name="' + f.name + '" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box">';
      (f.options || []).forEach(function(o) {
        var ov = (typeof o === 'object') ? o.value : o;
        var ot = (typeof o === 'object') ? o.text : o;
        html += '<option value="' + ov + '"' + (f.value === ov ? ' selected' : '') + '>' + ot + '</option>';
      });
      html += '</select>';
    } else if (f.type === 'textarea') {
      html += '<textarea name="' + f.name + '" rows="' + (f.rows || 3) + '" placeholder="' + (f.placeholder || '') + '" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box;resize:vertical">' + (f.value || '') + '</textarea>';
    } else if (f.type === 'checkbox') {
      html += '<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" name="' + f.name + '"' + (f.value ? ' checked' : '') + '> ' + (f.text || f.label || '') + '</label>';
    } else {
      html += '<input type="' + (f.type || 'text') + '" name="' + f.name + '" value="' + (f.value || '') + '" placeholder="' + (f.placeholder || '') + '"' + (f.min !== undefined ? ' min="' + f.min + '"' : '') + ' style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;box-sizing:border-box">';
    }
    html += '</div>';
  });
  html += '</form>';
  return html;
}
window.showFormModal = function(title, fields, submitText, successMsg) {
  var formId = 'genForm_' + Math.random().toString(36).slice(2, 8);
  var body = genFormHTML(fields, formId);
  var safe = String(successMsg == null ? '' : successMsg).replace(/'/g, "\\'");
  var cbExpr = (successMsg == null) ? 'null'
    : ("(typeof '" + safe + "' === 'string' && window['" + safe + "'] && typeof window['" + safe + "'] === 'function' ? window['" + safe + "'] : null)");
  var actions = '<div class="detail-actions" style="margin-top:18px">'
    + '<button class="btn btn-primary" onclick="var f=document.getElementById(\'' + formId + '\');var v={};var ok=true;f.querySelectorAll(\'[name]\').forEach(function(el){v[el.name]=el.type===\'checkbox\'?el.checked:el.value;if(el.hasAttribute(\'required\')&&!el.value){ok=false;el.style.borderColor=\'#dc2626\'}});if(!ok){alert(\'请填写所有必填项\');return}'
    + 'var _cb=' + cbExpr + ';'
    + 'if(_cb){var _r=_cb(v);if(_r!==false){closeDetailModal()}}'
    + 'else{closeDetailModal();alert(\'✅ ' + (successMsg || '操作成功') + '\')}">'
    + (submitText || '提交') + '</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()">取消</button></div>';
  showDetailModal(title, body + actions);
};
window.showConfirmModal = function(title, descHTML, confirmText, successMsg) {
  var safe = String(successMsg == null ? '' : successMsg).replace(/'/g, "\\'");
  var cbExpr = (successMsg == null) ? 'null'
    : ("(typeof '" + safe + "' === 'string' && window['" + safe + "'] && typeof window['" + safe + "'] === 'function' ? window['" + safe + "'] : null)");
  var body = (descHTML || '') + '<div class="detail-actions" style="margin-top:18px">'
    + '<button class="btn btn-primary" onclick="var _cb=' + cbExpr + ';'
    + 'if(_cb){var _r=_cb();if(_r!==false){closeDetailModal()}}'
    + 'else{closeDetailModal();alert(\'✅ ' + (successMsg || '操作成功') + '\')}">'
    + (confirmText || '确认') + '</button>'
    + '<button class="btn btn-outline" onclick="closeDetailModal()">取消</button></div>';
  showDetailModal(title, body);
};
window.showInfoModal = function(title, content) {
  var body;
  if (typeof content === 'string') { body = content; }
  else if (Array.isArray(content)) {
    body = '<div class="detail-grid">';
    content.forEach(function(it) { body += '<div class="detail-field"><span class="detail-label">' + it.label + '</span><span class="detail-value">' + (it.value != null ? it.value : '-') + '</span></div>'; });
    body += '</div>';
  }
  showDetailModal(title, body + '<div class="detail-actions" style="margin-top:16px"><button class="btn btn-outline" onclick="closeDetailModal()" style="margin-left:auto">关闭</button></div>');
};
window.mockSuccess = function(msg) { alert('✅ ' + msg); };

/* ===== 行数据读取助手：点击时从按钮所在行读取真实数据，避开循环变量作用域问题 ===== */
window.rowCellText = function(btn, idx) {
  var row = btn.closest('tr') || btn.closest('li') || btn.closest('[data-row]');
  if (!row) return '';
  var cell = row.children[idx];
  return cell ? cell.innerText.trim() : '';
};
window.rowDetailHTML = function(btn) {
  var row = btn.closest('tr') || btn.closest('li') || btn.closest('[data-row]');
  if (!row) return '<div style="color:#999;font-size:13px">无关联行数据</div>';
  var html = '<div class="detail-grid">';
  Array.prototype.forEach.call(row.children, function(td, i) {
    var v = td.innerText.trim();
    if (!v) return;
    html += '<div class="detail-field"><span class="detail-label">字段' + (i + 1) + '</span><span class="detail-value">' + v + '</span></div>';
  });
  html += '</div>';
  return html;
};

/* ===== 全局弹窗回调（需读取表单值 / 业务校验的场景） ===== */
window.modalCb_createRole = function(v) {
  var name = v.roleName || '新角色';
  alert('✅ 角色「' + name + '」已创建');
  return true;
};
window.modalCb_editPerson = function(v) {
  var name = v.personName || '人员';
  alert('✅ ' + name + ' 信息已更新');
  return true;
};
window.modalCb_editProject = function(v) {
  var name = v.projName || '项目';
  alert('✅ 项目「' + name + '」信息已更新');
  return true;
};
window.modalCb_saveRolePerm = function() {
  alert('✅ 角色权限已保存');
  return true;
};
window.modalCb_rejectPerm = function(v) {
  if (!v || !v.rejReason) { alert('请填写驳回理由'); return false; }
  alert('✅ 权限申请已驳回');
  return true;
};
