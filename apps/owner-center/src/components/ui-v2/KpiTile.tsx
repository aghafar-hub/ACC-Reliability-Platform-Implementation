// apps/owner-center/src/components/ui-v2/KpiTile.tsx
// Premium industrial KPI tile — dark command-strip stat card with a colored
// severity rail and monospace numeral (digital-readout feel).

import React from 'react';
import { cn, type Severity } from './types';

export interface KpiTileProps {
  readonly value: string | number;
  readonly label: string;
  readonly severity?: Severity;
  readonly onClick?: () => void;
  readonly className?: string;
}

export function KpiTile({
  value,
  label,
  severity = 'info',
  onClick,
  className,
}: KpiTileProps): React.ReactElement {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={cn('accv2-kpi-tile', `accv2-kpi-tile--${severity}`, onClick && 'accv2-kpi-tile--clickable', className)}
      onClick={onClick}
    >
      <span className="accv2-kpi-tile__rail" aria-hidden="true" />
      <span className="accv2-kpi-tile__value">{value}</span>
      <span className="accv2-kpi-tile__label">{label}</span>
    </Tag>
  );
}
