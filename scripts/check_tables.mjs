import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

try {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('conversations','messages')");
  console.log('tables:', res.rows.map(r => r.table_name));
} catch (e) {
  console.error('ERR', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
