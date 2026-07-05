// apps/owner-center/src/components/ui/FilterBar.tsx
// Desktop filter bar; collapses to drawer on mobile.

import React, { useState } from 'react';
import { FilterDrawer } from './FilterDrawer';
import { useIsMobile } from './hooks/useBreakpoint';
import { cn } from './types';
import type { FilterFieldConfig } from './types';

export interface FilterBarProps {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterFieldConfig[];
  onFilterChange?: (id: string, value: string) => void;
  onDateFromChange?: (id: string, value: string) => void;
  onDateToChange?: (id: string, value: string) => void;
  onClear?: () => void;
  clearLabel?: string;
  filterButtonLabel?: string;
  activeFilterCount?: number;
  className?: string;
  trailing?: React.ReactNode;
}

function FilterFields({
  filters,
  onFilterChange,
  onDateFromChange,
  onDateToChange,
}: Pick<FilterBarProps, 'filters' | 'onFilterChange' | 'onDateFromChange' | 'onDateToChange'>): React.ReactElement {
  const visible = (filters ?? []).filter((f) => !f.hidden);

  return (
    <>
      {visible.map((field) => {
        if (field.type === 'select') {
          return (
            <label key={field.id} className="acc-filter-bar__field">
              <span className="acc-filter-bar__field-label">{field.label}</span>
              <select
                className="acc-filter-bar__select"
                value={field.value ?? ''}
                onChange={(e) => onFilterChange?.(field.id, e.target.value)}
              >
                <option value="">{field.placeholder ?? 'All'}</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        if (field.type === 'date') {
          return (
            <label key={field.id} className="acc-filter-bar__field">
              <span className="acc-filter-bar__field-label">{field.label}</span>
              <input
                type="date"
                className="acc-filter-bar__input"
                value={field.value ?? ''}
                onChange={(e) => onFilterChange?.(field.id, e.target.value)}
              />
            </label>
          );
        }

        return (
          <div key={field.id} className="acc-filter-bar__field acc-filter-bar__field--range">
            <span className="acc-filter-bar__field-label">{field.label}</span>
            <div className="acc-filter-bar__date-range">
              <input
                type="date"
                className="acc-filter-bar__input"
                value={field.valueFrom ?? ''}
                onChange={(e) => onDateFromChange?.(field.id, e.target.value)}
                aria-label={`${field.label} from`}
              />
              <span className="acc-filter-bar__range-sep" aria-hidden="true">–</span>
              <input
                type="date"
                className="acc-filter-bar__input"
                value={field.valueTo ?? ''}
                onChange={(e) => onDateToChange?.(field.id, e.target.value)}
                aria-label={`${field.label} to`}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

export function FilterBar({
  searchValue = '',
  searchPlaceholder = 'Search…',
  onSearchChange,
  filters,
  onFilterChange,
  onDateFromChange,
  onDateToChange,
  onClear,
  clearLabel = 'Clear filters',
  filterButtonLabel = 'Filters',
  activeFilterCount = 0,
  className,
  trailing,
}: FilterBarProps): React.ReactElement {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleApply = (): void => {
    setDrawerOpen(false);
  };

  return (
    <div className={cn('acc-filter-bar', className)}>
      <div className="acc-filter-bar__row">
        <label className="acc-filter-bar__search">
          <span className="acc-filter-bar__search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            className="acc-filter-bar__search-input"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </label>

        {isMobile ? (
          <button
            type="button"
            className="acc-btn acc-btn--secondary acc-filter-bar__filter-btn"
            onClick={() => setDrawerOpen(true)}
          >
            {filterButtonLabel}
            {activeFilterCount > 0 && (
              <span className="acc-filter-bar__badge">{activeFilterCount}</span>
            )}
          </button>
        ) : (
          <div className="acc-filter-bar__filters">
            <FilterFields
              filters={filters}
              onFilterChange={onFilterChange}
              onDateFromChange={onDateFromChange}
              onDateToChange={onDateToChange}
            />
          </div>
        )}

        {onClear && (
          <button type="button" className="acc-btn acc-btn--ghost acc-filter-bar__clear" onClick={onClear}>
            {clearLabel}
          </button>
        )}

        {trailing}
      </div>

      {isMobile && (
        <FilterDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onApply={handleApply}
          onClear={() => onClear?.()}
          activeFilterCount={activeFilterCount}
        >
          <FilterFields
            filters={filters}
            onFilterChange={onFilterChange}
            onDateFromChange={onDateFromChange}
            onDateToChange={onDateToChange}
          />
        </FilterDrawer>
      )}
    </div>
  );
}
