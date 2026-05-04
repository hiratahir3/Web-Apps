const express = require('express');
const db = require('../db');
const { notifyOwner } = require('../middleware/notify');

const router = express.Router();

// Mounted at /api/stripe/webhook with express.raw() in server.js
router.post('/webhook', (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).end();
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = process.env.STRIPE_WEBHOOK_SECRET
      ? stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
      : JSON.parse(req.body.toString());
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const orderId = s.metadata && s.metadata.order_id;
    if (orderId) {
      db.prepare("UPDATE orders SET payment_status='paid', status='confirmed' WHERE id = ?").run(orderId);
      notifyOwner(`✦ Payment received for order #${orderId}`);
    }
  }
  res.json({ received: true });
});

module.exports = router;
