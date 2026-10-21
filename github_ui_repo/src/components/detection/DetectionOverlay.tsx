import React from 'react';
import type { DetectedObject } from '@/types';

interface DetectionOverlayProps {
  detections: DetectedObject[];
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  selectedId?: string | null;
  visibleClasses?: Set<string>;
  onSelect?: (detection: DetectedObject) => void;
  showLabels?: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
  selectedId,
  visibleClasses,
  onSelect,
  showLabels = true,
}) => {
  // Calculate scale factors to map image coordinates to container coordinates
  const imageAspect = imageWidth / imageHeight;
  const containerAspect = containerWidth / containerHeight;

  let scale: number;
  let offsetX: number;
  let offsetY: number;

  if (imageAspect > containerAspect) {
    // Image is wider — fit width
    scale = containerWidth / imageWidth;
    offsetX = 0;
    offsetY = (containerHeight - imageHeight * scale) / 2;
  } else {
    // Image is taller — fit height
    scale = containerHeight / imageHeight;
    offsetX = (containerWidth - imageWidth * scale) / 2;
    offsetY = 0;
  }

  return (
    <div className="detection-overlay" aria-label="Detection results overlay">
      {detections.map((det) => {
        if (visibleClasses && !visibleClasses.has(det.classLabel)) return null;

        const left = det.boundingBox.x * scale + offsetX;
        const top = det.boundingBox.y * scale + offsetY;
        const width = det.boundingBox.width * scale;
        const height = det.boundingBox.height * scale;
        const color = det.color ?? '#3B82F6';
        const isSelected = selectedId === det.id;

        return (
          <div
            key={det.id}
            className="detection-box"
            style={{
              left,
              top,
              width,
              height,
              borderColor: color,
              opacity: isSelected ? 1 : 0.8,
              borderWidth: isSelected ? 3 : 2,
              backgroundColor: isSelected ? `${color}15` : 'transparent',
            }}
            onClick={() => onSelect?.(det)}
            role="button"
            tabIndex={0}
            aria-label={`${det.classLabel} — ${(det.confidence * 100).toFixed(0)}% confidence`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.(det);
              }
            }}
          >
            {showLabels && (
              <div className="detection-label" style={{ backgroundColor: color }}>
                {det.classLabel} {(det.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
