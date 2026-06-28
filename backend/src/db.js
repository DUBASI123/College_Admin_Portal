import sqlite3 from 'sqlite3';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Bypass self-signed SSL certificate issues for Supabase/Render PostgreSQL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../database.db');

const isPostgres = process.env.DB_TYPE === 'postgres';
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  const connectionString = process.env.DATABASE_URL;
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
  console.log('Database Mode: Production PostgreSQL pool initialized.');
} else {
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to connect to SQLite database:', err.message);
    } else {
      console.log('Database Mode: Local SQLite database connected at:', dbPath);
    }
  });
}

// Convert SQLite style ? placeholders to PostgreSQL $1, $2 style placeholders dynamically
const convertSql = (sql) => {
  if (!isPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

export const query = async (sql, params = []) => {
  const finalSql = convertSql(sql);
  if (isPostgres) {
    const res = await pgPool.query(finalSql, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(finalSql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

export const run = async (sql, params = []) => {
  const finalSql = convertSql(sql);
  if (isPostgres) {
    const res = await pgPool.query(finalSql, params);
    return { id: null, changes: res.rowCount };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(finalSql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

export const get = async (sql, params = []) => {
  const finalSql = convertSql(sql);
  if (isPostgres) {
    const res = await pgPool.query(finalSql, params);
    return res.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(finalSql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

export const generateUUID = () => crypto.randomUUID();

export const initDb = async () => {
  if (isPostgres) {
    console.log('PostgreSQL detected. Table structures managed by schema.sql migrations.');
    return;
  }

  // Enable foreign keys
  await run('PRAGMA foreign_keys = ON;');

  // Create Colleges
  await run(`
    CREATE TABLE IF NOT EXISTS colleges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      website TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Admins
  await run(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      full_name_aadhar TEXT,
      id_card_url TEXT,
      position TEXT,
      department TEXT,
      role TEXT CHECK (role IN ('super_admin', 'admin')) DEFAULT 'admin',
      status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
    )
  `);

  // Migrate existing SQLite tables to include new employee verification columns
  try { await run("ALTER TABLE admins ADD COLUMN phone TEXT"); } catch (_) {}
  try { await run("ALTER TABLE admins ADD COLUMN full_name_aadhar TEXT"); } catch (_) {}
  try { await run("ALTER TABLE admins ADD COLUMN id_card_url TEXT"); } catch (_) {}
  try { await run("ALTER TABLE admins ADD COLUMN position TEXT"); } catch (_) {}
  try { await run("ALTER TABLE admins ADD COLUMN department TEXT"); } catch (_) {}
  try { await run("ALTER TABLE admins ADD COLUMN status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending'"); } catch (_) {}

  // Create Departments
  await run(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
    )
  `);

  // Create Students
  await run(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      department_id TEXT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      roll_number TEXT,
      year_of_study INTEGER CHECK (year_of_study BETWEEN 1 AND 5),
      password_hash TEXT NOT NULL,
      profile_pic_url TEXT,
      fcm_token TEXT,
      status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      approved_by TEXT,
      approved_at DATETIME,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (approved_by) REFERENCES admins(id)
    )
  `);

  // Create Content Categories
  await run(`
    CREATE TABLE IF NOT EXISTS content_categories (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
    )
  `);

  // Create Content (Notes, PDFs, PPTs, Videos, etc.)
  await run(`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      category_id TEXT,
      department_id TEXT,
      uploaded_by TEXT,
      title TEXT NOT NULL,
      description TEXT,
      content_type TEXT CHECK (content_type IN ('notes', 'pdf', 'ppt', 'video', 'lab_manual', 'syllabus', 'ebook', 'question_paper', 'other')) NOT NULL,
      file_url TEXT,
      file_size INTEGER,
      file_name TEXT,
      subject TEXT,
      semester INTEGER,
      year_target INTEGER,
      view_count INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES content_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL
    )
  `);

  // Create Opportunities
  await run(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      posted_by TEXT,
      title TEXT NOT NULL,
      company TEXT,
      description TEXT,
      type TEXT CHECK (type IN ('job', 'internship', 'placement', 'scholarship', 'competition', 'other')) DEFAULT 'job',
      location TEXT,
      salary_range TEXT,
      eligibility TEXT,
      apply_link TEXT,
      deadline TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
      FOREIGN KEY (posted_by) REFERENCES admins(id) ON DELETE SET NULL
    )
  `);

  // Create Notifications
  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL,
      sent_by TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT CHECK (type IN ('general', 'content', 'opportunity', 'system', 'alert')) DEFAULT 'general',
      target_all INTEGER DEFAULT 1,
      target_year INTEGER,
      target_dept_id TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
      FOREIGN KEY (sent_by) REFERENCES admins(id) ON DELETE SET NULL,
      FOREIGN KEY (target_dept_id) REFERENCES departments(id) ON DELETE SET NULL
    )
  `);

  // Automatic Seeding for testing out-of-the-box
  const countColleges = await get('SELECT COUNT(*) as count FROM colleges');
  if (countColleges.count === 0) {
    console.log('Seeding initial mock data into database...');
    
    // Colleges
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_nitw', 'National Institute of Technology (NIT) Warangal', 'NITW', 'nitw.ac.in')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_kitsw', 'Kakatiya Institute of Technology & Science (KITS) Warangal', 'KITSW', 'kitsw.ac.in')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_vcew', 'Vaagdevi College of Engineering', 'VCEW', 'vaagdevi.edu.in')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_sru', 'SR University', 'SRU', 'sru.edu.in')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_arti', \"Aurora's Research and Technological Institute\", 'ARTI', 'aurora.edu.in')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_tpce', 'Talla Padmavathi College of Engineering', 'TPCE', 'tallapadmavathi.org')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_sritw', 'Sumathi Reddy Institute of Technology for Women', 'SRITW', 'sritw.org')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_jits', 'Jayamukhi Institute of Technological Sciences', 'JITS', 'jits.in')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_bies', 'Balaji Institute of Engineering and Sciences', 'BIES', 'balajigroups.org')");
    await run("INSERT INTO colleges (id, name, code, website) VALUES ('c_jits2', 'Jaya Institute of Technology & Science', 'JITS2', 'jayaits.ac.in')");

    // Departments
    const suCse = 'dept-nitw-cse';
    const suIt = 'dept-nitw-it';
    const mitCse = 'dept-kitsw-cse';
    
    await run("INSERT INTO departments (id, college_id, name, code) VALUES (?, 'c_nitw', 'Computer Science & Engineering', 'CSE')", [suCse]);
    await run("INSERT INTO departments (id, college_id, name, code) VALUES (?, 'c_nitw', 'Information Technology', 'IT')", [suIt]);
    await run("INSERT INTO departments (id, college_id, name, code) VALUES (?, 'c_kitsw', 'Computer Science & Engineering', 'CSE')", [mitCse]);

    // Admin (password is 'password123')
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminId = 'admin-su-id';
    await run(
      "INSERT INTO admins (id, college_id, name, email, password_hash, role) VALUES (?, 'c_nitw', 'Dean NITW', 'admin@nitw.ac.in', ?, 'admin')",
      [adminId, passwordHash]
    );

    // Pending Student (password is 'password123')
    await run(
      `INSERT INTO students (id, college_id, department_id, name, email, phone, roll_number, year_of_study, password_hash, status)
       VALUES (?, 'c_nitw', ?, 'Alice Smith', 'student@nitw.ac.in', '9876543210', 'NITW-CS-007', 3, ?, 'pending')`,
      ['student-pending-id', suCse, passwordHash]
    );

    // Approved Student (password is 'password123')
    await run(
      `INSERT INTO students (id, college_id, department_id, name, email, phone, roll_number, year_of_study, password_hash, status)
       VALUES (?, 'c_nitw', ?, 'Bob Johnson', 'bob@nitw.ac.in', '9876543211', 'NITW-CS-008', 4, ?, 'approved')`,
      ['student-approved-id', suCse, passwordHash]
    );

    // Content Categories
    const notesCat = 'cat-notes';
    const booksCat = 'cat-books';
    await run("INSERT INTO content_categories (id, college_id, name, slug, icon) VALUES (?, 'c_nitw', 'Notes', 'notes', 'file-text')", [notesCat]);
    await run("INSERT INTO content_categories (id, college_id, name, slug, icon) VALUES (?, 'c_nitw', 'e-Books', 'ebooks', 'book')", [booksCat]);

    // Academic Content
    await run(
      `INSERT INTO content (id, college_id, category_id, department_id, uploaded_by, title, description, content_type, file_url, file_size, file_name, subject, semester, year_target)
       VALUES (?, 'c_nitw', ?, ?, ?, 'DBMS Lecture Notes - Unit 1', 'Relational database models and standard SQL queries.', 'notes', '/uploads/dbms-notes.pdf', 1048576, 'dbms-notes.pdf', 'Database Systems', 5, 3)`,
      ['content-dbms-notes', notesCat, suCse, adminId]
    );
    await run(
      `INSERT INTO content (id, college_id, category_id, department_id, uploaded_by, title, description, content_type, file_url, file_size, file_name, subject, semester, year_target)
       VALUES (?, 'c_nitw', ?, ?, ?, 'Data Structures Reference Book', 'Standard algorithms and tree traversals textbook references.', 'ebook', '/uploads/dsa-book.pdf', 5242880, 'dsa-book.pdf', 'Data Structures', 3, 2)`,
      ['content-dsa-book', booksCat, suCse, adminId]
    );

    // Opportunities
    await run(
      `INSERT INTO opportunities (id, college_id, posted_by, title, company, description, type, location, salary_range, eligibility, apply_link, deadline)
       VALUES (?, 'c_nitw', ?, 'Associate Software Engineer', 'Google India', 'Campus placement drive for software engineers. Responsibilities include coding, testing, and debugging large scale systems.', 'job', 'Bangalore', '18 - 22 LPA', 'CGPA > 8.0, CSE/IT students only', 'https://careers.google.com', '2026-07-31')`,
      ['opp-google-id', adminId]
    );

    console.log('Database seeded successfully.');
  }

  console.log('Database tables verified/created successfully.');
};

export default { query, run, get, initDb };
