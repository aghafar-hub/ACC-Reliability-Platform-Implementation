// apps/owner-center/src/modules/oil-analysis/approval-workflow.ts
// Approval workflow mode derived from module settings.

import { oilAnalysisSettingsService } from './settings.service';
import type { OilSampleApprovalStatus, OilSampleRow } from './sample.service';

/** Engineer review workflow is active when both approval toggles are enabled. */
export function isApprovalWorkflowEnabled(): boolean {
  const { defaultApprovalWorkflowEnabled, requireEngineerApproval } =
    oilAnalysisSettingsService.getSettings().general;
  return defaultApprovalWorkflowEnabled && requireEngineerApproval;
}

/** Lab results skip manual review and are auto-approved when workflow is disabled. */
export function shouldAutoApproveAfterLabResults(): boolean {
  return !isApprovalWorkflowEnabled();
}

/** Sample results are finalized for trends/reports when locked or approved. */
export function isSampleResultFinalized(row: OilSampleRow): boolean {
  const status = row.approvalStatus;
  return status === 'approved' || status === 'locked';
}

export interface PostLabApprovalState {
  readonly approvalStatus: OilSampleApprovalStatus;
  readonly labValuesLocked: boolean;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
}

/** Resolve approval fields immediately after lab results are saved. */
export function resolvePostLabApprovalState(actor: string): PostLabApprovalState {
  const now = new Date().toISOString();
  if (shouldAutoApproveAfterLabResults()) {
    return {
      approvalStatus: 'locked',
      labValuesLocked: true,
      approvedBy: actor.trim() || 'System',
      approvedAt: now,
    };
  }
  return {
    approvalStatus: 'pending',
    labValuesLocked: false,
    approvedBy: null,
    approvedAt: null,
  };
}
