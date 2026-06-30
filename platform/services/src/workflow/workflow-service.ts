// platform/services/src/workflow/workflow-service.ts
// WorkflowService — the authoritative Workflow & Approval domain service.
//
// Service id: platform.workflows

import type { IEventBus } from '@acc-reliability/kernel';

import type { IAuditService, AuditActor } from '../audit/audit-types';
import { createCorrelationId } from '../contracts/correlation';
import {
  WorkflowDefinitionNotFoundError,
  WorkflowInstanceNotFoundError,
  WorkflowDefinitionDuplicateError,
  WorkflowLifecycleError,
  WorkflowInstanceLifecycleError,
} from '../errors';

import {
  generateWorkflowDefinitionId,
  generateWorkflowInstanceId,
} from './workflow-types';
import type {
  WorkflowDefinitionRecord,
  WorkflowDefinitionId,
  WorkflowDefinitionStatus,
  WorkflowInstanceRecord,
  WorkflowInstanceId,
  WorkflowInstanceStatus,
  WorkflowStep,
  ApprovalRule,
  EscalationRule,
  SlaRule,
  ConditionRule,
  WorkflowVersion,
  WorkflowStepState,
  WorkflowType,
  ActorRef,
  CreateWorkflowDefinitionRequest,
  UpdateWorkflowDefinitionRequest,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionListResult,
  WorkflowInstanceListQuery,
  WorkflowInstanceListResult,
  WorkflowSummary,
  IWorkflowRepository,
  IWorkflowService,
} from './workflow-types';

import {
  WORKFLOW_DEFINITION_CREATED_TOKEN,
  WORKFLOW_PUBLISHED_TOKEN,
  WORKFLOW_DISABLED_TOKEN,
  WORKFLOW_ARCHIVED_TOKEN,
  WORKFLOW_STARTED_TOKEN,
  STEP_APPROVED_TOKEN,
  STEP_REJECTED_TOKEN,
  WORKFLOW_CANCELLED_TOKEN,
  WORKFLOW_COMPLETED_TOKEN,
} from './workflow-event-tokens';

const DEFAULT_STEP: WorkflowStep = Object.freeze({
  stepKey: 'review',
  name:    'Review',
  order:   1,
  approverRole: 'approver',
});

export class WorkflowService implements IWorkflowService {
  constructor(
    private readonly repository: IWorkflowRepository,
    private readonly auditService: IAuditService,
    private readonly eventBus: IEventBus,
  ) {}

  createDefinition(request: CreateWorkflowDefinitionRequest, actor: ActorRef): WorkflowDefinitionRecord {
    const existing = this.repository.findDefinitionByKey(request.workflowKey);
    if (existing !== null) {
      throw new WorkflowDefinitionDuplicateError(request.workflowKey);
    }

    const now = new Date().toISOString();
    const id  = request.id ?? generateWorkflowDefinitionId();
    const steps = freezeSteps(request.steps ?? [DEFAULT_STEP]);

    const record: WorkflowDefinitionRecord = Object.freeze({
      id,
      workflowKey:     request.workflowKey,
      name:            request.name,
      ...(request.description !== undefined ? { description: request.description } : {}),
      status:          'draft' as WorkflowDefinitionStatus,
      version:         1,
      workflowType:    (request.workflowType ?? 'sequential') as WorkflowType,
      ...(request.slaHours !== undefined ? { slaHours: request.slaHours } : {}),
      steps,
      approvalRules:   freezeApprovalRules(request.approvalRules ?? []),
      escalationRules: freezeEscalationRules(request.escalationRules ?? []),
      slaRules:        freezeSlaRules(request.slaRules ?? []),
      conditionRules:  freezeConditionRules(request.conditionRules ?? []),
      versions:        Object.freeze([]),
      createdAt:       now,
      createdBy:       actor.userId,
      updatedAt:       now,
      updatedBy:       actor.userId,
    });

    const saved = this.repository.saveDefinition(record);

    this.recordDefinitionAudit(actor, 'create', 'success', saved.id, {
      description: `Workflow definition '${saved.name}' (${saved.workflowKey}) created`,
      afterValue:  this.sanitizeDefinition(saved),
    });

    this.eventBus.publish(WORKFLOW_DEFINITION_CREATED_TOKEN, {
      id:           saved.id,
      workflowKey:  saved.workflowKey,
      name:         saved.name,
      workflowType: saved.workflowType,
      createdBy:    actor.userId,
      createdAt:    now,
    });

    return saved;
  }

  findDefinitionById(id: WorkflowDefinitionId): WorkflowDefinitionRecord | null {
    return this.repository.findDefinitionById(id);
  }

  findDefinitionByKey(workflowKey: string): WorkflowDefinitionRecord | null {
    return this.repository.findDefinitionByKey(workflowKey);
  }

  listDefinitions(query?: WorkflowDefinitionListQuery): WorkflowDefinitionListResult {
    return this.repository.listDefinitions(query);
  }

  updateDefinition(
    id: WorkflowDefinitionId,
    request: UpdateWorkflowDefinitionRequest,
    actor: ActorRef,
  ): WorkflowDefinitionRecord {
    const existing = this.getDefinitionOrThrow(id);
    if (existing.status === 'archived') {
      throw new WorkflowLifecycleError(id, existing.status, 'update');
    }
    if (existing.status === 'published') {
      throw new WorkflowLifecycleError(id, existing.status, 'update');
    }

    const now = new Date().toISOString();
    const changedFields: string[] = [];
    let updated: WorkflowDefinitionRecord = existing;

    if (request.name !== undefined && request.name !== existing.name) {
      changedFields.push('name');
      updated = { ...updated, name: request.name };
    }
    if (request.description !== undefined && request.description !== existing.description) {
      changedFields.push('description');
      updated = { ...updated, description: request.description };
    }
    if (request.workflowType !== undefined && request.workflowType !== existing.workflowType) {
      changedFields.push('workflowType');
      updated = { ...updated, workflowType: request.workflowType };
    }
    if (request.slaHours !== undefined && request.slaHours !== existing.slaHours) {
      changedFields.push('slaHours');
      updated = { ...updated, slaHours: request.slaHours };
    }
    if (request.steps !== undefined) {
      changedFields.push('steps');
      updated = { ...updated, steps: freezeSteps(request.steps) };
    }
    if (request.approvalRules !== undefined) {
      changedFields.push('approvalRules');
      updated = { ...updated, approvalRules: freezeApprovalRules(request.approvalRules) };
    }
    if (request.escalationRules !== undefined) {
      changedFields.push('escalationRules');
      updated = { ...updated, escalationRules: freezeEscalationRules(request.escalationRules) };
    }
    if (request.slaRules !== undefined) {
      changedFields.push('slaRules');
      updated = { ...updated, slaRules: freezeSlaRules(request.slaRules) };
    }
    if (request.conditionRules !== undefined) {
      changedFields.push('conditionRules');
      updated = { ...updated, conditionRules: freezeConditionRules(request.conditionRules) };
    }

    if (changedFields.length === 0) {
      return existing;
    }

    updated = Object.freeze({ ...updated, updatedAt: now, updatedBy: actor.userId });
    const saved = this.repository.updateDefinition(updated);

    this.recordDefinitionAudit(actor, 'update', 'success', saved.id, {
      description: `Workflow definition '${saved.name}' (${saved.workflowKey}) updated (${changedFields.join(', ')})`,
      beforeValue: this.sanitizeDefinition(existing),
      afterValue:  this.sanitizeDefinition(saved),
    });

    return saved;
  }

  publishDefinition(id: WorkflowDefinitionId, actor: ActorRef): WorkflowDefinitionRecord {
    const existing = this.getDefinitionOrThrow(id);
    if (existing.status !== 'draft' && existing.status !== 'disabled') {
      throw new WorkflowLifecycleError(id, existing.status, 'publish');
    }

    const now = new Date().toISOString();
    const newVersion = existing.status === 'disabled' ? existing.version + 1 : existing.version;

    const versionSnapshot: WorkflowVersion = Object.freeze({
      version:         newVersion,
      publishedAt:     now,
      publishedBy:     actor.userId,
      steps:           existing.steps,
      approvalRules:   existing.approvalRules,
      escalationRules: existing.escalationRules,
      slaRules:        existing.slaRules,
      conditionRules:  existing.conditionRules,
    });

    const updated: WorkflowDefinitionRecord = Object.freeze({
      ...existing,
      status:      'published' as WorkflowDefinitionStatus,
      version:     newVersion,
      publishedAt: now,
      publishedBy: actor.userId,
      updatedAt:   now,
      updatedBy:   actor.userId,
      versions:    Object.freeze([...existing.versions, versionSnapshot]),
    });

    const saved = this.repository.updateDefinition(updated);

    this.recordDefinitionAudit(actor, 'update', 'success', saved.id, {
      description: `Workflow definition '${saved.name}' (${saved.workflowKey}) published as v${saved.version}`,
      beforeValue: this.sanitizeDefinition(existing),
      afterValue:  this.sanitizeDefinition(saved),
    });

    this.eventBus.publish(WORKFLOW_PUBLISHED_TOKEN, {
      id:          saved.id,
      workflowKey: saved.workflowKey,
      version:     saved.version,
      publishedBy: actor.userId,
      publishedAt: now,
    });

    return saved;
  }

  disableDefinition(id: WorkflowDefinitionId, reason: string, actor: ActorRef): WorkflowDefinitionRecord {
    const existing = this.getDefinitionOrThrow(id);
    if (existing.status !== 'published') {
      throw new WorkflowLifecycleError(id, existing.status, 'disable');
    }

    const now = new Date().toISOString();
    const updated: WorkflowDefinitionRecord = Object.freeze({
      ...existing,
      status:         'disabled' as WorkflowDefinitionStatus,
      disabledAt:     now,
      disabledBy:     actor.userId,
      disabledReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.updateDefinition(updated);

    this.recordDefinitionAudit(actor, 'update', 'success', saved.id, {
      description: `Workflow definition '${saved.name}' (${saved.workflowKey}) disabled`,
      reason,
      beforeValue: this.sanitizeDefinition(existing),
      afterValue:  this.sanitizeDefinition(saved),
    });

    this.eventBus.publish(WORKFLOW_DISABLED_TOKEN, {
      id:          saved.id,
      workflowKey: saved.workflowKey,
      disabledBy:  actor.userId,
      disabledAt:  now,
      reason,
    });

    return saved;
  }

  archiveDefinition(id: WorkflowDefinitionId, reason: string, actor: ActorRef): WorkflowDefinitionRecord {
    const existing = this.getDefinitionOrThrow(id);
    if (existing.status === 'archived') {
      throw new WorkflowLifecycleError(id, existing.status, 'archive');
    }

    const now = new Date().toISOString();
    const updated: WorkflowDefinitionRecord = Object.freeze({
      ...existing,
      status:         'archived' as WorkflowDefinitionStatus,
      archivedAt:     now,
      archivedBy:     actor.userId,
      archivedReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.updateDefinition(updated);

    this.recordDefinitionAudit(actor, 'update', 'success', saved.id, {
      description: `Workflow definition '${saved.name}' (${saved.workflowKey}) archived`,
      reason,
      beforeValue: this.sanitizeDefinition(existing),
      afterValue:  this.sanitizeDefinition(saved),
    });

    this.eventBus.publish(WORKFLOW_ARCHIVED_TOKEN, {
      id:          saved.id,
      workflowKey: saved.workflowKey,
      archivedBy:  actor.userId,
      archivedAt:  now,
      reason,
    });

    return saved;
  }

  restoreDefinition(id: WorkflowDefinitionId, actor: ActorRef): WorkflowDefinitionRecord {
    const existing = this.getDefinitionOrThrow(id);
    if (existing.status !== 'archived') {
      throw new WorkflowLifecycleError(id, existing.status, 'restore');
    }

    const now = new Date().toISOString();
    const updated: WorkflowDefinitionRecord = Object.freeze({
      ...existing,
      status:     'draft' as WorkflowDefinitionStatus,
      restoredAt: now,
      restoredBy: actor.userId,
      updatedAt:  now,
      updatedBy:  actor.userId,
    });

    const saved = this.repository.updateDefinition(updated);

    this.recordDefinitionAudit(actor, 'update', 'success', saved.id, {
      description: `Workflow definition '${saved.name}' (${saved.workflowKey}) restored to draft`,
      beforeValue: this.sanitizeDefinition(existing),
      afterValue:  this.sanitizeDefinition(saved),
    });

    return saved;
  }

  getSummary(): WorkflowSummary {
    let activeWorkflows   = 0;
    let pendingApprovals  = 0;
    let slaRules          = 0;
    let escalations       = 0;

    const allDefs = this.repository.listDefinitions({ limit: 10_000 });
    for (const def of allDefs.definitions) {
      if (def.status === 'published') activeWorkflows += 1;
      if (def.status !== 'archived') {
        slaRules    += def.slaRules.length;
        escalations += def.escalationRules.length;
      }
    }

    const allInst = this.repository.listInstances({ limit: 10_000 });
    for (const inst of allInst.instances) {
      if (inst.status !== 'running' && inst.status !== 'paused') continue;
      const hasPending = inst.stepStates.some((s) => s.status === 'awaiting-approval');
      if (hasPending) pendingApprovals += 1;
    }

    return Object.freeze({
      activeWorkflows,
      pendingApprovals,
      slaRules,
      escalations,
      capturedAt: new Date().toISOString(),
    });
  }

  startWorkflow(definitionId: WorkflowDefinitionId, actor: ActorRef): WorkflowInstanceRecord {
    const definition = this.getDefinitionOrThrow(definitionId);
    if (definition.status !== 'published') {
      throw new WorkflowLifecycleError(definitionId, definition.status, 'start');
    }

    const now = new Date().toISOString();
    const sortedSteps = [...definition.steps].sort((a, b) => a.order - b.order);
    const stepStates = this.buildInitialStepStates(sortedSteps);

    const instance: WorkflowInstanceRecord = Object.freeze({
      id:                 generateWorkflowInstanceId(),
      definitionId:       definition.id,
      workflowKey:        definition.workflowKey,
      definitionVersion:  definition.version,
      status:             this.deriveInstanceStatus(stepStates),
      currentStepIndex:   this.findCurrentStepIndex(stepStates),
      stepStates,
      startedAt:          now,
      startedBy:          actor.userId,
    });

    const saved = this.repository.saveInstance(instance);

    this.recordInstanceAudit(actor, 'create', 'success', saved.id, {
      description: `Workflow instance started for '${definition.workflowKey}' v${definition.version}`,
      afterValue:  this.sanitizeInstance(saved),
    });

    this.eventBus.publish(WORKFLOW_STARTED_TOKEN, {
      instanceId:         saved.id,
      definitionId:       saved.definitionId,
      workflowKey:        saved.workflowKey,
      definitionVersion:  saved.definitionVersion,
      startedBy:          actor.userId,
      startedAt:          now,
    });

    return saved;
  }

  approveStep(instanceId: WorkflowInstanceId, actor: ActorRef): WorkflowInstanceRecord {
    const existing = this.getInstanceOrThrow(instanceId);
    if (existing.status !== 'running' && existing.status !== 'paused') {
      throw new WorkflowInstanceLifecycleError(instanceId, existing.status, 'approveStep');
    }

    const stepIndex = existing.currentStepIndex;
    const currentStep = existing.stepStates[stepIndex];
    if (currentStep === undefined || currentStep.status !== 'awaiting-approval') {
      throw new WorkflowInstanceLifecycleError(instanceId, existing.status, 'approveStep');
    }

    const now = new Date().toISOString();
    let newStepStates = existing.stepStates.map((s, i) => {
      if (i !== stepIndex) return s;
      return Object.freeze({ ...s, status: 'approved' as const, decidedAt: now, decidedBy: actor.userId });
    });

    const nextPending = newStepStates.findIndex((s) => s.status === 'pending');
    if (nextPending >= 0) {
      newStepStates = newStepStates.map((s, i) => {
        if (i !== nextPending) return s;
        return Object.freeze({ ...s, status: 'awaiting-approval' as const });
      });
    }

    const allDone = newStepStates.every((s) => s.status === 'approved' || s.status === 'skipped');
    const status: WorkflowInstanceStatus = allDone ? 'completed' : 'running';
    const nextIndex = allDone
      ? stepIndex
      : (nextPending >= 0 ? nextPending : this.findCurrentStepIndex(newStepStates));

    const updated: WorkflowInstanceRecord = Object.freeze({
      ...existing,
      status,
      currentStepIndex: nextIndex,
      stepStates:       Object.freeze(newStepStates),
      ...(allDone ? { completedAt: now } : {}),
    });

    const saved = this.repository.updateInstance(updated);

    this.recordInstanceAudit(actor, 'update', 'success', saved.id, {
      description: `Step '${currentStep.stepKey}' approved on workflow instance ${saved.id}`,
      beforeValue: this.sanitizeInstance(existing),
      afterValue:  this.sanitizeInstance(saved),
    });

    this.eventBus.publish(STEP_APPROVED_TOKEN, {
      instanceId:   saved.id,
      definitionId: saved.definitionId,
      workflowKey:  saved.workflowKey,
      stepKey:      currentStep.stepKey,
      approvedBy:   actor.userId,
      approvedAt:   now,
    });

    if (allDone) {
      this.eventBus.publish(WORKFLOW_COMPLETED_TOKEN, {
        instanceId:   saved.id,
        definitionId: saved.definitionId,
        workflowKey:  saved.workflowKey,
        completedAt:  now,
      });
    }

    return saved;
  }

  rejectStep(instanceId: WorkflowInstanceId, reason: string, actor: ActorRef): WorkflowInstanceRecord {
    const existing = this.getInstanceOrThrow(instanceId);
    if (existing.status !== 'running' && existing.status !== 'paused') {
      throw new WorkflowInstanceLifecycleError(instanceId, existing.status, 'rejectStep');
    }

    const stepIndex = existing.currentStepIndex;
    const currentStep = existing.stepStates[stepIndex];
    if (currentStep === undefined || currentStep.status !== 'awaiting-approval') {
      throw new WorkflowInstanceLifecycleError(instanceId, existing.status, 'rejectStep');
    }

    const now = new Date().toISOString();
    const newStepStates = existing.stepStates.map((s, i) => {
      if (i !== stepIndex) return s;
      return Object.freeze({ ...s, status: 'rejected' as const, decidedAt: now, decidedBy: actor.userId });
    });

    const updated: WorkflowInstanceRecord = Object.freeze({
      ...existing,
      status:       'failed' as WorkflowInstanceStatus,
      stepStates:   Object.freeze(newStepStates),
      completedAt:  now,
    });

    const saved = this.repository.updateInstance(updated);

    this.recordInstanceAudit(actor, 'update', 'success', saved.id, {
      description: `Step '${currentStep.stepKey}' rejected on workflow instance ${saved.id}`,
      reason,
      beforeValue: this.sanitizeInstance(existing),
      afterValue:  this.sanitizeInstance(saved),
    });

    this.eventBus.publish(STEP_REJECTED_TOKEN, {
      instanceId:   saved.id,
      definitionId: saved.definitionId,
      workflowKey:  saved.workflowKey,
      stepKey:      currentStep.stepKey,
      rejectedBy:   actor.userId,
      rejectedAt:   now,
      reason,
    });

    return saved;
  }

  cancelWorkflow(instanceId: WorkflowInstanceId, reason: string, actor: ActorRef): WorkflowInstanceRecord {
    const existing = this.getInstanceOrThrow(instanceId);
    if (existing.status === 'completed' || existing.status === 'failed' || existing.status === 'cancelled') {
      throw new WorkflowInstanceLifecycleError(instanceId, existing.status, 'cancel');
    }

    const now = new Date().toISOString();
    const updated: WorkflowInstanceRecord = Object.freeze({
      ...existing,
      status:          'cancelled' as WorkflowInstanceStatus,
      cancelledAt:     now,
      cancelledBy:     actor.userId,
      cancelledReason: reason,
    });

    const saved = this.repository.updateInstance(updated);

    this.recordInstanceAudit(actor, 'update', 'success', saved.id, {
      description: `Workflow instance ${saved.id} cancelled`,
      reason,
      beforeValue: this.sanitizeInstance(existing),
      afterValue:  this.sanitizeInstance(saved),
    });

    this.eventBus.publish(WORKFLOW_CANCELLED_TOKEN, {
      instanceId:   saved.id,
      definitionId: saved.definitionId,
      workflowKey:  saved.workflowKey,
      cancelledBy:  actor.userId,
      cancelledAt:  now,
      reason,
    });

    return saved;
  }

  findInstanceById(id: WorkflowInstanceId): WorkflowInstanceRecord | null {
    return this.repository.findInstanceById(id);
  }

  listInstances(query?: WorkflowInstanceListQuery): WorkflowInstanceListResult {
    return this.repository.listInstances(query);
  }

  private getDefinitionOrThrow(id: WorkflowDefinitionId): WorkflowDefinitionRecord {
    const record = this.repository.findDefinitionById(id);
    if (record === null) {
      throw new WorkflowDefinitionNotFoundError(id);
    }
    return record;
  }

  private getInstanceOrThrow(id: WorkflowInstanceId): WorkflowInstanceRecord {
    const record = this.repository.findInstanceById(id);
    if (record === null) {
      throw new WorkflowInstanceNotFoundError(id);
    }
    return record;
  }

  private buildInitialStepStates(steps: readonly WorkflowStep[]): readonly WorkflowStepState[] {
    let foundFirst = false;
    return Object.freeze(steps.map((step) => {
      if (!foundFirst) {
        foundFirst = true;
        return Object.freeze({
          stepKey: step.stepKey,
          status:  'awaiting-approval' as const,
        });
      }
      return Object.freeze({ stepKey: step.stepKey, status: 'pending' as const });
    }));
  }

  private findCurrentStepIndex(stepStates: readonly WorkflowStepState[]): number {
    const idx = stepStates.findIndex((s) => s.status === 'awaiting-approval');
    if (idx >= 0) return idx;
    return Math.max(0, stepStates.length - 1);
  }

  private deriveInstanceStatus(stepStates: readonly WorkflowStepState[]): WorkflowInstanceStatus {
    const awaiting = stepStates.some((s) => s.status === 'awaiting-approval');
    return awaiting ? 'running' : 'completed';
  }

  private recordDefinitionAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    entityId: WorkflowDefinitionId,
    opts: {
      description?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      reason?: string;
      beforeValue?: unknown;
      afterValue?: unknown;
    } = {},
  ): void {
    const auditActor: AuditActor = {
      userId:       actor.userId,
      contractorId: actor.contractorId,
    };

    this.auditService.record({
      category:  'data',
      action,
      outcome,
      actor:     auditActor,
      resource:  {
        module:     'owner-center',
        entityType: 'WorkflowDefinition',
        entityId,
      },
      clientType: 'system',
      ...(opts.description !== undefined ? { description: opts.description } : {}),
      ...(opts.severity    !== undefined ? { severity:    opts.severity    } : {}),
      ...(opts.reason      !== undefined ? { reason:      opts.reason      } : {}),
      ...(opts.beforeValue !== undefined ? { beforeValue: opts.beforeValue } : {}),
      ...(opts.afterValue  !== undefined ? { afterValue:  opts.afterValue  } : {}),
      correlationId: this.newCorrelationId(),
    });
  }

  private recordInstanceAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    instanceId: WorkflowInstanceId,
    opts: {
      description?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      reason?: string;
      beforeValue?: unknown;
      afterValue?: unknown;
    } = {},
  ): void {
    const auditActor: AuditActor = {
      userId:       actor.userId,
      contractorId: actor.contractorId,
    };

    this.auditService.record({
      category:  'data',
      action,
      outcome,
      actor:     auditActor,
      resource:  {
        module:     'owner-center',
        entityType: 'WorkflowInstance',
        entityId:   instanceId,
      },
      clientType: 'system',
      ...(opts.description !== undefined ? { description: opts.description } : {}),
      ...(opts.severity    !== undefined ? { severity:    opts.severity    } : {}),
      ...(opts.reason      !== undefined ? { reason:      opts.reason      } : {}),
      ...(opts.beforeValue !== undefined ? { beforeValue: opts.beforeValue } : {}),
      ...(opts.afterValue  !== undefined ? { afterValue:  opts.afterValue  } : {}),
      correlationId: this.newCorrelationId(),
    });
  }

  private newCorrelationId() {
    return createCorrelationId(`wfl-op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  }

  private sanitizeDefinition(record: WorkflowDefinitionRecord): Record<string, unknown> {
    return {
      id: record.id,
      workflowKey: record.workflowKey,
      name: record.name,
      status: record.status,
      version: record.version,
      workflowType: record.workflowType,
      slaHours: record.slaHours,
      stepCount: record.steps.length,
    };
  }

  private sanitizeInstance(record: WorkflowInstanceRecord): Record<string, unknown> {
    return {
      id: record.id,
      definitionId: record.definitionId,
      workflowKey: record.workflowKey,
      status: record.status,
      currentStepIndex: record.currentStepIndex,
    };
  }
}

function freezeSteps(steps: readonly WorkflowStep[]): readonly WorkflowStep[] {
  return Object.freeze(steps.map((s) => Object.freeze({ ...s })));
}

function freezeApprovalRules(rules: readonly ApprovalRule[]): readonly ApprovalRule[] {
  return Object.freeze(rules.map((r) => Object.freeze({
    ...r,
    approverRoles: Object.freeze([...r.approverRoles]),
  })));
}

function freezeEscalationRules(rules: readonly EscalationRule[]): readonly EscalationRule[] {
  return Object.freeze(rules.map((r) => Object.freeze({
    ...r,
    escalateToRoles: Object.freeze([...r.escalateToRoles]),
  })));
}

function freezeSlaRules(rules: readonly SlaRule[]): readonly SlaRule[] {
  return Object.freeze(rules.map((r) => Object.freeze({ ...r })));
}

function freezeConditionRules(rules: readonly ConditionRule[]): readonly ConditionRule[] {
  return Object.freeze(rules.map((r) => Object.freeze({ ...r })));
}
