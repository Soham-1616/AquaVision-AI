import React, { useState } from 'react';
import {
  BarChart3, Info, HelpCircle,
} from 'lucide-react';
import { DemoLabel, EmptyState } from '@/components/feedback/StatusStates';
import { MetricCard } from '@/components/feedback/MetricCard';
import { useAppStore } from '@/lib/store';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';

// Metric definitions for tooltips
const metricDefinitions: Record<string, string> = {
  PSNR: 'Peak Signal-to-Noise Ratio — measures reconstruction quality relative to a reference. Higher is better. Unit: dB.',
  SSIM: 'Structural Similarity Index — compares luminance, contrast, and structure. Range 0–1.',
  UIQM: 'Underwater Image Quality Measure — evaluates colorfulness, sharpness, and contrast. No reference needed.',
  UCIQE: 'Underwater Color Image Quality Evaluation — evaluates chroma, saturation, and luminance contrast. No reference needed.',
  Precision: 'Proportion of true positive detections among all positive predictions. Range 0–1.',
  Recall: 'Proportion of true positive detections among all actual objects. Range 0–1.',
  'F1-Score': 'Harmonic mean of Precision and Recall. Range 0–1.',
  mAP: 'Mean Average Precision — area under precision-recall curve averaged over classes.',
  'mAP@0.5': 'mAP at IoU threshold 0.5.',
  'mAP@0.5:0.95': 'mAP averaged over IoU thresholds from 0.5 to 0.95 in steps of 0.05.',
  FPS: 'Frames Per Second — inference throughput.',
};

export const EvaluationPage: React.FC = () => {
  const { isDemo, sessions } = useAppStore();
  const [activeTab, setActiveTab] = useState<'enhancement' | 'detection' | 'comparison'>('enhancement');

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const hasData = completedSessions.length > 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <BarChart3 size={22} color="#F59E0B" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Evaluation</h1>
          {isDemo && <DemoLabel />}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Research metrics and performance evaluation for enhancement and detection.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'enhancement' as const, label: 'Enhancement Metrics' },
          { key: 'detection' as const, label: 'Detection Metrics' },
          { key: 'comparison' as const, label: 'Comparative Analysis' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enhancement Metrics Tab */}
      {activeTab === 'enhancement' && (
        <div>
          {/* Metric Definitions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Image Enhancement Quality Metrics</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {['PSNR', 'SSIM', 'UIQM', 'UCIQE'].map((m) => (
                  <div key={m} style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{m}</span>
                      <div className="tooltip-wrapper">
                        <HelpCircle size={13} color="var(--color-text-muted)" />
                        <div className="tooltip-content" style={{ maxWidth: 260, whiteSpace: 'normal', textAlign: 'left' }}>
                          {metricDefinitions[m]}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {metricDefinitions[m]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actual metric values */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Recorded Measurements</h2>
            </div>
            <div className="card-body">
              {!hasData ? (
                <EmptyState
                  icon={<BarChart3 size={40} />}
                  title="No evaluation data available"
                  description="Enhancement metrics will appear here after processing images with a connected backend. Demo mode does not produce actual metric values."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  {completedSessions
                    .filter((s) => s.enhancementResult)
                    .slice(0, 6)
                    .map((s) => (
                      <div key={s.id} style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-50)' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.fileName}
                        </div>
                        <MetricCard label="PSNR" value={s.enhancementResult?.metrics.psnr} unit="dB" size="small" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Placeholder chart */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Enhancement Quality Trends</h2>
              {isDemo && <span className="badge badge-demo" style={{ fontSize: 11 }}>No data</span>}
            </div>
            <div className="card-body">
              {!hasData ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                  <div style={{ textAlign: 'center' }}>
                    <BarChart3 size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <div>Chart data requires completed analyses with actual metric values.</div>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={completedSessions.filter(s => s.enhancementResult).map((s, i) => ({
                    name: `#${i + 1}`,
                    psnr: s.enhancementResult?.metrics.psnr ?? null,
                    ssim: s.enhancementResult?.metrics.ssim ? s.enhancementResult.metrics.ssim * 100 : null,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="psnr" name="PSNR (dB)" stroke="#19B5A5" strokeWidth={2} connectNulls={false} />
                    <Line type="monotone" dataKey="ssim" name="SSIM (×100)" stroke="#3B82F6" strokeWidth={2} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detection Metrics Tab */}
      {activeTab === 'detection' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Object Detection Performance Metrics</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {['Precision', 'Recall', 'F1-Score', 'mAP', 'mAP@0.5', 'mAP@0.5:0.95', 'FPS'].map((m) => (
                  <div key={m} style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{m}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {metricDefinitions[m] ?? 'Performance metric for object detection evaluation.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detection metrics from sessions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Detection Results Summary</h2>
            </div>
            <div className="card-body">
              {!hasData ? (
                <EmptyState
                  icon={<BarChart3 size={40} />}
                  title="No detection evaluation data"
                  description="Detection metrics (Precision, Recall, F1, mAP) require ground truth annotations and a connected backend for computation."
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Objects</th>
                        <th>Time</th>
                        <th>Precision</th>
                        <th>Recall</th>
                        <th>mAP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSessions.filter(s => s.detectionResult).map((s) => (
                        <tr key={s.id}>
                          <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.fileName}</td>
                          <td>{s.detectionResult?.totalObjects ?? '—'}</td>
                          <td>{s.detectionResult?.processingTimeMs ?? '—'}ms</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>N/A</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>N/A</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>N/A</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Precision, Recall, and mAP require ground truth annotations for computation.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Radar chart placeholder */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Model Performance Radar</h2>
              {isDemo && <span className="badge badge-demo" style={{ fontSize: 11 }}>Sample visualization</span>}
            </div>
            <div className="card-body">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { metric: 'Precision', value: 0, fullMark: 1 },
                    { metric: 'Recall', value: 0, fullMark: 1 },
                    { metric: 'F1-Score', value: 0, fullMark: 1 },
                    { metric: 'mAP@0.5', value: 0, fullMark: 1 },
                    { metric: 'mAP@0.5:0.95', value: 0, fullMark: 1 },
                  ]}>
                    <PolarGrid stroke="var(--color-surface-200)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fontSize: 10 }} />
                    <Radar name="Performance" dataKey="value" stroke="#19B5A5" fill="#19B5A5" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
                Radar chart will populate when detection metrics are available from the backend.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Comparative Analysis</h2>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '10px 14px', borderRadius: 6, background: 'var(--color-surface-50)',
                  fontSize: 13, color: 'var(--color-text-secondary)',
                }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    Comparative analysis requires multiple experiment runs with both raw and enhanced inputs.
                    This section will display side-by-side comparisons of detection performance on original versus enhanced images
                    once both result sets are available.
                  </span>
                </div>
              </div>

              {/* Comparison framework */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ padding: 16, borderRadius: 8, background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Original Image Detection</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Detection results on unprocessed underwater images
                  </div>
                  <div className="metric-value small" style={{ marginTop: 12, color: 'var(--color-text-muted)' }}>—</div>
                </div>
                <div style={{ padding: 16, borderRadius: 8, background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Enhanced Image Detection</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Detection results on enhanced underwater images
                  </div>
                  <div className="metric-value small" style={{ marginTop: 12, color: 'var(--color-text-muted)' }}>—</div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <strong>Supported comparisons:</strong>
                <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Detection count: original vs. enhanced</li>
                  <li>Average confidence scores comparison</li>
                  <li>Class-level detection differences</li>
                  <li>Processing latency comparison</li>
                  <li>Enhancement quality metrics per experiment</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
