const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const { name, email, phone, message } = req.body || {};
  if (!name || !message) return res.status(400).json({ error: 'Name and message required' });
  if (message.length > 2000) return res.status(400).json({ error: 'Message too long' });
  const info = db.prepare('INSERT INTO contacts (name,email,phone,message) VALUES (?,?,?,?)')
    .run(name, email || null, phone || null, message);
  res.json({ ok: true, id: info.lastInsertRowid });
});

module.exports = router;
