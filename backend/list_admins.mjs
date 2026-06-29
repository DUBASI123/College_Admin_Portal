import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = "postgresql://postgres.oawomrlsitttrbulxgyk:jzqqWU5XbrckrIAD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";

async function run() {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const admins = await pool.query("SELECT * FROM admins");
    console.log("Registered Admins:", admins.rows);

    const colleges = await pool.query("SELECT * FROM colleges");
    console.log("Registered Colleges:", colleges.rows);

    const adminsInStudents = await pool.query("SELECT id, first_name, last_name, email, role, college_id, verification_status FROM students WHERE role != 'student'");
    console.log("Admins inside students table:", adminsInStudents.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
