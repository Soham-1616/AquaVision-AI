import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  ScanSearch,
  Video,
  BarChart3,
  History,
  Settings,
  Info,
  Waves,
  X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/image-processing', label: 'Image Processing', icon: Sparkles },
  { path: '/video-analysis', label: 'Video Analysis', icon: Video },
  { path: '/evaluation', label: 'Evaluation', icon: BarChart3 },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/about', label: 'About', icon: Info },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, isDemo, backendCapabilities } = useAppStore();
  const isConnected = !isDemo && backendCapabilities.connected;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Main navigation">
        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'linear-gradient(135deg, #19B5A5, #58D6E5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Waves size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  AquaVision AI
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                  Underwater Vision Intelligence
                </div>
              </div>
            </div>
            {/* Mobile close */}
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              style={{ display: 'none', color: 'rgba(255,255,255,0.6)' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)' }}>
            <span
              className={`status-dot ${isConnected ? 'connected' : isDemo ? 'demo' : 'disconnected'}`}
              aria-label={isConnected ? 'Backend connected' : isDemo ? 'Demo mode' : 'Backend disconnected'}
            />
            <span>{isConnected ? 'Backend Connected' : isDemo ? 'Demo Mode' : 'Backend Disconnected'}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
