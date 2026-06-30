// platform/sdk/src/impl/null-workflow-client.ts
// Placeholder IWorkflowClient — the workflow engine is not yet implemented.
//
// All methods throw a typed not-implemented error so modules can be written
// against the IWorkflowClient contract today and wired to the real engine
// in the workflow milestone (PS-116).

import { PlatformError } from '@acc-reliability/kernel';
import type { WorkflowInstanceSummary, IWorkflowClient } from '../clients/workflow-client';

/**
 * No-op workflow client stub used during the pre-workflow bootstrap phase.
 *
 * @remarks
 * Registered under the `workflow` slot in {@link PlatformSdk} until PS-116
 * is wired.  All methods throw a typed not-implemented error.
 */
export class NullWorkflowClient implements IWorkflowClient {
  async startWorkflow(
    _templateId: string,
    _payload: Record<string, unknown>,
  ): Promise<string> {
    throw new PlatformError(
      'Workflow engine is not yet implemented (PS-116). Wire a real workflow engine before calling startWorkflow().',
      'WORKFLOW_NOT_IMPLEMENTED',
    );
  }

  async getStatus(_instanceId: string): Promise<WorkflowInstanceSummary | null> {
    throw new PlatformError(
      'Workflow engine is not yet implemented (PS-116). Wire a real workflow engine before calling getStatus().',
      'WORKFLOW_NOT_IMPLEMENTED',
    );
  }
}
