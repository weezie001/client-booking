import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function openDb() {
  return open({
    filename: './database.sqlite',
    driver: sqlite3.Database,
  });
}

export async function initDb() {
  const db = await openDb();

  // Enable WAL mode for better concurrent performance
  await db.exec('PRAGMA journal_mode = WAL;');

  // ----------------------------------------------------------------
  // Create tables
  // ----------------------------------------------------------------
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Talent (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      industry    TEXT    NOT NULL,
      location    TEXT,
      bio         TEXT,
      avatar_url  TEXT,
      base_rate   INTEGER NOT NULL DEFAULT 500,
      rating      REAL    NOT NULL DEFAULT 5.0,
      reviews     INTEGER NOT NULL DEFAULT 0,
      featured    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS User (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Booking (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES User(id),
      talent_id     INTEGER NOT NULL REFERENCES Talent(id),
      package_name  TEXT    NOT NULL,
      package_price INTEGER NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'pending',
      notes         TEXT,
      booked_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS BlogPost (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      excerpt     TEXT NOT NULL,
      body        TEXT,
      category    TEXT NOT NULL DEFAULT 'General',
      read_time   TEXT NOT NULL DEFAULT '5 min read',
      published   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ----------------------------------------------------------------
  // Seed Talent (skip if already populated)
  // ----------------------------------------------------------------
  const talentCount = await db.get('SELECT COUNT(*) as n FROM Talent');
  if (talentCount.n === 0) {
    const talents = [
      { name: 'Christopher Larosa',             industry: 'Music',               location: 'Los Angeles, CA', base_rate: 500,   rating: 4.9, reviews: 312, featured: 1, bio: 'Grammy-nominated artist and cultural icon known for electrifying performances and philanthropic work.' },
      { name: 'Hamdan bin Mohammed Al Maktoum', industry: 'Royalty / Public Figure', location: 'Dubai, UAE',    base_rate: 10000, rating: 5.0, reviews: 89,  featured: 1, bio: 'Crown Prince of Dubai, internationally celebrated equestrian, poet, and philanthropist.' },
      { name: 'Aria Sterling',                  industry: 'Acting',              location: 'New York, NY',    base_rate: 2500,  rating: 4.8, reviews: 210, featured: 0, bio: 'Award-winning actress best known for her roles in critically acclaimed dramatic series.' },
      { name: 'Marcus Chen',                    industry: 'Sports',              location: 'San Francisco, CA', base_rate: 1500, rating: 4.7, reviews: 158, featured: 0, bio: 'Olympic gold medalist and sports ambassador inspiring youth around the globe.' },
      { name: 'Sofia Reyes',                    industry: 'Fashion',             location: 'Paris, France',   base_rate: 3000,  rating: 4.9, reviews: 275, featured: 1, bio: 'Global fashion icon, designer, and sustainability advocate.' },
      { name: 'James Okafor',                   industry: 'Comedy',              location: 'London, UK',      base_rate: 800,   rating: 4.6, reviews: 420, featured: 0, bio: 'Stand-up comedian and TV personality with sold-out world tours.' },
      { name: 'Yuki Tanaka',                    industry: 'Gaming',              location: 'Tokyo, Japan',    base_rate: 1200,  rating: 4.8, reviews: 530, featured: 1, bio: 'World champion esports athlete and content creator with over 20M followers.' },
      { name: 'Priya Kapoor',                   industry: 'Bollywood',           location: 'Mumbai, India',   base_rate: 4000,  rating: 4.9, reviews: 640, featured: 1, bio: 'Bollywood superstar and brand ambassador for major global luxury brands.' },
    ];

    const stmt = await db.prepare(`
      INSERT INTO Talent (name, industry, location, base_rate, rating, reviews, featured, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of talents) {
      await stmt.run(t.name, t.industry, t.location, t.base_rate, t.rating, t.reviews, t.featured, t.bio);
    }
    await stmt.finalize();
    console.log(`✅ Seeded ${talents.length} talents`);
  }

  // ----------------------------------------------------------------
  // Seed BlogPosts (skip if already populated)
  // ----------------------------------------------------------------
  const blogCount = await db.get('SELECT COUNT(*) as n FROM BlogPost');
  if (blogCount.n === 0) {
    const posts = [
      { title: 'The Future of Virtual Celebrity Meet and Greets',    excerpt: 'How digital experiences are redefining fan-celebrity connections worldwide.',               category: 'Industry Trends', read_time: '5 min read' },
      { title: 'Platform Update: Enhanced Booking Experience',        excerpt: 'New features to streamline your booking process and improve agent communication.',           category: 'Platform News',   read_time: '3 min read' },
      { title: 'Top 10 Most Requested Celebrities in 2026',           excerpt: 'Find out which celebrities are trending on StratifyHub and why fans can\'t get enough.',       category: 'Trending',        read_time: '7 min read' },
      { title: 'How to Make the Most of Your VIP Backstage Experience', excerpt: 'Tips and etiquette for your in-person celebrity encounter to ensure an unforgettable time.',  category: 'Guide',           read_time: '6 min read' },
      { title: 'The Rise of Celebrity-Backed Charitable Events',      excerpt: 'Stars are leveraging their platforms for good — here\'s how StratifyHub facilitates it.',     category: 'Community',       read_time: '4 min read' },
      { title: 'Security & Privacy: How We Protect Your Bookings',    excerpt: 'A detailed look at our end‑to‑end encryption, data policies, and secure payment processing.', category: 'Platform News',   read_time: '4 min read' },
    ];

    const stmt = await db.prepare(`
      INSERT INTO BlogPost (title, excerpt, category, read_time) VALUES (?, ?, ?, ?)
    `);
    for (const p of posts) {
      await stmt.run(p.title, p.excerpt, p.category, p.read_time);
    }
    await stmt.finalize();
    console.log(`✅ Seeded ${posts.length} blog posts`);
  }

  await db.close();
  console.log('✅ Database initialised');
}

