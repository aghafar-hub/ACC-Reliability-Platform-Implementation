// platform/sdk/src/impl/user-client-impl.ts
// SDK bridge from IUserClient → IUserService.
//
// Derives the acting user (ActorRef) from the SdkContext so modules never
// supply their own actor — the platform always knows who is calling.

import type {
  UserId,
  ContractorId,
  UserRole,
  IUserService,
  UserRecord,
  DelegationId,
  CreateUserRequest,
  UpdateUserRequest,
  AssignRoleRequest,
  AssignTemporaryRoleRequest,
  CreateDelegationRequest,
  UserListQuery,
  UserListResult,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { IUserClient } from '../clients/user-client';

/**
 * Concrete SDK user client.
 *
 * Every mutating call passes `{ userId, contractorId }` derived from
 * `SdkContext.currentUser` as the `ActorRef`.  The underlying `UserService`
 * records this actor in the audit trail and domain events.
 */
export class UserClientImpl implements IUserClient {
  constructor(
    private readonly service: IUserService,
    private readonly context: SdkContext,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  create(request: CreateUserRequest): UserRecord {
    return this.service.create(request, this.actor());
  }

  findById(userId: UserId): UserRecord | null {
    return this.service.findById(userId);
  }

  findByEmail(email: string, contractorId: ContractorId): UserRecord | null {
    return this.service.findByEmail(email, contractorId);
  }

  list(query?: UserListQuery): UserListResult {
    return this.service.list(query);
  }

  update(userId: UserId, request: UpdateUserRequest): UserRecord {
    return this.service.update(userId, request, this.actor());
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  archive(userId: UserId, reason: string): UserRecord {
    return this.service.archive(userId, reason, this.actor());
  }

  restore(userId: UserId): UserRecord {
    return this.service.restore(userId, this.actor());
  }

  suspend(userId: UserId, reason: string): UserRecord {
    return this.service.suspend(userId, reason, this.actor());
  }

  activate(userId: UserId): UserRecord {
    return this.service.activate(userId, this.actor());
  }

  // ── Role management ───────────────────────────────────────────────────────

  assignRole(userId: UserId, request: AssignRoleRequest): UserRecord {
    return this.service.assignRole(userId, request, this.actor());
  }

  removeRole(userId: UserId, role: UserRole): UserRecord {
    return this.service.removeRole(userId, role, this.actor());
  }

  assignTemporaryRole(userId: UserId, request: AssignTemporaryRoleRequest): UserRecord {
    return this.service.assignTemporaryRole(userId, request, this.actor());
  }

  createDelegation(userId: UserId, request: CreateDelegationRequest): UserRecord {
    return this.service.createDelegation(userId, request, this.actor());
  }

  endDelegation(userId: UserId, delegationId: DelegationId): UserRecord {
    return this.service.endDelegation(userId, delegationId, this.actor());
  }

  expireTemporaryRoles(userId: UserId): UserRecord | null {
    return this.service.expireTemporaryRoles(userId);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private actor() {
    return {
      userId:       this.context.currentUser.userId,
      contractorId: this.context.currentUser.contractorId,
    };
  }
}
