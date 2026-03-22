import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { openDb, initDb } from './init_db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const hashPw = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

const mapTalent = (t) => ({ ...t, featured: t.featured === 1 });

// ──────────────────────────────────────────────
// Health
// ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ──────────────────────────────────────────────
// Talents
// ──────────────────────────────────────────────

// GET /api/talents?search=&industry=&featured=
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
    if (industry) {
      sql += ' AND industry = ?';
      params.push(industry);
    }
    if (featured !== undefined) {
      sql += ' AND featured = ?';
      params.push(featured === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY featured DESC, rating DESC';

    const talents = await db.all(sql, params);
    await db.close();
    res.json(talents.map(mapTalent));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load talents' });
  }
});

// GET /api/talents/:id
app.get('/api/talents/:id', async (req, res) => {
  try {
    const db = await openDb();
    const talent = await db.get('SELECT * FROM Talent WHERE id = ?', req.params.id);
    await db.close();
    if (!talent) return res.status(404).json({ error: 'Talent not found' });
    res.json(mapTalent(talent));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load talent' });
  }
});

// ──────────────────────────────────────────────
// Blog Posts
// ──────────────────────────────────────────────

// GET /api/blog?limit=10&offset=0&category=
app.get('/api/blog', async (req, res) => {
  try {
    const db = await openDb();
    const limit  = Math.min(parseInt(req.query.limit  || '10'), 50);
    const offset = parseInt(req.query.offset || '0');
    const { category } = req.query;

    let sql = 'SELECT * FROM BlogPost WHERE published = 1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [posts, total] = await Promise.all([
      db.all(sql, params),
      db.get('SELECT COUNT(*) as n FROM BlogPost WHERE published=1'),
    ]);
    await db.close();
    res.json({ posts, total: total.n });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load blog posts' });
  }
});

// GET /api/blog/:id
app.get('/api/blog/:id', async (req, res) => {
  try {
    const db = await openDb();
    const post = await db.get('SELECT * FROM BlogPost WHERE id = ? AND published = 1', req.params.id);
    await db.close();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load post' });
  }
});

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email, and password are required' });

  try {
    const db = await openDb();
    const existing = await db.get('SELECT id FROM User WHERE email = ?', email);
    if (existing) {
      await db.close();
      return res.status(409).json({ error: 'Email already registered' });
    }

    const result = await db.run(
      'INSERT INTO User (name, email, password_hash) VALUES (?, ?, ?)',
      name, email, hashPw(password)
    );
    const user = await db.get('SELECT id, name, email, role, created_at FROM User WHERE id = ?', result.lastID);
    await db.close();
    res.status(201).json({ user, token: `demo-token-${user.id}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  try {
    const db = await openDb();
    const user = await db.get(
      'SELECT id, name, email, role, created_at FROM User WHERE email = ? AND password_hash = ?',
      email, hashPw(password)
    );
    await db.close();
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ user, token: `demo-token-${user.id}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ──────────────────────────────────────────────
// Bookings
// ──────────────────────────────────────────────

// POST /api/bookings
app.post('/api/bookings', async (req, res) => {
  const { user_id, talent_id, package_name, package_price, notes } = req.body;
  if (!user_id || !talent_id || !package_name || !package_price)
    return res.status(400).json({ error: 'user_id, talent_id, package_name, package_price are required' });

  try {
    const db = await openDb();
    const result = await db.run(
      'INSERT INTO Booking (user_id, talent_id, package_name, package_price, notes) VALUES (?, ?, ?, ?, ?)',
      user_id, talent_id, package_name, package_price, notes || null
    );
    const booking = await db.get('SELECT * FROM Booking WHERE id = ?', result.lastID);
    await db.close();
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/bookings?user_id=
app.get('/api/bookings', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id query param required' });

  try {
    const db = await openDb();
    const bookings = await db.all(
      `SELECT b.*, t.name AS talent_name, t.industry, t.location
       FROM Booking b
       JOIN Talent t ON t.id = b.talent_id
       WHERE b.user_id = ?
       ORDER BY b.booked_at DESC`,
      user_id
    );
    await db.close();
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 StratifyHub API running on http://localhost:${PORT}`);
      console.log(`   GET  /api/health`);
      console.log(`   GET  /api/talents          (+ ?search= &industry= &featured=)`);
      console.log(`   GET  /api/talents/:id`);
      console.log(`   GET  /api/blog             (+ ?limit= &offset= &category=)`);
      console.log(`   GET  /api/blog/:id`);
      console.log(`   POST /api/auth/register`);
      console.log(`   POST /api/auth/login`);
      console.log(`   POST /api/bookings`);
      console.log(`   GET  /api/bookings         (+ ?user_id=)\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialise database:', err);
    process.exit(1);
  });

