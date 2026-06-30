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
  
  // Create files table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      semester VARCHAR(50) NOT NULL,
      department VARCHAR(255) NOT NULL,
      original_file_name VARCHAR(255) NOT NULL,
      stored_file_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      s3_key TEXT NOT NULL,
      uploaded_by UUID,
      uploaded_at TIMESTAMPTZ DEFAULT NOW(),
      last_modified TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'Active'
    );
  `);

  // Create content table if not exists (for Academic Hub materials)
  await client.query(`
    CREATE TABLE IF NOT EXISTS content (
      id              UUID PRIMARY KEY,
      college_id      UUID,
      category_id     UUID,
      department_id   UUID,
      uploaded_by     UUID,
      title           VARCHAR(500) NOT NULL,
      description     TEXT,
      content_type    VARCHAR(50) NOT NULL,
      file_url        TEXT,
      file_size       BIGINT,
      file_name       TEXT,
      subject         VARCHAR(255),
      semester        SMALLINT,
      year_target     SMALLINT,
      view_count      INT DEFAULT 0,
      is_published    INT DEFAULT 1,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  client.release();
  console.log('PostgreSQL verification: Connection successful & database tables verified.');
};
