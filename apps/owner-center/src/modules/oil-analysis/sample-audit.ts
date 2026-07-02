// apps/owner-center/src/modules/oil-analysis/sample-audit.ts
// Centralized audit recording for oil analysis sample transitions.

import type {
  OilSampleApprovalHistoryEntry,
  OilSampleApprovalStatus,
  OilSampleLpMappingHistoryEntry,
  OilSampleRow,
  OilSampleRowStatus,
  OilSampleApprovalAction,
} from './sample.service';

function isoNow(): string {
  return new Date().toISOString();
}

export type OilSampleAuditKind = 'approval' | 'lp-mapping' | 'status';

export interface OilSampleAuditRecord {
  readonly kind: OilSampleAuditKind;
  readonly action: string;
  readonly actor: string;
  readonly at?: string;
  readonly reason?: string;
  readonly fromSampleStatus?: OilSampleRowStatus;
  readonly toSampleStatus?: OilSampleRowStatus;
  readonly fromApprovalStatus?: OilSampleApprovalStatus | null;
  readonly toApprovalStatus?: OilSampleApprovalStatus | null;
  readonly lubricationPointId?: string;
}

function appendApprovalHistory(
  row: OilSampleRow,
  entry: Omit<OilSampleApprovalHistoryEntry, 'at'> & { at?: string },
): readonly OilSampleApprovalHistoryEntry[] {
  return [
    ...row.approvalHistory,
    {
      ...entry,
      at: entry.at ?? isoNow(),
    },
  ];
}

function appendLpMappingHistory(
  row: OilSampleRow,
  entry: Omit<OilSampleLpMappingHistoryEntry, 'at'> & { at?: string },
): readonly OilSampleLpMappingHistoryEntry[] {
  return [
    ...row.lpMappingHistory,
    {
      ...entry,
      at: entry.at ?? isoNow(),
    },
  ];
}

/**
 * Apply a single audit record to sample history arrays.
 * All automatic and manual transitions must use this helper.
 */
export function applySampleAudit(
  row: OilSampleRow,
  record: OilSampleAuditRecord,
): Pick<OilSampleRow, 'approvalHistory' | 'lpMappingHistory'> {
  const at = record.at ?? isoNow();
  const notes = record.reason?.trim() || undefined;

  if (record.kind === 'lp-mapping') {
    if (!record.lubricationPointId || !record.fromSampleStatus || !record.toSampleStatus) {
      throw new Error('LP mapping audit requires lubricationPointId and sample status fields.');
    }
    return {
      approvalHistory: row.approvalHistory,
      lpMappingHistory: appendLpMappingHistory(row, {
        action: 'confirmed',
        actor: record.actor,
        at,
        lubricationPointId: record.lubricationPointId,
        fromStatus: record.fromSampleStatus,
        toStatus: record.toSampleStatus,
        ...(notes ? { notes } : {}),
      }),
    };
  }

  if (record.kind === 'approval') {
    const fromStatus = record.fromApprovalStatus ?? row.approvalStatus ?? 'pending';
    const toStatus = record.toApprovalStatus ?? row.approvalStatus ?? 'pending';
    const action = record.action as OilSampleApprovalAction;
    return {
      approvalHistory: appendApprovalHistory(row, {
        action,
        actor: record.actor,
        at,
        fromStatus,
        toStatus,
        ...(notes ? { notes } : {}),
      }),
      lpMappingHistory: row.lpMappingHistory,
    };
  }

  // Status-only automatic transitions (condition evaluation, auto-approve) use approval history.
  if (record.fromApprovalStatus !== undefined && record.toApprovalStatus !== undefined) {
    return {
      approvalHistory: appendApprovalHistory(row, {
        action: record.action as OilSampleApprovalAction,
        actor: record.actor,
        at,
        fromStatus: record.fromApprovalStatus ?? 'pending',
        toStatus: record.toApprovalStatus ?? 'pending',
        ...(notes ? { notes } : {}),
      }),
      lpMappingHistory: row.lpMappingHistory,
    };
  }

  return {
    approvalHistory: row.approvalHistory,
    lpMappingHistory: row.lpMappingHistory,
  };
}
