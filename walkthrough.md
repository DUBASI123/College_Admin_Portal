# Walkthrough - Amazon S3 File Upload & Cross-Application File Management

We have successfully cleaned the `college_platfrom` repository (reverting it to its clean original state) and implemented the complete, secure, and scalable Amazon S3 file management system inside the **`College_Admin`** codebase.

---

## 🛠️ Changes Implemented in `College_Admin`

### 1. Backend Codebase (`backend/`)
* **[NEW] [s3Service.js](file:///C:/Users/dubas/Desktop/College_Admin/backend/src/utils/s3Service.js)**:
  * Integrates AWS SDK v3 client.
  * Implements `uploadToS3` using `@aws-sdk/lib-storage`'s `Upload` to efficiently run multipart uploads of incoming readable streams (supporting files up to 1 GB).
  * Implements `getPresignedDownloadUrl` expiring in 10 minutes.
  * Implements S3 object deletion (`deleteFromS3`).
* **[NEW] [files.js](file:///C:/Users/dubas/Desktop/College_Admin/backend/src/routes/files.js)**: REST API routes:
  * `POST /api/files/upload`: Validates extension (PDF, DOCX, MP4, etc.), streams files to S3, and writes DB metadata.
  * `GET /api/files`: Multi-filter pagination listing of active files.
  * `GET /api/files/:id`: Details retrieval.
  * `GET /api/files/:id/download`: Generates S3 pre-signed download link and logs the event (user, file, IP, timestamp).
  * `PUT /api/files/:id`: Updates metadata.
  * `DELETE /api/files/:id`: Clears file from S3 and database.
* **[MODIFY] [db.js](file:///C:/Users/dubas/Desktop/College_Admin/backend/src/db.js)**: Added logic to dynamically check and create the `files` PostgreSQL table on database pool initialization.
* **[MODIFY] [server.js](file:///C:/Users/dubas/Desktop/College_Admin/backend/src/server.js)**: Mounted `/api/files` router.
* **[MODIFY] [.env](file:///C:/Users/dubas/Desktop/College_Admin/backend/.env)**: Saved active AWS credentials:
  ```env
  AWS_ACCESS_KEY_ID=your_aws_access_key_id
  AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
  AWS_REGION=eu-north-1
  AWS_BUCKET_NAME=myvault-files
  ```
### 2. Frontend Codebase (`frontend/`)
* **[NEW] [AdminFiles.jsx](file:///C:/Users/dubas/Desktop/College_Admin/frontend/src/components/AdminFiles.jsx)**: 
  * Drag-and-drop file target.
  * Live animated progress bar showing upload progress percentage using native `XMLHttpRequest`.
  * Metadata form (subject, sem, category, title, description, branch).
  * Management table to edit file records and delete files from S3/DB.
* **[NEW] [Materials.jsx](file:///C:/Users/dubas/Desktop/College_Admin/frontend/src/components/Materials.jsx)**:
  * Student interface with search and filters (category, sem, subject, dept).
  * Modal card view for details.
  * Student login prompt if not authenticated, matching the backend auth router.
  * Single-click secure download initiating direct browser download from S3 via pre-signed links.
* **[MODIFY] [App.jsx](file:///C:/Users/dubas/Desktop/College_Admin/frontend/src/App.jsx)**: Integrated custom state-based navigation for "Study Materials" and "Upload S3 Files".

---

## 🧪 Verification & Results

Both development servers are successfully active:
1. **Backend Server** running on `http://localhost:5050` (Successfully connected to PostgreSQL and verified/created the `files` table).
2. **Frontend Vite Server** running on `http://localhost:5173`.
