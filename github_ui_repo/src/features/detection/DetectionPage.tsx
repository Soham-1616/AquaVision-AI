import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScanSearch, Settings2, Play, Eye, EyeOff, Filter, SortAsc,
  AlertTriangle, Info,
} from 'lucide-react';
import { FileUpload } from '@/components/upload/FileUpload';
import { DetectionOverlay } from '@/components/detection/DetectionOverlay';
import { MetricCard } from '@/components/feedback/MetricCard';
import { ProcessingState, ErrorState, DemoLabel } from '@/components/feedback/StatusStates';
import { useAppStore } from '@/lib/store';
import { mockDetectObjects, getMockCapabilities } from '@/services/adapters/mock-adapter';
import { createPreviewUrl, getImageDimensions, generateId, formatMetric } from '@/utils';
import type { DetectionOptions, DetectionResult, DetectedObject, AnalysisStatus } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const DetectionPage: React.FC = () => {
  const { isDemo, addSession, updateSession } = useAppStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<string | null>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [classFilter, setClassFilter] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'confidence' | 'class'>('confidence');
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [annotatedUrl, setAnnotatedUrl] = useState<string | null>(null);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  const revokeRef = useRef<(() => void) | null>(null);

  const [options, setOptions] = useState<DetectionOptions>({
    confidenceThreshold: 0.5,
  });

  useEffect(() => {
    return () => { revokeRef.current?.(); };
  }, []);

  // Track container size
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [result]);

  const handleFileSelect = useCallback((file: File) => {
    revokeRef.current?.();
    const { url, revoke } = createPreviewUrl(file);
    revokeRef.current = revoke;
    setSelectedFile(file);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
    setStatus('idle');
    setSelectedDetection(null);
    getImageDimensions(file).then(setImageDims).catch(() => setImageDims(null));
  }, []);

  const handleFileRemove = useCallback(() => {
    revokeRef.current?.();
    revokeRef.current = null;
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setStatus('idle');
    setImageDims(null);
    setAnnotatedUrl(null);
  }, []);

  const handleDetect = useCallback(async () => {
    if (!selectedFile || !previewUrl || !imageDims) return;
    setStatus('processing');
    setError(null);
    setResult(null);
    setSelectedDetection(null);

    const sessionId = generateId();
    const now = new Date().toISOString();
    addSession({
      id: sessionId, type: 'detection', status: 'processing',
      fileName: selectedFile.name, fileSize: selectedFile.size,
      createdAt: now, updatedAt: now, isDemo,
    });

    try {
      if (isDemo) {
        const detectResult = await mockDetectObjects(previewUrl, options, imageDims);
        setResult(detectResult);
        setStatus('completed');
        // Initialize class filter with all classes
        setClassFilter(new Set(Object.keys(detectResult.classDistribution)));
        updateSession(sessionId, {
          status: 'completed',
          processingTimeMs: detectResult.processingTimeMs,
          detectionResult: detectResult,
          originalImageUrl: previewUrl,
        });
      } else {
        // Real backend API call
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('confidence', options.confidenceThreshold.toString());

        const response = await fetch('/api/analysis/detect', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({ message: 'Detection failed' }));
          throw new Error(errBody.detail || errBody.message || 'Detection failed');
        }

        const data = await response.json();

        const detectResult: DetectionResult = {
          annotatedImageUrl: data.annotatedImageUrl,
          sourceImageUrl: data.sourceImageUrl,
          detections: data.detections ?? [],
          totalObjects: data.totalObjects ?? 0,
          processingTimeMs: data.processingTimeMs,
          modelId: data.modelId ?? 'yolo11s_marine',
          confidenceThreshold: data.confidenceThreshold ?? options.confidenceThreshold,
          metrics: data.metrics ?? {},
          classDistribution: data.classDistribution ?? {},
        };

        setResult(detectResult);
        setAnnotatedUrl(detectResult.annotatedImageUrl || null);
        setStatus('completed');
        setClassFilter(new Set(Object.keys(detectResult.classDistribution)));
        updateSession(sessionId, {
          status: 'completed',
          processingTimeMs: detectResult.processingTimeMs,
          detectionResult: detectResult,
          originalImageUrl: previewUrl,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Detection failed.';
      setError(msg);
      setStatus('failed');
      updateSession(sessionId, { status: 'failed', error: msg });
    }
  }, [selectedFile, previewUrl, imageDims, options, isDemo, addSession, updateSession]);

  // Sort and filter detections
  const filteredDetections = result?.detections
    .filter((d) => classFilter.size === 0 || classFilter.has(d.classLabel))
    .sort((a, b) => sortBy === 'confidence' ? b.confidence - a.confidence : a.classLabel.localeCompare(b.classLabel))
    ?? [];

  // Chart data for class distribution
  const chartData = result ? Object.entries(result.classDistribution).map(([label, count]) => ({
    name: label, count, color: result.detections.find(d => d.classLabel === label)?.color ?? '#3B82F6',
  })) : [];

  const storeCapabilities = useAppStore.getState().backendCapabilities;
  const capabilities = isDemo ? getMockCapabilities() : (storeCapabilities.connected ? storeCapabilities : getMockCapabilities());

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <ScanSearch size={22} color="#3B82F6" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Detection Studio</h1>
          {isDemo && <DemoLabel />}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Identify marine organisms and underwater objects using a YOLO-family detector.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Main workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upload */}
          {!result && (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Input Image</h2>
              </div>
              <div className="card-body">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  selectedFile={selectedFile}
                  previewUrl={previewUrl}
                  disabled={status === 'processing'}
                />
              </div>
            </div>
          )}

          {/* Processing */}
          {status === 'processing' && (
            <div className="card"><div className="card-body">
              <ProcessingState
                title="Running detection..."
                description={isDemo ? 'Generating sample detections (demo)' : 'Running object detection model'}
              />
            </div></div>
          )}

          {/* Error */}
          {status === 'failed' && error && (
            <div className="card"><div className="card-body">
              <ErrorState title="Detection Failed" message={error} onRetry={handleDetect} />
            </div></div>
          )}

          {/* Detection Result View */}
          {status === 'completed' && result && previewUrl && imageDims && (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Detection Results</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isDemo && (
                    <span className="badge badge-demo" style={{ fontSize: 11 }}>Sample Detections</span>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowBoxes(!showBoxes)}
                    aria-label={showBoxes ? 'Hide bounding boxes' : 'Show bounding boxes'}
                  >
                    {showBoxes ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setResult(null); setStatus('idle'); }}
                  >
                    New Detection
                  </button>
                </div>
              </div>
              <div className="card-body">
                {isDemo && (
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    padding: '8px 12px', borderRadius: 6,
                    background: '#FEF3C7', fontSize: 13, color: '#92400E', marginBottom: 12,
                  }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>These are sample detections generated for demonstration. They do not represent actual model predictions for this image.</span>
                  </div>
                )}
                {/* Image with overlay */}
                <div
                  ref={imageContainerRef}
                  className="image-viewer"
                  style={{ position: 'relative', aspectRatio: `${imageDims.width}/${imageDims.height}`, maxHeight: 500 }}
                >
                  <img
                    src={annotatedUrl && !isDemo ? annotatedUrl : previewUrl}
                    alt="Detection result"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  {showBoxes && (
                    <DetectionOverlay
                      detections={filteredDetections}
                      imageWidth={imageDims.width}
                      imageHeight={imageDims.height}
                      containerWidth={containerDims.width}
                      containerHeight={containerDims.height}
                      selectedId={selectedDetection}
                      onSelect={(det) => setSelectedDetection(det.id === selectedDetection ? null : det.id)}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Class Distribution Chart */}
          {status === 'completed' && result && chartData.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Class Distribution</h2>
                {isDemo && <span className="badge badge-demo" style={{ fontSize: 11 }}>Demo</span>}
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip formatter={(v) => [String(v), 'Count']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Configuration */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Settings2 size={16} /> Configuration
              </h2>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="conf-threshold">
                  Confidence Threshold: {options.confidenceThreshold.toFixed(2)}
                </label>
                <input
                  id="conf-threshold"
                  type="range"
                  className="range-slider"
                  min={0.1}
                  max={0.95}
                  step={0.05}
                  value={options.confidenceThreshold}
                  onChange={(e) => setOptions({ ...options, confidenceThreshold: parseFloat(e.target.value) })}
                  disabled={status === 'processing'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <span>0.10</span><span>0.95</span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="model-select">Detection Model</label>
                <select id="model-select" className="input select" disabled>
                  <option>{capabilities.detectionModels[0]}</option>
                </select>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Model selection requires backend connection.
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleDetect}
                disabled={!selectedFile || status === 'processing' || !imageDims}
              >
                <Play size={16} />
                {status === 'processing' ? 'Detecting...' : 'Detect Objects'}
              </button>
            </div>
          </div>

          {/* Detection List */}
          {status === 'completed' && result && (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                  Detections ({filteredDetections.length})
                </h2>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => setSortBy(sortBy === 'confidence' ? 'class' : 'confidence')}
                    title={`Sort by ${sortBy === 'confidence' ? 'class' : 'confidence'}`}
                  >
                    <SortAsc size={14} />
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {filteredDetections.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
                    No detections match current filters.
                  </div>
                ) : (
                  filteredDetections.map((det) => (
                    <div
                      key={det.id}
                      onClick={() => setSelectedDetection(det.id === selectedDetection ? null : det.id)}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--color-surface-100)',
                        cursor: 'pointer',
                        background: selectedDetection === det.id ? 'var(--color-surface-50)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'background 0.1s',
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedDetection(det.id === selectedDetection ? null : det.id); }}
                    >
                      <div style={{
                        width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                        background: det.color ?? '#3B82F6',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{det.classLabel}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {(det.confidence * 100).toFixed(1)}% confidence
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Detection Metrics */}
          {status === 'completed' && result && (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Performance</h2>
              </div>
              <div className="card-body" style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Total Objects</span>
                  <span style={{ fontWeight: 600 }}>{result.totalObjects}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Processing Time</span>
                  <span style={{ fontWeight: 600 }}>{result.processingTimeMs}ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Threshold</span>
                  <span style={{ fontWeight: 600 }}>{(result.confidenceThreshold * 100).toFixed(0)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Model</span>
                  <span style={{ fontWeight: 500, fontSize: 12 }}>{result.modelId}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 340px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
