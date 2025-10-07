import express from 'express';
import crypto from 'crypto';
const router = express.Router();

// In-memory store: code -> original URL
const store = new Map();

// Middleware: validate URL provided in body or query, attach to req.toShortenUrl
function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function validateUrlMiddleware(req, res, next) {
  const original = req.body && req.body.url ? req.body.url : req.query && req.query.url;
  if (!original || !isValidUrl(original)) {
    const err = new Error('Invalid or missing url parameter');
    err.status = 400;
    return next(err);
  }
  req.toShortenUrl = original;
  next();
}

// Simple base62 encoder for a buffer
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function toBase62(buf) {
  let num = 0n;
  for (let i = 0; i < buf.length; i++) {
    num = (num << 8n) + BigInt(buf[i]);
  }
  if (num === 0n) return '0';
  let s = '';
  while (num > 0n) {
    const rem = num % 62n;
    s = alphabet[Number(rem)] + s;
    num = num / 62n;
  }
  return s;
}

function generateCode() {
  const id = crypto.randomBytes(4); // 32-bit random
  return toBase62(id).slice(0, 6);
}

// POST /shortner  { url: 'https://example.com' }  -> { short: 'abc123', shortUrl: 'http://host/shortner/abc123' }
router.post('/', validateUrlMiddleware, (req, res) => {
  const original = req.toShortenUrl;

  // Try to reuse existing code for same URL
  for (const [code, url] of store.entries()) {
    if (url === original) {
      const host = req.get('host');
      const proto = req.protocol;
      return res.json({ code, shortUrl: `${proto}://${host}/shortner/${code}` });
    }
  }

  // Create new
  let code;
  do {
    code = generateCode();
  } while (store.has(code));

  store.set(code, original);

  const host = req.get('host');
  const proto = req.protocol;
  res.status(201).json({ code, shortUrl: `${proto}://${host}/shortner/${code}` });
});

// GET /shortner/:code -> redirect
router.get('/:code', (req, res) => {
  const code = req.params.code;
  if (!store.has(code)) return res.status(404).json({ error: 'Not found' });
  const original = store.get(code);
  res.redirect(original);
});

export default router;
