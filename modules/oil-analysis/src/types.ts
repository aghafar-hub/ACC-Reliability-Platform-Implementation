// modules/oil-analysis/src/types.ts
// Domain types for the Oil Analysis module.
//
// All types are pure data contracts — no methods, no classes.
// Lifecycle and identity rules follow OIL_LUBRICATION_OIL_ANALYSIS_INTEGRATION_STANDARD.md.

import type { IsoTimestamp } from '@acc-reliability/shared-types';
import type { EquipmentId } from '@acc-reliability/sdk';

// ── Branded identifiers ───────────────────────────────────────────────────────

/** Unique identifier for a single oil analysis sample submission. */
export type OilSampleId = string & { readonly __brand: 'OilSampleId' };

/**
 * Creates an {@link OilSampleId} from a raw string.
 * @throws {Error} if value is empty after trimming.
 */
export function createOilSampleId(value: string): OilSampleId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('OilSampleId cannot be empty');
  return trimmed as OilSampleId;
}

// ── Sample lifecycle ────────────────────────────────────────────────────────────

/**
 * Lifecycle status of an oil analysis sample record.
 *
 * See integration standard §5 for transition rules.
 */
export type OilSampleStatus =
  | 'imported'
  | 'needs-lp-mapping'
  | 'linked'
  | 'analysed'
  | 'normal'
  | 'caution'
  | 'alert'
  | 'cancelled';

/** How the sample record entered the system. */
export type OilSampleImportSource = 'manual' | 'pdf-import' | 'lab-api';

/** Result classification after lab analysis is confirmed. */
export type OilSampleResultStatus = 'normal' | 'caution' | 'alert';

/** PDF import lifecycle status (metadata shell — no parsing). */
export type PdfImportStatus =
  | 'none'
  | 'uploaded'
  | 'pending-review'
  | 'reviewed'
  | 'rejected';

/**
 * Engineer review and approval lifecycle for analysed samples.
 *
 * Transitions: pending → under-review → approved → locked.
 * Reject / return-for-correction → pending.
 */
export type OilSampleApprovalStatus =
  | 'pending'
  | 'under-review'
  | 'approved'
  | 'locked';

/** Audit action recorded in approval history. */
export type OilSampleApprovalAction =
  | 'opened'
  | 'edited'
  | 'approved'
  | 'rejected'
  | 'returned-for-correction'
  | 'locked';

/** Single entry in the engineer approval audit trail. */
export interface OilSampleApprovalHistoryEntry {
  readonly action: OilSampleApprovalAction;
  readonly actor: string;
  readonly at: IsoTimestamp;
  readonly fromStatus: OilSampleApprovalStatus;
  readonly toStatus: OilSampleApprovalStatus;
  readonly notes?: string | undefined;
}

// ── Oil sample entity ───────────────────────────────────────────────────────────

/**
 * Oil analysis sample record.
 *
 * `lubricationPointId` is optional at creation and set after engineer review.
 */
export interface OilSample {
  readonly sampleId: OilSampleId;
  readonly equipmentId: EquipmentId;
  readonly sampledAt: IsoTimestamp;
  readonly importSource: OilSampleImportSource;
  readonly status: OilSampleStatus;
  readonly lubricationPointId?: string | undefined;
  readonly labReferenceId?: string | undefined;
  readonly resultStatus?: OilSampleResultStatus | undefined;
  readonly pdfFileName?: string | undefined;
  readonly pdfFileUrl?: string | undefined;
  readonly pdfUploadedAt?: IsoTimestamp | undefined;
  readonly pdfImportStatus?: PdfImportStatus | undefined;
  readonly pdfReviewNotes?: string | undefined;
  readonly approvalStatus?: OilSampleApprovalStatus | undefined;
  readonly labValuesLocked?: boolean | undefined;
  readonly approvedBy?: string | undefined;
  readonly approvedAt?: IsoTimestamp | undefined;
  readonly approvalHistory?: readonly OilSampleApprovalHistoryEntry[] | undefined;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Input for creating a new oil sample at intake. */
export interface OilSampleCreateRequest {
  readonly equipmentId: EquipmentId;
  readonly sampledAt: IsoTimestamp;
  readonly importSource: OilSampleImportSource;
  readonly labReferenceId?: string | undefined;
}

/** Input for updating an existing oil sample. */
export interface OilSampleUpdateRequest {
  readonly lubricationPointId?: string | undefined;
  readonly status?: OilSampleStatus | undefined;
  readonly resultStatus?: OilSampleResultStatus | undefined;
  readonly labReferenceId?: string | undefined;
}
