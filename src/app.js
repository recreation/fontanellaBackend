require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/lawyers',      require('./routes/lawyers'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/offices',      require('./routes/offices'));
app.use('/api/availability', require('./routes/availability'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  API corriendo en http://localhost:${PORT}`));
