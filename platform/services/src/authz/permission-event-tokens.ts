// platform/services/src/authz/permission-event-tokens.ts
// Typed EventToken constants for the Authorization / Permission domain.
//
// Each token names a channel on the platform IEventBus.
// Import the token at the publish site (PermissionService mutations) and any
// subscription site (e.g. cache invalidation handlers) to ensure both sides
// reference the same channel.
//
// Current bus: NullEventBus (Phase 1 — no-op).
// Real delivery: Phase 9 event bus milestone.

import { EventToken } from '@acc-reliability/kernel';

import type { PermissionChangedPayload } from '../contracts/platform-events';

/**
 * Published when a user's effective permissions are modified — e.g. a role is
 * assigned or removed.
 *
 * Consumers that cache effective permission sets must subscribe to this token
 * and call their invalidation logic when it fires.
 *
 * Channel: `platform.permissions.changed`
 */
export const PERMISSION_CHANGED_TOKEN =
  new EventToken<PermissionChangedPayload>('platform.permissions.changed');
