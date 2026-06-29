-- ============================================================
-- MyVault — Complete PostgreSQL Schema
-- Multi-college academic & career platform
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. COLLEGES
-- ============================================================
CREATE TABLE IF NOT EXISTS colleges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(50)  UNIQUE NOT NULL,
  website         TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ADMINS
-- ============================================================
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

-- ============================================================
-- 3. DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(20) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. STUDENTS
-- ============================================================
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

-- ============================================================
-- 5. CONTENT CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS content_categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL,
  icon            VARCHAR(50),
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. CONTENT
-- ============================================================
CREATE TABLE IF NOT EXISTS content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES content_categories(id) ON DELETE SET NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  uploaded_by     UUID REFERENCES admins(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  content_type    VARCHAR(50) NOT NULL CHECK (content_type IN ('notes','pdf','ppt','video','lab_manual','syllabus','ebook','question_paper','other')),
  file_url        TEXT,
  file_size       BIGINT,
  file_name       TEXT,
  subject         VARCHAR(255),
  semester        SMALLINT,
  year_target     SMALLINT,
  view_count      INT DEFAULT 0,
  is_published    BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. CAREER OPPORTUNITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS opportunities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  posted_by       UUID REFERENCES admins(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  company         VARCHAR(255),
  description     TEXT,
  type            VARCHAR(50) DEFAULT 'job' CHECK (type IN ('job','internship','placement','scholarship','competition','other')),
  location        VARCHAR(255),
  salary_range    VARCHAR(100),
  eligibility     TEXT,
  apply_link      TEXT,
  deadline        DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id      UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  sent_by         UUID REFERENCES admins(id) ON DELETE SET NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  type            VARCHAR(50) DEFAULT 'general' CHECK (type IN ('general','content','opportunity','system','alert')),
  target_all      BOOLEAN DEFAULT TRUE,
  target_year     SMALLINT,
  target_dept_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-SEEDING DEFAULT TEST DATA FOR POSTGRESQL DB
-- ============================================================
INSERT INTO colleges (id, name, code, website) VALUES
  ('c_nitw', 'NIT Warangal', 'NITW', 'nitw.ac.in'),
  ('c_kitsw', 'KITS Warangal', 'KITSW', 'kitsw.ac.in'),
  ('c_vcew', 'Vaagdevi College of Engineering', 'VCEW', 'vaagdevi.edu.in'),
  ('c_sru', 'SR University', 'SRU', 'sru.edu.in'),
  ('c_svs', 'SVS Group of Institutions', 'SVS', 'svs.edu.in'),
  ('c_tpce', 'Talla Padmavathi College of Engineering', 'TPCE', 'tallapadmavathi.org'),
  ('c_cits', 'Chaitanya Institute of Technology and Science', 'CITS', 'cits.in'),
  ('c_arti', 'Ramappa Engineering College (Aurora''s Research and Technological Institute)', 'ARTI', 'aurora.edu.in'),
  ('c_bits', 'Balaji Institute of Technology & Science (BITS)', 'BITS', 'bitswgl.ac.in'),
  ('c_wits', 'Warangal Institute of Technology and Science', 'WITS', 'wits.ac.in')
ON CONFLICT (code) DO NOTHING;

INSERT INTO departments (id, college_id, name, code)
VALUES ('dept-nitw-cse', 'c_nitw', 'Computer Science & Engineering', 'CSE')
ON CONFLICT DO NOTHING;

-- Admin user (password: 'password123', email: 'admin@nitw.ac.in')
-- Hash: $2a$10$w6g2yTkyL2Z.80U/XG9Dhe6b2Fv1yD/FpB9p7J52q5W5c9xZfK3vC
INSERT INTO admins (id, college_id, name, email, password_hash, role)
VALUES ('admin-su-id', 'c_nitw', 'Dean NITW', 'admin@nitw.ac.in', '$2a$10$w6g2yTkyL2Z.80U/XG9Dhe6b2Fv1yD/FpB9p7J52q5W5c9xZfK3vC', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Students (password: 'password123')
INSERT INTO students (id, college_id, department_id, name, email, roll_number, year_of_study, password_hash, status)
VALUES ('student-approved-id', 'c_nitw', 'dept-nitw-cse', 'Bob Johnson', 'bob@nitw.ac.in', 'NITW-CS-008', 4, '$2a$10$w6g2yTkyL2Z.80U/XG9Dhe6b2Fv1yD/FpB9p7J52q5W5c9xZfK3vC', 'approved')
ON CONFLICT (email) DO NOTHING;

INSERT INTO students (id, college_id, department_id, name, email, roll_number, year_of_study, password_hash, status)
VALUES ('student-pending-id', 'c_nitw', 'dept-nitw-cse', 'Alice Smith', 'student@nitw.ac.in', 'NITW-CS-007', 3, '$2a$10$w6g2yTkyL2Z.80U/XG9Dhe6b2Fv1yD/FpB9p7J52q5W5c9xZfK3vC', 'pending')
ON CONFLICT (email) DO NOTHING;
