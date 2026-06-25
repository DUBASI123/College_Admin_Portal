import React from 'react';
import { 
  Sparkles, 
  Building, 
  FileText, 
  BookOpen, 
  PlayCircle, 
  Briefcase, 
  Bell, 
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export default function LandingPage({ onNavigate }) {
  return (
    <div className="landing-root">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            <Sparkles size={14} />
            MyVault College Management System
          </div>
          <h1 className="hero-title">
            Centralized Academic &amp; Career<br />
            <span>Portal for College Administrators</span>
          </h1>
          <p className="hero-desc">
            Verify student registrations, upload lecture resources, publish campus placements, and broadcast notification alerts directly to your students' mobile devices from a single web-based admin desk.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => onNavigate('admin-portal')}>
              <Building size={18} />
              Open Admin Console
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '2rem 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-accent)' }}>Real-Time</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Push Notifications to Mobile</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-accent)' }}>100%</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Verified Student Accounts</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-accent)' }}>Academic Hub</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Centralized Resource Directory</p>
          </div>
        </div>
      </section>

      {/* Feature section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Value Proposition</span>
            <h2 className="section-title">Everything managed in one web portal</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FileText size={22} />
              </div>
              <h3>Lecture Notes &amp; PDFs</h3>
              <p>Publish study materials, previous question papers, and slides directly to target departments and semesters.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <BookOpen size={22} />
              </div>
              <h3>Syllabus &amp; e-Books</h3>
              <p>Maintain up-to-date curricula and link reference textbooks for student access.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <PlayCircle size={22} />
              </div>
              <h3>Video Library Links</h3>
              <p>Provide direct links to recorded lectures, lab videos, or external reference classes.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Briefcase size={22} />
              </div>
              <h3>Career Placements</h3>
              <p>Create job and internship postings, establish eligibility requirements, and collect student applications.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Bell size={22} />
              </div>
              <h3>Announcements</h3>
              <p>Send urgent notification broadcasts directly to student phones based on department and year of study.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={22} />
              </div>
              <h3>Registration Approvals</h3>
              <p>Enforce strict security. Only approved student registrations can log into the student mobile application.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Step by Step Workflow */}
      <section className="workflow-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Approval Flow</span>
            <h2 className="section-title">Enforcing Verified Registrations</h2>
          </div>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-badge">1</div>
              <h4>Student Registers</h4>
              <p>Student requests access in the mobile app, providing roll numbers and department details.</p>
            </div>
            <div className="step-card">
              <div className="step-badge">2</div>
              <h4>Pending Queue</h4>
              <p>The student's mobile login is blocked. The request immediately surfaces in the Admin Console.</p>
            </div>
            <div className="step-card">
              <div className="step-badge">3</div>
              <h4>Admin Reviews</h4>
              <p>College administrators verify and either approve or reject the student request.</p>
            </div>
            <div className="step-card">
              <div className="step-badge">4</div>
              <h4>Mobile Access Unlocked</h4>
              <p>Once approved, the student gains full access to all academic hubs and career listings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Architecture Description */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">System Integrations</span>
            <h2 className="section-title">Unified Database. Separate Portals.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '3rem' }}>
            <div className="panel-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Smartphone size={32} style={{ color: 'var(--brand-accent)' }} />
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Student Mobile App</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Separate iOS &amp; Android App</p>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Students log into their dedicated mobile app which automatically calls the central API backend. They can access verified files, browse placement notices, and receive push notifications published by the admin portal.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <li>· Connects securely with JWT tokens</li>
                <li>· Local secure storage for user tokens</li>
                <li>· Firebase push notification integration</li>
              </ul>
            </div>
            <div className="panel-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Building size={32} style={{ color: 'var(--brand-accent)' }} />
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>College Admin Console</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>This Web Workspace Dashboard</p>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Manage college operations. Review student registrations, upload notes, PDFs, or PPTs, list placement drives, and broadcast alerts that are synchronized instantly to the students' mobile devices.
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onNavigate('admin-portal')}>
                Enter Admin Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '3rem 0', background: '#070a10', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <p>© 2026 MyVault Academic &amp; Career Hub. All rights reserved.</p>
        <p style={{ marginTop: '0.5rem' }}>Multi-college verified network architecture.</p>
      </footer>
    </div>
  );
}
