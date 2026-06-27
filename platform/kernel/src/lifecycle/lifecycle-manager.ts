// platform/kernel/src/lifecycle/lifecycle-manager.ts

import { LifecycleError } from '../errors';
import type { ILogger } from '../logger';
import type { IServiceRegistry } from '../service-registry';
import type {
  ILifecycleComponent,
  ILifecycleManager,
  ComponentStatus,
  LifecycleStatus,
  LifecycleState,
  ManagerState,
} from './lifecycle-types';
import { isTransitionAllowed, allowedTransitionsFrom } from './lifecycle-state';

// ── Internal mutable component record ────────────────────────────────────────

interface ComponentRecord {
  componentId: string;
  displayName: string;
  component: ILifecycleComponent;
  state: LifecycleState;
  registeredAt: string;
  stateChangedAt: string;
  initializedAt?: string;
  startedAt?: string;
  stoppedAt?: string;
  failedAt?: string;
  startupDurationMs?: number;
  shutdownDurationMs?: number;
  errorMessage?: string;
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface LifecycleManagerOptions {
  readonly logger: ILogger;
  /**
   * When provided, the manager syncs component state transitions to matching
   * entries in the ServiceRegistry (best-effort; sync errors are logged only).
   */
  readonly serviceRegistry?: IServiceRegistry;
}

// ── LifecycleManager ──────────────────────────────────────────────────────────

export class LifecycleManager implements ILifecycleManager {
  private readonly records = new Map<string, ComponentRecord>();
  private readonly logger: ILogger;
  private readonly serviceRegistry: IServiceRegistry | undefined;

  private managerState: ManagerState = 'Idle';
  private initializationOrder: ReadonlyArray<string> = [];

  private startedAt: string | undefined;
  private completedAt: string | undefined;
  private startupDurationMs: number | undefined;
  private shutdownDurationMs: number | undefined;

  constructor(options: LifecycleManagerOptions) {
    this.logger = options.logger;
    this.serviceRegistry = options.serviceRegistry;
  }

  // ── Registration ──────────────────────────────────────────────────────────

  register(component: ILifecycleComponent): void {
    if (this.managerState !== 'Idle') {
      throw new LifecycleError(
        `Cannot register component "${component.componentId}" after initializeAll() has been called.`,
        { componentId: component.componentId, managerState: this.managerState }
      );
    }

    if (this.records.has(component.componentId)) {
      throw new LifecycleError(
        `Component "${component.componentId}" is already registered with the LifecycleManager.`,
        { componentId: component.componentId }
      );
    }

    const now = new Date().toISOString();
    const record: ComponentRecord = {
      componentId:  component.componentId,
      displayName:  component.displayName,
      component,
      state:        'Registered',
      registeredAt: now,
      stateChangedAt: now,
    };
    this.records.set(component.componentId, record);

    this.logger.debug('LifecycleManager: component registered', {
      componentId:  component.componentId,
      displayName:  component.displayName,
      dependencies: component.dependencies,
    });
  }

  // ── Initialization ────────────────────────────────────────────────────────

  async initializeAll(): Promise<void> {
    if (this.managerState !== 'Idle') {
      throw new LifecycleError(
        `initializeAll() may only be called once. Current manager state: ${this.managerState}.`,
        { managerState: this.managerState }
      );
    }

    const overallStart = Date.now();
    this.startedAt = new Date().toISOString();
    this.managerState = 'Starting';

    this.logger.info('LifecycleManager: starting component initialization', {
      componentCount: this.records.size,
      startedAt: this.startedAt,
    });

    try {
      this.initializationOrder = this.resolveInitializationOrder();

      this.logger.debug('LifecycleManager: initialization order resolved', {
        order: this.initializationOrder,
      });

      for (const componentId of this.initializationOrder) {
        await this.initializeComponent(componentId);
      }

      this.managerState = 'Running';
      this.completedAt = new Date().toISOString();
      this.startupDurationMs = Date.now() - overallStart;

      this.logger.info('LifecycleManager: all components initialized', {
        componentCount:    this.records.size,
        startupDurationMs: this.startupDurationMs,
      });
    } catch (error) {
      this.managerState = 'Failed';
      this.completedAt = new Date().toISOString();
      this.startupDurationMs = Date.now() - overallStart;

      const message = error instanceof Error ? error.message : 'Unknown initialization failure';
      this.logger.error('LifecycleManager: initialization failed', {
        message,
        startupDurationMs: this.startupDurationMs,
      });

      if (error instanceof LifecycleError) throw error;
      throw new LifecycleError(message, { startupDurationMs: this.startupDurationMs });
    }
  }

  // ── Shutdown ──────────────────────────────────────────────────────────────

  async shutdownAll(): Promise<void> {
    const allowedStates: ReadonlyArray<ManagerState> = ['Starting', 'Running', 'Failed'];
    if (!allowedStates.includes(this.managerState)) {
      throw new LifecycleError(
        `shutdownAll() cannot be called in manager state "${this.managerState}".`,
        { managerState: this.managerState }
      );
    }

    const overallStart = Date.now();
    this.managerState = 'Stopping';

    this.logger.info('LifecycleManager: starting graceful shutdown', {
      componentCount: this.records.size,
    });

    const shutdownOrder = [...this.initializationOrder].reverse();
    const stoppableStates: ReadonlyArray<LifecycleState> = [
      'Running', 'Degraded', 'Maintenance', 'Initializing',
    ];

    for (const componentId of shutdownOrder) {
      const record = this.records.get(componentId);
      if (record === undefined || !stoppableStates.includes(record.state)) continue;
      await this.shutdownComponent(componentId);
    }

    this.managerState = 'Stopped';
    this.shutdownDurationMs = Date.now() - overallStart;

    this.logger.info('LifecycleManager: shutdown complete', {
      shutdownDurationMs: this.shutdownDurationMs,
    });
  }

  // ── Restart ───────────────────────────────────────────────────────────────

  async restart(componentId: string): Promise<void> {
    const record = this.requireRecord(componentId);

    const restartableStates: ReadonlyArray<LifecycleState> = [
      'Running', 'Degraded', 'Maintenance', 'Stopped', 'Failed',
    ];
    if (!restartableStates.includes(record.state)) {
      throw new LifecycleError(
        `Cannot restart component "${componentId}" from state "${record.state}". ` +
        `Expected one of: ${restartableStates.join(', ')}.`,
        { componentId, state: record.state }
      );
    }

    this.logger.info('LifecycleManager: restarting component', {
      componentId,
      currentState: record.state,
    });

    const activeStates: ReadonlyArray<LifecycleState> = ['Running', 'Degraded', 'Maintenance'];
    if (activeStates.includes(record.state)) {
      await this.shutdownComponent(componentId);
    }

    this.transitionState(record, 'Registered');
    this.checkDependenciesRunning(record);
    await this.initializeComponent(componentId);
  }

  // ── Health state control ──────────────────────────────────────────────────

  setDegraded(componentId: string, reason: string): void {
    const record = this.requireRecord(componentId);
    this.transitionState(record, 'Degraded');
    record.errorMessage = reason;

    this.logger.warn('LifecycleManager: component degraded', { componentId, reason });
    this.syncServiceRegistry(componentId, 'degraded');
  }

  enterMaintenance(componentId: string): void {
    const record = this.requireRecord(componentId);
    this.transitionState(record, 'Maintenance');

    this.logger.info('LifecycleManager: component entered maintenance', { componentId });
  }

  exitMaintenance(componentId: string): void {
    const record = this.requireRecord(componentId);
    if (record.state !== 'Maintenance') {
      throw new LifecycleError(
        `exitMaintenance() requires state "Maintenance". ` +
        `Component "${componentId}" is currently in state "${record.state}".`,
        { componentId, state: record.state }
      );
    }

    this.transitionState(record, 'Running');
    this.logger.info('LifecycleManager: component exited maintenance', { componentId });
    this.syncServiceRegistry(componentId, 'running');
  }

  // ── Status ────────────────────────────────────────────────────────────────

  getStatus(): Readonly<LifecycleStatus> {
    const components = Array.from(this.records.values()).map((r) =>
      this.toComponentStatus(r)
    );

    const status: LifecycleStatus = {
      managerState:       this.managerState,
      components,
      totalComponents:    components.length,
      runningComponents:  components.filter((c) => c.state === 'Running').length,
      degradedComponents: components.filter((c) => c.state === 'Degraded').length,
      failedComponents:   components.filter((c) => c.state === 'Failed').length,
      stoppedComponents:  components.filter((c) => c.state === 'Stopped').length,
      ...(this.startedAt         !== undefined ? { startedAt:         this.startedAt         } : {}),
      ...(this.completedAt       !== undefined ? { completedAt:       this.completedAt       } : {}),
      ...(this.startupDurationMs !== undefined ? { startupDurationMs: this.startupDurationMs } : {}),
      ...(this.shutdownDurationMs !== undefined ? { shutdownDurationMs: this.shutdownDurationMs } : {}),
    };

    return Object.freeze(status);
  }

  getComponentStatus(componentId: string): Readonly<ComponentStatus> {
    return Object.freeze(this.toComponentStatus(this.requireRecord(componentId)));
  }

  hasComponent(componentId: string): boolean {
    return this.records.has(componentId);
  }

  // ── Private: component initialization ────────────────────────────────────

  private async initializeComponent(componentId: string): Promise<void> {
    const record = this.requireRecord(componentId);
    this.checkDependenciesRunning(record);

    const componentStart = Date.now();
    this.transitionState(record, 'Initializing');

    this.logger.debug('LifecycleManager: initializing component', {
      componentId,
      displayName: record.displayName,
    });

    try {
      await record.component.initialize();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Initialization failed';
      record.startupDurationMs = Date.now() - componentStart;
      this.transitionToFailed(record, message);
      throw new LifecycleError(
        `Component "${componentId}" failed to initialize: ${message}`,
        { componentId, startupDurationMs: record.startupDurationMs }
      );
    }

    record.startupDurationMs = Date.now() - componentStart;
    this.transitionState(record, 'Running');

    this.logger.info('LifecycleManager: component running', {
      componentId,
      startupDurationMs: record.startupDurationMs,
    });

    this.syncServiceRegistry(componentId, 'running');
  }

  // ── Private: component shutdown ───────────────────────────────────────────

  private async shutdownComponent(componentId: string): Promise<void> {
    const record = this.requireRecord(componentId);
    const componentStart = Date.now();

    this.transitionState(record, 'Stopping');

    this.logger.debug('LifecycleManager: stopping component', {
      componentId,
      displayName: record.displayName,
    });

    try {
      await record.component.shutdown();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Shutdown failed';
      record.shutdownDurationMs = Date.now() - componentStart;
      this.transitionToFailed(record, message);
      this.logger.error('LifecycleManager: component failed to stop', {
        componentId,
        message,
        shutdownDurationMs: record.shutdownDurationMs,
      });
      return;
    }

    record.shutdownDurationMs = Date.now() - componentStart;
    this.transitionState(record, 'Stopped');

    this.logger.info('LifecycleManager: component stopped', {
      componentId,
      shutdownDurationMs: record.shutdownDurationMs,
    });

    this.syncServiceRegistry(componentId, 'stopped');
  }

  // ── Private: state transitions ────────────────────────────────────────────

  private transitionState(record: ComponentRecord, to: LifecycleState): void {
    if (!isTransitionAllowed(record.state, to)) {
      const allowed = allowedTransitionsFrom(record.state);
      throw new LifecycleError(
        `Invalid lifecycle transition for "${record.componentId}": ` +
        `"${record.state}" → "${to}". ` +
        `Allowed from "${record.state}": [${allowed.join(', ')}].`,
        { componentId: record.componentId, from: record.state, to, allowed }
      );
    }

    const previous = record.state;
    const now = new Date().toISOString();

    record.state = to;
    record.stateChangedAt = now;

    if (to === 'Initializing') record.initializedAt = now;
    if (to === 'Running')      record.startedAt     = now;
    if (to === 'Stopped')      record.stoppedAt     = now;
    if (to === 'Failed')       record.failedAt      = now;

    this.logger.debug('LifecycleManager: component state transition', {
      componentId: record.componentId,
      from: previous,
      to,
    });
  }

  private transitionToFailed(record: ComponentRecord, message: string): void {
    this.transitionState(record, 'Failed');
    record.errorMessage = message;
    this.syncServiceRegistry(record.componentId, 'failed');
  }

  // ── Private: dependency resolution ───────────────────────────────────────

  /**
   * Topological sort via depth-first search (Kahn variant).
   * Detects circular dependencies and unknown dependency references.
   */
  private resolveInitializationOrder(): ReadonlyArray<string> {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string, ancestorSet: ReadonlySet<string>): void => {
      if (ancestorSet.has(id)) {
        const cycle = [...ancestorSet, id].join(' → ');
        throw new LifecycleError(
          `Circular dependency detected: ${cycle}`,
          { cycle: [...ancestorSet, id] }
        );
      }

      if (visited.has(id)) return;

      const record = this.records.get(id);
      if (record === undefined) {
        throw new LifecycleError(
          `Unknown dependency "${id}" referenced by a registered component. ` +
          `Ensure the dependency is registered before calling initializeAll().`,
          { unknownId: id, registered: Array.from(this.records.keys()) }
        );
      }

      const path = new Set([...ancestorSet, id]);
      for (const dep of record.component.dependencies) {
        visit(dep, path);
      }

      visited.add(id);
      result.push(id);
    };

    for (const id of this.records.keys()) {
      visit(id, new Set());
    }

    return result;
  }

  private checkDependenciesRunning(record: ComponentRecord): void {
    for (const depId of record.component.dependencies) {
      const dep = this.records.get(depId);
      if (dep === undefined) {
        throw new LifecycleError(
          `Dependency "${depId}" required by "${record.componentId}" is not registered.`,
          { componentId: record.componentId, missingDep: depId }
        );
      }
      if (dep.state !== 'Running') {
        throw new LifecycleError(
          `Cannot initialize "${record.componentId}": dependency "${depId}" is in state ` +
          `"${dep.state}", expected "Running".`,
          { componentId: record.componentId, depId, depState: dep.state }
        );
      }
    }
  }

  // ── Private: ServiceRegistry sync ────────────────────────────────────────

  private syncServiceRegistry(
    componentId: string,
    status: 'running' | 'stopped' | 'failed' | 'degraded'
  ): void {
    if (this.serviceRegistry === undefined) return;
    if (!this.serviceRegistry.has(componentId)) return;

    try {
      this.serviceRegistry.setStatus(componentId, status);
    } catch {
      this.logger.warn('LifecycleManager: ServiceRegistry sync failed', {
        componentId,
        targetStatus: status,
      });
    }
  }

  // ── Private: helpers ──────────────────────────────────────────────────────

  private requireRecord(componentId: string): ComponentRecord {
    const record = this.records.get(componentId);
    if (record === undefined) {
      throw new LifecycleError(
        `Component "${componentId}" is not registered with the LifecycleManager.`,
        { componentId, registered: Array.from(this.records.keys()) }
      );
    }
    return record;
  }

  private toComponentStatus(record: ComponentRecord): ComponentStatus {
    return {
      componentId:  record.componentId,
      displayName:  record.displayName,
      state:        record.state,
      registeredAt: record.registeredAt,
      stateChangedAt: record.stateChangedAt,
      dependencies: record.component.dependencies,
      ...(record.initializedAt    !== undefined ? { initializedAt:    record.initializedAt    } : {}),
      ...(record.startedAt        !== undefined ? { startedAt:        record.startedAt        } : {}),
      ...(record.stoppedAt        !== undefined ? { stoppedAt:        record.stoppedAt        } : {}),
      ...(record.failedAt         !== undefined ? { failedAt:         record.failedAt         } : {}),
      ...(record.startupDurationMs  !== undefined ? { startupDurationMs:  record.startupDurationMs  } : {}),
      ...(record.shutdownDurationMs !== undefined ? { shutdownDurationMs: record.shutdownDurationMs } : {}),
      ...(record.errorMessage     !== undefined ? { errorMessage:     record.errorMessage     } : {}),
    };
  }
}
