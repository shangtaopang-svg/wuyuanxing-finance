// ===== 五源兴 · 中英文语言包 =====
var LANG = {
  'zh': {
    siteTitle: '五源兴农业',
    siteSub: '财务数据展示平台',
    badge: '凉山州农投合作专用',
    styleBrutalist: '野兽派',
    styleMagazine: '杂志风',
    admin: '管理',
    report: '报告',

    totalIncome: '总收入',
    totalExpense: '总支出',
    totalCapital: '股本金',
    totalReceivable: '应收账款',

    tab1: '💳 收支',
    tab2: '🏦 股本金',
    tab3: '📈 收入',
    tab4: '💰 备用金',
    tab5: '🧾 报销',
    tab6: '📤 应收款',
    tab7: '🏗️ 固定资产',
    tab8: '📋 管理费',
    tab9: '👷 工资',
    tab10: '🌿 基地支出',

    print: '🖨️ 打印',
    addRecord: '＋ 添加记录',
    immersive: '✨ 沉浸浏览',
    back: '← 返回影集',
    noData: '暂无数据',
    loadMore: '加载更多',

    /* 表头 */
    colDate: '日期',
    colType: '类型',
    colSummary: '摘要/说明',
    colIncome: '收入',
    colExpense: '支出',
    colBalance: '余额',
    colInvoice: '发票/凭证',

    colName: '股东姓名',
    colAmount: '金额',
    colMethod: '出资方式',
    colVoucher: '入账凭据',

    colCategory: '类别',
    colSource: '来源/归处',

    colPerson: '人员',
    colReason: '事由',

    colParty: '欠款方',
    colStatus: '状态',

    colAsset: '资产名称',
    colLocation: '存放地点',

    colFeeType: '费用类别',
    colNote: '说明',

    colMonth: '月份',
    colPosition: '岗位',
    colPayDate: '发放日期',

    colBase: '基地',
    colItem: '支出项目',

    /* 选项值 */
    typeIncome: '收入',
    typeExpense: '支出',
    methodTransfer: '银行转账',
    methodCash: '现金',
    methodOther: '其他',
    pettyDraw: '领用',
    pettyWriteoff: '核销',
    personRen: '任海涛',
    personPang: '庞尚韬',
    personYing: '应红林',
    statusUnpaid: '未收回',
    statusPartial: '部分收回',
    statusPaid: '已收回',
    assetInUse: '在用',
    assetIdle: '闲置',
    assetScrap: '已报废',
    baseJinyinhua: '金银花基地',
    baseDangshen: '党参基地',
    baseSeedling: '党参育苗基地',

    /* 金额单位 */
    unitYuan: '¥',
    unitThousand: 'k',
  },

  'en': {
    siteTitle: 'Wuyuanxing Agriculture',
    siteSub: 'Financial Data Platform',
    badge: 'For Liangshan Ag Investment',
    styleBrutalist: 'Brutalist',
    styleMagazine: 'Magazine',
    admin: 'Admin',
    report: 'Report',

    totalIncome: 'Total Income',
    totalExpense: 'Total Expenses',
    totalCapital: 'Capital',
    totalReceivable: 'Receivables',

    tab1: '💳 Income/Expense',
    tab2: '🏦 Capital',
    tab3: '📈 Revenue',
    tab4: '💰 Petty Cash',
    tab5: '🧾 Reimbursement',
    tab6: '📤 Receivables',
    tab7: '🏗️ Fixed Assets',
    tab8: '📋 Admin Expenses',
    tab9: '👷 Payroll',
    tab10: '🌿 Base Expenses',

    print: '🖨️ Print',
    addRecord: '＋ Add Record',
    immersive: '✨ Immersive',
    back: '← Back',
    noData: 'No data',
    loadMore: 'Load more',

    colDate: 'Date',
    colType: 'Type',
    colSummary: 'Description',
    colIncome: 'Income',
    colExpense: 'Expense',
    colBalance: 'Balance',
    colInvoice: 'Invoice',

    colName: 'Shareholder',
    colAmount: 'Amount',
    colMethod: 'Method',
    colVoucher: 'Voucher',

    colCategory: 'Category',
    colSource: 'Source',

    colPerson: 'Person',
    colReason: 'Reason',

    colParty: 'Debtor',
    colStatus: 'Status',

    colAsset: 'Asset Name',
    colLocation: 'Location',

    colFeeType: 'Fee Type',
    colNote: 'Note',

    colMonth: 'Month',
    colPosition: 'Position',
    colPayDate: 'Pay Date',

    colBase: 'Base',
    colItem: 'Item',

    typeIncome: 'Income',
    typeExpense: 'Expense',
    methodTransfer: 'Bank Transfer',
    methodCash: 'Cash',
    methodOther: 'Other',
    pettyDraw: 'Draw',
    pettyWriteoff: 'Write-off',
    personRen: 'Ren Haitao',
    personPang: 'Pang Shangtao',
    personYing: 'Ying Honglin',
    statusUnpaid: 'Unpaid',
    statusPartial: 'Partial',
    statusPaid: 'Paid',
    assetInUse: 'In Use',
    assetIdle: 'Idle',
    assetScrap: 'Scrapped',
    baseJinyinhua: 'Honeysuckle Base',
    baseDangshen: 'Codonopsis Base',
    baseSeedling: 'Seedling Base',

    unitYuan: '¥',
    unitThousand: 'k',
  }
};

var currentLang = 'zh';

function t(key) {
  var lang = LANG[currentLang] || LANG['zh'];
  return lang[key] || key;
}

function switchLang(lang) {
  currentLang = lang;
  localStorage.setItem('wyx_lang', lang);
  applyLang();
}

function applyLang() {
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  // 遍历所有有 data-lang-key 属性的元素
  document.querySelectorAll('[data-lk]').forEach(function(el) {
    var key = el.dataset.lk;
    if (key) el.textContent = t(key);
  });
  // 更新下拉框
  var sel = document.getElementById('langSelect');
  if (sel) sel.value = currentLang;
}

// 初始化语言
(function() {
  currentLang = localStorage.getItem('wyx_lang') || 'zh';
})();
