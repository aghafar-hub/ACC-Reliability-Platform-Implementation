// apps/owner-center/src/components/ui/DataTable.tsx
// Sortable data table with sticky header, loading, and empty states.

import React, { useMemo, useState } from 'react';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { StatusBadge } from './StatusBadge';
import { cn } from './types';
import type { DataTableColumn, SortDirection, StatusBadgeVariant } from './types';

export interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  getRowStatus?: (row: T) => { variant: StatusBadgeVariant; label: string } | null;
  sortColumnId?: string;
  sortDirection?: SortDirection;
  onSort?: (columnId: string, direction: SortDirection) => void;
  className?: string;
  stickyHeader?: boolean;
}

function cellContent<T>(row: T, column: DataTableColumn<T>): React.ReactNode {
  if (column.renderCell) return column.renderCell(row);
  if (typeof column.accessor === 'function') return column.accessor(row);
  if (column.accessor) return String(row[column.accessor] ?? '');
  return null;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records',
  emptyDescription,
  onRowClick,
  getRowStatus,
  sortColumnId: controlledSortId,
  sortDirection: controlledSortDir,
  onSort,
  className,
  stickyHeader = true,
}: DataTableProps<T>): React.ReactElement {
  const [localSortId, setLocalSortId] = useState<string | null>(null);
  const [localSortDir, setLocalSortDir] = useState<SortDirection>('asc');

  const sortId = controlledSortId ?? localSortId;
  const sortDir = controlledSortDir ?? localSortDir;

  const handleSort = (columnId: string): void => {
    const nextDir: SortDirection = sortId === columnId && sortDir === 'asc' ? 'desc' : 'asc';
    if (onSort) {
      onSort(columnId, nextDir);
    } else {
      setLocalSortId(columnId);
      setLocalSortDir(nextDir);
    }
  };

  const sortedData = useMemo(() => {
    if (onSort || !sortId) return data;
    const col = columns.find((c) => c.id === sortId);
    if (!col || typeof col.accessor !== 'string') return data;
    const key = col.accessor;
    return [...data].sort((a, b) => {
      const av = String(a[key] ?? '');
      const bv = String(b[key] ?? '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [columns, data, onSort, sortDir, sortId]);

  if (loading) {
    return <LoadingSkeleton variant="table" className={className} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <div className={cn('acc-data-table-wrap', className)}>
      <table className="acc-data-table">
        <thead className={cn(stickyHeader && 'acc-data-table__head--sticky')}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  'acc-data-table__th',
                  col.align && `acc-data-table__th--${col.align}`,
                  col.sticky && 'acc-data-table__th--sticky-col',
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    className="acc-data-table__sort-btn"
                    onClick={() => handleSort(col.id)}
                    aria-sort={
                      sortId === col.id
                        ? sortDir === 'asc' ? 'ascending' : 'descending'
                        : 'none'
                    }
                  >
                    {col.header}
                    <span className="acc-data-table__sort-icon" aria-hidden="true">
                      {sortId === col.id ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => {
            const status = getRowStatus?.(row);
            return (
              <tr
                key={row.id}
                className={cn(
                  'acc-data-table__row',
                  onRowClick && 'acc-data-table__row--clickable',
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((col) => {
                  const content = cellContent(row, col);
                  const isStatusCell = status && col.id === 'status';
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        'acc-data-table__td',
                        col.align && `acc-data-table__td--${col.align}`,
                        col.sticky && 'acc-data-table__td--sticky-col',
                      )}
                    >
                      {isStatusCell ? (
                        <StatusBadge variant={status.variant} label={status.label} size="sm" />
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
