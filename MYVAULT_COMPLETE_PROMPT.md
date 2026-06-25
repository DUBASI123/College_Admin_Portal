# MyVault — Complete Prompt + Code (Single File)

Copy this entire file and paste it as your first message to an AI coding agent (Cursor, Bolt, Replit Agent, Lovable, Windsurf, Claude Code, etc.). It contains the full project prompt followed by every source file, each clearly marked with its destination path so the agent can reconstruct the project folder structure exactly.

**Three codebases inside:** `backend/` (Express API), `frontend/` (React + Vite admin website), `student-mobile/` (React Native / Expo app).

---

## MASTER PROMPT — MyVault Student Verification System

Paste everything below into your AI coding agent. It gives full context so the agent can continue, debug, or extend this system.

---

### PROJECT CONTEXT

MyVault is a **multi-college student verification platform** with three components sharing one backend:

1. **Student mobile app** (`student-mobile/`) — React Native / Expo — students register, pick their college + department, and log in once approved by their college admin.
2. **College admin website** (`frontend/`) — React + Vite — college admins self-register (picking their own college), then log in to a dashboard that shows ONLY the pending/approved/rejected student requests for their college, with Approve/Reject actions.
3. **Backend API** (`backend/`) — Express.js with SQLite (dev) / PostgreSQL (prod) — JWT auth, college-scoped queries, file uploads.

### THE CORE MECHANISM

There is no separate "request" object or queue. A student's database record IS the request. Routing works through exactly one shared field:

```
student.college_id == admin.college_id
```

- Set on the **student** when they pick their college on the register form.
- Set on the **admin** when they pick their college on the website register form.
- The admin dashboard queries: `SELECT * FROM students WHERE college_id = <admin's college_id>`
- The backend middleware enforces this server-side. An admin cannot see or modify students from a different college.

Status lifecycle on a student record:
```
Pending → Approved (admin clicks Approve)
Pending → Rejected (admin clicks Reject with a reason)
```

### STACK

- **Backend**: Node.js + Express 4 (ESM), SQLite (dev) / PostgreSQL (prod), bcrypt + JWT auth
- **Admin Website**: React 19 + Vite 8 + Tailwind-like CSS, lucide-react icons
- **Mobile App**: React Native 0.73 + Expo SDK 50, React Navigation, axios
- **Database**: SQLite for local dev, auto-creates tables + seeds test data on first run

### DATA MODEL

**`colleges` table** — multi-tenant structure:
```
id (UUID), name, code (unique), website, is_active, created_at
```

**`admins` table** — doc id == Firebase Auth uid:
```
id, college_id (FK → colleges), name, email, password_hash, role, is_active
```

**`students` table** — the routing key is `college_id`:
```
id, college_id (FK → colleges), department_id (FK → departments), name, email, phone, roll_number, year_of_study, password_hash, status ('pending'|'approved'|'rejected'), approved_by, approved_at, rejection_reason, created_at
```

**`departments` table** — scoped to a college:
```
id, college_id (FK → colleges), name, code
```

**`content` table** — academic resources:
```
id, college_id, department_id, title, description, content_type, file_url, semester, year_target, ...
```

**`opportunities` table** — career listings:
```
id, college_id, title, company, type, location, salary_range, eligibility, deadline, ...
```

**`notifications` table** — push alerts:
```
id, college_id, title, body, type, target_all, target_year, target_dept_id, sent_at
```

### WHAT'S ALREADY BUILT

**Backend** (`backend/`):
- `src/server.js` — Express entry point with CORS, logging, static file serving
- `src/db.js` — Dual SQLite/PostgreSQL abstraction with auto-table-creation + seed data
- `src/routes/auth.js` — Admin register/login, student register (pending), student login (status-gated)
- `src/routes/admin.js` — Student CRUD (college-scoped), content upload, opportunities, notifications, analytics
- `src/routes/student.js` — Profile, content browsing, opportunities, notifications (all college-scoped)
- `schema.sql` — PostgreSQL schema for production

**Admin Website** (`frontend/`):
- `src/App.jsx` — Landing page ↔ Admin Portal navigation
- `src/components/LandingPage.jsx` — Marketing page with feature showcase + approval flow walkthrough
- `src/components/AdminPortal.jsx` — Full dashboard: login/register, student approvals, academic hub, placement desk, notifications
- `src/index.css` — Dark cyberpunk-slate theme (1143 lines)

**Student Mobile** (`student-mobile/`):
- `App.js` — React Navigation with 4 screens
- `screens/LoginScreen.js` — Email/password login with status-aware error handling (pending/rejected)
- `screens/RegisterScreen.js` — College + department picker, registration form, submits as pending
- `screens/HomeScreen.js` — Dashboard with academic hub + career board links, announcements feed
- `screens/AcademicHubScreen.js` — Searchable content browser with category filters

### KNOWN GAPS

1. **Mobile API URL**: `YOUR_LOCAL_IP:5050` needs to be replaced with your machine's LAN IP before the mobile app can reach the backend from a real device.
2. **Push notifications**: The notifications table stores alerts but there's no Firebase Cloud Messaging integration yet — students see them in-app only.
3. **Email notifications**: No email sent when admin approves/rejects a student.
4. **Re-registration**: Nothing stops a rejected student from registering again with a new email.

### RULES FOR THE AI AGENT

1. **college_id matching is the entire routing mechanism** — do not add a separate routing/queue system.
2. **Keep backend, frontend, and mobile app in sync** on schema changes.
3. **Admin self-approval must stay impossible** — only a super-admin via direct DB update can approve admins.
4. **Don't swap the database** from SQLite/PostgreSQL to something else without asking.
5. **Don't introduce new frameworks** (no Firebase, no Supabase, no Next.js) without explicit request.

---

## FILE: `backend/package.json`

```json
{
  "name": "myvault-backend",
  "version": "1.0.0",
  "description": "Backend API for MyVault Academic & Career Platform",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node src/server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.22.0",
    "sqlite3": "^5.1.7"
  }
}
```

---

## FILE: `backend/schema.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS colleges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(50)  UNIQUE NOT NULL,
  website         TEXT,
  district        TEXT DEFAULT '',
  college_type    TEXT DEFAULT '',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin','admin')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(20) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id),
  department_id   UUID REFERENCES departments(id),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  phone           VARCHAR(20),
  roll_number     VARCHAR(50),
  year_of_study   SMALLINT CHECK (year_of_study BETWEEN 1 AND 5),
  password_hash   TEXT NOT NULL,
  profile_pic_url TEXT,
  fcm_token       TEXT,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by     UUID REFERENCES admins(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  uploaded_by     UUID REFERENCES admins(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  content_type    VARCHAR(50) NOT NULL,
  file_url        TEXT, file_size BIGINT, file_name TEXT,
  subject         VARCHAR(255), semester SMALLINT, year_target SMALLINT,
  view_count      INT DEFAULT 0, is_published BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  posted_by       UUID REFERENCES admins(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL, company VARCHAR(255),
  description     TEXT, type VARCHAR(50) DEFAULT 'job',
  location VARCHAR(255), salary_range VARCHAR(100), eligibility TEXT,
  apply_link TEXT, deadline DATE, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL, body TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  target_all BOOLEAN DEFAULT TRUE, target_year SMALLINT,
  target_dept_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## FILE: `backend/src/server.js`

```javascript
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import studentRouter from './routes/student.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const uploadsDir = join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/student', studentRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const startServer = (port) => {
  const server = app.listen(port, () => console.log(`MyVault Backend running on http://localhost:${port}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') { console.warn(`Port ${port} in use, trying ${port + 1}...`); startServer(port + 1); }
    else console.error('Server failed to start:', err);
  });
};

initDb().then(() => startServer(PORT)).catch(err => { console.error(err); process.exit(1); });
```

---

## FILE: `backend/src/db.js`

```javascript
import sqlite3 from 'sqlite3';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../database.db');
const isPostgres = process.env.DB_TYPE === 'postgres';
let pgPool = null, sqliteDb = null;

if (isPostgres) {
  pgPool = new pg.Pool({ host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, user: process.env.DB_USER || 'myvault_user', password: process.env.DB_PASSWORD || 'myvault_password', database: process.env.DB_NAME || 'myvault_db' });
} else {
  sqliteDb = new sqlite3.Database(dbPath, (err) => { if (err) console.error('Failed to connect to SQLite:', err.message); else console.log('SQLite connected:', dbPath); });
}

const convertSql = (sql) => { if (!isPostgres) return sql; let i = 1; return sql.replace(/\?/g, () => `$${i++}`); };

export const query = async (sql, params = []) => {
  if (isPostgres) return (await pgPool.query(convertSql(sql), params)).rows;
  return new Promise((resolve, reject) => sqliteDb.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
};
export const run = async (sql, params = []) => {
  if (isPostgres) return { changes: (await pgPool.query(convertSql(sql), params)).rowCount };
  return new Promise((resolve, reject) => sqliteDb.run(sql, params, function (err) { err ? reject(err) : resolve({ id: this.lastID, changes: this.changes }); }));
};
export const get = async (sql, params = []) => {
  if (isPostgres) return (await pgPool.query(convertSql(sql), params)).rows[0] || null;
  return new Promise((resolve, reject) => sqliteDb.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
};
export const generateUUID = () => crypto.randomUUID();

export const initDb = async () => {
  if (isPostgres) return;
  await run('PRAGMA foreign_keys = ON;');
  await run('CREATE TABLE IF NOT EXISTS colleges (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, logo_url TEXT, website TEXT, district TEXT DEFAULT "", college_type TEXT DEFAULT "", is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
  await run('CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, college_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT "admin", is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE)');
  await run('CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, college_id TEXT NOT NULL, name TEXT NOT NULL, code TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE)');
  await run('CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, college_id TEXT NOT NULL, department_id TEXT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT, roll_number TEXT, year_of_study INTEGER, password_hash TEXT NOT NULL, profile_pic_url TEXT, fcm_token TEXT, status TEXT DEFAULT "pending", approved_by TEXT, approved_at DATETIME, rejection_reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (college_id) REFERENCES colleges(id), FOREIGN KEY (department_id) REFERENCES departments(id), FOREIGN KEY (approved_by) REFERENCES admins(id))');
  await run('CREATE TABLE IF NOT EXISTS content_categories (id TEXT PRIMARY KEY, college_id TEXT NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL, icon TEXT, sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE)');
  await run('CREATE TABLE IF NOT EXISTS content (id TEXT PRIMARY KEY, college_id TEXT NOT NULL, category_id TEXT, department_id TEXT, uploaded_by TEXT, title TEXT NOT NULL, description TEXT, content_type TEXT NOT NULL, file_url TEXT, file_size INTEGER, file_name TEXT, subject TEXT, semester INTEGER, year_target INTEGER, view_count INTEGER DEFAULT 0, is_published INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE, FOREIGN KEY (category_id) REFERENCES content_categories(id) ON DELETE SET NULL, FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL, FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL)');
  await run('CREATE TABLE IF NOT EXISTS opportunities (id TEXT PRIMARY KEY, college_id TEXT NOT NULL, posted_by TEXT, title TEXT NOT NULL, company TEXT, description TEXT, type TEXT DEFAULT "job", location TEXT, salary_range TEXT, eligibility TEXT, apply_link TEXT, deadline TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE, FOREIGN KEY (posted_by) REFERENCES admins(id) ON DELETE SET NULL)');
  await run('CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, college_id TEXT NOT NULL, sent_by TEXT, title TEXT NOT NULL, body TEXT NOT NULL, type TEXT DEFAULT "general", target_all INTEGER DEFAULT 1, target_year INTEGER, target_dept_id TEXT, sent_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE, FOREIGN KEY (sent_by) REFERENCES admins(id) ON DELETE SET NULL, FOREIGN KEY (target_dept_id) REFERENCES departments(id) ON DELETE SET NULL)');

  const count = await get('SELECT COUNT(*) as count FROM colleges');
  if (count.count === 0) {
    console.log('Seeding initial mock data...');
    const suId = '11111111-1111-1111-1111-111111111111';
    const mitId = '22222222-2222-2222-2222-222222222222';
    await run('INSERT INTO colleges (id, name, code, website) VALUES (?, ?, ?, ?)', [suId, 'Stanford University', 'SU', 'stanford.edu']);
    await run('INSERT INTO colleges (id, name, code, website) VALUES (?, ?, ?, ?)', [mitId, 'MIT College', 'MIT', 'mit.edu']);
    const suCse = 'dept-su-cse', suIt = 'dept-su-it', mitCse = 'dept-mit-cse';
    await run('INSERT INTO departments (id, college_id, name, code) VALUES (?, ?, ?, ?)', [suCse, suId, 'Computer Science & Engineering', 'CSE']);
    await run('INSERT INTO departments (id, college_id, name, code) VALUES (?, ?, ?, ?)', [suIt, suId, 'Information Technology', 'IT']);
    await run('INSERT INTO departments (id, college_id, name, code) VALUES (?, ?, ?, ?)', [mitCse, mitId, 'Computer Science & Engineering', 'CSE']);
    const hash = await bcrypt.hash('password123', 10);
    await run("INSERT INTO admins (id, college_id, name, email, password_hash) VALUES (?, ?, ?, ?, ?)", ['admin-su-id', suId, 'Dean Williams', 'admin@stanford.edu', hash]);
    await run("INSERT INTO students (id, college_id, department_id, name, email, phone, roll_number, year_of_study, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ['student-pending-id', suId, suCse, 'Alice Smith', 'student@stanford.edu', '9876543210', 'SU-CS-007', 3, hash, 'pending']);
    await run("INSERT INTO students (id, college_id, department_id, name, email, phone, roll_number, year_of_study, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ['student-approved-id', suId, suCse, 'Bob Johnson', 'bob@stanford.edu', '9876543211', 'SU-CS-008', 4, hash, 'approved']);
    await run("INSERT INTO content_categories (id, college_id, name, slug) VALUES (?, ?, ?, ?)", ['cat-notes', suId, 'Notes', 'notes']);
    await run("INSERT INTO content_categories (id, college_id, name, slug) VALUES (?, ?, ?, ?)", ['cat-books', suId, 'e-Books', 'ebooks']);
    await run("INSERT INTO content (id, college_id, category_id, department_id, uploaded_by, title, description, content_type, file_url, file_size, file_name, subject, semester, year_target) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ['content-dbms-notes', suId, 'cat-notes', suCse, 'admin-su-id', 'DBMS Lecture Notes - Unit 1', 'Relational database models.', 'notes', '/uploads/dbms-notes.pdf', 1048576, 'dbms-notes.pdf', 'Database Systems', 5, 3]);
    await run("INSERT INTO content (id, college_id, category_id, department_id, uploaded_by, title, description, content_type, file_url, file_size, file_name, subject, semester, year_target) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ['content-dsa-book', suId, 'cat-books', suCse, 'admin-su-id', 'Data Structures Reference Book', 'Algorithms and tree traversals.', 'ebook', '/uploads/dsa-book.pdf', 5242880, 'dsa-book.pdf', 'Data Structures', 3, 2]);
    await run("INSERT INTO opportunities (id, college_id, posted_by, title, company, description, type, location, salary_range, eligibility, apply_link, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ['opp-google-id', suId, 'admin-su-id', 'Associate Software Engineer', 'Google India', 'Campus placement drive.', 'job', 'Bangalore', '18 - 22 LPA', 'CGPA > 8.0', 'https://careers.google.com', '2026-07-31']);
    console.log('Database seeded successfully.');
  }
  console.log('Database tables verified.');
};
```

---

## FILE: `backend/src/routes/auth.js`

```javascript
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run, query, generateUUID } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'myvault_jwt_secret_key_12345';

router.get('/colleges', async (req, res) => {
  try { res.json(await query('SELECT * FROM colleges WHERE is_active = 1 ORDER BY name ASC')); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch colleges' }); }
});

router.get('/colleges/:collegeId/departments', async (req, res) => {
  try { res.json(await query('SELECT * FROM departments WHERE college_id = ? ORDER BY name ASC', [req.params.collegeId])); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch departments' }); }
});

router.post('/admin/register', async (req, res) => {
  try {
    const { collegeMode, collegeId, collegeName, collegeCode, collegeWebsite, name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    let targetCollegeId = collegeId;
    if (collegeMode === 'create') {
      if (!collegeName || !collegeCode) return res.status(400).json({ error: 'College name and code required' });
      const existing = await get('SELECT id FROM colleges WHERE code = ?', [collegeCode.toUpperCase()]);
      if (existing) return res.status(400).json({ error: 'College code already exists' });
      targetCollegeId = generateUUID();
      await run('INSERT INTO colleges (id, name, code, website) VALUES (?, ?, ?, ?)', [targetCollegeId, collegeName, collegeCode.toUpperCase(), collegeWebsite || '']);
      for (const d of [{ n: 'Computer Science & Engineering', c: 'CSE' }, { n: 'Information Technology', c: 'IT' }, { n: 'Electronics & Communication', c: 'ECE' }, { n: 'Mechanical Engineering', c: 'ME' }, { n: 'Civil Engineering', c: 'CE' }])
        await run('INSERT INTO departments (id, college_id, name, code) VALUES (?, ?, ?, ?)', [generateUUID(), targetCollegeId, d.n, d.c]);
    } else if (!targetCollegeId) return res.status(400).json({ error: 'Select a college' });
    if (await get('SELECT id FROM admins WHERE email = ?', [email])) return res.status(400).json({ error: 'Admin already exists' });
    const hash = await bcrypt.hash(password, 10);
    const adminId = generateUUID();
    const college = await get('SELECT name FROM colleges WHERE id = ?', [targetCollegeId]);
    await run('INSERT INTO admins (id, college_id, name, email, password_hash) VALUES (?, ?, ?, ?, ?)', [adminId, targetCollegeId, name, email, hash]);
    const token = jwt.sign({ id: adminId, role: 'admin', college_id: targetCollegeId }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Registered successfully', token, admin: { id: adminId, name, email, college_id: targetCollegeId, college_name: college?.name || '' } });
  } catch (err) { res.status(500).json({ error: 'Registration failed', message: err.message }); }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await get('SELECT * FROM admins WHERE email = ?', [email]);
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
    const college = await get('SELECT name FROM colleges WHERE id = ?', [admin.college_id]);
    const token = jwt.sign({ id: admin.id, role: 'admin', college_id: admin.college_id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Logged in', token, admin: { id: admin.id, name: admin.name, email: admin.email, college_id: admin.college_id, college_name: college?.name || '' } });
  } catch (err) { res.status(500).json({ error: 'Login failed' }); }
});

router.post('/student/register', async (req, res) => {
  try {
    const { collegeId, departmentId, name, email, phone, rollNumber, yearOfStudy, password } = req.body;
    if (!collegeId || !name || !email || !password) return res.status(400).json({ error: 'College, Name, Email, and Password are required' });
    if (await get('SELECT id FROM students WHERE email = ?', [email])) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    await run("INSERT INTO students (id, college_id, department_id, name, email, phone, roll_number, year_of_study, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')", [generateUUID(), collegeId, departmentId || null, name, email, phone || '', rollNumber || '', yearOfStudy || 1, hash]);
    res.status(201).json({ message: 'Registered. Awaiting approval.', status: 'pending' });
  } catch (err) { res.status(500).json({ error: 'Registration failed', message: err.message }); }
});

router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await get('SELECT * FROM students WHERE email = ?', [email]);
    if (!student) return res.status(401).json({ error: 'Invalid email or password' });
    if (student.status === 'pending') return res.status(403).json({ error: 'pending_approval', message: 'Pending approval from college administrator.' });
    if (student.status === 'rejected') return res.status(403).json({ error: 'rejected', message: 'Rejected. Reason: ' + (student.rejection_reason || 'N/A') });
    if (!(await bcrypt.compare(password, student.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: student.id, role: 'student', college_id: student.college_id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Logged in', token, student: { id: student.id, name: student.name, email: student.email, college_id: student.college_id, status: student.status } });
  } catch (err) { res.status(500).json({ error: 'Login failed' }); }
});

export default router;
```

---

## FILE: `backend/src/routes/admin.js`

```javascript
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { run, query, get, generateUUID } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'myvault_jwt_secret_key_12345';
const __dirname = dirname(fileURLToPath(import.meta.url));

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    req.admin = decoded;
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => { const d = join(__dirname, '../../uploads'); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); cb(null, d); },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const upload = multer({ storage });

router.use(authenticateAdmin);

router.get('/students', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = "SELECT s.*, d.name as department_name, d.code as department_code FROM students s LEFT JOIN departments d ON s.department_id = d.id WHERE s.college_id = ?";
    const params = [req.admin.college_id];
    if (status) { sql += ' AND s.status = ?'; params.push(status); }
    sql += ' ORDER BY s.created_at DESC';
    res.json(await query(sql, params));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch students' }); }
});

router.post('/students/:id/approve', async (req, res) => {
  try {
    const s = await get('SELECT id FROM students WHERE id = ? AND college_id = ?', [req.params.id, req.admin.college_id]);
    if (!s) return res.status(404).json({ error: 'Student not found in this college' });
    await run("UPDATE students SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL WHERE id = ?", [req.admin.id, req.params.id]);
    res.json({ message: 'Approved' });
  } catch (err) { res.status(500).json({ error: 'Failed to approve' }); }
});

router.post('/students/:id/reject', async (req, res) => {
  try {
    const s = await get('SELECT id FROM students WHERE id = ? AND college_id = ?', [req.params.id, req.admin.college_id]);
    if (!s) return res.status(404).json({ error: 'Student not found in this college' });
    await run("UPDATE students SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE id = ?", [req.admin.id, req.body.reason || 'No reason provided', req.params.id]);
    res.json({ message: 'Rejected' });
  } catch (err) { res.status(500).json({ error: 'Failed to reject' }); }
});

router.get('/content', async (req, res) => {
  try {
    res.json(await query("SELECT c.*, d.name as department_name, d.code as department_code, a.name as admin_name FROM content c LEFT JOIN departments d ON c.department_id = d.id LEFT JOIN admins a ON c.uploaded_by = a.id WHERE c.college_id = ? ORDER BY c.created_at DESC", [req.admin.college_id]));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch content' }); }
});

router.post('/content', upload.single('file'), async (req, res) => {
  try {
    const { title, description, contentType, departmentId, subject, semester, yearTarget } = req.body;
    if (!title || !contentType) return res.status(400).json({ error: 'Title and type required' });
    const id = generateUUID();
    await run('INSERT INTO content (id, college_id, department_id, uploaded_by, title, description, content_type, file_url, file_size, file_name, subject, semester, year_target) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [id, req.admin.college_id, departmentId || null, req.admin.id, title, description || '', contentType, req.file ? '/uploads/' + req.file.filename : (req.body.fileUrl || ''), req.file?.size || 0, req.file?.originalname || '', subject || '', semester ? parseInt(semester) : null, yearTarget ? parseInt(yearTarget) : null]);
    res.status(201).json({ message: 'Content uploaded', contentId: id });
  } catch (err) { res.status(500).json({ error: 'Failed to upload content' }); }
});

router.delete('/content/:id', async (req, res) => {
  try {
    const item = await get('SELECT file_url FROM content WHERE id = ? AND college_id = ?', [req.params.id, req.admin.college_id]);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.file_url?.startsWith('/uploads/')) { const p = join(__dirname, '../../', item.file_url); if (fs.existsSync(p)) fs.unlinkSync(p); }
    await run('DELETE FROM content WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

router.get('/opportunities', async (req, res) => {
  try { res.json(await query('SELECT * FROM opportunities WHERE college_id = ? ORDER BY created_at DESC', [req.admin.college_id])); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch opportunities' }); }
});

router.post('/opportunities', async (req, res) => {
  try {
    const { title, company, description, type, location, salaryRange, eligibility, applyLink, deadline } = req.body;
    if (!title || !company) return res.status(400).json({ error: 'Title and company required' });
    const id = generateUUID();
    await run('INSERT INTO opportunities (id, college_id, posted_by, title, company, description, type, location, salary_range, eligibility, apply_link, deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [id, req.admin.college_id, req.admin.id, title, company, description || '', type || 'job', location || '', salaryRange || '', eligibility || '', applyLink || '', deadline || null]);
    res.status(201).json({ message: 'Opportunity posted', oppId: id });
  } catch (err) { res.status(500).json({ error: 'Failed to post' }); }
});

router.delete('/opportunities/:id', async (req, res) => {
  try {
    if (!(await get('SELECT id FROM opportunities WHERE id = ? AND college_id = ?', [req.params.id, req.admin.college_id]))) return res.status(404).json({ error: 'Not found' });
    await run('DELETE FROM opportunities WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

router.get('/notifications', async (req, res) => {
  try { res.json(await query("SELECT n.*, d.name as department_name, d.code as department_code FROM notifications n LEFT JOIN departments d ON n.target_dept_id = d.id WHERE n.college_id = ? ORDER BY n.sent_at DESC", [req.admin.college_id])); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

router.post('/notifications', async (req, res) => {
  try {
    const { title, body, type, targetAll, targetYear, targetDeptId } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    await run('INSERT INTO notifications (id, college_id, sent_by, title, body, type, target_all, target_year, target_dept_id) VALUES (?,?,?,?,?,?,?,?,?)', [generateUUID(), req.admin.college_id, req.admin.id, title, body, type || 'general', targetAll ? 1 : 0, targetYear ? parseInt(targetYear) : null, targetDeptId || null]);
    res.status(201).json({ message: 'Notification sent' });
  } catch (err) { res.status(500).json({ error: 'Failed to send notification' }); }
});

router.get('/analytics', async (req, res) => {
  try {
    const cid = req.admin.college_id;
    const total = (await get('SELECT COUNT(*) as c FROM students WHERE college_id = ?', [cid])).c;
    const pending = (await get("SELECT COUNT(*) as c FROM students WHERE college_id = ? AND status = 'pending'", [cid])).c;
    const approved = (await get("SELECT COUNT(*) as c FROM students WHERE college_id = ? AND status = 'approved'", [cid])).c;
    const content = (await get('SELECT COUNT(*) as c FROM content WHERE college_id = ?', [cid])).c;
    const opps = (await get('SELECT COUNT(*) as c FROM opportunities WHERE college_id = ? AND is_active = 1', [cid])).c;
    const deptBreakdown = await query("SELECT d.name as department_name, d.code as department_code, COUNT(s.id) as student_count FROM departments d LEFT JOIN students s ON d.id = s.department_id AND s.status = 'approved' WHERE d.college_id = ? GROUP BY d.id", [cid]);
    res.json({ totalStudents: total, pendingStudents: pending, approvedStudents: approved, totalContent: content, totalOpps: opps, deptBreakdown });
  } catch (err) { res.status(500).json({ error: 'Failed to compile analytics' }); }
});

export default router;
```

---

## FILE: `backend/src/routes/student.js`

```javascript
import express from 'express';
import jwt from 'jsonwebtoken';
import { query, get } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'myvault_jwt_secret_key_12345';

const authenticateStudent = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.role !== 'student') return res.status(403).json({ error: 'Student only' });
    const s = await get('SELECT id, status, department_id, year_of_study FROM students WHERE id = ?', [decoded.id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    if (s.status !== 'approved') return res.status(403).json({ error: 'approval_required', message: 'Not approved yet.' });
    req.student = { id: s.id, college_id: decoded.college_id, department_id: s.department_id, year_of_study: s.year_of_study };
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
};

router.use(authenticateStudent);

router.get('/profile', async (req, res) => {
  try {
    const s = await get("SELECT s.*, c.name as college_name, d.name as department_name, d.code as department_code FROM students s JOIN colleges c ON s.college_id = c.id LEFT JOIN departments d ON s.department_id = d.id WHERE s.id = ?", [req.student.id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.get('/content', async (req, res) => {
  try {
    let sql = "SELECT c.*, d.name as department_name, d.code as department_code, a.name as admin_name FROM content c LEFT JOIN departments d ON c.department_id = d.id LEFT JOIN admins a ON c.uploaded_by = a.id WHERE c.college_id = ? AND c.is_published = 1";
    const params = [req.student.college_id];
    if (req.query.contentType) { sql += ' AND c.content_type = ?'; params.push(req.query.contentType); }
    if (req.query.semester) { sql += ' AND c.semester = ?'; params.push(parseInt(req.query.semester)); }
    if (req.query.search) { sql += ' AND (c.title LIKE ? OR c.description LIKE ?)'; const w = '%' + req.query.search + '%'; params.push(w, w); }
    sql += ' ORDER BY c.created_at DESC';
    res.json(await query(sql, params));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch content' }); }
});

router.get('/opportunities', async (req, res) => {
  try {
    let sql = 'SELECT * FROM opportunities WHERE college_id = ? AND is_active = 1';
    const params = [req.student.college_id];
    if (req.query.type) { sql += ' AND type = ?'; params.push(req.query.type); }
    if (req.query.search) { sql += ' AND (title LIKE ? OR company LIKE ?)'; const w = '%' + req.query.search + '%'; params.push(w, w); }
    sql += ' ORDER BY created_at DESC';
    res.json(await query(sql, params));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch opportunities' }); }
});

router.get('/notifications', async (req, res) => {
  try {
    res.json(await query("SELECT * FROM notifications WHERE college_id = ? AND (target_all = 1 OR target_year = ? OR target_dept_id = ?) ORDER BY sent_at DESC", [req.student.college_id, req.student.year_of_study, req.student.department_id]));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

export default router;
```

---

## FILE: `frontend/package.json`

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^1.21.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.2",
    "vite": "^8.1.0"
  }
}
```

---

## FILE: `frontend/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
```

---

## FILE: `frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MyVault College Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## FILE: `frontend/src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## FILE: `frontend/src/App.jsx`

```jsx
import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import AdminPortal from './components/AdminPortal';
import { Building } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  return (
    <div className="app-root">
      <header className="navbar">
        <div className="logo" onClick={() => setCurrentView('landing')}>
          <div className="logo-symbol">MV</div>
          My<span>Vault</span>
        </div>
        <nav>
          <ul className="nav-menu">
            <li>
              <button className={`sidebar-tab ${currentView === 'landing' ? 'active' : ''}`}
                style={{padding:'0.4rem 0.8rem',display:'flex',alignItems:'center',gap:'0.35rem'}}
                onClick={() => setCurrentView('landing')}>Home</button>
            </li>
            <li>
              <button className={`sidebar-tab ${currentView === 'admin-portal' ? 'active' : ''}`}
                style={{padding:'0.4rem 0.8rem',display:'flex',alignItems:'center',gap:'0.35rem'}}
                onClick={() => setCurrentView('admin-portal')}>Admin Console</button>
            </li>
          </ul>
        </nav>
        <div className="nav-actions">
          <button className="btn btn-primary" onClick={() => setCurrentView('admin-portal')}>
            <Building size={14} /> Admin Portal
          </button>
        </div>
      </header>
      <main className="view-container">
        {currentView === 'landing' && <LandingPage onNavigate={setCurrentView} />}
        {currentView === 'admin-portal' && <AdminPortal />}
      </main>
    </div>
  );
}
```

---

## FILE: `frontend/src/index.css`

```css
:root {
  --bg-primary: #0a0e17;
  --bg-secondary: #0f172a;
  --bg-tertiary: #121824;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --brand-accent: #60a5fa;
  --success: #22c55e;
  --warning: #facc15;
  --error: #ef4444;
  --border-color: rgba(255,255,255,0.06);
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Inter', 'SF Pro Display', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans); background: var(--bg-primary); color: var(--text-primary); line-height: 1.5; min-height: 100vh; }
.app-root { display: flex; flex-direction: column; min-height: 100vh; }
.navbar { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 2rem; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 100; }
.logo { display: flex; align-items: center; gap: 0.6rem; font-size: 1.2rem; font-weight: 700; cursor: pointer; }
.logo span { color: var(--brand-accent); }
.logo-symbol { width: 32px; height: 32px; background: var(--brand-accent); border-radius: var(--border-radius-md); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #000; }
.nav-menu { display: flex; list-style: none; gap: 0.5rem; align-items: center; }
.nav-actions { display: flex; gap: 0.5rem; }
.view-container { flex: 1; display: flex; flex-direction: column; }
.portal-splitter { display: flex; flex: 1; min-height: calc(100vh - 56px); }
.admin-sidebar { width: 220px; background: var(--bg-secondary); border-right: 1px solid var(--border-color); padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; flex-shrink: 0; }
.admin-sidebar-menu { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
.sidebar-tab { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; border-radius: var(--border-radius-md); border: none; background: transparent; color: var(--text-secondary); font-size: 0.82rem; font-weight: 500; cursor: pointer; width: 100%; text-align: left; transition: all 0.15s; }
.sidebar-tab:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
.sidebar-tab.active { background: rgba(96,165,250,0.1); color: var(--brand-accent); font-weight: 600; }
.admin-main-container { flex: 1; overflow-y: auto; padding: 1.5rem; }
.admin-content-pane { max-width: 900px; margin: 0 auto; }
.auth-wrapper { max-width: 420px; margin: auto; padding: 2rem 1rem; width: 100%; }
.auth-header { text-align: center; margin-bottom: 2rem; }
.auth-header h2 { font-size: 1.5rem; font-weight: 700; font-family: var(--font-display); }
.auth-header p { color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem; }
.form-group { margin-bottom: 0.75rem; }
.form-label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.03em; }
.form-input, .form-select { width: 100%; padding: 0.6rem 0.8rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); color: var(--text-primary); font-size: 0.85rem; outline: none; }
.form-input:focus, .form-select:focus { border-color: var(--brand-accent); }
.form-select { appearance: none; cursor: pointer; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.55rem 1.2rem; border-radius: var(--border-radius-md); font-size: 0.85rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap; }
.btn-primary { background: var(--brand-accent); color: #000; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-color); }
.btn-success { background: var(--success); color: #000; }
.btn-danger { background: transparent; color: var(--error); border: 1px solid var(--error); }
.btn-danger:hover { background: rgba(239,68,68,0.1); }
.alert-box { padding: 0.7rem 1rem; border-radius: var(--border-radius-md); font-size: 0.82rem; margin-bottom: 1rem; }
.alert-success { background: rgba(34,197,94,0.1); color: var(--success); border: 1px solid rgba(34,197,94,0.2); }
.alert-error { background: rgba(239,68,68,0.1); color: var(--error); border: 1px solid rgba(239,68,68,0.2); }
.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.dashboard-stat-card { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
.stat-icon { width: 44px; height: 44px; border-radius: var(--border-radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-info h3 { font-size: 1.5rem; font-weight: 700; font-family: var(--font-display); }
.stat-info p { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem; }
.panel-card { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 1.25rem; margin-bottom: 1.5rem; }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.panel-header h3 { font-size: 1.05rem; font-weight: 600; }
.badge { display: inline-block; font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-weight: 600; }
.badge-pending { background: rgba(250,204,21,0.15); color: var(--warning); }
.badge-approved { background: rgba(34,197,94,0.15); color: var(--success); }
.badge-rejected { background: rgba(239,68,68,0.15); color: var(--error); }
.request-list { display: flex; flex-direction: column; gap: 0.75rem; }
.request-card { background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.request-student-info h4 { font-size: 0.95rem; font-weight: 600; }
.request-student-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; align-items: center; }
.request-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
.content-item-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.content-item-card { background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 1rem; }
.content-item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
.content-icon { width: 36px; height: 36px; border-radius: var(--border-radius-md); display: flex; align-items: center; justify-content: center; }
.content-title { font-size: 0.9rem; font-weight: 600; }
.content-desc { font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.25rem; }
.content-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.72rem; color: var(--text-muted); }
.tag-pill { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; }

/* Landing Page */
.landing-root { flex: 1; }
.hero { padding: 5rem 0; text-align: center; background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%); }
.container { max-width: 960px; margin: 0 auto; padding: 0 1.5rem; }
.hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(96,165,250,0.1); color: var(--brand-accent); padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; margin-bottom: 1.5rem; }
.hero-title { font-size: 2.8rem; font-weight: 800; font-family: var(--font-display); line-height: 1.2; margin-bottom: 1rem; }
.hero-title span { color: var(--brand-accent); }
.hero-desc { font-size: 1rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto 2rem; line-height: 1.6; }
.hero-cta { display: flex; justify-content: center; gap: 1rem; }
.features-section { padding: 4rem 0; background: var(--bg-secondary); }
.section-header { text-align: center; margin-bottom: 3rem; }
.section-tag { display: inline-block; font-size: 0.75rem; font-weight: 600; color: var(--brand-accent); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
.section-title { font-size: 1.8rem; font-weight: 700; font-family: var(--font-display); }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
.feature-card { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 1.5rem; }
.feature-icon-wrapper { width: 40px; height: 40px; border-radius: var(--border-radius-md); background: rgba(96,165,250,0.1); color: var(--brand-accent); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
.feature-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
.feature-card p { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; }
.workflow-section { padding: 4rem 0; }
.steps-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
.step-card { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 1.5rem; text-align: center; }
.step-badge { width: 36px; height: 36px; border-radius: 50%; background: var(--brand-accent); color: #000; font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; }
.step-card h4 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.5rem; }
.step-card p { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; }
```

---

## FILE: `frontend/src/components/LandingPage.jsx`

```jsx
import React from 'react';
import { Sparkles, FileText, BookOpen, CirclePlay, Briefcase, Bell, ShieldCheck, Smartphone, Building } from 'lucide-react';

export default function LandingPage({ onNavigate }) {
  return (
    <div className="landing-root">
      <section className="hero">
        <div className="container">
          <div className="hero-badge"><Sparkles size={14} /> MyVault College Management System</div>
          <h1 className="hero-title">Centralized Academic & Career<br/><span>Portal for College Administrators</span></h1>
          <p className="hero-desc">Verify student registrations, upload lecture resources, publish campus placements, and broadcast notification alerts directly to students' mobile devices from a single web-based admin desk.</p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => onNavigate('admin-portal')}><Building size={18} /> Open Admin Console</button>
          </div>
        </div>
      </section>

      <section style={{padding:'2rem 0',background:'var(--bg-secondary)',borderTop:'1px solid var(--border-color)',borderBottom:'1px solid var(--border-color)'}}>
        <div className="container" style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'2rem',textAlign:'center'}}>
          <div><h3 style={{fontSize:'2.5rem',fontWeight:700,color:'var(--brand-accent)'}}>Real-Time</h3><p style={{color:'var(--text-secondary)'}}>Push Notifications to Mobile</p></div>
          <div><h3 style={{fontSize:'2.5rem',fontWeight:700,color:'var(--brand-accent)'}}>100%</h3><p style={{color:'var(--text-secondary)'}}>Verified Student Accounts</p></div>
          <div><h3 style={{fontSize:'2.5rem',fontWeight:700,color:'var(--brand-accent)'}}>Academic Hub</h3><p style={{color:'var(--text-secondary)'}}>Centralized Resource Directory</p></div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="section-header"><span className="section-tag">Value Proposition</span><h2 className="section-title">Everything managed in one web portal</h2></div>
          <div className="features-grid">
            {[
              {icon:FileText, title:'Lecture Notes & PDFs', desc:'Publish study materials, previous question papers, and slides directly to target departments and semesters.'},
              {icon:BookOpen, title:'Syllabus & e-Books', desc:'Maintain up-to-date curricula and link reference textbooks for student access.'},
              {icon:CirclePlay, title:'Video Library Links', desc:'Provide direct links to recorded lectures, lab videos, or external reference classes.'},
              {icon:Briefcase, title:'Career Placements', desc:'Create job and internship postings, establish eligibility requirements, and collect student applications.'},
              {icon:Bell, title:'Announcements', desc:'Send urgent notification broadcasts directly to student phones based on department and year of study.'},
              {icon:ShieldCheck, title:'Registration Approvals', desc:'Enforce strict security. Only approved student registrations can log into the student mobile application.'}
            ].map((f,i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon-wrapper"><f.icon size={22} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="workflow-section">
        <div className="container">
          <div className="section-header"><span className="section-tag">Approval Flow</span><h2 className="section-title">Enforcing Verified Registrations</h2></div>
          <div className="steps-container">
            {[
              {step:'1', title:'Student Registers', desc:'Student requests access in the mobile app, providing roll numbers and department details.'},
              {step:'2', title:'Pending Queue', desc:"The student's mobile login is blocked. The request immediately surfaces in the Admin Console."},
              {step:'3', title:'Admin Reviews', desc:'College administrators verify and either approve or reject the student request.'},
              {step:'4', title:'Mobile Access Unlocked', desc:'Once approved, the student gains full access to all academic hubs and career listings.'}
            ].map((s,i) => (
              <div className="step-card" key={i}>
                <div className="step-badge">{s.step}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:'4rem 0'}}>
        <div className="container">
          <div className="section-header"><span className="section-tag">System Integrations</span><h2 className="section-title">Unified Database. Separate Portals.</h2></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2rem'}}>
            <div className="panel-card" style={{margin:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1rem'}}>
                <Smartphone size={32} style={{color:'var(--brand-accent)'}} />
                <div><h3 style={{fontSize:'1.25rem'}}>Student Mobile App</h3><p style={{color:'var(--text-secondary)',fontSize:'0.8rem'}}>React Native (iOS & Android)</p></div>
              </div>
              <p style={{color:'var(--text-secondary)',fontSize:'0.9rem',lineHeight:1.6}}>Students log into their dedicated mobile app which calls the central API backend. They can access verified files, browse placement notices, and receive push notifications published by the admin portal.</p>
            </div>
            <div className="panel-card" style={{margin:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1rem'}}>
                <Building size={32} style={{color:'var(--brand-accent)'}} />
                <div><h3 style={{fontSize:'1.25rem'}}>College Admin Console</h3><p style={{color:'var(--text-secondary)',fontSize:'0.8rem'}}>React Web Dashboard</p></div>
              </div>
              <p style={{color:'var(--text-secondary)',fontSize:'0.9rem',lineHeight:1.6}}>Manage college operations. Review student registrations, upload notes/PDFs/PPTs, list placement drives, and broadcast alerts that sync instantly to students' mobile devices.</p>
              <button className="btn btn-primary" style={{width:'100%',marginTop:'1rem'}} onClick={() => onNavigate('admin-portal')}>Enter Admin Portal</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
```

---

## FILE: `frontend/src/components/AdminPortal.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, BookOpen, Briefcase, Bell, LogOut,
  Upload, Plus, Trash2, Check, X, Building, FileText, AlertCircle
} from 'lucide-react';

const API_URL = 'http://localhost:5050/api';

export default function AdminPortal() {
  const [token, setToken] = useState(localStorage.getItem('myvault_admin_token') || '');
  const [adminUser, setAdminUser] = useState(JSON.parse(localStorage.getItem('myvault_admin_user') || 'null'));
  const [colleges, setColleges] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [collegeMode, setCollegeMode] = useState('existing');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeCode, setNewCollegeCode] = useState('');
  const [newCollegeWebsite, setNewCollegeWebsite] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [contentList, setContentList] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState('notes');
  const [uploadDeptId, setUploadDeptId] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadSemester, setUploadSemester] = useState('1');
  const [uploadYear, setUploadYear] = useState('1');
  const [uploadFile, setUploadFile] = useState(null);
  const [oppTitle, setOppTitle] = useState('');
  const [oppCompany, setOppCompany] = useState('');
  const [oppDesc, setOppDesc] = useState('');
  const [oppType, setOppType] = useState('job');
  const [oppLocation, setOppLocation] = useState('');
  const [oppSalary, setOppSalary] = useState('');
  const [oppEligibility, setOppEligibility] = useState('');
  const [oppLink, setOppLink] = useState('');
  const [oppDeadline, setOppDeadline] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [noteTargetAll, setNoteTargetAll] = useState(true);
  const [noteTargetYear, setNoteTargetYear] = useState('1');
  const [noteTargetDept, setNoteTargetDept] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { fetchColleges(); }, []);
  useEffect(() => {
    if (token) { fetchAnalytics(); fetchStudents(); fetchContent(); fetchOpportunities(); fetchNotifications(); fetchDepartments(); }
  }, [token, activeTab]);

  const fetchColleges = async () => {
    try { const r = await fetch(`${API_URL}/auth/colleges`); const d = await r.json(); if (r.ok) { setColleges(d); if (d.length) setSelectedCollegeId(d[0].id); } } catch (e) { console.error(e); }
  };
  const fetchDepartments = async () => {
    if (!adminUser) return;
    try { const r = await fetch(`${API_URL}/auth/colleges/${adminUser.college_id}/departments`); const d = await r.json(); if (r.ok) { setDepartments(d); if (d.length) { setUploadDeptId(d[0].id); setNoteTargetDept(d[0].id); } } } catch (e) { console.error(e); }
  };
  const fetchAnalytics = async () => { try { const r = await fetch(`${API_URL}/admin/analytics`, {headers:{Authorization:'Bearer '+token}}); const d = await r.json(); if (r.ok) setAnalytics(d); } catch(e) { console.error(e); } };
  const fetchStudents = async () => { try { const r = await fetch(`${API_URL}/admin/students`, {headers:{Authorization:'Bearer '+token}}); const d = await r.json(); if (r.ok) setStudents(d); } catch(e) { console.error(e); } };
  const fetchContent = async () => { try { const r = await fetch(`${API_URL}/admin/content`, {headers:{Authorization:'Bearer '+token}}); const d = await r.json(); if (r.ok) setContentList(d); } catch(e) { console.error(e); } };
  const fetchOpportunities = async () => { try { const r = await fetch(`${API_URL}/admin/opportunities`, {headers:{Authorization:'Bearer '+token}}); const d = await r.json(); if (r.ok) setOpportunities(d); } catch(e) { console.error(e); } };
  const fetchNotifications = async () => { try { const r = await fetch(`${API_URL}/admin/notifications`, {headers:{Authorization:'Bearer '+token}}); const d = await r.json(); if (r.ok) setNotifications(d); } catch(e) { console.error(e); } };

  const handleAuthSubmit = async (e) => {
    e.preventDefault(); setErrorMsg(''); setSuccessMsg('');
    const endpoint = isLogin ? '/auth/admin/login' : '/auth/admin/register';
    const payload = isLogin ? { email, password } : { collegeMode, collegeId: selectedCollegeId, collegeName: newCollegeName, collegeCode: newCollegeCode, collegeWebsite: newCollegeWebsite, name, email, password };
    try {
      const r = await fetch(`${API_URL}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      const d = await r.json();
      if (r.ok) { setToken(d.token); setAdminUser(d.admin); localStorage.setItem('myvault_admin_token', d.token); localStorage.setItem('myvault_admin_user', JSON.stringify(d.admin)); setSuccessMsg('Logged in!'); fetchColleges(); }
      else setErrorMsg(d.error || 'Authentication failed');
    } catch { setErrorMsg('Server connection failed. Make sure backend is running.'); }
  };

  const handleLogout = () => { setToken(''); setAdminUser(null); localStorage.removeItem('myvault_admin_token'); localStorage.removeItem('myvault_admin_user'); };
  const handleApproveStudent = async (id) => {
    setErrorMsg(''); setSuccessMsg('');
    try { const r = await fetch(`${API_URL}/admin/students/${id}/approve`, { method:'POST', headers:{Authorization:'Bearer '+token} }); if (r.ok) { setSuccessMsg('Approved.'); fetchStudents(); fetchAnalytics(); } else setErrorMsg((await r.json()).error); } catch { setErrorMsg('Failed.'); }
  };
  const handleRejectStudent = async (id) => {
    setErrorMsg(''); setSuccessMsg('');
    const reason = prompt('Rejection reason:'); if (reason === null) return;
    try { const r = await fetch(`${API_URL}/admin/students/${id}/reject`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}, body:JSON.stringify({reason}) }); if (r.ok) { setSuccessMsg('Rejected.'); fetchStudents(); fetchAnalytics(); } else setErrorMsg((await r.json()).error); } catch { setErrorMsg('Failed.'); }
  };

  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-header">
          <Building size={40} style={{color:'var(--brand-accent)',marginBottom:'1rem'}} />
          <h2>MyVault Admin</h2>
          <p>{isLogin ? 'Sign in to manage your campus' : 'Register your college on the platform'}</p>
        </div>
        {errorMsg && <div className="alert-box alert-error"><AlertCircle size={16} style={{marginRight:'0.5rem',verticalAlign:'middle'}} />{errorMsg}</div>}
        <form onSubmit={handleAuthSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">College Management</label>
                <div style={{display:'flex',gap:'1rem',marginBottom:'1rem'}}>
                  <label style={{display:'flex',alignItems:'center',gap:'0.25rem',fontSize:'0.85rem'}}><input type="radio" name="collegeMode" checked={collegeMode==='existing'} onChange={()=>setCollegeMode('existing')} /> Existing College</label>
                  <label style={{display:'flex',alignItems:'center',gap:'0.25rem',fontSize:'0.85rem'}}><input type="radio" name="collegeMode" checked={collegeMode==='create'} onChange={()=>setCollegeMode('create')} /> Register New College</label>
                </div>
              </div>
              {collegeMode === 'existing' ? (
                <div className="form-group">
                  <label className="form-label">Select College</label>
                  <select className="form-select" value={selectedCollegeId} onChange={e=>setSelectedCollegeId(e.target.value)}>
                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name}{c.district ? ` — ${c.district}` : ''}{c.college_type ? ` (${c.college_type})` : ''}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{padding:'1rem',border:'1px solid var(--border-color)',borderRadius:'8px',marginBottom:'1rem',background:'var(--bg-tertiary)'}}>
                  <div className="form-group"><label className="form-label">New College Name</label><input type="text" className="form-input" placeholder="e.g. Stanford University" value={newCollegeName} onChange={e=>setNewCollegeName(e.target.value)} /></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                    <div className="form-group"><label className="form-label">College Code</label><input type="text" className="form-input" placeholder="e.g. SU" value={newCollegeCode} onChange={e=>setNewCollegeCode(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Website</label><input type="text" className="form-input" placeholder="e.g. stanford.edu" value={newCollegeWebsite} onChange={e=>setNewCollegeWebsite(e.target.value)} /></div>
                  </div>
                </div>
              )}
              <div className="form-group"><label className="form-label">Your Full Name</label><input type="text" className="form-input" placeholder="Dean / Admin Name" value={name} onChange={e=>setName(e.target.value)} /></div>
            </>
          )}
          <div className="form-group"><label className="form-label">Email Address</label><input type="email" className="form-input" placeholder="admin@college.edu" value={email} onChange={e=>setEmail(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Password</label><input type="password" className="form-input" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          <button className="btn btn-primary" style={{width:'100%',marginTop:'1rem'}}>{isLogin ? 'Sign In' : 'Register College & Account'}</button>
        </form>
        <div style={{textAlign:'center',marginTop:'1.5rem',fontSize:'0.85rem'}}>
          <span style={{color:'var(--text-secondary)'}}>{isLogin ? "Don't have an admin portal? " : "Already have an account? "}</span>
          <button onClick={()=>setIsLogin(!isLogin)} style={{background:'none',border:'none',color:'var(--brand-accent)',cursor:'pointer',fontWeight:600}}>{isLogin ? 'Register College' : 'Log In'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-splitter">
      <aside className="admin-sidebar">
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <div className="logo-symbol">MV</div>
          <div><h4 style={{fontSize:'1rem',fontWeight:700}}>MyVault</h4><p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Admin Workspace</p></div>
        </div>
        <div style={{padding:'0.85rem',background:'var(--bg-tertiary)',borderRadius:'8px',border:'1px solid var(--border-color)'}}>
          <p style={{fontSize:'0.75rem',color:'var(--text-secondary)',fontWeight:600}}>Active College:</p>
          <h5 style={{fontSize:'0.85rem',color:'var(--brand-accent)',marginTop:'0.2rem'}}>{adminUser?.college_name || adminUser?.email?.split('@')[1]?.toUpperCase() || 'Campus Admin'}</h5>
        </div>
        <nav className="admin-sidebar-menu">
          {[
            {id:'dashboard', icon:LayoutDashboard, label:'Dashboard Overview'},
            {id:'approvals', icon:Users, label:'Student Registrations', badge: students.filter(s=>s.status==='pending').length},
            {id:'academic', icon:BookOpen, label:'Academic Hub'},
            {id:'career', icon:Briefcase, label:'Placement Desk'},
            {id:'notifications', icon:Bell, label:'Notification Broadcasts'}
          ].map(t => (
            <button key={t.id} className={`sidebar-tab ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)}>
              <t.icon size={18} /> {t.label}
              {t.badge > 0 && <span style={{marginLeft:'auto',background:'var(--warning)',color:'black',fontSize:'0.7rem',fontWeight:700,padding:'2px 6px',borderRadius:'10px'}}>{t.badge}</span>}
            </button>
          ))}
        </nav>
        <button className="btn btn-secondary" style={{marginTop:'auto'}} onClick={handleLogout}><LogOut size={16} /> Sign Out</button>
      </aside>

      <main className="admin-main-container">
        <div className="admin-content-pane">
          {successMsg && <div className="alert-box alert-success" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>{successMsg}</span><X size={14} style={{cursor:'pointer'}} onClick={()=>setSuccessMsg('')} /></div>}
          {errorMsg && <div className="alert-box alert-error" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>{errorMsg}</span><X size={14} style={{cursor:'pointer'}} onClick={()=>setErrorMsg('')} /></div>}

          {activeTab === 'dashboard' && (
            <div>
              <div style={{marginBottom:'2rem'}}><h2 style={{fontSize:'1.75rem',fontWeight:700}}>Welcome back, {adminUser?.name || 'Administrator'}</h2><p style={{color:'var(--text-secondary)',fontSize:'0.9rem'}}>Real-time statistics of your college catalog and verification systems.</p></div>
              <div className="dashboard-grid">
                {[
                  {label:'Total Registered', value:analytics?.totalStudents || 0, color:'var(--brand-accent)', icon:Users},
                  {label:'Pending Approvals', value:analytics?.pendingStudents || 0, color:'var(--warning)', icon:Users},
                  {label:'Academic Resources', value:analytics?.totalContent || 0, color:'var(--success)', icon:BookOpen},
                  {label:'Active Job Drives', value:analytics?.totalOpps || 0, color:'#c084fc', icon:Briefcase}
                ].map((s,i) => (
                  <div className="dashboard-stat-card" key={i}>
                    <div className="stat-icon" style={{background:`rgba(59,130,246,0.1)`,color:s.color}}><s.icon size={24} /></div>
                    <div className="stat-info"><h3>{s.value}</h3><p>{s.label}</p></div>
                  </div>
                ))}
              </div>
              <div className="panel-card">
                <div className="panel-header"><h3>Department Breakdown</h3></div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))',gap:'1rem'}}>
                  {analytics?.deptBreakdown?.map(d => (
                    <div key={d.department_code} style={{padding:'1rem',border:'1px solid var(--border-color)',borderRadius:'8px',background:'var(--bg-tertiary)'}}>
                      <span style={{fontSize:'0.72rem',color:'var(--brand-accent)',fontWeight:600}}>{d.department_code}</span>
                      <h4 style={{fontSize:'1rem',fontWeight:600,margin:'0.2rem 0'}}>{d.department_name}</h4>
                      <p style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>{d.student_count} verified students</p>
                    </div>
                  ))}
                  {(!analytics?.deptBreakdown?.length) && <p style={{color:'var(--text-muted)',textAlign:'center'}}>No departments found.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="panel-card">
              <div className="panel-header"><h3>Student Registration Approvals</h3><div className="badge badge-pending">Pending: {students.filter(s=>s.status==='pending').length}</div></div>
              <div className="request-list">
                <h4 style={{fontSize:'0.9rem',color:'var(--text-secondary)',marginBottom:'0.5rem'}}>Awaiting Action</h4>
                {students.filter(s=>s.status==='pending').map(s => (
                  <div className="request-card" key={s.id}>
                    <div><h4>{s.name}</h4><div className="request-student-meta"><span>{s.email}</span><span>·</span><span>{s.roll_number || 'No Roll #'}</span><span>·</span><span>{s.department_name} (Year {s.year_of_study})</span></div></div>
                    <div className="request-actions">
                      <button className="btn btn-success" onClick={()=>handleApproveStudent(s.id)}><Check size={14} /> Approve</button>
                      <button className="btn btn-danger" onClick={()=>handleRejectStudent(s.id)}><X size={14} /> Reject</button>
                    </div>
                  </div>
                ))}
                {!students.filter(s=>s.status==='pending').length && <p style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}>All registrations processed.</p>}
                <h4 style={{fontSize:'0.9rem',color:'var(--text-secondary)',marginTop:'2rem',marginBottom:'0.5rem'}}>Processed Log</h4>
                {students.filter(s=>s.status!=='pending').map(s => (
                  <div className="request-card" key={s.id} style={{opacity:0.75}}>
                    <div><h4>{s.name}</h4><div className="request-student-meta"><span>{s.email}</span><span>·</span><span>{s.department_code} (Yr {s.year_of_study})</span><span>·</span><span className={`badge badge-${s.status}`}>{s.status}</span>{s.status==='rejected' && <span style={{color:'var(--error)'}}>Reason: {s.rejection_reason}</span>}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <>
              <div className="panel-card">
                <div className="panel-header"><h3>Upload Study Resources</h3></div>
                <form onSubmit={async e => { e.preventDefault(); setErrorMsg(''); setSuccessMsg(''); if(!uploadTitle) return setErrorMsg('Title required'); const fd = new FormData(); fd.append('title',uploadTitle); fd.append('description',uploadDesc); fd.append('contentType',uploadType); fd.append('departmentId',uploadDeptId); fd.append('subject',uploadSubject); fd.append('semester',uploadSemester); fd.append('yearTarget',uploadYear); if(uploadFile) fd.append('file',uploadFile); try { const r = await fetch(`${API_URL}/admin/content`, {method:'POST',headers:{Authorization:'Bearer '+token},body:fd}); if(r.ok) { setSuccessMsg('Uploaded!'); setUploadTitle(''); setUploadDesc(''); setUploadSubject(''); setUploadFile(null); fetchContent(); fetchAnalytics(); } else setErrorMsg((await r.json()).error); } catch { setErrorMsg('Failed.'); } }} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'}}>
                  <div style={{gridColumn:'1 / -1'}} className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" placeholder="e.g. DBMS Lecture Notes" value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} /></div>
                  <div style={{gridColumn:'1 / -1'}} className="form-group"><label className="form-label">Description</label><textarea className="form-input" style={{height:'70px',resize:'none'}} value={uploadDesc} onChange={e=>setUploadDesc(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={uploadType} onChange={e=>setUploadType(e.target.value)}>{['notes','pdf','ppt','video','lab_manual','syllabus','ebook','question_paper','other'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={uploadDeptId} onChange={e=>setUploadDeptId(e.target.value)}>{departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Subject</label><input type="text" className="form-input" placeholder="e.g. CS-401" value={uploadSubject} onChange={e=>setUploadSubject(e.target.value)} /></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                    <div className="form-group"><label className="form-label">Semester</label><select className="form-select" value={uploadSemester} onChange={e=>setUploadSemester(e.target.value)}>{[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Year</label><select className="form-select" value={uploadYear} onChange={e=>setUploadYear(e.target.value)}>{[1,2,3,4,5].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
                  </div>
                  <div style={{gridColumn:'1 / -1'}} className="form-group"><label className="form-label">File</label><input type="file" onChange={e=>setUploadFile(e.target.files[0])} /></div>
                  <button className="btn btn-primary" style={{gridColumn:'1 / -1'}}><Upload size={16} /> Publish</button>
                </form>
              </div>
              <div className="panel-card">
                <div className="panel-header"><h3>Published Materials</h3></div>
                <div className="content-item-list">
                  {contentList.map(item => (
                    <div className="content-item-card" key={item.id}>
                      <div className="content-item-header"><div className="content-icon" style={{background:'rgba(37,99,235,0.1)',color:'var(--brand-accent)'}}><FileText size={20} /></div><button className="btn btn-danger" style={{padding:'4px',border:'none'}} onClick={async ()=>{if(!confirm('Delete?'))return; try { await fetch(`${API_URL}/admin/content/${item.id}`, {method:'DELETE',headers:{Authorization:'Bearer '+token}}); fetchContent(); } catch {}}}><Trash2 size={14} /></button></div>
                      <h4 className="content-title">{item.title}</h4><p className="content-desc">{item.description || ''}</p>
                      <div className="content-footer"><span>Sem {item.semester} · {item.department_code || 'All'}</span><span className="tag-pill" style={{background:'rgba(37,99,235,0.15)',color:'var(--brand-accent)'}}>{item.content_type?.toUpperCase()}</span></div>
                    </div>
                  ))}
                  {!contentList.length && <p style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)',gridColumn:'1 / -1'}}>No materials yet.</p>}
                </div>
              </div>
            </>
          )}

          {activeTab === 'career' && (
            <>
              <div className="panel-card">
                <div className="panel-header"><h3>Post Placement / Internship Drive</h3></div>
                <form onSubmit={async e => { e.preventDefault(); setErrorMsg(''); setSuccessMsg(''); if(!oppTitle||!oppCompany) return setErrorMsg('Title and company required'); try { const r = await fetch(`${API_URL}/admin/opportunities`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}, body:JSON.stringify({title:oppTitle,company:oppCompany,description:oppDesc,type:oppType,location:oppLocation,salaryRange:oppSalary,eligibility:oppEligibility,applyLink:oppLink,deadline:oppDeadline})}); if(r.ok) { setSuccessMsg('Posted!'); setOppTitle(''); setOppCompany(''); setOppDesc(''); setOppLocation(''); setOppSalary(''); setOppEligibility(''); setOppLink(''); setOppDeadline(''); fetchOpportunities(); fetchAnalytics(); } else setErrorMsg((await r.json()).error); } catch { setErrorMsg('Failed.'); } }} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'}}>
                  <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" placeholder="SDE" value={oppTitle} onChange={e=>setOppTitle(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Company</label><input type="text" className="form-input" placeholder="Google" value={oppCompany} onChange={e=>setOppCompany(e.target.value)} /></div>
                  <div style={{gridColumn:'1 / -1'}} className="form-group"><label className="form-label">Description</label><textarea className="form-input" style={{height:'70px',resize:'none'}} value={oppDesc} onChange={e=>setOppDesc(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={oppType} onChange={e=>setOppType(e.target.value)}>{['job','internship','placement','scholarship','competition'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Location</label><input type="text" className="form-input" placeholder="Bangalore" value={oppLocation} onChange={e=>setOppLocation(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Salary</label><input type="text" className="form-input" placeholder="12-15 LPA" value={oppSalary} onChange={e=>setOppSalary(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Eligibility</label><input type="text" className="form-input" placeholder="CGPA > 7.5" value={oppEligibility} onChange={e=>setOppEligibility(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Apply Link</label><input type="text" className="form-input" placeholder="https://..." value={oppLink} onChange={e=>setOppLink(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Deadline</label><input type="date" className="form-input" value={oppDeadline} onChange={e=>setOppDeadline(e.target.value)} /></div>
                  <button className="btn btn-primary" style={{gridColumn:'1 / -1'}}><Plus size={16} /> Publish</button>
                </form>
              </div>
              <div className="panel-card">
                <div className="panel-header"><h3>Active Opportunities</h3></div>
                {opportunities.map(opp => (
                  <div className="request-card" key={opp.id} style={{marginBottom:'0.75rem'}}>
                    <div><h4 style={{fontWeight:700}}>{opp.title} <span style={{color:'var(--brand-accent)',fontSize:'0.8rem'}}>@ {opp.company}</span></h4><div className="request-student-meta"><span className="badge badge-approved" style={{fontSize:'0.65rem'}}>{opp.type}</span><span>· Loc: {opp.location || 'N/A'}</span><span>· Eligibility: {opp.eligibility}</span><span>· <span style={{color:'var(--error)'}}>Deadline: {opp.deadline || 'Open'}</span></span></div></div>
                    <button className="btn btn-danger" style={{padding:'0.5rem'}} onClick={async ()=>{if(!confirm('Delete?'))return; try{await fetch(`${API_URL}/admin/opportunities/${opp.id}`,{method:'DELETE',headers:{Authorization:'Bearer '+token}}); fetchOpportunities();}catch{}}}><Trash2 size={16} /></button>
                  </div>
                ))}
                {!opportunities.length && <p style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}>No opportunities listed.</p>}
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <div className="panel-card">
                <div className="panel-header"><h3>Send Notification</h3></div>
                <form onSubmit={async e => { e.preventDefault(); if(!noteTitle||!noteBody) return setErrorMsg('Title and body required'); try{const r=await fetch(`${API_URL}/admin/notifications`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({title:noteTitle,body:noteBody,type:noteType,targetAll:noteTargetAll,targetYear:noteTargetYear,targetDeptId:noteTargetDept})});if(r.ok){setSuccessMsg('Sent!');setNoteTitle('');setNoteBody('');fetchNotifications();}else setErrorMsg((await r.json()).error);}catch{setErrorMsg('Failed.')}}}>
                  <div className="form-group"><label className="form-label">Title</label><input type="text" className="form-input" value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Body</label><textarea className="form-input" style={{height:'90px',resize:'none'}} value={noteBody} onChange={e=>setNoteBody(e.target.value)} /></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem',marginBottom:'1.5rem'}}>
                    <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={noteType} onChange={e=>setNoteType(e.target.value)}>{['general','content','opportunity','system','alert'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Audience</label><select className="form-select" value={noteTargetAll?'all':'custom'} onChange={e=>setNoteTargetAll(e.target.value==='all')}><option value="all">Entire College</option><option value="custom">Specific Dept/Year</option></select></div>
                    {!noteTargetAll && <div className="form-group"><label className="form-label">Year</label><select className="form-select" value={noteTargetYear} onChange={e=>setNoteTargetYear(e.target.value)}>{[1,2,3,4,5].map(y=><option key={y} value={y}>Year {y}</option>)}</select></div>}
                  </div>
                  <button className="btn btn-primary" style={{width:'100%'}}><Bell size={16} /> Send</button>
                </form>
              </div>
              <div className="panel-card">
                <div className="panel-header"><h3>Sent Notifications</h3></div>
                {notifications.map(n => (
                  <div key={n.id} style={{border:'1px solid var(--border-color)',borderRadius:'8px',padding:'1rem',marginBottom:'0.75rem',background:'var(--bg-tertiary)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.25rem'}}><h4 style={{fontWeight:700}}>{n.title}</h4><span style={{fontSize:'0.65rem',background:'rgba(255,255,255,0.05)',padding:'2px 6px',borderRadius:'4px',textTransform:'uppercase'}}>{n.type}</span></div>
                    <p style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>{n.body}</p>
                    <div style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:'0.5rem',display:'flex',gap:'1rem'}}><span>Target: {n.target_all ? 'All' : 'Year '+n.target_year}</span><span>·</span><span>{new Date(n.sent_at).toLocaleString()}</span></div>
                  </div>
                ))}
                {!notifications.length && <p style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}>No notifications sent.</p>}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
```

---

## FILE: `student-mobile/package.json`

```json
{
  "name": "myvault-mobile",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "axios": "^1.6.2",
    "expo": "~50.0.0",
    "expo-secure-store": "~12.8.1",
    "expo-status-bar": "~1.11.1",
    "lucide-react-native": "^0.294.0",
    "react": "18.2.0",
    "react-native": "0.73.4",
    "react-native-gesture-handler": "~2.14.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0"
  },
  "private": true
}
```

---

## FILE: `student-mobile/App.js`

```jsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import AcademicHubScreen from './screens/AcademicHubScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AcademicHub" component={AcademicHubScreen} options={{ title: 'Academic Directory' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## FILE: `student-mobile/screens/LoginScreen.js`

```jsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://YOUR_LOCAL_IP:5050/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Fill all fields'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/student/login`, { email, password });
      await SecureStore.setItemAsync('myvault_token', res.data.token);
      await SecureStore.setItemAsync('myvault_user', JSON.stringify(res.data.student));
      navigation.replace('Home');
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      const message = err.response?.data?.message;
      if (errorMsg === 'pending_approval') {
        Alert.alert('Pending', 'Your account is awaiting approval from your college administrator.');
      } else {
        Alert.alert('Login Failed', message || 'Invalid credentials');
      }
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.brandTitle}>My<Text style={styles.brandAccent}>Vault</Text></Text>
        <Text style={styles.subtitle}>Student Academic & Career Space</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="student@college.edu" placeholderTextColor="#64748b" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="password" placeholderTextColor="#64748b" secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none" />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerText}>New student? <Text style={styles.footerLink}>Register Here</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brandTitle: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center' },
  brandAccent: { color: '#60a5fa' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 40, marginTop: 4 },
  form: { backgroundColor: '#121824', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  label: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1b2336', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8, color: '#fff', paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  footerText: { textAlign: 'center', color: '#94a3b8', marginTop: 24, fontSize: 14 },
  footerLink: { color: '#60a5fa', fontWeight: 'bold' },
});
```

---

## FILE: `student-mobile/screens/RegisterScreen.js`

```jsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';

const API_URL = 'http://YOUR_LOCAL_IP:5050/api';

export default function RegisterScreen({ navigation }) {
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('1');
  const [password, setPassword] = useState('');

  useEffect(() => { fetchColleges(); }, []);
  useEffect(() => { if (selectedCollegeId) fetchDepartments(selectedCollegeId); }, [selectedCollegeId]);

  const fetchColleges = async () => {
    try { const res = await axios.get(`${API_URL}/auth/colleges`); setColleges(res.data); if (res.data.length) setSelectedCollegeId(res.data[0].id); } catch (err) { console.error(err); }
  };
  const fetchDepartments = async (collegeId) => {
    try { const res = await axios.get(`${API_URL}/auth/colleges/${collegeId}/departments`); setDepartments(res.data); if (res.data.length) setSelectedDeptId(res.data[0].id); } catch (err) { console.error(err); }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !selectedCollegeId) { Alert.alert('Error', 'Required fields missing.'); return; }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/student/register`, {
        collegeId: selectedCollegeId, departmentId: selectedDeptId || null,
        name, email, phone, rollNumber, yearOfStudy: parseInt(yearOfStudy), password
      });
      Alert.alert('Submitted', 'Awaiting approval from college admin.', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
    } catch (err) { Alert.alert('Error', err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollInner}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Awaiting approval before access is granted.</Text>
      <View style={styles.form}>
        <Text style={styles.label}>College *</Text>
        {colleges.map(c => (
          <TouchableOpacity key={c.id} style={[styles.pickerItem, selectedCollegeId===c.id && styles.pickerItemActive]} onPress={()=>setSelectedCollegeId(c.id)}>
            <Text style={styles.pickerText}>{c.name}{c.district ? `\n${c.district}` : ''}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.label}>Department *</Text>
        {departments.map(d => (
          <TouchableOpacity key={d.id} style={[styles.pickerItem, selectedDeptId===d.id && styles.pickerItemActive]} onPress={()=>setSelectedDeptId(d.id)}>
            <Text style={styles.pickerText}>{d.name} ({d.code})</Text>
          </TouchableOpacity>
        ))}
        {!departments.length && <Text style={{color:'#64748b',fontStyle:'italic',padding:8}}>Select college first.</Text>}
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="#64748b" value={name} onChangeText={setName} />
        <Text style={styles.label}>Roll Number</Text>
        <TextInput style={styles.input} placeholder="CSE-2026-42" placeholderTextColor="#64748b" value={rollNumber} onChangeText={setRollNumber} />
        <Text style={styles.label}>Year *</Text>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}>
          {['1','2','3','4','5'].map(y => (
            <TouchableOpacity key={y} style={[styles.chip, yearOfStudy===y && styles.chipActive]} onPress={()=>setYearOfStudy(y)}>
              <Text style={styles.chipText}>{y} Yr</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Email *</Text>
        <TextInput style={styles.input} placeholder="john@college.edu" placeholderTextColor="#64748b" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Password *</Text>
        <TextInput style={styles.input} placeholder="password" placeholderTextColor="#64748b" secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none" />
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={()=>navigation.navigate('Login')} style={{marginVertical:20}}>
        <Text style={styles.footerText}>Already have an account? <Text style={styles.footerLink}>Log In</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17' },
  scrollInner: { padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24, marginTop: 4 },
  form: { backgroundColor: '#121824', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  label: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#1b2336', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8, color: '#fff', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  pickerItem: { padding: 10, borderRadius: 6, marginBottom: 4 },
  pickerItemActive: { backgroundColor: '#2563eb' },
  pickerText: { color: '#fff', fontSize: 13 },
  chip: { flex: 1, alignItems: 'center', backgroundColor: '#1b2336', paddingVertical: 10, marginHorizontal: 2, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#60a5fa' },
  chipText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  footerText: { textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  footerLink: { color: '#60a5fa', fontWeight: 'bold' },
});
```

---

## FILE: `student-mobile/screens/HomeScreen.js`

```jsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BookOpen, Briefcase, Bell, LogOut } from 'lucide-react-native';

const API_URL = 'http://YOUR_LOCAL_IP:5050/api';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => { if (user) fetchNotifications(); }, [user]);

  const loadUser = async () => {
    try {
      const u = await SecureStore.getItemAsync('myvault_user');
      if (u) setUser(JSON.parse(u));
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const token = await SecureStore.getItemAsync('myvault_token');
      const res = await axios.get(`${API_URL}/student/notifications`, { headers: { Authorization: 'Bearer ' + token } });
      setNotifications(res.data);
    } catch {}
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('myvault_token');
    await SecureStore.deleteItemAsync('myvault_user');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.greeting}>Welcome,</Text><Text style={styles.name}>{user?.name || 'Student'}</Text></View>
        <TouchableOpacity onPress={handleLogout}><LogOut size={20} color="#94a3b8" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{padding:20}}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AcademicHub')}>
            <BookOpen size={32} color="#60a5fa" />
            <Text style={styles.cardTitle}>Academic Hub</Text>
            <Text style={styles.cardDesc}>Browse notes, PDFs, videos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card}>
            <Briefcase size={32} color="#22c55e" />
            <Text style={styles.cardTitle}>Career Board</Text>
            <Text style={styles.cardDesc}>Jobs & internships</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}><Bell size={16} color="#94a3b8" /> Announcements</Text>
        {notifications.map(n => (
          <View key={n.id} style={styles.notice}>
            <Text style={styles.noticeTitle}>{n.title}</Text>
            <Text style={styles.noticeBody}>{n.body}</Text>
            <Text style={styles.noticeDate}>{new Date(n.sent_at).toLocaleDateString()}</Text>
          </View>
        ))}
        {!notifications.length && <Text style={{color:'#64748b',textAlign:'center',padding:20}}>No announcements.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  greeting: { fontSize: 14, color: '#94a3b8' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: { flex: 1, backgroundColor: '#121824', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginTop: 10 },
  cardDesc: { fontSize: 12, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#f8fafc', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  notice: { backgroundColor: '#121824', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  noticeTitle: { fontSize: 14, fontWeight: '600', color: '#f8fafc' },
  noticeBody: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  noticeDate: { fontSize: 10, color: '#64748b', marginTop: 6 },
});
```

---

## FILE: `student-mobile/screens/AcademicHubScreen.js`

```jsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://YOUR_LOCAL_IP:5050/api';
const CATEGORIES = ['All', 'notes', 'pdf', 'ppt', 'video', 'lab_manual', 'syllabus', 'ebook', 'question_paper'];

export default function AcademicHubScreen() {
  const [content, setContent] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchContent(); }, [category, search]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('myvault_token');
      const params = {};
      if (category !== 'All') params.contentType = category;
      if (search.trim()) params.search = search.trim();
      const res = await axios.get(`${API_URL}/student/content`, { headers: { Authorization: 'Bearer ' + token }, params });
      setContent(res.data);
    } catch { setContent([]); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.search} placeholder="Search materials..." placeholderTextColor="#64748b" value={search} onChangeText={setSearch} />
      <FlatList horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}} data={CATEGORIES} renderItem={({item}) => (
        <TouchableOpacity style={[styles.chip, category===item && styles.chipActive]} onPress={()=>setCategory(item)}>
          <Text style={[styles.chipText, category===item && styles.chipTextActive]}>{item.replace('_',' ').toUpperCase()}</Text>
        </TouchableOpacity>
      )} keyExtractor={i=>i} />
      {loading ? <ActivityIndicator color="#60a5fa" style={{marginTop:40}} /> : (
        <FlatList data={content} renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description || ''}</Text>
            <View style={styles.footer}>
              <Text style={styles.meta}>{item.subject} · Sem {item.semester}</Text>
              <TouchableOpacity style={styles.downloadBtn} onPress={() => item.file_url && Linking.openURL(item.file_url)}>
                <Text style={styles.downloadText}>Get File</Text>
              </TouchableOpacity>
            </View>
          </View>
        )} keyExtractor={i=>i.id} ListEmptyComponent={<Text style={{textAlign:'center',color:'#64748b',padding:40}}>No materials found.</Text>} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17', padding: 16 },
  search: { backgroundColor: '#1b2336', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1b2336', marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#121824', borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  title: { fontSize: 15, fontWeight: '600', color: '#f8fafc' },
  desc: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  meta: { fontSize: 11, color: '#64748b' },
  downloadBtn: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  downloadText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
```

---

## HOW TO SETUP

### Backend
```bash
cd backend
npm install
npm start
# Runs on http://localhost:5050
```

### Admin Website
```bash
cd frontend
npm install
npx vite
# Opens at http://localhost:5173
```

### Student Mobile App
```bash
cd student-mobile
npm install
npx expo start
# Scan QR with Expo Go app
```

### Test Credentials (pre-seeded)
| Email | Password | Role |
|-------|----------|------|
| admin@stanford.edu | password123 | Admin (Stanford) |
| student@stanford.edu | password123 | Student (Pending) |
| bob@stanford.edu | password123 | Student (Approved) |
