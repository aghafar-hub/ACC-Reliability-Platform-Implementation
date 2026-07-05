// apps/owner-center/src/components/ui/CardList.tsx
// Mobile-friendly card list replacement for data tables.

import React from 'react';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { StatusBadge } from './StatusBadge';
import { cn } from './types';
import type { CardListField, StatusBadgeVariant } from './types';

export interface CardListProps<T extends { id: string }> {
  items: T[];
  fields: CardListField<T>[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  getStatus?: (item: T) => { variant: StatusBadgeVariant; label: string } | null;
  onItemClick?: (item: T) => void;
  quickActions?: (item: T) => React.ReactNode;
  className?: string;
}

function CardListContent<T>({
  item,
  fields,
  status,
  quickActions,
}: {
  item: T;
  fields: CardListField<T>[];
  status: { variant: StatusBadgeVariant; label: string } | null | undefined;
  quickActions?: (item: T) => React.ReactNode;
}): React.ReactElement {
  return (
    <>
      <div className="acc-card-list__header">
        {status && <StatusBadge variant={status.variant} label={status.label} size="sm" />}
        {quickActions && (
          <div className="acc-card-list__actions" onClick={(e) => e.stopPropagation()}>
            {quickActions(item)}
          </div>
        )}
      </div>
      <dl className="acc-card-list__fields">
        {fields.map((field) => (
          <div
            key={field.id}
            className={cn(
              'acc-card-list__field',
              field.emphasize && 'acc-card-list__field--emphasize',
            )}
          >
            <dt className="acc-card-list__label">{field.label}</dt>
            <dd className="acc-card-list__value">{field.render(item)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function CardList<T extends { id: string }>({
  items,
  fields,
  loading = false,
  emptyTitle = 'No records',
  emptyDescription,
  getStatus,
  onItemClick,
  quickActions,
  className,
}: CardListProps<T>): React.ReactElement {
  if (loading) {
    return (
      <div className={cn('acc-card-list', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <ul className={cn('acc-card-list', className)} role="list">
      {items.map((item) => {
        const status = getStatus?.(item);
        return (
          <li
            key={item.id}
            className={cn(
              'acc-card-list__item',
              onItemClick && 'acc-card-list__item--clickable',
            )}
          >
            {onItemClick ? (
              <button
                type="button"
                className="acc-card-list__item-btn"
                onClick={() => onItemClick(item)}
              >
                <CardListContent
                  item={item}
                  fields={fields}
                  status={status}
                  quickActions={quickActions}
                />
              </button>
            ) : (
              <div className="acc-card-list__item-inner">
                <CardListContent
                  item={item}
                  fields={fields}
                  status={status}
                  quickActions={quickActions}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
