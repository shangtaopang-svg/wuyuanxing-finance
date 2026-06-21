// ===== 五源兴 · 中英文完整语言包 =====
var currentLang = localStorage.getItem('wyx_lang') || 'zh';

var LANG_MAP = {
  // 导航/顶部
  '五源兴农业': 'Wuyuanxing Agriculture',
  '财务数据展示平台': 'Financial Data Platform',
  '凉山州农投合作专用': 'For Liangshan Ag Investment',
  '管理': 'Admin',
  '报告': 'Report',
  '风格切换': 'Style',

  // 标签
  '🏦 股本金': '🏦 Capital',
  '💳 支出': '💳 Expenses',
  '📈 收入': '📈 Revenue',
  '💰 备用金': '💰 Petty Cash',
  '🧾 报销': '🧾 Reimbursement',
  '📤 应收款': '📤 Receivables',
  '🏗️ 固定资产': '🏗️ Fixed Assets',
  '📋 管理费': '📋 Admin Expenses',
  '👷 工资': '👷 Payroll',
  '🌿 基地支出': '🌿 Base Expenses',
  '🏢 公司信息': '🏢 Company Info',
  '📄 合同管理': '📄 Contracts',
  '🏦 银行账户': '🏦 Bank Accounts',

  // 汇总
  '总收入': 'Total Income',
  '总支出': 'Total Expenses',
  '股本金': 'Capital',
  '应收账款': 'Receivables',

  // 版块标题
  '公司基本账户支出账目': 'Company Account Expenses',
  '公司股本金入账明细': 'Capital Contribution Details',
  '公司收入账目': 'Company Revenue',
  '备用金账目明细': 'Petty Cash Details',
  '财务报销记录': 'Reimbursement Records',
  '公司应收账款': 'Accounts Receivable',
  '固定资产账目明细': 'Fixed Asset Details',
  '公司管理费用账目明细': 'Management Expense Details',
  '公司工资支出账目': 'Payroll Details',
  '分基地类别直接支出账目': 'Base Direct Expenses',
  '公司基本信息': 'Company Information',
  '合同台账': 'Contract Ledger',
  '银行账户': 'Bank Accounts',

  // 图表标题
  '月度支出趋势': 'Monthly Expense Trend',
  '支出分类占比': 'Expense Category Ratio',
  '股东出资占比': 'Shareholder Ratio',
  '出资方式分布': 'Investment Method',
  '收入月度趋势': 'Monthly Revenue Trend',
  '收入类别分布': 'Revenue Category',
  '领用 vs 核销': 'Draw vs Write-off',
  '人员占比': 'Personnel Ratio',
  '报销金额对比': 'Reimbursement Comparison',
  '报销人次占比': 'Reimbursement Count',
  '应收状态分布': 'Receivable Status',
  '应收趋势': 'Receivable Trend',
  '资产金额占比': 'Asset Value Ratio',
  '资产状态分布': 'Asset Status',
  '费用类别分布': 'Expense Category',
  '月度趋势': 'Monthly Trend',
  '月度工资对比': 'Monthly Payroll',
  '岗位占比': 'Position Ratio',
  '各基地支出对比': 'Base Expense Comparison',
  '支出项目分布': 'Expense Items',

  // 表头
  '日期': 'Date',
  '类别': 'Category',
  '摘要': 'Description',
  '摘要/说明': 'Description',
  '收入': 'Income',
  '支出': 'Expenses',
  '余额': 'Balance',
  '凭证': 'Voucher',
  '股东姓名': 'Shareholder',
  '金额': 'Amount',
  '出资方式': 'Method',
  '入账凭据': 'Voucher',
  '来源/归处': 'Source',
  '人员': 'Person',
  '类型': 'Type',
  '事由': 'Reason',
  '关联': 'Related',
  '单据': 'Documents',
  '欠款方': 'Debtor',
  '状态': 'Status',
  '资产名称': 'Asset Name',
  '存放地点': 'Location',
  '费用类别': 'Expense Type',
  '说明': 'Note',
  '月份': 'Month',
  '姓名': 'Name',
  '岗位': 'Position',
  '发放日期': 'Pay Date',
  '基地': 'Base',
  '支出项目': 'Expense Item',
  '项目': 'Item',
  '内容': 'Content',
  '合同名称': 'Contract Name',
  '签约方': 'Party',
  '备注': 'Note',
  '银行': 'Bank',
  '户名': 'Account Name',
  '账号': 'Account No.',
  '排序': 'Order',
  '户名': 'Account Name',

  // 按钮
  '打印': 'Print',
  '添加支出记录': '+ Add Expense',
  '添加股本金记录': '+ Add Capital',
  '添加收入记录': '+ Add Revenue',
  '添加备用金记录': '+ Add Petty Cash',
  '添加报销记录': '+ Add Reimbursement',
  '添加入记录': '+ Add Record',
  '添加应收记录': '+ Add Receivable',
  '添加固定资产': '+ Add Asset',
  '添加管理费用': '+ Add Expense',
  '添加工资记录': '+ Add Payroll',
  '添加基地支出': '+ Add Base Expense',
  '暂无数据': 'No Data',
  '请点击下方按钮添加记录': 'Click the button below to add',
  '数据录入后将在次显示': 'Data will appear here',

  // 选项
  '任海涛': 'Ren Haitao',
  '庞尚韬': 'Pang Shangtao',
  '应红林': 'Ying Honglin',
  '银行转账': 'Bank Transfer',
  '现金': 'Cash',
  '实物': 'In-kind',
  '其他': 'Other',
  '领用': 'Draw',
  '核销': 'Write-off',
  '未收回': 'Unpaid',
  '部分收回': 'Partial',
  '已收回': 'Paid',
  '在用': 'In Use',
  '闲置': 'Idle',
  '已报废': 'Scrapped',
  '金银花基地': 'Honeysuckle Base',
  '党参基地': 'Codonopsis Base',
  '党参育苗基地': 'Seedling Base',
  '进行中': 'Ongoing',
  '已完成': 'Completed',
  '已终止': 'Terminated',
};

// DOM自动翻译函数
function applyLang() {
  var lang = currentLang === 'en' ? 'en' : 'zh';
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';

  if (lang === 'zh') {
    // 中文模式：重新加载页面以恢复原始文本
    // 简单方案：从LANG_MAP反向查找（英文→中文）
    // 但更可靠的方案：从data-original属性恢复
    document.querySelectorAll('[data-original]').forEach(function(el) {
      el.textContent = el.getAttribute('data-original');
    });
    return;
  }

  // 英文模式：遍历所有文本节点翻译
  document.querySelectorAll('[data-original]').forEach(function(el) {
    var original = el.getAttribute('data-original');
    // 去掉表情符号再匹配
    var clean = original.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').trim();
    var translated = LANG_MAP[original] || LANG_MAP[clean];
    if (translated) el.textContent = translated;
  });

  // 保存当前语言
  var sel = document.getElementById('langSelect');
  if (sel) sel.value = currentLang;
}

// 保存原始中文文本
function saveOriginals() {
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  var textNodes = [];
  while (walker.nextNode()) {
    var node = walker.currentNode;
    var text = node.textContent.trim();
    if (text && /[一-鿿]/.test(text) && node.parentElement && !node.parentElement.closest('script,style,audio')) {
      textNodes.push(node);
    }
  }

  textNodes.forEach(function(node) {
    var parent = node.parentElement;
    if (parent && !parent.hasAttribute('data-original') && !parent.closest('[data-original]')) {
      var text = node.textContent.trim();
      // 保存时去掉表情符号
      var clean = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').trim();
      if (clean && (LANG_MAP[clean] || clean.length < 50)) {
        parent.setAttribute('data-original', clean);
      }
    }
  });
}

// 切换语言
function switchLang(lang) {
  currentLang = lang;
  localStorage.setItem('wyx_lang', lang);
  applyLang();
}

// 初始化
(function() {
  currentLang = localStorage.getItem('wyx_lang') || 'zh';
  document.addEventListener('DOMContentLoaded', function() {
    saveOriginals();
    applyLang();
  });
})();
