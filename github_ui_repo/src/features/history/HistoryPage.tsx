import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  History, Search, Filter, Trash2, AlertTriangle,
  ImageIcon, ChevronRight, ExternalLink,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { DemoLabel, StatusBadge, EmptyState } from '@/components/feedback/StatusStates';
import { formatDate, formatRelativeTime, formatFileSize, formatDuration, capitalize } from '@/utils';
import { generateDemoSessions } from '@/services/adapters/mock-adapter';

export const HistoryPage: React.FC = () => {
  const { sessions, isDemo, removeSession, clearSessions } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Use demo sessions if no real sessions and in demo mode
  const allSessions = useMemo(() => {
    if (sessions.length > 0) return sessions;
    if (isDemo) return generateDemoSessions();
    return [];
  }, [sessions, isDemo]);

  // Filter and sort
  const filteredSessions = useMemo(() => {
    let result = allSessions;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.fileName.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      result = result.filter((s) => s.type === typeFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [allSessions, searchQuery, typeFilter, statusFilter, sortOrder]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <History size={22} color="var(--color-teal-500)" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Analysis History</h1>
          {isDemo && <DemoLabel />}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Browse and manage previous analysis sessions.
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="input"
                type="text"
                placeholder="Search by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 34 }}
                aria-label="Search analysis sessions"
              />
            </div>
          </div>
          <select
            className="input select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: 160 }}
            aria-label="Filter by type"
          >
            <option value="all">All Types</option>
            <option value="enhancement">Enhancement</option>
            <option value="detection">Detection</option>
            <option value="pipeline">Pipeline</option>
            <option value="video">Video</option>
          </select>
          <select
            className="input select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 140 }}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <select
            className="input select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            style={{ width: 130 }}
            aria-label="Sort order"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          {sessions.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowClearConfirm(true)}
              style={{ color: 'var(--color-error)' }}
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Clear confirmation */}
      {showClearConfirm && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--color-error)' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} color="var(--color-error)" />
            <span style={{ flex: 1, fontSize: 14 }}>
              Are you sure you want to clear all analysis history? This cannot be undone.
            </span>
            <button className="btn btn-danger btn-sm" onClick={() => { clearSessions(); setShowClearConfirm(false); }}>
              Clear All
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {filteredSessions.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <EmptyState
              icon={<History size={40} />}
              title="No analysis sessions found"
              description={searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'No sessions match your current filters. Try adjusting the search criteria.'
                : 'Start by uploading an underwater image for enhancement or detection.'}
              action={
                <Link to="/image-processing" className="btn btn-primary btn-sm">
                  Start Analysis
                </Link>
              }
            />
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Objects</th>
                  <th>Duration</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ImageIcon size={16} color="var(--color-surface-400)" />
                        <span style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {session.fileName}
                        </span>
                        {session.isDemo && <DemoLabel compact />}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{session.type}</td>
                    <td><StatusBadge status={session.status} /></td>
                    <td>{session.detectionResult?.totalObjects ?? '—'}</td>
                    <td>{session.processingTimeMs ? formatDuration(session.processingTimeMs) : '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {formatRelativeTime(session.createdAt)}
                    </td>
                    <td>
                      <Link to={`/history/${session.id}`} className="btn btn-ghost btn-sm">
                        <ExternalLink size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-surface-100)', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Showing {filteredSessions.length} of {allSessions.length} sessions
            {isDemo && sessions.length === 0 && ' · Demo data — local history is browser-specific'}
          </div>
        </div>
      )}
    </div>
  );
};
