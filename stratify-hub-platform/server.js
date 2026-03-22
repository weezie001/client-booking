import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { openDb, initDb } from './init_db.js';

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'stratifyhub-dev-secret-change-in-production';

// ── Optional Stripe ──────────────────────────────────────────────────────────
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  const { default: Stripe } = await import('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
  console.log('✅ Stripe enabled');
}

// ── Optional Email ───────────────────────────────────────────────────────────
let transporter = null;
if (process.env.SMTP_HOST) {
  const { default: nodemailer } = await import('nodemailer');
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log('✅ Email enabled');
}

app.use(cors());
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────────────────
const mapTalent = (t) => ({ ...t, featured: t.featured === 1 });

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) return;
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM || 'noreply@stratifyhub.com', to, subject, html });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

// ── Auth Middleware ───────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', stripe: !!stripe, email: !!transporter })
);

// ── Talents ───────────────────────────────────────────────────────────────────
app.get('/api/talents', async (req, res) => {
  try {
    const db = await openDb();
    const { search = '', industry = '', featured } = req.query;
    let sql = 'SELECT * FROM Talent WHERE 1=1';
    const params = [];
    if (search) {
      sql += ' AND (name LIKE ? OR bio LIKE ? OR industry LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (industry) { sql += ' AND industry = ?'; params.push(industry); }
    if (featured !== undefined) { sql += ' AND featured = ?'; params.push(featured === 'true' ? 1 : 0); }
    sql += ' ORDER BY featured DESC, rating DESC';
    const talents = await db.all(sql, params);
    await db.close();
    res.json(talents.map(mapTalent));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load talents' }); }
});

app.get('/api/talents/:id', async (req, res) => {
  try {
    const db = await openDb();
    const talent = await db.get('SELECT * FROM Talent WHERE id = ?', req.params.id);
    await db.close();
    if (!talent) return res.status(404).json({ error: 'Talent not found' });
    res.json(mapTalent(talent));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load talent' }); }
});

// ── Blog ──────────────────────────────────────────────────────────────────────
app.get('/api/blog', async (req, res) => {
  try {
    const db = await openDb();
    const limit  = Math.min(parseInt(req.query.limit  || '10'), 50);
    const offset = parseInt(req.query.offset || '0');
    const { category } = req.query;
    let sql = 'SELECT * FROM BlogPost WHERE published = 1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [posts, total] = await Promise.all([
      db.all(sql, params),
      db.get('SELECT COUNT(*) as n FROM BlogPost WHERE published=1'),
    ]);
    await db.close();
    res.json({ posts, total: total.n });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load blog posts' }); }
});

app.get('/api/blog/:id', async (req, res) => {
  try {
    const db = await openDb();
    const post = await db.get('SELECT * FROM BlogPost WHERE id = ? AND published = 1', req.params.id);
    await db.close();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load post' }); }
});

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email, and password are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const db = await openDb();
    const existing = await db.get('SELECT id FROM User WHERE email = ?', email.toLowerCase());
    if (existing) { await db.close(); return res.status(409).json({ error: 'Email already registered' }); }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await db.run(
      'INSERT INTO User (name, email, password_hash) VALUES (?, ?, ?)',
      name.trim(), email.toLowerCase(), password_hash
    );
    const user = await db.get(
      'SELECT id, name, email, role, created_at FROM User WHERE id = ?', result.lastID
    );
    await db.close();

    await sendEmail({
      to: user.email,
      subject: 'Welcome to StratifyHub!',
      html: `<h2>Welcome, ${user.name}!</h2><p>Your account has been created. Start booking exclusive talent today!</p>`,
    });

    res.status(201).json({ user, token: signToken(user) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  try {
    const db = await openDb();
    const row = await db.get('SELECT * FROM User WHERE email = ?', email.toLowerCase());
    if (!row) { await db.close(); return res.status(401).json({ error: 'Invalid email or password' }); }

    // Support legacy SHA-256 hashes and upgrade on login
    let valid = false;
    if (row.password_hash.length === 64 && /^[0-9a-f]+$/.test(row.password_hash)) {
      const sha = crypto.createHash('sha256').update(password).digest('hex');
      if (sha === row.password_hash) {
        valid = true;
        const upgraded = await bcrypt.hash(password, 12);
        await db.run('UPDATE User SET password_hash = ? WHERE id = ?', upgraded, row.id);
      }
    } else {
      valid = await bcrypt.compare(password, row.password_hash);
    }

    await db.close();
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const { password_hash, ...user } = row;
    res.json({ user, token: signToken(user) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const db = await openDb();
    const user = await db.get(
      'SELECT id, name, email, role, created_at FROM User WHERE id = ?', req.user.id
    );
    await db.close();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to get profile' }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const db = await openDb();
    const user = await db.get('SELECT id, name, email FROM User WHERE email = ?', email.toLowerCase());
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 3_600_000).toISOString();
      await db.run('DELETE FROM PasswordReset WHERE user_id = ?', user.id);
      await db.run(
        'INSERT INTO PasswordReset (user_id, token, expires_at) VALUES (?, ?, ?)',
        user.id, token, expires_at
      );
      await sendEmail({
        to: user.email,
        subject: 'Reset your StratifyHub password',
        html: `<p>Hi ${user.name},</p>
               <p>Click to reset your password (expires in 1 hour):</p>
               <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}">Reset Password</a></p>`,
      });
    }
    await db.close();
    res.json({ message: 'If that email is registered, you will receive a reset link.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to process request' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const db = await openDb();
    const reset = await db.get(
      "SELECT * FROM PasswordReset WHERE token = ? AND expires_at > datetime('now')", token
    );
    if (!reset) { await db.close(); return res.status(400).json({ error: 'Invalid or expired reset token' }); }
    const password_hash = await bcrypt.hash(password, 12);
    await db.run('UPDATE User SET password_hash = ? WHERE id = ?', password_hash, reset.user_id);
    await db.run('DELETE FROM PasswordReset WHERE id = ?', reset.id);
    await db.close();
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to reset password' }); }
});

// ── Payments ──────────────────────────────────────────────────────────────────
app.post('/api/payments/create-intent', requireAuth, async (req, res) => {
  if (!stripe) return res.status(200).json({ demo: true });
  const { amount, currency = 'usd', talentId, packageName } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { user_id: String(req.user.id), talent_id: String(talentId), package: packageName },
    });
    res.json({ clientSecret: intent.client_secret, id: intent.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create payment intent' }); }
});

// ── Bookings ──────────────────────────────────────────────────────────────────
app.post('/api/bookings', requireAuth, async (req, res) => {
  const { talent_id, package_name, package_price, notes, payment_intent_id } = req.body;
  if (!talent_id || !package_name || !package_price)
    return res.status(400).json({ error: 'talent_id, package_name, package_price are required' });

  if (stripe && payment_intent_id) {
    try {
      const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
      if (intent.status !== 'succeeded')
        return res.status(400).json({ error: 'Payment not completed' });
    } catch {
      return res.status(400).json({ error: 'Invalid payment intent' });
    }
  }

  try {
    const db = await openDb();

    // Check if payment_intent_id column exists (handles old DBs before migration)
    const tableInfo = await db.all("PRAGMA table_info(Booking)");
    const hasPaymentCol = tableInfo.some(col => col.name === 'payment_intent_id');

    let result;
    if (hasPaymentCol) {
      result = await db.run(
        'INSERT INTO Booking (user_id, talent_id, package_name, package_price, notes, payment_intent_id) VALUES (?, ?, ?, ?, ?, ?)',
        req.user.id, talent_id, package_name, package_price, notes || null, payment_intent_id || null
      );
    } else {
      result = await db.run(
        'INSERT INTO Booking (user_id, talent_id, package_name, package_price, notes) VALUES (?, ?, ?, ?, ?)',
        req.user.id, talent_id, package_name, package_price, notes || null
      );
    }


    const booking = await db.get(
      `SELECT b.*, t.name AS talent_name, t.industry, t.location
       FROM Booking b JOIN Talent t ON t.id = b.talent_id WHERE b.id = ?`,
      result.lastID
    );
    const userRow = await db.get('SELECT name, email FROM User WHERE id = ?', req.user.id);
    await db.close();

    await sendEmail({
      to: userRow.email,
      subject: `Booking Confirmed: ${booking.talent_name}`,
      html: `<h2>Booking Confirmed!</h2>
             <p>Hi ${userRow.name}, your booking with <strong>${booking.talent_name}</strong> is confirmed.</p>
             <p><strong>Package:</strong> ${booking.package_name} — $${Number(booking.package_price).toLocaleString()}</p>`,
    });

    res.status(201).json(booking);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create booking' }); }
});

app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const db = await openDb();
    let sql = `SELECT b.*, t.name AS talent_name, t.industry, t.location
               FROM Booking b JOIN Talent t ON t.id = b.talent_id`;
    const params = [];
    if (req.user.role !== 'admin') { sql += ' WHERE b.user_id = ?'; params.push(req.user.id); }
    sql += ' ORDER BY b.booked_at DESC';
    const bookings = await db.all(sql, params);
    await db.close();
    res.json(bookings);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load bookings' }); }
});

app.patch('/api/bookings/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  try {
    const db = await openDb();
    const booking = await db.get('SELECT * FROM Booking WHERE id = ?', req.params.id);
    if (!booking) { await db.close(); return res.status(404).json({ error: 'Booking not found' }); }
    if (req.user.role !== 'admin' && (booking.user_id !== req.user.id || status !== 'cancelled')) {
      await db.close();
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.run('UPDATE Booking SET status = ? WHERE id = ?', status, req.params.id);
    const updated = await db.get(
      `SELECT b.*, t.name AS talent_name FROM Booking b JOIN Talent t ON t.id = b.talent_id WHERE b.id = ?`,
      req.params.id
    );
    await db.close();
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update booking' }); }
});

// ── Admin ─────────────────────────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/stats', async (req, res) => {
  try {
    const db = await openDb();
    const [users, bookings, talents, revenue] = await Promise.all([
      db.get('SELECT COUNT(*) as n FROM User'),
      db.get('SELECT COUNT(*) as n FROM Booking'),
      db.get('SELECT COUNT(*) as n FROM Talent'),
      db.get("SELECT COALESCE(SUM(package_price),0) as total FROM Booking WHERE status != 'cancelled'"),
    ]);
    await db.close();
    res.json({ users: users.n, bookings: bookings.n, talents: talents.n, revenue: revenue.total });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load stats' }); }
});

adminRouter.get('/users', async (req, res) => {
  try {
    const db = await openDb();
    const users = await db.all('SELECT id, name, email, role, created_at FROM User ORDER BY created_at DESC');
    await db.close();
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load users' }); }
});

adminRouter.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const db = await openDb();
    await db.run('UPDATE User SET role = ? WHERE id = ?', role, req.params.id);
    const user = await db.get('SELECT id, name, email, role, created_at FROM User WHERE id = ?', req.params.id);
    await db.close();
    res.json(user);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update role' }); }
});

adminRouter.get('/bookings', async (req, res) => {
  try {
    const db = await openDb();
    const bookings = await db.all(
      `SELECT b.*, t.name AS talent_name, u.name AS user_name, u.email AS user_email
       FROM Booking b
       JOIN Talent t ON t.id = b.talent_id
       JOIN User u   ON u.id = b.user_id
       ORDER BY b.booked_at DESC`
    );
    await db.close();
    res.json(bookings);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load bookings' }); }
});

adminRouter.post('/talents', async (req, res) => {
  const { name, industry, location, bio, base_rate, rating, reviews, featured, avatar_url } = req.body;
  if (!name || !industry) return res.status(400).json({ error: 'name and industry are required' });
  try {
    const db = await openDb();
    const result = await db.run(
      'INSERT INTO Talent (name, industry, location, bio, base_rate, rating, reviews, featured, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      name, industry, location || null, bio || null, base_rate || 500, rating || 5.0, reviews || 0, featured ? 1 : 0, avatar_url || null
    );
    const talent = await db.get('SELECT * FROM Talent WHERE id = ?', result.lastID);
    await db.close();
    res.status(201).json(mapTalent(talent));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create talent' }); }
});

adminRouter.put('/talents/:id', async (req, res) => {
  const { name, industry, location, bio, base_rate, rating, reviews, featured, avatar_url } = req.body;
  try {
    const db = await openDb();
    await db.run(
      'UPDATE Talent SET name=?, industry=?, location=?, bio=?, base_rate=?, rating=?, reviews=?, featured=?, avatar_url=? WHERE id=?',
      name, industry, location, bio, base_rate, rating, reviews, featured ? 1 : 0, avatar_url, req.params.id
    );
    const talent = await db.get('SELECT * FROM Talent WHERE id = ?', req.params.id);
    await db.close();
    if (!talent) return res.status(404).json({ error: 'Talent not found' });
    res.json(mapTalent(talent));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update talent' }); }
});

adminRouter.delete('/talents/:id', async (req, res) => {
  try {
    const db = await openDb();
    await db.run('DELETE FROM Talent WHERE id = ?', req.params.id);
    await db.close();
    res.json({ message: 'Talent deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete talent' }); }
});

adminRouter.post('/blog', async (req, res) => {
  const { title, excerpt, body, category, read_time, published, image_url } = req.body;
  if (!title || !excerpt) return res.status(400).json({ error: 'title and excerpt are required' });
  try {
    const db = await openDb();
    const result = await db.run(
      'INSERT INTO BlogPost (title, excerpt, body, category, read_time, published, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      title, excerpt, body || null, category || 'General', read_time || '5 min read', published !== false ? 1 : 0, image_url || null
    );
    const post = await db.get('SELECT * FROM BlogPost WHERE id = ?', result.lastID);
    await db.close();
    res.status(201).json(post);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create post' }); }
});

adminRouter.put('/blog/:id', async (req, res) => {
  const { title, excerpt, body, category, read_time, published, image_url } = req.body;
  try {
    const db = await openDb();
    await db.run(
      'UPDATE BlogPost SET title=?, excerpt=?, body=?, category=?, read_time=?, published=?, image_url=? WHERE id=?',
      title, excerpt, body, category, read_time, published ? 1 : 0, image_url || null, req.params.id
    );
    const post = await db.get('SELECT * FROM BlogPost WHERE id = ?', req.params.id);
    await db.close();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update post' }); }
});

adminRouter.delete('/blog/:id', async (req, res) => {
  try {
    const db = await openDb();
    await db.run('DELETE FROM BlogPost WHERE id = ?', req.params.id);
    await db.close();
    res.json({ message: 'Post deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete post' }); }
});

app.use('/api/admin', adminRouter);

// ── Start ─────────────────────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 StratifyHub API  →  http://localhost:${PORT}\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialise database:', err);
    process.exit(1);
  });
