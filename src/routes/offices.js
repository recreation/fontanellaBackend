const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// Countries
router.get('/countries', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM country ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/countries', auth, async (req, res) => {
  const { name, iso_code } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO country (name, iso_code) VALUES (?, ?)',
      [name, iso_code.toUpperCase()]
    );
    res.status(201).json({ country_id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Offices
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT o.*, c.name AS country_name, c.iso_code
       FROM office o
       JOIN country c ON o.country_id = c.country_id
       ORDER BY c.name, o.name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { country_id, name } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO office (country_id, name) VALUES (?, ?)',
      [country_id, name]
    );
    res.status(201).json({ office_id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { country_id, name } = req.body;
  try {
    await db.query(
      'UPDATE office SET country_id=?, name=?, updated_at=NOW() WHERE office_id=?',
      [country_id, name, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM office WHERE office_id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
