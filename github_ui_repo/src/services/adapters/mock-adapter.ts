// ============================================================================
// AquaVision AI — Mock Analysis Adapter
// Provides deterministic sample results for frontend demonstration.
// All results are clearly marked as demonstration data.
// ============================================================================

import type {
  AnalysisSession,
  EnhancementResult,
  DetectionResult,
  DetectedObject,
  EnhancementOptions,
  DetectionOptions,
  ImageMetrics,
  DetectionMetrics,
  BackendCapabilities,
} from '@/types';
import { generateId, delay, getClassColor } from '@/utils';

// --- Demo marine classes (representative, not claimed as trained model output) ---
const DEMO_MARINE_CLASSES = [
  'Sea Turtle',
  'Coral',
  'Fish',
  'Jellyfish',
  'Starfish',
  'Sea Urchin',
  'Crab',
  'Seahorse',
  'Octopus',
  'Ray',
];

// --- Mock capabilities ---
export function getMockCapabilities(): BackendCapabilities {
  return {
    connected: false,
    enhancementModels: ['AquaVision Deep Enhancement (Demo)', 'White Balance', 'CLAHE'],
    detectionModels: ['AquaVision YOLO Marine Detector (Demo)'],
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 10 * 1024 * 1024,
    supportedClasses: DEMO_MARINE_CLASSES,
    version: 'Demo Mode',
  };
}

// --- Generate deterministic mock detections ---
function generateMockDetections(
  imageWidth: number,
  imageHeight: number,
  options: DetectionOptions
): DetectedObject[] {
  // Use a simple deterministic seed based on dimensions
  const seed = (imageWidth * 7 + imageHeight * 13) % 100;
  const numDetections = 3 + (seed % 5); // 3-7 detections
  const detections: DetectedObject[] = [];

  for (let i = 0; i < numDetections; i++) {
    const classIndex = (seed + i * 17) % DEMO_MARINE_CLASSES.length;
    const className = DEMO_MARINE_CLASSES[classIndex]!;
    const confidence = 0.65 + ((seed + i * 11) % 30) / 100;

    if (confidence < options.confidenceThreshold) continue;

    // Generate plausible bounding box positions
    const boxW = 0.08 + ((seed + i * 23) % 15) / 100;
    const boxH = 0.08 + ((seed + i * 29) % 15) / 100;
    const boxX = 0.1 + ((seed + i * 37) % 60) / 100;
    const boxY = 0.1 + ((seed + i * 41) % 60) / 100;

    detections.push({
      id: `det-${i}`,
      classLabel: className,
      confidence: Math.min(confidence, 0.99),
      boundingBox: {
        x: Math.min(boxX, 1 - boxW) * imageWidth,
        y: Math.min(boxY, 1 - boxH) * imageHeight,
        width: boxW * imageWidth,
        height: boxH * imageHeight,
      },
      color: getClassColor(className),
    });
  }

  // Apply class filter if specified
  if (options.classFilter && options.classFilter.length > 0) {
    return detections.filter((d) => options.classFilter!.includes(d.classLabel));
  }

  return detections;
}

// --- Mock enhancement result ---
export async function mockEnhanceImage(
  imageUrl: string,
  _options: EnhancementOptions,
  dimensions: { width: number; height: number }
): Promise<EnhancementResult> {
  // Simulate processing time
  await delay(1500 + Math.random() * 1000);

  // In demo mode, we return the original image as the "enhanced" result
  // since we have no actual enhancement model running.
  // This is explicitly labeled as a demonstration.
  const metrics: ImageMetrics = {
    psnr: null, // Cannot compute without a reference image and actual enhancement
    ssim: null, // Cannot compute without a reference image and actual enhancement
    uiqm: null, // Requires actual enhancement computation
    uciqe: null, // Requires actual enhancement computation
  };

  const methodLabel = _options.method === 'deep_learning'
    ? 'Deep Learning (Demo — no model active)'
    : _options.method === 'white_balance'
      ? 'White Balance (Demo)'
      : _options.method === 'clahe'
        ? 'CLAHE (Demo)'
        : 'Auto (Demo)';

  return {
    enhancedImageUrl: imageUrl, // Same as original — no real enhancement performed
    originalImageUrl: imageUrl,
    method: methodLabel,
    processingTimeMs: 1500 + Math.floor(Math.random() * 1000),
    inputDimensions: dimensions,
    outputDimensions: dimensions,
    metrics,
    warnings: [
      'Demo mode: No enhancement model is active. The displayed image is the original input.',
      'Enhancement metrics are unavailable without actual model processing.',
    ],
  };
}

// --- Mock detection result ---
export async function mockDetectObjects(
  imageUrl: string,
  options: DetectionOptions,
  dimensions: { width: number; height: number }
): Promise<DetectionResult> {
  await delay(1200 + Math.random() * 800);

  const detections = generateMockDetections(
    dimensions.width,
    dimensions.height,
    options
  );

  // Build class distribution
  const classDistribution: Record<string, number> = {};
  detections.forEach((d) => {
    classDistribution[d.classLabel] = (classDistribution[d.classLabel] ?? 0) + 1;
  });

  const metrics: DetectionMetrics = {
    precision: null, // Cannot compute without ground truth
    recall: null,
    f1Score: null,
    mAP: null,
    mAP50: null,
    mAP5095: null,
    fps: null,
    inferenceMs: null,
  };

  return {
    annotatedImageUrl: imageUrl,
    sourceImageUrl: imageUrl,
    detections,
    totalObjects: detections.length,
    processingTimeMs: 1200 + Math.floor(Math.random() * 800),
    modelId: 'AquaVision YOLO Marine Detector (Demo)',
    confidenceThreshold: options.confidenceThreshold,
    metrics,
    classDistribution,
  };
}

// --- Generate demo sessions for history ---
export function generateDemoSessions(): AnalysisSession[] {
  const now = Date.now();
  return [
    {
      id: generateId(),
      type: 'enhancement',
      status: 'completed',
      fileName: 'reef_sample_01.jpg',
      fileSize: 2400000,
      createdAt: new Date(now - 3600000).toISOString(),
      updatedAt: new Date(now - 3500000).toISOString(),
      processingTimeMs: 2100,
      isDemo: true,
    },
    {
      id: generateId(),
      type: 'detection',
      status: 'completed',
      fileName: 'marine_life_02.png',
      fileSize: 3100000,
      createdAt: new Date(now - 7200000).toISOString(),
      updatedAt: new Date(now - 7100000).toISOString(),
      processingTimeMs: 1800,
      isDemo: true,
    },
    {
      id: generateId(),
      type: 'pipeline',
      status: 'completed',
      fileName: 'underwater_scene_03.jpg',
      fileSize: 4200000,
      createdAt: new Date(now - 14400000).toISOString(),
      updatedAt: new Date(now - 14300000).toISOString(),
      processingTimeMs: 3400,
      isDemo: true,
    },
    {
      id: generateId(),
      type: 'enhancement',
      status: 'failed',
      fileName: 'corrupted_image.jpg',
      fileSize: 500,
      createdAt: new Date(now - 21600000).toISOString(),
      updatedAt: new Date(now - 21500000).toISOString(),
      error: 'Demo: Simulated processing failure for demonstration purposes.',
      isDemo: true,
    },
  ];
}
