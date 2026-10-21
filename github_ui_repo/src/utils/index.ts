// ============================================================================
// AquaVision AI — Utility Functions
// ============================================================================

/**
 * Generate a unique ID for analysis sessions
 */
export function generateId(): string {
  return `aq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Format a file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format milliseconds to readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a date string to local display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/**
 * Validate a file for image upload
 */
export function validateImageFile(
  file: File,
  maxSize: number = 10 * 1024 * 1024
): { valid: boolean; error?: string } {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported format: ${file.type || 'unknown'}. Please use JPEG, PNG, or WebP.`,
    };
  }
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(maxSize)}).`,
    };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }
  return { valid: true };
}

/**
 * Validate a video file
 */
export function validateVideoFile(
  file: File,
  maxSize: number = 100 * 1024 * 1024
): { valid: boolean; error?: string } {
  const supportedTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const supportedExts = ['mp4', 'webm', 'avi', 'mov', 'mkv'];
  if (!supportedTypes.includes(file.type) && (!ext || !supportedExts.includes(ext))) {
    return {
      valid: false,
      error: `Unsupported video format: ${file.type || ext || 'unknown'}. Please use MP4, WebM, or AVI.`,
    };
  }
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(maxSize)}).`,
    };
  }
  return { valid: true };
}

/**
 * Create an object URL and return a cleanup function
 */
export function createPreviewUrl(file: File): { url: string; revoke: () => void } {
  const url = URL.createObjectURL(file);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}

/**
 * Get image dimensions from a file
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Clamp a number within range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Class name utility (simple cn alternative)
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Delay utility for mock adapter
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get detection class color from a predefined palette
 */
const CLASS_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#06B6D4',
  '#84CC16', '#A855F7', '#0EA5E9', '#10B981', '#F59E0B',
];

export function getClassColor(className: string): string {
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CLASS_COLORS[Math.abs(hash) % CLASS_COLORS.length] ?? '#3B82F6';
}

/**
 * Format a metric value with appropriate precision
 */
export function formatMetric(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(decimals);
}

/**
 * Status to display label mapping
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    idle: 'Ready',
    validating: 'Validating',
    uploading: 'Uploading',
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

/**
 * Status to badge variant mapping
 */
export function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    idle: 'neutral',
    validating: 'info',
    uploading: 'info',
    queued: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning',
  };
  return badges[status] ?? 'neutral';
}
