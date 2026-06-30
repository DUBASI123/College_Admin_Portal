import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { get, run, query, generateUUID } from '../db.js';
import { uploadToS3, getPresignedDownloadUrl, deleteFromS3 } from '../utils/s3Service.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'myvault_jwt_secret_key_12345';

// Auth Middlewares
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userCollegeId = decoded.college_id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, '../../temp_uploads');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1 GB
});

// 1. POST /upload
router.post('/upload', authMiddleware, adminOnly, upload.single('file'), async (req, res) => {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    tempFilePath = req.file.path;
    const { title, description, category, subject, semester, department } = req.body;

    if (!title || !category || !subject || !semester || !department) {
      return res.status(400).json({ error: 'Title, category, subject, semester, and department are required' });
    }

    const allowedCategories = ['study-materials', 'student-documents', 'assignments', 'certificates'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.mp4'];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const storedFileName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
    const s3Key = `${category}/${storedFileName}`;

    console.log(`[Upload] Starting S3 multipart upload for ${req.file.originalname} (${req.file.size} bytes)`);
    const fileStream = fs.createReadStream(tempFilePath);
    await uploadToS3(fileStream, s3Key, req.file.mimetype);

    const fileId = generateUUID();

    await run(
      `INSERT INTO files (id, title, description, category, subject, semester, department, original_file_name, stored_file_name, file_size, mime_type, s3_key, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileId, title, description || '', category, subject, semester, department,
        req.file.originalname, storedFileName, req.file.size, req.file.mimetype, s3Key, req.userId
      ]
    );

    console.log(`[Upload Log] Time: ${new Date().toISOString()}, User ID: ${req.userId}, Event: UPLOAD, File: ${storedFileName}, IP: ${req.ip || 'unknown'}`);

    res.status(201).json({
      message: 'File uploaded and metadata saved successfully',
      file: {
        id: fileId, title, description, category, subject, semester, department,
        original_file_name: req.file.originalname, file_size: req.file.size, s3_key: s3Key
      }
    });
  } catch (error) {
    console.error('[Upload Error]', error);
    res.status(500).json({ error: 'Upload failed', message: error.message });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error('[Cleanup Error]', err);
      }
    }
  }
});

// 2. GET /
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { subject, semester, category, department, search, page = 1, limit = 10 } = req.query;

    let sql = `SELECT f.*, a.name AS uploader_name FROM files f LEFT JOIN admins a ON f.uploaded_by = a.id WHERE f.status = 'Active'`;
    const params = [];

    if (subject) {
      sql += ' AND f.subject = ?';
      params.push(subject);
    }
    if (semester) {
      sql += ' AND f.semester = ?';
      params.push(semester);
    }
    if (category) {
      sql += ' AND f.category = ?';
      params.push(category);
    }
    if (department) {
      sql += ' AND f.department = ?';
      params.push(department);
    }

    if (search) {
      sql += ' AND (f.title LIKE ? OR f.description LIKE ? OR f.original_file_name LIKE ?)';
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    sql += ' ORDER BY f.uploaded_at DESC';

    // Count total matching records
    const countSql = `SELECT COUNT(*) as count FROM (${sql}) AS counted`;
    const countRes = await get(countSql, params);
    const total = parseInt(countRes?.count || 0);

    const limitVal = parseInt(limit);
    const offsetVal = (parseInt(page) - 1) * limitVal;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limitVal, offsetVal);

    const files = await query(sql, params);

    res.json({
      files,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitVal,
        pages: Math.ceil(total / limitVal)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files', message: error.message });
  }
});

// 3. GET /:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const file = await get('SELECT f.*, a.name AS uploader_name FROM files f LEFT JOIN admins a ON f.uploaded_by = a.id WHERE f.id = ?', [req.params.id]);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch file details', message: error.message });
  }
});

// 4. GET /:id/download
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const file = await get('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const downloadUrl = await getPresignedDownloadUrl(file.s3_key);

    console.log(`[Download Log] Time: ${new Date().toISOString()}, User ID: ${req.userId}, Event: DOWNLOAD, File ID: ${file.id}, Key: ${file.s3_key}, IP: ${req.ip || 'unknown'}`);

    res.json({ downloadUrl, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate download link', message: error.message });
  }
});

// 5. PUT /:id
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, description, category, subject, semester, department, status } = req.body;

    const file = await get('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const finalTitle = title || file.title;
    const finalDesc = description !== undefined ? description : file.description;
    let finalCat = file.category;
    if (category) {
      const allowedCategories = ['study-materials', 'student-documents', 'assignments', 'certificates'];
      if (!allowedCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      finalCat = category;
    }
    const finalSubject = subject || file.subject;
    const finalSemester = semester || file.semester;
    const finalDept = department || file.department;
    let finalStatus = file.status;
    if (status) {
      if (!['Active', 'Archived'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      finalStatus = status;
    }

    await run(
      `UPDATE files 
       SET title = ?, description = ?, category = ?, subject = ?, semester = ?, department = ?, status = ?, last_modified = NOW()
       WHERE id = ?`,
      [finalTitle, finalDesc, finalCat, finalSubject, finalSemester, finalDept, finalStatus, req.params.id]
    );

    console.log(`[Update Log] Time: ${new Date().toISOString()}, User ID: ${req.userId}, Event: UPDATE, File ID: ${req.params.id}, IP: ${req.ip || 'unknown'}`);

    res.json({ message: 'Metadata updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update metadata', message: error.message });
  }
});

// 6. DELETE /:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const file = await get('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from S3
    await deleteFromS3(file.s3_key);

    // Delete from Database
    await run('DELETE FROM files WHERE id = ?', [req.params.id]);

    console.log(`[Delete Log] Time: ${new Date().toISOString()}, User ID: ${req.userId}, Event: DELETE, File ID: ${req.params.id}, Key: ${file.s3_key}, IP: ${req.ip || 'unknown'}`);

    res.json({ message: 'File deleted from S3 and database successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Deletion failed', message: error.message });
  }
});

export default router;
