import React, { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, Download, AlertCircle, FileText, Lock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

export default function Materials() {
  const [token, setToken] = useState(localStorage.getItem('myvault_student_token') || '');
  const [studentUser, setStudentUser] = useState(JSON.parse(localStorage.getItem('myvault_student_user') || 'null'));
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [semester, setSemester] = useState('');
  const [department, setDepartment] = useState('');
  const [subject, setSubject] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Auth fields (for students to log in on the web portal if they want to access it here)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Detail Modal State
  const [selectedFile, setSelectedFile] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  };

  const fetchMaterials = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (category) queryParams.push(`category=${category}`);
      if (semester) queryParams.push(`semester=${semester}`);
      if (department) queryParams.push(`department=${encodeURIComponent(department)}`);
      if (subject) queryParams.push(`subject=${encodeURIComponent(subject)}`);
      queryParams.push(`page=${currentPage}`);
      queryParams.push('limit=9');

      const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await fetch(`${API_URL}/files${queryStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files);
        setPagination(data.pagination);
      } else {
        showNotification('error', data.error || 'Failed to fetch materials');
      }
    } catch (err) {
      showNotification('error', 'Failed to connect to file server.');
    } finally {
      setLoading(false);
    }
  }, [token, search, category, semester, department, subject, currentPage]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showNotification('error', 'Email and password are required');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch(`${API_URL}/auth/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('myvault_student_token', data.token);
        localStorage.setItem('myvault_student_user', JSON.stringify(data.student));
        setToken(data.token);
        setStudentUser(data.student);
        showNotification('success', 'Welcome! Login successful.');
      } else {
        showNotification('error', data.error || 'Login failed');
      }
    } catch (err) {
      showNotification('error', 'Server connection failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleStudentLogout = () => {
    localStorage.removeItem('myvault_student_token');
    localStorage.removeItem('myvault_student_user');
    setToken('');
    setStudentUser(null);
    setFiles([]);
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      showNotification('success', 'Requesting secure download link from AWS S3...');
      const res = await fetch(`${API_URL}/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('success', 'Download initiated securely!');
      } else {
        showNotification('error', data.error || 'Failed to download file');
      }
    } catch (err) {
      showNotification('error', 'Download link generation failed.');
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
      <div className="container" style={{ maxWdth: '420px', margin: '4rem auto', animation: 'fadeIn 0.35s ease-out' }}>
        <div className="panel-card" style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Lock size={36} style={{ color: 'var(--brand-accent)', marginBottom: '0.75rem', display: 'inline-block' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Student Portal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Sign in to view and download study materials.</p>
          </div>

          {notification.message && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              background: 'var(--error-glow)',
              color: 'var(--error)',
              border: '1px solid var(--error)'
            }}>
              {notification.message}
            </div>
          )}

          <form onSubmit={handleStudentLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="Enter your student email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter your password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }} disabled={authLoading}>
              {authLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ margin: '2rem auto', animation: 'fadeIn 0.35s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Academic Vault
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome, {studentUser?.name}. Search and securely download resources for your courses.</p>
        </div>
        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handleStudentLogout}>
          Sign Out
        </button>
      </div>

      {notification.message && (
        <div style={{
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

      {/* Filter Toolbar */}
      <div className="panel-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search by title, description, or filename..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '1rem' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
            <select className="form-select" value={category} onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}>
              <option value="">All Categories</option>
              <option value="study-materials">Study Materials</option>
              <option value="student-documents">Student Documents</option>
              <option value="assignments">Assignments</option>
              <option value="certificates">Certificates</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Semester</label>
            <select className="form-select" value={semester} onChange={(e) => { setSemester(e.target.value); setCurrentPage(1); }}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Department</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. CSE" 
              value={department} 
              onChange={(e) => { setDepartment(e.target.value); setCurrentPage(1); }} 
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Algorithms" 
              value={subject} 
              onChange={(e) => { setSubject(e.target.value); setCurrentPage(1); }} 
            />
          </div>
        </div>
      </div>

      {/* Loading & Listing Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>Connecting to AWS vault...</p>
      ) : files.length === 0 ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <BookOpen size={36} style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'inline-block' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No documents found matching your search filters.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {files.map(file => (
              <div key={file.id} className="panel-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div>
                  <span className="badge badge-pending" style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>{file.category.replace('-', ' ')}</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{file.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <p><strong>Subject:</strong> {file.subject}</p>
                    <p><strong>Class:</strong> {file.department} · Semester {file.semester}</p>
                    <p><strong>Size:</strong> {formatBytes(file.file_size)}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => setSelectedFile(file)}>
                    Details
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }} onClick={() => handleDownload(file.id, file.original_file_name)}>
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '2.5rem' }}>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Page {currentPage} of {pagination.pages}</span>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage === pagination.pages} 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedFile(null)}>
          <div className="panel-card" style={{ width: '90%', maxWidth: '500px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>{selectedFile.title}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Category</strong>
                <span style={{ color: 'var(--brand-accent)', textTransform: 'capitalize' }}>{selectedFile.category.replace('-', ' ')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Subject</strong>
                <span>{selectedFile.subject}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Class Target</strong>
                <span>{selectedFile.department} (Semester {selectedFile.semester})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>File Size</strong>
                <span>{formatBytes(selectedFile.file_size)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Original Name</strong>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{selectedFile.original_file_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>File Type</strong>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{selectedFile.mime_type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Uploaded On</strong>
                <span>{new Date(selectedFile.uploaded_at).toLocaleDateString()}</span>
              </div>

              {selectedFile.description && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Description</strong>
                  <p style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--border-radius)', fontSize: '0.85rem', color: 'var(--text-primary)', borderLeft: '3px solid var(--brand-primary)', lineHeight: 1.5 }}>
                    {selectedFile.description}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedFile(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { handleDownload(selectedFile.id, selectedFile.original_file_name); setSelectedFile(null); }}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
