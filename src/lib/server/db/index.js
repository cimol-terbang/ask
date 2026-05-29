import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } from '$env/static/private';

const { Pool } = pg;

// Use individual params instead of a connection URL to avoid
// issues with special characters in the password being misread as URL syntax
const pool = new Pool({
	host: DB_HOST,
	port: parseInt(DB_PORT),
	database: DB_NAME,
	user: DB_USER,
	password: DB_PASSWORD,
	family: 4,
	ssl: { rejectUnauthorized: false },

	// Pool sizing — sesuaikan dengan limit koneksi DB server kamu
	// Untuk shared hosting / Supabase free tier, keep ini rendah (2-5)
	// Untuk VPS sendiri, bisa naik ke 10-20
	max: 5,

	// Berapa lama nunggu koneksi tersedia sebelum throw error
	// Tanpa ini, request bisa hang selamanya jika pool penuh
	connectionTimeoutMillis: 5000,

	// Koneksi idle diputus setelah 30 detik (hemat resource)
	idleTimeoutMillis: 30000,

	// Koneksi yang sudah terlalu lama diputus paksa (cegah stale connection)
	// Berguna jika DB server restart atau network blip
	allowExitOnIdle: false
});

export const db = drizzle(pool, { schema });

// Log pool errors tanpa crash server
// Tanpa ini, error koneksi idle bisa throw uncaught exception
pool.on('error', (err) => {
	console.error('[db] idle client error:', err.message);
});
