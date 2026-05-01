/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         SAI SHURU NEXUS — FULL BACKEND SERVER               ║
 * ║         Node.js + Express + SQLite + JWT Auth               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * HOW TO RUN:
 *   1. npm install
 *   2. cp .env.example .env  (edit your settings)
 *   3. node server.js
 *   4. Open http://localhost:5000
 */

const express    = require('express');
const cors       = require('cors');
const Database   = require('better-sqlite3');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'ssn_super_secret_2025_change_me';

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));  // serve frontend

// ── Database Setup ──────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'ssn.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    phone        TEXT NOT NULL,
    college      TEXT,
    department   TEXT,
    project_type TEXT,
    topic        TEXT,
    deadline     TEXT,
    services     TEXT,
    description  TEXT,
    status       TEXT DEFAULT 'New',
    notes        TEXT DEFAULT '',
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    department  TEXT NOT NULL,
    type        TEXT NOT NULL,
    description TEXT,
    tags        TEXT DEFAULT '[]',
    active      INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    course     TEXT,
    review     TEXT NOT NULL,
    rating     INTEGER DEFAULT 5,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    icon        TEXT DEFAULT '📦',
    title       TEXT NOT NULL,
    description TEXT,
    tag         TEXT,
    type        TEXT DEFAULT 'clickable',
    active      INTEGER DEFAULT 1,
    sort_order  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT NOT NULL,
    details    TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Seed Default Data ───────────────────────────────────────────
function seed() {
  // Default admin
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('ssn2025', 10);
    db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hash);
    console.log('✅ Default admin created: admin / ssn2025');
  }

  // Default settings
  const settingDefaults = [
    ['site_name',    'Sai Shuru Nexus'],
    ['tagline',      'Your Digital Growth Partner'],
    ['phone',        '8489298244'],
    ['email',        'saishurunexus@gmail.com'],
    ['urgency_msg',  'Only 5 slots left this week — Book now!'],
    ['notify_email', ''],
    ['notify_wa',    '1'],
  ];
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  settingDefaults.forEach(([k, v]) => insertSetting.run(k, v));

  // Default services
  const svcCount = db.prepare('SELECT COUNT(*) as c FROM services').get().c;
  if (svcCount === 0) {
    const svcs = [
      ['📦', 'Mini Projects',       'Semester-level projects with code, docs and explanation.',                  'All Departments',     'clickable', 1],
      ['🎓', 'Final Year Projects', 'Full project: code, PPT, report, explanation and viva prep.',               'BCA/CS/DS/IT/AI',    'clickable', 2],
      ['📊', 'PPT + Report Only',   'Professional slides and detailed report if you already have the code.',     'Docs Only',          'clickable', 3],
      ['🎤', 'Viva Support',        'Q&A prep, explanation sessions and real-time viva day standby.',           'Viva Ready',         'clickable', 4],
      ['⚡', 'On-Time Delivery',    'Guaranteed before your deadline. Always included with every order.',       '✓ Always Included',  'common',    5],
      ['💰', 'Affordable Pricing',  'Student-friendly rates. No hidden costs. Contact for a custom quote.',     '✓ Always Included',  'common',    6],
    ];
    const ins = db.prepare(
      'INSERT INTO services (icon,title,description,tag,type,sort_order) VALUES (?,?,?,?,?,?)'
    );
    svcs.forEach(s => ins.run(...s));
  }

  // Default projects
  const projCount = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
  if (projCount === 0) {
    const projs = [
      ['Fake News Detection Using NLP',     'CS',          'Final Year', 'LSTM text classification for misinformation detection.',              '["Python","NLP","Final Year"]'],
      ['Plant Disease Detection via CNN',    'CS',          'Final Year', 'CNN identifying crop diseases from leaf images, 94% accuracy.',      '["TensorFlow","CNN","Final Year"]'],
      ['Stock Market Price Prediction',      'Data Science','Mini',       'LSTM model predicting stock trends from historical data.',            '["Python","LSTM","Mini"]'],
      ['Student Performance Predictor',      'Data Science','Final Year', 'ML web app predicting results using Flask interface.',               '["Flask","Scikit-learn","Final Year"]'],
      ['Twitter Sentiment Dashboard',        'AI',          'Mini',       'Real-time sentiment analysis with BERT + Streamlit dashboard.',      '["BERT","Streamlit","Mini"]'],
      ['College Management System',          'BCA',         'Final Year', 'Full-stack admin/student/faculty web application.',                  '["PHP","MySQL","Final Year"]'],
      ['AI Chatbot for FAQ',                 'AI',          'Final Year', 'NLP chatbot handling student FAQs with intent classification.',      '["Python","NLP","AI"]'],
      ['Library Management System',          'BCA',         'Mini',       'Desktop app for books, members and issue tracking.',                 '["Java","MySQL","Mini"]'],
      ['Face Recognition Attendance',        'CS',          'Final Year', 'Automated attendance using OpenCV facial recognition.',              '["OpenCV","Python","Final Year"]'],
      ['E-Commerce Web Platform',            'IT',          'Final Year', 'Complete shopping site with cart, payments and admin panel.',        '["React","Node.js","Final Year"]'],
      ['Inventory Management System',        'IT',          'Mini',       'Web-based inventory tracker with low-stock alerts.',                 '["PHP","MySQL","Mini"]'],
      ['Sales Forecasting with ML',          'Data Science','Mini',       'Regression model predicting future sales from historical patterns.', '["Python","Pandas","Mini"]'],
    ];
    const ins = db.prepare(
      'INSERT INTO projects (name,department,type,description,tags) VALUES (?,?,?,?,?)'
    );
    projs.forEach(p => ins.run(...p));
  }

  // Default testimonials
  const testiCount = db.prepare('SELECT COUNT(*) as c FROM testimonials').get().c;
  if (testiCount === 0) {
    const testis = [
      ['Rahul K.',  'BCA Final Year · 2024',         'Got my final year project on time with full viva support. Answered every question confidently!', 5],
      ['Priya S.',  'Data Science · Semester 6',      'Panicking 2 days before submission. They delivered ML project + PPT in 48 hours. Amazing!',      5],
      ['Arjun M.',  'CS Final Year · 2024',           'Best decision. Project was original, well-documented, viva prep was perfect. Got great marks!',   5],
      ['Neha T.',   'Information Technology · 2024',  'Very affordable and professional. AI project topic suggestion was great. Before deadline!',       5],
      ['Vikram R.', 'BCA Mini Project · 2024',        'WhatsApp response super fast! Mini project was clean and exactly what my college needed.',         5],
      ['Sneha K.',  'AI Department · 2024',           'Ordered PPT and report only. My professor was genuinely impressed. Worth every rupee!',            5],
    ];
    const ins = db.prepare(
      'INSERT INTO testimonials (name,course,review,rating) VALUES (?,?,?,?)'
    );
    testis.forEach(t => ins.run(...t));
  }
}
seed();

// ── Email Notifier ──────────────────────────────────────────────
async function sendOrderEmail(order) {
  const emailSetting = db.prepare("SELECT value FROM settings WHERE key='notify_email'").get();
  if (!emailSetting || !emailSetting.value) return;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      }
    });
    await transporter.sendMail({
      from: `Sai Shuru Nexus <${process.env.EMAIL_USER}>`,
      to: emailSetting.value,
      subject: `🔔 New Project Order — ${order.name} (${order.department})`,
      html: `
        <h2 style="color:#6d28d9">New Project Request</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${order.name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${order.phone}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">College</td><td style="padding:8px">${order.college}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Department</td><td style="padding:8px">${order.department}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Type</td><td style="padding:8px">${order.project_type}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Topic</td><td style="padding:8px">${order.topic || 'Need suggestion'}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Deadline</td><td style="padding:8px">${order.deadline}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Description</td><td style="padding:8px">${order.description}</td></tr>
        </table>
        <a href="http://localhost:${PORT}/admin.html" style="background:#6d28d9;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View in Admin Panel</a>
      `
    });
  } catch (e) {
    console.error('Email notification failed:', e.message);
  }
}

function logActivity(action, details = '') {
  db.prepare('INSERT INTO activity_log (action, details) VALUES (?, ?)').run(action, details);
}

// ── Auth Middleware ─────────────────────────────────────────────
function authRequired(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  PUBLIC API — No auth needed (frontend calls these)
// ═══════════════════════════════════════════════════════════════

// POST /api/orders — Submit a new order from the website form
app.post('/api/orders', (req, res) => {
  const { name, phone, college, department, project_type, topic, deadline, services, description } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO orders (name,phone,college,department,project_type,topic,deadline,services,description)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(name, phone, college||'', department||'', project_type||'', topic||'', deadline||'', services||'', description||'');

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    logActivity('NEW_ORDER', `${name} | ${phone} | ${department}`);
    sendOrderEmail(order).catch(() => {});
    res.json({ success: true, order_id: result.lastInsertRowid, message: 'Order submitted successfully!' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save order: ' + e.message });
  }
});

// GET /api/public/projects — Active project topics for the site
app.get('/api/public/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects WHERE active=1 ORDER BY id DESC').all();
  res.json(projects.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') })));
});

// GET /api/public/testimonials — Active reviews for the site
app.get('/api/public/testimonials', (req, res) => {
  const testis = db.prepare('SELECT * FROM testimonials WHERE active=1 ORDER BY id DESC').all();
  res.json(testis);
});

// GET /api/public/services — Services for the site
app.get('/api/public/services', (req, res) => {
  const svcs = db.prepare('SELECT * FROM services WHERE active=1 ORDER BY sort_order').all();
  res.json(svcs);
});

// GET /api/public/settings — Public settings (name, phone, etc.)
app.get('/api/public/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN AUTH
// ═══════════════════════════════════════════════════════════════

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '12h' });
  logActivity('ADMIN_LOGIN', username);
  res.json({ token, username: admin.username });
});

// POST /api/admin/change-password
app.post('/api/admin/change-password', authRequired, (req, res) => {
  const { current, newPassword } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!bcrypt.compareSync(current, admin.password)) {
    return res.status(400).json({ error: 'Current password is wrong' });
  }
  if (newPassword.length < 6) return res.status(400).json({ error: 'Min 6 characters' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hash, req.admin.id);
  logActivity('PASSWORD_CHANGED', admin.username);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN — ORDERS
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/orders
app.get('/api/admin/orders', authRequired, (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status && status !== 'all') { sql += ' AND status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ? OR college LIKE ? OR department LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  sql += ' ORDER BY created_at DESC';
  const offset = (page - 1) * limit;
  const total = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as c')).get(...params).c;
  sql += ` LIMIT ${limit} OFFSET ${offset}`;
  const orders = db.prepare(sql).all(...params);
  res.json({ orders, total, page: +page, pages: Math.ceil(total / limit) });
});

// GET /api/admin/orders/:id
app.get('/api/admin/orders/:id', authRequired, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// PATCH /api/admin/orders/:id
app.patch('/api/admin/orders/:id', authRequired, (req, res) => {
  const { status, notes } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE orders SET status=?, notes=?, updated_at=datetime("now") WHERE id=?')
    .run(status || order.status, notes !== undefined ? notes : order.notes, req.params.id);
  logActivity('ORDER_UPDATED', `#${req.params.id} → ${status}`);
  res.json({ success: true });
});

// DELETE /api/admin/orders/:id
app.delete('/api/admin/orders/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  logActivity('ORDER_DELETED', `#${req.params.id}`);
  res.json({ success: true });
});

// DELETE /api/admin/orders — clear all
app.delete('/api/admin/orders', authRequired, (req, res) => {
  db.prepare('DELETE FROM orders').run();
  logActivity('ORDERS_CLEARED', 'All orders deleted');
  res.json({ success: true });
});

// GET /api/admin/orders/export/csv
app.get('/api/admin/export/orders', authRequired, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const headers = ['ID','Name','Phone','College','Department','Type','Topic','Deadline','Services','Description','Status','Notes','Created'];
  const rows = orders.map(o => [
    o.id, o.name, o.phone, o.college, o.department, o.project_type,
    o.topic, o.deadline, o.services, o.description, o.status, o.notes, o.created_at
  ].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="ssn_orders_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN — PROJECTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/projects', authRequired, (req, res) => {
  const projs = db.prepare('SELECT * FROM projects ORDER BY id DESC').all();
  res.json(projs.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') })));
});

app.post('/api/admin/projects', authRequired, (req, res) => {
  const { name, department, type, description, tags } = req.body;
  if (!name || !department || !type) return res.status(400).json({ error: 'Name, dept, type required' });
  const result = db.prepare(
    'INSERT INTO projects (name,department,type,description,tags) VALUES (?,?,?,?,?)'
  ).run(name, department, type, description||'', JSON.stringify(tags||[]));
  logActivity('PROJECT_ADDED', name);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.patch('/api/admin/projects/:id', authRequired, (req, res) => {
  const { name, department, type, description, tags, active } = req.body;
  const p = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE projects SET name=?,department=?,type=?,description=?,tags=?,active=? WHERE id=?')
    .run(name||p.name, department||p.department, type||p.type, description||p.description,
         JSON.stringify(tags||JSON.parse(p.tags)), active!==undefined?active:p.active, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/projects/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  logActivity('PROJECT_DELETED', `#${req.params.id}`);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN — TESTIMONIALS
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/testimonials', authRequired, (req, res) => {
  res.json(db.prepare('SELECT * FROM testimonials ORDER BY id DESC').all());
});

app.post('/api/admin/testimonials', authRequired, (req, res) => {
  const { name, course, review, rating } = req.body;
  if (!name || !review) return res.status(400).json({ error: 'Name and review required' });
  const r = db.prepare('INSERT INTO testimonials (name,course,review,rating) VALUES (?,?,?,?)').run(name, course||'', review, rating||5);
  res.json({ success: true, id: r.lastInsertRowid });
});

app.patch('/api/admin/testimonials/:id', authRequired, (req, res) => {
  const { name, course, review, rating, active } = req.body;
  const t = db.prepare('SELECT * FROM testimonials WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE testimonials SET name=?,course=?,review=?,rating=?,active=? WHERE id=?')
    .run(name||t.name, course||t.course, review||t.review, rating||t.rating, active!==undefined?active:t.active, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/testimonials/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM testimonials WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN — SERVICES
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/services', authRequired, (req, res) => {
  res.json(db.prepare('SELECT * FROM services ORDER BY sort_order').all());
});

app.post('/api/admin/services', authRequired, (req, res) => {
  const { icon, title, description, tag, type, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const r = db.prepare('INSERT INTO services (icon,title,description,tag,type,sort_order) VALUES (?,?,?,?,?,?)').run(icon||'📦', title, description||'', tag||'', type||'clickable', sort_order||99);
  res.json({ success: true, id: r.lastInsertRowid });
});

app.patch('/api/admin/services/:id', authRequired, (req, res) => {
  const { icon, title, description, tag, type, active, sort_order } = req.body;
  const s = db.prepare('SELECT * FROM services WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE services SET icon=?,title=?,description=?,tag=?,type=?,active=?,sort_order=? WHERE id=?')
    .run(icon||s.icon, title||s.title, description||s.description, tag||s.tag, type||s.type,
         active!==undefined?active:s.active, sort_order||s.sort_order, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/services/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM services WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN — SETTINGS
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/settings', authRequired, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.put('/api/admin/settings', authRequired, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const upsertAll = db.transaction(items => {
    for (const [k, v] of items) upsert.run(k, v);
  });
  upsertAll(Object.entries(req.body));
  logActivity('SETTINGS_UPDATED', Object.keys(req.body).join(', '));
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN — DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/dashboard', authRequired, (req, res) => {
  const total    = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
  const newO     = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='New'").get().c;
  const inProg   = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='In Progress'").get().c;
  const done     = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='Completed'").get().c;
  const projects = db.prepare("SELECT COUNT(*) as c FROM projects WHERE active=1").get().c;
  const reviews  = db.prepare("SELECT COUNT(*) as c FROM testimonials WHERE active=1").get().c;
  const recent   = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5").all();
  const byDept   = db.prepare("SELECT department, COUNT(*) as count FROM orders GROUP BY department ORDER BY count DESC").all();
  const byType   = db.prepare("SELECT project_type, COUNT(*) as count FROM orders GROUP BY project_type ORDER BY count DESC").all();
  const activity = db.prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10").all();
  res.json({ total, newO, inProg, done, projects, reviews, recent, byDept, byType, activity });
});

// ── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Sai Shuru Nexus Backend running at http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Default login: admin / ssn2025\n`);
});
