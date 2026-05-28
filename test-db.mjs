import 'dotenv/config';
import pg from 'pg';

// Read DB connection from environment (.env)
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  family: 4,
  ssl: { rejectUnauthorized: false }
});

try {
  const res = await pool.query('SELECT current_database(), current_user');
  console.log('✅ DB connection OK');
  console.log('  Database:', res.rows[0].current_database);
  console.log('  User:', res.rows[0].current_user);
} catch (e) {
  console.error('❌ DB error:', e.message);
} finally {
  await pool.end();
}
