// apps/owner-center/src/components/ui/types.ts
// Shared types for the ACC UI Framework.

import type { ReactNode } from 'react';

/** Platform health / condition severity. */
export type HealthSeverity = 'normal' | 'caution' | 'alert' | 'critical' | 'info' | 'future' | 'disabled';

/** Engineering action workflow status. */
export type WorkflowStatus =
  | 'draft'
  | 'open'
  | 'assigned'
  | 'in-progress'
  | 'waiting-shutdown'
  | 'completed'
  | 'verified'
  | 'closed';

/** Review / scheduling status. */
export type ReviewStatus = 'due' | 'overdue' | 'pending-review' | 'approved' | 'rejected';

export type StatusBadgeVariant = HealthSeverity | WorkflowStatus | ReviewStatus;

export type TrendDirection = 'up' | 'down' | 'flat';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterFieldConfig {
  id: string;
  label: string;
  type: 'select' | 'date' | 'date-range';
  options?: FilterOption[];
  value?: string;
  valueFrom?: string;
  valueTo?: string;
  placeholder?: string;
  hidden?: boolean;
}

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  width?: string;
  sticky?: boolean;
  renderCell?: (row: T) => ReactNode;
}

export type SortDirection = 'asc' | 'desc';

export interface CardListField<T> {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
  emphasize?: boolean;
}

export type TimelineEventKind = 'sample' | 'oil-change' | 'future' | 'custom';

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  date: string;
  label: string;
  status?: StatusBadgeVariant;
  statusLabel?: string;
  detail?: ReactNode;
  color?: string;
}

export interface CommentEntry {
  id: string;
  user: string;
  company?: string;
  role?: string;
  timestamp: string;
  text: string;
}

export type DialogVariant = 'default' | 'confirm' | 'warning' | 'duplicate' | 'form';

export type SkeletonVariant = 'page' | 'card' | 'table' | 'form';

export interface UploadFileState {
  id: string;
  file: File;
  progress: number;
  error?: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
