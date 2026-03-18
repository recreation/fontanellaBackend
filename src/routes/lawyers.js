const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, o.name AS office_name, c.name AS country_name, c.iso_code
       FROM lawyer l
       JOIN office  o ON l.office_id  = o.office_id
       JOIN country c ON o.country_id = c.country_id
       ORDER BY l.full_name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, o.name AS office_name FROM lawyer l
       JOIN office o ON l.office_id = o.office_id
       WHERE l.lawyer_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { office_id, full_name, email, phone_number, timezone } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO lawyer (office_id, full_name, email, phone_number, timezone) VALUES (?, ?, ?, ?, ?)',
      [office_id, full_name, email, phone_number || null, timezone]
    );
    res.status(201).json({ lawyer_id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { office_id, full_name, email, phone_number, timezone } = req.body;
  try {
    await db.query(
      `UPDATE lawyer
       SET office_id=?, full_name=?, email=?, phone_number=?, timezone=?, updated_at=NOW()
       WHERE lawyer_id=?`,
      [office_id, full_name, email, phone_number || null, timezone, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM lawyer WHERE lawyer_id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
