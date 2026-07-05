// apps/owner-center/src/components/ui/ErrorState.tsx
// Friendly error display with retry and collapsible technical details.

import React, { useState } from 'react';
import { cn } from './types';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  technicalDetails?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  technicalDetails,
  className,
}: ErrorStateProps): React.ReactElement {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={cn('acc-error-state', className)} role="alert">
      <div className="acc-error-state__icon" aria-hidden="true">!</div>
      <h3 className="acc-error-state__title">{title}</h3>
      <p className="acc-error-state__message">{message}</p>
      {onRetry && (
        <button type="button" className="acc-btn acc-btn--primary" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
      {technicalDetails && (
        <details
          className="acc-error-state__details"
          open={showDetails}
          onToggle={(e) => setShowDetails((e.target as HTMLDetailsElement).open)}
        >
          <summary className="acc-error-state__details-toggle">Technical details</summary>
          <pre className="acc-error-state__details-body">{technicalDetails}</pre>
        </details>
      )}
    </div>
  );
}
