// apps/owner-center/src/components/ui/index.ts
// ACC UI Framework — shared component barrel export.

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { KpiCard } from './KpiCard';
export type { KpiCardProps } from './KpiCard';

export { KpiGrid } from './KpiGrid';
export type { KpiGridProps } from './KpiGrid';

export { FilterBar } from './FilterBar';
export type { FilterBarProps } from './FilterBar';

export { FilterDrawer } from './FilterDrawer';
export type { FilterDrawerProps } from './FilterDrawer';

export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable';

export { CardList } from './CardList';
export type { CardListProps } from './CardList';

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';

export { SectionCard } from './SectionCard';
export type { SectionCardProps } from './SectionCard';

export { Timeline } from './Timeline';
export type { TimelineProps } from './Timeline';

export { ReportLayout, ReportSection } from './ReportLayout';
export type { ReportLayoutProps, ReportSectionProps, ReportMetadataItem } from './ReportLayout';

export { ReportPreview } from './ReportPreview';
export type { ReportPreviewProps } from './ReportPreview';

export { UploadDropZone } from './UploadDropZone';
export type { UploadDropZoneProps } from './UploadDropZone';

export { ReviewQueue } from './ReviewQueue';
export type { ReviewQueueProps, ReviewQueueCounters } from './ReviewQueue';

export { Dialog, ConfirmDialog } from './Dialog';
export type { DialogProps, ConfirmDialogProps } from './Dialog';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { LoadingSkeleton } from './LoadingSkeleton';
export type { LoadingSkeletonProps } from './LoadingSkeleton';

export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';

export { ActionCard } from './ActionCard';
export type { ActionCardProps } from './ActionCard';

export { CommentThread } from './CommentThread';
export type { CommentThreadProps } from './CommentThread';

export { useBreakpoint, useIsMobile } from './hooks/useBreakpoint';
export type { Breakpoint } from './hooks/useBreakpoint';

export { cn } from './types';
export type {
  BreadcrumbItem,
  CardListField,
  CommentEntry,
  DataTableColumn,
  DialogVariant,
  FilterFieldConfig,
  FilterOption,
  HealthSeverity,
  ReviewStatus,
  SkeletonVariant,
  SortDirection,
  StatusBadgeVariant,
  TimelineEvent,
  TimelineEventKind,
  TrendDirection,
  UploadFileState,
  WorkflowStatus,
} from './types';
