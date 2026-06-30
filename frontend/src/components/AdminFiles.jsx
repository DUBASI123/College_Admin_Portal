import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Edit, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.mp4'];
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

export default function AdminFiles() {
  const [token, setToken] = useState(localStorage.getItem('myvault_admin_token') || '');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Upload Form Fields
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'study-materials',
    subject: '',
    semester: '1',
    department: ''
  });

  // Edit Modal State
  const [editFile, setEditFile] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: 'study-materials',
    subject: '',
    semester: '1',
    department: '',
    status: 'Active'
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (token) {
      fetchFiles();
    }
  }, [token]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: '', message: '' });
    }, 5000);
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/files?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files);
      } else {
        showNotification('error', data.error || 'Failed to fetch files');
      }
    } catch (err) {
      showNotification('error', 'Failed to fetch files from server.');
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return false;
    
    // Check Size
    if (file.size > MAX_FILE_SIZE) {
      showNotification('error', 'File size exceeds the 1 GB limit.');
      return false;
    }

    // Check Extension
    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (!hasValidExt) {
      showNotification('error', `Unsupported file format. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFormData(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFormData(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showNotification('error', 'Please select or drag a file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const fileSize = selectedFile.size;
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB standard chunk

    // For files smaller than 5MB, use simple single pre-signed URL upload
    if (fileSize < CHUNK_SIZE) {
      try {
        // 1. Get pre-signed URL
        const urlRes = await fetch(`${API_URL}/files/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type || 'application/octet-stream',
            category: formData.category
          })
        });

        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.error || 'Failed to get upload URL');
        const { uploadUrl, s3Key, storedFileName } = urlData;

        // 2. Put file to S3
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total));
          }
        };

        xhr.onload = async () => {
          if (xhr.status === 200) {
            try {
              const confirmRes = await fetch(`${API_URL}/files/confirm`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  title: formData.title,
                  description: formData.description,
                  category: formData.category,
                  subject: formData.subject,
                  semester: formData.semester,
                  department: formData.department,
                  originalFileName: selectedFile.name,
                  storedFileName,
                  fileSize,
                  mimeType: selectedFile.type || 'application/octet-stream',
                  s3Key
                })
              });

              const confirmData = await confirmRes.json();
              setUploading(false);
              setUploadProgress(0);

              if (confirmRes.ok) {
                showNotification('success', 'File uploaded to S3 successfully!');
                setSelectedFile(null);
                setFormData({ title: '', description: '', category: 'study-materials', subject: '', semester: '1', department: '' });
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchFiles();
              } else {
                showNotification('error', confirmData.error || 'Failed to save metadata');
              }
            } catch (err) {
              setUploading(false);
              setUploadProgress(0);
              showNotification('error', 'Failed to register upload with backend.');
            }
          } else {
            setUploading(false);
            setUploadProgress(0);
            showNotification('error', `S3 upload failed: ${xhr.status}`);
          }
        };

        xhr.onerror = () => {
          setUploading(false);
          setUploadProgress(0);
          showNotification('error', 'Network error during S3 upload.');
        };

        xhr.send(selectedFile);
      } catch (err) {
        setUploading(false);
        setUploadProgress(0);
        showNotification('error', err.message || 'S3 upload initialization failed.');
      }
      return;
    }

    // For files >= 5MB: Use S3 Multipart Upload
    let initiatedKey = null;
    let initiatedId = null;

    try {
      // 1. Initiate multipart upload
      const initRes = await fetch(`${API_URL}/files/multipart/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/octet-stream',
          category: formData.category
        })
      });

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Failed to initiate multipart upload');
      const { uploadId, s3Key, storedFileName } = initData;
      initiatedId = uploadId;
      initiatedKey = s3Key;

      const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
      const uploadedParts = [];
      let totalBytesUploaded = 0;

      // 2. Upload parts sequentially
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        const chunk = selectedFile.slice(start, end);
        const chunkLength = end - start;

        // Get pre-signed part upload URL
        const partUrlRes = await fetch(`${API_URL}/files/multipart/presign-part`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ s3Key, uploadId, partNumber })
        });

        const partUrlData = await partUrlRes.json();
        if (!partUrlRes.ok) throw new Error(partUrlData.error || `Failed to sign part ${partNumber}`);
        const { uploadUrl } = partUrlData;

        // Perform chunk upload using XMLHttpRequest to track progress
        const partETag = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const partLoaded = event.loaded;
              const overallProgress = Math.round(((totalBytesUploaded + partLoaded) * 100) / fileSize);
              setUploadProgress(Math.min(overallProgress, 99)); // Max 99% until complete is done
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              const etag = xhr.getResponseHeader('ETag');
              if (etag) {
                totalBytesUploaded += chunkLength;
                resolve(etag);
              } else {
                reject(new Error(`No ETag header returned for part ${partNumber}`));
              }
            } else {
              reject(new Error(`Part ${partNumber} upload failed with status: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error during part ${partNumber} upload`));
          xhr.send(chunk);
        });

        uploadedParts.push({
          PartNumber: partNumber,
          ETag: partETag
        });
      }

      // 3. Complete multipart upload
      const completeRes = await fetch(`${API_URL}/files/multipart/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          s3Key,
          uploadId,
          parts: uploadedParts,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          subject: formData.subject,
          semester: formData.semester,
          department: formData.department,
          originalFileName: selectedFile.name,
          storedFileName,
          fileSize,
          mimeType: selectedFile.type || 'application/octet-stream'
        })
      });

      const completeData = await completeRes.json();
      setUploading(false);
      setUploadProgress(0);

      if (completeRes.ok) {
        showNotification('success', 'Large file uploaded and joined on S3 successfully! (Multipart)');
        setSelectedFile(null);
        setFormData({ title: '', description: '', category: 'study-materials', subject: '', semester: '1', department: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchFiles();
      } else {
        showNotification('error', completeData.error || 'Failed to complete multipart upload');
      }
    } catch (err) {
      console.error('[Multipart Upload Error]', err);
      // Abort S3 upload on backend to clean up storage
      if (initiatedKey && initiatedId) {
        try {
          await fetch(`${API_URL}/files/multipart/abort`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ s3Key: initiatedKey, uploadId: initiatedId })
          });
        } catch (abortErr) {
          console.error('Failed to abort upload:', abortErr);
        }
      }

      setUploading(false);
      setUploadProgress(0);
      showNotification('error', err.message || 'Multipart S3 upload failed.');
    }
  };

  const handleDeleteFile = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this file from S3 and database?')) return;
    try {
      const res = await fetch(`${API_URL}/files/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'File deleted successfully.');
        fetchFiles();
      } else {
        showNotification('error', data.error || data.message || 'Failed to delete file');
      }
    } catch (err) {
      showNotification('error', 'Failed to delete file');
    }
  };

  const openEditModal = (file) => {
    setEditFile(file);
    setEditFormData({
      title: file.title,
      description: file.description || '',
      category: file.category,
      subject: file.subject,
      semester: file.semester,
      department: file.department,
      status: file.status || 'Active'
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/files/${editFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Metadata updated successfully!');
        setEditFile(null);
        fetchFiles();
      } else {
        showNotification('error', data.error || data.message || 'Failed to update metadata');
      }
    } catch (err) {
      showNotification('error', 'Failed to update metadata');
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (!token) {
    return (
      <div className="panel-card container" style={{ marginTop: '3rem', textAlign: 'center', padding: '4rem 2rem' }}>
        <AlertCircle size={48} style={{ color: 'var(--warning)', marginBottom: '1.5rem', display: 'inline-block' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Administrator Portal Log-In Required</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>You must log in to the administrator console first to upload and manage S3 files.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ margin: '2rem auto', animation: 'fadeIn 0.35s ease-out' }}>
      <div className="admin-files-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          S3 File Management
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Upload files up to 1 GB directly to AWS S3. Drag &amp; drop is fully supported.</p>
      </div>

      {notification.message && (
        <div className={`notification-banner ${notification.type}`} style={{
          padding: '1rem 1.5rem',
          borderRadius: 'var(--border-radius)',
          marginBottom: '1.5rem',
          fontWeight: 500,
          background: notification.type === 'success' ? 'var(--success-glow)' : 'var(--error-glow)',
          color: notification.type === 'success' ? 'var(--success)' : 'var(--error)',
          border: `1px solid ${notification.type === 'success' ? 'var(--success)' : 'var(--error)'}`
        }}>
          {notification.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
        {/* Left Side: Upload Form */}
        <div className="panel-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Upload Resource
          </h3>
          <form onSubmit={handleUploadSubmit}>
            <div 
              style={{
                border: '2px dashed var(--brand-accent)',
                borderRadius: 'var(--border-radius)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragActive ? 'rgba(37, 99, 235, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                borderColor: dragActive ? 'var(--brand-primary)' : 'var(--border-color)',
                transition: 'var(--transition-smooth)'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileSelect} 
              />
              <Upload size={36} style={{ color: 'var(--brand-accent)', marginBottom: '1rem', display: 'inline-block' }} />
              {selectedFile ? (
                <div>
                  <p style={{ color: 'var(--success)', fontWeight: 600, wordBreak: 'break-all' }}>{selectedFile.name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatBytes(selectedFile.size)}</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Drag and drop file here, or <span style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>browse</span></p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, DOCX, PPTX, XLSX, ZIP, MP4, PNG (Max 1 GB)</span>
                </div>
              )}
            </div>

            {uploading && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)' }}>
                <div style={{ height: '8px', background: 'var(--bg-accent)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--brand-accent) 0%, var(--brand-primary) 100%)', width: `${uploadProgress}%`, transition: 'width 0.1s ease' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <span>Uploading to S3...</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Resource Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleFormChange} 
                  placeholder="Enter file title" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" name="category" value={formData.category} onChange={handleFormChange}>
                  <option value="study-materials">Study Materials</option>
                  <option value="student-documents">Student Documents</option>
                  <option value="assignments">Assignments</option>
                  <option value="certificates">Certificates</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="subject" 
                  value={formData.subject} 
                  onChange={handleFormChange} 
                  placeholder="e.g. Data Structures" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Semester</label>
                <select className="form-select" name="semester" value={formData.semester} onChange={handleFormChange}>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Department / Branch</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="department" 
                  value={formData.department} 
                  onChange={handleFormChange} 
                  placeholder="e.g. CSE, ECE" 
                  required 
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-input" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleFormChange} 
                  placeholder="Provide details about the resource content..." 
                  rows="3"
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }} disabled={uploading}>
              {uploading ? 'Uploading to S3...' : 'Upload S3 File'}
            </button>
          </form>
        </div>

        {/* Right Side: Uploaded Files List */}
        <div className="panel-card" style={{ padding: '2rem', maxHeight: '750px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Files Directory
          </h3>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Loading files metadata...</p>
          ) : files.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No S3 files uploaded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {files.map(file => (
                <div key={file.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.95rem' }}>{file.title}</h4>
                      <span className="badge badge-pending" style={{ textTransform: 'capitalize', fontSize: '0.7rem', display: 'inline-block', marginTop: '0.25rem' }}>
                        {file.category.replace('-', ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openEditModal(file)}>
                        Edit
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteFile(file.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <p><strong>Original File:</strong> {file.original_file_name}</p>
                    <p><strong>Size:</strong> {formatBytes(file.file_size)} | <strong>Subject:</strong> {file.subject}</p>
                    <p><strong>Class:</strong> {file.department} - Sem {file.semester} | <strong>Status:</strong> {file.status}</p>
                    {file.description && <p style={{ fontStyle: 'italic', marginTop: '0.25rem', borderLeft: '2px solid var(--brand-accent)', paddingLeft: '0.5rem' }}>{file.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Metadata Modal */}
      {editFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Edit File Metadata</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Resource Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editFormData.title} 
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-select" 
                  value={editFormData.category} 
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                >
                  <option value="study-materials">Study Materials</option>
                  <option value="student-documents">Student Documents</option>
                  <option value="assignments">Assignments</option>
                  <option value="certificates">Certificates</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select" 
                  value={editFormData.status} 
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editFormData.subject} 
                  onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Semester</label>
                <select 
                  className="form-select" 
                  value={editFormData.semester} 
                  onChange={(e) => setEditFormData({ ...editFormData, semester: e.target.value })}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Department</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editFormData.department} 
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  value={editFormData.description} 
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} 
                  rows="3"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditFile(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
