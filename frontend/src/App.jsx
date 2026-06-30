import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import AdminPortal from './components/AdminPortal';
import Materials from './components/Materials';
import AdminFiles from './components/AdminFiles';
import { Building, Home, Sparkles, BookOpen, Upload } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'admin-portal' | 'materials' | 'admin-files'

  return (
    <div className="app-root">
      {/* Global Navigation Header */}
      <header className="navbar">
        <div className="logo" onClick={() => setCurrentView('landing')}>
          <div className="logo-symbol">MV</div>
          My<span>Vault</span>
        </div>

        <nav>
          <ul className="nav-menu">
            <li>
              <button 
                className={`sidebar-tab ${currentView === 'landing' ? 'active' : ''}`}
                style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => setCurrentView('landing')}
              >
                <Home size={14} />
                Home
              </button>
            </li>
            <li>
              <button 
                className={`sidebar-tab ${currentView === 'materials' ? 'active' : ''}`}
                style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => setCurrentView('materials')}
              >
                <BookOpen size={14} />
                Study Materials
              </button>
            </li>
            <li>
              <button 
                className={`sidebar-tab ${currentView === 'admin-files' ? 'active' : ''}`}
                style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => setCurrentView('admin-files')}
              >
                <Upload size={14} />
                Upload S3 Files
              </button>
            </li>
            <li>
              <button 
                className={`sidebar-tab ${currentView === 'admin-portal' ? 'active' : ''}`}
                style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => setCurrentView('admin-portal')}
              >
                <Building size={14} />
                Admin Console
              </button>
            </li>
          </ul>
        </nav>

        <div className="nav-actions">
          <button className="btn btn-primary" onClick={() => setCurrentView('admin-portal')}>
            <Building size={14} />
            Admin Portal
          </button>
        </div>
      </header>

      {/* Primary Routing viewports */}
      <main className="view-container">
        {currentView === 'landing' && <LandingPage onNavigate={setCurrentView} />}
        {currentView === 'admin-portal' && <AdminPortal />}
        {currentView === 'materials' && <Materials />}
        {currentView === 'admin-files' && <AdminFiles />}
      </main>
    </div>
  );
}
