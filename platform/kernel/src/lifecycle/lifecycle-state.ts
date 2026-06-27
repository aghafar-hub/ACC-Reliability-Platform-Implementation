// platform/kernel/src/lifecycle/lifecycle-state.ts

import type { LifecycleState } from './lifecycle-types';

/**
 * Allowed state transitions for lifecycle-managed components.
 *
 * This map is the single source of truth for valid lifecycle progressions.
 * The LifecycleManager uses it before every state change to reject invalid
 * transitions before they occur.
 *
 * Transition rules:
 *   Created      → Registered   (via register())
 *   Registered   → Initializing (via initializeAll() / restart())
 *   Initializing → Running      (initialize() resolved)
 *   Initializing → Failed       (initialize() rejected)
 *   Running      → Degraded     (health degradation detected)
 *   Running      → Maintenance  (enterMaintenance())
 *   Running      → Stopping     (shutdownAll() / restart())
 *   Running      → Failed       (unexpected runtime failure)
 *   Degraded     → Running      (recovery confirmed)
 *   Degraded     → Stopping     (shutdownAll())
 *   Degraded     → Failed       (unrecoverable degradation)
 *   Maintenance  → Running      (exitMaintenance())
 *   Maintenance  → Stopping     (shutdownAll())
 *   Stopping     → Stopped      (shutdown() resolved)
 *   Stopping     → Failed       (shutdown() rejected)
 *   Stopped      → Registered   (restart())
 *   Failed       → Registered   (restart())
 */
const ALLOWED_TRANSITIONS: ReadonlyMap<LifecycleState, ReadonlySet<LifecycleState>> = new Map([
  ['Created',      new Set<LifecycleState>(['Registered'])],
  ['Registered',   new Set<LifecycleState>(['Initializing'])],
  ['Initializing', new Set<LifecycleState>(['Running', 'Failed'])],
  ['Running',      new Set<LifecycleState>(['Degraded', 'Maintenance', 'Stopping', 'Failed'])],
  ['Degraded',     new Set<LifecycleState>(['Running', 'Stopping', 'Failed'])],
  ['Maintenance',  new Set<LifecycleState>(['Running', 'Stopping'])],
  ['Stopping',     new Set<LifecycleState>(['Stopped', 'Failed'])],
  ['Stopped',      new Set<LifecycleState>(['Registered'])],
  ['Failed',       new Set<LifecycleState>(['Registered'])],
]);

/**
 * Returns true when the transition from `from` to `to` is a permitted
 * lifecycle progression.
 */
export function isTransitionAllowed(from: LifecycleState, to: LifecycleState): boolean {
  return ALLOWED_TRANSITIONS.get(from)?.has(to) ?? false;
}

/**
 * Returns all states reachable from `state` in a single transition.
 * Useful for diagnostics and error messaging.
 */
export function allowedTransitionsFrom(state: LifecycleState): ReadonlyArray<LifecycleState> {
  return Array.from(ALLOWED_TRANSITIONS.get(state) ?? []);
}
