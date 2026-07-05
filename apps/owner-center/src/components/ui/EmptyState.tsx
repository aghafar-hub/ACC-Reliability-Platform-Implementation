// apps/owner-center/src/components/ui/EmptyState.tsx
// Empty data placeholder with optional action.

import React from 'react';
import { cn } from './types';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div className={cn('acc-empty-state', className)} role="status">
      {icon && <div className="acc-empty-state__icon" aria-hidden="true">{icon}</div>}
      <h3 className="acc-empty-state__title">{title}</h3>
      {description && <p className="acc-empty-state__desc">{description}</p>}
      {action && <div className="acc-empty-state__action">{action}</div>}
    </div>
  );
}
