import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles, ScanSearch, Settings2, Play, Download,
  AlertTriangle, Info, CheckCircle2, Sliders, Layers,
  Eye, RefreshCw, ArrowRight,
} from 'lucide-react';
import { FileUpload } from '@/components/upload/FileUpload';
import { ImageComparison } from '@/components/image-viewer/ImageComparison';
import { MetricCard } from '@/components/feedback/MetricCard';
import { ProcessingState, ErrorState, DemoLabel } from '@/components/feedback/StatusStates';
import { useAppStore } from '@/lib/store';
import { mockEnhanceImage, mockDetectObjects } from '@/services/adapters/mock-adapter';
import { createPreviewUrl, getImageDimensions, generateId } from '@/utils';
import type {
  EnhancementResult,
  DetectionResult,
  AnalysisStatus,
} from '@/types';

interface PipelineData {
  originalImageUrl: string;
  inputDimensions: { width: number; height: number };
  enhancementResult?: EnhancementResult;
  detectionOnOriginal?: DetectionResult;
  detectionOnEnhanced?: DetectionResult;
  totalProcessingTimeMs: number;
}

export const ImageProcessingPage: React.FC = () => {
  const { isDemo, backendCapabilities, addSession, updateSession } = useAppStore();

  // File & Input State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Workflow Toggles
  const [enableEnhancement, setEnableEnhancement] = useState<boolean>(true);
  const [enableDetection, setEnableDetection] = useState<boolean>(true);

  // Enhancement Options
  const [enhancementMethod, setEnhancementMethod] = useState<string>('auto');

  // Detection Options
  const [confidence, setConfidence] = useState<number>(0.40);

  // Result State
  const [result, setResult] = useState<PipelineData | null>(null);
  const [activeTab, setActiveTab] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side-by-side' | 'toggle'>('slider');

  const revokeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { revokeRef.current?.(); };
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    revokeRef.current?.();
    const { url, revoke } = createPreviewUrl(file);
    revokeRef.current = revoke;
    setSelectedFile(file);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
    setStatus('idle');
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
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedFile || !previewUrl) return;
    if (!enableEnhancement && !enableDetection) {
      setError('Please enable at least one operation: Image Enhancement or Object Detection.');
      return;
    }

    setStatus('processing');
    setError(null);
    setResult(null);

    const sessionId = generateId();
    const now = new Date().toISOString();
    const sessionType = enableEnhancement && enableDetection ? 'pipeline' : enableEnhancement ? 'enhancement' : 'detection';

    addSession({
      id: sessionId,
      type: sessionType,
      status: 'processing',
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      createdAt: now,
      updatedAt: now,
      isDemo,
    });

    try {
      if (isDemo) {
        // Mock execution
        const dims = imageDims ?? { width: 800, height: 600 };
        let enhRes: EnhancementResult | undefined;
        let detOrigRes: DetectionResult | undefined;
        let detEnhRes: DetectionResult | undefined;

        if (enableEnhancement) {
          enhRes = await mockEnhanceImage(previewUrl, { method: 'auto' }, dims);
        }
        if (enableDetection) {
          detOrigRes = await mockDetectObjects(previewUrl, { confidenceThreshold: confidence }, dims);
          if (enhRes) {
            detEnhRes = await mockDetectObjects(enhRes.enhancedImageUrl, { confidenceThreshold: confidence }, dims);
          }
        }

        const mockPipeline: PipelineData = {
          originalImageUrl: previewUrl,
          inputDimensions: dims,
          enhancementResult: enhRes,
          detectionOnOriginal: detOrigRes,
          detectionOnEnhanced: detEnhRes,
          totalProcessingTimeMs: (enhRes?.processingTimeMs ?? 0) + (detOrigRes?.processingTimeMs ?? 0),
        };

        setResult(mockPipeline);
        setStatus('completed');
        updateSession(sessionId, {
          status: 'completed',
          processingTimeMs: mockPipeline.totalProcessingTimeMs,
          enhancementResult: enhRes,
          detectionResult: detEnhRes ?? detOrigRes,
          originalImageUrl: previewUrl,
        });
      } else {
        // Real Backend Call via /api/analysis/pipeline
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('method', enhancementMethod);
        formData.append('confidence', confidence.toString());
        formData.append('enable_enhancement', enableEnhancement.toString());
        formData.append('enable_detection', enableDetection.toString());

        const response = await fetch('/api/analysis/pipeline', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || `Server returned status ${response.status}`);
        }

        const data: PipelineData = await response.json();
        setResult(data);
        setStatus('completed');

        updateSession(sessionId, {
          status: 'completed',
          processingTimeMs: data.totalProcessingTimeMs,
          enhancementResult: data.enhancementResult,
          detectionResult: data.detectionOnEnhanced ?? data.detectionOnOriginal,
          originalImageUrl: data.originalImageUrl,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      setError(msg);
      setStatus('failed');
      updateSession(sessionId, { status: 'failed', error: msg });
    }
  }, [selectedFile, previewUrl, imageDims, enableEnhancement, enableDetection, enhancementMethod, confidence, isDemo, addSession, updateSession]);

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sparkles size={22} color="var(--color-teal-500)" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Image Processing</h1>
          {isDemo && <DemoLabel />}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Upload an underwater image, enhance its visibility, and detect marine objects in one integrated workflow.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left Column: Workspace & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* File Upload Card */}
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

          {/* Processing State */}
          {status === 'processing' && (
            <div className="card">
              <div className="card-body">
                <ProcessingState
                  title="Processing image..."
                  description={
                    enableEnhancement && enableDetection
                      ? 'Running underwater image enhancement and marine object detection on original & enhanced images...'
                      : enableEnhancement
                      ? 'Applying selected underwater color restoration & contrast enhancement...'
                      : 'Running YOLO11s marine detector on image...'
                  }
                />
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'failed' && error && (
            <div className="card">
              <div className="card-body">
                <ErrorState
                  title="Analysis Failed"
                  message={error}
                  onRetry={handleProcess}
                />
              </div>
            </div>
          )}

          {/* Results: Both Enhancement + Detection */}
          {status === 'completed' && result && enableEnhancement && enableDetection && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={18} color="var(--color-success)" />
                  <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Comparison & Detection Results</h2>
                  <div style={{ display: 'inline-flex', background: 'var(--color-surface-100)', borderRadius: 6, padding: 2 }}>
                    <button
                      className={`btn btn-sm ${activeTab === 'side-by-side' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 8px', fontSize: 12 }}
                      onClick={() => setActiveTab('side-by-side')}
                    >
                      Detections Comparison
                    </button>
                    <button
                      className={`btn btn-sm ${activeTab === 'slider' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '3px 8px', fontSize: 12 }}
                      onClick={() => setActiveTab('slider')}
                    >
                      Raw Enhancement Slider
                    </button>
                  </div>
                </div>

                {/* Downloads */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {result.enhancementResult?.enhancedImageUrl && (
                    <a
                      href={result.enhancementResult.enhancedImageUrl}
                      download={`enhanced_${selectedFile?.name ?? 'image.png'}`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 12 }}
                    >
                      <Download size={13} /> Enhanced Image
                    </a>
                  )}
                  {result.detectionOnEnhanced?.annotatedImageUrl && (
                    <a
                      href={result.detectionOnEnhanced.annotatedImageUrl}
                      download={`detected_enhanced_${selectedFile?.name ?? 'image.png'}`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 12 }}
                    >
                      <Download size={13} /> Detection (Enhanced)
                    </a>
                  )}
                </div>
              </div>

              <div className="card-body">
                {activeTab === 'side-by-side' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Panel A: Original Image */}
                    <div style={{ border: '1px solid var(--color-surface-200)', borderRadius: 8, padding: 12, background: 'var(--color-surface-50)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          Original Image + Detections
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-teal-600)', background: '#E6FFFA', padding: '2px 8px', borderRadius: 12 }}>
                          {result.detectionOnOriginal?.totalObjects ?? 0} objects
                        </span>
                      </div>
                      <div style={{ borderRadius: 6, overflow: 'hidden', background: '#000', maxHeight: 380 }}>
                        <img
                          src={result.detectionOnOriginal?.annotatedImageUrl || result.originalImageUrl}
                          alt="Detection on Original"
                          style={{ width: '100%', maxHeight: 380, objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                      {/* Detected Classes */}
                      {result.detectionOnOriginal && Object.keys(result.detectionOnOriginal.classDistribution).length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {Object.entries(result.detectionOnOriginal.classDistribution).map(([cls, count]) => (
                            <span key={cls} className="badge badge-neutral" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                              {cls}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Panel B: Enhanced Image */}
                    <div style={{ border: '1px solid var(--color-surface-200)', borderRadius: 8, padding: 12, background: 'var(--color-surface-50)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          Enhanced Image + Detections
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 12 }}>
                          {result.detectionOnEnhanced?.totalObjects ?? 0} objects
                        </span>
                      </div>
                      <div style={{ borderRadius: 6, overflow: 'hidden', background: '#000', maxHeight: 380 }}>
                        <img
                          src={result.detectionOnEnhanced?.annotatedImageUrl || result.enhancementResult?.enhancedImageUrl}
                          alt="Detection on Enhanced"
                          style={{ width: '100%', maxHeight: 380, objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                      {/* Detected Classes */}
                      {result.detectionOnEnhanced && Object.keys(result.detectionOnEnhanced.classDistribution).length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {Object.entries(result.detectionOnEnhanced.classDistribution).map(([cls, count]) => (
                            <span key={cls} className="badge badge-neutral" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                              {cls}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {result.enhancementResult && (
                      <ImageComparison
                        beforeUrl={result.originalImageUrl}
                        afterUrl={result.enhancementResult.enhancedImageUrl}
                        beforeLabel="Original"
                        afterLabel="Enhanced"
                        mode={comparisonMode}
                        onModeChange={setComparisonMode}
                      />
                    )}
                  </div>
                )}

                {/* Processing Summary Cards */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Pipeline Execution Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    <div className="metric-card">
                      <div className="metric-label">Enhancement Method</div>
                      <div className="metric-value small" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.enhancementResult?.method ?? '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {result.enhancementResult?.processingTimeMs} ms
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Detections (Original)</div>
                      <div className="metric-value small">{result.detectionOnOriginal?.totalObjects ?? 0}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {result.detectionOnOriginal?.processingTimeMs} ms
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Detections (Enhanced)</div>
                      <div className="metric-value small">{result.detectionOnEnhanced?.totalObjects ?? 0}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {result.detectionOnEnhanced?.processingTimeMs} ms
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Total Execution</div>
                      <div className="metric-value small">{(result.totalProcessingTimeMs / 1000).toFixed(2)}s</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>end-to-end pipeline</div>
                    </div>
                  </div>

                  {/* Research Observation Callout */}
                  <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 6, background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    <Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                    <strong>Observed Outcome: </strong>
                    Original image yielded {result.detectionOnOriginal?.totalObjects ?? 0} detections; enhanced image yielded {result.detectionOnEnhanced?.totalObjects ?? 0} detections.
                    Visibility restoration adjusts contrast and color temperature for marine environments.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results: Enhancement Only */}
          {status === 'completed' && result && enableEnhancement && !enableDetection && result.enhancementResult && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="var(--color-success)" />
                  <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Enhancement Result</h2>
                </div>
                <a
                  href={result.enhancementResult.enhancedImageUrl}
                  download={`enhanced_${selectedFile?.name ?? 'image.png'}`}
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={13} /> Download Enhanced Image
                </a>
              </div>
              <div className="card-body">
                <ImageComparison
                  beforeUrl={result.originalImageUrl}
                  afterUrl={result.enhancementResult.enhancedImageUrl}
                  beforeLabel="Original"
                  afterLabel="Enhanced"
                  mode={comparisonMode}
                  onModeChange={setComparisonMode}
                />
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div className="metric-card">
                    <div className="metric-label">Method</div>
                    <div className="metric-value small">{result.enhancementResult.method}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Processing Time</div>
                    <div className="metric-value small">{result.enhancementResult.processingTimeMs} ms</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Dimensions</div>
                    <div className="metric-value small">{result.inputDimensions.width} × {result.inputDimensions.height}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results: Detection Only */}
          {status === 'completed' && result && !enableEnhancement && enableDetection && result.detectionOnOriginal && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="var(--color-success)" />
                  <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Detection Result</h2>
                </div>
                <a
                  href={result.detectionOnOriginal.annotatedImageUrl}
                  download={`detected_${selectedFile?.name ?? 'image.png'}`}
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={13} /> Download Annotated Image
                </a>
              </div>
              <div className="card-body">
                <div style={{ borderRadius: 8, overflow: 'hidden', background: '#000', maxHeight: 440 }}>
                  <img
                    src={result.detectionOnOriginal.annotatedImageUrl}
                    alt="Detected Objects"
                    style={{ width: '100%', maxHeight: 440, objectFit: 'contain', display: 'block' }}
                  />
                </div>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div className="metric-card">
                    <div className="metric-label">Objects Detected</div>
                    <div className="metric-value small">{result.detectionOnOriginal.totalObjects}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Processing Time</div>
                    <div className="metric-value small">{result.detectionOnOriginal.processingTimeMs} ms</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Confidence Threshold</div>
                    <div className="metric-value small">{(confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
                {Object.keys(result.detectionOnOriginal.classDistribution).length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Detected Marine Organisms:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(result.detectionOnOriginal.classDistribution).map(([cls, cnt]) => (
                        <span key={cls} className="badge badge-neutral" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                          {cls}: {cnt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Configuration & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Settings2 size={16} /> Workflow Configuration
              </h2>
            </div>
            <div className="card-body">
              {/* Operations Toggles */}
              <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--color-surface-50)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                  Processing Stages
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={enableEnhancement}
                    onChange={(e) => setEnableEnhancement(e.target.checked)}
                    disabled={status === 'processing'}
                  />
                  <span>Enable Image Enhancement</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={enableDetection}
                    onChange={(e) => setEnableDetection(e.target.checked)}
                    disabled={status === 'processing'}
                  />
                  <span>Enable Object Detection</span>
                </label>
              </div>

              {/* Enhancement Options */}
              {enableEnhancement && (
                <div style={{ marginBottom: 16 }}>
                  <label className="label">Enhancement Method</label>
                  <select
                    className="input select"
                    value={enhancementMethod}
                    onChange={(e) => setEnhancementMethod(e.target.value)}
                    disabled={status === 'processing'}
                  >
                    <option value="auto">Auto (Best Available Model)</option>
                    <option value="white_balance_clahe">White Balance + CLAHE (Traditional)</option>
                    <option value="white_balance">White Balance Only</option>
                    <option value="clahe">CLAHE Only</option>
                    <option value="unet_l1_ssim">U-Net (L1 + SSIM Loss)</option>
                    <option value="unet_baseline_l1">U-Net Baseline (L1 Loss)</option>
                    <option value="unet_default">U-Net Deep Enhancement</option>
                  </select>
                </div>
              )}

              {/* Detection Options */}
              {enableDetection && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 10 }}>
                    <label className="label">Detection Model</label>
                    <div style={{ fontSize: 13, fontWeight: 500, padding: '7px 10px', background: 'var(--color-surface-100)', borderRadius: 6, color: 'var(--color-text-primary)' }}>
                      YOLO11s Marine Detector (10 RUOD classes)
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="label" style={{ margin: 0 }}>Confidence Threshold</label>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{(confidence * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.85"
                      step="0.05"
                      value={confidence}
                      onChange={(e) => setConfidence(parseFloat(e.target.value))}
                      disabled={status === 'processing'}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Process Button */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                onClick={handleProcess}
                disabled={!selectedFile || (!enableEnhancement && !enableDetection) || status === 'processing'}
              >
                <Play size={16} />
                {status === 'processing' ? 'Processing...' : 'Process Image'}
              </button>

              {!enableEnhancement && !enableDetection && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-warning)', textAlign: 'center' }}>
                  Select at least one operation above.
                </div>
              )}
            </div>
          </div>

          {/* Capabilities Info */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Workflow Features</h2>
            </div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
                <li>Single image upload for both models</li>
                <li>Side-by-side original vs enhanced detection</li>
                <li>U-Net deep learning & WB+CLAHE support</li>
                <li>YOLO11s inference with bounding boxes</li>
                <li>Single unified analysis session recorded</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 340px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
