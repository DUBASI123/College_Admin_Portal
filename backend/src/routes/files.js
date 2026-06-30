import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { get, run, query, generateUUID } from '../db.js';
import { getPresignedDownloadUrl, deleteFromS3, getUploadPresignedUrl, initiateMultipart, presignUploadPart, completeMultipart, abortMultipart } from '../utils/s3Service.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'myvault_jwt_secret_key_12345';

// Public proxy route for S3 downloads (no auth required)
router.get('/public/files/*', async (req, res) => {
  try {
    const key = req.params[0];
    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }
    const downloadUrl = await getPresignedDownloadUrl(key);
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('[Public Proxy Error]', error);
    res.status(500).send('Failed to retrieve file from S3');
  }
});

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

// 1. POST /upload-url
router.post('/upload-url', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { fileName, fileType, category } = req.body;

    if (!fileName || !fileType || !category) {
      return res.status(400).json({ error: 'fileName, fileType, and category are required' });
    }

    const allowedCategories = ['study-materials', 'student-documents', 'assignments', 'certificates'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const ext = path.extname(fileName).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.mp4'];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const storedFileName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
    const s3Key = `${category}/${storedFileName}`;

    console.log(`[Upload URL] Generating pre-signed S3 upload URL for ${fileName}`);
    const uploadUrl = await getUploadPresignedUrl(s3Key, fileType);

    res.json({
      uploadUrl,
      s3Key,
      storedFileName
    });
  } catch (error) {
    console.error('[Upload URL Error]', error);
    res.status(500).json({ error: 'Failed to generate S3 pre-signed upload URL', message: error.message });
  }
});

// 2. POST /confirm
router.post('/confirm', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, description, category, subject, semester, department, originalFileName, storedFileName, fileSize, mimeType, s3Key } = req.body;

    if (!title || !category || !subject || !semester || !department || !originalFileName || !storedFileName || !fileSize || !mimeType || !s3Key) {
      return res.status(400).json({ error: 'Missing required file metadata fields' });
    }

    const fileId = generateUUID();

    await run(
      `INSERT INTO files (id, title, description, category, subject, semester, department, original_file_name, stored_file_name, file_size, mime_type, s3_key, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileId, title, description || '', category, subject, semester, department,
        originalFileName, storedFileName, parseInt(fileSize), mimeType, s3Key, req.userId
      ]
    );

    console.log(`[Confirm Log] Time: ${new Date().toISOString()}, User ID: ${req.userId}, Event: UPLOAD_CONFIRM, File: ${storedFileName}, IP: ${req.ip || 'unknown'}`);

    res.status(201).json({
      message: 'File metadata saved successfully',
      file: {
        id: fileId, title, description, category, subject, semester, department,
        original_file_name: originalFileName, file_size: parseInt(fileSize), s3_key: s3Key
      }
    });
  } catch (error) {
    console.error('[Confirm Error]', error);
    res.status(500).json({ error: 'Confirm failed', message: error.message });
  }
});

// 3. POST /multipart/initiate
router.post('/multipart/initiate', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { fileName, fileType, category } = req.body;
    if (!fileName || !fileType || !category) {
      return res.status(400).json({ error: 'fileName, fileType, and category are required' });
    }

    const allowedCategories = ['study-materials', 'student-documents', 'assignments', 'certificates'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const ext = path.extname(fileName).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.mp4'];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const storedFileName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
    const s3Key = `${category}/${storedFileName}`;

    console.log(`[Multipart Initiate] Initiating S3 multipart upload for ${fileName}`);
    const uploadId = await initiateMultipart(s3Key, fileType);

    res.json({
      uploadId,
      s3Key,
      storedFileName
    });
  } catch (error) {
    console.error('[Multipart Initiate Error]', error);
    res.status(500).json({ error: 'Failed to initiate S3 multipart upload', message: error.message });
  }
});

// 4. POST /multipart/presign-part
router.post('/multipart/presign-part', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { s3Key, uploadId, partNumber } = req.body;
    if (!s3Key || !uploadId || !partNumber) {
      return res.status(400).json({ error: 's3Key, uploadId, and partNumber are required' });
    }

    const uploadUrl = await presignUploadPart(s3Key, uploadId, parseInt(partNumber));
    res.json({ uploadUrl });
  } catch (error) {
    console.error('[Multipart Presign Part Error]', error);
    res.status(500).json({ error: 'Failed to generate part upload URL', message: error.message });
  }
});

// 5. POST /multipart/complete
router.post('/multipart/complete', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { 
      s3Key, uploadId, parts, 
      title, description, category, subject, semester, department, 
      originalFileName, storedFileName, fileSize, mimeType 
    } = req.body;

    if (!s3Key || !uploadId || !parts || !title || !category || !subject || !semester || !department || !originalFileName || !storedFileName || !fileSize || !mimeType) {
      return res.status(400).json({ error: 'Missing required S3 upload or metadata fields' });
    }

    // Sort parts by PartNumber (AWS S3 requires parts to be in order)
    const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

    console.log(`[Multipart Complete] Completing S3 upload for key ${s3Key}`);
    await completeMultipart(s3Key, uploadId, sortedParts);

    // Save metadata in PostgreSQL
    const fileId = generateUUID();
    await run(
      `INSERT INTO files (id, title, description, category, subject, semester, department, original_file_name, stored_file_name, file_size, mime_type, s3_key, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileId, title, description || '', category, subject, semester, department,
        originalFileName, storedFileName, parseInt(fileSize), mimeType, s3Key, req.userId
      ]
    );

    console.log(`[Confirm Log] Time: ${new Date().toISOString()}, User ID: ${req.userId}, Event: MULTIPART_COMPLETE, File: ${storedFileName}, IP: ${req.ip || 'unknown'}`);

    res.status(201).json({
      message: 'Multipart upload completed and metadata saved successfully',
      file: {
        id: fileId, title, description, category, subject, semester, department,
        original_file_name: originalFileName, file_size: parseInt(fileSize), s3_key: s3Key
      }
    });
  } catch (error) {
    console.error('[Multipart Complete Error]', error);
    res.status(500).json({ error: 'Failed to complete multipart upload', message: error.message });
  }
});

// 6. POST /multipart/abort
router.post('/multipart/abort', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { s3Key, uploadId } = req.body;
    if (!s3Key || !uploadId) {
      return res.status(400).json({ error: 's3Key and uploadId are required' });
    }

    console.log(`[Multipart Abort] Aborting S3 upload for key ${s3Key}`);
    await abortMultipart(s3Key, uploadId);
    res.json({ message: 'Multipart upload aborted successfully' });
  } catch (error) {
    console.error('[Multipart Abort Error]', error);
    res.status(500).json({ error: 'Failed to abort multipart upload', message: error.message });
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
