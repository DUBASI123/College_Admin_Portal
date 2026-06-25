import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Briefcase, 
  Bell, 
  LogOut, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Building, 
  FileText, 
  AlertCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

export default function AdminPortal() {
  const [token, setToken] = useState(localStorage.getItem('myvault_admin_token') || '');
  const [adminUser, setAdminUser] = useState(JSON.parse(localStorage.getItem('myvault_admin_user') || 'null'));
  const [colleges, setColleges] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Form states
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [collegeMode, setCollegeMode] = useState('existing'); // 'create' or 'existing'
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeCode, setNewCollegeCode] = useState('');
  const [newCollegeWebsite, setNewCollegeWebsite] = useState('');
  
  // Dashboard states
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [contentList, setContentList] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  
  // Content upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState('notes');
  const [uploadDeptId, setUploadDeptId] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadSemester, setUploadSemester] = useState('1');
  const [uploadYear, setUploadYear] = useState('1');
  const [uploadFile, setUploadFile] = useState(null);
  
  // Opportunity post state
  const [oppTitle, setOppTitle] = useState('');
  const [oppCompany, setOppCompany] = useState('');
  const [oppDesc, setOppDesc] = useState('');
  const [oppType, setOppType] = useState('job');
  const [oppLocation, setOppLocation] = useState('');
  const [oppSalary, setOppSalary] = useState('');
  const [oppEligibility, setOppEligibility] = useState('');
  const [oppLink, setOppLink] = useState('');
  const [oppDeadline, setOppDeadline] = useState('');
  
  // Notification dispatch state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [noteTargetAll, setNoteTargetAll] = useState(true);
  const [noteTargetYear, setNoteTargetYear] = useState('1');
  const [noteTargetDept, setNoteTargetDept] = useState('');

  // Status/Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch initial colleges
  useEffect(() => {
    fetchColleges();
  }, []);

  // Fetch dashboard data when token is available
  useEffect(() => {
    if (token) {
      fetchAnalytics();
      fetchStudents();
      fetchContent();
      fetchOpportunities();
      fetchNotifications();
      fetchDepartments();
    }
  }, [token, activeTab]);

  const fetchColleges = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/colleges`);
      const data = await res.json();
      if (res.ok) {
        setColleges(data);
        if (data.length > 0) setSelectedCollegeId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load colleges', err);
    }
  };

  const fetchDepartments = async () => {
    if (!adminUser) return;
    try {
      const res = await fetch(`${API_URL}/auth/colleges/${adminUser.college_id}/departments`);
      const data = await res.json();
      if (res.ok) {
        setDepartments(data);
        if (data.length > 0) {
          setUploadDeptId(data[0].id);
          setNoteTargetDept(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setStudents(data);
    } catch (err) {
      console.error('Error fetching students', err);
    }
  };

  const fetchContent = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/content`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setContentList(data);
    } catch (err) {
      console.error('Error fetching content', err);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/opportunities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setOpportunities(data);
    } catch (err) {
      console.error('Error fetching opportunities', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications', err);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const endpoint = isLogin ? '/auth/admin/login' : '/auth/admin/register';
    const payload = isLogin 
      ? { email, password }
      : {
          collegeMode,
          collegeId: selectedCollegeId,
          collegeName: newCollegeName,
          collegeCode: newCollegeCode,
          collegeWebsite: newCollegeWebsite,
          name,
          email,
          password
        };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setToken(data.token);
        setAdminUser(data.admin);
        localStorage.setItem('myvault_admin_token', data.token);
        localStorage.setItem('myvault_admin_user', JSON.stringify(data.admin));
        setSuccessMsg('Logged in successfully!');
        // Refresh college list just in case a new one was added
        fetchColleges();
      } else {
        setErrorMsg(data.error || 'Authentication failed');
      }
    } catch (err) {
      setErrorMsg('Server connection failed. Make sure backend is running.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setAdminUser(null);
    localStorage.removeItem('myvault_admin_token');
    localStorage.removeItem('myvault_admin_user');
  };

  const handleApproveStudent = async (studentId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/students/${studentId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Student request approved.');
        fetchStudents();
        fetchAnalytics();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to approve student');
      }
    } catch (err) {
      setErrorMsg('Failed to process approval.');
    }
  };

  const handleRejectStudent = async (studentId) => {
    setErrorMsg('');
    setSuccessMsg('');
    const reason = prompt('Please enter the rejection reason:');
    if (reason === null) return; // cancelled

    try {
      const res = await fetch(`${API_URL}/admin/students/${studentId}/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        setSuccessMsg('Student request rejected.');
        fetchStudents();
        fetchAnalytics();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to reject student');
      }
    } catch (err) {
      setErrorMsg('Failed to process rejection.');
    }
  };

  const handleContentUpload = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!uploadTitle) {
      setErrorMsg('Please enter a title.');
      return;
    }

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);
    formData.append('contentType', uploadType);
    formData.append('departmentId', uploadDeptId);
    formData.append('subject', uploadSubject);
    formData.append('semester', uploadSemester);
    formData.append('yearTarget', uploadYear);
    if (uploadFile) {
      formData.append('file', uploadFile);
    }

    try {
      const res = await fetch(`${API_URL}/admin/content`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setSuccessMsg('Content uploaded and shared with students.');
        setUploadTitle('');
        setUploadDesc('');
        setUploadSubject('');
        setUploadFile(null);
        fetchContent();
        fetchAnalytics();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to upload content');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to server.');
    }
  };

  const handleDeleteContent = async (id) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/content/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Content removed.');
        fetchContent();
        fetchAnalytics();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to delete content');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    }
  };

  const handlePostOpportunity = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!oppTitle || !oppCompany) {
      setErrorMsg('Title and Company are required.');
      return;
    }

    const payload = {
      title: oppTitle,
      company: oppCompany,
      description: oppDesc,
      type: oppType,
      location: oppLocation,
      salaryRange: oppSalary,
      eligibility: oppEligibility,
      applyLink: oppLink,
      deadline: oppDeadline
    };

    try {
      const res = await fetch(`${API_URL}/admin/opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSuccessMsg('Career opportunity posted successfully.');
        setOppTitle('');
        setOppCompany('');
        setOppDesc('');
        setOppLocation('');
        setOppSalary('');
        setOppEligibility('');
        setOppLink('');
        setOppDeadline('');
        fetchOpportunities();
        fetchAnalytics();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to post opportunity');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    }
  };

  const handleDeleteOpportunity = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/opportunities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Listing removed.');
        fetchOpportunities();
        fetchAnalytics();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to delete listing');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    }
  };

  const handleDispatchNotification = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!noteTitle || !noteBody) {
      setErrorMsg('Title and body are required.');
      return;
    }

    const payload = {
      title: noteTitle,
      body: noteBody,
      type: noteType,
      targetAll: noteTargetAll,
      targetYear: noteTargetYear,
      targetDeptId: noteTargetDept
    };

    try {
      const res = await fetch(`${API_URL}/admin/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSuccessMsg('Notification sent to students.');
        setNoteTitle('');
        setNoteBody('');
        fetchNotifications();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to dispatch notification');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    }
  };

  // If not logged in, show Auth Forms
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-header">
          <Building size={40} className="text-brand" style={{ color: 'var(--brand-accent)', marginBottom: '1rem' }} />
          <h2>MyVault Admin</h2>
          <p>{isLogin ? 'Sign in to manage your campus' : 'Register your college on the platform'}</p>
        </div>

        {errorMsg && (
          <div className="alert-box alert-error">
            <AlertCircle size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuthSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">College Management</label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="collegeMode" 
                      checked={collegeMode === 'existing'}
                      onChange={() => setCollegeMode('existing')}
                    />
                    Existing College
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="collegeMode" 
                      checked={collegeMode === 'create'}
                      onChange={() => setCollegeMode('create')}
                    />
                    Register New College
                  </label>
                </div>
              </div>

              {collegeMode === 'existing' ? (
                <div className="form-group">
                  <label className="form-label">Select College</label>
                  <select 
                    className="form-select"
                    value={selectedCollegeId}
                    onChange={(e) => setSelectedCollegeId(e.target.value)}
                  >
                    {colleges.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.district ? ` — ${c.district}` : ''}{c.college_type ? ` (${c.college_type})` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem', background: 'var(--bg-tertiary)' }}>
                  <div className="form-group">
                    <label className="form-label">New College Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Stanford University"
                      value={newCollegeName}
                      onChange={(e) => setNewCollegeName(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">College Code</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. SU"
                        value={newCollegeCode}
                        onChange={(e) => setNewCollegeCode(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Website</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. stanford.edu"
                        value={newCollegeWebsite}
                        onChange={(e) => setNewCollegeWebsite(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Your Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Dean / Admin Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="admin@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {isLogin ? 'Sign In' : 'Register College & Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an admin portal? " : "Already have an account? "}
          </span>
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isLogin ? 'Register College' : 'Log In'}
          </button>
        </div>
      </div>
    );
  }

  // Dashboard Workspace
  return (
    <div className="portal-splitter">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="logo-symbol">MV</div>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>MyVault</h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Admin Workspace</p>
          </div>
        </div>

        <div style={{ padding: '0.85rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active College:</p>
          <h5 style={{ fontSize: '0.85rem', color: 'var(--brand-accent)', marginTop: '0.2rem' }}>
            {adminUser?.college_name || adminUser?.email?.split('@')[1]?.toUpperCase() || 'Campus Admin'}
          </h5>
        </div>

        <nav className="admin-sidebar-menu">
          <button 
            className={`sidebar-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard Overview
          </button>
          
          <button 
            className={`sidebar-tab ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('approvals')}
          >
            <Users size={18} />
            Student Registrations
            {students.filter(s => s.status === 'pending').length > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--warning)', color: 'black', fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '10px' }}>
                {students.filter(s => s.status === 'pending').length}
              </span>
            )}
          </button>

          <button 
            className={`sidebar-tab ${activeTab === 'academic' ? 'active' : ''}`}
            onClick={() => setActiveTab('academic')}
          >
            <BookOpen size={18} />
            Academic Hub
          </button>

          <button 
            className={`sidebar-tab ${activeTab === 'career' ? 'active' : ''}`}
            onClick={() => setActiveTab('career')}
          >
            <Briefcase size={18} />
            Placement Desk
          </button>

          <button 
            className={`sidebar-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} />
            Notification Broadcasts
          </button>
        </nav>

        <button className="btn btn-secondary" style={{ marginTop: 'auto' }} onClick={handleLogout}>
          <LogOut size={16} />
          Sign Out
        </button>
      </aside>

      {/* Main content pane */}
      <main className="admin-main-container">
        <div className="admin-content-pane">
          
          {/* Messages */}
          {successMsg && (
            <div className="alert-box alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{successMsg}</span>
              <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSuccessMsg('')} />
            </div>
          )}
          {errorMsg && (
            <div className="alert-box alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{errorMsg}</span>
              <X size={14} style={{ cursor: 'pointer' }} onClick={() => setErrorMsg('')} />
            </div>
          )}

          {/* VIEW 1: Dashboard Overview */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700 }}>Welcome back, {adminUser?.name || 'Administrator'}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time statistics of your college catalog and verification systems.</p>
              </div>

              <div className="dashboard-grid">
                <div className="dashboard-stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-accent)' }}>
                    <Users size={24} />
                  </div>
                  <div className="stat-info">
                    <h3>{analytics?.totalStudents || 0}</h3>
                    <p>Total Registered</p>
                  </div>
                </div>

                <div className="dashboard-stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                    <Users size={24} />
                  </div>
                  <div className="stat-info">
                    <h3>{analytics?.pendingStudents || 0}</h3>
                    <p>Pending Approvals</p>
                  </div>
                </div>

                <div className="dashboard-stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                    <BookOpen size={24} />
                  </div>
                  <div className="stat-info">
                    <h3>{analytics?.totalContent || 0}</h3>
                    <p>Academic Resources</p>
                  </div>
                </div>

                <div className="dashboard-stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#c084fc' }}>
                    <Briefcase size={24} />
                  </div>
                  <div className="stat-info">
                    <h3>{analytics?.totalOpps || 0}</h3>
                    <p>Active Job Drives</p>
                  </div>
                </div>
              </div>

              {/* Department breakdown */}
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Department Breakdown</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {analytics?.deptBreakdown?.map(dept => (
                    <div key={dept.department_code} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--brand-accent)', fontWeight: 600 }}>{dept.department_code}</span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.2rem 0' }}>{dept.department_name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dept.student_count} verified students</p>
                    </div>
                  ))}
                  {(!analytics?.deptBreakdown || analytics.deptBreakdown.length === 0) && (
                    <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center' }}>No departments found.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Student Approvals Queue */}
          {activeTab === 'approvals' && (
            <div>
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Student Registration Approvals</h3>
                  <div className="badge badge-pending">
                    Pending Verification: {students.filter(s => s.status === 'pending').length}
                  </div>
                </div>

                <div className="request-list">
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Awaiting Action</h4>
                  {students.filter(s => s.status === 'pending').map(student => (
                    <div className="request-card" key={student.id}>
                      <div className="request-student-info">
                        <h4>{student.name}</h4>
                        <div className="request-student-meta">
                          <span>{student.email}</span>
                          <span>·</span>
                          <span>{student.roll_number || 'No Roll #'}</span>
                          <span>·</span>
                          <span>{student.department_name} (Year {student.year_of_study})</span>
                        </div>
                      </div>
                      <div className="request-actions">
                        <button className="btn btn-success" onClick={() => handleApproveStudent(student.id)}>
                          <Check size={14} /> Approve
                        </button>
                        <button className="btn btn-danger" onClick={() => handleRejectStudent(student.id)}>
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}

                  {students.filter(s => s.status === 'pending').length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      <p>All student registrations have been processed!</p>
                    </div>
                  )}

                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2rem', marginBottom: '0.5rem' }}>Processed Log</h4>
                  {students.filter(s => s.status !== 'pending').map(student => (
                    <div className="request-card" key={student.id} style={{ opacity: 0.75 }}>
                      <div className="request-student-info">
                        <h4>{student.name}</h4>
                        <div className="request-student-meta">
                          <span>{student.email}</span>
                          <span>·</span>
                          <span>{student.department_code} (Yr {student.year_of_study})</span>
                          <span>·</span>
                          <span className={`badge badge-${student.status}`}>{student.status}</span>
                          {student.status === 'rejected' && <span style={{ color: 'var(--error)' }}>Reason: {student.rejection_reason}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: Academic Content Hub */}
          {activeTab === 'academic' && (
            <div>
              {/* Upload form */}
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Upload Study Resources</h3>
                </div>
                <form onSubmit={handleContentUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Material Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. DBMS Lecture Notes - Unit 1"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Description (Optional)</label>
                    <textarea 
                      className="form-input" 
                      style={{ height: '70px', resize: 'none' }}
                      placeholder="Summary of topics covered..."
                      value={uploadDesc}
                      onChange={(e) => setUploadDesc(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Content Type</label>
                    <select 
                      className="form-select"
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                    >
                      <option value="notes">Lecture Notes</option>
                      <option value="pdf">PDF Resource</option>
                      <option value="ppt">PowerPoint Presentation (PPT)</option>
                      <option value="video">Recorded Video Lecture</option>
                      <option value="lab_manual">Lab Practical Manual</option>
                      <option value="syllabus">Syllabus Guide</option>
                      <option value="ebook">e-Book Reference</option>
                      <option value="question_paper">Previous Question Paper</option>
                      <option value="other">Other Material</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Department</label>
                    <select 
                      className="form-select"
                      value={uploadDeptId}
                      onChange={(e) => setUploadDeptId(e.target.value)}
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subject Code / Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. CS-401 / Database Systems"
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Semester</label>
                      <select className="form-select" value={uploadSemester} onChange={(e) => setUploadSemester(e.target.value)}>
                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Target Student Year</label>
                      <select className="form-select" value={uploadYear} onChange={(e) => setUploadYear(e.target.value)}>
                        {[1,2,3,4,5].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Choose Document File (PDF, PPT, DOC) or enter Link URL</label>
                    <input 
                      type="file" 
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      style={{ padding: '0.4rem 0', display: 'block' }}
                    />
                  </div>

                  <button className="btn btn-primary" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <Upload size={16} /> Publish Material
                  </button>
                </form>
              </div>

              {/* Resource List */}
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Published Study Materials</h3>
                </div>
                <div>
                  {(() => {
                    // Group contentList by Subject (subject name + dept + sem)
                    const grouped = contentList.reduce((acc, item) => {
                      const subjectName = item.subject || 'General';
                      const deptCode = item.department_code || item.department_name || 'All';
                      const sem = item.semester || 'N/A';
                      const key = `${subjectName}::${deptCode}::${sem}`;
                      
                      if (!acc[key]) {
                        acc[key] = {
                          subjectName,
                          deptCode,
                          semester: sem,
                          items: []
                        };
                      }
                      acc[key].items.push(item);
                      return acc;
                    }, {});

                    const subjectKeys = Object.keys(grouped);

                    if (subjectKeys.length === 0) {
                      return (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                          No study resources uploaded yet. Fill the form to upload the first file.
                        </p>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {subjectKeys.map(key => {
                          const group = grouped[key];
                          const isExpanded = !!expandedSubjects[key];
                          
                          // Group items by content type
                          const itemsByType = group.items.reduce((typeAcc, item) => {
                            const type = item.content_type || 'other';
                            if (!typeAcc[type]) typeAcc[type] = [];
                            typeAcc[type].push(item);
                            return typeAcc;
                          }, {});

                          const typeKeys = Object.keys(itemsByType);

                          return (
                            <div key={key} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden', padding: 0 }}>
                              {/* Subject Header */}
                              <div 
                                style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  padding: '1rem 1.25rem', 
                                  background: 'rgba(37, 99, 235, 0.03)',
                                  borderBottom: isExpanded ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                  cursor: 'pointer',
                                  userSelect: 'none'
                                }}
                                onClick={() => {
                                  setExpandedSubjects(prev => ({
                                    ...prev,
                                    [key]: !prev[key]
                                  }));
                                }}
                              >
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BookOpen size={18} color="var(--brand-accent)" />
                                    {group.subjectName}
                                  </h4>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    Branch: {group.deptCode} · Semester: {group.semester}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--brand-accent)' }}>
                                    {group.items.length} {group.items.length === 1 ? 'file' : 'files'}
                                  </span>
                                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                                    {isExpanded ? <X size={16} /> : <Plus size={16} />}
                                  </button>
                                </div>
                              </div>

                              {/* Subject Content */}
                              {isExpanded && (
                                <div style={{ padding: '1.25rem' }}>
                                  {typeKeys.map(type => {
                                    const items = itemsByType[type];
                                    
                                    // Get badge styling based on type
                                    let typeColor = '#3b82f6';
                                    if (type === 'notes') { typeColor = '#10b981'; }
                                    if (type === 'video') { typeColor = '#ef4444'; }
                                    if (type === 'syllabus') { typeColor = '#f59e0b'; }
                                    if (type === 'lab_manual') { typeColor = '#06b6d4'; }
                                    if (type === 'question_paper') { typeColor = '#8b5cf6'; }

                                    return (
                                      <div key={type} style={{ marginBottom: '1.25rem' }}>
                                        <h5 style={{ 
                                          margin: '0 0 0.75rem 0', 
                                          fontSize: '0.85rem', 
                                          letterSpacing: '0.05em', 
                                          color: typeColor, 
                                          textTransform: 'uppercase',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px'
                                        }}>
                                          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: typeColor }}></span>
                                          {type.replace('_', ' ')} ({items.length})
                                        </h5>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                          {items.map(item => (
                                            <div 
                                              key={item.id} 
                                              style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                padding: '0.75rem 1rem', 
                                                background: '#f8fafc', 
                                                border: '1px solid #f1f5f9', 
                                                borderRadius: '8px' 
                                              }}
                                            >
                                              <div style={{ flex: 1, paddingRight: '1rem' }}>
                                                <h5 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                  {item.title}
                                                </h5>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                  {item.description || 'No description provided.'}
                                                </p>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                                                  Uploaded by {item.admin_name || 'Admin'} on {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                              </div>
                                              
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {item.file_url && (
                                                  <a 
                                                    href={item.file_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="btn btn-outline"
                                                    style={{ 
                                                      display: 'flex', 
                                                      alignItems: 'center', 
                                                      gap: '4px', 
                                                      padding: '4px 8px', 
                                                      fontSize: '11px',
                                                      borderRadius: '6px',
                                                      border: '1px solid #cbd5e1',
                                                      background: '#fff',
                                                      color: '#475569',
                                                      textDecoration: 'none'
                                                    }}
                                                  >
                                                    <FileText size={12} /> View File
                                                  </a>
                                                )}
                                                <button 
                                                  style={{ 
                                                    padding: '6px', 
                                                    borderRadius: '6px', 
                                                    border: 'none', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#ef4444',
                                                    cursor: 'pointer'
                                                  }} 
                                                  onClick={() => handleDeleteContent(item.id)}
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: Placement Board */}
          {activeTab === 'career' && (
            <div>
              {/* Form */}
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Post Placement / Internship Drive</h3>
                </div>
                <form onSubmit={handlePostOpportunity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Job/Internship Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Software Development Engineer"
                      value={oppTitle}
                      onChange={(e) => setOppTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Google India"
                      value={oppCompany}
                      onChange={(e) => setOppCompany(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Role Description &amp; Responsibilities</label>
                    <textarea 
                      className="form-input" 
                      style={{ height: '70px', resize: 'none' }}
                      placeholder="Write brief description..."
                      value={oppDesc}
                      onChange={(e) => setOppDesc(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Listing Type</label>
                    <select className="form-select" value={oppType} onChange={(e) => setOppType(e.target.value)}>
                      <option value="job">Full-time Job</option>
                      <option value="internship">Internship Drive</option>
                      <option value="placement">Campus Placement Drive</option>
                      <option value="scholarship">Scholarship Drive</option>
                      <option value="competition">Hackathon / Competition</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Bangalore / Remote"
                      value={oppLocation}
                      onChange={(e) => setOppLocation(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Salary / Stipend Range</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 12 - 15 LPA / 40k/mo"
                      value={oppSalary}
                      onChange={(e) => setOppSalary(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Eligibility Criteria</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. B.Tech (CSE/IT) CGPA > 7.5"
                      value={oppEligibility}
                      onChange={(e) => setOppEligibility(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Application / Registration Link</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. https://careers.google.com/jobs"
                      value={oppLink}
                      onChange={(e) => setOppLink(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Registration Deadline</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={oppDeadline}
                      onChange={(e) => setOppDeadline(e.target.value)}
                    />
                  </div>

                  <button className="btn btn-primary" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <Plus size={16} /> Publish Career Drive
                  </button>
                </form>
              </div>

              {/* Career List */}
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Active Placement Opportunities</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {opportunities.map(opp => (
                    <div className="request-card" key={opp.id}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                          {opp.title} <span style={{ color: 'var(--brand-accent)', fontSize: '0.8rem' }}>@ {opp.company}</span>
                        </h4>
                        <div className="request-student-meta" style={{ marginTop: '0.25rem' }}>
                          <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>{opp.type}</span>
                          <span>·</span>
                          <span>Loc: {opp.location || 'N/A'}</span>
                          <span>·</span>
                          <span>Eligibility: {opp.eligibility}</span>
                          <span>·</span>
                          <span style={{ color: 'var(--error)' }}>Deadline: {opp.deadline || 'Open'}</span>
                        </div>
                      </div>
                      <button className="btn btn-danger" style={{ padding: '0.5rem' }} onClick={() => handleDeleteOpportunity(opp.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  {opportunities.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                      No placement opportunities listed. Create a post above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: Notifications Broadcast */}
          {activeTab === 'notifications' && (
            <div>
              {/* Form */}
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Send Notification Broadcast</h3>
                </div>
                <form onSubmit={handleDispatchNotification}>
                  <div className="form-group">
                    <label className="form-label">Notification Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. End Semester Exam Timetable Revised"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Alert Message Body</label>
                    <textarea 
                      className="form-input" 
                      style={{ height: '90px', resize: 'none' }}
                      placeholder="Enter detailed notice information here..."
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Alert Type</label>
                      <select className="form-select" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                        <option value="general">General Broadcast</option>
                        <option value="content">New Material Alert</option>
                        <option value="opportunity">Placement Alert</option>
                        <option value="system">System Message</option>
                        <option value="alert">Critical Announcement</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Target Audience</label>
                      <select 
                        className="form-select" 
                        value={noteTargetAll ? 'all' : 'custom'} 
                        onChange={(e) => setNoteTargetAll(e.target.value === 'all')}
                      >
                        <option value="all">Entire College</option>
                        <option value="custom">Specific Dept / Year</option>
                      </select>
                    </div>

                    {!noteTargetAll && (
                      <div className="form-group">
                        <label className="form-label">Target Student Year</label>
                        <select className="form-select" value={noteTargetYear} onChange={(e) => setNoteTargetYear(e.target.value)}>
                          {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    <Bell size={16} /> Broadcast Notification (Send Push)
                  </button>
                </form>
              </div>

              {/* History */}
              <div className="panel-card">
                <div className="panel-header">
                  <h3>Dispatched Notice Log</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {notifications.map(note => (
                    <div key={note.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--bg-tertiary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{note.title}</h4>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {note.type}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{note.body}</p>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                        <span>Target: {note.target_all ? 'All Students' : `Year ${note.target_year}`}</span>
                        <span>·</span>
                        <span>Sent: {new Date(note.sent_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                      No notices dispatched yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
