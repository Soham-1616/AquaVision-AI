import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Plus, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/image-processing': 'Image Processing',
  '/enhancement': 'Image Processing',
  '/detection': 'Image Processing',
  '/video-analysis': 'Video Analysis',
  '/evaluation': 'Evaluation',
  '/history': 'Analysis History',
  '/settings': 'Settings',
  '/about': 'About',
};

export const Header: React.FC = () => {
  const location = useLocation();
  const { toggleSidebar, isDemo, backendCapabilities } = useAppStore();
  const isConnected = !isDemo && backendCapabilities.connected;

  // Build breadcrumbs
  const pathParts = location.pathname.split('/').filter(Boolean);
  const pageTitle = routeTitles[location.pathname] ??
    (pathParts.length > 1 ? 'Analysis Details' : 'AquaVision AI');

  return (
    <header className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Mobile menu button */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleSidebar}
          aria-label="Open menu"
          style={{ display: 'none' }}
          id="mobile-menu-btn"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link
            to="/"
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
            }}
          >
            AquaVision
          </Link>
          <ChevronRight size={14} color="var(--color-surface-300)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {pageTitle}
          </span>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Demo indicator */}
        {isDemo && (
          <span className="badge badge-demo" style={{ fontSize: 11 }}>
            Demo Mode
          </span>
        )}

        {/* Backend status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <span className={`status-dot ${isConnected ? 'connected' : isDemo ? 'demo' : 'disconnected'}`} />
          <span className="hidden-mobile">
            {isConnected ? 'Connected' : isDemo ? 'Offline' : 'Disconnected'}
          </span>
        </div>

        {/* New Analysis */}
        <Link to="/image-processing" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span className="hidden-mobile">New Analysis</span>
        </Link>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          #mobile-menu-btn { display: inline-flex !important; }
          .hidden-mobile { display: none; }
        }
      `}</style>
    </header>
  );
};
