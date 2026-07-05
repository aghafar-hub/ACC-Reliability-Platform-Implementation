// apps/owner-center/src/components/ui/UploadDropZone.tsx
// File upload drop zone — single, batch, progress, and error states.

import React, { useCallback, useRef, useState } from 'react';
import { cn } from './types';
import type { UploadFileState } from './types';

export interface UploadDropZoneProps {
  accept?: string;
  multiple?: boolean;
  files?: UploadFileState[];
  onFilesSelected?: (files: File[]) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

export function UploadDropZone({
  accept,
  multiple = false,
  files = [],
  onFilesSelected,
  onRemove,
  disabled = false,
  label = 'Drop files here or click to browse',
  hint,
  className,
}: UploadDropZoneProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const selected = multiple ? Array.from(fileList) : [fileList[0]];
      onFilesSelected?.(selected);
    },
    [multiple, onFilesSelected],
  );

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn('acc-upload', className)}>
      <div
        className={cn(
          'acc-upload__dropzone',
          dragOver && 'acc-upload__dropzone--active',
          disabled && 'acc-upload__dropzone--disabled',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="acc-upload__input"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className="acc-upload__icon" aria-hidden="true">↑</span>
        <span className="acc-upload__label">{label}</span>
        {hint && <span className="acc-upload__hint">{hint}</span>}
        {accept && <span className="acc-upload__accept">{accept}</span>}
      </div>

      {files.length > 0 && (
        <ul className="acc-upload__file-list" role="list">
          {files.map((f) => (
            <li
              key={f.id}
              className={cn(
                'acc-upload__file',
                f.status === 'error' && 'acc-upload__file--error',
                f.status === 'done' && 'acc-upload__file--done',
              )}
            >
              <div className="acc-upload__file-info">
                <span className="acc-upload__file-name">{f.file.name}</span>
                {f.error && <span className="acc-upload__file-error">{f.error}</span>}
              </div>
              {(f.status === 'uploading' || f.status === 'pending') && (
                <div className="acc-upload__progress" role="progressbar" aria-valuenow={f.progress} aria-valuemin={0} aria-valuemax={100}>
                  <span className="acc-upload__progress-bar" style={{ width: `${f.progress}%` }} />
                </div>
              )}
              {onRemove && (
                <button
                  type="button"
                  className="acc-upload__remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(f.id);
                  }}
                  aria-label={`Remove ${f.file.name}`}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
