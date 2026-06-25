import express from 'express';
import jwt from 'jsonwebtoken';
import { query, get } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'myvault_jwt_secret_key_12345';

// Student Auth Middleware
const authenticateStudent = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Forbidden: Student access only' });
    }

    // Verify student is active and approved in the database
    const student = await get('SELECT id, status, department_id, year_of_study FROM students WHERE id = ?', [decoded.id]);
    if (!student) {
      return res.status(404).json({ error: 'Student account not found' });
    }

    if (student.status !== 'approved') {
      return res.status(403).json({
        error: 'approval_required',
        message: 'Your registration is not approved yet.'
      });
    }

    req.student = {
      id: student.id,
      college_id: decoded.college_id,
      department_id: student.department_id,
      year_of_study: student.year_of_study
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Mount middleware for all student routes
router.use(authenticateStudent);

// 1. Get Student Profile
router.get('/profile', async (req, res) => {
  try {
    const studentId = req.student.id;
    const student = await get(
      `SELECT s.id, s.name, s.email, s.phone, s.roll_number, s.year_of_study, s.status, s.created_at,
              c.name as college_name, d.name as department_name, d.code as department_code
       FROM students s
       JOIN colleges c ON s.college_id = c.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE s.id = ?`,
      [studentId]
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile', message: err.message });
  }
});

// 2. Get Academic Content (with search and filters)
router.get('/content', async (req, res) => {
  try {
    const collegeId = req.student.college_id;
    const { contentType, semester, search } = req.query;

    let sql = `
      SELECT c.*, d.name as department_name, d.code as department_code, a.name as admin_name
      FROM content c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN admins a ON c.uploaded_by = a.id
      WHERE c.college_id = ? AND c.is_published = 1
    `;
    const params = [collegeId];

    if (contentType) {
      sql += ' AND c.content_type = ?';
      params.push(contentType);
    }

    if (semester) {
      sql += ' AND c.semester = ?';
      params.push(parseInt(semester));
    }

    if (search) {
      sql += ' AND (c.title LIKE ? OR c.description LIKE ? OR c.subject LIKE ?)';
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    sql += ' ORDER BY c.created_at DESC';

    const contentList = await query(sql, params);
    res.json(contentList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content', message: err.message });
  }
});

// 3. Get Career Opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const collegeId = req.student.college_id;
    const { type, search } = req.query;

    let sql = `
      SELECT * FROM opportunities
      WHERE college_id = ? AND is_active = 1
    `;
    const params = [collegeId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      sql += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)';
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    sql += ' ORDER BY created_at DESC';

    const opps = await query(sql, params);
    res.json(opps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities', message: err.message });
  }
});

// 4. Get Targeted Notifications
router.get('/notifications', async (req, res) => {
  try {
    const collegeId = req.student.college_id;
    const { year_of_study, department_id } = req.student;

    const sql = `
      SELECT * FROM notifications
      WHERE college_id = ?
        AND (
          target_all = 1
          OR (target_year = ?)
          OR (target_dept_id = ?)
        )
      ORDER BY sent_at DESC
    `;
    const notes = await query(sql, [collegeId, year_of_study, department_id]);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications', message: err.message });
  }
});

export default router;
