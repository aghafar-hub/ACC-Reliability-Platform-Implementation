// apps/owner-center/src/components/SummaryCard.tsx
// Shared enterprise summary card — Card System v2.
// Displays a metric value with a label and a colour-coded left border.
// No business logic, no API calls.

import React from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SummaryCardProps {
  /** Metric value to display (e.g. "24" or "—"). */
  value: string;
  /** Translated label shown below the value. */
  label: string;
  /** BEM modifier for the left-border colour variant. */
  modifier: 'neutral' | 'info' | 'warning' | 'caution';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SummaryCard({
  value,
  label,
  modifier,
}: SummaryCardProps): React.ReactElement {
  return (
    <div className={`ur-summary-card ur-summary-card--${modifier}`}>
      <span className="ur-summary-card__value">{value}</span>
      <span className="ur-summary-card__label">{label}</span>
    </div>
  );
}
