import React, { useState, useEffect } from 'react';
import {
  BarChart3, Info, HelpCircle, ShieldCheck, Target, Sparkles, CheckCircle2,
} from 'lucide-react';
import { DemoLabel, EmptyState } from '@/components/feedback/StatusStates';
import { MetricCard } from '@/components/feedback/MetricCard';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/services/api/api-client';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

// Comprehensive metric definitions
const metricDefinitions: Record<string, { label: string; desc: string; type: 'no-ref' | 'full-ref' | 'detection' }> = {
  UIQM: {
    label: 'Underwater Image Quality Measure',
    desc: 'No-reference metric combining colorfulness (UICM), sharpness (UISM), and contrast (UIConM). Higher indicates superior visual clarity.',
    type: 'no-ref',
  },
  UCIQE: {
    label: 'Underwater Color Image Quality Evaluation',
    desc: 'No-reference metric evaluating chroma variance, luminance contrast, and saturation. Specifically designed for underwater imaging.',
    type: 'no-ref',
  },
  PSNR: {
    label: 'Peak Signal-to-Noise Ratio',
    desc: 'Full-reference metric measuring reconstruction fidelity against a ground-truth paired image. Higher is better. Unit: dB.',
    type: 'full-ref',
  },
  SSIM: {
    label: 'Structural Similarity Index',
    desc: 'Full-reference metric comparing luminance, contrast, and structural correlation with a ground-truth reference image. Range: 0–1.',
    type: 'full-ref',
  },
  Precision: {
    label: 'Precision',
    desc: 'Proportion of true positive detections among all positive predictions made by the detector. Range: 0–1 (or 0–100%).',
    type: 'detection',
  },
  Recall: {
    label: 'Recall',
    desc: 'Proportion of actual marine ground-truth objects successfully detected by the model. Range: 0–1 (or 0–100%).',
    type: 'detection',
  },
  'F1-Score': {
    label: 'F1-Score',
    desc: 'Harmonic mean of Precision and Recall, representing balanced detection accuracy across marine classes.',
    type: 'detection',
  },
  'mAP@0.5': {
    label: 'mAP @ IoU 0.5',
    desc: 'Mean Average Precision across all marine classes at an Intersection-over-Union threshold of 0.50.',
    type: 'detection',
  },
  'mAP@0.5:0.95': {
    label: 'mAP @ IoU 0.5:0.95',
    desc: 'COCO/PASCAL-standard mAP averaged across IoU thresholds from 0.50 to 0.95 with step 0.05.',
    type: 'detection',
  },
  FPS: {
    label: 'Frames Per Second',
    desc: 'Real-time inference throughput indicating the processing speed of the detector.',
    type: 'detection',
  },
};

// Verified Model Benchmarks (RUOD & UIEB datasets)
const DEFAULT_BENCHMARKS = {
  enhancement: {
    model: 'UIEB U-Net Enhancement Network',
    dataset: 'UIEB (Underwater Image Enhancement Benchmark)',
    testSamples: 90,
    psnr: 18.425,
    ssim: 0.779,
    uiqm: 2.7627,
    uciqe: 24.0636,
    description: 'Evaluated on paired ground-truth test split of the Underwater Image Enhancement Benchmark.',
  },
  detection: {
    model: 'YOLO11s Underwater Marine Object Detector',
    dataset: 'RUOD (Real-world Underwater Object Detection)',
    classes: 10,
    precision: 0.8387,
    recall: 0.7699,
    f1Score: 0.8028,
    mAP50: 0.8404,
    mAP5095: 0.5957,
    valBoxLoss: 1.0624,
    valClsLoss: 0.8047,
    description: 'Validation results extracted directly from trained checkpoint metadata (models/detection/best.pt).',
  },
};

export const EvaluationPage: React.FC = () => {
  const { isDemo, sessions } = useAppStore();
  const [activeTab, setActiveTab] = useState<'enhancement' | 'detection'>('enhancement');
  const [benchmarks, setBenchmarks] = useState(DEFAULT_BENCHMARKS);

  // Load benchmark metrics from connected backend if available
  useEffect(() => {
    let isMounted = true;
    apiClient.getBenchmarks()
      .then((data) => {
        if (isMounted && data?.enhancement && data?.detection) {
          setBenchmarks(data);
        }
      })
      .catch(() => {
        // Fallback to verified local constants
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const enhancementSessions = completedSessions.filter((s) => s.enhancementResult);
  const detectionSessions = completedSessions.filter((s) => s.detectionResult);

  const hasEnhancementData = enhancementSessions.length > 0;
  const hasDetectionData = detectionSessions.length > 0;

  // Radar chart data for YOLO11s model performance
  const radarData = [
    { metric: 'Precision', value: Number((benchmarks.detection.precision * 100).toFixed(1)), fullMark: 100 },
    { metric: 'Recall', value: Number((benchmarks.detection.recall * 100).toFixed(1)), fullMark: 100 },
    { metric: 'F1-Score', value: Number((benchmarks.detection.f1Score * 100).toFixed(1)), fullMark: 100 },
    { metric: 'mAP@0.5', value: Number((benchmarks.detection.mAP50 * 100).toFixed(1)), fullMark: 100 },
    { metric: 'mAP@0.5:0.95', value: Number((benchmarks.detection.mAP5095 * 100).toFixed(1)), fullMark: 100 },
  ];

  // Enhancement trend chart data (UIQM & UCIQE)
  const enhancementTrendData = enhancementSessions.map((s, idx) => ({
    name: s.fileName ? (s.fileName.length > 14 ? s.fileName.slice(0, 12) + '...' : s.fileName) : `#${idx + 1}`,
    uiqm: s.enhancementResult?.metrics.uiqm ?? null,
    uciqe: s.enhancementResult?.metrics.uciqe ?? null,
  }));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <BarChart3 size={22} color="#F59E0B" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Evaluation & Benchmarks</h1>
          {isDemo && <DemoLabel />}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Research metrics, session measurements, and dataset validation benchmarks for underwater enhancement and marine detection.
        </p>
      </div>

      {/* Tabs: Strictly Enhancement Metrics & Detection Metrics */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'enhancement' as const, label: 'Enhancement Metrics' },
          { key: 'detection' as const, label: 'Detection Metrics' },
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

      {/* ==================================================================== */}
      {/* TAB 1: ENHANCEMENT METRICS */}
      {/* ==================================================================== */}
      {activeTab === 'enhancement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Section 1: Quality Metrics Reference */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="var(--color-teal-500)" />
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Underwater Image Enhancement Quality Metrics</h2>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {(['UIQM', 'UCIQE', 'PSNR', 'SSIM'] as const).map((m) => {
                  const def = metricDefinitions[m];
                  if (!def) return null;
                  const isNoRef = def.type === 'no-ref';
                  return (
                    <div
                      key={m}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        background: 'var(--color-surface-50)',
                        border: '1px solid var(--color-surface-200)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{m}</span>
                        <span
                          className={`badge ${isNoRef ? 'badge-success' : 'badge-neutral'}`}
                          style={{ fontSize: 10, padding: '2px 6px' }}
                        >
                          {isNoRef ? 'No-Reference (Computed)' : 'Full-Reference'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                        {def.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                        {def.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Model Benchmark Reference (UIEB Dataset) */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} color="var(--color-teal-500)" />
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Model Enhancement Benchmarks (UIEB Test Set)</h2>
              </div>
              <span className="badge badge-success" style={{ fontSize: 11 }}>
                Ground-Truth Validated
              </span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 0, marginBottom: 12 }}>
                Baseline and trained deep-learning enhancement network evaluated against paired ground-truth references from the
                <strong> Underwater Image Enhancement Benchmark (UIEB)</strong>.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <MetricCard
                  label="PSNR (UIEB Test)"
                  value={benchmarks.enhancement.psnr}
                  unit="dB"
                  decimals={2}
                  description="Peak Signal-to-Noise Ratio evaluated against ground-truth clear underwater images."
                />
                <MetricCard
                  label="SSIM (UIEB Test)"
                  value={benchmarks.enhancement.ssim}
                  decimals={3}
                  description="Structural Similarity Index against ground-truth clear underwater images."
                />
                <MetricCard
                  label="UIQM (Benchmark)"
                  value={benchmarks.enhancement.uiqm}
                  decimals={3}
                  description="Underwater Image Quality Measure on enhanced test split."
                />
                <MetricCard
                  label="UCIQE (Benchmark)"
                  value={benchmarks.enhancement.uciqe}
                  decimals={2}
                  description="Underwater Color Image Quality Evaluation on enhanced test split."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Recorded Measurements (Active Sessions) */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Recorded Measurements (Enhanced Sessions)</h2>
              {hasEnhancementData && (
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {enhancementSessions.length} session{enhancementSessions.length > 1 ? 's' : ''} recorded
                </span>
              )}
            </div>
            <div className="card-body">
              {!hasEnhancementData ? (
                <EmptyState
                  icon={<BarChart3 size={40} />}
                  title="No enhancement measurements recorded"
                  description="Process underwater images in the Image Processing workspace with enhancement enabled to calculate real UIQM and UCIQE quality metrics."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  {enhancementSessions.map((s) => {
                    const enh = s.enhancementResult!;
                    const hasPsnr = enh.metrics.psnr !== null && enh.metrics.psnr !== undefined;
                    const hasSsim = enh.metrics.ssim !== null && enh.metrics.ssim !== undefined;
                    const uiqmVal = enh.metrics.uiqm;
                    const uciqeVal = enh.metrics.uciqe;

                    return (
                      <div
                        key={s.id}
                        style={{
                          padding: 14,
                          borderRadius: 8,
                          background: 'var(--color-surface-50)',
                          border: '1px solid var(--color-surface-200)',
                        }}
                      >
                        {/* Session Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--color-text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 160,
                            }}
                            title={s.fileName}
                          >
                            {s.fileName}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                            {enh.method.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Computed Quality Metrics */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--color-surface-100)' }}>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>UIQM (Quality)</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-teal-500)' }}>
                              {uiqmVal !== null && uiqmVal !== undefined ? uiqmVal.toFixed(3) : 'Calculating...'}
                            </div>
                          </div>
                          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--color-surface-100)' }}>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>UCIQE (Color)</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>
                              {uciqeVal !== null && uciqeVal !== undefined ? uciqeVal.toFixed(2) : 'Calculating...'}
                            </div>
                          </div>
                        </div>

                        {/* Reference-Based Metrics (PSNR / SSIM) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--color-surface-200)' }}>
                            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>PSNR:</span>
                            {hasPsnr ? (
                              <span style={{ fontWeight: 600 }}>{enh.metrics.psnr} dB</span>
                            ) : (
                              <div className="tooltip-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Ref. Required</span>
                                <HelpCircle size={11} color="var(--color-text-muted)" />
                                <div className="tooltip-content" style={{ maxWidth: 220, textAlign: 'left', whiteSpace: 'normal' }}>
                                  Full-reference metric. Requires a paired ground-truth clear image.
                                </div>
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--color-surface-200)' }}>
                            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>SSIM:</span>
                            {hasSsim ? (
                              <span style={{ fontWeight: 600 }}>{enh.metrics.ssim}</span>
                            ) : (
                              <div className="tooltip-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Ref. Required</span>
                                <HelpCircle size={11} color="var(--color-text-muted)" />
                                <div className="tooltip-content" style={{ maxWidth: 220, textAlign: 'left', whiteSpace: 'normal' }}>
                                  Full-reference metric. Requires a paired ground-truth clear image.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' }}>
                          Latency: {enh.processingTimeMs}ms
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Enhancement Quality Trends */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Enhancement Quality Trends (UIQM & UCIQE)</h2>
              {isDemo && <span className="badge badge-demo" style={{ fontSize: 11 }}>Demo Mode</span>}
            </div>
            <div className="card-body">
              {!hasEnhancementData ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
                  <div style={{ textAlign: 'center' }}>
                    <BarChart3 size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <div>Trends will appear here once images are enhanced with the backend.</div>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={enhancementTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="left"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 11 }}
                      label={{ value: 'UIQM', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-teal-500)' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 11 }}
                      label={{ value: 'UCIQE', angle: 90, position: 'insideRight', fontSize: 11, fill: '#F59E0B' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        typeof val === 'number' ? val.toFixed(3) : val,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="uiqm"
                      name="UIQM (Image Quality Measure)"
                      stroke="#19B5A5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="uciqe"
                      name="UCIQE (Color & Contrast)"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: DETECTION METRICS */}
      {/* ==================================================================== */}
      {activeTab === 'detection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Section 1: Object Detection Metric Definitions */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} color="var(--color-teal-500)" />
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Marine Object Detection Performance Metrics</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {['Precision', 'Recall', 'F1-Score', 'mAP@0.5', 'mAP@0.5:0.95', 'FPS'].map((m) => {
                  const def = metricDefinitions[m];
                  return (
                    <div
                      key={m}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        background: 'var(--color-surface-50)',
                        border: '1px solid var(--color-surface-200)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{m}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                        {def?.desc ?? 'Performance metric for object detection evaluation.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Model Validation Benchmarks (RUOD Dataset on YOLO11s) */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="var(--color-teal-500)" />
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                  YOLO11s Marine Detector Validation Benchmarks (RUOD Dataset)
                </h2>
              </div>
              <span className="badge badge-success" style={{ fontSize: 11 }}>
                Checkpoint Validated
              </span>
            </div>
            <div className="card-body">
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '10px 14px', borderRadius: 6, background: 'var(--color-surface-50)',
                fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16,
              }}>
                <Info size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-teal-500)' }} />
                <span>
                  Validation metrics evaluated across 10 underwater marine classes using the <strong>RUOD dataset</strong> ground-truth annotations.
                  Values extracted directly from the trained checkpoint: <code>models/detection/best.pt</code>.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                <MetricCard
                  label="Precision"
                  value={benchmarks.detection.precision * 100}
                  unit="%"
                  decimals={1}
                  description="Proportion of true positive detections among all positive predictions."
                />
                <MetricCard
                  label="Recall"
                  value={benchmarks.detection.recall * 100}
                  unit="%"
                  decimals={1}
                  description="Proportion of ground truth objects detected."
                />
                <MetricCard
                  label="F1-Score"
                  value={benchmarks.detection.f1Score * 100}
                  unit="%"
                  decimals={1}
                  description="Harmonic mean of precision and recall."
                />
                <MetricCard
                  label="mAP @ 0.5"
                  value={benchmarks.detection.mAP50 * 100}
                  unit="%"
                  decimals={1}
                  description="Mean Average Precision at IoU threshold 0.50."
                />
                <MetricCard
                  label="mAP @ 0.5:0.95"
                  value={benchmarks.detection.mAP5095 * 100}
                  unit="%"
                  decimals={1}
                  description="COCO-standard mAP averaged across IoU thresholds from 0.50 to 0.95."
                />
                <MetricCard
                  label="Box Loss (Val)"
                  value={benchmarks.detection.valBoxLoss}
                  decimals={3}
                  description="Bounding box regression loss on validation set."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Radar Chart & Throughput Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Radar Chart */}
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Model Performance Radar (%)</h2>
              </div>
              <div className="card-body">
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--color-surface-200)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="RUOD Validation"
                        dataKey="value"
                        stroke="#19B5A5"
                        fill="#19B5A5"
                        fillOpacity={0.25}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip formatter={(val: any) => [`${val}%`, 'Score']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Verified accuracy profile for YOLO11s trained on underwater marine classes.
                </div>
              </div>
            </div>

            {/* Inference Throughput & Latency Info */}
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Inference Performance Overview</h2>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-50)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Detector Architecture</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {benchmarks.detection.model}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-50)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Marine Classes</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-teal-500)' }}>
                      {benchmarks.detection.classes} Classes
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Fish, jellyfish, starfish, shrimp, crab, etc.
                    </div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-50)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Input Resolution</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>
                      640 × 640
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Optimal speed-accuracy tradeoff
                    </div>
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-50)', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  <strong>Ground-Truth Annotation Note:</strong> Single-image uploads evaluate live inference throughput (latency & FPS). Precision, Recall, and mAP require ground-truth annotations and are evaluated over the RUOD benchmark dataset as displayed above.
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Detection Results Summary (Active Sessions) */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Detection Results Summary (Active Sessions)</h2>
              {hasDetectionData && (
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {detectionSessions.length} session{detectionSessions.length > 1 ? 's' : ''} recorded
                </span>
              )}
            </div>
            <div className="card-body">
              {!hasDetectionData ? (
                <EmptyState
                  icon={<BarChart3 size={40} />}
                  title="No detection sessions recorded"
                  description="Run detection on underwater images to view inference throughput, latency, and detected marine object statistics."
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Session / Image</th>
                        <th>Objects Detected</th>
                        <th>Latency</th>
                        <th>Throughput (FPS)</th>
                        <th>Avg Confidence</th>
                        <th>Evaluation Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detectionSessions.map((s) => {
                        const det = s.detectionResult!;
                        const latency = det.processingTimeMs;
                        const fps = det.metrics?.fps ?? (latency > 0 ? Math.round(1000 / latency) : '—');
                        const avgConf = det.detections.length > 0
                          ? (det.detections.reduce((acc, d) => acc + d.confidence, 0) / det.detections.length * 100).toFixed(1) + '%'
                          : '—';

                        return (
                          <tr key={s.id}>
                            <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                              {s.fileName}
                            </td>
                            <td>
                              <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                                {det.totalObjects} object{det.totalObjects !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td>{latency}ms</td>
                            <td style={{ fontWeight: 600, color: 'var(--color-teal-500)' }}>
                              {fps} FPS
                            </td>
                            <td>{avgConf}</td>
                            <td>
                              <div className="tooltip-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span className="badge badge-success" style={{ fontSize: 11 }}>
                                  Inference (RUOD Validated)
                                </span>
                                <HelpCircle size={12} color="var(--color-text-muted)" />
                                <div className="tooltip-content" style={{ maxWidth: 240, textAlign: 'left', whiteSpace: 'normal' }}>
                                  Inference performance recorded from live session. Statistical accuracy is validated against RUOD ground truth (mAP@0.5: 84.0%).
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Live session throughput reflects runtime environment performance. Model accuracy (mAP, Precision, Recall) is benchmarked against RUOD test split ground-truth data.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
