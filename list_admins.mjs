import pg from 'pg';

const connectionString = "postgresql://postgres.oawomrlsitttrbulxgyk:jzqqWU5XbrckrIAD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";

async function run() {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT * FROM admins");
    console.log("Registered Admins:");
    console.log(res.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
