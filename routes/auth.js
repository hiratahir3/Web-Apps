const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const cookieOpts = { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 };

router.post('/signup', (req, res) => {
  const { email, password, name, phone } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be 6+ chars' });
  const e = email.trim().toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(e);
  if (exists) return res.status(409).json({ error: 'Account already exists — try signing in' });
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (email,password_hash,name,phone) VALUES (?,?,?,?)').run(e, hash, name || null, phone || null);
  const token = sign({ kind: 'user', id: info.lastInsertRowid, email: e });
  res.cookie('lum_token', token, cookieOpts);
  res.json({ token, user: { id: info.lastInsertRowid, email: e, name: name || null } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const e = email.trim().toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(e);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = sign({ kind: 'user', id: u.id, email: u.email });
  res.cookie('lum_token', token, cookieOpts);
  res.json({ token, user: { id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, city: u.city } });
});

router.post('/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const e = email.trim().toLowerCase();
  const a = db.prepare('SELECT * FROM admins WHERE email = ?').get(e);
  if (!a || !bcrypt.compareSync(password, a.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = sign({ kind: 'admin', id: a.id, email: a.email });
  res.cookie('lum_token', token, cookieOpts);
  res.json({ token, admin: { id: a.id, email: a.email, name: a.name } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('lum_token');
  res.json({ ok: true });
});

router.get('/me', optionalAuth, (req, res) => {
  if (!req.auth) return res.json({ user: null, admin: null });
  if (req.auth.kind === 'user') {
    const u = db.prepare('SELECT id,email,name,phone,address,city FROM users WHERE id = ?').get(req.auth.id);
    return res.json({ user: u, admin: null });
  }
  if (req.auth.kind === 'admin') {
    const a = db.prepare('SELECT id,email,name FROM admins WHERE id = ?').get(req.auth.id);
    return res.json({ user: null, admin: a });
  }
  res.json({ user: null, admin: null });
});

router.put('/me', optionalAuth, (req, res) => {
  if (!req.auth || req.auth.kind !== 'user') return res.status(401).json({ error: 'Login required' });
  const { name, phone, address, city } = req.body || {};
  db.prepare('UPDATE users SET name=?, phone=?, address=?, city=? WHERE id = ?')
    .run(name || null, phone || null, address || null, city || null, req.auth.id);
  const u = db.prepare('SELECT id,email,name,phone,address,city FROM users WHERE id = ?').get(req.auth.id);
  res.json({ user: u });
});

module.exports = router;
