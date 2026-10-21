import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles, Settings2, Play, Download, AlertTriangle, Info, ImageIcon,
} from 'lucide-react';
import { FileUpload } from '@/components/upload/FileUpload';
import { ImageComparison } from '@/components/image-viewer/ImageComparison';
import { MetricCard } from '@/components/feedback/MetricCard';
import { ProcessingState, ErrorState, DemoLabel } from '@/components/feedback/StatusStates';
import { useAppStore } from '@/lib/store';
import { mockEnhanceImage, getMockCapabilities } from '@/services/adapters/mock-adapter';
import { createPreviewUrl, getImageDimensions, generateId } from '@/utils';
import type { EnhancementOptions, EnhancementResult, AnalysisStatus } from '@/types';

export const EnhancementPage: React.FC = () => {
  const { isDemo, addSession, updateSession } = useAppStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side-by-side' | 'toggle'>('slider');

  const [options, setOptions] = useState<EnhancementOptions>({
    method: 'auto',
  });

  const revokeRef = useRef<(() => void) | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      revokeRef.current?.();
    };
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    // Revoke previous URL
    revokeRef.current?.();
    const { url, revoke } = createPreviewUrl(file);
    revokeRef.current = revoke;
    setSelectedFile(file);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
    setStatus('idle');
  }, []);

  const handleFileRemove = useCallback(() => {
    revokeRef.current?.();
    revokeRef.current = null;
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setStatus('idle');
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!selectedFile || !previewUrl) return;
    setStatus('validating');
    setError(null);
    setResult(null);

    const sessionId = generateId();
    const now = new Date().toISOString();

    addSession({
      id: sessionId,
      type: 'enhancement',
      status: 'processing',
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      createdAt: now,
      updatedAt: now,
      isDemo,
    });

    try {
      setStatus('processing');
      const dims = await getImageDimensions(selectedFile);

      if (isDemo) {
        const enhanceResult = await mockEnhanceImage(previewUrl, options, dims);
        setResult(enhanceResult);
        setStatus('completed');
        updateSession(sessionId, {
          status: 'completed',
          processingTimeMs: enhanceResult.processingTimeMs,
          enhancementResult: enhanceResult,
          originalImageUrl: previewUrl,
        });
      } else {
        // Real backend API call
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('method', options.method);
        formData.append('quality', options.quality ?? 'high');

        const response = await fetch('/api/analysis/enhance', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
          throw new Error(errBody.detail || errBody.message || 'Enhancement failed');
        }

        const data = await response.json();

        const enhanceResult: EnhancementResult = {
          enhancedImageUrl: data.enhancedImageUrl,
          originalImageUrl: data.originalImageUrl,
          method: data.method,
          processingTimeMs: data.processingTimeMs,
          inputDimensions: data.inputDimensions,
          outputDimensions: data.outputDimensions,
          metrics: data.metrics ?? { psnr: null, ssim: null, uiqm: null, uciqe: null },
          warnings: data.warnings,
        };

        setResult(enhanceResult);
        setStatus('completed');
        updateSession(sessionId, {
          status: 'completed',
          processingTimeMs: enhanceResult.processingTimeMs,
          enhancementResult: enhanceResult,
          originalImageUrl: previewUrl,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enhancement failed.';
      setError(message);
      setStatus('failed');
      updateSession(sessionId, { status: 'failed', error: message });
    }
  }, [selectedFile, previewUrl, options, isDemo, addSession, updateSession]);

  const storeCapabilities = useAppStore.getState().backendCapabilities;
  const capabilities = isDemo ? getMockCapabilities() : (storeCapabilities.connected ? storeCapabilities : getMockCapabilities());

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sparkles size={22} color="var(--color-teal-500)" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Enhancement Lab</h1>
          {isDemo && <DemoLabel />}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Improve underwater image quality through enhancement techniques before object detection.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Main workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upload */}
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
                  title="Enhancing image..."
                  description={isDemo ? 'Simulating enhancement workflow (demo)' : 'Processing with enhancement model'}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'failed' && error && (
            <div className="card">
              <div className="card-body">
                <ErrorState
                  title="Enhancement Failed"
                  message={error}
                  onRetry={handleEnhance}
                />
              </div>
            </div>
          )}

          {/* Results — Image Comparison */}
          {status === 'completed' && result && previewUrl && (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Enhancement Result</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {result.enhancedImageUrl !== previewUrl && (
                    <a
                      href={result.enhancedImageUrl}
                      download={`enhanced_${selectedFile?.name ?? 'image'}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={14} /> Download
                    </a>
                  )}
                </div>
              </div>
              <div className="card-body">
                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    {result.warnings.map((w, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                        padding: '8px 12px', borderRadius: 6,
                        background: '#FEF3C7', fontSize: 13, color: '#92400E',
                        marginBottom: 4,
                      }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <ImageComparison
                  beforeUrl={previewUrl}
                  afterUrl={result.enhancedImageUrl}
                  beforeLabel="Original"
                  afterLabel="Enhanced"
                  mode={comparisonMode}
                  onModeChange={setComparisonMode}
                />
              </div>
            </div>
          )}

          {/* Enhancement Metrics */}
          {status === 'completed' && result && (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Enhancement Metrics</h2>
                <div className="tooltip-wrapper">
                  <Info size={14} color="var(--color-text-muted)" />
                  <div className="tooltip-content" style={{ maxWidth: 280, whiteSpace: 'normal', textAlign: 'left' }}>
                    These metrics are only meaningful when computed from actual model output. In demo mode, they are unavailable.
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <MetricCard
                    label="PSNR"
                    value={result.metrics.psnr}
                    unit="dB"
                    description="Peak Signal-to-Noise Ratio — measures reconstruction quality relative to a reference image. Higher is better. Requires a reference image."
                  />
                  <MetricCard
                    label="SSIM"
                    value={result.metrics.ssim}
                    description="Structural Similarity Index — measures perceived quality comparing luminance, contrast, and structure. Range 0–1, higher is better. Requires a reference image."
                  />
                  <MetricCard
                    label="UIQM"
                    value={result.metrics.uiqm}
                    description="Underwater Image Quality Measure — evaluates colorfulness, sharpness, and contrast of underwater images. No reference needed."
                  />
                  <MetricCard
                    label="UCIQE"
                    value={result.metrics.uciqe}
                    description="Underwater Color Image Quality Evaluation — evaluates chroma, saturation, and luminance contrast. No reference needed."
                  />
                </div>

                {/* Processing details */}
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'var(--color-surface-50)', fontSize: 13 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><span style={{ color: 'var(--color-text-secondary)' }}>Method:</span> {result.method}</div>
                    <div><span style={{ color: 'var(--color-text-secondary)' }}>Time:</span> {result.processingTimeMs}ms</div>
                    <div><span style={{ color: 'var(--color-text-secondary)' }}>Input:</span> {result.inputDimensions.width}×{result.inputDimensions.height}</div>
                    <div><span style={{ color: 'var(--color-text-secondary)' }}>Output:</span> {result.outputDimensions.width}×{result.outputDimensions.height}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar — Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Settings2 size={16} /> Configuration
              </h2>
            </div>
            <div className="card-body">
              {/* Enhancement Method */}
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="enhancement-method">Enhancement Method</label>
                <select
                  id="enhancement-method"
                  className="input select"
                  value={options.method}
                  onChange={(e) => setOptions({ ...options, method: e.target.value as EnhancementOptions['method'] })}
                  disabled={status === 'processing'}
                >
                  <option value="auto">Auto (Backend Default)</option>
                  <option value="deep_learning">Deep Learning</option>
                  <option value="white_balance">White Balance</option>
                  <option value="clahe">CLAHE</option>
                </select>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {options.method === 'deep_learning' && 'Neural network-based enhancement. Requires backend model.'}
                  {options.method === 'white_balance' && 'Classical white balance correction for color cast removal.'}
                  {options.method === 'clahe' && 'Contrast Limited Adaptive Histogram Equalization.'}
                  {options.method === 'auto' && 'Uses the backend\'s default enhancement pipeline.'}
                </div>
              </div>

              {/* Quality */}
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="quality">Processing Quality</label>
                <select
                  id="quality"
                  className="input select"
                  value={options.quality ?? 'medium'}
                  onChange={(e) => setOptions({ ...options, quality: e.target.value as 'low' | 'medium' | 'high' })}
                  disabled={status === 'processing'}
                >
                  <option value="low">Low (Faster)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Slower)</option>
                </select>
              </div>

              {/* Enhance Button */}
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleEnhance}
                disabled={!selectedFile || status === 'processing'}
              >
                <Play size={16} />
                {status === 'processing' ? 'Processing...' : 'Enhance Image'}
              </button>

              {isDemo && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'var(--color-teal-50)', fontSize: 12, color: 'var(--color-teal-600)' }}>
                  <strong>Demo Mode:</strong> No actual enhancement model is running. Results are simulated for interface demonstration.
                </div>
              )}
            </div>
          </div>

          {/* Model Info */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Model Information</h2>
            </div>
            <div className="card-body" style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>Available Models</div>
                {capabilities.enhancementModels.map((m) => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className={`status-dot ${capabilities.connected ? 'connected' : isDemo ? 'demo' : 'disconnected'}`} />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>Supported Formats</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {['JPEG', 'PNG', 'WebP'].map((f) => (
                    <span key={f} className="badge badge-neutral" style={{ fontSize: 11 }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 320px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
