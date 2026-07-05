// apps/owner-center/src/components/ui/KpiCard.tsx
// Operational KPI card with trend, severity, and loading support.

import React from 'react';
import { cn } from './types';
import type { HealthSeverity, TrendDirection } from './types';

export interface KpiCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: { direction: TrendDirection; label: string };
  severity?: HealthSeverity;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const TREND_ARROWS: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export function KpiCard({
  value,
  label,
  icon,
  trend,
  severity = 'info',
  loading = false,
  onClick,
  className,
}: KpiCardProps): React.ReactElement {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={cn(
        'acc-kpi-card',
        `acc-kpi-card--${severity}`,
        onClick && 'acc-kpi-card--clickable',
        loading && 'acc-kpi-card--loading',
        className,
      )}
      onClick={onClick}
      disabled={loading && onClick ? true : undefined}
    >
      {loading ? (
        <>
          <span className="acc-kpi-card__skeleton acc-kpi-card__skeleton--value" />
          <span className="acc-kpi-card__skeleton acc-kpi-card__skeleton--label" />
        </>
      ) : (
        <>
          <div className="acc-kpi-card__top">
            {icon && <span className="acc-kpi-card__icon" aria-hidden="true">{icon}</span>}
            {trend && (
              <span
                className={cn('acc-kpi-card__trend', `acc-kpi-card__trend--${trend.direction}`)}
                title={trend.label}
              >
                <span aria-hidden="true">{TREND_ARROWS[trend.direction]}</span>
                <span className="acc-kpi-card__trend-label">{trend.label}</span>
              </span>
            )}
          </div>
          <span className="acc-kpi-card__value">{value}</span>
          <span className="acc-kpi-card__label">{label}</span>
        </>
      )}
    </Tag>
  );
}
