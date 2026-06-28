// platform/sdk/src/clients/workflow-client.ts
// SDK workflow engine client interface.
//
// Placeholder for the Workflow Engine Service (PS-116).
// Business modules must define workflow templates through this client;
// they must never implement independent workflow engines.
//
// Status: INTERFACE STUB — no implementation exists yet.
// The methods are typed and documented so modules can be written against
// this contract now and wired to the real engine in a later patch.

// ── Workflow status ───────────────────────────────────────────────────────────

/**
 * Current execution state of a workflow instance.
 *
 *  - `'pending'`   — created but not yet started.
 *  - `'running'`   — actively executing steps.
 *  - `'paused'`    — execution suspended awaiting input or approval.
 *  - `'completed'` — reached a terminal success state.
 *  - `'failed'`    — reached a terminal failure state.
 *  - `'cancelled'` — explicitly cancelled before completion.
 */
export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Summary of a workflow instance returned by {@link IWorkflowClient.getStatus}.
 */
export interface WorkflowInstanceSummary {
  /** Unique identifier of the workflow instance. */
  readonly instanceId: string;
  /** Template that was used to create this instance. */
  readonly templateId: string;
  /** Current execution state. */
  readonly status: WorkflowStatus;
  /** ISO 8601 timestamp when the instance was started. */
  readonly startedAt: string;
  /** ISO 8601 timestamp when the instance reached a terminal state, if applicable. */
  readonly completedAt?: string | undefined;
}

// ── IWorkflowClient ───────────────────────────────────────────────────────────

/**
 * SDK workflow engine client.
 *
 * Business modules start and observe workflow instances through this client.
 * Workflow definitions (templates) are registered separately by the module
 * manifest — they are not created at runtime.
 *
 * @remarks
 * This interface is a forward declaration.  No engine implementation exists
 * in the current patch.  Calling any method on the runtime stub will throw
 * an "not implemented" error until PS-116 is wired.
 */
export interface IWorkflowClient {
  /**
   * Starts a new workflow instance from the named template.
   *
   * @param templateId  Stable workflow template identifier registered by the module.
   * @param payload     Initial context data passed to the first workflow step.
   * @returns The unique instance identifier assigned by the engine.
   */
  startWorkflow(
    templateId: string,
    payload: Record<string, unknown>,
  ): Promise<string>;

  /**
   * Returns a summary of the workflow instance with the given id.
   *
   * @param instanceId Instance id returned by {@link startWorkflow}.
   * @returns Instance summary, or `null` if the instance does not exist.
   */
  getStatus(instanceId: string): Promise<WorkflowInstanceSummary | null>;
}
