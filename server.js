const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* JSON Lines format — one JSON object per line.
   appendFileSync is atomic per-write, so concurrent users never corrupt the file. */
const DATA_FILE  = path.join(__dirname, 'submissions.jsonl');
const ADMIN_PASS = process.env.ADMIN_PASS || 'zhana2025';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

/* ── helpers ── */
function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return fs.readFileSync(DATA_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch (_) { return null; } })
    .filter(Boolean);
}

function appendEntry(entry) {
  /* appendFileSync is atomic at OS level — safe for concurrent requests */
  fs.appendFileSync(DATA_FILE, JSON.stringify(entry) + '\n', 'utf8');
}

/* ── POST /submit — save phone + letter ── */
app.post('/submit', (req, res) => {
  const { phone, letter } = req.body;
  if (!phone) return res.status(400).json({ ok: false, error: 'phone required' });

  appendEntry({
    phone:  String(phone).trim(),
    letter: String(letter || '').trim(),
    date:   new Date().toISOString(),
  });

  res.json({ ok: true });
});

/* ── GET /admin — panel ── */
app.get('/admin', (req, res) => {
  const pass = req.query.pass;
  if (pass !== ADMIN_PASS) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Admin</title></head>
      <body style="font-family:sans-serif;padding:40px;max-width:400px;margin:auto">
        <h2 style="color:#CC0060">Admin панелі</h2>
        <form method="get">
          <input name="pass" type="password" placeholder="Құпия сөз"
            style="padding:10px;width:100%;border:1.5px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box">
          <button style="margin-top:12px;padding:10px 28px;background:#FF2D95;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem;width:100%">Кіру</button>
        </form>
      </body></html>`);
  }

  const data = readAll();

  const rows = data.map((d, i) => `
    <tr style="border-bottom:1px solid #f0e0f0">
      <td style="padding:10px 8px;color:#999;font-size:.85rem">${i + 1}</td>
      <td style="padding:10px 8px;font-weight:600;white-space:nowrap">${escHtml(d.phone)}</td>
      <td style="padding:10px 8px;color:#444;max-width:500px;white-space:pre-wrap;font-size:.9rem">${escHtml(d.letter || '—')}</td>
      <td style="padding:10px 8px;color:#aaa;font-size:.8rem;white-space:nowrap">${new Date(d.date).toLocaleString('kk-KZ')}</td>
    </tr>`).join('');

  res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Admin — Өзіме хат</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;background:#fdf0f8;margin:0;padding:24px}
      h1{color:#CC0060;margin-bottom:4px}
      .sub{color:#999;margin-bottom:20px;font-size:.9rem}
      table{width:100%;border-collapse:collapse;background:#fff;
            border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08)}
      th{background:#FF2D95;color:#fff;padding:12px 8px;text-align:left;font-size:.9rem}
      tr:hover{background:#fff5fa}
      .btn{display:inline-block;margin-top:16px;padding:10px 24px;
           background:#6c5ce7;color:#fff;border-radius:50px;text-decoration:none;font-weight:600}
    </style></head><body>
    <h1>Admin Panel</h1>
    <p class="sub">Барлығы: <b>${data.length}</b> жазба</p>
    <table>
      <thead><tr><th>#</th><th>Телефон</th><th>Хат мазмұны</th><th>Күні</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="padding:24px;text-align:center;color:#ccc">Жазба жоқ</td></tr>'}</tbody>
    </table>
    <a class="btn" href="/admin/export?pass=${encodeURIComponent(pass)}">📥 CSV жүктеу</a>
  </body></html>`);
});

/* ── GET /admin/export — CSV ── */
app.get('/admin/export', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(403).send('Forbidden');
  const data = readAll();
  const csv = [
    'Телефон,Хат,Күні',
    ...data.map(d =>
      `"${d.phone}","${(d.letter || '').replace(/"/g, '""')}","${d.date}"`
    ),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
  res.send('﻿' + csv); /* BOM for Excel */
});

/* ── XSS helper ── */
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
