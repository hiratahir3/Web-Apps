const express = require('express');
const db = require('../db');
const { optionalAuth, requireUser } = require('../middleware/auth');
const { notifyOwner } = require('../middleware/notify');

const router = express.Router();
const SHIPPING_PKR = 250;

function buildOrder(items) {
  let subtotal = 0;
  const enriched = items.map(it => {
    const p = db.prepare('SELECT id,name,price,stock FROM products WHERE id = ? AND active = 1').get(it.product_id);
    if (!p) throw new Error(`Product ${it.product_id} not available`);
    const qty = Math.max(1, parseInt(it.qty || 1, 10));
    if (p.stock !== null && p.stock < qty) throw new Error(`${p.name} is out of stock`);
    subtotal += p.price * qty;
    return { product_id: p.id, name: p.name, price: p.price, qty };
  });
  const shipping = subtotal >= 8000 ? 0 : SHIPPING_PKR;
  return { items: enriched, subtotal, shipping, total: subtotal + shipping };
}

router.post('/', optionalAuth, async (req, res) => {
  try {
    const { items, customer, payment_method, notes } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Cart is empty' });
    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Name, phone, and address required' });
    }
    const built = buildOrder(items);
    const userId = req.auth && req.auth.kind === 'user' ? req.auth.id : null;
    const method = (payment_method === 'stripe' && process.env.STRIPE_SECRET_KEY) ? 'stripe' : 'cod';

    const tx = db.transaction(() => {
      const info = db.prepare(`INSERT INTO orders
        (user_id,status,payment_method,payment_status,customer_name,customer_email,customer_phone,address,city,notes,subtotal,shipping,total)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        userId, 'pending', method, method === 'cod' ? 'unpaid' : 'pending',
        customer.name, customer.email || null, customer.phone, customer.address, customer.city || null, notes || null,
        built.subtotal, built.shipping, built.total
      );
      const orderId = info.lastInsertRowid;
      const stmt = db.prepare('INSERT INTO order_items (order_id,product_id,name,qty,price) VALUES (?,?,?,?,?)');
      const decStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
      for (const it of built.items) {
        stmt.run(orderId, it.product_id, it.name, it.qty, it.price);
        decStock.run(it.qty, it.product_id);
      }
      return orderId;
    });

    const orderId = tx();

    let stripeUrl = null;
    if (method === 'stripe') {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: built.items.map(it => ({
            price_data: {
              currency: process.env.CURRENCY || 'pkr',
              product_data: { name: it.name },
              unit_amount: it.price * 100,
            },
            quantity: it.qty,
          })).concat(built.shipping ? [{
            price_data: { currency: process.env.CURRENCY || 'pkr', product_data: { name: 'Shipping' }, unit_amount: built.shipping * 100 },
            quantity: 1,
          }] : []),
          customer_email: customer.email || undefined,
          metadata: { order_id: String(orderId) },
          success_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/order-success.html?id=${orderId}`,
          cancel_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/checkout.html?cancelled=${orderId}`,
        });
        db.prepare('UPDATE orders SET payment_intent = ? WHERE id = ?').run(session.id, orderId);
        stripeUrl = session.url;
      } catch (e) {
        console.error('Stripe error:', e.message);
        return res.status(500).json({ error: 'Payment setup failed: ' + e.message });
      }
    }

    notifyOwner(`✦ New Lumière order #${orderId}\n${customer.name} — PKR ${built.total}\n${built.items.map(i => `• ${i.name} ×${i.qty}`).join('\n')}`);

    res.json({ id: orderId, total: built.total, stripe_url: stripeUrl, payment_method: method });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/me', requireUser, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.auth.id);
  for (const o of orders) {
    o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  }
  res.json(orders);
});

router.get('/:id', optionalAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  const isOwner = req.auth && req.auth.kind === 'user' && o.user_id === req.auth.id;
  const isAdmin = req.auth && req.auth.kind === 'admin';
  if (!isOwner && !isAdmin) {
    return res.json({ id: o.id, status: o.status, total: o.total, payment_status: o.payment_status, created_at: o.created_at });
  }
  o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  res.json(o);
});

module.exports = router;
