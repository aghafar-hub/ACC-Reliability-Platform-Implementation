// apps/owner-center/src/components/ui-v2/StatusChip.tsx
// Compact status pill for the UI-V2 component set.

import React from 'react';
import { cn, type Severity } from './types';

export interface StatusChipProps {
  readonly label: string;
  readonly severity: Severity;
  readonly className?: string;
}

export function StatusChip({ label, severity, className }: StatusChipProps): React.ReactElement {
  return (
    <span className={cn('accv2-status-chip', `accv2-status-chip--${severity}`, className)}>
      {label}
    </span>
  );
}
