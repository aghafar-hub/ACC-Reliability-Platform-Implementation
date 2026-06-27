// platform/services/src/action/action-service.ts
// In-memory implementation of IActionService.
//
// Design constraints:
//   - No persistence, no external I/O, no real notifications.
//   - All records held in a Map<string, ActionRecord> keyed by ActionId,
//     maintained in insertion order.
//   - Contractor scope is enforced on create: non-ACC requestors may only
//     create actions within their own contractor scope.
//   - Every record is a frozen object; every mutating operation produces a
//     new frozen ActionRecord.  The previous version is replaced in the Map.
//   - Audit history is append-only; no entry is ever mutated or removed.
//   - FIFO eviction when maxRecordsInMemory is reached.
//
// Future integration hooks (no-op today):
//   - Storage Abstraction: persist via IRepository<ActionRecord>.
//   - INotificationService: emit on status transitions.
//   - Metrics Service: record action lifecycle durations and counts.
//   - Event Bus (Phase 9): publish ActionCreatedEvent / ActionCompletedEvent.

import type { UserId, ContractorId } from '../auth/auth-types';
import type { EquipmentId, PlatformModule } from '../contracts/communication-types';
import {
  ActionAssignment,
  ActionAttachment,
  ActionComment,
  ActionApproval,
  ActionFollower,
  ActionHistoryEntry,
  ActionId,
  ActionPriority,
  ActionRecord,
  ActionCreateRequest,
  ActionStatus,
  ActionSummary,
  ActionUpdateRequest,
  IActionService,
  ActionServiceOptions,
  generateActionId,
} from './action-types';
import {
  ActionNotFoundError,
  ActionScopeError,
  ActionTransitionError,
} from '../errors';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_RECORDS_IN_MEMORY = 5000;

/**
 * The contractor code that is permitted to create actions in any scope.
 * Matches `KnownContractorCode` value from auth-types.
 */
const ACC_CONTRACTOR_CODE = 'ACC';

/**
 * Valid target statuses for each source status.
 * Only transitions listed here are accepted by `requireTransitionAllowed()`.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<ActionStatus, readonly ActionStatus[]>> = {
  draft: ['open'],
  open: ['assigned', 'cancelled'],
  assigned: ['in-progress', 'open', 'cancelled'],
  'in-progress': ['pending-approval', 'assigned', 'cancelled'],
  'pending-approval': ['approved', 'rejected'],
  approved: ['completed'],
  rejected: ['in-progress'],
  completed: ['closed'],
  closed: [],
  cancelled: [],
};

/** Statuses from which cancellation is permitted. */
const CANCELLABLE_STATUSES: ReadonlySet<ActionStatus> = new Set<ActionStatus>([
  'draft',
  'open',
  'assigned',
  'in-progress',
]);

// ── Internal helper types ─────────────────────────────────────────────────────

/**
 * Internal mutable shape used as input to the `transition()` helper.
 * Only the fields that may be overridden on an existing record are listed.
 * Unspecified fields retain their current values from `existing`.
 *
 * `assignment === null` removes the existing assignment (unassign).
 * `assignment === undefined` keeps the existing assignment.
 * `assignment === <value>` replaces with the new assignment.
 */
type TransitionOverrides = {
  readonly status?: ActionStatus;
  readonly assignment?: ActionAssignment | null;
  readonly followers?: readonly ActionFollower[];
  readonly comments?: readonly ActionComment[];
  readonly attachments?: readonly ActionAttachment[];
  readonly approvals?: readonly ActionApproval[];
  readonly completedAt?: string;
  readonly closedAt?: string;
  readonly priority?: ActionPriority;
  readonly title?: string;
  readonly description?: string;
  readonly relatedEquipmentIds?: readonly EquipmentId[];
  readonly relatedActionIds?: readonly ActionId[];
  readonly targetModule?: PlatformModule;
  readonly scheduledFor?: string;
  readonly dueDate?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

// ── Private helpers ───────────────────────────────────────────────────────────

/** Generates a short unique id for sub-documents (comments, attachments, history). */
function generateSubId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${ts}-${rnd}`;
}

// ── ActionService ─────────────────────────────────────────────────────────────

/**
 * In-memory generic action service.
 *
 * All operations are safe for single-threaded Node.js use.
 * No background threads, network calls, or timers are used.
 *
 * The service id `platform.actions` is reserved in the Service Registry.
 * Registration into bootstrap is deferred to the SDK milestone.
 */
export class ActionService implements IActionService {
  /** Records keyed by ActionId, maintained in insertion order. */
  private readonly records = new Map<string, ActionRecord>();
  private readonly maxRecordsInMemory: number;

  constructor(options?: ActionServiceOptions) {
    this.maxRecordsInMemory =
      options?.maxRecordsInMemory ?? DEFAULT_MAX_RECORDS_IN_MEMORY;
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  create(request: ActionCreateRequest): ActionRecord {
    this.enforceScope(request.requestingContractorId, request.contractorId);

    const now = new Date().toISOString();
    const id = generateActionId();
    const initialStatus: ActionStatus =
      request.initialAssignment !== undefined ? 'assigned' : 'open';

    const historyEntry = this.makeHistoryEntry(
      id,
      request.requestedBy,
      request.contractorId,
      'created',
      undefined,
      initialStatus,
      now,
    );

    const record = Object.freeze<ActionRecord>({
      id,
      kind: request.kind,
      priority: request.priority,
      status: initialStatus,
      title: request.title,
      description: request.description,
      equipmentId: request.equipmentId,
      relatedEquipmentIds: Object.freeze([...(request.relatedEquipmentIds ?? [])]),
      relatedActionIds: Object.freeze([...(request.relatedActionIds ?? [])]),
      contractorId: request.contractorId,
      createdBy: request.requestedBy,
      followers: Object.freeze([...(request.initialFollowers ?? [])]),
      approvals: Object.freeze([] as readonly ActionApproval[]),
      comments: Object.freeze([] as readonly ActionComment[]),
      attachments: Object.freeze([] as readonly ActionAttachment[]),
      history: Object.freeze([historyEntry]),
      createdAt: now,
      updatedAt: now,
      ...(request.sourceModule !== undefined ? { sourceModule: request.sourceModule } : {}),
      ...(request.targetModule !== undefined ? { targetModule: request.targetModule } : {}),
      ...(request.initialAssignment !== undefined
        ? { assignment: request.initialAssignment }
        : {}),
      ...(request.scheduledFor !== undefined ? { scheduledFor: request.scheduledFor } : {}),
      ...(request.dueDate !== undefined ? { dueDate: request.dueDate } : {}),
      ...(request.correlationId !== undefined ? { correlationId: request.correlationId } : {}),
      ...(request.metadata !== undefined
        ? { metadata: Object.freeze({ ...request.metadata }) }
        : {}),
    });

    this.storeRecord(record);
    return record;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  getById(id: ActionId): ActionRecord | null {
    return this.records.get(id) ?? null;
  }

  getByEquipment(
    equipmentId: EquipmentId,
    contractorId?: ContractorId,
  ): readonly ActionRecord[] {
    const result: ActionRecord[] = [];
    for (const record of this.records.values()) {
      if (record.equipmentId !== equipmentId) continue;
      if (contractorId !== undefined && record.contractorId !== contractorId) continue;
      result.push(record);
    }
    return result;
  }

  getByContractor(contractorId: ContractorId): readonly ActionRecord[] {
    const result: ActionRecord[] = [];
    for (const record of this.records.values()) {
      if (record.contractorId === contractorId) result.push(record);
    }
    return result;
  }

  getByStatus(
    status: ActionStatus,
    contractorId?: ContractorId,
  ): readonly ActionRecord[] {
    const result: ActionRecord[] = [];
    for (const record of this.records.values()) {
      if (record.status !== status) continue;
      if (contractorId !== undefined && record.contractorId !== contractorId) continue;
      result.push(record);
    }
    return result;
  }

  getByAssignee(
    assigneeId: string,
    contractorId: ContractorId,
  ): readonly ActionRecord[] {
    const result: ActionRecord[] = [];
    for (const record of this.records.values()) {
      if (record.contractorId !== contractorId) continue;
      if (record.assignment?.assigneeId === assigneeId) result.push(record);
    }
    return result;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(id: ActionId, request: ActionUpdateRequest): ActionRecord {
    const existing = this.requireRecord(id);
    const now = new Date().toISOString();

    const historyEntry = this.makeHistoryEntry(
      id,
      request.requestedBy,
      existing.contractorId,
      'updated',
      undefined,
      undefined,
      now,
    );

    const overrides: TransitionOverrides = {
      ...(request.title !== undefined ? { title: request.title } : {}),
      ...(request.description !== undefined ? { description: request.description } : {}),
      ...(request.priority !== undefined ? { priority: request.priority } : {}),
      ...(request.dueDate !== undefined ? { dueDate: request.dueDate } : {}),
      ...(request.scheduledFor !== undefined ? { scheduledFor: request.scheduledFor } : {}),
      ...(request.targetModule !== undefined ? { targetModule: request.targetModule } : {}),
      ...(request.relatedEquipmentIds !== undefined
        ? { relatedEquipmentIds: request.relatedEquipmentIds }
        : {}),
      ...(request.relatedActionIds !== undefined
        ? { relatedActionIds: request.relatedActionIds }
        : {}),
      ...(request.metadata !== undefined ? { metadata: request.metadata } : {}),
    };

    const updated = this.transition(existing, overrides, historyEntry, now);

    this.records.set(id, updated);
    return updated;
  }

  // ── Assignment ──────────────────────────────────────────────────────────────

  assign(id: ActionId, assignment: ActionAssignment): ActionRecord {
    const existing = this.requireRecord(id);

    if (existing.status !== 'open' && existing.status !== 'assigned') {
      throw new ActionTransitionError(
        id,
        existing.status,
        'assigned',
        `Assignment is only permitted from 'open' or 'assigned' status; current status is '${existing.status}'`,
      );
    }

    const now = new Date().toISOString();
    const event = existing.assignment !== undefined ? 'reassigned' : 'assigned';
    const historyEntry = this.makeHistoryEntry(
      id,
      assignment.assignedBy,
      assignment.contractorId,
      event,
      existing.status,
      'assigned',
      now,
      `Assigned to ${assignment.kind} '${assignment.assigneeId}'`,
    );

    const updated = this.transition(
      existing,
      { status: 'assigned', assignment },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  unassign(id: ActionId, requestedBy: UserId): ActionRecord {
    const existing = this.requireRecord(id);

    if (existing.status !== 'assigned') {
      throw new ActionTransitionError(
        id,
        existing.status,
        'open',
        `Only 'assigned' actions can be unassigned; current status is '${existing.status}'`,
      );
    }

    const now = new Date().toISOString();
    const historyEntry = this.makeHistoryEntry(
      id,
      requestedBy,
      existing.contractorId,
      'unassigned',
      'assigned',
      'open',
      now,
    );

    // assignment: null → removes the assignment in transition()
    const updated = this.transition(
      existing,
      { status: 'open', assignment: null },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  addFollower(id: ActionId, follower: ActionFollower): ActionRecord {
    const existing = this.requireRecord(id);

    if (existing.followers.some((f) => f.userId === follower.userId)) {
      return existing;
    }

    const now = new Date().toISOString();
    const historyEntry = this.makeHistoryEntry(
      id,
      follower.userId,
      follower.contractorId,
      'follower-added',
      undefined,
      undefined,
      now,
    );

    const updated = this.transition(
      existing,
      { followers: [...existing.followers, follower] },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  removeFollower(id: ActionId, userId: UserId): ActionRecord {
    const existing = this.requireRecord(id);

    const filteredFollowers = existing.followers.filter((f) => f.userId !== userId);
    if (filteredFollowers.length === existing.followers.length) {
      return existing;
    }

    const now = new Date().toISOString();
    const historyEntry = this.makeHistoryEntry(
      id,
      userId,
      existing.contractorId,
      'follower-removed',
      undefined,
      undefined,
      now,
    );

    const updated = this.transition(
      existing,
      { followers: filteredFollowers },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  // ── Execution lifecycle ──────────────────────────────────────────────────────

  start(id: ActionId, requestedBy: UserId): ActionRecord {
    const existing = this.requireRecord(id);
    // 'assigned' → 'in-progress' and 'rejected' → 'in-progress' are both in ALLOWED_TRANSITIONS.
    this.requireTransitionAllowed(existing, 'in-progress');

    const now = new Date().toISOString();
    const historyEntry = this.makeHistoryEntry(
      id,
      requestedBy,
      existing.contractorId,
      'started',
      existing.status,
      'in-progress',
      now,
    );

    const updated = this.transition(
      existing,
      { status: 'in-progress' },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  submitForApproval(id: ActionId, requestedBy: UserId): ActionRecord {
    const existing = this.requireRecord(id);
    this.requireTransitionAllowed(existing, 'pending-approval');

    const now = new Date().toISOString();
    const historyEntry = this.makeHistoryEntry(
      id,
      requestedBy,
      existing.contractorId,
      'submitted-for-approval',
      existing.status,
      'pending-approval',
      now,
    );

    const updated = this.transition(
      existing,
      { status: 'pending-approval' },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  recordApproval(id: ActionId, approval: ActionApproval): ActionRecord {
    const existing = this.requireRecord(id);

    if (existing.status !== 'pending-approval') {
      throw new ActionTransitionError(
        id,
        existing.status,
        approval.decision === 'approved' ? 'approved' : 'rejected',
        `Only 'pending-approval' actions can have an approval recorded; current status is '${existing.status}'`,
      );
    }

    const now = new Date().toISOString();
    const newStatus: ActionStatus =
      approval.decision === 'approved' ? 'approved' : 'rejected';

    const historyEntry = this.makeHistoryEntry(
      id,
      approval.decidedBy,
      approval.contractorId,
      approval.decision,
      'pending-approval',
      newStatus,
      now,
      approval.reason,
    );

    const updated = this.transition(
      existing,
      {
        status: newStatus,
        approvals: [...existing.approvals, approval],
      },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  complete(id: ActionId, requestedBy: UserId): ActionRecord {
    const existing = this.requireRecord(id);
    this.requireTransitionAllowed(existing, 'completed');

    const now = new Date().toISOString();
    const historyEntry = this.makeHistoryEntry(
      id,
      requestedBy,
      existing.contractorId,
      'completed',
      existing.status,
      'completed',
      now,
    );

    const updated = this.transition(
      existing,
      { status: 'completed', completedAt: now },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  close(id: ActionId, requestedBy: UserId): ActionRecord {
    const existing = this.requireRecord(id);
    this.requireTransitionAllowed(existing, 'closed');

    const now = new Date().toISOString();
    const historyEntry = this.makeHistoryEntry(
      id,
      requestedBy,
      existing.contractorId,
      'closed',
      existing.status,
      'closed',
      now,
    );

    const updated = this.transition(
      existing,
      { status: 'closed', closedAt: now },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  cancel(id: ActionId, requestedBy: UserId, reason: string): ActionRecord {
    const existing = this.requireRecord(id);

    if (!CANCELLABLE_STATUSES.has(existing.status)) {
      throw new ActionTransitionError(
        id,
        existing.status,
        'cancelled',
        `Actions in '${existing.status}' status cannot be cancelled`,
      );
    }

    const now = new Date().toISOString();
    const historyEntry = this.makeHistoryEntry(
      id,
      requestedBy,
      existing.contractorId,
      'cancelled',
      existing.status,
      'cancelled',
      now,
      reason,
    );

    const updated = this.transition(
      existing,
      { status: 'cancelled' },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  // ── Comments ────────────────────────────────────────────────────────────────

  addComment(
    id: ActionId,
    input: {
      readonly authorId: UserId;
      readonly contractorId: ContractorId;
      readonly body: string;
    },
  ): ActionRecord {
    const existing = this.requireRecord(id);
    const now = new Date().toISOString();

    const comment = Object.freeze<ActionComment>({
      id: generateSubId('cmt'),
      actionId: id,
      authorId: input.authorId,
      contractorId: input.contractorId,
      body: input.body,
      createdAt: now,
    });

    const historyEntry = this.makeHistoryEntry(
      id,
      input.authorId,
      input.contractorId,
      'comment-added',
      undefined,
      undefined,
      now,
    );

    const updated = this.transition(
      existing,
      { comments: [...existing.comments, comment] },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  // ── Attachments ─────────────────────────────────────────────────────────────

  addAttachment(
    id: ActionId,
    input: {
      readonly uploadedBy: UserId;
      readonly contractorId: ContractorId;
      readonly fileName: string;
      readonly fileType: string;
      readonly url: string;
    },
  ): ActionRecord {
    const existing = this.requireRecord(id);
    const now = new Date().toISOString();

    const attachment = Object.freeze<ActionAttachment>({
      id: generateSubId('att'),
      actionId: id,
      uploadedBy: input.uploadedBy,
      contractorId: input.contractorId,
      fileName: input.fileName,
      fileType: input.fileType,
      url: input.url,
      uploadedAt: now,
    });

    const historyEntry = this.makeHistoryEntry(
      id,
      input.uploadedBy,
      input.contractorId,
      'attachment-added',
      undefined,
      undefined,
      now,
      input.fileName,
    );

    const updated = this.transition(
      existing,
      { attachments: [...existing.attachments, attachment] },
      historyEntry,
      now,
    );

    this.records.set(id, updated);
    return updated;
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  getSummary(contractorId?: ContractorId): ActionSummary {
    const byStatus: Partial<Record<ActionStatus, number>> = {};
    const byPriority: Partial<Record<ActionPriority, number>> = {};
    const byKind: Record<string, number> = {};
    let total = 0;

    for (const record of this.records.values()) {
      if (contractorId !== undefined && record.contractorId !== contractorId) continue;
      total += 1;
      byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
      byPriority[record.priority] = (byPriority[record.priority] ?? 0) + 1;
      byKind[record.kind] = (byKind[record.kind] ?? 0) + 1;
    }

    return Object.freeze<ActionSummary>({
      totalRecords: total,
      byStatus: Object.freeze(byStatus),
      byPriority: Object.freeze(byPriority),
      byKind: Object.freeze(byKind),
      capturedAt: new Date().toISOString(),
    });
  }

  listIds(contractorId?: ContractorId): readonly ActionId[] {
    if (contractorId === undefined) {
      return Array.from(this.records.keys()) as ActionId[];
    }
    return Array.from(this.records.values())
      .filter((r) => r.contractorId === contractorId)
      .map((r) => r.id);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  /**
   * Enforces contractor scope on create operations.
   * Non-ACC contractors may only create actions in their own scope.
   */
  private enforceScope(
    requestingContractorId: ContractorId,
    targetContractorId: ContractorId,
  ): void {
    if (
      (requestingContractorId as string) !== ACC_CONTRACTOR_CODE &&
      requestingContractorId !== targetContractorId
    ) {
      throw new ActionScopeError(requestingContractorId, targetContractorId);
    }
  }

  /**
   * Returns the record for the given id or throws {@link ActionNotFoundError}.
   */
  private requireRecord(id: ActionId): ActionRecord {
    const record = this.records.get(id);
    if (record === undefined) {
      throw new ActionNotFoundError(id);
    }
    return record;
  }

  /**
   * Throws {@link ActionTransitionError} if `to` is not a valid next status
   * from `record.status` according to {@link ALLOWED_TRANSITIONS}.
   */
  private requireTransitionAllowed(record: ActionRecord, to: ActionStatus): void {
    const allowed = ALLOWED_TRANSITIONS[record.status];
    if (!allowed.includes(to)) {
      throw new ActionTransitionError(record.id, record.status, to);
    }
  }

  /**
   * Constructs a frozen {@link ActionHistoryEntry}.
   */
  private makeHistoryEntry(
    actionId: ActionId,
    changedBy: UserId,
    contractorId: ContractorId,
    event: string,
    previousStatus: ActionStatus | undefined,
    newStatus: ActionStatus | undefined,
    timestamp: string,
    details?: string,
  ): ActionHistoryEntry {
    return Object.freeze<ActionHistoryEntry>({
      id: generateSubId('hst'),
      actionId,
      changedBy,
      contractorId,
      event,
      ...(previousStatus !== undefined ? { previousStatus } : {}),
      ...(newStatus !== undefined ? { newStatus } : {}),
      timestamp,
      ...(details !== undefined ? { details } : {}),
    });
  }

  /**
   * Produces a new frozen {@link ActionRecord} by copying `existing` and applying
   * the `overrides`.  The `newHistoryEntry` is appended to the history array.
   *
   * Assignment resolution:
   * - `overrides.assignment === null`       → removes the assignment.
   * - `overrides.assignment === undefined`  → keeps existing assignment.
   * - `overrides.assignment === <value>`    → replaces with new assignment.
   *
   * Metadata resolution:
   * - `overrides.metadata !== undefined`    → merged with existing (existing + new).
   * - `overrides.metadata === undefined`    → existing metadata is kept unchanged.
   *
   * Array fields (followers, comments, attachments, approvals, relatedEquipmentIds,
   * relatedActionIds): when provided in overrides they replace the existing array
   * and are wrapped in Object.freeze.  When absent, the existing frozen array is used.
   */
  private transition(
    existing: ActionRecord,
    overrides: TransitionOverrides,
    newHistoryEntry: ActionHistoryEntry,
    updatedAt: string,
  ): ActionRecord {
    const resolvedAssignment: ActionAssignment | undefined =
      overrides.assignment === null
        ? undefined
        : overrides.assignment ?? existing.assignment;

    const resolvedMetadata =
      overrides.metadata !== undefined
        ? Object.freeze({ ...existing.metadata, ...overrides.metadata })
        : existing.metadata;

    const resolvedFollowers =
      overrides.followers !== undefined
        ? Object.freeze([...overrides.followers])
        : existing.followers;

    const resolvedComments =
      overrides.comments !== undefined
        ? Object.freeze([...overrides.comments])
        : existing.comments;

    const resolvedAttachments =
      overrides.attachments !== undefined
        ? Object.freeze([...overrides.attachments])
        : existing.attachments;

    const resolvedApprovals =
      overrides.approvals !== undefined
        ? Object.freeze([...overrides.approvals])
        : existing.approvals;

    const resolvedRelatedEquipment =
      overrides.relatedEquipmentIds !== undefined
        ? Object.freeze([...overrides.relatedEquipmentIds])
        : existing.relatedEquipmentIds;

    const resolvedRelatedActions =
      overrides.relatedActionIds !== undefined
        ? Object.freeze([...overrides.relatedActionIds])
        : existing.relatedActionIds;

    return Object.freeze<ActionRecord>({
      id: existing.id,
      kind: existing.kind,
      priority: overrides.priority ?? existing.priority,
      status: overrides.status ?? existing.status,
      title: overrides.title ?? existing.title,
      description: overrides.description ?? existing.description,
      equipmentId: existing.equipmentId,
      relatedEquipmentIds: resolvedRelatedEquipment,
      relatedActionIds: resolvedRelatedActions,
      contractorId: existing.contractorId,
      createdBy: existing.createdBy,
      followers: resolvedFollowers,
      approvals: resolvedApprovals,
      comments: resolvedComments,
      attachments: resolvedAttachments,
      history: Object.freeze([...existing.history, newHistoryEntry]),
      createdAt: existing.createdAt,
      updatedAt,
      // Optional fields: keep existing unless overridden; never set to undefined explicitly.
      ...(existing.sourceModule !== undefined ? { sourceModule: existing.sourceModule } : {}),
      ...(overrides.targetModule !== undefined
        ? { targetModule: overrides.targetModule }
        : existing.targetModule !== undefined
        ? { targetModule: existing.targetModule }
        : {}),
      ...(resolvedAssignment !== undefined ? { assignment: resolvedAssignment } : {}),
      ...(overrides.scheduledFor !== undefined
        ? { scheduledFor: overrides.scheduledFor }
        : existing.scheduledFor !== undefined
        ? { scheduledFor: existing.scheduledFor }
        : {}),
      ...(overrides.dueDate !== undefined
        ? { dueDate: overrides.dueDate }
        : existing.dueDate !== undefined
        ? { dueDate: existing.dueDate }
        : {}),
      ...(existing.correlationId !== undefined ? { correlationId: existing.correlationId } : {}),
      ...(overrides.completedAt !== undefined
        ? { completedAt: overrides.completedAt }
        : existing.completedAt !== undefined
        ? { completedAt: existing.completedAt }
        : {}),
      ...(overrides.closedAt !== undefined
        ? { closedAt: overrides.closedAt }
        : existing.closedAt !== undefined
        ? { closedAt: existing.closedAt }
        : {}),
      ...(resolvedMetadata !== undefined ? { metadata: resolvedMetadata } : {}),
    });
  }

  /**
   * Stores a record with FIFO eviction when the capacity limit is reached.
   * The oldest key (first in Map insertion order) is evicted.
   */
  private storeRecord(record: ActionRecord): void {
    if (this.records.size >= this.maxRecordsInMemory) {
      const firstKey = this.records.keys().next().value;
      if (firstKey !== undefined) {
        this.records.delete(firstKey);
      }
    }
    this.records.set(record.id, record);
  }
}
