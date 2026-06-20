// ===== 五源兴农业 · 示例数据 =====
// 这里的数据您可以替换为真实数据

var DataStore = {
  // ① 基本账户收支
  incomeExpense: [
    { date: '2026-01-15', type: '收入', summary: '股东首期出资', income: 500000, expense: 0, balance: 500000, invoices: [] },
    { date: '2026-01-20', type: '支出', summary: '党参苗采购', income: 0, expense: 86000, balance: 414000, invoices: ['党参苗发票汇总.xlsx'] },
    { date: '2026-02-05', type: '支出', summary: '基地整地费用', income: 0, expense: 35000, balance: 379000, invoices: ['耕地合同及发票/发票.pdf'] },
    { date: '2026-02-18', type: '支出', summary: '购置栽种机', income: 0, expense: 48000, balance: 331000, invoices: ['栽种机.pdf'] },
    { date: '2026-03-10', type: '支出', summary: '化肥采购', income: 0, expense: 12000, balance: 319000, invoices: ['化肥.pdf'] },
    { date: '2026-04-01', type: '支出', summary: '5月份工资', income: 0, expense: 45000, balance: 274000, invoices: [] },
  ],

  // ② 股本金
  capital: [
    { date: '2026-01-10', name: '庞尚韬', amount: 200000, method: '银行转账', voucher: '' },
    { date: '2026-01-10', name: '任海涛', amount: 150000, method: '银行转账', voucher: '' },
    { date: '2026-01-10', name: '应红林', amount: 150000, method: '银行转账', voucher: '' },
  ],

  // ③ 收入
  income: [
    { date: '2026-03-20', category: '药材销售', amount: 0, source: '', voucher: '' },
  ],

  // ④ 备用金
  pettyCash: {
    ren: [
      { date: '2026-04-01', type: '领用', amount: 30000, summary: '备用金领用', voucher: '' },
      { date: '2026-05-20', type: '核销', amount: 28500, summary: '报销核销', voucher: '' },
    ],
    pang: [
      { date: '2026-06-14', type: '领用', amount: 20000, summary: '出差备用金', voucher: '' },
    ]
  },

  // ⑤ 报销
  reimburse: {
    ren: [
      { date: '2026-05-18', amount: 2020.58, reason: '出差报销', docs: ['报销凭证（罗会计整理）/2020.58/任海涛5.18日报销明细（金额：2020.58）.xls'] },
      { date: '2026-05-21', amount: 477, reason: '报销', docs: ['报销凭证（罗会计整理）/477/任海涛5.21的报销明细（金额：477）.xls'] },
      { date: '2026-05-25', amount: 1844.68, reason: '报销', docs: ['报销凭证（罗会计整理）/1844.68/任海涛(2026.5.25-28号）.xls'] },
      { date: '2026-05-21', amount: 16055.92, reason: '报销', docs: ['报销凭证（罗会计整理）/16055.92/任海涛(2026.5.21)带过来资料报销明细(1).xlsx'] },
    ],
    pang: [
      { date: '2026-06-17', amount: 5800, reason: '出差报销（南京-亳州-西安-成都-西昌）', docs: ['庞尚韬备用金使用情况/6.14起出差/报销单.xlsx'] },
    ],
    ying: [
      { date: '2026-05-21', amount: 7528.88, reason: '报销', docs: ['报销凭证（罗会计整理）/应红林/应红林5.21报销明细表（金额：7528.88）.xls'] },
    ]
  },

  // ⑥ 应收账款 (空示例)
  receivable: [],

  // ⑦ 固定资产
  asset: [
    { date: '2026-02-18', name: '栽种机', amount: 48000, location: '甘洛基地', status: '在用' },
    { date: '2026-03-05', name: '皮卡车', amount: 85000, location: '公司', status: '在用' },
  ],

  // ⑧ 管理费用
  management: [
    { date: '2026-04-10', category: '办公费', amount: 3200, summary: '办公用品采购', invoices: [] },
    { date: '2026-05-15', category: '差旅费', amount: 5800, summary: '庞尚韬出差', invoices: [] },
  ],

  // ⑨ 工资
  salary: [
    { month: '2026-05', name: '基地工人', position: '种植', amount: 35000, payDate: '2026-05-31', voucher: '' },
    { month: '2026-05', name: '管理人员', position: '管理', amount: 10000, payDate: '2026-05-31', voucher: '' },
  ],

  // ⑩ 基地支出
  baseExpense: {
    jinyinhua: [
      { date: '2026-03-10', item: '化肥采购', amount: 12000, note: '金银花基地用', invoices: ['化肥.pdf'] },
    ],
    dangshen: [
      { date: '2026-01-20', item: '党参苗采购', amount: 86000, note: '', invoices: ['党参/党参苗采购统计表.xlsx'] },
      { date: '2026-03-15', item: '打地费用', amount: 16352, note: '', invoices: ['发票/16352打地费用.pdf'] },
      { date: '2026-04-10', item: '农药', amount: 960, note: '公司账户支付', invoices: ['发票/农药960（公司账户支付）.pdf'] },
    ],
    seedling: []
  }
};
