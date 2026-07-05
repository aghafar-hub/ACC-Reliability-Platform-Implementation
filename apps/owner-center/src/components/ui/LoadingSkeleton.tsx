// apps/owner-center/src/components/ui/LoadingSkeleton.tsx
// Skeleton loaders for page, card, table, and form layouts.

import React from 'react';
import { cn } from './types';
import type { SkeletonVariant } from './types';

export interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  rows?: number;
  className?: string;
}

function SkeletonBlock({ className }: { className?: string }): React.ReactElement {
  return <span className={cn('acc-skeleton__block', className)} aria-hidden="true" />;
}

function PageSkeleton(): React.ReactElement {
  return (
    <div className="acc-skeleton acc-skeleton--page">
      <SkeletonBlock className="acc-skeleton__title" />
      <SkeletonBlock className="acc-skeleton__subtitle" />
      <div className="acc-skeleton__grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="acc-skeleton__card" />
        ))}
      </div>
      <SkeletonBlock className="acc-skeleton__table" />
    </div>
  );
}

function CardSkeleton(): React.ReactElement {
  return (
    <div className="acc-skeleton acc-skeleton--card">
      <SkeletonBlock className="acc-skeleton__card-title" />
      <SkeletonBlock className="acc-skeleton__card-line" />
      <SkeletonBlock className="acc-skeleton__card-line acc-skeleton__card-line--short" />
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }): React.ReactElement {
  return (
    <div className="acc-skeleton acc-skeleton--table" role="status" aria-label="Loading">
      <SkeletonBlock className="acc-skeleton__table-header" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="acc-skeleton__table-row" />
      ))}
    </div>
  );
}

function FormSkeleton(): React.ReactElement {
  return (
    <div className="acc-skeleton acc-skeleton--form">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="acc-skeleton__field">
          <SkeletonBlock className="acc-skeleton__label" />
          <SkeletonBlock className="acc-skeleton__input" />
        </div>
      ))}
    </div>
  );
}

export function LoadingSkeleton({
  variant = 'page',
  rows = 5,
  className,
}: LoadingSkeletonProps): React.ReactElement {
  const content = (() => {
    switch (variant) {
      case 'card': return <CardSkeleton />;
      case 'table': return <TableSkeleton rows={rows} />;
      case 'form': return <FormSkeleton />;
      default: return <PageSkeleton />;
    }
  })();

  return <div className={cn('acc-skeleton-wrap', className)}>{content}</div>;
}
