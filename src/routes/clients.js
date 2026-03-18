const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { search } = req.query;
  let sql    = 'SELECT * FROM client WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (full_name LIKE ? OR email LIKE ? OR phone_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY full_name';
  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM client WHERE client_id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { full_name, email, phone_number, country_code, timezone } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO client (full_name, email, phone_number, country_code, timezone) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, phone_number || null, country_code || null, timezone]
    );
    res.status(201).json({ client_id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { full_name, email, phone_number, country_code, timezone } = req.body;
  try {
    await db.query(
      `UPDATE client
       SET full_name=?, email=?, phone_number=?, country_code=?, timezone=?, updated_at=NOW()
       WHERE client_id=?`,
      [full_name, email, phone_number || null, country_code || null, timezone, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM client WHERE client_id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
