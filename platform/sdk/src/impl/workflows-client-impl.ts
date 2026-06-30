// platform/sdk/src/impl/workflows-client-impl.ts
// SDK bridge from IWorkflowsClient → IWorkflowService.

import type {
  IWorkflowService,
  WorkflowDefinitionRecord,
  WorkflowDefinitionId,
  WorkflowInstanceRecord,
  WorkflowInstanceId,
  CreateWorkflowDefinitionRequest,
  UpdateWorkflowDefinitionRequest,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionListResult,
  WorkflowInstanceListQuery,
  WorkflowInstanceListResult,
  WorkflowSummary,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { IWorkflowsClient } from '../clients/workflows-client';

export class WorkflowsClientImpl implements IWorkflowsClient {
  constructor(
    private readonly service: IWorkflowService,
    private readonly context: SdkContext,
  ) {}

  createDefinition(request: CreateWorkflowDefinitionRequest): WorkflowDefinitionRecord {
    return this.service.createDefinition(request, this.actor());
  }

  findDefinitionById(id: WorkflowDefinitionId): WorkflowDefinitionRecord | null {
    return this.service.findDefinitionById(id);
  }

  findDefinitionByKey(workflowKey: string): WorkflowDefinitionRecord | null {
    return this.service.findDefinitionByKey(workflowKey);
  }

  listDefinitions(query?: WorkflowDefinitionListQuery): WorkflowDefinitionListResult {
    return this.service.listDefinitions(query);
  }

  updateDefinition(id: WorkflowDefinitionId, request: UpdateWorkflowDefinitionRequest): WorkflowDefinitionRecord {
    return this.service.updateDefinition(id, request, this.actor());
  }

  publishDefinition(id: WorkflowDefinitionId): WorkflowDefinitionRecord {
    return this.service.publishDefinition(id, this.actor());
  }

  disableDefinition(id: WorkflowDefinitionId, reason: string): WorkflowDefinitionRecord {
    return this.service.disableDefinition(id, reason, this.actor());
  }

  archiveDefinition(id: WorkflowDefinitionId, reason: string): WorkflowDefinitionRecord {
    return this.service.archiveDefinition(id, reason, this.actor());
  }

  restoreDefinition(id: WorkflowDefinitionId): WorkflowDefinitionRecord {
    return this.service.restoreDefinition(id, this.actor());
  }

  getSummary(): WorkflowSummary {
    return this.service.getSummary();
  }

  startWorkflow(definitionId: WorkflowDefinitionId): WorkflowInstanceRecord {
    return this.service.startWorkflow(definitionId, this.actor());
  }

  approveStep(instanceId: WorkflowInstanceId): WorkflowInstanceRecord {
    return this.service.approveStep(instanceId, this.actor());
  }

  rejectStep(instanceId: WorkflowInstanceId, reason: string): WorkflowInstanceRecord {
    return this.service.rejectStep(instanceId, reason, this.actor());
  }

  cancelWorkflow(instanceId: WorkflowInstanceId, reason: string): WorkflowInstanceRecord {
    return this.service.cancelWorkflow(instanceId, reason, this.actor());
  }

  findInstanceById(id: WorkflowInstanceId): WorkflowInstanceRecord | null {
    return this.service.findInstanceById(id);
  }

  listInstances(query?: WorkflowInstanceListQuery): WorkflowInstanceListResult {
    return this.service.listInstances(query);
  }

  private actor() {
    return {
      userId:       this.context.currentUser.userId,
      contractorId: this.context.currentUser.contractorId,
    };
  }
}
