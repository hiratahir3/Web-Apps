const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db.prepare('SELECT * FROM products WHERE active = 1 AND category = ? ORDER BY id ASC').all(category)
    : db.prepare("SELECT * FROM products WHERE active = 1 AND category != 'gift_set' ORDER BY id ASC").all();
  res.json(rows);
});

router.get('/gift-sets', (req, res) => {
  const rows = db.prepare("SELECT * FROM products WHERE active = 1 AND category = 'gift_set' ORDER BY id ASC").all();
  res.json(rows);
});

router.get('/:idOrSlug', (req, res) => {
  const v = req.params.idOrSlug;
  const row = /^\d+$/.test(v)
    ? db.prepare('SELECT * FROM products WHERE id = ?').get(Number(v))
    : db.prepare('SELECT * FROM products WHERE slug = ?').get(v);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

module.exports = router;
