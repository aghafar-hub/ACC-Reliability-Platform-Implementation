// apps/owner-center/src/components/ui-v2/DataTable.tsx
// Dense industrial data table — colored severity rail per row, monospace
// columns where requested, and a pure-CSS responsive fallback to stacked
// rows on narrow viewports (no JS branching required for mobile).

import React from 'react';
import { cn, type DataTableColumnV2, type Severity } from './types';

export interface DataTableV2Props<T extends { id: string }> {
  readonly columns: readonly DataTableColumnV2<T>[];
  readonly data: readonly T[];
  readonly onRowClick?: (row: T) => void;
  readonly getRowSeverity?: (row: T) => Severity;
  readonly className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  getRowSeverity,
  className,
}: DataTableV2Props<T>): React.ReactElement {
  return (
    <div className={cn('accv2-table-wrap', className)}>
      <table className="accv2-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const severity = getRowSeverity?.(row) ?? 'muted';
            return (
              <tr
                key={row.id}
                className={cn(`accv2-table__row--${severity}`, onRowClick && 'accv2-table__row--clickable')}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.id} data-label={col.header} className={cn(col.mono && 'accv2-mono')}>
                    {col.renderCell ? col.renderCell(row) : col.accessor ? String(row[col.accessor] ?? '—') : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
