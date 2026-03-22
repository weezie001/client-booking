import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Add it to your .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

pool.on('error', (err) => console.error('Unexpected DB pool error:', err));

/** Run INSERT / UPDATE / DELETE. Returns the pg result object. */
export const query = (sql, params = []) => pool.query(sql, params);

/** SELECT returning the first row, or null. */
export const getOne = async (sql, params = []) => {
  const { rows } = await pool.query(sql, params);
  return rows[0] ?? null;
};

/** SELECT returning all rows. */
export const getAll = async (sql, params = []) => {
  const { rows } = await pool.query(sql, params);
  return rows;
};

export default pool;
