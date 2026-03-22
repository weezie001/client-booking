import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function openDb() {
  return open({
    filename: './database.sqlite',
    driver: sqlite3.Database,
  });
}

async function addColumnIfMissing(db, table, column, definition) {
  try {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column already exists — ignore
  }
}

export async function initDb() {
  const db = await openDb();

  await db.exec('PRAGMA journal_mode = WAL;');

  // ── Create tables ──────────────────────────────────────────────────────
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
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL REFERENCES User(id),
      talent_id         INTEGER NOT NULL REFERENCES Talent(id),
      package_name      TEXT    NOT NULL,
      package_price     INTEGER NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'pending',
      notes             TEXT,
      booked_at         TEXT    NOT NULL DEFAULT (datetime('now'))
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

    CREATE TABLE IF NOT EXISTS PasswordReset (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES User(id),
      token      TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Migrations: add new columns to existing tables ─────────────────────
  await addColumnIfMissing(db, 'Booking',  'payment_intent_id', 'TEXT');
  await addColumnIfMissing(db, 'BlogPost', 'image_url',         'TEXT');

  // Talent table may be the old schema (id, name, location, price, rating, featured, img)
  await addColumnIfMissing(db, 'Talent', 'industry',   "TEXT NOT NULL DEFAULT 'General'");
  await addColumnIfMissing(db, 'Talent', 'bio',        'TEXT');
  await addColumnIfMissing(db, 'Talent', 'avatar_url', 'TEXT');
  await addColumnIfMissing(db, 'Talent', 'base_rate',  'INTEGER NOT NULL DEFAULT 500');
  await addColumnIfMissing(db, 'Talent', 'reviews',    'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'Talent', 'created_at', "TEXT NOT NULL DEFAULT (datetime('now'))");

  // Migrate old `price` column → `base_rate` for rows that haven't been migrated
  await db.exec(`UPDATE Talent SET base_rate = price WHERE price IS NOT NULL AND base_rate = 500 AND price != 500`).catch(() => {});

  // If the old seed data exists (no real industry set), wipe and re-seed properly
  const staleCheck = await db.get("SELECT id FROM Talent WHERE industry = 'General' LIMIT 1");
  if (staleCheck) {
    await db.exec('DELETE FROM Talent');
    console.log('🔄 Removed stale Talent data — will re-seed with correct schema');
  }

  // Backfill avatar_url for any existing talent rows that are missing one
  const avatarMap = {
    'Christopher Larosa':             'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
    'Hamdan bin Mohammed Al Maktoum': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    'Aria Sterling':                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80',
    'Marcus Chen':                    'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=80',
    'Sofia Reyes':                    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
    'James Okafor':                   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    'Yuki Tanaka':                    'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=600&q=80',
    'Priya Kapoor':                   'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
  };
  const missingAvatars = await db.all('SELECT id, name FROM Talent WHERE avatar_url IS NULL');
  for (const t of missingAvatars) {
    const url = avatarMap[t.name];
    if (url) await db.run('UPDATE Talent SET avatar_url = ? WHERE id = ?', url, t.id);
  }
  if (missingAvatars.length) console.log(`✅ Backfilled avatars for ${missingAvatars.length} talents`);

  // ── Seed Talent ─────────────────────────────────────────────────────────
  const talentCount = await db.get('SELECT COUNT(*) as n FROM Talent');
  if (talentCount.n === 0) {
    const talents = [
      { name: 'Christopher Larosa',             industry: 'Music',                  location: 'Los Angeles, CA',   base_rate: 500,   rating: 4.9, reviews: 312, featured: 1, bio: 'Grammy-nominated artist and cultural icon known for electrifying performances and philanthropic work.',        avatar_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80' },
      { name: 'Hamdan bin Mohammed Al Maktoum', industry: 'Royalty / Public Figure', location: 'Dubai, UAE',        base_rate: 10000, rating: 5.0, reviews: 89,  featured: 1, bio: 'Crown Prince of Dubai, internationally celebrated equestrian, poet, and philanthropist.',                    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80' },
      { name: 'Aria Sterling',                  industry: 'Acting',                 location: 'New York, NY',      base_rate: 2500,  rating: 4.8, reviews: 210, featured: 0, bio: 'Award-winning actress best known for her roles in critically acclaimed dramatic series.',                     avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80' },
      { name: 'Marcus Chen',                    industry: 'Sports',                 location: 'San Francisco, CA', base_rate: 1500,  rating: 4.7, reviews: 158, featured: 0, bio: 'Olympic gold medalist and sports ambassador inspiring youth around the globe.',                              avatar_url: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=80' },
      { name: 'Sofia Reyes',                    industry: 'Fashion',                location: 'Paris, France',     base_rate: 3000,  rating: 4.9, reviews: 275, featured: 1, bio: 'Global fashion icon, designer, and sustainability advocate.',                                                 avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80' },
      { name: 'James Okafor',                   industry: 'Comedy',                 location: 'London, UK',        base_rate: 800,   rating: 4.6, reviews: 420, featured: 0, bio: 'Stand-up comedian and TV personality with sold-out world tours.',                                             avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80' },
      { name: 'Yuki Tanaka',                    industry: 'Gaming',                 location: 'Tokyo, Japan',      base_rate: 1200,  rating: 4.8, reviews: 530, featured: 1, bio: 'World champion esports athlete and content creator with over 20M followers.',                                avatar_url: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=600&q=80' },
      { name: 'Priya Kapoor',                   industry: 'Bollywood',              location: 'Mumbai, India',     base_rate: 4000,  rating: 4.9, reviews: 640, featured: 1, bio: 'Bollywood superstar and brand ambassador for major global luxury brands.',                                   avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80' },
    ];

    const stmt = await db.prepare(`
      INSERT INTO Talent (name, industry, location, base_rate, rating, reviews, featured, bio, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of talents) {
      await stmt.run(t.name, t.industry, t.location, t.base_rate, t.rating, t.reviews, t.featured, t.bio, t.avatar_url);
    }
    await stmt.finalize();
    console.log(`✅ Seeded ${talents.length} talents`);
  }

  // ── Seed BlogPosts ───────────────────────────────────────────────────────
  const blogCount = await db.get('SELECT COUNT(*) as n FROM BlogPost');
  if (blogCount.n === 0) {
    const posts = [
      {
        title: 'The Future of Virtual Celebrity Meet and Greets',
        excerpt: 'How digital experiences are redefining fan-celebrity connections worldwide.',
        category: 'Industry Trends', read_time: '5 min read',
        image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      },
      {
        title: 'Platform Update: Enhanced Booking Experience',
        excerpt: 'New features to streamline your booking process and improve agent communication.',
        category: 'Platform News', read_time: '3 min read',
        image_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80',
      },
      {
        title: 'Top 10 Most Requested Celebrities in 2026',
        excerpt: "Find out which celebrities are trending on StratifyHub and why fans can't get enough.",
        category: 'Trending', read_time: '7 min read',
        image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
      },
      {
        title: 'How to Make the Most of Your VIP Backstage Experience',
        excerpt: 'Tips and etiquette for your in-person celebrity encounter to ensure an unforgettable time.',
        category: 'Guide', read_time: '6 min read',
        image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
      },
      {
        title: 'The Rise of Celebrity-Backed Charitable Events',
        excerpt: "Stars are leveraging their platforms for good — here's how StratifyHub facilitates it.",
        category: 'Community', read_time: '4 min read',
        image_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
      },
      {
        title: 'Security & Privacy: How We Protect Your Bookings',
        excerpt: 'A detailed look at our end‑to‑end encryption, data policies, and secure payment processing.',
        category: 'Platform News', read_time: '4 min read',
        image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80',
      },
    ];

    const stmt = await db.prepare(`
      INSERT INTO BlogPost (title, excerpt, category, read_time, image_url, body) VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const p of posts) {
      await stmt.run(p.title, p.excerpt, p.category, p.read_time, p.image_url, p.body || null);
    }
    await stmt.finalize();
    console.log(`✅ Seeded ${posts.length} blog posts`);
  } else {
    // Backfill images and bodies for existing posts that are missing them
    const backfill = [
      {
        title: 'The Future of Virtual Celebrity Meet and Greets',
        image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
        body: `The landscape of fan-celebrity interaction has undergone a seismic shift in recent years. What once required front-row tickets, industry connections, or sheer luck can now happen from your living room — and it's only getting better.

## The Digital Revolution in Fan Experiences

Virtual meet and greets exploded during 2020 out of necessity, but they've since evolved into a preferred format for millions of fans worldwide. Platforms like StratifyHub have moved the experience far beyond a simple video call. Today's virtual sessions include curated environments, professional moderation, and post-session digital mementos that fans can keep forever.

## What Fans Are Saying

"I never thought I'd get to speak one-on-one with someone I've admired for years," says Maria, 28, who booked a virtual session through StratifyHub last spring. "It felt intimate in a way that a stadium concert never could."

This sentiment echoes across thousands of bookings. Fans consistently report that virtual interactions feel more personal than traditional meet and greets, where brief handshakes in a queue rarely leave room for genuine connection.

## Technology Is Closing the Gap

High-definition video, spatial audio, and interactive tools are making virtual experiences increasingly indistinguishable from in-person ones. Some talent on StratifyHub now offer augmented reality features — allowing fans to appear side-by-side in digital environments for photos that look genuinely real.

## What's Next

Industry analysts predict that hybrid experiences — combining physical presence with digital enhancements — will dominate the next five years. Imagine attending a concert where your virtual ticket grants you backstage access through a live-streamed private session afterwards. That future is closer than you think, and StratifyHub is building toward it.

The bottom line: virtual celebrity experiences are not a compromise. They are the next evolution of fan culture, and they're here to stay.`,
      },
      {
        title: 'Platform Update: Enhanced Booking Experience',
        image_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80',
        body: `We've been listening. Over the past several months, thousands of you have shared feedback on how we can make the StratifyHub booking experience smoother, faster, and more transparent. Today, we're excited to share what we've built.

## What's New

### Streamlined Package Selection
Choosing the right experience used to require jumping between pages. The updated booking flow now shows everything in one place — package details, pricing, availability, and what's included — so you can make confident decisions without second-guessing.

### Real-Time Booking Status
Once you confirm a booking, you'll receive instant confirmation and can track your booking status directly from your dashboard. No more waiting and wondering. Status updates move through Pending → Confirmed → Completed, with notifications at each stage.

### Smarter Agent Communication
Our agent chat has been upgraded. You can now message an agent directly from any talent's profile page, before you've even committed to a booking. Ask questions, request custom packages, or check availability — all without leaving the page.

### Secure Payment Processing
We've integrated Stripe's latest payment infrastructure, which means faster processing, support for more card types, and bank-grade encryption on every transaction. Your payment data never touches our servers.

## Coming Soon

We're currently in beta testing for calendar-based booking — the ability to select specific dates and times directly from a talent's availability calendar. This feature will roll out to all users within the next quarter.

Thank you for being part of the StratifyHub community. Your feedback shapes everything we build.`,
      },
      {
        title: 'Top 10 Most Requested Celebrities in 2026',
        image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
        body: `Every year we analyse booking data, search trends, and fan engagement metrics across the platform to identify who's driving the most demand. 2026 has brought some familiar faces to the top — and a few surprises.

## The Methodology

Our rankings combine three data points: total booking requests, repeat booking rate (fans who come back), and search volume on the platform. A celebrity who generates intense loyalty scores higher than one who draws a single spike of attention.

## The Top Tier

**Music dominates the top spots.** Fans' appetite for direct access to their favourite artists hasn't slowed. Virtual studio sessions — where fans get to witness the creative process firsthand — are the fastest-growing booking category on the platform this year.

**Bollywood is breaking through globally.** International demand for Bollywood talent has grown 340% year-over-year. Fans from North America, Europe, and Southeast Asia are booking experiences with Indian stars in unprecedented numbers.

**Esports athletes are rising fast.** Gaming celebrities now occupy three spots in the top ten — up from zero just three years ago. Their audiences are deeply engaged, technically savvy, and willing to pay premium prices for one-on-one coaching sessions combined with a meet and greet.

## The Surprise Entries

Comedy continues its quiet dominance. Stand-up comedians consistently outperform expectations on repeat booking rates — fans who book once almost always come back. There's something about laughter that builds the deepest loyalty.

Royalty and public figures remain a category of their own. Demand here is driven by corporate and philanthropic events as much as personal fan experiences, pushing average booking values significantly higher than other categories.

## What This Tells Us

The data confirms what we've always believed: fans want connection, not just proximity. The celebrities who score highest aren't necessarily the most famous — they're the ones who show up fully present, engaged, and genuinely invested in the experience.

Bookings for all featured talent are open now.`,
      },
      {
        title: 'How to Make the Most of Your VIP Backstage Experience',
        image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
        body: `You've booked the experience. The countdown is on. Whether it's your first time or your fifth, a VIP backstage session is an investment — in money, in time, and in memory. Here's how to make sure you walk away with something you'll never forget.

## Before the Day

**Do your research, but stay genuine.** Knowing a few key facts about the talent's recent work shows respect and opens better conversations. But don't script yourself. The best moments in these sessions happen spontaneously.

**Prepare one meaningful question.** Not ten. One. Something you genuinely want to know — not something you think will impress anyone. "What do you do when you're creatively stuck?" will always beat "What's it like being famous?"

**Dress how you want to be remembered in photos.** You will look back at these pictures. Wear something that feels like you at your best, not a costume.

## During the Session

**Put your phone down first.** Take the photo at the start if you need to, then put it away. The fans who report the most meaningful experiences are the ones who were actually present for them.

**Don't apologise for being nervous.** Everyone is. The talent knows it, expects it, and is usually very good at putting people at ease. Let them do that.

**Ask follow-up questions.** If something they say genuinely interests you, pursue it. A conversation that goes somewhere unexpected is far more memorable for both parties than a rehearsed exchange.

## After the Session

**Write it down the same day.** Memory fades faster than you expect. Even a few bullet points about what was said, what surprised you, and how it felt will help you relive the experience for years.

**Leave a review.** It helps other fans make informed decisions and gives the talent meaningful feedback on the experience they're providing.

The goal isn't to collect a celebrity. It's to have a genuine human moment with someone whose work has meant something to you. Go in with that intention and you won't be disappointed.`,
      },
      {
        title: 'The Rise of Celebrity-Backed Charitable Events',
        image_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
        body: `Something has shifted in how celebrities use their platform. The transactional model — show up, get paid, leave — is giving way to something more intentional. A growing number of the most in-demand talent on StratifyHub are choosing to anchor their appearances around causes they believe in.

## A New Kind of Booking

In the past twelve months, StratifyHub has facilitated over 200 charity-linked bookings — events where a portion of the booking fee goes directly to a cause nominated by the talent. Some have gone further, offering exclusive experiences that are only available when paired with a charitable donation.

The response from fans has been extraordinary. Charity-linked bookings have a 94% satisfaction rate, compared to 87% for standard bookings. When people feel their money is doing double duty — creating a personal memory and contributing to something larger — the experience takes on a different quality.

## Why Talent Are Choosing This

"I wanted the booking to mean something beyond just the moment," one artist told us. "If someone's spending that kind of money to meet me, I'd rather it also help fund school music programmes. That feels right."

This instinct is increasingly common. Talent managers report that cause-alignment has become a standard conversation in booking negotiations — not as a PR exercise, but as a genuine filter for how talent want to spend their time and energy.

## How It Works on StratifyHub

Talent can designate a registered charity to receive a percentage of their booking fees — anywhere from 10% to 100%. This is displayed transparently on their profile. Fans can see exactly where their money is going before they book.

For larger events — corporate bookings, galas, fundraisers — we also offer custom-structured packages where the entire event is designed around a charitable goal, with the talent playing an active role in the cause rather than simply lending their name.

## The Bigger Picture

Celebrity philanthropy has a complicated history. Done poorly, it's performative. Done well, it creates lasting change and models a kind of engaged citizenship that ripples outward.

What we're seeing on StratifyHub suggests the latter is winning. Fans are hungry for it. Talent are committed to it. And the causes being supported — from arts education to environmental conservation to mental health — are better for it.

If you're a fan looking to book an experience that means something beyond the moment, filter by our Charity Partner talent and see who resonates with you.`,
      },
      {
        title: 'Security & Privacy: How We Protect Your Bookings',
        image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80',
        body: `Trust is the foundation of everything we do at StratifyHub. When you book an experience with us, you're sharing personal information and financial details — and you deserve to know exactly how we handle them.

## Payment Security

Every payment on StratifyHub is processed by Stripe, one of the world's most trusted payment infrastructure providers. This means:

- Your card details are never stored on our servers
- All transactions use TLS 1.3 encryption in transit
- Stripe's fraud detection systems monitor every payment in real time
- We are PCI-DSS compliant by design, not as an afterthought

When you see the lock icon in your browser, it means your data is encrypted end-to-end. That's not a marketing claim — it's a cryptographic guarantee.

## Your Personal Data

We collect only what we need to facilitate your booking: your name, email, and the details of your selected experience. We do not sell this data to third parties. We do not use it for advertising. We do not share it with the talent beyond what is necessary for your booking to take place.

Your booking history is stored securely and is accessible only to you through your dashboard and to our support team when you request assistance.

## Account Security

Your password is hashed using bcrypt with a high work factor before it is stored. This means that even in the unlikely event of a data breach, your password cannot be recovered from what is stored — not by attackers, not by us.

We strongly recommend using a unique password for your StratifyHub account. A password manager makes this effortless.

## Refund Policy

Every booking includes a 48-hour full-refund window, no questions asked. After that window, refund eligibility depends on the specific experience and how far in advance the booking is made. All refund requests are reviewed by a human, not an automated system.

## Reporting a Concern

If you believe you've identified a security vulnerability, please contact us directly. We take all reports seriously and respond within 24 hours. Responsible disclosure is always acknowledged and appreciated.

Your trust is not something we take for granted. It's something we work to deserve every day.`,
      },
    ];

    for (const patch of backfill) {
      await db.run(
        'UPDATE BlogPost SET image_url = COALESCE(image_url, ?), body = COALESCE(body, ?) WHERE title = ?',
        patch.image_url, patch.body, patch.title
      );
    }
    console.log('✅ Backfilled blog post images and articles');
  }

  // ── Seed admin user ──────────────────────────────────────────────────────
  const adminExists = await db.get("SELECT id FROM User WHERE role = 'admin'");
  if (!adminExists) {
    const { default: bcrypt } = await import('bcryptjs');
    const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@stratifyhub.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const hash = await bcrypt.hash(adminPassword, 12);
    await db.run(
      "INSERT OR IGNORE INTO User (name, email, password_hash, role) VALUES ('Admin', ?, ?, 'admin')",
      adminEmail, hash
    );
    console.log(`✅ Seeded admin user: ${adminEmail} / ${adminPassword}`);
  }

  await db.close();
  console.log('✅ Database initialised');
}
