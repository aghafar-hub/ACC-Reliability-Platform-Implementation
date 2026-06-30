// apps/owner-center/src/components/StatusChip.tsx
// Shared enterprise status chip — UX Patch 6 / Color System v2.
//
// All colors are driven by CSS custom properties in shell.css.
// Dark-mode and RTL are handled automatically by the token system.
// No business logic, no API calls.

import React from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChipStatus =
  | 'operational'
  | 'warning'
  | 'critical'
  | 'maintenance'
  | 'draft';

export interface StatusChipProps {
  /** Semantic status variant — maps to a CSS class and color token. */
  status: ChipStatus;
  /** Visible label text (translated by the caller). */
  label: string;
  /** Extra CSS classes (e.g. layout-specific modifiers like ur-page__sdk-badge). */
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StatusChip({
  status,
  label,
  className,
}: StatusChipProps): React.ReactElement {
  const cls = [
    'status-chip',
    `status-chip--${status}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={cls}>{label}</span>;
}
