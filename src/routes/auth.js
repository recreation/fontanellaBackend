const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

// ── Login abogado ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    const [rows] = await db.query(
      `SELECT l.*, o.name AS office_name
       FROM lawyer l
       JOIN office o ON l.office_id = o.office_id
       WHERE l.email = ?`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const lawyer = rows[0];
    const token  = jwt.sign(
      { role: 'lawyer', lawyer_id: lawyer.lawyer_id, email: lawyer.email, name: lawyer.full_name, timezone: lawyer.timezone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        role:     'lawyer',
        id:       lawyer.lawyer_id,
        name:     lawyer.full_name,
        email:    lawyer.email,
        office:   lawyer.office_name,
        timezone: lawyer.timezone,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Login cliente ─────────────────────────────────────────────────────────────
router.post('/client-login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM client WHERE email = ?',
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'No existe un cliente con ese email' });

    const client = rows[0];
    const token  = jwt.sign(
      { role: 'client', client_id: client.client_id, email: client.email, name: client.full_name, timezone: client.timezone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        role:     'client',
        id:       client.client_id,
        name:     client.full_name,
        email:    client.email,
        timezone: client.timezone,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
