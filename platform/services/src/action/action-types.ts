// platform/services/src/action/action-types.ts
// All types and the IActionService contract for the platform-wide generic action service.
//
// Responsibilities:
//   - Define ActionId, ActionKind, ActionPriority, ActionStatus.
//   - Define ActionAssignment (user or team), ActionFollower, ActionComment,
//     ActionAttachment, ActionApproval, ActionHistoryEntry, ActionRecord.
//   - Define ActionCreateRequest and ActionUpdateRequest.
//   - Define IActionService contract.
//   - Enforce contractor isolation on all create and query operations.
//   - Support correlation metadata: CorrelationId, SourceModule, TargetModule.
//   - Support EquipmentId (primary) and optional related IDs.
//   - Future-ready fields for scheduled/recurring actions (no implementation).
//
// Non-responsibilities (enforced by design):
//   - No UI, no dashboard, no reports.
//   - No real storage — records held in-memory only.
//   - No notifications — callers invoke INotificationService separately.
//   - No workflow engine — state transitions are simple and explicit.
//   - No business module logic (oil-analysis, vibration, lubrication, etc.).
//   - No scheduled/recurring execution logic — types only, not implemented.
//
// Naming note:
//   ActionKind (not ActionType) is used for the work category to avoid a
//   naming collision with the existing `ActionType` exported from authz-types,
//   which represents permission action kinds (read/create/update/delete/etc.).

import type { UserId, ContractorId } from '../auth/auth-types';
import type { CorrelationId } from '../contracts/correlation';
import type {
  EquipmentId,
  PlatformModule,
} from '../contracts/communication-types';

// ── ActionId ──────────────────────────────────────────────────────────────────

declare const ActionIdBrand: unique symbol;

/**
 * Branded string that uniquely identifies an action record within the platform.
 * Always produced via {@link createActionId} or {@link generateActionId}.
 * Never cast from a raw string.
 */
export type ActionId = string & { readonly [ActionIdBrand]: 'ActionId' };

/**
 * Creates an {@link ActionId} from a plain string.
 * Rejects blank or whitespace-only values.
 */
export function createActionId(value: string): ActionId {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('ActionId must not be blank');
  }
  return trimmed as ActionId;
}

/**
 * Generates a new unique {@link ActionId}.
 * Uses timestamp + random suffix — suitable for in-memory and future storage use.
 * No external dependencies required.
 */
export function generateActionId(): ActionId {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 9);
  return createActionId(`act-${ts}-${rnd}`);
}

// ── ActionKind ────────────────────────────────────────────────────────────────

/**
 * The category of work that an action represents.
 *
 * - `work-order`  — Planned maintenance or repair task.
 * - `corrective`  — Reactive fix following a failure or inspection finding.
 * - `preventive`  — Scheduled preventive maintenance.
 * - `inspection`  — Equipment or process inspection task.
 * - `calibration` — Instrument or sensor calibration activity.
 * - `emergency`   — Unplanned urgent intervention.
 * - `other`       — Any work category not covered by the built-in kinds.
 *
 * The union is open so platform modules may introduce project-specific kinds
 * without a core type change.
 */
export type ActionKind =
  | 'work-order'
  | 'corrective'
  | 'preventive'
  | 'inspection'
  | 'calibration'
  | 'emergency'
  | 'other'
  | (string & Record<never, never>);

/** Ordered constant tuple of the built-in action kinds. */
export const ACTION_KINDS: readonly [
  'work-order',
  'corrective',
  'preventive',
  'inspection',
  'calibration',
  'emergency',
  'other',
] = [
  'work-order',
  'corrective',
  'preventive',
  'inspection',
  'calibration',
  'emergency',
  'other',
] as const;

// ── ActionPriority ────────────────────────────────────────────────────────────

/**
 * Priority level of an action, ordered from lowest to highest urgency.
 *
 * - `low`       — Can be deferred without operational risk.
 * - `normal`    — Standard priority; complete within the next scheduled window.
 * - `high`      — Elevated; complete before the next scheduled window.
 * - `critical`  — Urgent; complete as soon as possible.
 * - `immediate` — Safety or availability risk; requires immediate action.
 */
export type ActionPriority = 'low' | 'normal' | 'high' | 'critical' | 'immediate';

/** Ordered constant tuple of all action priority levels (lowest → highest). */
export const ACTION_PRIORITIES: readonly ActionPriority[] = [
  'low',
  'normal',
  'high',
  'critical',
  'immediate',
] as const;

// ── ActionStatus ──────────────────────────────────────────────────────────────

/**
 * Lifecycle status of an action.
 *
 * Allowed transitions:
 * ```
 * draft            → open
 * open             → assigned  |  cancelled
 * assigned         → in-progress  |  open (unassign)  |  cancelled
 * in-progress      → pending-approval  |  assigned (reassign)  |  cancelled
 * pending-approval → approved  |  rejected
 * approved         → completed
 * rejected         → in-progress  (owner retries after addressing rejection)
 * completed        → closed
 * closed           (terminal)
 * cancelled        (terminal)
 * ```
 */
export type ActionStatus =
  | 'draft'
  | 'open'
  | 'assigned'
  | 'in-progress'
  | 'pending-approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'closed'
  | 'cancelled';

// ── AssigneeKind ──────────────────────────────────────────────────────────────

/**
 * Discriminant for an action assignment target.
 *
 * - `user` — Assigned to a specific platform user identified by a `UserId` value.
 * - `team` — Assigned to a named team; team management is a future platform milestone.
 */
export type AssigneeKind = 'user' | 'team';

// ── ActionAssignment ──────────────────────────────────────────────────────────

/**
 * Assignment of an action to a platform user or team.
 *
 * An action holds at most one active assignment at a time.  Reassignment
 * replaces the previous assignment and appends a history entry.
 *
 * `contractorId` must match the contractor scope of the action.
 * Cross-contractor assignment is not permitted.
 */
export interface ActionAssignment {
  /** Whether the assignee is a platform user or a team. */
  readonly kind: AssigneeKind;
  /**
   * Identifier of the assignee.
   * - `kind === 'user'` → a `UserId` value.
   * - `kind === 'team'` → a free-form team name or future team id.
   */
  readonly assigneeId: string;
  /** Contractor that the assignee belongs to.  Must equal the action's `contractorId`. */
  readonly contractorId: ContractorId;
  /** User who performed the assignment. */
  readonly assignedBy: UserId;
  /** ISO 8601 UTC timestamp when the assignment was made. */
  readonly assignedAt: string;
}

// ── ActionFollower ────────────────────────────────────────────────────────────

/**
 * A user following an action for visibility purposes.
 *
 * Followers may receive notifications on status changes in future implementations.
 * They have no execution or approval authority.
 *
 * `contractorId` enforces contractor isolation on follower operations.
 */
export interface ActionFollower {
  /** User who is following the action. */
  readonly userId: UserId;
  /** Contractor the follower belongs to.  Must be within the action's scope. */
  readonly contractorId: ContractorId;
  /** ISO 8601 UTC timestamp when the follower was added. */
  readonly addedAt: string;
}

// ── ActionComment ─────────────────────────────────────────────────────────────

/**
 * A comment posted on an action by a platform user.
 *
 * Comments are immutable once created.  They form a chronological audit
 * trail of communication attached to the action record.
 */
export interface ActionComment {
  /** Stable unique identifier for this comment. */
  readonly id: string;
  /** Parent action id. */
  readonly actionId: ActionId;
  /** User who authored the comment. */
  readonly authorId: UserId;
  /** Contractor the author belongs to.  Enforces data isolation. */
  readonly contractorId: ContractorId;
  /** Comment text.  Markdown is supported for future UI rendering. */
  readonly body: string;
  /** ISO 8601 UTC timestamp when this comment was created. */
  readonly createdAt: string;
}

// ── ActionAttachment ──────────────────────────────────────────────────────────

/**
 * File attachment metadata linked to an action.
 *
 * The in-memory implementation stores metadata only — no binary data is held.
 * The `url` is expected to reference a file in the platform's future
 * file-storage service.
 */
export interface ActionAttachment {
  /** Stable unique identifier for this attachment. */
  readonly id: string;
  /** Parent action id. */
  readonly actionId: ActionId;
  /** User who uploaded the file. */
  readonly uploadedBy: UserId;
  /** Contractor the uploader belongs to.  Enforces data isolation. */
  readonly contractorId: ContractorId;
  /** Original file name (e.g. `"inspection-report.pdf"`). */
  readonly fileName: string;
  /** MIME type or informal extension (e.g. `"application/pdf"`, `"image/jpeg"`). */
  readonly fileType: string;
  /** URL or path reference to the stored file. */
  readonly url: string;
  /** ISO 8601 UTC timestamp when this attachment was uploaded. */
  readonly uploadedAt: string;
}

// ── ActionApproval ────────────────────────────────────────────────────────────

/**
 * An approval decision recorded against an action.
 *
 * Only the creator's organization (the contractor that owns the action) may
 * approve or reject completion.  The in-memory implementation trusts the
 * caller's `contractorId`; future implementations must cross-reference
 * the action's `contractorId` before accepting an approval.
 *
 * `decision: 'rejected'` does NOT close the action.  It transitions the action
 * to `'rejected'` status so the assigned owner can address the concerns and
 * resubmit.  The approval record is retained in history regardless of outcome.
 */
export interface ActionApproval {
  /** Stable unique identifier for this approval record. */
  readonly id: string;
  /** Parent action id. */
  readonly actionId: ActionId;
  /** User who made the approval decision. */
  readonly decidedBy: UserId;
  /** Contractor of the approver.  Must match the action's `contractorId`. */
  readonly contractorId: ContractorId;
  /** The approval decision. */
  readonly decision: 'approved' | 'rejected';
  /**
   * Reason for the decision.
   * Strongly recommended when `decision === 'rejected'` so the assignee can
   * address the specific concerns and resubmit.
   */
  readonly reason?: string;
  /** ISO 8601 UTC timestamp when the decision was recorded. */
  readonly decidedAt: string;
}

// ── ActionHistoryEntry ────────────────────────────────────────────────────────

/**
 * A single entry in the immutable audit trail of an action.
 *
 * Every state transition, assignment change, comment, attachment, follower
 * addition, and approval produces a history entry.  Entries are append-only;
 * no entry is ever mutated or deleted — including those produced by rejections.
 */
export interface ActionHistoryEntry {
  /** Stable unique identifier for this history entry. */
  readonly id: string;
  /** Parent action id. */
  readonly actionId: ActionId;
  /** User who triggered this history entry. */
  readonly changedBy: UserId;
  /** Contractor of the user who triggered the change. */
  readonly contractorId: ContractorId;
  /**
   * Machine-readable event name.
   * Examples: `'created'` · `'updated'` · `'assigned'` · `'reassigned'` ·
   * `'unassigned'` · `'started'` · `'submitted-for-approval'` · `'approved'` ·
   * `'rejected'` · `'completed'` · `'closed'` · `'cancelled'` ·
   * `'comment-added'` · `'attachment-added'` · `'follower-added'` · `'follower-removed'`
   */
  readonly event: string;
  /** Status before this transition.  Present only for status-change events. */
  readonly previousStatus?: ActionStatus;
  /** Status after this transition.  Present only for status-change events. */
  readonly newStatus?: ActionStatus;
  /** ISO 8601 UTC timestamp when this entry was recorded. */
  readonly timestamp: string;
  /** Optional free-text detail (rejection reason, cancellation reason, etc.). */
  readonly details?: string;
}

// ── ActionRecord ──────────────────────────────────────────────────────────────

/**
 * The complete platform record for an action through its lifecycle.
 *
 * All fields are readonly.  Every mutating operation (assign, start, approve, etc.)
 * produces a new frozen `ActionRecord`; the previous version is replaced in the
 * in-memory store.
 *
 * ## Contractor isolation
 * `contractorId` is the owning contractor scope.  All nested objects
 * (assignment, comments, approvals, followers) must carry a compatible
 * `contractorId`.
 *
 * ## Equipment linkage
 * `equipmentId` is the primary equipment reference using the platform's
 * canonical {@link EquipmentId} branded type.  `relatedEquipmentIds` and
 * `relatedActionIds` carry associative context without enforcing foreign-key
 * constraints at this layer.
 *
 * ## Scheduled/recurring fields (future-ready)
 * `scheduledFor` and `dueDate` are included for forward compatibility.
 * The recurring-action scheduler is not yet implemented.
 */
export interface ActionRecord {
  /** Stable unique identifier for this action. */
  readonly id: ActionId;

  /** Category of work this action represents. */
  readonly kind: ActionKind;

  /** Current urgency level. */
  readonly priority: ActionPriority;

  /** Current lifecycle status. */
  readonly status: ActionStatus;

  /** Short human-readable title (should be under 200 characters). */
  readonly title: string;

  /** Full description of the work required. */
  readonly description: string;

  // ── Equipment linkage ───────────────────────────────────────────────────────

  /** Primary equipment this action targets.  Canonical platform equipment key. */
  readonly equipmentId: EquipmentId;

  /** Additional equipment related to this action. */
  readonly relatedEquipmentIds: readonly EquipmentId[];

  /** Other action ids related to this action (e.g. parent, predecessor). */
  readonly relatedActionIds: readonly ActionId[];

  // ── Module linkage ──────────────────────────────────────────────────────────

  /**
   * Platform module that originated this action
   * (e.g. `'oil-analysis'`, `'vibration-analysis'`).
   */
  readonly sourceModule?: PlatformModule;

  /**
   * Platform module expected to execute this action
   * (e.g. `'oil-lubrication'`).
   */
  readonly targetModule?: PlatformModule;

  // ── Contractor scope ────────────────────────────────────────────────────────

  /**
   * Contractor that owns this action.
   * Only users from this contractor (or `'ACC'`) may manage this action.
   */
  readonly contractorId: ContractorId;

  // ── People ──────────────────────────────────────────────────────────────────

  /** User who created this action. */
  readonly createdBy: UserId;

  /**
   * Current assignment.  `undefined` when the action is unassigned.
   * Only the assigned owner may submit for approval.
   */
  readonly assignment?: ActionAssignment;

  /** Users following this action for visibility. */
  readonly followers: readonly ActionFollower[];

  // ── Scheduling (future-ready, not enforced) ─────────────────────────────────

  /**
   * ISO 8601 UTC timestamp when this action is scheduled to start.
   * Present only for planned/preventive work.
   * Stored for future scheduler integration; not enforced by the current implementation.
   */
  readonly scheduledFor?: string;

  /**
   * ISO 8601 UTC timestamp by which this action must be completed.
   * Used for future SLA tracking.
   */
  readonly dueDate?: string;

  // ── Correlation ─────────────────────────────────────────────────────────────

  /**
   * Correlation id linking this action to the triggering platform event or request.
   * Used for distributed tracing.
   */
  readonly correlationId?: CorrelationId;

  // ── Sub-documents ───────────────────────────────────────────────────────────

  /** Approval decisions recorded against this action. */
  readonly approvals: readonly ActionApproval[];

  /** Comments posted on this action in chronological order. */
  readonly comments: readonly ActionComment[];

  /** File attachment metadata linked to this action. */
  readonly attachments: readonly ActionAttachment[];

  /** Immutable audit trail of all changes to this action. */
  readonly history: readonly ActionHistoryEntry[];

  // ── Timestamps ──────────────────────────────────────────────────────────────

  /** ISO 8601 UTC timestamp when this action was created. */
  readonly createdAt: string;

  /** ISO 8601 UTC timestamp of the last change to any field. */
  readonly updatedAt: string;

  /**
   * ISO 8601 UTC timestamp when the action transitioned to `'completed'` status.
   */
  readonly completedAt?: string;

  /**
   * ISO 8601 UTC timestamp when the action transitioned to `'closed'` status.
   */
  readonly closedAt?: string;

  // ── Metadata ────────────────────────────────────────────────────────────────

  /** Caller-supplied structured metadata for module-specific extensions. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ── ActionCreateRequest ───────────────────────────────────────────────────────

/**
 * Input required to create a new action.
 *
 * ## Contractor scope enforcement
 * - A non-ACC contractor user may only create actions within their own scope:
 *   `requestingContractorId` must equal `contractorId`.
 * - An `'ACC'` user (`requestingContractorId === 'ACC'`) may create actions
 *   in any contractor's scope.
 *
 * The service throws {@link ActionScopeError} when the scope constraint is violated.
 */
export interface ActionCreateRequest {
  /** Category of work this action represents. */
  readonly kind: ActionKind;

  /** Initial priority level. */
  readonly priority: ActionPriority;

  /** Short human-readable title. */
  readonly title: string;

  /** Full description of the required work. */
  readonly description: string;

  // ── Equipment ───────────────────────────────────────────────────────────────

  /** Primary equipment this action targets. */
  readonly equipmentId: EquipmentId;

  /** Additional equipment related to this action. */
  readonly relatedEquipmentIds?: readonly EquipmentId[];

  /** Related action ids (e.g. parent, predecessor). */
  readonly relatedActionIds?: readonly ActionId[];

  // ── Contractor scope ────────────────────────────────────────────────────────

  /**
   * Target contractor scope — whose action registry this action belongs to.
   * Non-ACC requestors must supply their own `contractorId` here.
   */
  readonly contractorId: ContractorId;

  /** User submitting this create request. */
  readonly requestedBy: UserId;

  /**
   * Contractor of the user submitting the request.
   * Used to enforce scope: non-ACC contractors may only create within their own scope.
   */
  readonly requestingContractorId: ContractorId;

  // ── Module linkage ──────────────────────────────────────────────────────────

  /** Platform module originating this action. */
  readonly sourceModule?: PlatformModule;

  /** Platform module expected to execute this action. */
  readonly targetModule?: PlatformModule;

  // ── Correlation ─────────────────────────────────────────────────────────────

  /** Correlation id from the triggering event or request. */
  readonly correlationId?: CorrelationId;

  // ── Optional setup ──────────────────────────────────────────────────────────

  /** ISO 8601 UTC due date. */
  readonly dueDate?: string;

  /**
   * ISO 8601 UTC scheduled start time.
   * Future-ready field; not enforced in the current implementation.
   */
  readonly scheduledFor?: string;

  /**
   * Optional initial assignment.
   * If provided the action is created with `'assigned'` status rather than `'open'`.
   */
  readonly initialAssignment?: ActionAssignment;

  /** Optional initial followers. */
  readonly initialFollowers?: readonly ActionFollower[];

  /** Caller-supplied metadata for module-specific extensions. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ── ActionUpdateRequest ───────────────────────────────────────────────────────

/**
 * Fields that may be changed on an existing action after creation.
 *
 * Only non-structural fields are updatable through this request.
 * Status transitions use dedicated lifecycle methods (`start`, `submitForApproval`, etc.).
 * Assignment changes use `assign` / `unassign`.
 *
 * All fields are optional.  Fields not provided retain their existing values.
 * `relatedEquipmentIds` and `relatedActionIds` replace the existing lists when provided.
 * `metadata` is merged with existing metadata when provided.
 */
export interface ActionUpdateRequest {
  /** User performing the update. */
  readonly requestedBy: UserId;

  /** Updated title. */
  readonly title?: string;

  /** Updated description. */
  readonly description?: string;

  /** Updated priority. */
  readonly priority?: ActionPriority;

  /** Updated ISO 8601 due date. */
  readonly dueDate?: string;

  /**
   * Updated ISO 8601 scheduled start time.
   * Future-ready field; not enforced in the current implementation.
   */
  readonly scheduledFor?: string;

  /** Updated target module. */
  readonly targetModule?: PlatformModule;

  /** Updated related equipment ids.  Replaces the existing list when provided. */
  readonly relatedEquipmentIds?: readonly EquipmentId[];

  /** Updated related action ids.  Replaces the existing list when provided. */
  readonly relatedActionIds?: readonly ActionId[];

  /** Metadata to merge with existing metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ── ActionSummary ─────────────────────────────────────────────────────────────

/**
 * Aggregate summary of action records held in memory.
 *
 * Contains counts only — no individual record data is included.
 * Call {@link IActionService.getById} or the query methods for per-record state.
 * Optionally scoped to a specific contractor.
 */
export interface ActionSummary {
  /** Total number of action records in scope. */
  readonly totalRecords: number;
  /** Record count keyed by {@link ActionStatus}. */
  readonly byStatus: Readonly<Partial<Record<ActionStatus, number>>>;
  /** Record count keyed by {@link ActionPriority}. */
  readonly byPriority: Readonly<Partial<Record<ActionPriority, number>>>;
  /** Record count keyed by {@link ActionKind} (string key for open-union support). */
  readonly byKind: Readonly<Record<string, number>>;
  /** ISO 8601 UTC timestamp when this summary was computed. */
  readonly capturedAt: string;
}

// ── ActionServiceOptions ──────────────────────────────────────────────────────

/** Optional configuration for the {@link IActionService} implementation. */
export interface ActionServiceOptions {
  /**
   * Maximum number of {@link ActionRecord}s retained in memory.
   * When the limit is reached the oldest records (by creation order) are evicted (FIFO).
   *
   * @default 5000
   */
  readonly maxRecordsInMemory?: number;
}

// ── IActionService ────────────────────────────────────────────────────────────

/**
 * Contract for the platform-wide generic action service.
 *
 * ## Responsibilities
 * - Create and track {@link ActionRecord}s through their full lifecycle.
 * - Enforce contractor scope on create operations (non-ACC contractors may only
 *   create actions within their own scope).
 * - Manage assignment (user or team), followers, comments, attachments.
 * - Record approval decisions and maintain an append-only audit history.
 * - Provide in-memory query and summary capabilities.
 *
 * ## Non-responsibilities (by design)
 * - No real notifications — callers invoke {@link INotificationService} separately.
 * - No storage persistence — in-memory only in this milestone.
 * - No workflow engine or business-rule evaluation.
 * - No UI or reporting.
 * - No scheduled/recurring action execution.
 * - No module-specific logic (oil analysis, lubrication, vibration, etc.).
 *
 * ## Contractor isolation
 * - `create()` enforces that non-ACC contractors may only create actions in their
 *   own scope.  `ActionScopeError` is thrown on violation.
 * - All query methods that accept `contractorId` return only records in that scope.
 * - `getByAssignee()` always requires `contractorId` to prevent cross-contractor leakage.
 *
 * ## Approval model
 * - The assigned owner submits the action (`submitForApproval()`).
 * - The creator's organization (contractor) records an approval decision (`recordApproval()`).
 * - Rejected actions remain in the system with `'rejected'` status; the owner may
 *   restart work by calling `start()` and then resubmit.
 * - All approval records are appended to `ActionRecord.approvals` regardless of outcome.
 *
 * ## Future integration points
 * - Storage: persist via `IRepository<ActionRecord>` when the storage layer is available.
 * - Notifications: emit to `INotificationService` on status transitions.
 * - Event Bus (Phase 9): publish `ActionCreatedEvent` / `ActionCompletedEvent`.
 * - Metrics: record `action.create.count`, `action.lifecycle.duration`.
 */
export interface IActionService {

  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Creates a new action and returns the resulting frozen record.
   *
   * The action is created in `'open'` status unless `request.initialAssignment`
   * is provided, in which case it starts in `'assigned'` status.
   *
   * @throws {@link ActionScopeError} if a non-ACC contractor attempts to create
   *   an action outside their own contractor scope.
   * @throws {@link ActionError} for any other creation failure.
   */
  create(request: ActionCreateRequest): ActionRecord;

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Returns the action record for the given id.
   * Returns `null` if no record with that id exists — does not throw.
   */
  getById(id: ActionId): ActionRecord | null;

  /**
   * Returns all action records for the given equipment.
   * If `contractorId` is provided results are scoped to that contractor.
   * Result order is insertion order.
   */
  getByEquipment(
    equipmentId: EquipmentId,
    contractorId?: ContractorId,
  ): readonly ActionRecord[];

  /**
   * Returns all action records owned by the given contractor.
   * Result order is insertion order.
   */
  getByContractor(contractorId: ContractorId): readonly ActionRecord[];

  /**
   * Returns all action records in the given status.
   * If `contractorId` is provided results are further scoped to that contractor.
   * Result order is insertion order.
   */
  getByStatus(
    status: ActionStatus,
    contractorId?: ContractorId,
  ): readonly ActionRecord[];

  /**
   * Returns all action records currently assigned to the given assignee.
   * Results are always scoped to `contractorId` to enforce contractor isolation.
   * Result order is insertion order.
   */
  getByAssignee(
    assigneeId: string,
    contractorId: ContractorId,
  ): readonly ActionRecord[];

  // ── Update ──────────────────────────────────────────────────────────────────

  /**
   * Updates mutable descriptive fields on an action.
   * Status transitions and assignment changes use their dedicated methods.
   *
   * `relatedEquipmentIds` and `relatedActionIds` replace existing lists when provided.
   * `metadata` is merged with existing metadata when provided.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   */
  update(id: ActionId, request: ActionUpdateRequest): ActionRecord;

  // ── Assignment ──────────────────────────────────────────────────────────────

  /**
   * Assigns the action to a user or team.
   *
   * - From `'open'` → transitions to `'assigned'`.
   * - From `'assigned'` → stays `'assigned'` (reassignment); replaces previous assignment.
   *
   * A history entry is appended in both cases.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   * @throws {@link ActionTransitionError} if the current status does not allow assignment.
   */
  assign(id: ActionId, assignment: ActionAssignment): ActionRecord;

  /**
   * Removes the current assignment from an action.
   *
   * Transitions `'assigned'` → `'open'`.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   * @throws {@link ActionTransitionError} if the action is not in `'assigned'` status.
   */
  unassign(id: ActionId, requestedBy: UserId): ActionRecord;

  /**
   * Adds a follower to the action.
   * No-op if the user is already following the action (returns the unchanged record).
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   */
  addFollower(id: ActionId, follower: ActionFollower): ActionRecord;

  /**
   * Removes a follower from the action.
   * No-op if the user is not in the follower list (returns the unchanged record).
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   */
  removeFollower(id: ActionId, userId: UserId): ActionRecord;

  // ── Execution lifecycle ──────────────────────────────────────────────────────

  /**
   * Marks the action as in-progress.
   *
   * Transitions `'assigned'` → `'in-progress'`.
   * Also permitted from `'rejected'` (owner retries after a rejection).
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   * @throws {@link ActionTransitionError} if the action is not in a startable status.
   */
  start(id: ActionId, requestedBy: UserId): ActionRecord;

  /**
   * Submits the action for approval by the creator's organization.
   *
   * Transitions `'in-progress'` → `'pending-approval'`.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   * @throws {@link ActionTransitionError} if the action is not in `'in-progress'` status.
   */
  submitForApproval(id: ActionId, requestedBy: UserId): ActionRecord;

  /**
   * Records an approval or rejection decision.
   *
   * - `decision === 'approved'`: transitions `'pending-approval'` → `'approved'`.
   * - `decision === 'rejected'`: transitions `'pending-approval'` → `'rejected'`.
   *
   * The {@link ActionApproval} record is appended to `ActionRecord.approvals`
   * regardless of the decision outcome.
   *
   * A rejected action remains in the system; the assigned owner may restart
   * work by calling `start()` and then `submitForApproval()` again.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   * @throws {@link ActionTransitionError} if the action is not in `'pending-approval'` status.
   */
  recordApproval(id: ActionId, approval: ActionApproval): ActionRecord;

  /**
   * Marks an approved action as fully completed.
   *
   * Transitions `'approved'` → `'completed'`.
   * Sets `ActionRecord.completedAt`.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   * @throws {@link ActionTransitionError} if the action is not in `'approved'` status.
   */
  complete(id: ActionId, requestedBy: UserId): ActionRecord;

  /**
   * Closes a completed action.
   *
   * Transitions `'completed'` → `'closed'`.  A closed action is terminal.
   * Sets `ActionRecord.closedAt`.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   * @throws {@link ActionTransitionError} if the action is not in `'completed'` status.
   */
  close(id: ActionId, requestedBy: UserId): ActionRecord;

  /**
   * Cancels an action that has not yet reached a terminal or approval status.
   *
   * Valid from: `'draft'`, `'open'`, `'assigned'`, `'in-progress'`.
   * Terminal statuses (`'completed'`, `'closed'`, `'cancelled'`) and approval
   * statuses (`'pending-approval'`, `'approved'`, `'rejected'`) cannot be cancelled.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   * @throws {@link ActionTransitionError} if the action cannot be cancelled from its current status.
   */
  cancel(id: ActionId, requestedBy: UserId, reason: string): ActionRecord;

  // ── Comments ────────────────────────────────────────────────────────────────

  /**
   * Appends a comment to the action record.
   * Returns the updated action record with the new comment appended.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   */
  addComment(
    id: ActionId,
    input: {
      readonly authorId: UserId;
      readonly contractorId: ContractorId;
      readonly body: string;
    },
  ): ActionRecord;

  // ── Attachments ─────────────────────────────────────────────────────────────

  /**
   * Links an attachment to the action record.
   * Returns the updated action record with the new attachment appended.
   *
   * @throws {@link ActionNotFoundError} if no action with `id` exists.
   */
  addAttachment(
    id: ActionId,
    input: {
      readonly uploadedBy: UserId;
      readonly contractorId: ContractorId;
      readonly fileName: string;
      readonly fileType: string;
      readonly url: string;
    },
  ): ActionRecord;

  // ── Summary ─────────────────────────────────────────────────────────────────

  /**
   * Returns a frozen summary of all in-memory action records.
   * If `contractorId` is provided the summary is scoped to that contractor.
   * A pure read — does not trigger any state changes.
   */
  getSummary(contractorId?: ContractorId): ActionSummary;

  /**
   * Returns all action ids in insertion order.
   * If `contractorId` is provided the result is scoped to that contractor.
   */
  listIds(contractorId?: ContractorId): readonly ActionId[];
}
