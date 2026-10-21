import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="empty-state">
    {icon}
    <h3>{title}</h3>
    <p>{description}</p>
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

// --- Processing State ---
interface ProcessingStateProps {
  title?: string;
  description?: string;
  progress?: number;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  title = 'Processing...',
  description,
  progress,
}) => (
  <div style={{ textAlign: 'center', padding: '40px 24px' }}>
    <div className="spinner" style={{ margin: '0 auto 16px' }} />
    <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
    {description && (
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{description}</div>
    )}
    {progress !== undefined && (
      <div style={{ maxWidth: 240, margin: '12px auto 0' }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          {progress.toFixed(0)}%
        </div>
      </div>
    )}
  </div>
);

// --- Error State ---
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
}) => (
  <div style={{ textAlign: 'center', padding: '40px 24px' }}>
    <div style={{
      width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
      background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-error)', fontSize: 24, fontWeight: 700,
    }}>!</div>
    <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 400, margin: '0 auto' }}>
      {message}
    </div>
    {onRetry && (
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onRetry}>
        Try Again
      </button>
    )}
  </div>
);

// --- Demo Label ---
export const DemoLabel: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <span className="badge badge-demo" style={compact ? { fontSize: 10, padding: '1px 6px' } : undefined}>
    Demo
  </span>
);

// --- Status Badge ---
interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  idle: { label: 'Ready', className: 'badge-neutral' },
  validating: { label: 'Validating', className: 'badge-info' },
  uploading: { label: 'Uploading', className: 'badge-info' },
  queued: { label: 'Queued', className: 'badge-warning' },
  processing: { label: 'Processing', className: 'badge-info' },
  completed: { label: 'Completed', className: 'badge-success' },
  failed: { label: 'Failed', className: 'badge-error' },
  cancelled: { label: 'Cancelled', className: 'badge-warning' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] ?? { label: status, className: 'badge-neutral' };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
};
