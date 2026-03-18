const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

const BASE_SELECT = `
  SELECT
    a.*,
    l.full_name        AS lawyer_name,
    l.timezone         AS lawyer_timezone,
    c.full_name        AS client_name,
    c.email            AS client_email,
    c.timezone         AS client_timezone,
    c.phone_number     AS client_phone,
    at.label           AS type_label,
    at.code            AS type_code,
    at.default_duration_min
  FROM appointment a
  JOIN lawyer           l  ON a.lawyer_id           = l.lawyer_id
  JOIN client           c  ON a.client_id           = c.client_id
  JOIN appointment_type at ON a.appointment_type_id = at.appointment_type_id
`;

// GET /appointments  (abogado ve las suyas o todas; cliente ve SOLO las suyas)
router.get('/', auth, async (req, res) => {
  const { from, to, status } = req.query;
  let { lawyer_id } = req.query;

  let sql    = BASE_SELECT + ' WHERE 1=1';
  const params = [];

  // Si el token es de cliente, forzar filtro por su client_id (ignora cualquier parámetro)
  if (req.user.role === 'client') {
    sql += ' AND a.client_id = ?';
    params.push(req.user.client_id);
  } else {
    // Abogado: puede filtrar por lawyer_id o ver todos
    if (lawyer_id) { sql += ' AND a.lawyer_id = ?'; params.push(lawyer_id); }
  }

  if (from)   { sql += ' AND a.starts_at_utc >= ?'; params.push(from); }
  if (to)     { sql += ' AND a.ends_at_utc <= ?';   params.push(to); }
  if (status) { sql += ' AND a.status = ?';          params.push(status); }
  sql += ' ORDER BY a.starts_at_utc ASC';

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /appointments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      BASE_SELECT + ' WHERE a.appointment_id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });

    // Cliente solo puede ver sus propias citas
    const appt = rows[0];
    if (req.user.role === 'client' && appt.client_id !== req.user.client_id)
      return res.status(403).json({ error: 'Sin acceso' });

    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /appointments  — solo abogados
router.post('/', auth, async (req, res) => {
  if (req.user.role === 'client') return res.status(403).json({ error: 'Sin permiso' });

  const { lawyer_id, client_id, appointment_type_id, starts_at_utc, ends_at_utc, notes } = req.body;
  if (!lawyer_id || !client_id || !appointment_type_id || !starts_at_utc || !ends_at_utc)
    return res.status(400).json({ error: 'Faltan campos requeridos' });

  try {
    const [overlap] = await db.query(
      `SELECT appointment_id FROM appointment
       WHERE lawyer_id = ? AND status NOT IN ('CANCELLED')
         AND starts_at_utc < ? AND ends_at_utc > ?`,
      [lawyer_id, ends_at_utc, starts_at_utc]
    );
    if (overlap.length)
      return res.status(409).json({ error: 'El abogado ya tiene una cita en ese horario' });

    const [result] = await db.query(
      `INSERT INTO appointment (lawyer_id, client_id, appointment_type_id, starts_at_utc, ends_at_utc, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lawyer_id, client_id, appointment_type_id, starts_at_utc, ends_at_utc, notes || null]
    );
    res.status(201).json({ appointment_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /appointments/:id  — solo abogados
router.put('/:id', auth, async (req, res) => {
  if (req.user.role === 'client') return res.status(403).json({ error: 'Sin permiso' });
  const { lawyer_id, client_id, appointment_type_id, starts_at_utc, ends_at_utc, notes, status } = req.body;
  try {
    await db.query(
      `UPDATE appointment
       SET lawyer_id=?, client_id=?, appointment_type_id=?,
           starts_at_utc=?, ends_at_utc=?, notes=?, status=?, updated_at=NOW()
       WHERE appointment_id=?`,
      [lawyer_id, client_id, appointment_type_id, starts_at_utc, ends_at_utc, notes, status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /appointments/:id/status  — solo abogados
router.patch('/:id/status', auth, async (req, res) => {
  if (req.user.role === 'client') return res.status(403).json({ error: 'Sin permiso' });
  const { status } = req.body;
  const valid = ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  try {
    await db.query(
      'UPDATE appointment SET status=?, updated_at=NOW() WHERE appointment_id=?',
      [status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /appointments/:id  — solo abogados
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role === 'client') return res.status(403).json({ error: 'Sin permiso' });
  try {
    await db.query(
      'UPDATE appointment SET status="CANCELLED", updated_at=NOW() WHERE appointment_id=?',
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
