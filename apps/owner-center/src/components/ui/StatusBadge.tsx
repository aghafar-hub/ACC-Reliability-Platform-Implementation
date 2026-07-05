// apps/owner-center/src/components/ui/StatusBadge.tsx
// Platform status badge — health, workflow, and review variants.

import React from 'react';
import { cn } from './types';
import type { StatusBadgeVariant } from './types';

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function StatusBadge({
  variant,
  label,
  className,
  size = 'md',
  onClick,
}: StatusBadgeProps): React.ReactElement {
  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={cn(
        'acc-status-badge',
        `acc-status-badge--${variant}`,
        `acc-status-badge--${size}`,
        onClick && 'acc-status-badge--clickable',
        className,
      )}
      onClick={onClick}
    >
      {label}
    </Tag>
  );
}
