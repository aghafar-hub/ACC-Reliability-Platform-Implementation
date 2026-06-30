// platform/services/src/user/user-service.ts
// UserService — the authoritative User Management domain service.
//
// Responsibilities:
//   - Full user lifecycle: create, update, archive, restore, suspend, activate.
//   - Role management: permanent, temporary (time-limited), and delegated roles.
//   - Audit trail: every mutation records an AuditEntry via IAuditService.
//   - Domain events: every mutation publishes an event via IEventBus.
//     (NullEventBus is a no-op in Phase 1; real delivery arrives in Phase 9.)
//
// Non-responsibilities:
//   - Authentication — delegated to the identity provider (Entra ID, Keycloak, etc.)
//   - Permission enforcement — delegated to IPermissionService (future milestone)
//   - Durable persistence — InMemoryUserRepository is the current backing store
//
// Service id: platform.identity

import type { IEventBus } from '@acc-reliability/kernel';

import type { UserId, ContractorId, UserRole } from '../auth/auth-types';
import type { IAuditService, AuditActor } from '../audit/audit-types';
import { createCorrelationId } from '../contracts/correlation';
import {
  UserNotFoundError,
  UserDuplicateError,
  UserLifecycleError,
} from '../errors';

import {
  generateUserRecordId,
  generateDelegationId,
} from './user-types';
import type {
  UserRecord,
  UserStatus,
  RoleAssignment,
  DelegationId,
  ActorRef,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  AssignTemporaryRoleRequest,
  CreateDelegationRequest,
  UserListQuery,
  UserListResult,
  IUserRepository,
  IUserService,
} from './user-types';

import {
  USER_CREATED_TOKEN,
  USER_UPDATED_TOKEN,
  USER_ARCHIVED_TOKEN,
  USER_RESTORED_TOKEN,
  USER_SUSPENDED_TOKEN,
  USER_ACTIVATED_TOKEN,
  ROLE_ASSIGNED_TOKEN,
  ROLE_REMOVED_TOKEN,
  TEMPORARY_ROLE_STARTED_TOKEN,
  TEMPORARY_ROLE_EXPIRED_TOKEN,
  DELEGATION_CREATED_TOKEN,
  DELEGATION_ENDED_TOKEN,
} from './user-event-tokens';

// ── UserService ───────────────────────────────────────────────────────────────

/**
 * Concrete implementation of the platform User Management Service.
 *
 * Constructor dependencies:
 * ```ts
 * const users = new UserService(repository, auditService, eventBus);
 * ```
 *
 * All mutating methods:
 *  1. Validate pre-conditions and throw typed errors on failure.
 *  2. Produce an updated `UserRecord` (immutable — never mutate in place).
 *  3. Persist via the repository.
 *  4. Write an audit entry (never throws — errors are absorbed by AuditService).
 *  5. Publish a domain event (no-op while `NullEventBus` is active).
 */
export class UserService implements IUserService {
  constructor(
    private readonly repository: IUserRepository,
    private readonly auditService: IAuditService,
    private readonly eventBus: IEventBus,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  create(request: CreateUserRequest, actor: ActorRef): UserRecord {
    const existing = this.repository.findByEmail(request.email, request.contractorId);
    if (existing !== null) {
      throw new UserDuplicateError(request.email, request.contractorId);
    }

    const now = new Date().toISOString();
    const userId = request.userId ?? generateUserRecordId();

    const initialRoles: RoleAssignment[] = (request.roles ?? []).map((role) => ({
      role,
      assignedAt: now,
      assignedBy: actor.userId,
    }));

    const user: UserRecord = Object.freeze({
      userId,
      contractorId:  request.contractorId,
      email:         request.email,
      displayName:   request.displayName,
      status:        'active' as UserStatus,
      roles:         Object.freeze(initialRoles),
      createdAt:     now,
      createdBy:     actor.userId,
      updatedAt:     now,
      updatedBy:     actor.userId,
    });

    const saved = this.repository.save(user);

    this.recordAudit(actor, 'create', 'success', saved.userId, {
      description: `User account created for '${saved.email}'`,
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(USER_CREATED_TOKEN, {
      userId:      saved.userId,
      contractorId: saved.contractorId,
      email:       saved.email,
      displayName: saved.displayName,
      roles:       saved.roles.map((ra) => ra.role),
      createdBy:   actor.userId,
      createdAt:   now,
    });

    return saved;
  }

  findById(userId: UserId): UserRecord | null {
    return this.repository.findById(userId);
  }

  findByEmail(email: string, contractorId: ContractorId): UserRecord | null {
    return this.repository.findByEmail(email, contractorId);
  }

  list(query?: UserListQuery): UserListResult {
    return this.repository.list(query);
  }

  update(userId: UserId, request: UpdateUserRequest, actor: ActorRef): UserRecord {
    const existing = this.getOrThrow(userId);
    const now = new Date().toISOString();
    const changedFields: string[] = [];

    let updated: UserRecord = existing;

    if (request.email !== undefined && request.email !== existing.email) {
      const conflict = this.repository.findByEmail(request.email, existing.contractorId);
      if (conflict !== null && conflict.userId !== userId) {
        throw new UserDuplicateError(request.email, existing.contractorId);
      }
      changedFields.push('email');
      updated = { ...updated, email: request.email };
    }

    if (request.displayName !== undefined && request.displayName !== existing.displayName) {
      changedFields.push('displayName');
      updated = { ...updated, displayName: request.displayName };
    }

    if (changedFields.length === 0) {
      return existing;
    }

    updated = Object.freeze({ ...updated, updatedAt: now, updatedBy: actor.userId });
    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.userId, {
      description:   `User '${saved.email}' profile updated (${changedFields.join(', ')})`,
      beforeValue:   this.sanitize(existing),
      afterValue:    this.sanitize(saved),
    });

    this.eventBus.publish(USER_UPDATED_TOKEN, {
      userId:        saved.userId,
      contractorId:  saved.contractorId,
      changedFields,
      updatedBy:     actor.userId,
      updatedAt:     now,
    });

    return saved;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  archive(userId: UserId, reason: string, actor: ActorRef): UserRecord {
    const existing = this.getOrThrow(userId);
    if (existing.status === 'archived') {
      throw new UserLifecycleError(userId, existing.status, 'archive');
    }

    const now = new Date().toISOString();
    const updated: UserRecord = Object.freeze({
      ...existing,
      status:         'archived' as UserStatus,
      archivedAt:     now,
      archivedBy:     actor.userId,
      archivedReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.userId, {
      description: `User '${saved.email}' archived. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(USER_ARCHIVED_TOKEN, {
      userId:      saved.userId,
      contractorId: saved.contractorId,
      archivedBy:  actor.userId,
      archivedAt:  now,
      reason,
    });

    return saved;
  }

  restore(userId: UserId, actor: ActorRef): UserRecord {
    const existing = this.getOrThrow(userId);
    if (existing.status !== 'archived') {
      throw new UserLifecycleError(userId, existing.status, 'restore');
    }

    const now = new Date().toISOString();
    const updated: UserRecord = Object.freeze({
      ...existing,
      status:     'active' as UserStatus,
      restoredAt: now,
      restoredBy: actor.userId,
      updatedAt:  now,
      updatedBy:  actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.userId, {
      description: `User '${saved.email}' restored to active`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(USER_RESTORED_TOKEN, {
      userId:      saved.userId,
      contractorId: saved.contractorId,
      restoredBy:  actor.userId,
      restoredAt:  now,
    });

    return saved;
  }

  suspend(userId: UserId, reason: string, actor: ActorRef): UserRecord {
    const existing = this.getOrThrow(userId);
    if (existing.status === 'archived') {
      throw new UserLifecycleError(userId, existing.status, 'suspend');
    }
    if (existing.status === 'suspended') {
      throw new UserLifecycleError(userId, existing.status, 'suspend');
    }

    const now = new Date().toISOString();
    const updated: UserRecord = Object.freeze({
      ...existing,
      status:          'suspended' as UserStatus,
      suspendedAt:     now,
      suspendedBy:     actor.userId,
      suspendedReason: reason,
      updatedAt:       now,
      updatedBy:       actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.userId, {
      description: `User '${saved.email}' suspended. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(USER_SUSPENDED_TOKEN, {
      userId:      saved.userId,
      contractorId: saved.contractorId,
      suspendedBy: actor.userId,
      suspendedAt: now,
      reason,
    });

    return saved;
  }

  activate(userId: UserId, actor: ActorRef): UserRecord {
    const existing = this.getOrThrow(userId);
    if (existing.status !== 'suspended') {
      throw new UserLifecycleError(userId, existing.status, 'activate');
    }

    const now = new Date().toISOString();
    const updated: UserRecord = Object.freeze({
      ...existing,
      status:      'active' as UserStatus,
      activatedAt: now,
      activatedBy: actor.userId,
      updatedAt:   now,
      updatedBy:   actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.userId, {
      description: `User '${saved.email}' activated (suspension lifted)`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(USER_ACTIVATED_TOKEN, {
      userId:      saved.userId,
      contractorId: saved.contractorId,
      activatedBy: actor.userId,
      activatedAt: now,
    });

    return saved;
  }

  // ── Role management ───────────────────────────────────────────────────────

  assignRole(userId: UserId, request: AssignRoleRequest, actor: ActorRef): UserRecord {
    const existing = this.getOrThrow(userId);
    if (existing.status === 'archived') {
      throw new UserLifecycleError(userId, existing.status, 'assignRole');
    }

    const hasPermanentRole = existing.roles.some(
      (ra) => ra.role === request.role && ra.expiresAt === undefined && ra.delegatedBy === undefined,
    );
    if (hasPermanentRole) {
      return existing;
    }

    const now = new Date().toISOString();
    const newAssignment: RoleAssignment = Object.freeze({
      role:       request.role,
      assignedAt: now,
      assignedBy: actor.userId,
      ...(request.reason !== undefined ? { reason: request.reason } : {}),
    });

    const updated: UserRecord = Object.freeze({
      ...existing,
      roles:     Object.freeze([...existing.roles, newAssignment]),
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'authorize', 'success', saved.userId, {
      description: `Role '${request.role}' assigned to user '${saved.email}'`,
      afterValue:  { role: request.role, reason: request.reason },
    });

    this.eventBus.publish(ROLE_ASSIGNED_TOKEN, {
      userId:       saved.userId,
      contractorId: saved.contractorId,
      role:         request.role,
      assignedBy:   actor.userId,
      assignedAt:   now,
      ...(request.reason !== undefined ? { reason: request.reason } : {}),
    });

    return saved;
  }

  removeRole(userId: UserId, role: UserRole, actor: ActorRef): UserRecord {
    const existing = this.getOrThrow(userId);
    const hadRole = existing.roles.some((ra) => ra.role === role);

    if (!hadRole) {
      return existing;
    }

    const now = new Date().toISOString();
    const updated: UserRecord = Object.freeze({
      ...existing,
      roles:     Object.freeze(existing.roles.filter((ra) => ra.role !== role)),
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'authorize', 'success', saved.userId, {
      description: `Role '${role}' removed from user '${saved.email}'`,
      beforeValue: { role },
    });

    this.eventBus.publish(ROLE_REMOVED_TOKEN, {
      userId:       saved.userId,
      contractorId: saved.contractorId,
      role,
      removedBy:    actor.userId,
      removedAt:    now,
    });

    return saved;
  }

  assignTemporaryRole(
    userId: UserId,
    request: AssignTemporaryRoleRequest,
    actor: ActorRef,
  ): UserRecord {
    const existing = this.getOrThrow(userId);
    if (existing.status === 'archived') {
      throw new UserLifecycleError(userId, existing.status, 'assignTemporaryRole');
    }

    const now = new Date().toISOString();
    const newAssignment: RoleAssignment = Object.freeze({
      role:       request.role,
      assignedAt: now,
      assignedBy: actor.userId,
      expiresAt:  request.expiresAt,
      ...(request.reason !== undefined ? { reason: request.reason } : {}),
    });

    const updated: UserRecord = Object.freeze({
      ...existing,
      roles:     Object.freeze([...existing.roles, newAssignment]),
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'authorize', 'success', saved.userId, {
      description: `Temporary role '${request.role}' assigned to '${saved.email}' until ${request.expiresAt}`,
      afterValue:  { role: request.role, expiresAt: request.expiresAt },
    });

    this.eventBus.publish(TEMPORARY_ROLE_STARTED_TOKEN, {
      userId:       saved.userId,
      contractorId: saved.contractorId,
      role:         request.role,
      assignedBy:   actor.userId,
      assignedAt:   now,
      expiresAt:    request.expiresAt,
      ...(request.reason !== undefined ? { reason: request.reason } : {}),
    });

    return saved;
  }

  createDelegation(
    userId: UserId,
    request: CreateDelegationRequest,
    actor: ActorRef,
  ): UserRecord {
    const existing = this.getOrThrow(userId);
    if (existing.status === 'archived') {
      throw new UserLifecycleError(userId, existing.status, 'createDelegation');
    }

    const now = new Date().toISOString();
    const delegationId = generateDelegationId();

    const newAssignment: RoleAssignment = Object.freeze({
      role:         request.role,
      assignedAt:   now,
      assignedBy:   actor.userId,
      delegatedBy:  request.delegatedBy,
      delegationId,
      ...(request.expiresAt !== undefined ? { expiresAt: request.expiresAt } : {}),
      ...(request.reason    !== undefined ? { reason:    request.reason    } : {}),
    });

    const updated: UserRecord = Object.freeze({
      ...existing,
      roles:     Object.freeze([...existing.roles, newAssignment]),
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'authorize', 'success', saved.userId, {
      description: `Role '${request.role}' delegated to '${saved.email}' by '${request.delegatedBy}'`,
      afterValue:  { role: request.role, delegationId, delegatedBy: request.delegatedBy },
      severity:    'medium',
    });

    this.eventBus.publish(DELEGATION_CREATED_TOKEN, {
      userId:       saved.userId,
      contractorId: saved.contractorId,
      role:         request.role,
      delegatedBy:  request.delegatedBy,
      delegationId,
      createdAt:    now,
      ...(request.expiresAt !== undefined ? { expiresAt: request.expiresAt } : {}),
      ...(request.reason    !== undefined ? { reason:    request.reason    } : {}),
    });

    return saved;
  }

  endDelegation(userId: UserId, delegationId: DelegationId, actor: ActorRef): UserRecord {
    const existing = this.getOrThrow(userId);

    const target = existing.roles.find((ra) => ra.delegationId === delegationId);
    if (target === undefined) {
      throw new UserNotFoundError(`Delegation '${delegationId}' not found on user '${userId}'`);
    }

    const now = new Date().toISOString();
    const updated: UserRecord = Object.freeze({
      ...existing,
      roles:     Object.freeze(existing.roles.filter((ra) => ra.delegationId !== delegationId)),
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'authorize', 'success', saved.userId, {
      description: `Delegation '${delegationId}' (role '${target.role}') ended for '${saved.email}'`,
      beforeValue: { delegationId, role: target.role },
    });

    this.eventBus.publish(DELEGATION_ENDED_TOKEN, {
      userId:       saved.userId,
      contractorId: saved.contractorId,
      role:         target.role,
      delegatedBy:  target.delegatedBy ?? actor.userId,
      delegationId,
      endedBy:      actor.userId,
      endedAt:      now,
    });

    return saved;
  }

  expireTemporaryRoles(userId: UserId): UserRecord | null {
    try {
      const existing = this.repository.findById(userId);
      if (existing === null) return null;

      const now = new Date().toISOString();
      const expired = existing.roles.filter(
        (ra) => ra.expiresAt !== undefined && ra.expiresAt <= now,
      );

      if (expired.length === 0) {
        return existing;
      }

      const updated: UserRecord = Object.freeze({
        ...existing,
        roles:     Object.freeze(
          existing.roles.filter((ra) => ra.expiresAt === undefined || ra.expiresAt > now),
        ),
        updatedAt: now,
        updatedBy: existing.userId,
      });

      const saved = this.repository.update(updated);

      for (const ra of expired) {
        this.recordAudit(
          { userId: existing.userId, contractorId: existing.contractorId },
          'authorize',
          'success',
          saved.userId,
          {
            description: `Temporary role '${ra.role}' expired for '${saved.email}'`,
            beforeValue: { role: ra.role, expiresAt: ra.expiresAt },
          },
        );

        this.eventBus.publish(TEMPORARY_ROLE_EXPIRED_TOKEN, {
          userId:       saved.userId,
          contractorId: saved.contractorId,
          role:         ra.role,
          expiredAt:    now,
        });
      }

      return saved;
    } catch {
      return null;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private getOrThrow(userId: UserId): UserRecord {
    const user = this.repository.findById(userId);
    if (user === null) {
      throw new UserNotFoundError(userId);
    }
    return user;
  }

  private recordAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    entityId: UserId,
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
        entityType: 'User',
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

  private newCorrelationId() {
    return createCorrelationId(`usr-op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  }

  /** Returns a sanitized view of a UserRecord safe to store in audit metadata. */
  private sanitize(user: UserRecord): Record<string, unknown> {
    return {
      userId:      user.userId,
      contractorId: user.contractorId,
      email:       user.email,
      displayName: user.displayName,
      status:      user.status,
      roles:       user.roles.map((ra) => ra.role),
    };
  }
}

