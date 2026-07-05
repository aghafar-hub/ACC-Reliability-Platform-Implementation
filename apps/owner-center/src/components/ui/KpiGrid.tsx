// apps/owner-center/src/components/ui/KpiGrid.tsx
// Responsive KPI grid — 6–8 desktop, 3–4 tablet, 2-col mobile.

import React from 'react';
import { cn } from './types';

export interface KpiGridProps {
  children: React.ReactNode;
  className?: string;
  /** Target desktop column count (6–8). Defaults to auto-fill. */
  desktopColumns?: 6 | 7 | 8;
}

export function KpiGrid({
  children,
  className,
  desktopColumns,
}: KpiGridProps): React.ReactElement {
  return (
    <div
      className={cn(
        'acc-kpi-grid',
        desktopColumns && `acc-kpi-grid--cols-${desktopColumns}`,
        className,
      )}
      role="list"
    >
      {children}
    </div>
  );
}
