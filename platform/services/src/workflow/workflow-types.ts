// platform/services/src/workflow/workflow-types.ts
// Workflow & Approval domain entity, DTOs, repository and service contracts.
//
// Design:
//   - WorkflowDefinitionRecord is the authoritative workflow definition entity.
//   - WorkflowInstanceRecord tracks runtime execution of published definitions.
//   - Nested rule/step structures are frozen value objects on the definition.
//
//   - WorkflowDefinitionStatus lifecycle:
//       draft     → publish  → published
//       published → disable  → disabled
//       disabled  → publish  → published
//       draft | published | disabled → archive → archived
//       archived  → restore  → draft
//
// Service id reserved: platform.workflows

import type { UserId } from '../auth/auth-types';
import type { ActorRef } from '../user/user-types';

export type { ActorRef };

// ── WorkflowDefinitionStatus ──────────────────────────────────────────────────

export const WORKFLOW_DEFINITION_STATUSES = ['draft', 'published', 'disabled', 'archived'] as const;

export type WorkflowDefinitionStatus = typeof WORKFLOW_DEFINITION_STATUSES[number];

// ── WorkflowType ────────────────────────────────────────────────────────────────

export const WORKFLOW_TYPES = ['sequential', 'parallel', 'conditional'] as const;

export type WorkflowType = typeof WORKFLOW_TYPES[number];

// ── WorkflowInstanceStatus ──────────────────────────────────────────────────────

export const WORKFLOW_INSTANCE_STATUSES = [
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
] as const;

export type WorkflowInstanceStatus = typeof WORKFLOW_INSTANCE_STATUSES[number];

// ── WorkflowStepStatus ──────────────────────────────────────────────────────────

export const WORKFLOW_STEP_STATUSES = [
  'pending',
  'awaiting-approval',
  'approved',
  'rejected',
  'skipped',
] as const;

export type WorkflowStepStatus = typeof WORKFLOW_STEP_STATUSES[number];

// ── Branded IDs ───────────────────────────────────────────────────────────────

declare const WorkflowDefinitionIdBrand: unique symbol;
declare const WorkflowInstanceIdBrand: unique symbol;

export type WorkflowDefinitionId = string & { readonly [WorkflowDefinitionIdBrand]: 'WorkflowDefinitionId' };
export type WorkflowInstanceId = string & { readonly [WorkflowInstanceIdBrand]: 'WorkflowInstanceId' };

export function generateWorkflowDefinitionId(): WorkflowDefinitionId {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 11);
  return `wfd-${ts}-${rnd}` as WorkflowDefinitionId;
}

export function generateWorkflowInstanceId(): WorkflowInstanceId {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 11);
  return `wfi-${ts}-${rnd}` as WorkflowInstanceId;
}

export function createWorkflowDefinitionId(value: string): WorkflowDefinitionId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('WorkflowDefinitionId cannot be empty');
  return trimmed as WorkflowDefinitionId;
}

export function createWorkflowInstanceId(value: string): WorkflowInstanceId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('WorkflowInstanceId cannot be empty');
  return trimmed as WorkflowInstanceId;
}

// ── Nested value objects ────────────────────────────────────────────────────────

export interface WorkflowStep {
  readonly stepKey: string;
  readonly name: string;
  readonly order: number;
  readonly approverRole?: string;
}

export interface ApprovalRule {
  readonly ruleKey: string;
  readonly name: string;
  readonly approverRoles: readonly string[];
  readonly requiredApprovals: number;
}

export interface EscalationRule {
  readonly ruleKey: string;
  readonly name: string;
  readonly escalateAfterHours: number;
  readonly escalateToRoles: readonly string[];
}

export interface SlaRule {
  readonly ruleKey: string;
  readonly name: string;
  readonly targetHours: number;
}

export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'lt';

export interface ConditionRule {
  readonly ruleKey: string;
  readonly name: string;
  readonly field: string;
  readonly operator: ConditionOperator;
  readonly value: string;
}

export interface WorkflowVersion {
  readonly version: number;
  readonly publishedAt: string;
  readonly publishedBy: UserId;
  readonly steps: readonly WorkflowStep[];
  readonly approvalRules: readonly ApprovalRule[];
  readonly escalationRules: readonly EscalationRule[];
  readonly slaRules: readonly SlaRule[];
  readonly conditionRules: readonly ConditionRule[];
}

export interface WorkflowStepState {
  readonly stepKey: string;
  readonly status: WorkflowStepStatus;
  readonly decidedAt?: string;
  readonly decidedBy?: UserId;
}

// ── WorkflowDefinitionRecord ────────────────────────────────────────────────────

export interface WorkflowDefinitionRecord {
  readonly id: WorkflowDefinitionId;
  readonly workflowKey: string;
  readonly name: string;
  readonly description?: string;
  readonly status: WorkflowDefinitionStatus;
  readonly version: number;
  readonly workflowType: WorkflowType;
  readonly slaHours?: number;
  readonly steps: readonly WorkflowStep[];
  readonly approvalRules: readonly ApprovalRule[];
  readonly escalationRules: readonly EscalationRule[];
  readonly slaRules: readonly SlaRule[];
  readonly conditionRules: readonly ConditionRule[];
  readonly versions: readonly WorkflowVersion[];
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly updatedAt: string;
  readonly updatedBy: UserId;
  readonly publishedAt?: string;
  readonly publishedBy?: UserId;
  readonly disabledAt?: string;
  readonly disabledBy?: UserId;
  readonly disabledReason?: string;
  readonly archivedAt?: string;
  readonly archivedBy?: UserId;
  readonly archivedReason?: string;
  readonly restoredAt?: string;
  readonly restoredBy?: UserId;
}

// ── WorkflowInstanceRecord ──────────────────────────────────────────────────────

export interface WorkflowInstanceRecord {
  readonly id: WorkflowInstanceId;
  readonly definitionId: WorkflowDefinitionId;
  readonly workflowKey: string;
  readonly definitionVersion: number;
  readonly status: WorkflowInstanceStatus;
  readonly currentStepIndex: number;
  readonly stepStates: readonly WorkflowStepState[];
  readonly startedAt: string;
  readonly startedBy: UserId;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
  readonly cancelledBy?: UserId;
  readonly cancelledReason?: string;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateWorkflowDefinitionRequest {
  readonly id?: WorkflowDefinitionId;
  readonly workflowKey: string;
  readonly name: string;
  readonly description?: string;
  readonly workflowType?: WorkflowType;
  readonly slaHours?: number;
  readonly steps?: readonly WorkflowStep[];
  readonly approvalRules?: readonly ApprovalRule[];
  readonly escalationRules?: readonly EscalationRule[];
  readonly slaRules?: readonly SlaRule[];
  readonly conditionRules?: readonly ConditionRule[];
  readonly reason?: string;
}

export interface UpdateWorkflowDefinitionRequest {
  readonly name?: string;
  readonly description?: string;
  readonly workflowType?: WorkflowType;
  readonly slaHours?: number;
  readonly steps?: readonly WorkflowStep[];
  readonly approvalRules?: readonly ApprovalRule[];
  readonly escalationRules?: readonly EscalationRule[];
  readonly slaRules?: readonly SlaRule[];
  readonly conditionRules?: readonly ConditionRule[];
  readonly reason?: string;
}

export interface WorkflowDefinitionListQuery {
  readonly status?: WorkflowDefinitionStatus;
  readonly workflowType?: WorkflowType;
  readonly searchText?: string;
  readonly offset?: number;
  readonly limit?: number;
}

export interface WorkflowDefinitionListResult {
  readonly definitions: readonly WorkflowDefinitionRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

export interface WorkflowInstanceListQuery {
  readonly definitionId?: WorkflowDefinitionId;
  readonly status?: WorkflowInstanceStatus;
  readonly offset?: number;
  readonly limit?: number;
}

export interface WorkflowInstanceListResult {
  readonly instances: readonly WorkflowInstanceRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

export interface WorkflowSummary {
  readonly activeWorkflows: number;
  readonly pendingApprovals: number;
  readonly slaRules: number;
  readonly escalations: number;
  readonly capturedAt: string;
}

// ── IWorkflowRepository ─────────────────────────────────────────────────────────

export interface IWorkflowRepository {
  saveDefinition(definition: WorkflowDefinitionRecord): WorkflowDefinitionRecord;
  updateDefinition(definition: WorkflowDefinitionRecord): WorkflowDefinitionRecord;
  findDefinitionById(id: WorkflowDefinitionId): WorkflowDefinitionRecord | null;
  findDefinitionByKey(workflowKey: string): WorkflowDefinitionRecord | null;
  listDefinitions(query?: WorkflowDefinitionListQuery): WorkflowDefinitionListResult;

  saveInstance(instance: WorkflowInstanceRecord): WorkflowInstanceRecord;
  updateInstance(instance: WorkflowInstanceRecord): WorkflowInstanceRecord;
  findInstanceById(id: WorkflowInstanceId): WorkflowInstanceRecord | null;
  listInstances(query?: WorkflowInstanceListQuery): WorkflowInstanceListResult;
}

// ── IWorkflowService ──────────────────────────────────────────────────────────────

export interface IWorkflowService {
  createDefinition(request: CreateWorkflowDefinitionRequest, actor: ActorRef): WorkflowDefinitionRecord;
  findDefinitionById(id: WorkflowDefinitionId): WorkflowDefinitionRecord | null;
  findDefinitionByKey(workflowKey: string): WorkflowDefinitionRecord | null;
  listDefinitions(query?: WorkflowDefinitionListQuery): WorkflowDefinitionListResult;
  updateDefinition(id: WorkflowDefinitionId, request: UpdateWorkflowDefinitionRequest, actor: ActorRef): WorkflowDefinitionRecord;
  publishDefinition(id: WorkflowDefinitionId, actor: ActorRef): WorkflowDefinitionRecord;
  disableDefinition(id: WorkflowDefinitionId, reason: string, actor: ActorRef): WorkflowDefinitionRecord;
  archiveDefinition(id: WorkflowDefinitionId, reason: string, actor: ActorRef): WorkflowDefinitionRecord;
  restoreDefinition(id: WorkflowDefinitionId, actor: ActorRef): WorkflowDefinitionRecord;
  getSummary(): WorkflowSummary;

  startWorkflow(definitionId: WorkflowDefinitionId, actor: ActorRef): WorkflowInstanceRecord;
  approveStep(instanceId: WorkflowInstanceId, actor: ActorRef): WorkflowInstanceRecord;
  rejectStep(instanceId: WorkflowInstanceId, reason: string, actor: ActorRef): WorkflowInstanceRecord;
  cancelWorkflow(instanceId: WorkflowInstanceId, reason: string, actor: ActorRef): WorkflowInstanceRecord;
  findInstanceById(id: WorkflowInstanceId): WorkflowInstanceRecord | null;
  listInstances(query?: WorkflowInstanceListQuery): WorkflowInstanceListResult;
}
