import pg from 'pg';
import crypto from 'crypto';

// Bypass self-signed SSL certificate issues for Supabase/Render PostgreSQL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = process.env.DATABASE_URL;
let pgPool;

if (connectionString) {
  pgPool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
} else {
  pgPool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'myvault_user',
    password: process.env.DB_PASSWORD || 'myvault_password',
    database: process.env.DB_NAME || 'myvault_db',
    ssl: { rejectUnauthorized: false }
  });
}

console.log('Database Mode: PostgreSQL pool initialized.');

// Convert SQLite style ? placeholders to PostgreSQL $1, $2 style placeholders dynamically
const convertSql = (sql) => {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

export const query = async (sql, params = []) => {
  const finalSql = convertSql(sql);
  const res = await pgPool.query(finalSql, params);
  return res.rows;
};

export const run = async (sql, params = []) => {
  const finalSql = convertSql(sql);
  const res = await pgPool.query(finalSql, params);
  return { id: null, changes: res.rowCount };
};

export const get = async (sql, params = []) => {
  const finalSql = convertSql(sql);
  const res = await pgPool.query(finalSql, params);
  return res.rows[0] || null;
};

export const generateUUID = () => crypto.randomUUID();

export const initDb = async () => {
  // Test connection
  const client = await pgPool.connect();
  client.release();
  console.log('PostgreSQL verification: Connection successful.');
};
