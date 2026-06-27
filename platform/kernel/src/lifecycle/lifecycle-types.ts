// platform/kernel/src/lifecycle/lifecycle-types.ts

/**
 * Lifecycle states for any managed platform component.
 *
 * Typical progression:
 *   Created → Registered → Initializing → Running → Stopping → Stopped
 *
 * Lateral states: Degraded (reduced capability), Maintenance (intentional pause), Failed (error).
 */
export type LifecycleState =
  | 'Created'       // component object exists; not yet registered with the manager
  | 'Registered'    // registered; awaiting initializeAll() or restart()
  | 'Initializing'  // initialize() is currently in progress
  | 'Running'       // fully operational
  | 'Degraded'      // operational but with reduced capability
  | 'Maintenance'   // intentionally paused; not accepting new work
  | 'Stopping'      // shutdown() is currently in progress
  | 'Stopped'       // orderly shutdown complete
  | 'Failed';       // unrecoverable error; terminal until restarted

/**
 * Manager-level state describing the overall lifecycle orchestration phase.
 */
export type ManagerState =
  | 'Idle'      // no initializeAll() called yet
  | 'Starting'  // initializeAll() in progress
  | 'Running'   // all components reached Running
  | 'Stopping'  // shutdownAll() in progress
  | 'Stopped'   // all components have been stopped
  | 'Failed';   // critical failure during start or stop

// ── Component contract ────────────────────────────────────────────────────────

/**
 * Contract that every lifecycle-managed component must implement.
 *
 * Components declare their dependencies by componentId so the LifecycleManager
 * can resolve initialization order automatically (topological sort).
 */
export interface ILifecycleComponent {
  /** Unique identifier for this component. Must match the ID used during register(). */
  readonly componentId: string;
  /** Human-readable label used in logs and diagnostics. */
  readonly displayName: string;
  /**
   * IDs of components that must be in Running state before this one initializes.
   * Provide an empty array when this component has no dependencies.
   */
  readonly dependencies: ReadonlyArray<string>;
  /**
   * Performs all startup work for this component.
   * Must resolve on success or reject with an Error on failure.
   */
  initialize(): Promise<void>;
  /**
   * Performs all cleanup and teardown work for this component.
   * Must resolve on success or reject with an Error on failure.
   * Shutdown errors are logged but do not halt the overall shutdown sequence.
   */
  shutdown(): Promise<void>;
}

// ── Public status types ───────────────────────────────────────────────────────

/**
 * Immutable public snapshot of a single component's lifecycle state.
 * No component instance references are exposed.
 */
export interface ComponentStatus {
  readonly componentId: string;
  readonly displayName: string;
  readonly state: LifecycleState;
  /** ISO 8601 — when the component was registered with the manager. */
  readonly registeredAt: string;
  /** ISO 8601 — when the most recent state transition occurred. */
  readonly stateChangedAt: string;
  /** ISO 8601 — set when state transitions to Initializing. */
  readonly initializedAt?: string;
  /** ISO 8601 — set when state transitions to Running. */
  readonly startedAt?: string;
  /** ISO 8601 — set when state transitions to Stopped. */
  readonly stoppedAt?: string;
  /** ISO 8601 — set when state transitions to Failed. */
  readonly failedAt?: string;
  /** Wall-clock milliseconds from initialize() call to the Running state. */
  readonly startupDurationMs?: number;
  /** Wall-clock milliseconds from shutdown() call to the Stopped or Failed state. */
  readonly shutdownDurationMs?: number;
  /** Error message captured when the component transitioned to Failed. */
  readonly errorMessage?: string;
  readonly dependencies: ReadonlyArray<string>;
}

/**
 * Immutable public snapshot of the LifecycleManager's overall state.
 * Safe to share across the platform without exposing implementation details.
 */
export interface LifecycleStatus {
  readonly managerState: ManagerState;
  readonly components: ReadonlyArray<ComponentStatus>;
  readonly totalComponents: number;
  readonly runningComponents: number;
  readonly degradedComponents: number;
  readonly failedComponents: number;
  readonly stoppedComponents: number;
  /** ISO 8601 — when initializeAll() was called. */
  readonly startedAt?: string;
  /** ISO 8601 — when the manager reached Running or Failed. */
  readonly completedAt?: string;
  /** Wall-clock milliseconds for the full initializeAll() run. */
  readonly startupDurationMs?: number;
  /** Wall-clock milliseconds for the full shutdownAll() run. */
  readonly shutdownDurationMs?: number;
}

// ── Manager interface ─────────────────────────────────────────────────────────

/**
 * Public interface for the Platform Lifecycle Manager.
 *
 * The LifecycleManager orchestrates startup, initialization, health transitions,
 * shutdown, and restart of all managed platform components.
 */
export interface ILifecycleManager {
  /**
   * Registers a component with the manager.
   * May only be called before initializeAll().
   * Throws LifecycleError if the component ID is already registered or if
   * initialization has already started.
   */
  register(component: ILifecycleComponent): void;

  /**
   * Initializes all registered components in dependency order.
   * May only be called once per LifecycleManager instance.
   * Throws LifecycleError on circular dependencies or component failure.
   */
  initializeAll(): Promise<void>;

  /**
   * Gracefully shuts down all active components in reverse initialization order.
   * Shutdown errors are logged but do not halt the overall sequence.
   */
  shutdownAll(): Promise<void>;

  /**
   * Stops and re-initializes a single component.
   * Valid from: Running, Degraded, Maintenance, Stopped, Failed.
   * All of the component's dependencies must be in Running state.
   */
  restart(componentId: string): Promise<void>;

  /**
   * Transitions a Running component to Degraded.
   * Use when health monitoring detects reduced capability.
   */
  setDegraded(componentId: string, reason: string): void;

  /**
   * Transitions a Running or Degraded component to Maintenance.
   */
  enterMaintenance(componentId: string): void;

  /**
   * Transitions a Maintenance component back to Running.
   */
  exitMaintenance(componentId: string): void;

  /** Returns an immutable snapshot of the manager and all component states. */
  getStatus(): Readonly<LifecycleStatus>;

  /** Returns an immutable snapshot of a single component's state. */
  getComponentStatus(componentId: string): Readonly<ComponentStatus>;

  /** Returns true if a component with the given ID is registered. */
  hasComponent(componentId: string): boolean;
}
