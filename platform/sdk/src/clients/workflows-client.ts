// platform/sdk/src/clients/workflows-client.ts
// SDK Workflow & Approval client interface.

import type {
  WorkflowDefinitionRecord,
  WorkflowDefinitionStatus,
  WorkflowDefinitionId,
  WorkflowInstanceRecord,
  WorkflowInstanceId,
  WorkflowType,
  WorkflowStep,
  ApprovalRule,
  EscalationRule,
  SlaRule,
  ConditionRule,
  CreateWorkflowDefinitionRequest,
  UpdateWorkflowDefinitionRequest,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionListResult,
  WorkflowInstanceListQuery,
  WorkflowInstanceListResult,
  WorkflowSummary,
} from '@acc-reliability/services';

export type {
  WorkflowDefinitionRecord,
  WorkflowDefinitionStatus,
  WorkflowDefinitionId,
  WorkflowInstanceRecord,
  WorkflowInstanceId,
  WorkflowType,
  WorkflowStep,
  ApprovalRule,
  EscalationRule,
  SlaRule,
  ConditionRule,
  CreateWorkflowDefinitionRequest,
  UpdateWorkflowDefinitionRequest,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionListResult,
  WorkflowInstanceListQuery,
  WorkflowInstanceListResult,
  WorkflowSummary,
};

/**
 * SDK Workflow & Approval client.
 *
 * Manages workflow definitions, approval configuration, and basic instance
 * lifecycle.  Business modules submit workflow requests through this client;
 * they must not implement independent workflow engines.
 */
export interface IWorkflowsClient {
  createDefinition(request: CreateWorkflowDefinitionRequest): WorkflowDefinitionRecord;
  findDefinitionById(id: WorkflowDefinitionId): WorkflowDefinitionRecord | null;
  findDefinitionByKey(workflowKey: string): WorkflowDefinitionRecord | null;
  listDefinitions(query?: WorkflowDefinitionListQuery): WorkflowDefinitionListResult;
  updateDefinition(id: WorkflowDefinitionId, request: UpdateWorkflowDefinitionRequest): WorkflowDefinitionRecord;
  publishDefinition(id: WorkflowDefinitionId): WorkflowDefinitionRecord;
  disableDefinition(id: WorkflowDefinitionId, reason: string): WorkflowDefinitionRecord;
  archiveDefinition(id: WorkflowDefinitionId, reason: string): WorkflowDefinitionRecord;
  restoreDefinition(id: WorkflowDefinitionId): WorkflowDefinitionRecord;
  getSummary(): WorkflowSummary;

  startWorkflow(definitionId: WorkflowDefinitionId): WorkflowInstanceRecord;
  approveStep(instanceId: WorkflowInstanceId): WorkflowInstanceRecord;
  rejectStep(instanceId: WorkflowInstanceId, reason: string): WorkflowInstanceRecord;
  cancelWorkflow(instanceId: WorkflowInstanceId, reason: string): WorkflowInstanceRecord;
  findInstanceById(id: WorkflowInstanceId): WorkflowInstanceRecord | null;
  listInstances(query?: WorkflowInstanceListQuery): WorkflowInstanceListResult;
}
