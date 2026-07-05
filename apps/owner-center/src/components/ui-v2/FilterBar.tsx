// apps/owner-center/src/components/ui-v2/FilterBar.tsx
// Compact single-row command toolbar for the UI-V2 Dashboard.

import React from 'react';
import { cn, type FilterFieldConfigV2 } from './types';

export interface FilterBarV2Props {
  readonly searchValue: string;
  readonly searchPlaceholder: string;
  readonly onSearchChange: (value: string) => void;
  readonly filters: readonly FilterFieldConfigV2[];
  readonly onFilterChange: (id: string, value: string) => void;
  readonly onDateFromChange: (id: string, value: string) => void;
  readonly onDateToChange: (id: string, value: string) => void;
  readonly onClear: () => void;
  readonly clearLabel: string;
  readonly activeFilterCount: number;
  readonly className?: string;
}

export function FilterBar({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  onFilterChange,
  onDateFromChange,
  onDateToChange,
  onClear,
  clearLabel,
  activeFilterCount,
  className,
}: FilterBarV2Props): React.ReactElement {
  return (
    <div className={cn('accv2-filterbar', className)}>
      <input
        type="search"
        className="accv2-filterbar__search"
        value={searchValue}
        placeholder={searchPlaceholder}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {filters.map((field) => {
        if (field.type === 'date-range') {
          return (
            <span key={field.id} className="accv2-filterbar__date">
              <input type="date" value={field.valueFrom ?? ''} onChange={(e) => onDateFromChange(field.id, e.target.value)} />
              <input type="date" value={field.valueTo ?? ''} onChange={(e) => onDateToChange(field.id, e.target.value)} />
            </span>
          );
        }
        return (
          <select
            key={field.id}
            className="accv2-filterbar__select"
            value={field.value ?? ''}
            onChange={(e) => onFilterChange(field.id, e.target.value)}
          >
            <option value="">{field.placeholder ?? field.label}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      })}
      <button type="button" className="accv2-filterbar__reset" onClick={onClear}>
        {clearLabel}
        {activeFilterCount > 0 && <span className="accv2-filterbar__count">{activeFilterCount}</span>}
      </button>
    </div>
  );
}
