import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { authenticator } from 'otplib';
import { PDFParse } from 'pdf-parse';
import { db } from './db.js';
import './migrate.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const production = process.env.NODE_ENV === 'production';
const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const storageDir = process.env.STORAGE_DIR || path.resolve(process.cwd(), 'app-storage');
fs.mkdirSync(storageDir, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 60_000, limit: production ? 120 : 1000, standardHeaders: true, legacyHeaders: false }));

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return production
      ? res.status(503).json({ error: 'Billing webhook is not configured.' })
      : res.status(503).json({ error: 'Billing test mode is not configured.' });
  }
  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }
  const subscription = event.data?.object;
  if (subscription?.customer) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const status = subscription.status || null;
    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
    const user = db.prepare('SELECT id FROM users WHERE id=(SELECT user_id FROM billing_entitlements WHERE stripe_customer_id=? LIMIT 1)').get(customerId);
    if (user) {
      db.prepare(`
        UPDATE billing_entitlements
        SET plan=?,subscription_status=?,stripe_subscription_id=?,period_end=?,updated_at=datetime('now')
        WHERE user_id=? OR stripe_customer_id=?
      `).run(['active','trialing'].includes(status) ? 'paid-study' : 'free', status, subscription.id || null, periodEnd, user.id, customerId);
      db.prepare('UPDATE users SET plan=? WHERE id=?').run(['active','trialing'].includes(status) ? 'paid-study' : 'free', user.id);
    }
  }
  res.json({ received: true });
});

app.use(express.json({ limit: '1mb' }));

const SESSION_COOKIE = 'nurselog_session';
const ENTITY_NAMES = new Set([
  'SkillLog','HoursSession','SkillRequirement','AppSettings','StudySet','Flashcard','ExamQuestion',
  'StudyResponse','StudyAttempt','StudyMaterial','CaseStudy','ClassSession','User'
]);

function id(prefix = '') {
  return `${prefix}${crypto.randomUUID()}`;
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    full_name: row.name,
    email_verified: Boolean(row.email_verified),
    mfa_enabled: Boolean(row.mfa_enabled),
    plan: row.plan,
  };
}

function getSession(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const session = db.prepare(`
    SELECT s.*, u.email, u.name, u.email_verified, u.mfa_secret, u.mfa_enabled, u.plan
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.id=? AND s.expires_at > datetime('now')
  `).get(token);
  return session || null;
}

function requireUser(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  req.user = session;
  next();
}

function setSession(res, sessionId) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: production,
    sameSite: 'lax',
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: 'connected', independent: true });
});

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const name = String(req.body.name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) {
    return res.status(400).json({ error: 'Use a valid email and a password of at least 10 characters.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  const userId = id('usr_');
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO users(id,email,password_hash,name,email_verified) VALUES(?,?,?,?,0)')
    .run(userId, email, passwordHash, name);
  const token = id('verify_');
  db.prepare('INSERT INTO verification_tokens(token,user_id,expires_at,purpose) VALUES(?,?,datetime(\'now\',\'+24 hours\'),\'verify\')')
    .run(token, userId);
  if (!production) console.log(`[development] verification token for ${email}: ${token}`);
  return res.status(201).json({
    message: 'Account created. Check the email verification link.',
    ...(production ? {} : { development_verification_token: token }),
  });
});

app.post('/api/auth/verify-email', (req, res) => {
  const token = String(req.body.token || '');
  const row = db.prepare("SELECT * FROM verification_tokens WHERE token=? AND purpose='verify' AND expires_at > datetime('now')").get(token);
  if (!row) return res.status(400).json({ error: 'Verification link is invalid or expired.' });
  db.prepare('UPDATE users SET email_verified=1,updated_at=datetime(\'now\') WHERE id=?').run(row.user_id);
  db.prepare('DELETE FROM verification_tokens WHERE token=?').run(token);
  res.json({ success: true });
});

app.post('/api/auth/resend-verification', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (user && !user.email_verified) {
    db.prepare("DELETE FROM verification_tokens WHERE user_id=? AND purpose='verify'").run(user.id);
    const token = id('verify_');
    db.prepare("INSERT INTO verification_tokens(token,user_id,expires_at,purpose) VALUES(?,?,datetime('now','+24 hours'),'verify')").run(token, user.id);
    if (!production) console.log(`[development] verification token for ${email}: ${token}`);
  }
  res.json({ success: true });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !await bcrypt.compare(password, user.password_hash || '')) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (user.mfa_enabled) {
    const code = String(req.body.mfa_code || '');
    if (!code || !authenticator.check(code, user.mfa_secret || '')) {
      return res.status(401).json({ error: 'MFA code required.', mfa_required: true });
    }
  }
  const sessionId = id('ses_');
  db.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,datetime(\'now\',\'+14 days\'))')
    .run(sessionId, user.id);
  setSession(res, sessionId);
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', requireUser, (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  db.prepare('DELETE FROM sessions WHERE id=?').run(token);
  res.clearCookie(SESSION_COOKIE);
  res.json({ success: true });
});

app.get('/api/auth/me', requireUser, (req, res) => res.json(publicUser(req.user)));

app.post('/api/auth/forgot-password', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (user) {
    const token = id('reset_');
    db.prepare("INSERT INTO verification_tokens(token,user_id,expires_at,purpose) VALUES(?,?,datetime('now','+1 hour'),'reset')")
      .run(token, user.id);
    if (!production) console.log(`[development] password reset token for ${email}: ${token}`);
  }
  res.json({ success: true, ...(production ? {} : { message: 'If an account exists, a reset link was generated.' }) });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
  const row = db.prepare("SELECT * FROM verification_tokens WHERE token=? AND purpose='reset' AND expires_at > datetime('now')").get(token);
  if (!row) return res.status(400).json({ error: 'Reset link is invalid or expired.' });
  db.prepare('UPDATE users SET password_hash=?,updated_at=datetime(\'now\') WHERE id=?')
    .run(await bcrypt.hash(password, 12), row.user_id);
  db.prepare('DELETE FROM verification_tokens WHERE user_id=? AND purpose=?').run(row.user_id, 'reset');
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
  res.json({ success: true });
});

app.post('/api/auth/mfa/setup', requireUser, (req, res) => {
  const secret = authenticator.generateSecret();
  db.prepare('UPDATE users SET mfa_secret=? WHERE id=?').run(secret, req.user.user_id);
  res.json({
    secret,
    otpauth_uri: authenticator.keyuri(req.user.email, 'NurseLog', secret),
  });
});

app.post('/api/auth/mfa/enable', requireUser, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.user_id);
  if (!authenticator.check(String(req.body.code || ''), user.mfa_secret || '')) {
    return res.status(400).json({ error: 'Invalid MFA code.' });
  }
  db.prepare('UPDATE users SET mfa_enabled=1 WHERE id=?').run(user.id);
  res.json({ success: true });
});

app.post('/api/auth/mfa/disable', requireUser, (req, res) => {
  db.prepare('UPDATE users SET mfa_secret=NULL,mfa_enabled=0 WHERE id=?').run(req.user.user_id);
  res.json({ success: true });
});

app.delete('/api/auth/account', requireUser, (req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM users WHERE id=?').run(req.user.user_id);
  })();
  res.clearCookie(SESSION_COOKIE);
  res.json({ success: true });
});

function recordOwner(entity, idValue, userId) {
  const row = db.prepare('SELECT * FROM records WHERE id=? AND entity=?').get(idValue, entity);
  return row && row.user_id === userId ? row : null;
}

function parseRecord(row) {
  if (!row) return null;
  return { id: row.id, created_at: row.created_at, updated_at: row.updated_at, created_date: row.created_at, ...JSON.parse(row.data) };
}

function validateTimer(data, userId, excludeId = null) {
  if (data.is_active) {
    const active = db.prepare("SELECT id FROM records WHERE entity='HoursSession' AND user_id=? AND json_extract(data,'$.is_active')=1").all(userId)
      .filter((row) => row.id !== excludeId);
    if (active.length) throw new Error('An active timer already exists for this account.');
  }
  if (data.start_time && data.end_time) {
    const start = Date.parse(data.start_time);
    const end = Date.parse(data.end_time);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('Invalid timer start or end time.');
    const others = db.prepare("SELECT id,data FROM records WHERE entity='HoursSession' AND user_id=?").all(userId);
    for (const row of others) {
      if (row.id === excludeId) continue;
      const other = JSON.parse(row.data);
      if (!other.start_time || !other.end_time) continue;
      const otherStart = Date.parse(other.start_time);
      const otherEnd = Date.parse(other.end_time);
      if (Number.isFinite(otherStart) && Number.isFinite(otherEnd) && start < otherEnd && end > otherStart) {
        throw new Error('The session overlaps another completed or planned session.');
      }
    }
  }
}

app.use('/api/entities/:entity', requireUser);
app.get('/api/entities/:entity', (req, res) => {
  if (!ENTITY_NAMES.has(req.params.entity)) return res.status(404).json({ error: 'Unknown entity.' });
  const sort = String(req.query.sort || '-created_date');
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit || 100)));
  const rows = db.prepare('SELECT * FROM records WHERE entity=? AND user_id=? ORDER BY created_at DESC LIMIT ?')
    .all(req.params.entity, req.user.user_id, limit);
  res.json(rows.map(parseRecord));
});

app.post('/api/entities/:entity/filter', (req, res) => {
  if (!ENTITY_NAMES.has(req.params.entity)) return res.status(404).json({ error: 'Unknown entity.' });
  const limit = Math.min(1000, Math.max(1, Number(req.body.limit || 100)));
  const offset = Math.max(0, Number(req.body.offset || 0));
  const filters = req.body.where || req.body.filter || req.body;
  const rows = db.prepare('SELECT * FROM records WHERE entity=? AND user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(req.params.entity, req.user.user_id, limit, offset);
  const filtered = rows.map(parseRecord).filter((row) => Object.entries(filters).every(([key, value]) => {
    if (key === 'limit' || key === 'offset' || key === 'where' || key === 'filter') return true;
    return row[key] === value;
  }));
  res.json(filtered);
});

app.post('/api/entities/:entity', (req, res) => {
  if (!ENTITY_NAMES.has(req.params.entity)) return res.status(404).json({ error: 'Unknown entity.' });
  const data = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    if (req.params.entity === 'HoursSession') validateTimer(data, req.user.user_id);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  const recordId = data.id || id('rec_');
  db.prepare('INSERT INTO records(id,entity,user_id,data) VALUES(?,?,?,?)')
    .run(recordId, req.params.entity, req.user.user_id, JSON.stringify(data));
  const row = db.prepare('SELECT * FROM records WHERE id=?').get(recordId);
  res.status(201).json(parseRecord(row));
});

app.post('/api/entities/:entity/bulk', (req, res) => {
  if (!ENTITY_NAMES.has(req.params.entity)) return res.status(404).json({ error: 'Unknown entity.' });
  if (!Array.isArray(req.body?.items)) return res.status(400).json({ error: 'items must be an array.' });
  const insert = db.prepare('INSERT INTO records(id,entity,user_id,data) VALUES(?,?,?,?)');
  const created = db.transaction(() => req.body.items.map((data) => {
    const recordId = data.id || id('rec_');
    insert.run(recordId, req.params.entity, req.user.user_id, JSON.stringify(data));
    return parseRecord(db.prepare('SELECT * FROM records WHERE id=?').get(recordId));
  }))();
  res.status(201).json(created);
});

app.get('/api/entities/:entity/:recordId', (req, res) => {
  const row = recordOwner(req.params.entity, req.params.recordId, req.user.user_id);
  if (!row) return res.status(404).json({ error: 'Record not found.' });
  res.json(parseRecord(row));
});

app.put('/api/entities/:entity/:recordId', (req, res) => {
  const row = recordOwner(req.params.entity, req.params.recordId, req.user.user_id);
  if (!row) return res.status(404).json({ error: 'Record not found.' });
  let existing = JSON.parse(row.data);
  if (req.params.entity === 'SkillLog' && existing.is_signed) {
    return res.status(409).json({ error: 'Signed records are locked. Create a dated amendment instead.' });
  }
  existing = { ...existing, ...req.body };
  try {
    if (req.params.entity === 'HoursSession') validateTimer(existing, req.user.user_id, req.params.recordId);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  db.prepare('UPDATE records SET data=?,updated_at=datetime(\'now\') WHERE id=?')
    .run(JSON.stringify(existing), req.params.recordId);
  res.json(parseRecord(db.prepare('SELECT * FROM records WHERE id=?').get(req.params.recordId)));
});

app.delete('/api/entities/:entity/:recordId', (req, res) => {
  const row = recordOwner(req.params.entity, req.params.recordId, req.user.user_id);
  if (!row) return res.status(404).json({ error: 'Record not found.' });
  if (req.params.entity === 'SkillLog' && JSON.parse(row.data).is_signed) {
    return res.status(409).json({ error: 'Signed records are locked.' });
  }
  db.prepare('DELETE FROM records WHERE id=?').run(req.params.recordId);
  res.json({ success: true });
});

app.post('/api/entities/:entity/count', (req, res) => {
  const rows = db.prepare('SELECT data FROM records WHERE entity=? AND user_id=?').all(req.params.entity, req.user.user_id);
  const filters = req.body || {};
  const count = rows.filter((row) => Object.entries(filters).every(([key, value]) => JSON.parse(row.data)[key] === value)).length;
  res.json({ count });
});

app.post('/api/entities/:entity/delete-many', (req, res) => {
  const result = db.prepare('DELETE FROM records WHERE entity=? AND user_id=?').run(req.params.entity, req.user.user_id);
  res.json({ deleted: result.changes });
});

app.post('/api/entities/:entity/aggregate', (req, res) => {
  const rows = db.prepare('SELECT data FROM records WHERE entity=? AND user_id=?').all(req.params.entity, req.user.user_id).map((r) => JSON.parse(r.data));
  res.json(rows);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

app.post('/api/files/upload', requireUser, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const allowed = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  if (!allowed.includes(req.file.mimetype)) return res.status(415).json({ error: 'Unsupported file type.' });
  const fileId = id('fil_');
  const safeName = `${fileId}-${crypto.randomBytes(6).toString('hex')}`;
  fs.writeFileSync(path.join(storageDir, safeName), req.file.buffer);
  db.prepare('INSERT INTO files(id,user_id,original_name,mime_type,size_bytes,storage_key,status) VALUES(?,?,?,?,?,?,\'uploaded\')')
    .run(fileId, req.user.user_id, req.file.originalname.slice(0, 255), req.file.mimetype, req.file.size, safeName);
  res.status(201).json({
    id: fileId,
    file_uri: `/api/files/${fileId}`,
    file_name: req.file.originalname,
  });
});

app.get('/api/files/:fileId', requireUser, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id=? AND user_id=?').get(req.params.fileId, req.user.user_id);
  if (!file) return res.status(404).json({ error: 'File not found.' });
  const fullPath = path.join(storageDir, file.storage_key);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Stored file is missing.' });
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(fullPath);
});

function u16(buf, offset) {
  return buf.readUInt16LE(offset);
}

function u32(buf, offset) {
  return buf.readUInt32LE(offset);
}

function readOfficeZipEntries(buffer, match) {
  let eocd = -1;
  const min = Math.max(0, buffer.length - 66000);
  for (let i = buffer.length - 22; i >= min; i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b && buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return [];

  const count = u16(buffer, eocd + 10);
  let position = u32(buffer, eocd + 16);
  const entries = [];
  for (let i = 0; i < count && position + 46 <= buffer.length; i++) {
    if (u32(buffer, position) !== 0x02014b50) break;
    const method = u16(buffer, position + 10);
    const compressedSize = u32(buffer, position + 20);
    const nameLength = u16(buffer, position + 28);
    const extraLength = u16(buffer, position + 30);
    const commentLength = u16(buffer, position + 32);
    const localOffset = u32(buffer, position + 42);
    const name = buffer.subarray(position + 46, position + 46 + nameLength).toString('utf8');
    if (match(name) && localOffset + 30 <= buffer.length) {
      const localNameLength = u16(buffer, localOffset + 26);
      const localExtraLength = u16(buffer, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      try {
        const content = method === 0 ? compressed : zlib.inflateRawSync(compressed);
        entries.push({ name, content: content.toString('utf8') });
      } catch {
        entries.push({ name, content: '' });
      }
    }
    position += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlToText(xml) {
  return String(xml || '')
    .replace(/<a:br[^>]*\/>/g, ' ')
    .replace(/<\/a:p>|<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

async function extractMaterialText(file, userId) {
  const row = db.prepare('SELECT * FROM files WHERE id=? AND user_id=?').get(file.id, userId);
  if (!row) throw Object.assign(new Error('That file could not be opened. Please upload it again.'), { status: 400 });
  const fullPath = path.join(storageDir, row.storage_key);
  if (!fs.existsSync(fullPath)) throw Object.assign(new Error('That stored file is missing. Please upload it again.'), { status: 400 });
  const buffer = fs.readFileSync(fullPath);
  const name = String(file.file_name || row.original_name || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';

  if (['txt', 'md', 'csv'].includes(ext)) {
    return buffer.toString('utf8').slice(0, 40000);
  }
  if (ext === 'docx') {
    const entries = readOfficeZipEntries(buffer, (entryName) => entryName === 'word/document.xml');
    return entries.map((entry) => xmlToText(entry.content)).join('\n\n').slice(0, 40000);
  }
  if (ext === 'pptx') {
    const entries = readOfficeZipEntries(buffer, (entryName) => /^ppt\/slides\/slide\d+\.xml$/.test(entryName));
    entries.sort((a, b) => {
      const aNumber = Number(a.name.match(/slide(\d+)\.xml$/)?.[1] || 0);
      const bNumber = Number(b.name.match(/slide(\d+)\.xml$/)?.[1] || 0);
      return aNumber - bNumber;
    });
    return entries.map((entry, index) => `Slide ${index + 1}: ${xmlToText(entry.content)}`).join('\n\n').slice(0, 40000);
  }
  if (ext === 'pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return String(result.text || '').slice(0, 40000);
    } finally {
      await parser.destroy();
    }
  }
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    throw Object.assign(new Error('Photo text extraction is not supported in this independent version. Upload a PDF, Word document, PowerPoint, or text file instead.'), { status: 422 });
  }
  throw Object.assign(new Error('Unsupported file type.'), { status: 400 });
}

function remainingGenerationLimit(userId) {
  const row = db.prepare('SELECT plan FROM users WHERE id=?').get(userId);
  const limit = row?.plan === 'paid-study' ? 100 : 10;
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0);
  const count = db.prepare("SELECT COUNT(*) AS count FROM generation_usage WHERE user_id=? AND created_at >= ?")
    .get(userId, monthStart.toISOString().slice(0, 19).replace('T',' ')).count;
  return { remaining: Math.max(0, limit - count), limit };
}

async function invokeAI(prompt, schema) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an educational nursing content generator. Return only valid JSON matching the requested schema. Never include real patient data or unsupported source citations.' },
        { role: 'user', content: `${prompt}\n\nReturn JSON with this shape: ${JSON.stringify(schema)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('AI provider unavailable.');
  const payload = await response.json();
  try { return JSON.parse(payload.choices[0].message.content); }
  catch { throw new Error('AI provider returned malformed JSON.'); }
}

app.post('/api/functions/generateStudySet', requireUser, async (req, res) => {
  const usage = remainingGenerationLimit(req.user.user_id);
  if (usage.remaining <= 0) return res.status(429).json({ error: 'Monthly study-generation limit reached.' });
  const topic = String(req.body.topic || 'Nursing Fundamentals').slice(0, 120);
  let focus;
  if (req.body.mode === 'material') {
    const material = req.body.material && typeof req.body.material === 'object' ? req.body.material : null;
    const fileUri = String(material?.file_uri || '').trim();
    const match = /^\/api\/files\/([^/?]+)$/.exec(fileUri);
    if (!material || !match) return res.status(400).json({ error: 'That file could not be read. Please upload it again.' });
    try {
      const extracted = await extractMaterialText({
        id: match[1],
        file_name: material.file_name,
      }, req.user.user_id);
      if (!extracted.trim() || extracted.trim().length < 20) {
        return res.status(422).json({ error: 'No readable text was found in that file. If it is scanned or image-only, export it as a searchable PDF and upload again.' });
      }
      focus = `Below is text extracted from course material titled "${String(material.title || 'Uploaded course material').slice(0, 120)}".\n\n=== COURSE MATERIAL START ===\n${extracted}\n=== COURSE MATERIAL END ===\n\nBase the study material on concepts and facts present in this text. Do not invent unsupported content.`;
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message || 'That file could not be extracted.' });
    }
  } else if (req.body.mode === 'log') {
    const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 25) : [];
    const lines = items.map((item) => {
      const name = String(item.skill_name || '').trim();
      if (!name) return null;
      const category = String(item.skill_category || '').trim();
      const rotation = String(item.rotation_type || '').trim();
      const notes = String(item.notes || '').trim();
      return `- ${name}${category ? ` (${category})` : ''}${rotation ? ` [${rotation} rotation]` : ''}${notes ? ` notes: ${notes}` : ''}`;
    }).filter(Boolean);
    if (!lines.length) return res.status(400).json({ error: 'No clinical skills logged yet. Log a skill first, or study a topic instead.' });
    focus = `A nursing student recently performed these clinical skills:\n${lines.join('\n')}\n\nBuild study material that reinforces rationale, key steps, safety checks, expected findings, and complications.`;
  } else {
    if (!topic.trim()) return res.status(400).json({ error: 'Please choose or enter a topic to study.' });
    focus = `Build study material on this nursing topic: "${topic}". Cover concepts a nursing student needs for clinical practice and exams.`;
  }
  const schema = {
    title: 'string', description: 'string', summary: 'string', topics: ['string'],
    cards: [{ front: 'string', back: 'string', topic: 'string' }],
    questions: [{ question: 'string', options: ['string'], correct_index: 0, explanation: 'string', difficulty: 'easy|medium|hard', topic: 'string' }],
  };
  const prompt = `You are an experienced nursing educator creating exam-focused study material.\n\n${focus}\n\nRequirements:\n- Produce exactly 12 flashcards.\n- Produce exactly 8 multiple-choice questions, each with exactly 4 options and exactly one correct answer.\n- Vary difficulty across questions: roughly 3 easy, 3 medium, 2 hard.\n- Keep content accurate and clinically sound.\n- Never include real patient identifiers or unsupported source citations.\n- For material-generated sets, use only facts present in the extracted source text.`;
  try {
    const generated = await invokeAI(prompt, schema);
    if (!generated) return res.status(503).json({ error: 'AI generation is unavailable until an AI provider is configured.' });
    if (!Array.isArray(generated.cards) || generated.cards.length !== 12 ||
        !Array.isArray(generated.questions) || generated.questions.length !== 8 ||
        generated.questions.some((question) => !Array.isArray(question.options) || question.options.length !== 4 ||
          !Number.isInteger(question.correct_index) || question.correct_index < 0 || question.correct_index > 3)) {
      return res.status(502).json({ error: 'The AI provider returned an invalid study set.' });
    }
    db.prepare('INSERT INTO generation_usage(user_id,kind) VALUES(?,\'study-set\')').run(req.user.user_id);
    res.json(generated);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/functions/generateCaseStudy', requireUser, async (req, res) => {
  const usage = remainingGenerationLimit(req.user.user_id);
  if (usage.remaining <= 0) return res.status(429).json({ error: 'Monthly study-generation limit reached.' });
  const topic = String(req.body.topic || 'Nursing Fundamentals').slice(0, 120);
  const schema = {
    title: 'string', topic: 'string', difficulty: 'easy|medium|hard', summary: 'string',
    patient_profile: 'string', scenario: 'string', clinical_data: 'string',
    questions: [{ question: 'string', options: ['string'], correct_index: 0, explanation: 'string' }],
  };
  try {
    const generated = await invokeAI(`Create a fictional nursing case study about ${topic}.`, schema);
    if (!generated) return res.status(503).json({ error: 'AI generation is unavailable until an AI provider is configured.' });
    if (!generated.scenario || !Array.isArray(generated.questions) || !generated.questions.length) {
      return res.status(502).json({ error: 'The AI provider returned an invalid case study.' });
    }
    db.prepare('INSERT INTO generation_usage(user_id,kind) VALUES(?,\'case-study\')').run(req.user.user_id);
    res.json(generated);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post('/api/billing/checkout', requireUser, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Billing is not configured.' });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const priceId = process.env.STRIPE_PAID_STUDY_PRICE_ID;
  if (!priceId) return res.status(503).json({ error: 'Paid Study price is not configured.' });
  const customer = await stripe.customers.create({ email: req.user.email, metadata: { user_id: req.user.user_id } });
  db.prepare(`
    INSERT INTO billing_entitlements(user_id,plan,stripe_customer_id)
    VALUES(?, 'free', ?)
    ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id,updated_at=datetime('now')
  `).run(req.user.user_id, customer.id);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.protocol}://${req.get('host')}/settings?billing=success`,
    cancel_url: `${req.protocol}://${req.get('host')}/settings?billing=cancelled`,
    customer: customer.id,
  });
  res.json({ url: session.url });
});

if (production) {
  const dist = path.resolve(process.cwd(), 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error.' });
});

export { app };

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`NurseLog API listening on http://localhost:${port}`);
  });
}
