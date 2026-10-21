import React, { useCallback, useRef, useState, useEffect } from 'react';
import { GripVertical, Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { clamp } from '@/utils';

interface ImageComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  mode?: 'slider' | 'side-by-side' | 'toggle';
  onModeChange?: (mode: 'slider' | 'side-by-side' | 'toggle') => void;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Original',
  afterLabel = 'Enhanced',
  mode = 'slider',
  onModeChange,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showBefore, setShowBefore] = useState(true);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = clamp((x / rect.width) * 100, 0, 100);
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      handleSliderMove(e.clientX);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const touch = e.touches[0];
      if (touch) handleSliderMove(touch.clientX);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleSliderMove]);

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="tabs" style={{ borderBottom: 'none', gap: 0 }}>
          {(['slider', 'side-by-side', 'toggle'] as const).map((m) => (
            <button
              key={m}
              className={`tab ${mode === m ? 'active' : ''}`}
              onClick={() => onModeChange?.(m)}
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              {m === 'slider' ? 'Slider' : m === 'side-by-side' ? 'Side by Side' : 'Toggle'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(z => Math.min(3, z + 0.25))} aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setZoom(1)} aria-label="Reset zoom">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Image display */}
      {mode === 'slider' && (
        <div
          ref={containerRef}
          className="comparison-slider image-viewer"
          style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* After image (full) */}
          <img
            src={afterUrl}
            alt={afterLabel}
            className="after-image"
            style={{ width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${zoom})` }}
          />
          {/* Before image (clipped) */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${sliderPosition}%`, overflow: 'hidden',
          }}>
            <img
              src={beforeUrl}
              alt={beforeLabel}
              style={{
                width: containerRef.current ? containerRef.current.offsetWidth : '100%',
                height: '100%', objectFit: 'contain', transform: `scale(${zoom})`,
                maxWidth: 'none',
              }}
            />
          </div>
          {/* Divider */}
          <div className="comparison-divider" style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}>
            <div className="comparison-handle">
              <GripVertical size={16} color="var(--color-ocean-700)" />
            </div>
          </div>
          {/* Labels */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5 }}>
            <span className="badge badge-neutral" style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none' }}>
              {beforeLabel}
            </span>
          </div>
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 5 }}>
            <span className="badge badge-neutral" style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none' }}>
              {afterLabel}
            </span>
          </div>
        </div>
      )}

      {mode === 'side-by-side' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="image-viewer" style={{ padding: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textAlign: 'center' }}>
              {beforeLabel}
            </div>
            <img
              src={beforeUrl}
              alt={beforeLabel}
              style={{ width: '100%', objectFit: 'contain', transform: `scale(${zoom})`, borderRadius: 4 }}
            />
          </div>
          <div className="image-viewer" style={{ padding: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textAlign: 'center' }}>
              {afterLabel}
            </div>
            <img
              src={afterUrl}
              alt={afterLabel}
              style={{ width: '100%', objectFit: 'contain', transform: `scale(${zoom})`, borderRadius: 4 }}
            />
          </div>
        </div>
      )}

      {mode === 'toggle' && (
        <div>
          <div className="image-viewer" style={{ position: 'relative' }}>
            <img
              src={showBefore ? beforeUrl : afterUrl}
              alt={showBefore ? beforeLabel : afterLabel}
              style={{ width: '100%', objectFit: 'contain', transform: `scale(${zoom})` }}
            />
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <span className="badge badge-neutral" style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none' }}>
                {showBefore ? beforeLabel : afterLabel}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowBefore(!showBefore)}
            >
              Show {showBefore ? afterLabel : beforeLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
