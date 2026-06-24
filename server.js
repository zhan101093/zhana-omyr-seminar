const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'submissions.json');
const ADMIN_PASS = process.env.ADMIN_PASS || 'zhana2025';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ── Save phone + letter ── */
app.post('/submit', (req, res) => {
  const { phone, letter } = req.body;
  if (!phone) return res.status(400).json({ ok: false, error: 'phone required' });

  let data = [];
  if (fs.existsSync(DATA_FILE)) {
    try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) {}
  }

  data.push({
    phone,
    letter: letter || '',
    date: new Date().toISOString(),
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  res.json({ ok: true });
});

/* ── Admin panel ── */
app.get('/admin', (req, res) => {
  const pass = req.query.pass;
  if (pass !== ADMIN_PASS) {
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:400px;margin:auto">
        <h2>Кіру</h2>
        <form method="get">
          <input name="pass" type="password" placeholder="Құпия сөз"
            style="padding:10px;width:100%;border:1px solid #ccc;border-radius:8px;font-size:1rem">
          <button style="margin-top:12px;padding:10px 24px;background:#FF2D95;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem">Кіру</button>
        </form>
      </body></html>`);
  }

  let data = [];
  if (fs.existsSync(DATA_FILE)) {
    try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) {}
  }

  const rows = data.map((d, i) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:10px;color:#666">${i + 1}</td>
      <td style="padding:10px;font-weight:600">${d.phone}</td>
      <td style="padding:10px;color:#555;max-width:480px;white-space:pre-wrap">${d.letter || '—'}</td>
      <td style="padding:10px;color:#999;font-size:.8rem">${new Date(d.date).toLocaleString('kk-KZ')}</td>
    </tr>`).join('');

  res.send(`
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Admin — Өзіме хат</title>
      <style>
        body { font-family:'Segoe UI',sans-serif; background:#f9f0f5; margin:0; padding:24px; }
        h1 { color:#CC0060; margin-bottom:8px; }
        .count { color:#888; margin-bottom:24px; }
        table { width:100%; border-collapse:collapse; background:#fff;
                border-radius:12px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,.08); }
        th { background:#FF2D95; color:#fff; padding:12px 10px; text-align:left; }
        tr:hover { background:#fff5fa; }
        a.dl { display:inline-block; margin-top:16px; padding:10px 24px;
               background:#6c5ce7; color:#fff; border-radius:50px; text-decoration:none; font-weight:600; }
      </style>
    </head>
    <body>
      <h1>Admin Panel</h1>
      <p class="count">Барлығы: <b>${data.length}</b> жазба</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Телефон</th>
            <th>Хат мазмұны</th>
            <th>Күні</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#aaa">Жазба жоқ</td></tr>'}</tbody>
      </table>
      <a class="dl" href="/admin/export?pass=${pass}">📥 CSV жүктеу</a>
    </body>
    </html>`);
});

/* ── CSV export ── */
app.get('/admin/export', (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(403).send('Forbidden');
  let data = [];
  if (fs.existsSync(DATA_FILE)) {
    try { data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) {}
  }
  const csv = ['Телефон,Хат,Күні',
    ...data.map(d => `"${d.phone}","${(d.letter||'').replace(/"/g,'""')}","${d.date}"`)
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
  res.send('﻿' + csv);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
