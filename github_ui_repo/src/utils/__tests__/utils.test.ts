import { describe, it, expect } from 'vitest';
import {
  generateId,
  formatFileSize,
  formatDuration,
  clamp,
  capitalize,
  cn,
  validateImageFile,
  validateVideoFile,
  formatMetric,
  getStatusLabel,
  getStatusBadge,
  getClassColor,
} from '../index';

describe('Utility Functions', () => {
  describe('generateId', () => {
    it('generates a string starting with aq-', () => {
      const id = generateId();
      expect(id).toMatch(/^aq-\d+-[a-z0-9]+$/);
    });

    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('formatFileSize', () => {
    it('handles 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('formats bytes, KB, MB correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024 * 3.5)).toBe('3.5 MB');
    });
  });

  describe('formatDuration', () => {
    it('formats milliseconds and seconds', () => {
      expect(formatDuration(450)).toBe('450ms');
      expect(formatDuration(2500)).toBe('2.5s');
      expect(formatDuration(65000)).toBe('1m 5s');
    });
  });

  describe('clamp', () => {
    it('clamps values correctly within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('capitalize and cn', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('underwater')).toBe('Underwater');
    });

    it('joins class names filtering falsy items', () => {
      expect(cn('btn', false, null, undefined, 'btn-primary')).toBe('btn btn-primary');
    });
  });

  describe('validateImageFile', () => {
    it('rejects unsupported types', () => {
      const fakeFile = new File(['foo'], 'foo.txt', { type: 'text/plain' });
      const res = validateImageFile(fakeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported format');
    });

    it('rejects oversized files', () => {
      const fakeFile = new File(['x'.repeat(100)], 'test.jpg', { type: 'image/jpeg' });
      const res = validateImageFile(fakeFile, 50);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum');
    });

    it('accepts valid jpeg', () => {
      const fakeFile = new File(['valid_bytes'], 'test.jpg', { type: 'image/jpeg' });
      const res = validateImageFile(fakeFile, 1000);
      expect(res.valid).toBe(true);
    });
  });

  describe('validateVideoFile', () => {
    it('rejects unsupported types', () => {
      const fakeFile = new File(['foo'], 'test.gif', { type: 'image/gif' });
      const res = validateVideoFile(fakeFile);
      expect(res.valid).toBe(false);
    });

    it('accepts valid mp4', () => {
      const fakeFile = new File(['video_data'], 'test.mp4', { type: 'video/mp4' });
      const res = validateVideoFile(fakeFile);
      expect(res.valid).toBe(true);
    });
  });

  describe('formatMetric', () => {
    it('formats numbers with given decimals', () => {
      expect(formatMetric(28.456, 2)).toBe('28.46');
      expect(formatMetric(28.456, 1)).toBe('28.5');
    });

    it('returns N/A for null or undefined', () => {
      expect(formatMetric(null)).toBe('N/A');
      expect(formatMetric(undefined)).toBe('N/A');
    });
  });

  describe('getStatusLabel and getStatusBadge', () => {
    it('maps known statuses', () => {
      expect(getStatusLabel('completed')).toBe('Completed');
      expect(getStatusLabel('processing')).toBe('Processing');
      expect(getStatusBadge('completed')).toBe('success');
      expect(getStatusBadge('failed')).toBe('error');
    });
  });

  describe('getClassColor', () => {
    it('returns a valid hex color string', () => {
      const color = getClassColor('fish');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('is deterministic for the same class name', () => {
      expect(getClassColor('jellyfish')).toBe(getClassColor('jellyfish'));
    });
  });
});
