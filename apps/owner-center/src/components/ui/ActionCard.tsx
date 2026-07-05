// apps/owner-center/src/components/ui/ActionCard.tsx
// Engineering action summary card with quick links.

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { cn } from './types';
import type { StatusBadgeVariant } from './types';

export interface ActionCardProps {
  actionNumber: string;
  lpId: string;
  equipment: string;
  status: { variant: StatusBadgeVariant; label: string };
  assignedTo?: string;
  dueDate?: string;
  lastUpdate?: string;
  quickLinks?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ActionCard({
  actionNumber,
  lpId,
  equipment,
  status,
  assignedTo,
  dueDate,
  lastUpdate,
  quickLinks,
  onClick,
  className,
}: ActionCardProps): React.ReactElement {
  const Tag = onClick ? 'button' : 'article';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={cn('acc-action-card', onClick && 'acc-action-card--clickable', className)}
      onClick={onClick}
    >
      <header className="acc-action-card__header">
        <span className="acc-action-card__number">{actionNumber}</span>
        <StatusBadge variant={status.variant} label={status.label} size="sm" />
      </header>

      <dl className="acc-action-card__fields">
        <div className="acc-action-card__field">
          <dt>LP_ID</dt>
          <dd>{lpId}</dd>
        </div>
        <div className="acc-action-card__field acc-action-card__field--emphasize">
          <dt>Equipment</dt>
          <dd>{equipment}</dd>
        </div>
        {assignedTo && (
          <div className="acc-action-card__field">
            <dt>Assigned to</dt>
            <dd>{assignedTo}</dd>
          </div>
        )}
        {dueDate && (
          <div className="acc-action-card__field">
            <dt>Due date</dt>
            <dd>{dueDate}</dd>
          </div>
        )}
        {lastUpdate && (
          <div className="acc-action-card__field">
            <dt>Last update</dt>
            <dd>{lastUpdate}</dd>
          </div>
        )}
      </dl>

      {quickLinks && (
        <footer className="acc-action-card__links" onClick={(e) => e.stopPropagation()}>
          {quickLinks}
        </footer>
      )}
    </Tag>
  );
}
