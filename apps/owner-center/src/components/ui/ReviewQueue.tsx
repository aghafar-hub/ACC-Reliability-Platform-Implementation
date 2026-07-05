// apps/owner-center/src/components/ui/ReviewQueue.tsx
// Batch review queue — progress, navigation, save & continue, reject.

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { cn } from './types';
import type { StatusBadgeVariant } from './types';

export interface ReviewQueueCounters {
  pending: number;
  saved: number;
  rejected: number;
  total: number;
}

export interface ReviewQueueProps {
  currentIndex: number;
  total: number;
  counters?: ReviewQueueCounters;
  currentLabel?: string;
  status?: { variant: StatusBadgeVariant; label: string };
  children: React.ReactNode;
  onPrevious?: () => void;
  onNext?: () => void;
  onSaveContinue?: () => void;
  onReject?: () => void;
  previousLabel?: string;
  nextLabel?: string;
  saveLabel?: string;
  rejectLabel?: string;
  className?: string;
}

export function ReviewQueue({
  currentIndex,
  total,
  counters,
  currentLabel,
  status,
  children,
  onPrevious,
  onNext,
  onSaveContinue,
  onReject,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  saveLabel = 'Save & continue',
  rejectLabel = 'Reject',
  className,
}: ReviewQueueProps): React.ReactElement {
  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  return (
    <div className={cn('acc-review-queue', className)}>
      <header className="acc-review-queue__header">
        <div className="acc-review-queue__progress-wrap">
          <span className="acc-review-queue__progress-label">
            Item {currentIndex + 1} of {total}
            {currentLabel && ` — ${currentLabel}`}
          </span>
          <div
            className="acc-review-queue__progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className="acc-review-queue__progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {counters && (
          <div className="acc-review-queue__counters">
            <span className="acc-review-queue__counter">Pending: {counters.pending}</span>
            <span className="acc-review-queue__counter">Saved: {counters.saved}</span>
            <span className="acc-review-queue__counter">Rejected: {counters.rejected}</span>
          </div>
        )}

        {status && <StatusBadge variant={status.variant} label={status.label} />}
      </header>

      <div className="acc-review-queue__body">{children}</div>

      <footer className="acc-review-queue__footer">
        <div className="acc-review-queue__nav">
          <button
            type="button"
            className="acc-btn acc-btn--ghost"
            onClick={onPrevious}
            disabled={!onPrevious || currentIndex <= 0}
          >
            {previousLabel}
          </button>
          <button
            type="button"
            className="acc-btn acc-btn--ghost"
            onClick={onNext}
            disabled={!onNext || currentIndex >= total - 1}
          >
            {nextLabel}
          </button>
        </div>
        <div className="acc-review-queue__actions">
          {onReject && (
            <button type="button" className="acc-btn acc-btn--danger" onClick={onReject}>
              {rejectLabel}
            </button>
          )}
          {onSaveContinue && (
            <button type="button" className="acc-btn acc-btn--primary" onClick={onSaveContinue}>
              {saveLabel}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
