import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ImageIcon, Clock, FileImage, AlertTriangle, Info,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { StatusBadge, DemoLabel } from '@/components/feedback/StatusStates';
import { MetricCard } from '@/components/feedback/MetricCard';
import { formatDate, formatFileSize, formatDuration, capitalize } from '@/utils';
import { generateDemoSessions } from '@/services/adapters/mock-adapter';

export const HistoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { sessions, isDemo } = useAppStore();

  // Try to find in real sessions first, then demo sessions
  const allSessions = sessions.length > 0 ? sessions : (isDemo ? generateDemoSessions() : []);
  const session = allSessions.find((s) => s.id === id);

  if (!session) {
    return (
      <div>
        <Link to="/history" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to History
        </Link>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 48 }}>
            <ImageIcon size={48} color="var(--color-surface-300)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Session Not Found</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              The analysis session you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/history" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to History
      </Link>

      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: 'var(--color-surface-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileImage size={24} color="var(--color-teal-500)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{session.fileName}</h1>
                <StatusBadge status={session.status} />
                {session.isDemo && <DemoLabel />}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                <span>Type: <strong style={{ textTransform: 'capitalize' }}>{session.type}</strong></span>
                <span>Size: <strong>{formatFileSize(session.fileSize)}</strong></span>
                <span>Created: <strong>{formatDate(session.createdAt)}</strong></span>
                {session.processingTimeMs && (
                  <span>Duration: <strong>{formatDuration(session.processingTimeMs)}</strong></span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error info */}
      {session.error && (
        <div className="card" style={{ marginBottom: 16, borderColor: '#FCA5A5' }}>
          <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Processing Error</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{session.error}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Processing stages */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Processing Stages</h2>
          </div>
          <div className="card-body">
            {[
              { name: 'Input Validation', completed: true },
              { name: 'Image Enhancement', completed: session.type === 'enhancement' || session.type === 'pipeline' },
              { name: 'Object Detection', completed: session.type === 'detection' || session.type === 'pipeline' },
              { name: 'Results Generation', completed: session.status === 'completed' },
            ].map((stage) => (
              <div key={stage.name} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                borderBottom: '1px solid var(--color-surface-100)',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: stage.completed
                    ? (session.status === 'failed' && stage.name === 'Results Generation' ? '#FEE2E2' : '#DCFCE7')
                    : 'var(--color-surface-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                  color: stage.completed
                    ? (session.status === 'failed' && stage.name === 'Results Generation' ? 'var(--color-error)' : 'var(--color-success)')
                    : 'var(--color-text-muted)',
                }}>
                  {stage.completed ? (session.status === 'failed' && stage.name === 'Results Generation' ? '✕' : '✓') : '—'}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{stage.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Configuration</h2>
          </div>
          <div className="card-body" style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Analysis Type</span>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{session.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Status</span>
                <StatusBadge status={session.status} />
              </div>
              {session.enhancementResult && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Enhancement Method</span>
                  <span style={{ fontWeight: 500 }}>{session.enhancementResult.method}</span>
                </div>
              )}
              {session.detectionResult && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Detection Model</span>
                    <span style={{ fontWeight: 500 }}>{session.detectionResult.modelId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Confidence Threshold</span>
                    <span style={{ fontWeight: 500 }}>{(session.detectionResult.confidenceThreshold * 100).toFixed(0)}%</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Demo Mode</span>
                <span style={{ fontWeight: 500 }}>{session.isDemo ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhancement Metrics */}
      {session.enhancementResult && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Enhancement Metrics</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <MetricCard label="PSNR" value={session.enhancementResult.metrics.psnr} unit="dB" description="Peak Signal-to-Noise Ratio" />
              <MetricCard label="SSIM" value={session.enhancementResult.metrics.ssim} description="Structural Similarity Index" />
              <MetricCard label="UIQM" value={session.enhancementResult.metrics.uiqm} description="Underwater Image Quality Measure" />
              <MetricCard label="UCIQE" value={session.enhancementResult.metrics.uciqe} description="Underwater Color Image Quality Evaluation" />
            </div>
          </div>
        </div>
      )}

      {/* Detection Results */}
      {session.detectionResult && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Detection Results</h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div className="metric-card">
                <div className="metric-label">Objects Detected</div>
                <div className="metric-value small">{session.detectionResult.totalObjects}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Processing Time</div>
                <div className="metric-value small">{session.detectionResult.processingTimeMs}ms</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Classes Found</div>
                <div className="metric-value small">{Object.keys(session.detectionResult.classDistribution).length}</div>
              </div>
            </div>

            {/* Class distribution */}
            {Object.keys(session.detectionResult.classDistribution).length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Class Distribution</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(session.detectionResult.classDistribution).map(([cls, count]) => (
                    <span key={cls} className="badge badge-neutral" style={{ fontSize: 12 }}>
                      {cls}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
