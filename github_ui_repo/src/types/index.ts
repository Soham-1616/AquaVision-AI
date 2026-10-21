// ============================================================================
// AquaVision AI — Core Type Definitions
// ============================================================================

// --- Analysis States ---
export type AnalysisStatus =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AnalysisType = 'enhancement' | 'detection' | 'pipeline' | 'video';

// --- Bounding Box ---
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- Detected Object ---
export interface DetectedObject {
  id: string;
  classLabel: string;
  confidence: number;
  boundingBox: BoundingBox;
  color?: string;
}

// --- Image Metrics (Enhancement Quality) ---
export interface ImageMetrics {
  psnr?: number | null;
  ssim?: number | null;
  uiqm?: number | null;
  uciqe?: number | null;
}

// --- Detection Metrics ---
export interface DetectionMetrics {
  precision?: number | null;
  recall?: number | null;
  f1Score?: number | null;
  mAP?: number | null;
  mAP50?: number | null;
  mAP5095?: number | null;
  fps?: number | null;
  inferenceMs?: number | null;
}

// --- Enhancement Options ---
export interface EnhancementOptions {
  method: 'deep_learning' | 'white_balance' | 'clahe' | 'auto';
  quality?: 'low' | 'medium' | 'high';
}

// --- Detection Options ---
export interface DetectionOptions {
  confidenceThreshold: number;
  modelId?: string;
  classFilter?: string[];
  maxDetections?: number;
}

// --- Enhancement Result ---
export interface EnhancementResult {
  enhancedImageUrl: string;
  originalImageUrl: string;
  method: string;
  processingTimeMs: number;
  inputDimensions: { width: number; height: number };
  outputDimensions: { width: number; height: number };
  metrics: ImageMetrics;
  warnings?: string[];
}

// --- Detection Result ---
export interface DetectionResult {
  annotatedImageUrl: string;
  sourceImageUrl: string;
  detections: DetectedObject[];
  totalObjects: number;
  processingTimeMs: number;
  modelId: string;
  confidenceThreshold: number;
  metrics: DetectionMetrics;
  classDistribution: Record<string, number>;
}

// --- Analysis Request ---
export interface AnalysisRequest {
  type: AnalysisType;
  file?: File;
  imageUrl?: string;
  enhancementOptions?: EnhancementOptions;
  detectionOptions?: DetectionOptions;
}

// --- Analysis Session ---
export interface AnalysisSession {
  id: string;
  type: AnalysisType;
  status: AnalysisStatus;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  processingTimeMs?: number;
  originalImageUrl?: string;
  enhancementResult?: EnhancementResult;
  detectionResult?: DetectionResult;
  error?: string;
  isDemo: boolean;
}

// --- Backend Capabilities ---
export interface BackendCapabilities {
  connected: boolean;
  enhancementModels: string[];
  detectionModels: string[];
  supportedFormats: string[];
  maxFileSize: number;
  supportedClasses: string[];
  version?: string;
}

// --- API Error ---
export interface ApiError {
  code: string;
  message: string;
  details?: string;
  statusCode?: number;
}

// --- Pipeline Status ---
export interface PipelineStage {
  name: string;
  status: 'ready' | 'processing' | 'completed' | 'error' | 'unavailable';
  description: string;
}

// --- App Settings ---
export interface AppSettings {
  apiBaseUrl: string;
  defaultEnhancementMethod: EnhancementOptions['method'];
  defaultConfidenceThreshold: number;
  defaultAnalysisPage: string;
  showDemoLabels: boolean;
  imageComparisonMode: 'side-by-side' | 'slider' | 'toggle';
}

// --- Chart data ---
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// --- Navigation Item ---
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
}
