// platform/services/src/reporting/reporting-types.ts
// Reporting & Analytics domain entity, DTOs, repository and service contracts.
//
// Design:
//   - ReportRecord is the platform's authoritative reporting configuration entity.
//     It represents report definitions, categories, templates, export profiles,
//     and schedule profiles — configuration only, no report execution.
//
//   - ReportStatus lifecycle:
//       enabled  → disable  → disabled
//       disabled → enable   → enabled
//       enabled | disabled → archive → archived
//       archived → restore  → enabled
//
// Service id reserved: platform.reporting

import type { UserId } from '../auth/auth-types';
import type { ActorRef } from '../user/user-types';

export type { ActorRef };

// ── ReportObjectType ────────────────────────────────────────────────────────

/** Ordered tuple of all managed reporting configuration object types. */
export const REPORT_OBJECT_TYPES = [
  'definition',
  'category',
  'template',
  'export-profile',
  'schedule-profile',
] as const;

/** Category of reporting configuration managed by this domain. */
export type ReportObjectType = typeof REPORT_OBJECT_TYPES[number];

// ── ReportStatus ──────────────────────────────────────────────────────────────

/** Ordered tuple of all valid report lifecycle states. */
export const REPORT_STATUSES = ['enabled', 'disabled', 'archived'] as const;

/** Lifecycle state of a reporting configuration record. */
export type ReportStatus = typeof REPORT_STATUSES[number];

// ── ExportFormat ──────────────────────────────────────────────────────────────

/** Supported export format identifiers (configuration only — no generation). */
export const EXPORT_FORMATS = ['pdf', 'xlsx', 'csv', 'html'] as const;

export type ExportFormat = typeof EXPORT_FORMATS[number];

// ── ReportId ──────────────────────────────────────────────────────────────────

declare const ReportIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies a ReportRecord.
 * Use {@link generateReportId} to produce values.
 */
export type ReportId = string & { readonly [ReportIdBrand]: 'ReportId' };

/** Generates a platform-unique {@link ReportId}. */
export function generateReportId(): ReportId {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 11);
  return `rpt-${ts}-${rnd}` as ReportId;
}

/** Creates a {@link ReportId} from a plain string. @throws {Error} if blank. */
export function createReportId(value: string): ReportId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('ReportId cannot be empty');
  return trimmed as ReportId;
}

// ── ReportSettings ────────────────────────────────────────────────────────────

/**
 * Type-specific configuration payload (structure only — no execution).
 * Fields are optional; relevance depends on {@link ReportObjectType}.
 */
export interface ReportSettings {
  /** Data source module key (objectType: definition). */
  readonly sourceModule?: string;
  /** Template key referenced by a definition. */
  readonly templateKey?: string;
  /** Export profile key referenced by a definition. */
  readonly exportProfileKey?: string;
  /** Schedule profile key referenced by a definition. */
  readonly scheduleProfileKey?: string;
  /** Layout template identifier (objectType: template). */
  readonly layoutTemplate?: string;
  /** Allowed formats (objectType: export-profile). */
  readonly allowedFormats?: readonly ExportFormat[];
  /** Cron-style schedule expression (objectType: schedule-profile). */
  readonly scheduleExpression?: string;
  /** Schedule frequency label (objectType: schedule-profile). */
  readonly frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  /** Recipient role keys for scheduled distribution. */
  readonly recipientRoles?: readonly string[];
}

// ── ReportRecord ──────────────────────────────────────────────────────────────

/**
 * Authoritative reporting configuration entity.
 *
 * Invariants:
 *  - id is unique across the entire platform.
 *  - reportKey is unique within objectType.
 *  - All fields are readonly — mutations produce new records.
 *  - Archived records cannot be enabled or disabled until restored.
 */
export interface ReportRecord {
  readonly id: ReportId;
  /** Category of configuration (definition, category, template, etc.). */
  readonly objectType: ReportObjectType;
  /** Unique business key within the object type. */
  readonly reportKey: string;
  readonly name: string;
  readonly description?: string;
  readonly status: ReportStatus;
  /** Category key for report definitions. */
  readonly category?: string;
  /** Export formats enabled for a report definition. */
  readonly exportFormats?: readonly ExportFormat[];
  /** Whether automated scheduling is enabled for a report definition. */
  readonly scheduleEnabled?: boolean;
  /** Owner user id for a report definition. */
  readonly owner?: UserId;
  readonly settings: ReportSettings;
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly updatedAt: string;
  readonly updatedBy: UserId;
  readonly enabledAt?: string;
  readonly enabledBy?: UserId;
  readonly disabledAt?: string;
  readonly disabledBy?: UserId;
  readonly disabledReason?: string;
  readonly archivedAt?: string;
  readonly archivedBy?: UserId;
  readonly archivedReason?: string;
  readonly restoredAt?: string;
  readonly restoredBy?: UserId;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

/** Fields required to create a new reporting configuration record. */
export interface CreateReportRequest {
  readonly id?: ReportId;
  readonly objectType: ReportObjectType;
  readonly reportKey: string;
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
  readonly exportFormats?: readonly ExportFormat[];
  readonly scheduleEnabled?: boolean;
  readonly owner?: UserId;
  readonly settings?: ReportSettings;
  readonly reason?: string;
}

/** Profile fields that may be updated on an existing record. */
export interface UpdateReportRequest {
  readonly name?: string;
  readonly description?: string;
  readonly category?: string;
  readonly exportFormats?: readonly ExportFormat[];
  readonly scheduleEnabled?: boolean;
  readonly owner?: UserId;
  readonly settings?: ReportSettings;
  readonly reason?: string;
}

/** Filter criteria for listing reporting configuration records. */
export interface ReportListQuery {
  readonly objectType?: ReportObjectType;
  readonly status?: ReportStatus;
  readonly category?: string;
  readonly scheduleEnabled?: boolean;
  readonly searchText?: string;
  readonly offset?: number;
  readonly limit?: number;
}

/** Paginated result from a list operation. */
export interface ReportListResult {
  readonly reports: readonly ReportRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

/** Aggregate counts for the Owner Center summary cards. */
export interface ReportingSummary {
  readonly totalReports: number;
  readonly enabled: number;
  readonly scheduled: number;
  readonly archived: number;
  readonly capturedAt: string;
}

// ── IReportingRepository ──────────────────────────────────────────────────────

/**
 * Reporting repository contract — raw data access layer.
 *
 * Service id reserved: `platform.reporting.repository`
 */
export interface IReportingRepository {
  save(report: ReportRecord): ReportRecord;
  update(report: ReportRecord): ReportRecord;
  findById(id: ReportId): ReportRecord | null;
  findByKey(objectType: ReportObjectType, reportKey: string): ReportRecord | null;
  list(query?: ReportListQuery): ReportListResult;
  count(): number;
  remove(id: ReportId): boolean;
}

// ── IReportingService ─────────────────────────────────────────────────────────

/**
 * Reporting Service contract.
 *
 * Owns configuration lifecycle for report definitions, categories, templates,
 * export profiles, and schedule profiles.  Does not execute reports.
 *
 * Service id reserved: `platform.reporting`
 */
export interface IReportingService {
  create(request: CreateReportRequest, actor: ActorRef): ReportRecord;
  findById(id: ReportId): ReportRecord | null;
  findByKey(objectType: ReportObjectType, reportKey: string): ReportRecord | null;
  list(query?: ReportListQuery): ReportListResult;
  update(id: ReportId, request: UpdateReportRequest, actor: ActorRef): ReportRecord;
  enable(id: ReportId, actor: ActorRef): ReportRecord;
  disable(id: ReportId, reason: string, actor: ActorRef): ReportRecord;
  archive(id: ReportId, reason: string, actor: ActorRef): ReportRecord;
  restore(id: ReportId, actor: ActorRef): ReportRecord;
  getSummary(): ReportingSummary;
}
