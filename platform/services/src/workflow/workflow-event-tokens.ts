// platform/services/src/workflow/workflow-event-tokens.ts
// Typed EventToken constants for the Workflow & Approval domain.

import { EventToken } from '@acc-reliability/kernel';

import type {
  WorkflowDefinitionCreatedPayload,
  WorkflowPublishedPayload,
  WorkflowDisabledPayload,
  WorkflowArchivedPayload,
  WorkflowStartedPayload,
  StepApprovedPayload,
  StepRejectedPayload,
  WorkflowCancelledPayload,
  WorkflowCompletedPayload,
} from '../contracts/platform-events';

export const WORKFLOW_DEFINITION_CREATED_TOKEN =
  new EventToken<WorkflowDefinitionCreatedPayload>('platform.workflows.definition.created');

export const WORKFLOW_PUBLISHED_TOKEN =
  new EventToken<WorkflowPublishedPayload>('platform.workflows.definition.published');

export const WORKFLOW_DISABLED_TOKEN =
  new EventToken<WorkflowDisabledPayload>('platform.workflows.definition.disabled');

export const WORKFLOW_ARCHIVED_TOKEN =
  new EventToken<WorkflowArchivedPayload>('platform.workflows.definition.archived');

export const WORKFLOW_STARTED_TOKEN =
  new EventToken<WorkflowStartedPayload>('platform.workflows.instance.started');

export const STEP_APPROVED_TOKEN =
  new EventToken<StepApprovedPayload>('platform.workflows.step.approved');

export const STEP_REJECTED_TOKEN =
  new EventToken<StepRejectedPayload>('platform.workflows.step.rejected');

export const WORKFLOW_CANCELLED_TOKEN =
  new EventToken<WorkflowCancelledPayload>('platform.workflows.instance.cancelled');

export const WORKFLOW_COMPLETED_TOKEN =
  new EventToken<WorkflowCompletedPayload>('platform.workflows.instance.completed');
