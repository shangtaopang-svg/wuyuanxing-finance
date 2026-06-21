// ===== 五源兴 · 财务平台后端 =====
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'wyx-finance-secret-2026';
const DB_PATH = path.join(__dirname, 'finance.db');
const UPLOAD_DIR = path.join(__dirname, 'uploads/vouchers');

// ===== 首页直接渲染（服务端只注入日期，报销数据由客户端加载） =====
app.get('/', function(req, res) {
  try {
    var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    // 日期
    var cnDate = new Date().toLocaleDateString('zh-CN', {timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit'}).replace(/\//g, '-');
    html = html.replace('id="topDate">', 'id="topDate">' + cnDate);
    res.send(html);
  } catch(e) {
    console.error('[首页错误]', e.message);
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '.'), {
  maxAge: '1h',
  setHeaders: (res, p) => {
    if (p.match(/\.(css|js|png|jpg)$/)) res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// 文件上传
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// ===== 数据库初始化 =====
let db = null;
async function initDB() {
  const SQL = await initSqlJs();
  // 从已存在的文件加载
  if (fs.existsSync(DB_PATH)) db = new SQL.Database(fs.readFileSync(DB_PATH));
  else db = new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'admin'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS income_expense (
    id INTEGER PRIMARY KEY, date TEXT, type TEXT, summary TEXT, income REAL DEFAULT 0,
    expense REAL DEFAULT 0, balance REAL DEFAULT 0, invoices TEXT DEFAULT '[]'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS capital (
    id INTEGER PRIMARY KEY, date TEXT, name TEXT, amount REAL, method TEXT, voucher TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY, date TEXT, category TEXT, amount REAL, source TEXT, voucher TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS petty_cash (
    id INTEGER PRIMARY KEY, date TEXT, person TEXT, type TEXT, amount REAL, summary TEXT, voucher TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS reimburse (
    id INTEGER PRIMARY KEY, date TEXT, person TEXT, amount REAL, reason TEXT, docs TEXT DEFAULT '[]'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS receivable (
    id INTEGER PRIMARY KEY, date TEXT, party TEXT, amount REAL, reason TEXT, status TEXT DEFAULT '未收回'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS asset (
    id INTEGER PRIMARY KEY, date TEXT, name TEXT, amount REAL, location TEXT, status TEXT DEFAULT '在用'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS management (
    id INTEGER PRIMARY KEY, date TEXT, category TEXT, amount REAL, summary TEXT, invoices TEXT DEFAULT '[]'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS salary (
    id INTEGER PRIMARY KEY, month TEXT, name TEXT, position TEXT, amount REAL, pay_date TEXT, voucher TEXT DEFAULT ''
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS base_expense (
    id INTEGER PRIMARY KEY, date TEXT, base TEXT, item TEXT, amount REAL, note TEXT, invoices TEXT DEFAULT '[]'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS bank_flow (
    id INTEGER PRIMARY KEY, date TEXT, income REAL DEFAULT 0,
    expense REAL DEFAULT 0, counterparty_account TEXT DEFAULT '', counterparty_name TEXT DEFAULT '',
    purpose TEXT DEFAULT '', summary TEXT DEFAULT ''
  )`);

  // 插入默认管理员
  const users = db.exec("SELECT COUNT(*) as c FROM users");
  if (!users[0] || users[0].values[0][0] === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', hash]);
  }

  saveDB();
  console.log('[DB] 数据库已初始化');
}

function saveDB() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function query(sql, params) {
  try {
    const r = db.exec(sql, params);
    if (!r || !r[0]) return [];
    const cols = r[0].columns;
    return r[0].values.map(row => {
      const obj = {};
      row.forEach((v, i) => {
        if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
          try { obj[cols[i]] = JSON.parse(v); } catch(e) { obj[cols[i]] = v; }
        } else { obj[cols[i]] = v; }
      });
      return obj;
    });
  } catch(e) { console.error('SQL Error:', e); return []; }
}

function run(sql, params) { db.run(sql, params); saveDB(); }

// ===== JWT 认证中间件 =====
function authMW(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch(e) { res.status(401).json({ error: '登录已过期' }); }
}

// ===== 登录 =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = query("SELECT * FROM users WHERE username=?", [username]);
  if (!users.length || !bcrypt.compareSync(password, users[0].password))
    return res.status(401).json({ error: '用户名或密码错误' });
  const token = jwt.sign({ id: users[0].id, username, role: users[0].role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
});

app.get('/api/verify', authMW, (req, res) => res.json({ ok: true }));

// ===== 通用CRUD API =====
const TABLE_MAP = {
  incomeExpense: { table: 'income_expense', fields: ['date','type','summary','income','expense','balance','invoices'] },
  capital: { table: 'capital', fields: ['date','name','amount','method','voucher'] },
  income: { table: 'income', fields: ['date','category','amount','source','voucher'] },
  pettyCash: { table: 'petty_cash', fields: ['date','person','type','amount','summary','voucher'] },
  reimburse: { table: 'reimburse', fields: ['date','reimburse_date','person','amount','reason','docs','batch_id','payment_method'] },
  receivable: { table: 'receivable', fields: ['date','party','amount','reason','status'] },
  asset: { table: 'asset', fields: ['date','name','amount','location','status'] },
  management: { table: 'management', fields: ['date','category','amount','summary','invoices'] },
  salary: { table: 'salary', fields: ['month','name','position','amount','pay_date','voucher'] },
  baseExpense: { table: 'base_expense', fields: ['date','base','item','amount','note','invoices'] },
  bankFlow: { table: 'bank_flow', fields: ['date','income','expense','counterparty_account','counterparty_name','purpose','summary'] }
};

// 获取数据
app.get('/api/data/:section', authMW, (req, res) => {
  const cfg = TABLE_MAP[req.params.section];
  if (!cfg) return res.status(400).json({ error: '未知版块' });
  const data = query(`SELECT * FROM ${cfg.table} ORDER BY id DESC`);
  res.json(data);
});

// 保存全部数据（覆盖式）
app.post('/api/data/:section', authMW, (req, res) => {
  const cfg = TABLE_MAP[req.params.section];
  if (!cfg) return res.status(400).json({ error: '未知版块' });
  const { data } = req.body;
  if (!Array.isArray(data)) return res.status(400).json({ error: '数据格式错误' });

  // 清空旧数据
  run(`DELETE FROM ${cfg.table}`);

  // 插入新数据
  data.forEach(row => {
    const vals = cfg.fields.map(f => {
      const v = row[f];
      return Array.isArray(v) ? JSON.stringify(v) : (v !== undefined && v !== null ? v : '');
    });
    const placeholders = cfg.fields.map(() => '?').join(',');
    run(`INSERT INTO ${cfg.table} (${cfg.fields.join(',')}) VALUES (${placeholders})`, vals);
  });

  res.json({ ok: true, count: data.length });
});

// ===== 公开只读API =====
app.get('/api/public/reimburse', function(req, res) {
  try {
    var data = query("SELECT date, reimburse_date, person, amount, reason, docs, payment_method FROM reimburse ORDER BY id");
    res.json(data);
  } catch(e) { res.json([]); }
});

// ===== 直接保存报销单据文件（按 date+person+amount 匹配） =====
app.post('/api/save-doc', authMW, (req, res) => {
  try {
    const { date, person, amount, docs } = req.body;
    if (!date || !person || !amount) return res.status(400).json({ error: '缺少参数' });
    run("UPDATE reimburse SET docs=? WHERE date=? AND person=? AND amount=?", [docs, date, person, amount]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ===== 公开只读API - 所有版块 =====
const PUBLIC_SECTIONS = {
  capital: { fields: ['date','name','amount','method','voucher'] },
  incomeExpense: { fields: ['date','type','summary','income','expense','balance','invoices'] },
  income: { fields: ['date','category','amount','source','voucher'] },
  pettyCash: { fields: ['date','person','type','amount','summary','voucher'] },
  receivable: { fields: ['date','party','amount','reason','status'] },
  asset: { fields: ['date','name','amount','location','status'] },
  management: { fields: ['date','category','amount','summary','invoices'] },
  salary: { fields: ['month','name','position','amount','pay_date','voucher'] },
  bankFlow: { fields: ['date','income','expense','counterparty_account','counterparty_name','purpose','summary'] },
  baseExpense: { fields: ['date','base','item','amount','note','invoices'] }
};
Object.keys(PUBLIC_SECTIONS).forEach(function(key) {
  app.get('/api/public/' + key, function(req, res) {
    try {
      var cfg = PUBLIC_SECTIONS[key];
      var table = key === 'incomeExpense' ? 'income_expense' : key === 'pettyCash' ? 'petty_cash' : key === 'baseExpense' ? 'base_expense' : key;
      var data = query("SELECT " + cfg.fields.join(',') + " FROM " + table + " ORDER BY id");
      res.json(data);
    } catch(e) { res.json([]); }
  });
});

// ===== 文件上传 =====
app.post('/api/upload', authMW, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  res.json({ filename: req.file.filename, path: '/uploads/vouchers/' + req.file.filename });
});

// 发票文件预览
app.get('/uploads/vouchers/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('文件未找到');
  res.sendFile(filePath);
});

// ===== 数据校验API =====
app.get('/api/validate', authMW, (req, res) => {
  const errors = [];
  const ie = query("SELECT * FROM income_expense");
  const pc = query("SELECT * FROM petty_cash");
  const cap = query("SELECT * FROM capital");

  const totalExpense = ie.reduce((s, r) => s + (r.expense || 0), 0);
  const totalIncome = ie.reduce((s, r) => s + (r.income || 0), 0);

  if (totalExpense > totalIncome)
    errors.push({ type: 'warn', msg: `支出(${fmt(totalExpense)})大于收入(${fmt(totalIncome)})` });

  const noInv = ie.filter(r => r.expense > 0 && (!r.invoices || r.invoices.length === 0));
  if (noInv.length > 0) errors.push({ type: 'err', msg: `${noInv.length}笔支出缺发票` });

  // 备用金核销检查
  ['任海涛','庞尚韬'].forEach(p => {
    const items = pc.filter(r => r.person === p);
    const draw = items.filter(r => r.type === '领用').reduce((s,r) => s+(r.amount||0), 0);
    const wo = items.filter(r => r.type === '核销').reduce((s,r) => s+(r.amount||0), 0);
    if (wo > draw) errors.push({ type: 'err', msg: `${p}核销(${fmt(wo)})超过领用(${fmt(draw)})` });
  });

  if (cap.length === 0) errors.push({ type: 'warn', msg: '股本金为空' });

  res.json({ errors, totalExpense, totalIncome, totalCapital: cap.reduce((s,r)=>s+(r.amount||0),0) });
});

function fmt(n) { return '¥' + Number(n||0).toLocaleString('zh-CN', {minimumFractionDigits:2}); }

// ===== 启动 =====
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  🌾 五源兴财务平台
  ─────────────────────────────
  🌐 前台: http://localhost:${PORT}
  ⚙️  后台: http://localhost:${PORT}/admin.html
  🔐 默认账号: admin / admin123
  ─────────────────────────────`);
  });
});
