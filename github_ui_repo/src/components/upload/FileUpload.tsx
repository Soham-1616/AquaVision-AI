import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileImage, AlertCircle } from 'lucide-react';
import { validateImageFile, formatFileSize, cn } from '@/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  previewUrl: string | null;
  accept?: string;
  maxSize?: number;
  label?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  selectedFile,
  previewUrl,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 10 * 1024 * 1024,
  label = 'Upload an underwater image',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    const validation = validateImageFile(file, maxSize);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid file');
      return;
    }
    onFileSelect(file);
  }, [maxSize, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  if (selectedFile && previewUrl) {
    return (
      <div className="upload-zone has-file" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 120, height: 90, borderRadius: 8, overflow: 'hidden',
            background: 'var(--color-ocean-900)', flexShrink: 0,
          }}>
            <img
              src={previewUrl}
              alt="Selected file preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileImage size={16} color="var(--color-teal-500)" />
              <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile.name}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {formatFileSize(selectedFile.size)} · {selectedFile.type.split('/')[1]?.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Replace
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { onFileRemove(); setError(null); }}
              disabled={disabled}
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          aria-label="Select a replacement file"
        />
        {error && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-error)', fontSize: 13 }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn('upload-zone', dragOver && 'drag-over')}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label={label}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <Upload size={32} color="var(--color-surface-400)" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, color: 'var(--color-text-primary)' }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Drag & drop or click to browse · JPEG, PNG, WebP · Max {formatFileSize(maxSize)}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        aria-label="Select a file"
      />
      {error && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-error)', fontSize: 13 }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
};
