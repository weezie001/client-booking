import express from 'express';
import cors from 'cors';
import { openDb } from './init_db.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// API endpoints to retrieve real database items
app.get('/api/talents', async (req, res) => {
  try {
    const db = await openDb();
    const talents = await db.all('SELECT * FROM Talent');
    // Map sqlite integers 1 / 0 to true / false
    const mapped = talents.map(t => ({
      ...t,
      featured: t.featured === 1
    }));
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching talents:", error);
    res.status(500).json({ error: "Failed to load talents from database" });
  }
});

app.listen(port, () => {
  console.log(`API Server running securely on http://localhost:${port}`);
});
