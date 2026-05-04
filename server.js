require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const { optionalAuth } = require('./middleware/auth');

const app = express();

// Stripe webhook needs raw body — mount BEFORE json parser
app.use('/api/stripe', express.raw({ type: 'application/json' }), require('./routes/stripeWebhook'));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(optionalAuth);

// Light rate limit on auth + contact endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true });
app.use('/api/auth', authLimiter);
app.use('/api/contacts', rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/admin', require('./routes/admin'));

// Expose stripe publishable key + currency
app.get('/api/config', (_req, res) => {
  res.json({
    stripe_pk: process.env.STRIPE_PUBLISHABLE_KEY || null,
    currency: (process.env.CURRENCY || 'pkr').toUpperCase(),
    cod_enabled: true,
    stripe_enabled: !!process.env.STRIPE_SECRET_KEY,
  });
});

// Static frontend
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// SPA-ish fallback for 404s on HTML routes (lets pretty URLs work)
app.use((req, res) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), err => {
      if (err) res.status(404).send('Not found');
    });
  }
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✦ Lumière server running on http://localhost:${PORT}`);
  const c = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (!c) console.log('  (No products yet — run `npm run seed`)');
});
