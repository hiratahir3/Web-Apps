const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';

function sign(payload, opts = {}) {
  return jwt.sign(payload, SECRET(), { expiresIn: '30d', ...opts });
}

function readToken(req) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  if (req.cookies && req.cookies.lum_token) return req.cookies.lum_token;
  return null;
}

function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try { req.auth = jwt.verify(token, SECRET()); } catch {}
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.auth || req.auth.kind !== 'user') return res.status(401).json({ error: 'Login required' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.kind !== 'admin') return res.status(401).json({ error: 'Admin only' });
  next();
}

module.exports = { sign, optionalAuth, requireUser, requireAdmin };
