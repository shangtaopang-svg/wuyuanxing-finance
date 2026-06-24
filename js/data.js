// ===== 数据源 - 由服务器API统一提供 =====
// 所有数据从后台录入，前台只读展示
var DataStore = {
  incomeExpense: [],
  capital: [],
  income: [],
  pettyDraw: [],
  pettyWrite: [],
  pettyCash: { ren: [], pang: [] },
  _pettyCashFlat: [],
  reimburse: { ren: [], pang: [], ying: [] },
  _reimburseFlat: [],
  receivable: [],
  asset: [],
  management: [],
  salary: [],
  baseExpense: [],
  companyInfo: [],
  contracts: [],
  bankAccounts: []
};
