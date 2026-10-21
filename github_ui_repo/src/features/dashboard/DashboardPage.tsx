import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Video, BarChart3,
  ImageIcon, Layers, Clock, Activity,
  ArrowRight, Waves, ChevronRight, ScanSearch,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { StatCard } from '@/components/feedback/MetricCard';
import { EmptyState, DemoLabel, StatusBadge } from '@/components/feedback/StatusStates';
import { formatDuration, formatRelativeTime } from '@/utils';
import { generateDemoSessions } from '@/services/adapters/mock-adapter';

export const DashboardPage: React.FC = () => {
  const { sessions, isDemo } = useAppStore();

  // Use demo sessions if no real sessions exist and in demo mode
  const displaySessions = useMemo(() => {
    if (sessions.length > 0) return sessions;
    if (isDemo) return generateDemoSessions();
    return [];
  }, [sessions, isDemo]);

  const stats = useMemo(() => {
    const completed = displaySessions.filter((s) => s.status === 'completed');
    return {
      total: displaySessions.length,
      images: displaySessions.filter((s) => s.type !== 'video').length,
      detected: completed.reduce((sum, s) => sum + (s.detectionResult?.totalObjects ?? 0), 0),
      avgTime: completed.length > 0
        ? Math.round(completed.reduce((sum, s) => sum + (s.processingTimeMs ?? 0), 0) / completed.length)
        : 0,
    };
  }, [displaySessions]);

  const recentSessions = displaySessions.slice(0, 5);

  return (
    <div>
      {/* Demo Banner */}
      {isDemo && (
        <div className="demo-banner" style={{ marginBottom: 20 }}>
          <Activity size={16} />
          <span>
            <strong>Demo Mode</strong> — You are viewing the application with sample data. Connect a backend to process real images.
          </span>
        </div>
      )}

      {/* Welcome Section */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #19B5A5, #58D6E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Waves size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
              AquaVision AI
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
              Intelligent Underwater Image Enhancement & Marine Object Detection
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions — Unified Shortcut Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <Link to="/image-processing" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{ padding: 18, cursor: 'pointer', transition: 'all 0.15s ease', borderColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-teal-400)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#E6FFFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={22} color="var(--color-teal-500)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>Process Image</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Enhancement & Marine Detection</div>
              </div>
              <ArrowRight size={16} color="var(--color-surface-400)" />
            </div>
          </div>
        </Link>

        <Link to="/video-analysis" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{ padding: 18, cursor: 'pointer', transition: 'all 0.15s ease', borderColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-teal-400)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={22} color="#8B5CF6" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>Analyze Video</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Frame-by-frame processing</div>
              </div>
              <ArrowRight size={16} color="var(--color-surface-400)" />
            </div>
          </div>
        </Link>

        <Link to="/evaluation" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{ padding: 18, cursor: 'pointer', transition: 'all 0.15s ease', borderColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-teal-400)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={22} color="#F59E0B" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>View Evaluation</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Research metrics & benchmarks</div>
              </div>
              <ArrowRight size={16} color="var(--color-surface-400)" />
            </div>
          </div>
        </Link>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard
          label="Analysis Sessions"
          value={stats.total}
          icon={<Layers size={20} />}
          color="var(--color-teal-500)"
          subtitle={isDemo && sessions.length === 0 ? 'Demo data' : undefined}
        />
        <StatCard
          label="Images Analyzed"
          value={stats.images}
          icon={<ImageIcon size={20} />}
          color="#3B82F6"
          subtitle={isDemo && sessions.length === 0 ? 'Demo data' : undefined}
        />
        <StatCard
          label="Objects Detected"
          value={stats.detected}
          icon={<ScanSearch size={20} />}
          color="#8B5CF6"
          subtitle={isDemo && sessions.length === 0 ? 'Demo data' : undefined}
        />
        <StatCard
          label="Avg. Processing"
          value={stats.avgTime > 0 ? formatDuration(stats.avgTime) : '—'}
          icon={<Clock size={20} />}
          color="#F59E0B"
          subtitle={isDemo && sessions.length === 0 ? 'Demo data' : undefined}
        />
      </div>

      {/* Recent Analysis Section */}
      <div className="card">
        <div className="card-header">
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Recent Analysis</h2>
          <Link to="/history" style={{ fontSize: 13, color: 'var(--color-teal-500)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            View All <ChevronRight size={14} />
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <div className="card-body">
            <EmptyState
              icon={<ImageIcon size={40} />}
              title="No analyses yet"
              description="Upload an underwater image to get started with enhancement or detection."
              action={
                <Link to="/image-processing" className="btn btn-primary btn-sm">
                  <Sparkles size={14} /> Start Analysis
                </Link>
              }
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {session.fileName}
                        </span>
                        {session.isDemo && <DemoLabel compact />}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{session.type}</td>
                    <td><StatusBadge status={session.status} /></td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {formatRelativeTime(session.createdAt)}
                    </td>
                    <td>
                      <Link to={`/history/${session.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
