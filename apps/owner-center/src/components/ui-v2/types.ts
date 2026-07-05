// apps/owner-center/src/components/ui-v2/types.ts
// Shared types for the UI-V2 premium industrial component set.
// New, additive namespace — does not replace apps/owner-center/src/components/ui/types.ts.

import type React from 'react';

export type Severity = 'alert' | 'caution' | 'normal' | 'info' | 'muted';

export interface FilterSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterFieldConfigV2 {
  readonly id: string;
  readonly label: string;
  readonly type: 'select' | 'date-range';
  readonly value?: string;
  readonly valueFrom?: string;
  readonly valueTo?: string;
  readonly placeholder?: string;
  readonly options?: readonly FilterSelectOption[];
}

export interface DataTableColumnV2<T> {
  readonly id: string;
  readonly header: string;
  readonly accessor?: keyof T;
  readonly renderCell?: (row: T) => React.ReactNode;
  readonly mono?: boolean;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
