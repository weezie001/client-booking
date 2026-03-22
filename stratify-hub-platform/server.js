import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import { query, getOne, getAll } from './db.js';
import { initDb } from './init_db.js';

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET  = process.env.JWT_SECRET  || 'stratifyhub-dev-secret-change-in-production';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@stratifyhub.com';
const FRONTEND    = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Optional Stripe ───────────────────────────────────────────────────────────
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  const { default: Stripe } = await import('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
  console.log('✅ Stripe enabled');
}

// ── Optional Email ────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

const FROM = process.env.SMTP_FROM || 'StratifyHub <noreply@stratifyhub.com>';

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) { console.log(`[EMAIL SKIPPED] ${subject} → ${to}`); return; }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

// ── Email Templates ───────────────────────────────────────────────────────────
const wrap = (body) => `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:Inter,sans-serif;color:#e5e5e5">
<div style="max-width:600px;margin:40px auto;background:#111;border:1px solid #ffffff14;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1a1a1a,#111);padding:32px 40px;border-bottom:1px solid #ffffff14">
    <h1 style="margin:0;font-size:24px;font-weight:800;background:linear-gradient(135deg,#fff,#c9a227);-webkit-background-clip:text;-webkit-text-fill-color:transparent">StratifyHub</h1>
  </div>
  <div style="padding:40px">${body}</div>
  <div style="padding:24px 40px;border-top:1px solid #ffffff14;text-align:center;font-size:12px;color:#71717a">
    © ${new Date().getFullYear()} StratifyHub · <a href="${FRONTEND}" style="color:#c9a227;text-decoration:none">Visit Platform</a>
  </div>
</div></body></html>`;

const emails = {
  welcome: (name) => wrap(`
    <h2 style="color:#fff;margin:0 0 16px">Welcome, ${name}! 🎉</h2>
    <p style="color:#a1a1aa;line-height:1.7">Your StratifyHub account is ready. Browse exclusive talent, book unforgettable experiences, and manage everything from your dashboard.</p>
    <a href="${FRONTEND}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#c9a227;color:#000;border-radius:999px;text-decoration:none;font-weight:700">Browse Talent</a>`),

  bookingConfirmation: (name, booking) => wrap(`
    <h2 style="color:#fff;margin:0 0 8px">Booking Confirmed ✓</h2>
    <p style="color:#a1a1aa;margin:0 0 28px">Hi ${name}, your booking is confirmed and pending final review.</p>
    <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Talent</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.talent_name}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Package</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.package_name}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Payment</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.payment_method || 'Stripe'}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0">Total</td><td style="color:#c9a227;font-weight:700;font-size:18px;text-align:right;padding:8px 0">$${Number(booking.package_price).toLocaleString()}</td></tr>
      </table>
    </div>
    <p style="color:#a1a1aa;font-size:14px">Full refund available within 48 hours. Track your booking at <a href="${FRONTEND}/dashboard" style="color:#c9a227">your dashboard</a>.</p>`),

  paymentReceipt: (name, booking) => wrap(`
    <h2 style="color:#fff;margin:0 0 8px">Payment Receipt 🧾</h2>
    <p style="color:#a1a1aa;margin:0 0 28px">Hi ${name}, here is your payment receipt for booking #${booking.id}.</p>
    <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Booking ID</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">#${booking.id}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Talent</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.talent_name}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Package</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.package_name}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Payment method</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.payment_method || 'Stripe'}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Date</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${new Date(booking.booked_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0">Amount paid</td><td style="color:#c9a227;font-weight:700;font-size:18px;text-align:right;padding:8px 0">$${Number(booking.package_price).toLocaleString()}</td></tr>
      </table>
    </div>
    <p style="color:#a1a1aa;font-size:12px">Keep this email as your payment record.</p>`),

  reminder: (name, booking) => wrap(`
    <h2 style="color:#fff;margin:0 0 8px">Your Experience is Tomorrow! ⭐</h2>
    <p style="color:#a1a1aa;margin:0 0 28px">Hi ${name}, just a reminder that your experience with <strong style="color:#fff">${booking.talent_name}</strong> is scheduled for tomorrow.</p>
    <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Talent</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.talent_name}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Package</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.package_name}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0">Date</td><td style="color:#fff;text-align:right;padding:8px 0">${new Date(booking.event_date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</td></tr>
      </table>
    </div>
    <p style="color:#a1a1aa;font-size:14px">View your full booking details on <a href="${FRONTEND}/dashboard" style="color:#c9a227">your dashboard</a>. Enjoy your experience!</p>`),

  adminNewBooking: (booking, userEmail) => wrap(`
    <h2 style="color:#fff;margin:0 0 8px">New Booking Alert 🔔</h2>
    <p style="color:#a1a1aa;margin:0 0 28px">A new booking has been made on StratifyHub.</p>
    <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Booking ID</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">#${booking.id}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Client</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${userEmail}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Talent</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.talent_name}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Package</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.package_name}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0;border-bottom:1px solid #ffffff0f">Payment</td><td style="color:#fff;text-align:right;padding:8px 0;border-bottom:1px solid #ffffff0f">${booking.payment_method || 'Stripe'}</td></tr>
        <tr><td style="color:#71717a;padding:8px 0">Value</td><td style="color:#c9a227;font-weight:700;font-size:18px;text-align:right;padding:8px 0">$${Number(booking.package_price).toLocaleString()}</td></tr>
      </table>
    </div>
    <a href="${FRONTEND}/admin" style="display:inline-block;padding:12px 28px;background:#c9a227;color:#000;border-radius:999px;text-decoration:none;font-weight:700">View in Admin Panel</a>`),

  newsletter: (name, subject, content, unsubToken) => wrap(`
    ${content}
    <hr style="border:none;border-top:1px solid #ffffff14;margin:32px 0">
    <p style="color:#52525b;font-size:12px;text-align:center">
      You're receiving this because you subscribed to StratifyHub updates.<br>
      <a href="${FRONTEND}/newsletter/unsubscribe?token=${unsubToken}" style="color:#c9a227">Unsubscribe</a>
    </p>`),
};

// ── Auth Middleware ────────────────────────────────────────────────────────────
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

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', stripe: !!stripe, email: !!transporter })
);

// ── Payment Info (public) ─────────────────────────────────────────────────────
app.get('/api/payment-info', (_req, res) => {
  res.json({
    btc:     process.env.BTC_ADDRESS    || '',
    usdt:    process.env.USDT_ADDRESS   || '',
    cashapp: process.env.CASHAPP_TAG    || '',
    venmo:   process.env.VENMO_USERNAME || '',
    paypal:  process.env.PAYPAL_EMAIL   || '',
  });
});

// ── Talents ────────────────────────────────────────────────────────────────────
app.get('/api/talents', async (req, res) => {
  try {
    const { search = '', industry = '', featured } = req.query;
    const params = [];
    let sql = 'SELECT * FROM Talent WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR bio ILIKE $${params.length} OR industry ILIKE $${params.length})`;
    }
    if (industry) {
      params.push(industry);
      sql += ` AND industry = $${params.length}`;
    }
    if (featured !== undefined) {
      params.push(featured === 'true');
      sql += ` AND featured = $${params.length}`;
    }
    sql += ' ORDER BY featured DESC, rating DESC';

    const talents = await getAll(sql, params);
    res.json(talents);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load talents' }); }
});

app.get('/api/talents/:id', async (req, res) => {
  try {
    const talent = await getOne('SELECT * FROM Talent WHERE id = $1', [req.params.id]);
    if (!talent) return res.status(404).json({ error: 'Talent not found' });
    res.json(talent);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load talent' }); }
});

// ── Blog ───────────────────────────────────────────────────────────────────────
app.get('/api/blog', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || '10'), 50);
    const offset = parseInt(req.query.offset || '0');
    const { category } = req.query;
    const params = [];
    let sql = 'SELECT * FROM BlogPost WHERE published = true';

    if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
    params.push(limit);  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    params.push(offset); sql += ` OFFSET $${params.length}`;

    const [posts, countRow] = await Promise.all([
      getAll(sql, params),
      getOne('SELECT COUNT(*)::int as n FROM BlogPost WHERE published = true'),
    ]);
    res.json({ posts, total: countRow.n });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load blog posts' }); }
});

app.get('/api/blog/:id', async (req, res) => {
  try {
    const post = await getOne('SELECT * FROM BlogPost WHERE id = $1 AND published = true', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load post' }); }
});

// ── Auth ───────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email, and password are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const existing = await getOne('SELECT id FROM "User" WHERE email = $1', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await getOne(
      `INSERT INTO "User" (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase(), password_hash]
    );

    await sendEmail({ to: user.email, subject: 'Welcome to StratifyHub!', html: emails.welcome(user.name) });
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  try {
    const row = await getOne('SELECT * FROM "User" WHERE email = $1', [email.toLowerCase()]);
    if (!row) return res.status(401).json({ error: 'Invalid email or password' });

    let valid = false;
    if (row.password_hash.length === 64 && /^[0-9a-f]+$/.test(row.password_hash)) {
      // Legacy SHA-256 — verify and upgrade to bcrypt
      const sha = crypto.createHash('sha256').update(password).digest('hex');
      if (sha === row.password_hash) {
        valid = true;
        const upgraded = await bcrypt.hash(password, 12);
        await query('UPDATE "User" SET password_hash = $1 WHERE id = $2', [upgraded, row.id]);
      }
    } else {
      valid = await bcrypt.compare(password, row.password_hash);
    }

    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const { password_hash, ...user } = row;
    res.json({ user, token: signToken(user) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await getOne(
      'SELECT id, name, email, role, created_at FROM "User" WHERE id = $1', [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to get profile' }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const user = await getOne('SELECT id, name, email FROM "User" WHERE email = $1', [email.toLowerCase()]);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 3_600_000).toISOString();
      await query('DELETE FROM PasswordReset WHERE user_id = $1', [user.id]);
      await query(
        'INSERT INTO PasswordReset (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expires_at]
      );
      await sendEmail({
        to: user.email,
        subject: 'Reset your StratifyHub password',
        html: wrap(`<p style="color:#a1a1aa">Hi ${user.name},</p>
          <p style="color:#a1a1aa">Click below to reset your password (expires in 1 hour):</p>
          <a href="${FRONTEND}/reset-password?token=${token}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#c9a227;color:#000;border-radius:999px;text-decoration:none;font-weight:700">Reset Password</a>`),
      });
    }
    res.json({ message: 'If that email is registered, you will receive a reset link.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to process request' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const reset = await getOne(
      'SELECT * FROM PasswordReset WHERE token = $1 AND expires_at > NOW()', [token]
    );
    if (!reset) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const password_hash = await bcrypt.hash(password, 12);
    await query('UPDATE "User" SET password_hash = $1 WHERE id = $2', [password_hash, reset.user_id]);
    await query('DELETE FROM PasswordReset WHERE id = $1', [reset.id]);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to reset password' }); }
});

// ── Newsletter (public) ────────────────────────────────────────────────────────
app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email, name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const existing = await getOne('SELECT id, active FROM Newsletter WHERE email = $1', [email.toLowerCase()]);
    if (existing) {
      if (existing.active) return res.json({ message: 'Already subscribed!' });
      await query('UPDATE Newsletter SET active = true, name = $1 WHERE id = $2', [name || null, existing.id]);
      return res.json({ message: 'Welcome back! You have been re-subscribed.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    await query(
      'INSERT INTO Newsletter (email, name, unsubscribe_token) VALUES ($1, $2, $3)',
      [email.toLowerCase(), name || null, token]
    );
    await sendEmail({ to: email, subject: "You're subscribed to StratifyHub!", html: emails.welcome(name || 'there') });
    res.status(201).json({ message: 'Subscribed! Check your inbox.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Subscribe failed' }); }
});

app.get('/api/newsletter/unsubscribe', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const sub = await getOne('SELECT id FROM Newsletter WHERE unsubscribe_token = $1', [token]);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    await query('UPDATE Newsletter SET active = false WHERE id = $1', [sub.id]);
    res.json({ message: 'You have been unsubscribed.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Unsubscribe failed' }); }
});

// ── Payments ───────────────────────────────────────────────────────────────────
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

// ── Bookings ───────────────────────────────────────────────────────────────────
app.post('/api/bookings', requireAuth, async (req, res) => {
  const { talent_id, package_name, package_price, notes, payment_intent_id, payment_method, gift_card_code, event_date } = req.body;
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
    const { rows: [newBooking] } = await query(
      `INSERT INTO Booking (user_id, talent_id, package_name, package_price, notes, payment_intent_id, payment_method, gift_card_code, event_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [req.user.id, talent_id, package_name, package_price, notes || null,
       payment_intent_id || null, payment_method || null, gift_card_code || null, event_date || null]
    );

    const [booking, userRow] = await Promise.all([
      getOne(
        `SELECT b.*, t.name AS talent_name, t.industry, t.location
         FROM Booking b JOIN Talent t ON t.id = b.talent_id WHERE b.id = $1`,
        [newBooking.id]
      ),
      getOne('SELECT name, email FROM "User" WHERE id = $1', [req.user.id]),
    ]);

    await sendEmail({ to: userRow.email, subject: `Booking Confirmed: ${booking.talent_name}`, html: emails.bookingConfirmation(userRow.name, booking) });
    await sendEmail({ to: userRow.email, subject: `Payment Receipt — StratifyHub #${booking.id}`, html: emails.paymentReceipt(userRow.name, booking) });
    await sendEmail({ to: ADMIN_EMAIL, subject: `New Booking #${booking.id} — ${booking.talent_name}`, html: emails.adminNewBooking(booking, userRow.email) });

    res.status(201).json(booking);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create booking' }); }
});

app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const params = [];
    let sql = `SELECT b.*, t.name AS talent_name, t.industry, t.location
               FROM Booking b JOIN Talent t ON t.id = b.talent_id`;
    if (req.user.role !== 'admin') { params.push(req.user.id); sql += ` WHERE b.user_id = $${params.length}`; }
    sql += ' ORDER BY b.booked_at DESC';
    const bookings = await getAll(sql, params);
    res.json(bookings);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load bookings' }); }
});

app.patch('/api/bookings/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  try {
    const booking = await getOne('SELECT * FROM Booking WHERE id = $1', [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (req.user.role !== 'admin' && (booking.user_id !== req.user.id || status !== 'cancelled'))
      return res.status(403).json({ error: 'Forbidden' });

    const updated = await getOne(
      `UPDATE Booking SET status = $1 WHERE id = $2
       RETURNING *, (SELECT name FROM Talent WHERE id = talent_id) AS talent_name`,
      [status, req.params.id]
    );
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update booking' }); }
});

// ── Admin ──────────────────────────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/stats', async (_req, res) => {
  try {
    const [users, bookings, talents, revenue] = await Promise.all([
      getOne('SELECT COUNT(*)::int as n FROM "User"'),
      getOne('SELECT COUNT(*)::int as n FROM Booking'),
      getOne('SELECT COUNT(*)::int as n FROM Talent'),
      getOne("SELECT COALESCE(SUM(package_price), 0)::float as total FROM Booking WHERE status != 'cancelled'"),
    ]);
    res.json({ users: users.n, bookings: bookings.n, talents: talents.n, revenue: revenue.total });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load stats' }); }
});

adminRouter.get('/users', async (_req, res) => {
  try {
    const users = await getAll('SELECT id, name, email, role, created_at FROM "User" ORDER BY created_at DESC');
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load users' }); }
});

adminRouter.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const user = await getOne(
      'UPDATE "User" SET role = $1 WHERE id = $2 RETURNING id, name, email, role, created_at',
      [role, req.params.id]
    );
    res.json(user);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update role' }); }
});

adminRouter.get('/bookings', async (_req, res) => {
  try {
    const bookings = await getAll(
      `SELECT b.*, t.name AS talent_name, u.name AS user_name, u.email AS user_email
       FROM Booking b
       JOIN Talent t   ON t.id = b.talent_id
       JOIN "User" u   ON u.id = b.user_id
       ORDER BY b.booked_at DESC`
    );
    res.json(bookings);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load bookings' }); }
});

adminRouter.post('/talents', async (req, res) => {
  const { name, industry, location, bio, base_rate, rating, reviews, featured, avatar_url } = req.body;
  if (!name || !industry) return res.status(400).json({ error: 'name and industry are required' });
  try {
    const talent = await getOne(
      `INSERT INTO Talent (name, industry, location, bio, base_rate, rating, reviews, featured, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, industry, location || null, bio || null, base_rate || 500, rating || 5.0, reviews || 0, !!featured, avatar_url || null]
    );
    res.status(201).json(talent);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create talent' }); }
});

adminRouter.put('/talents/:id', async (req, res) => {
  const { name, industry, location, bio, base_rate, rating, reviews, featured, avatar_url } = req.body;
  try {
    const talent = await getOne(
      `UPDATE Talent SET name=$1, industry=$2, location=$3, bio=$4, base_rate=$5, rating=$6, reviews=$7, featured=$8, avatar_url=$9
       WHERE id=$10 RETURNING *`,
      [name, industry, location, bio, base_rate, rating, reviews, !!featured, avatar_url, req.params.id]
    );
    if (!talent) return res.status(404).json({ error: 'Talent not found' });
    res.json(talent);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update talent' }); }
});

adminRouter.delete('/talents/:id', async (req, res) => {
  try {
    await query('DELETE FROM Talent WHERE id = $1', [req.params.id]);
    res.json({ message: 'Talent deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete talent' }); }
});

adminRouter.post('/blog', async (req, res) => {
  const { title, excerpt, body, category, read_time, published, image_url } = req.body;
  if (!title || !excerpt) return res.status(400).json({ error: 'title and excerpt are required' });
  try {
    const post = await getOne(
      `INSERT INTO BlogPost (title, excerpt, body, category, read_time, published, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, excerpt, body || null, category || 'General', read_time || '5 min read', published !== false, image_url || null]
    );
    res.status(201).json(post);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create post' }); }
});

adminRouter.put('/blog/:id', async (req, res) => {
  const { title, excerpt, body, category, read_time, published, image_url } = req.body;
  try {
    const post = await getOne(
      `UPDATE BlogPost SET title=$1, excerpt=$2, body=$3, category=$4, read_time=$5, published=$6, image_url=$7
       WHERE id=$8 RETURNING *`,
      [title, excerpt, body, category, read_time, !!published, image_url || null, req.params.id]
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update post' }); }
});

adminRouter.delete('/blog/:id', async (req, res) => {
  try {
    await query('DELETE FROM BlogPost WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete post' }); }
});

adminRouter.get('/newsletter/subscribers', async (_req, res) => {
  try {
    const subs = await getAll('SELECT id, email, name, active, subscribed_at FROM Newsletter ORDER BY subscribed_at DESC');
    res.json(subs);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load subscribers' }); }
});

adminRouter.post('/newsletter/send', async (req, res) => {
  const { subject, content } = req.body || {};
  if (!subject || !content) return res.status(400).json({ error: 'subject and content are required' });
  try {
    const subs = await getAll('SELECT email, name, unsubscribe_token FROM Newsletter WHERE active = true');
    if (subs.length === 0) return res.json({ sent: 0, message: 'No active subscribers' });
    let sent = 0;
    for (const sub of subs) {
      await sendEmail({ to: sub.email, subject, html: emails.newsletter(sub.name || 'there', subject, content, sub.unsubscribe_token) });
      sent++;
    }
    res.json({ sent, message: `Newsletter sent to ${sent} subscriber(s)` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to send newsletter' }); }
});

app.use('/api/admin', adminRouter);

// ── Cron: 24h Meet & Greet Reminders ──────────────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  try {
    const bookings = await getAll(
      `SELECT b.*, t.name AS talent_name, u.name AS user_name, u.email AS user_email
       FROM Booking b
       JOIN Talent t ON t.id = b.talent_id
       JOIN "User" u ON u.id = b.user_id
       WHERE LEFT(b.event_date, 10) = $1 AND b.status != 'cancelled'`,
      [dateStr]
    );
    for (const b of bookings) {
      await sendEmail({
        to: b.user_email,
        subject: `Reminder: Your experience with ${b.talent_name} is tomorrow!`,
        html: emails.reminder(b.user_name, b),
      });
    }
    if (bookings.length) console.log(`[CRON] Sent ${bookings.length} reminder(s) for ${dateStr}`);
  } catch (err) {
    console.error('[CRON] Reminder job failed:', err.message);
  }
});

// ── Start ──────────────────────────────────────────────────────────────────────
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
