// apps/owner-center/src/modules/oil-analysis/status-engine.ts
// Centralized sample and approval status transition validation.

import type {
  OilSampleApprovalStatus,
  OilSampleRowStatus,
} from './sample.service';
import { isApprovalWorkflowEnabled } from './approval-workflow';

/** Logical lifecycle stages referenced in business rules. */
export type OilSampleLifecycleStage =
  | 'draft'
  | 'needs-lp-mapping'
  | 'linked'
  | 'analysed'
  | 'pending-review'
  | 'under-review'
  | 'approved'
  | 'locked'
  | 'cancelled';

export type OilSampleTransitionAction =
  | 'create'
  | 'confirm-lp'
  | 'enter-lab-results'
  | 'open-review'
  | 'approve'
  | 'reject'
  | 'return-for-correction'
  | 'auto-approve'
  | 'lock'
  | 'cancel';

const SAMPLE_STATUS_TRANSITIONS: Readonly<
  Record<OilSampleRowStatus, readonly OilSampleRowStatus[]>
> = {
  imported: ['needs-lp-mapping', 'linked', 'cancelled'],
  'pending-review': ['needs-lp-mapping', 'linked', 'cancelled'],
  'needs-lp-mapping': ['linked', 'cancelled'],
  linked: ['analysed', 'normal', 'caution', 'alert', 'cancelled'],
  analysed: ['normal', 'caution', 'alert', 'cancelled'],
  normal: ['normal', 'caution', 'alert', 'cancelled'],
  caution: ['normal', 'caution', 'alert', 'cancelled'],
  alert: ['normal', 'caution', 'alert', 'cancelled'],
  cancelled: [],
};

const APPROVAL_STATUS_TRANSITIONS: Readonly<
  Record<OilSampleApprovalStatus, readonly OilSampleApprovalStatus[]>
> = {
  pending: ['under-review', 'approved', 'locked'],
  'under-review': ['pending', 'approved', 'locked'],
  approved: ['locked'],
  locked: [],
};

const PRE_LP_STATUSES: readonly OilSampleRowStatus[] = [
  'imported',
  'pending-review',
  'needs-lp-mapping',
];

const LAB_ENTRY_STATUSES: readonly OilSampleRowStatus[] = [
  'linked',
  'analysed',
  'normal',
  'caution',
  'alert',
];

export function resolveInitialSampleStatus(
  defaultStatus: 'imported' | 'pending-review',
): OilSampleRowStatus {
  return defaultStatus === 'pending-review' ? 'pending-review' : 'imported';
}

export function assertSampleStatusTransition(
  from: OilSampleRowStatus,
  to: OilSampleRowStatus,
  action: string,
): void {
  if (from === to) return;
  const allowed = SAMPLE_STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Cannot ${action}: illegal sample status transition '${from}' → '${to}'.`);
  }
}

export function assertApprovalStatusTransition(
  from: OilSampleApprovalStatus | null,
  to: OilSampleApprovalStatus,
  action: string,
): void {
  if (from === null) {
    if (to !== 'pending' && to !== 'locked') {
      throw new Error(`Cannot ${action}: illegal approval status transition 'none' → '${to}'.`);
    }
    return;
  }
  if (from === to) return;
  const allowed = APPROVAL_STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Cannot ${action}: illegal approval status transition '${from}' → '${to}'.`);
  }
}

export function assertCanConfirmLp(status: OilSampleRowStatus, action: string): void {
  if (!PRE_LP_STATUSES.includes(status)) {
    throw new Error(`Cannot ${action} while sample status is '${status}'.`);
  }
}

export function assertCanEnterLabResults(
  status: OilSampleRowStatus,
  lubricationPointId: string | null,
  action: string,
): void {
  if (!lubricationPointId?.trim()) {
    throw new Error(`Cannot ${action}: lubrication point must be confirmed before analysis.`);
  }
  if (!LAB_ENTRY_STATUSES.includes(status)) {
    throw new Error(`Cannot ${action} while sample status is '${status}'.`);
  }
}

export function assertCanOpenReview(
  approvalStatus: OilSampleApprovalStatus | null,
  action: string,
): void {
  if (!isApprovalWorkflowEnabled()) {
    throw new Error(`Cannot ${action}: engineer approval workflow is disabled.`);
  }
  if (approvalStatus !== 'pending') {
    throw new Error(`Cannot ${action} while approval status is '${approvalStatus ?? 'none'}'.`);
  }
}

export function assertCanReviewAction(
  approvalStatus: OilSampleApprovalStatus | null,
  action: string,
): void {
  if (!isApprovalWorkflowEnabled()) {
    throw new Error(`Cannot ${action}: engineer approval workflow is disabled.`);
  }
  if (approvalStatus !== 'under-review') {
    throw new Error(`Cannot ${action} while approval status is '${approvalStatus ?? 'none'}'.`);
  }
}
