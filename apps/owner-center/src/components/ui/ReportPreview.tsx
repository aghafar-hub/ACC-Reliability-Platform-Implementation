// apps/owner-center/src/components/ui/ReportPreview.tsx
// Report preview container before PDF/Excel export.

import React from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { cn } from './types';

export interface ReportPreviewProps {
  children: React.ReactNode;
  loading?: boolean;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  exportPdfLabel?: string;
  exportExcelLabel?: string;
  toolbarExtra?: React.ReactNode;
  className?: string;
}

export function ReportPreview({
  children,
  loading = false,
  onExportPdf,
  onExportExcel,
  exportPdfLabel = 'Export PDF',
  exportExcelLabel = 'Export Excel',
  toolbarExtra,
  className,
}: ReportPreviewProps): React.ReactElement {
  return (
    <div className={cn('acc-report-preview', className)}>
      <div className="acc-report-preview__toolbar">
        <span className="acc-report-preview__label">Preview</span>
        <div className="acc-report-preview__actions">
          {toolbarExtra}
          {onExportPdf && (
            <button type="button" className="acc-btn acc-btn--secondary" onClick={onExportPdf}>
              {exportPdfLabel}
            </button>
          )}
          {onExportExcel && (
            <button type="button" className="acc-btn acc-btn--secondary" onClick={onExportExcel}>
              {exportExcelLabel}
            </button>
          )}
        </div>
      </div>
      <div className="acc-report-preview__viewport">
        {loading ? <LoadingSkeleton variant="page" /> : children}
      </div>
    </div>
  );
}
