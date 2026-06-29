import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import https from 'https';
import { run, query, get, generateUUID } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'myvault_jwt_secret_key_12345';

// Admin Auth Middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    req.admin = decoded; // { id, role, college_id }
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Multer Memory Storage - keeps files in RAM for direct Cloudinary upload
// No disk writes needed, safe for cloud/ephemeral environments (Render, Railway, etc.)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Mount auth middleware to all endpoints
router.use(authenticateAdmin);

// ==========================================
// 1. Student Approvals
// ==========================================

// Get students for admin's college (filter by status optional)
router.get('/students', async (req, res) => {
  try {
    const collegeId = req.admin.college_id;
    const { status } = req.query; // 'pending', 'approved', 'rejected'

    let sql;
    let params = [collegeId];

    if (process.env.DB_TYPE === 'postgres') {
      sql = `
        SELECT s.id, s.first_name || ' ' || s.last_name AS name, s.email, s.mobile AS phone, s.hall_ticket AS roll_number, s.year_of_study, 
               LOWER(s.verification_status) AS status, s.rejection_reason, s.created_at,
               s.branch AS department_name, s.branch AS department_code
        FROM students s
        WHERE s.college_id = ? AND s.role = 'student'
      `;

      if (status) {
        // Map pending/approved/rejected filter to Case-sensitive DB equivalents
        let mappedStatus = 'Pending';
        if (status === 'approved') mappedStatus = 'Approved';
        if (status === 'rejected') mappedStatus = 'Rejected';
        
        sql += ' AND s.verification_status = ?';
        params.push(mappedStatus);
      }

      sql += ' ORDER BY s.created_at DESC';
    } else {
      sql = `
        SELECT s.id, s.name, s.email, s.phone, s.roll_number, s.year_of_study, s.status, s.rejection_reason, s.created_at,
               d.name as department_name, d.code as department_code
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.college_id = ?
      `;

      if (status) {
        sql += ' AND s.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY s.created_at DESC';
    }

    const students = await query(sql, params);
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students', message: err.message });
  }
});

// Helper to send registration approval email via SendGrid REST API
function sendApprovalEmail(email, name) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "dubasisruthishiva1335@gmail.com";
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY environment variable is not set. Skipping approval email.");
    return;
  }
  
  const postData = JSON.stringify({
    personalizations: [
      { to: [{ email: email }] }
    ],
    from: { email: fromEmail, name: "MyVault Support" },
    subject: "MyVault Student Account Approved!",
    content: [
      {
        type: "text/plain",
        value: `Hello ${name},\n\nCongratulations! Your student registration request for MyVault has been approved by the college administration.\n\nYou can now log in using your registered credentials in the MyVault app.\n\nBest regards,\nCollege Administration`
      }
    ]
  });

  const options = {
    hostname: 'api.sendgrid.com',
    path: '/v3/mail/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`Approval email sent successfully to ${email}`);
      } else {
        console.warn(`SendGrid email failed with status ${res.statusCode}:`, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error("Failed to send approval email:", err.message);
  });

  req.write(postData);
  req.end();
}

// Helper to send registration approval SMS via Twilio REST API
function sendApprovalSms(mobile, name) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER || "+14472473225";
  if (!mobile) return;
  if (!accountSid || !authToken) {
    console.warn("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set. Skipping approval SMS.");
    return;
  }

  const postData = new URLSearchParams({
    From: fromPhone,
    To: mobile,
    Body: `Hello ${name}, your MyVault student account has been approved by the college administration! You can now log in.`
  }).toString();

  const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const options = {
    hostname: 'api.twilio.com',
    path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`Approval SMS sent successfully to ${mobile}`);
      } else {
        console.warn(`Twilio SMS failed with status ${res.statusCode}:`, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error("Failed to send approval SMS:", err.message);
  });

  req.write(postData);
  req.end();
}

// Approve a student
router.post('/students/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.admin.college_id;

    // Verify student belongs to this admin's college
    let student;
    if (process.env.DB_TYPE === 'postgres') {
      student = await get(
        `SELECT id, first_name, last_name, email, mobile 
         FROM students 
         WHERE id = ? AND college_id = ?`,
        [id, collegeId]
      );
      if (student) {
        student.name = `${student.first_name} ${student.last_name}`;
        student.phone = student.mobile;
      }
    } else {
      student = await get(
        `SELECT id, name, email, phone 
         FROM students 
         WHERE id = ? AND college_id = ?`,
        [id, collegeId]
      );
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found in this college' });
    }

    if (process.env.DB_TYPE === 'postgres') {
      await run(
        `UPDATE students
         SET verification_status = 'Approved', is_verified = TRUE, rejection_reason = NULL
         WHERE id = ?`,
        [id]
      );

      // Create a live notification record for the student in Supabase
      try {
        await run(
          `INSERT INTO notifications (id, title, body, type)
           VALUES (?, 'Registration Approved', 'Your registration request has been approved by your college administrator.', 'general')`,
          [generateUUID()]
        );
      } catch (err) {
        console.warn('Failed to insert approval notification:', err.message);
      }
    } else {
      await run(
        `UPDATE students
         SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL
         WHERE id = ?`,
        [req.admin.id, id]
      );
    }

    // Trigger asynchronous notifications (non-blocking)
    if (student.email) {
      sendApprovalEmail(student.email, student.name || 'Student');
    }
    const phoneNum = student.phone || student.mobile;
    if (phoneNum) {
      sendApprovalSms(phoneNum, student.name || 'Student');
    }

    res.json({ message: 'Student registration approved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve student', message: err.message });
  }
});

// Reject a student
router.post('/students/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const collegeId = req.admin.college_id;

    // Verify student belongs to this admin's college
    const student = await get('SELECT id FROM students WHERE id = ? AND college_id = ?', [id, collegeId]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found in this college' });
    }

    if (process.env.DB_TYPE === 'postgres') {
      await run(
        `UPDATE students
         SET verification_status = 'Rejected', is_verified = FALSE, rejection_reason = ?
         WHERE id = ?`,
        [reason || 'Rejected by administrator', id]
      );

      // Create a live notification record for the student in Supabase
      try {
        await run(
          `INSERT INTO notifications (id, title, body, type)
           VALUES (?, 'Registration Rejected', 'Your registration request was rejected by your college administrator.', 'general')`,
          [generateUUID()]
        );
      } catch (err) {
        console.warn('Failed to insert rejection notification:', err.message);
      }
    } else {
      await run(
        `UPDATE students
         SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ?
         WHERE id = ?`,
        [req.admin.id, reason || 'No reason provided', id]
      );
    }

    res.json({ message: 'Student registration rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject student', message: err.message });
  }
});


// ==========================================
// 2. Academic Content Hub
// ==========================================

// Get all uploaded content for admin's college
router.get('/content', async (req, res) => {
  try {
    const collegeId = req.admin.college_id;
    let contentList;

    if (process.env.DB_TYPE === 'postgres') {
      contentList = await query(
        `SELECT c.id, c.title, c.description, c.content_type, c.file_url, c.created_at,
                s.name AS subject, s.semester, s.branch AS department_name, s.branch AS department_code,
                COALESCE(u.first_name || ' ' || u.last_name, a.email, 'Admin') AS admin_name
         FROM academic_contents c
         LEFT JOIN subjects s ON c.subject_id = s.id
         LEFT JOIN students u ON c.uploaded_by = u.id
         LEFT JOIN admins a ON c.uploaded_by = a.id
         WHERE s.id IS NOT NULL AND (u.college_id = ? OR a.college_id = ?)
         ORDER BY c.created_at DESC`,
        [collegeId, collegeId]
      );
    } else {
      const sql = `
        SELECT c.*, d.name as department_name, d.code as department_code, a.name as admin_name
        FROM content c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN admins a ON c.uploaded_by = a.id
        WHERE c.college_id = ?
        ORDER BY c.created_at DESC
      `;
      contentList = await query(sql, [collegeId]);
    }
    res.json(contentList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content', message: err.message });
  }
});

// Upload new content
router.post('/content', upload.single('file'), async (req, res) => {
  try {
    const collegeId = req.admin.college_id;
    const { title, description, contentType, departmentId, subject, semester, yearTarget } = req.body;

    if (!title || !contentType) {
      return res.status(400).json({ error: 'Title and content type are required' });
    }

    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;

    if (req.file) {
      fileName = req.file.originalname;
      fileSize = req.file.size;
      try {
        // Detect Cloudinary resource type based on MIME type
        const mime = req.file.mimetype.toLowerCase();
        let cloudinaryResourceType = 'raw'; // default for docs, PDFs, DOCX, PPT
        if (mime.startsWith('image/')) cloudinaryResourceType = 'image';
        else if (mime.startsWith('video/')) cloudinaryResourceType = 'video';

        // Helper to try a Cloudinary upload with given resource type
        // Uses multipart FormData (much more reliable than base64 for documents)
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
          console.log(`Cloudinary response [${resourceType}]:`, JSON.stringify(data).substring(0, 500));
          if (data.secure_url) return data.secure_url;
          throw new Error(data.error?.message || JSON.stringify(data));
        };

        console.log(`Uploading ${fileName} (${mime}) to Cloudinary as [${cloudinaryResourceType}]...`);
        try {
          fileUrl = await tryCloudinaryUpload(cloudinaryResourceType);
        } catch (firstErr) {
          // Fallback: if specific type fails, try 'raw' (works for any file type)
          console.warn(`Primary upload failed (${firstErr.message}), retrying as raw...`);
          if (cloudinaryResourceType !== 'raw') {
            fileUrl = await tryCloudinaryUpload('raw');
          } else {
            throw firstErr;
          }
        }

        console.log('Successfully uploaded to Cloudinary:', fileUrl);
      } catch (uploadErr) {
        console.error('Cloudinary upload failed:', uploadErr.message);
        return res.status(500).json({ error: 'File upload failed. Please try again.', message: uploadErr.message });
      }
    } else {
      fileUrl = req.body.fileUrl || '';
    }

    const contentId = generateUUID();

    if (process.env.DB_TYPE === 'postgres') {
      // Find or create subject first
      const branchName = departmentId || 'CSE';
      const semNumber = semester ? parseInt(semester) : 1;

      let subjectRow = await get(
        'SELECT id FROM subjects WHERE name = ? AND branch = ? AND semester = ?',
        [subject || 'General', branchName, semNumber]
      );

      if (!subjectRow) {
        const newSubjectId = generateUUID();
        await run(
          'INSERT INTO subjects (id, name, branch, semester) VALUES (?, ?, ?, ?)',
          [newSubjectId, subject || 'General', branchName, semNumber]
        );
        subjectRow = { id: newSubjectId };
      }

      await run(
        `INSERT INTO academic_contents (id, subject_id, title, content_type, description, file_url, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [contentId, subjectRow.id, title, contentType, description || '', fileUrl, req.admin.id]
      );
    } else {
      await run(
        `INSERT INTO content (id, college_id, department_id, uploaded_by, title, description, content_type, file_url, file_size, file_name, subject, semester, year_target)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contentId, collegeId, departmentId || null, req.admin.id, title, description || '',
          contentType, fileUrl, fileSize, fileName, subject || '', semester ? parseInt(semester) : null, yearTarget ? parseInt(yearTarget) : null
        ]
      );
    }

    res.status(201).json({ message: 'Content uploaded successfully', contentId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload content', message: err.message });
  }
});

// Delete content
router.delete('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.admin.college_id;

    if (process.env.DB_TYPE === 'postgres') {
      const contentItem = await get('SELECT file_url FROM academic_contents WHERE id = ?', [id]);
      if (!contentItem) {
        return res.status(404).json({ error: 'Content not found' });
      }

      if (contentItem.file_url && contentItem.file_url.startsWith('/uploads/')) {
        const filePath = join(__dirname, '../../', contentItem.file_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await run('DELETE FROM academic_contents WHERE id = ?', [id]);
    } else {
      // Verify ownership
      const contentItem = await get('SELECT file_url FROM content WHERE id = ? AND college_id = ?', [id, collegeId]);
      if (!contentItem) {
        return res.status(404).json({ error: 'Content not found' });
      }

      // Delete file if it exists locally
      if (contentItem.file_url && contentItem.file_url.startsWith('/uploads/')) {
        const filePath = join(__dirname, '../../', contentItem.file_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await run('DELETE FROM content WHERE id = ?', [id]);
    }
    res.json({ message: 'Content deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete content', message: err.message });
  }
});


// ==========================================
// 3. Career & Placement Opportunities
// ==========================================

// Get all opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const collegeId = req.admin.college_id;
    let opps;

    if (process.env.DB_TYPE === 'postgres') {
      opps = await query(
        `SELECT id, company, role AS title, type, domain AS description, stipend AS salary_range, 
                duration, deadline, apply_link, status, created_at, 1 AS is_active, college_id
         FROM internships
         WHERE college_id = ?
         ORDER BY created_at DESC`,
        [collegeId]
      );
    } else {
      opps = await query(
        'SELECT * FROM opportunities WHERE college_id = ? ORDER BY created_at DESC',
        [collegeId]
      );
    }
    res.json(opps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities', message: err.message });
  }
});

// Post an opportunity
router.post('/opportunities', async (req, res) => {
  try {
    const collegeId = req.admin.college_id;
    const { title, company, description, type, location, salaryRange, eligibility, applyLink, deadline } = req.body;

    if (!title || !company) {
      return res.status(400).json({ error: 'Title and company are required' });
    }

    const oppId = generateUUID();

    if (process.env.DB_TYPE === 'postgres') {
      await run(
        `INSERT INTO internships (id, company, role, type, domain, stipend, duration, deadline, apply_link, status, college_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)`,
        [
          oppId, company, title, type || 'internship', description || '', 
          salaryRange || '', deadline || '', deadline || '', applyLink || '', collegeId
        ]
      );
    } else {
      await run(
        `INSERT INTO opportunities (id, college_id, posted_by, title, company, description, type, location, salary_range, eligibility, apply_link, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          oppId, collegeId, req.admin.id, title, company, description || '', type || 'job',
          location || '', salaryRange || '', eligibility || '', applyLink || '', deadline || null
        ]
      );
    }

    res.status(201).json({ message: 'Opportunity posted successfully', oppId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post opportunity', message: err.message });
  }
});

// Delete an opportunity
router.delete('/opportunities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.admin.college_id;

    if (process.env.DB_TYPE === 'postgres') {
      const opp = await get('SELECT id FROM internships WHERE id = ? AND college_id = ?', [id, collegeId]);
      if (!opp) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      await run('DELETE FROM internships WHERE id = ?', [id]);
    } else {
      const opp = await get('SELECT id FROM opportunities WHERE id = ? AND college_id = ?', [id, collegeId]);
      if (!opp) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      await run('DELETE FROM opportunities WHERE id = ?', [id]);
    }
    res.json({ message: 'Opportunity deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete opportunity', message: err.message });
  }
});


// ==========================================
// 4. Notifications Hub
// ==========================================

// Get sent notifications
router.get('/notifications', async (req, res) => {
  try {
    const collegeId = req.admin.college_id;
    let notes;

    if (process.env.DB_TYPE === 'postgres') {
      notes = await query(
        `SELECT id, title, body, type, created_at AS sent_at, 
                NULL AS department_name, NULL AS department_code, college_id
         FROM notifications
         WHERE college_id = ?
         ORDER BY created_at DESC`,
        [collegeId]
      );
    } else {
      notes = await query(
        `SELECT n.*, d.name as department_name, d.code as department_code
         FROM notifications n
         LEFT JOIN departments d ON n.target_dept_id = d.id
         WHERE n.college_id = ?
         ORDER BY n.sent_at DESC`,
        [collegeId]
      );
    }
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications', message: err.message });
  }
});

// Dispatch notification
router.post('/notifications', async (req, res) => {
  try {
    const collegeId = req.admin.college_id;
    const { title, body, type, targetAll, targetYear, targetDeptId } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const noteId = generateUUID();

    if (process.env.DB_TYPE === 'postgres') {
      await run(
        `INSERT INTO notifications (id, title, body, type, college_id)
         VALUES (?, ?, ?, ?, ?)`,
        [noteId, title, body, type || 'general', collegeId]
      );
    } else {
      await run(
        `INSERT INTO notifications (id, college_id, sent_by, title, body, type, target_all, target_year, target_dept_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          noteId, collegeId, req.admin.id, title, body, type || 'general',
          targetAll ? 1 : 0, targetYear ? parseInt(targetYear) : null, targetDeptId || null
        ]
      );
    }

    res.status(201).json({ message: 'Notification dispatched successfully', noteId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification', message: err.message });
  }
});


// ==========================================
// 5. Dashboard Analytics
// ==========================================
router.get('/analytics', async (req, res) => {
  try {
    const collegeId = req.admin.college_id;
    let totalStudents, pendingStudents, approvedStudents, totalContent, totalOpps, deptBreakdown;

    if (process.env.DB_TYPE === 'postgres') {
      totalStudents = await get("SELECT COUNT(*)::int as count FROM students WHERE college_id = ? AND role = 'student'", [collegeId]);
      pendingStudents = await get("SELECT COUNT(*)::int as count FROM students WHERE college_id = ? AND role = 'student' AND verification_status = 'Pending'", [collegeId]);
      approvedStudents = await get("SELECT COUNT(*)::int as count FROM students WHERE college_id = ? AND role = 'student' AND verification_status = 'Approved'", [collegeId]);
      
      totalContent = await get(
        `SELECT COUNT(c.id)::int as count 
         FROM academic_contents c
         JOIN students u ON c.uploaded_by = u.id
         WHERE u.college_id = ?`,
        [collegeId]
      );
      
      totalOpps = await get("SELECT COUNT(*)::int as count FROM internships WHERE status = 'Open' AND college_id = ?", [collegeId]);

      deptBreakdown = await query(
        `SELECT branch AS department_name, branch AS department_code, COUNT(id)::int as student_count
         FROM students
         WHERE college_id = ? AND role = 'student' AND verification_status = 'Approved'
         GROUP BY branch`,
        [collegeId]
      );
    } else {
      totalStudents = await get('SELECT COUNT(*) as count FROM students WHERE college_id = ?', [collegeId]);
      pendingStudents = await get("SELECT COUNT(*) as count FROM students WHERE college_id = ? AND status = 'pending'", [collegeId]);
      approvedStudents = await get("SELECT COUNT(*) as count FROM students WHERE college_id = ? AND status = 'approved'", [collegeId]);
      totalContent = await get('SELECT COUNT(*) as count FROM content WHERE college_id = ?', [collegeId]);
      totalOpps = await get('SELECT COUNT(*) as count FROM opportunities WHERE college_id = ? AND is_active = 1', [collegeId]);

      deptBreakdown = await query(
        `SELECT d.name as department_name, d.code as department_code, COUNT(s.id) as student_count
         FROM departments d
         LEFT JOIN students s ON d.id = s.department_id AND s.status = 'approved'
         WHERE d.college_id = ?
         GROUP BY d.id`,
        [collegeId]
      );
    }

    res.json({
      totalStudents: totalStudents.count,
      pendingStudents: pendingStudents.count,
      approvedStudents: approvedStudents.count,
      totalContent: totalContent.count,
      totalOpps: totalOpps.count,
      deptBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile analytics', message: err.message });
  }
});

export default router;
