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
	ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
