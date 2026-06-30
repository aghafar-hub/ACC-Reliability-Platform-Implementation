// platform/services/src/module/module-event-tokens.ts
// Typed EventToken constants for the Module Registry domain.
//
// Each token names an event channel on the platform IEventBus.
// Import the token at both the publish site (ModuleService) and any
// subscription site to ensure both sides reference the same channel.
//
// Current bus: NullEventBus (Phase 1 — no-op).
// Real delivery: Phase 9 event bus milestone.

import { EventToken } from '@acc-reliability/kernel';

import type {
  ModuleRegisteredPayload,
  ModuleUpdatedPayload,
  ModuleEnabledPayload,
  ModuleDisabledPayload,
  ModuleMaintenanceStartedPayload,
  ModuleMaintenanceEndedPayload,
  ModuleRetiredPayload,
  ModuleRestoredPayload,
} from '../contracts/platform-events';

/** Published when a new module record is registered. */
export const MODULE_REGISTERED_TOKEN =
  new EventToken<ModuleRegisteredPayload>('platform.modules.module.registered');

/** Published when a module record profile is updated. */
export const MODULE_UPDATED_TOKEN =
  new EventToken<ModuleUpdatedPayload>('platform.modules.module.updated');

/** Published when a disabled module is enabled. */
export const MODULE_ENABLED_TOKEN =
  new EventToken<ModuleEnabledPayload>('platform.modules.module.enabled');

/** Published when an enabled module is disabled. */
export const MODULE_DISABLED_TOKEN =
  new EventToken<ModuleDisabledPayload>('platform.modules.module.disabled');

/** Published when a module enters maintenance mode. */
export const MODULE_MAINTENANCE_STARTED_TOKEN =
  new EventToken<ModuleMaintenanceStartedPayload>('platform.modules.module.maintenance.started');

/** Published when a module exits maintenance mode. */
export const MODULE_MAINTENANCE_ENDED_TOKEN =
  new EventToken<ModuleMaintenanceEndedPayload>('platform.modules.module.maintenance.ended');

/** Published when a module is retired. */
export const MODULE_RETIRED_TOKEN =
  new EventToken<ModuleRetiredPayload>('platform.modules.module.retired');

/** Published when a retired module is restored to enabled status. */
export const MODULE_RESTORED_TOKEN =
  new EventToken<ModuleRestoredPayload>('platform.modules.module.restored');
