import 'dotenv/config';
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

// Ensure upload directory exists
const uploadsDir = join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Serve the built React Admin Portal and APK from /public
const publicDir = join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// APK direct download route
app.get('/download/apk', (req, res) => {
  const apkPath = join(__dirname, '../public/MyVault-release.apk');
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, 'MyVault.apk');
  } else {
    res.status(404).json({ error: 'APK not found' });
  }
});

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/student', studentRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Catch-all: serve React SPA for all non-API routes
app.use((req, res) => {
  const indexPath = join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Function to start server with automatic port fallback
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`MyVault Backend running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use, trying next port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server failed to start:', err);
    }
  });
};

// Initialize DB and start server
initDb()
  .then(() => {
    startServer(PORT);
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
