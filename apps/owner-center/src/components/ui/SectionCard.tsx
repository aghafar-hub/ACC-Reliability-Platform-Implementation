// apps/owner-center/src/components/ui/SectionCard.tsx
// Content section card with header, actions, and loading/empty states.

import React from 'react';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { cn } from './types';

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  loading = false,
  empty = false,
  emptyTitle = 'No data',
  emptyDescription,
  emptyAction,
  className,
  bodyClassName,
}: SectionCardProps): React.ReactElement {
  return (
    <section className={cn('acc-section-card', className)}>
      <header className="acc-section-card__header">
        <div className="acc-section-card__header-text">
          <h2 className="acc-section-card__title">{title}</h2>
          {subtitle && <p className="acc-section-card__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="acc-section-card__actions">{actions}</div>}
      </header>
      <div className={cn('acc-section-card__body', bodyClassName)}>
        {loading ? (
          <LoadingSkeleton variant="card" />
        ) : empty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}
