const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

router.get('/:lawyer_id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ar.*, l.full_name AS lawyer_name
       FROM availability_rule ar
       JOIN lawyer l ON ar.lawyer_id = l.lawyer_id
       WHERE ar.lawyer_id = ?
       ORDER BY ar.day_of_week, ar.start_time_utc`,
      [req.params.lawyer_id]
    );
    // Agregar label del día
    res.json(rows.map(r => ({ ...r, day_label: DAYS[r.day_of_week] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { lawyer_id, day_of_week, start_time_utc, end_time_utc, valid_from, valid_until } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO availability_rule
         (lawyer_id, day_of_week, start_time_utc, end_time_utc, valid_from, valid_until)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lawyer_id, day_of_week, start_time_utc, end_time_utc, valid_from, valid_until || null]
    );
    res.status(201).json({ availability_rule_id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM availability_rule WHERE availability_rule_id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
