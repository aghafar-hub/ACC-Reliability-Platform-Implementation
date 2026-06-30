// platform/services/src/user/user-event-tokens.ts
// Typed EventToken constants for the User Management domain.
//
// Each token names an event channel on the platform IEventBus.
// Import the token at both the publish site (UserService) and any
// subscription site to ensure both sides reference the same channel.
//
// Current bus: NullEventBus (Phase 1 — no-op).
// Real delivery: Phase 9 event bus milestone.

import { EventToken } from '@acc-reliability/kernel';

import type {
  UserCreatedPayload,
  UserUpdatedPayload,
  UserArchivedPayload,
  UserRestoredPayload,
  UserSuspendedPayload,
  UserActivatedPayload,
  RoleAssignedPayload,
  RoleRemovedPayload,
  TemporaryRoleStartedPayload,
  TemporaryRoleExpiredPayload,
  DelegationCreatedPayload,
  DelegationEndedPayload,
} from '../contracts/platform-events';

/** Published when a new user account is created. */
export const USER_CREATED_TOKEN =
  new EventToken<UserCreatedPayload>('platform.identity.user.created');

/** Published when a user account profile is updated. */
export const USER_UPDATED_TOKEN =
  new EventToken<UserUpdatedPayload>('platform.identity.user.updated');

/** Published when a user account is archived. */
export const USER_ARCHIVED_TOKEN =
  new EventToken<UserArchivedPayload>('platform.identity.user.archived');

/** Published when an archived user is restored to active status. */
export const USER_RESTORED_TOKEN =
  new EventToken<UserRestoredPayload>('platform.identity.user.restored');

/** Published when a user account is suspended. */
export const USER_SUSPENDED_TOKEN =
  new EventToken<UserSuspendedPayload>('platform.identity.user.suspended');

/** Published when a suspended user is activated. */
export const USER_ACTIVATED_TOKEN =
  new EventToken<UserActivatedPayload>('platform.identity.user.activated');

/** Published when a permanent role is assigned to a user. */
export const ROLE_ASSIGNED_TOKEN =
  new EventToken<RoleAssignedPayload>('platform.identity.role.assigned');

/** Published when a role is removed from a user. */
export const ROLE_REMOVED_TOKEN =
  new EventToken<RoleRemovedPayload>('platform.identity.role.removed');

/** Published when a temporary (time-limited) role is assigned. */
export const TEMPORARY_ROLE_STARTED_TOKEN =
  new EventToken<TemporaryRoleStartedPayload>('platform.identity.role.temporary-started');

/** Published when a temporary role's expiry has passed and it is removed. */
export const TEMPORARY_ROLE_EXPIRED_TOKEN =
  new EventToken<TemporaryRoleExpiredPayload>('platform.identity.role.temporary-expired');

/** Published when a role delegation is created. */
export const DELEGATION_CREATED_TOKEN =
  new EventToken<DelegationCreatedPayload>('platform.identity.delegation.created');

/** Published when a role delegation is ended. */
export const DELEGATION_ENDED_TOKEN =
  new EventToken<DelegationEndedPayload>('platform.identity.delegation.ended');
