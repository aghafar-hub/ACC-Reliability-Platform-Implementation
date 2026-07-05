// Platform Engineering Actions — status/priority UI adapters.

import type { StatusBadgeVariant, WorkflowStatus } from '../../../components/ui/types';
import type {
  EngineeringActionPriority,
  EngineeringActionStatus,
} from './engineering-action-types';

export function toWorkflowVariant(status: EngineeringActionStatus): WorkflowStatus {
  const map: Record<EngineeringActionStatus, WorkflowStatus> = {
    Draft: 'draft',
    Open: 'open',
    Assigned: 'assigned',
    'In Progress': 'in-progress',
    'Waiting Shutdown': 'waiting-shutdown',
    Completed: 'completed',
    Verified: 'verified',
    Closed: 'closed',
  };
  return map[status];
}

export function priorityBadgeVariant(
  priority: EngineeringActionPriority,
): StatusBadgeVariant {
  switch (priority) {
    case 'Critical':
      return 'critical';
    case 'High':
      return 'alert';
    case 'Medium':
      return 'caution';
    case 'Low':
    default:
      return 'info';
  }
}

export function actionStatusBadge(
  status: EngineeringActionStatus,
): { variant: StatusBadgeVariant; label: string } {
  return {
    variant: toWorkflowVariant(status),
    label: status,
  };
}

export function isOpenActionStatus(status: EngineeringActionStatus): boolean {
  return !['Completed', 'Verified', 'Closed'].includes(status);
}

export function detectOilChangeRequirement(meetingAction: string): boolean {
  const normalized = meetingAction.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('oil change') ||
    normalized.includes('schedule oil change') ||
    normalized.includes('change oil')
  );
}
