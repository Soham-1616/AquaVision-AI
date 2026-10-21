import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Video, Upload, Play, Pause, SkipForward, SkipBack,
  AlertTriangle, Settings2, Info, Film, CheckCircle2,
  Download, Eye, Image as ImageIcon, Sparkles, Layers,
} from 'lucide-react';
import { DemoLabel, ProcessingState } from '@/components/feedback/StatusStates';
import { useAppStore } from '@/lib/store';
import { validateVideoFile, formatFileSize, createPreviewUrl, generateId } from '@/utils';
import type { AnalysisStatus } from '@/types';

interface SampleFrame {
  frameNumber: number;
  timestamp: number;
  imageUrl: string;
  detectionCount: number;
  detections: Array<{
    id: string;
    classLabel: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
    color?: string;
  }>;
}

interface VideoAnalysisResult {
  videoUrl: string;
  fileName: string;
  totalFrames: number;
  processedFrames: number;
  samplingRate: number;
  duration: number;
  fps: number;
  dimensions: { width: number; height: number };
  processingTimeMs: number;
  totalObjects: number;
  classDistribution: Record<string, number>;
  sampleFrames: SampleFrame[];
  mode: string;
  enhancementMethod: string;
  confidenceThreshold: number;
}

export const VideoAnalysisPage: React.FC = () => {
  const { isDemo, addSession, updateSession } = useAppStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Processing options
  const [mode, setMode] = useState<'full' | 'detect' | 'enhance'>('full');
  const [sampling, setSampling] = useState<'keyframes' | 'every_10th' | 'every_5th' | 'every'>('keyframes');
  const [enhancementMethod, setEnhancementMethod] = useState<'auto' | 'deep_learning'>('auto');
  const [confidence, setConfidence] = useState<number>(0.35);

  // Result state
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [activeVideoView, setActiveVideoView] = useState<'original' | 'processed'>('original');
  const [selectedFrame, setSelectedFrame] = useState<SampleFrame | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const processedVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const revokeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { revokeRef.current?.(); };
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid video file');
      return;
    }

    revokeRef.current?.();
    const { url, revoke } = createPreviewUrl(file);
    revokeRef.current = revoke;
    setSelectedFile(file);
    setPreviewUrl(url);
    setError(null);
    setStatus('idle');
    setResult(null);
    setSelectedFrame(null);
    setActiveVideoView('original');
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  const handleRemoveFile = useCallback(() => {
    revokeRef.current?.();
    revokeRef.current = null;
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setStatus('idle');
    setResult(null);
    setSelectedFrame(null);
  }, []);

  const togglePlay = useCallback(() => {
    const v = activeVideoView === 'processed' ? processedVideoRef.current : videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
    } else {
      v.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, activeVideoView]);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;
    setStatus('processing');
    setError(null);
    setSelectedFrame(null);

    const sessionId = generateId();
    addSession({
      id: sessionId,
      type: 'video',
      status: 'processing',
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo,
    });

    try {
      if (isDemo) {
        // Simulated demo response
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const mockResult: VideoAnalysisResult = {
          videoUrl: previewUrl || '',
          fileName: selectedFile.name,
          totalFrames: Math.round(duration * 30) || 900,
          processedFrames: 30,
          samplingRate: 30,
          duration: duration || 30,
          fps: 30,
          dimensions: { width: 960, height: 540 },
          processingTimeMs: 3200,
          totalObjects: 18,
          classDistribution: { turtle: 14, fish: 3, cuttlefish: 1 },
          sampleFrames: [],
          mode,
          enhancementMethod,
          confidenceThreshold: confidence,
        };
        setResult(mockResult);
        setStatus('completed');
        updateSession(sessionId, { status: 'completed' });
      } else {
        // Real Backend Call
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('mode', mode);
        formData.append('sampling', sampling);
        formData.append('confidence', confidence.toString());
        formData.append('enhancement_method', enhancementMethod);

        const response = await fetch('/api/analysis/video', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || `Server returned ${response.status}`);
        }

        const data: VideoAnalysisResult = await response.json();
        setResult(data);
        setStatus('completed');
        if (data.sampleFrames && data.sampleFrames.length > 0) {
          setSelectedFrame(data.sampleFrames[0] ?? null);
        }
        if (data.videoUrl) {
          setActiveVideoView('processed');
        }
        updateSession(sessionId, {
          status: 'completed',
          processingTimeMs: data.processingTimeMs,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Video processing failed';
      setError(errMsg);
      setStatus('failed');
      updateSession(sessionId, { status: 'failed', error: errMsg });
    }
  }, [selectedFile, isDemo, mode, sampling, confidence, enhancementMethod, duration, previewUrl, addSession, updateSession]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Video size={22} color="#8B5CF6" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Video Analysis</h1>
          {isDemo && <DemoLabel />}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Frame-by-frame underwater video processing with enhancement and YOLO11s marine object detection.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Main area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upload / Preview */}
          {!selectedFile ? (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Video Input</h2>
              </div>
              <div className="card-body">
                <div
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload a video file"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  <Film size={36} color="var(--color-surface-400)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    Upload an underwater video
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                    MP4, WebM, AVI, MOV · Max 100 MB
                  </div>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload size={14} /> Select Video File
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/avi,video/quicktime,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {error && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-error)', fontSize: 13, padding: '8px 12px', background: '#FEE2E2', borderRadius: 6 }}>
                    <AlertTriangle size={16} />
                    {error}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Video Player Card */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {result ? 'Video Player' : 'Video Preview'}
                    </h2>
                    {result && result.videoUrl && (
                      <div style={{ display: 'inline-flex', background: 'var(--color-surface-100)', borderRadius: 6, padding: 2 }}>
                        <button
                          className={`btn btn-sm ${activeVideoView === 'original' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => { setActiveVideoView('original'); setIsPlaying(false); }}
                        >
                          Original
                        </button>
                        <button
                          className={`btn btn-sm ${activeVideoView === 'processed' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => { setActiveVideoView('processed'); setIsPlaying(false); }}
                        >
                          Processed (Annotated)
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {selectedFile.name} · {formatFileSize(selectedFile.size)}
                    </span>
                    {result?.videoUrl && (
                      <a
                        href={result.videoUrl}
                        download={`annotated_${selectedFile.name}`}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Download size={13} /> Download Output
                      </a>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={handleRemoveFile}>Remove</button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="image-viewer" style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                    {activeVideoView === 'original' || !result?.videoUrl ? (
                      <video
                        ref={videoRef}
                        src={previewUrl ?? undefined}
                        style={{ width: '100%', maxHeight: 420, display: 'block', margin: '0 auto' }}
                        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
                        onEnded={() => setIsPlaying(false)}
                        controls
                      />
                    ) : (
                      <video
                        ref={processedVideoRef}
                        src={result.videoUrl}
                        style={{ width: '100%', maxHeight: 420, display: 'block', margin: '0 auto' }}
                        onTimeUpdate={() => setCurrentTime(processedVideoRef.current?.currentTime ?? 0)}
                        onEnded={() => setIsPlaying(false)}
                        controls
                        autoPlay
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Processing state */}
              {status === 'processing' && (
                <div className="card">
                  <div className="card-body">
                    <ProcessingState
                      title="Analyzing video frames..."
                      description={
                        isDemo
                          ? 'Simulating frame-by-frame analysis (demo)'
                          : 'Applying enhancement and running YOLO11s marine detector across sampled frames...'
                      }
                    />
                  </div>
                </div>
              )}

              {/* Completed state with detailed metrics */}
              {status === 'completed' && result && (
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={18} color="var(--color-success)" />
                      <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Analysis Results</h2>
                    </div>
                    {isDemo && <span className="badge badge-demo" style={{ fontSize: 11 }}>Demo Result</span>}
                  </div>
                  <div className="card-body">
                    {/* Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                      <div className="metric-card">
                        <div className="metric-label">Processed Frames</div>
                        <div className="metric-value small">{result.processedFrames} <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>/ {result.totalFrames}</span></div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>sampling 1 in {result.samplingRate}</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Objects Detected</div>
                        <div className="metric-value small" style={{ color: result.totalObjects > 0 ? 'var(--color-primary)' : 'inherit' }}>
                          {result.totalObjects}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>across processed frames</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Duration & Speed</div>
                        <div className="metric-value small">{formatTime(result.duration)}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{result.fps} FPS video</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Processing Time</div>
                        <div className="metric-value small">{(result.processingTimeMs / 1000).toFixed(1)}s</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {result.processedFrames > 0 ? Math.round(result.processingTimeMs / result.processedFrames) : 0} ms/frame
                        </div>
                      </div>
                    </div>

                    {/* Marine Life Distribution */}
                    {Object.keys(result.classDistribution).length > 0 ? (
                      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-surface-50)', borderRadius: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>
                          Identified Marine Species
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {Object.entries(result.classDistribution).map(([species, count]) => (
                            <span
                              key={species}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 16,
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1E40AF',
                                fontSize: 13,
                                fontWeight: 500,
                              }}
                            >
                              <span style={{ textTransform: 'capitalize' }}>{species}</span>
                              <span style={{ background: '#3B82F6', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                                {count}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'var(--color-surface-50)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        No marine objects met the confidence threshold in the sampled frames.
                      </div>
                    )}

                    {/* Key Analyzed Frames Carousel/Grid */}
                    {result.sampleFrames && result.sampleFrames.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ImageIcon size={16} /> Key Analyzed Frames
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                            (Click a thumbnail to inspect bounding boxes)
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                          {result.sampleFrames.map((frame, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedFrame(frame)}
                              style={{
                                cursor: 'pointer',
                                border: selectedFrame?.frameNumber === frame.frameNumber ? '2px solid var(--color-primary)' : '1px solid var(--color-surface-200)',
                                borderRadius: 6,
                                overflow: 'hidden',
                                background: 'var(--color-surface-100)',
                                transition: 'transform 0.15s ease',
                              }}
                            >
                              <img
                                src={frame.imageUrl}
                                alt={`Frame at ${frame.timestamp}s`}
                                style={{ width: '100%', height: 75, objectFit: 'cover', display: 'block' }}
                              />
                              <div style={{ padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(frame.timestamp)}</span>
                                {frame.detectionCount > 0 ? (
                                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{frame.detectionCount} obj</span>
                                ) : (
                                  <span style={{ color: 'var(--color-text-muted)' }}>0 obj</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Selected Frame Detail Inspector */}
                        {selectedFrame && (
                          <div style={{ marginTop: 14, padding: 12, borderRadius: 8, border: '1px solid var(--color-surface-200)', background: 'var(--color-surface-50)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>
                                Frame at {formatTime(selectedFrame.timestamp)} (Frame #{selectedFrame.frameNumber})
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                {selectedFrame.detectionCount} detection{selectedFrame.detectionCount === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div style={{ borderRadius: 6, overflow: 'hidden', maxHeight: 380, background: '#000' }}>
                              <img
                                src={selectedFrame.imageUrl}
                                alt="Frame preview"
                                style={{ width: '100%', maxHeight: 380, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                              />
                            </div>
                            {selectedFrame.detections && selectedFrame.detections.length > 0 && (
                              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {selectedFrame.detections.map((d, dIdx) => (
                                  <span
                                    key={dIdx}
                                    style={{
                                      fontSize: 12,
                                      padding: '3px 8px',
                                      borderRadius: 4,
                                      background: '#fff',
                                      border: '1px solid var(--color-surface-200)',
                                      display: 'inline-flex',
                                      gap: 4,
                                    }}
                                  >
                                    <strong style={{ textTransform: 'capitalize' }}>{d.classLabel}:</strong>
                                    <span>{(d.confidence * 100).toFixed(0)}%</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {status === 'failed' && error && (
                <div className="card">
                  <div className="card-body">
                    <div style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      padding: '12px 14px', borderRadius: 6, background: '#FEE2E2',
                      fontSize: 13, color: '#991B1B',
                    }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong>Processing Error: </strong>
                        <span>{error}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Settings2 size={16} /> Processing Options
              </h2>
            </div>
            <div className="card-body">
              {/* Pipeline Mode */}
              <div style={{ marginBottom: 16 }}>
                <label className="label">Processing Mode</label>
                <select
                  className="input select"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'full' | 'detect' | 'enhance')}
                  disabled={status === 'processing'}
                >
                  <option value="full">Full Pipeline (Enhance + Detect)</option>
                  <option value="detect">Detection Only</option>
                  <option value="enhance">Enhancement Only</option>
                </select>
              </div>

              {/* Enhancement Method */}
              {mode !== 'detect' && (
                <div style={{ marginBottom: 16 }}>
                  <label className="label">Enhancement Method</label>
                  <select
                    className="input select"
                    value={enhancementMethod}
                    onChange={(e) => setEnhancementMethod(e.target.value as 'auto' | 'deep_learning')}
                    disabled={status === 'processing'}
                  >
                    <option value="auto">White Balance + CLAHE (Fast & Vivid)</option>
                    <option value="deep_learning">U-Net Deep Learning</option>
                  </select>
                </div>
              )}

              {/* Frame Sampling */}
              <div style={{ marginBottom: 16 }}>
                <label className="label">Frame Sampling</label>
                <select
                  className="input select"
                  value={sampling}
                  onChange={(e) => setSampling(e.target.value as 'keyframes' | 'every_10th' | 'every_5th' | 'every')}
                  disabled={status === 'processing'}
                >
                  <option value="keyframes">Key frames (~1 fps, Recommended)</option>
                  <option value="every_10th">Every 10th frame (Balanced)</option>
                  <option value="every_5th">Every 5th frame (Detailed)</option>
                  <option value="every">Every frame (Exhaustive)</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {sampling === 'keyframes' && 'Processes ~1 frame per second. Fast and comprehensive.'}
                  {sampling === 'every_10th' && 'Processes 3 frames per second. High temporal resolution.'}
                  {sampling === 'every_5th' && 'Processes 6 frames per second.'}
                  {sampling === 'every' && 'Processes every single frame (safety capped at 120 frames).'}
                </div>
              </div>

              {/* Confidence Threshold */}
              {mode !== 'enhance' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="label" style={{ margin: 0 }}>Detection Confidence</label>
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
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleProcess}
                disabled={!selectedFile || status === 'processing'}
              >
                <Play size={16} />
                {status === 'processing' ? 'Processing Video...' : 'Process Video'}
              </button>

              {isDemo && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'var(--color-teal-50)', fontSize: 12, color: 'var(--color-teal-600)' }}>
                  <strong>Demo Mode:</strong> Backend not auto-detected. Operating in simulation mode.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Capabilities</h2>
            </div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Color cast removal & CLAHE enhancement</li>
                <li>YOLO11s marine life detector (10 RUOD classes)</li>
                <li>Annotated video rendering & direct download</li>
                <li>Key analyzed frames gallery with bounding boxes</li>
                <li>Per-species detection distribution tracking</li>
              </ul>
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
