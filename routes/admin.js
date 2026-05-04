const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// --- Dashboard summary ---
router.get('/summary', (_req, res) => {
  const orderCount = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const pending = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) AS s FROM orders WHERE payment_status = 'paid' OR status = 'shipped' OR status = 'delivered'").get().s;
  const productCount = db.prepare('SELECT COUNT(*) AS c FROM products WHERE active = 1').get().c;
  const messages = db.prepare('SELECT COUNT(*) AS c FROM contacts WHERE read_at IS NULL').get().c;
  res.json({ orderCount, pending, revenue, productCount, messages });
});

// --- Products CRUD ---
router.get('/products', (_req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY id ASC').all());
});

router.post('/products', (req, res) => {
  const { slug, name, note, description, price, image, badge, card_class, glow_class, stock, active } = req.body || {};
  if (!slug || !name || !price) return res.status(400).json({ error: 'slug, name, price required' });
  try {
    const info = db.prepare(`INSERT INTO products (slug,name,note,description,price,image,badge,card_class,glow_class,stock,active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(slug, name, note || null, description || null, price, image || null,
        badge || null, card_class || 'card-bg-1', glow_class || 'glow-1', stock ?? 100, active ?? 1);
    res.json({ id: info.lastInsertRowid });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/products/:id', (req, res) => {
  const { slug, name, note, description, price, image, badge, card_class, glow_class, stock, active } = req.body || {};
  db.prepare(`UPDATE products SET slug=?,name=?,note=?,description=?,price=?,image=?,badge=?,card_class=?,glow_class=?,stock=?,active=? WHERE id=?`)
    .run(slug, name, note || null, description || null, price, image || null, badge || null,
      card_class || 'card-bg-1', glow_class || 'glow-1', stock ?? 100, active ?? 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/products/:id', (req, res) => {
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Orders ---
router.get('/orders', (req, res) => {
  const status = req.query.status;
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  for (const o of rows) o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  res.json(rows);
});

router.patch('/orders/:id', (req, res) => {
  const { status, payment_status } = req.body || {};
  const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Bad status' });
  if (status) db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (payment_status) db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(payment_status, req.params.id);
  res.json({ ok: true });
});

// --- Contacts ---
router.get('/contacts', (_req, res) => {
  res.json(db.prepare('SELECT * FROM contacts ORDER BY id DESC').all());
});

router.patch('/contacts/:id/read', (req, res) => {
  db.prepare('UPDATE contacts SET read_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/contacts/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
