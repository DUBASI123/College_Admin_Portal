import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { get, run, query, generateUUID } from '../db.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});
const JWT_SECRET = process.env.JWT_SECRET || 'myvault_jwt_secret_key_12345';

// 1. Get all colleges (for registration dropdowns)
router.get('/colleges', async (req, res) => {
  try {
    let colleges;
    if (process.env.DB_TYPE === 'postgres') {
      colleges = await query("SELECT id, name, code, logo_url, '' AS website, TRUE AS is_active FROM colleges ORDER BY name ASC");
    } else {
      colleges = await query('SELECT * FROM colleges WHERE is_active = 1 ORDER BY name ASC');
    }
    res.json(colleges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch colleges', message: err.message });
  }
});

// 2. Get departments of a college
router.get('/colleges/:collegeId/departments', async (req, res) => {
  try {
    const { collegeId } = req.params;
    if (process.env.DB_TYPE === 'postgres') {
      // Supabase has no separate departments table; departments are represented directly as branches.
      // We return a list of standard branches to keep the React admin portal dropdown working.
      return res.json([
        { id: 'CSE', college_id: collegeId, name: 'Computer Science & Engineering', code: 'CSE' },
        { id: 'ECE', college_id: collegeId, name: 'Electronics & Communication', code: 'ECE' },
        { id: 'IT', college_id: collegeId, name: 'Information Technology', code: 'IT' },
        { id: 'ME', college_id: collegeId, name: 'Mechanical Engineering', code: 'ME' },
        { id: 'CE', college_id: collegeId, name: 'Civil Engineering', code: 'CE' }
      ]);
    }
    const depts = await query('SELECT * FROM departments WHERE college_id = ? ORDER BY name ASC', [collegeId]);
    res.json(depts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments', message: err.message });
  }
});

// 3. College & Admin combined registration (or admin registering for an existing college)
router.post('/admin/register', upload.single('idCard'), async (req, res) => {
  try {
    const {
      collegeId,
      name, email, password,
      phone, full_name_aadhar, position, department
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    let targetCollegeId = collegeId;
    if (!targetCollegeId) {
      return res.status(400).json({ error: 'You must select a college' });
    }

    // Check if email already registered
    let existingAdmin;
    if (process.env.DB_TYPE === 'postgres') {
      existingAdmin = await get('SELECT id FROM students WHERE email = ?', [email.trim().toLowerCase()]);
    } else {
      existingAdmin = await get('SELECT id FROM admins WHERE email = ?', [email]);
    }

    if (existingAdmin) {
      return res.status(400).json({ error: 'An administrator account with this email already exists' });
    }

    let idCardUrl = '';
    if (req.file) {
      try {
        const mime = req.file.mimetype.toLowerCase();
        let cloudinaryResourceType = 'raw';
        if (mime.startsWith('image/')) cloudinaryResourceType = 'image';

        const tryCloudinaryUpload = async (resourceType) => {
          const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
          const formData = new FormData();
          formData.append('file', blob, req.file.originalname);
          formData.append('upload_preset', 'myvault_unsigned');

          const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/dtdb4irno/${resourceType}/upload`, {
            method: 'POST',
            body: formData
          });
          const data = await uploadRes.json();
          if (data.secure_url) return data.secure_url;
          throw new Error(data.error?.message || JSON.stringify(data));
        };

        try {
          idCardUrl = await tryCloudinaryUpload(cloudinaryResourceType);
        } catch (firstErr) {
          if (cloudinaryResourceType !== 'raw') {
            idCardUrl = await tryCloudinaryUpload('raw');
          } else {
            throw firstErr;
          }
        }
      } catch (uploadErr) {
        console.error('Admin ID upload failed:', uploadErr.message);
        return res.status(500).json({ error: 'ID card upload failed.', message: uploadErr.message });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const adminId = generateUUID();

    // Get the college details (including university_id for foreign keys)
    let college;
    let universityId = '1';
    if (process.env.DB_TYPE === 'postgres') {
      college = await get('SELECT name, university_id FROM colleges WHERE id = ?', [targetCollegeId]);
      if (college && college.university_id) {
        universityId = college.university_id;
      } else {
        const defaultUni = await get('SELECT id FROM universities LIMIT 1');
        if (defaultUni) universityId = defaultUni.id;
      }
    } else {
      college = await get('SELECT name FROM colleges WHERE id = ?', [targetCollegeId]);
    }

    if (process.env.DB_TYPE === 'postgres') {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Admin';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create Admin record in Supabase (students table with an admin role)
      await run(
        `INSERT INTO students (id, first_name, last_name, full_name_aadhar, mobile, email, password_hash, hall_ticket, university_id, college_id, course, branch, role, is_mobile_verified, is_email_verified, verification_status, is_verified, id_card_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          firstName,
          lastName,
          full_name_aadhar || name,
          phone || '',
          email.trim().toLowerCase(),
          passwordHash,
          'EMP-' + Math.floor(1000 + Math.random() * 9000), // Random employee ID
          universityId,
          targetCollegeId,
          position || 'Dean',
          department || 'CSE',
          'college_admin',
          true,
          true,
          'Pending', // Pending verification
          false,
          idCardUrl
        ]
      );
    } else {
      await run(
        `INSERT INTO admins (id, college_id, name, email, password_hash, phone, full_name_aadhar, id_card_url, position, department, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'pending')`,
        [adminId, targetCollegeId, name, email, passwordHash, phone || '', full_name_aadhar || name, idCardUrl, position || 'Dean', department || 'CSE']
      );
    }

    const token = jwt.sign({ id: adminId, role: 'admin', college_id: targetCollegeId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Admin account registered successfully. Pending approval.',
      token,
      admin: { id: adminId, name, email, college_id: targetCollegeId, college_name: college?.name || '', status: 'pending' }
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// 4. Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let admin;
    if (process.env.DB_TYPE === 'postgres') {
      admin = await get(
        `SELECT id, college_id, first_name || ' ' || last_name AS name, email, password_hash, verification_status
         FROM students 
         WHERE email = ? AND role IN ('admin', 'dept_admin', 'college_admin', 'super_admin')`,
        [email.trim().toLowerCase()]
      );
    } else {
      admin = await get('SELECT * FROM admins WHERE email = ?', [email]);
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Enforce approval verification check
    const statusVal = process.env.DB_TYPE === 'postgres' ? admin.verification_status : admin.status;
    if (statusVal && statusVal.toLowerCase() !== 'approved') {
      return res.status(403).json({ error: 'Your administrator account is pending approval by the system admin.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const college = await get('SELECT name FROM colleges WHERE id = ?', [admin.college_id]);
    const token = jwt.sign({ id: admin.id, role: 'admin', college_id: admin.college_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Logged in successfully',
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, college_id: admin.college_id, college_name: college?.name || '' }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

// 5. Student Registration
router.post('/student/register', async (req, res) => {
  try {
    const {
      collegeId, departmentId, name, email, phone, rollNumber, yearOfStudy, password
    } = req.body;

    if (!collegeId || !name || !email || !password) {
      return res.status(400).json({ error: 'College, Name, Email, and Password are required' });
    }

    // Check if email already registered
    let existingStudent;
    if (process.env.DB_TYPE === 'postgres') {
      existingStudent = await get('SELECT id FROM students WHERE email = ?', [email.trim().toLowerCase()]);
    } else {
      existingStudent = await get('SELECT id FROM students WHERE email = ?', [email]);
    }

    if (existingStudent) {
      return res.status(400).json({ error: 'A student account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const studentId = generateUUID();

    if (process.env.DB_TYPE === 'postgres') {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Student';
      const lastName = nameParts.slice(1).join(' ') || '';

      const college = await get('SELECT university_id FROM colleges WHERE id = ?', [collegeId]);
      let universityId = '1';
      if (college && college.university_id) {
        universityId = college.university_id;
      } else {
        const defaultUni = await get('SELECT id FROM universities LIMIT 1');
        if (defaultUni) universityId = defaultUni.id;
      }

      await run(
        `INSERT INTO students (id, college_id, first_name, last_name, full_name_aadhar, mobile, email, password_hash, hall_ticket, university_id, course, branch, role, is_mobile_verified, is_email_verified, verification_status, is_verified, year_of_study)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'B.Tech', ?, 'student', TRUE, TRUE, 'Pending', FALSE, ?)`,
        [
          studentId,
          collegeId,
          firstName,
          lastName,
          name,
          phone || '',
          email.trim().toLowerCase(),
          passwordHash,
          rollNumber || '',
          universityId,
          departmentId || 'CSE', // branch name
          yearOfStudy ? parseInt(yearOfStudy) : 1
        ]
      );
    } else {
      await run(
        `INSERT INTO students (id, college_id, department_id, name, email, phone, roll_number, year_of_study, password_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [studentId, collegeId, departmentId || null, name, email, phone || '', rollNumber || '', yearOfStudy || 1, passwordHash]
      );
    }

    res.status(201).json({
      message: 'Student account registered successfully. Awaiting approval from your college administrator.',
      status: 'pending'
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// 6. Student Login
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let student;
    if (process.env.DB_TYPE === 'postgres') {
      student = await get(
        `SELECT id, college_id, first_name || ' ' || last_name AS name, email, password_hash, verification_status AS status, rejection_reason, branch
         FROM students 
         WHERE email = ? AND role = 'student'`,
        [email.trim().toLowerCase()]
      );
    } else {
      student = await get('SELECT * FROM students WHERE email = ?', [email]);
    }

    if (!student) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check Approval Status first
    const normStatus = student.status ? student.status.toLowerCase() : 'pending';

    if (normStatus === 'pending') {
      return res.status(403).json({
        error: 'pending_approval',
        message: 'Your registration request is still pending approval from your college administrator.'
      });
    }

    if (normStatus === 'rejected') {
      return res.status(403).json({
        error: 'rejected',
        message: `Your registration request was rejected by the college. Reason: ${student.rejection_reason || 'N/A'}`
      });
    }

    const isMatch = await bcrypt.compare(password, student.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: student.id, role: 'student', college_id: student.college_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Logged in successfully',
      token,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        college_id: student.college_id,
        department_id: student.branch || '',
        status: student.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

export default router;
