import { describe, it, expect } from 'vitest';
import {
  getMockCapabilities,
  mockEnhanceImage,
  mockDetectObjects,
  generateDemoSessions,
} from '../mock-adapter';

describe('Mock Adapter', () => {
  it('returns valid capabilities marked as demo and disconnected', () => {
    const caps = getMockCapabilities();
    expect(caps.connected).toBe(false);
    expect(caps.version).toBe('Demo Mode');
    expect(caps.supportedClasses.length).toBeGreaterThan(0);
    expect(caps.maxFileSize).toBe(10 * 1024 * 1024);
  });

  it('generates demo enhancement result with explicit warnings and null metrics', async () => {
    const res = await mockEnhanceImage(
      'blob:http://localhost/test',
      { method: 'deep_learning' },
      { width: 1920, height: 1080 }
    );

    expect(res.enhancedImageUrl).toBe('blob:http://localhost/test');
    expect(res.metrics.psnr).toBeNull();
    expect(res.metrics.ssim).toBeNull();
    expect(res.warnings?.length).toBeGreaterThan(0);
    expect(res.method).toContain('Demo');
  });

  it('generates mock detections respecting confidence threshold', async () => {
    const res = await mockDetectObjects(
      'blob:http://localhost/test',
      { confidenceThreshold: 0.7 },
      { width: 1280, height: 720 }
    );

    expect(res.modelId).toContain('Demo');
    res.detections.forEach((det) => {
      expect(det.confidence).toBeGreaterThanOrEqual(0.7);
      expect(det.boundingBox.width).toBeGreaterThan(0);
      expect(det.boundingBox.height).toBeGreaterThan(0);
      expect(det.boundingBox.x).toBeGreaterThanOrEqual(0);
      expect(det.boundingBox.y).toBeGreaterThanOrEqual(0);
    });
  });

  it('filters mock detections by class when classFilter is provided', async () => {
    const res = await mockDetectObjects(
      'blob:http://localhost/test',
      { confidenceThreshold: 0.1, classFilter: ['Fish', 'Coral'] },
      { width: 1280, height: 720 }
    );

    res.detections.forEach((det) => {
      expect(['Fish', 'Coral']).toContain(det.classLabel);
    });
  });

  it('generates history sessions with demo flag and valid statuses', () => {
    const sessions = generateDemoSessions();
    expect(sessions.length).toBeGreaterThan(0);
    sessions.forEach((s) => {
      expect(s.isDemo).toBe(true);
      expect(['completed', 'failed', 'processing', 'idle']).toContain(s.status);
    });
  });
});
