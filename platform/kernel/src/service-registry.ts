// platform/kernel/src/service-registry.ts

import { RegistryError } from './errors';
import type { ILogger } from './logger';

// ── Service Status ────────────────────────────────────────────────────────────

/**
 * Lifecycle states for a registered platform service.
 *
 * Typical progression:
 *   registered → initialized → running → stopped
 *
 * Degraded and failed are lateral states entered from running or initialized.
 * A stopped service is terminal; re-registration is the only recovery path.
 */
export type ServiceStatus =
  | 'registered'    // present in the registry, not yet started
  | 'initialized'   // setup complete, not yet accepting requests
  | 'running'       // fully operational
  | 'degraded'      // operational but with reduced capability
  | 'failed'        // non-operational due to an error
  | 'stopped';      // deliberately shut down

// ── Descriptor ────────────────────────────────────────────────────────────────

/**
 * Full metadata record for a registered service.
 * The `instance` field carries the live service object.
 * All fields are readonly after creation; use setStatus() to transition state.
 */
export interface ServiceDescriptor<T = unknown> {
  readonly serviceId: string;
  readonly displayName: string;
  readonly instance: T;
  readonly status: ServiceStatus;
  /** ISO 8601 — when register() was called. */
  readonly registeredAt: string;
  /** ISO 8601 — when the most recent status transition occurred. */
  readonly statusChangedAt: string;
  /** ISO 8601 — set when status transitions to 'initialized'. */
  readonly initializedAt?: string;
  /** ISO 8601 — set when status transitions to 'running'. */
  readonly startedAt?: string;
  /** ISO 8601 — set when status transitions to 'stopped'. */
  readonly stoppedAt?: string;
}

/**
 * Public view of a service descriptor — the instance is never exposed
 * outside the registry. Returned by list() and listByStatus().
 */
export type ServiceInfo = Omit<ServiceDescriptor, 'instance'>;

// ── Internal mutable representation ──────────────────────────────────────────

/** Mutable counterpart used internally so status transitions can be applied. */
interface MutableEntry<T = unknown> {
  serviceId: string;
  displayName: string;
  instance: T;
  status: ServiceStatus;
  registeredAt: string;
  statusChangedAt: string;
  initializedAt?: string;
  startedAt?: string;
  stoppedAt?: string;
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IServiceRegistry {
  /**
   * Registers a service under serviceId.
   * Throws RegistryError if serviceId is already taken.
   * Use tryRegister() when duplicates should be handled without throwing.
   */
  register<T>(serviceId: string, displayName: string, instance: T): void;

  /**
   * Registers a service only when serviceId is not yet taken.
   * Returns true on success, false when the id was already registered.
   * Never throws for duplicate ids.
   */
  tryRegister<T>(serviceId: string, displayName: string, instance: T): boolean;

  /**
   * Returns the service instance for serviceId.
   * Throws RegistryError if the service is not registered.
   */
  get<T>(serviceId: string): T;

  /**
   * Returns the service instance for serviceId.
   * Throws RegistryError when the service is not found, with a message that
   * treats the absence as a programming error — use this when the service is
   * an unconditional dependency that must have been registered during bootstrap.
   */
  getRequired<T>(serviceId: string): T;

  /** Returns true if serviceId is registered. */
  has(serviceId: string): boolean;

  /**
   * Transitions a service to the given status and updates lifecycle timestamps.
   * Throws RegistryError if the service is not found.
   */
  setStatus(serviceId: string, status: ServiceStatus): void;

  /**
   * Returns the current status of a service.
   * Throws RegistryError if the service is not found.
   */
  getStatus(serviceId: string): ServiceStatus;

  /** Returns public metadata for all registered services (no instances). */
  list(): ReadonlyArray<ServiceInfo>;

  /** Returns public metadata for services currently in the given status. */
  listByStatus(status: ServiceStatus): ReadonlyArray<ServiceInfo>;

  /**
   * Removes all registered services and resets the registry to empty.
   *
   * Intended for test teardown and hot-reload scenarios.
   * Do not call this in normal application code; use setStatus('stopped')
   * for orderly shutdown of individual services.
   */
  clear(): void;
}

// ── Implementation ────────────────────────────────────────────────────────────

export class ServiceRegistry implements IServiceRegistry {
  private readonly services = new Map<string, MutableEntry>();

  constructor(private readonly logger: ILogger) {}

  // ── Registration ────────────────────────────────────────────────────────────

  register<T>(serviceId: string, displayName: string, instance: T): void {
    if (this.services.has(serviceId)) {
      throw new RegistryError(
        `Service "${serviceId}" is already registered. Use a unique serviceId or call tryRegister() for idempotent registration.`,
        { serviceId, existing: this.services.get(serviceId)?.displayName }
      );
    }
    this.addEntry(serviceId, displayName, instance);
  }

  tryRegister<T>(serviceId: string, displayName: string, instance: T): boolean {
    if (this.services.has(serviceId)) {
      this.logger.debug('ServiceRegistry: skipped duplicate registration', {
        serviceId,
        displayName,
        existing: this.services.get(serviceId)?.displayName,
      });
      return false;
    }
    this.addEntry(serviceId, displayName, instance);
    return true;
  }

  // ── Retrieval ───────────────────────────────────────────────────────────────

  get<T>(serviceId: string): T {
    const entry = this.services.get(serviceId);
    if (entry === undefined) {
      throw new RegistryError(
        `Service "${serviceId}" is not registered.`,
        { serviceId, registered: this.registeredIds() }
      );
    }
    return entry.instance as T;
  }

  getRequired<T>(serviceId: string): T {
    const entry = this.services.get(serviceId);
    if (entry === undefined) {
      throw new RegistryError(
        `Required service "${serviceId}" is not registered. ` +
        `This indicates a bootstrap ordering problem — "${serviceId}" must be registered before it is resolved.`,
        { serviceId, registered: this.registeredIds() }
      );
    }
    return entry.instance as T;
  }

  has(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  // ── Status management ───────────────────────────────────────────────────────

  setStatus(serviceId: string, status: ServiceStatus): void {
    const entry = this.requireEntry(serviceId);
    const previous = entry.status;
    const now = new Date().toISOString();

    entry.status = status;
    entry.statusChangedAt = now;

    // Record lifecycle timestamps for meaningful states
    if (status === 'initialized') entry.initializedAt = now;
    if (status === 'running')     entry.startedAt     = now;
    if (status === 'stopped')     entry.stoppedAt     = now;

    this.logger.debug('ServiceRegistry: service status changed', {
      serviceId,
      previous,
      current: status,
    });
  }

  getStatus(serviceId: string): ServiceStatus {
    return this.requireEntry(serviceId).status;
  }

  // ── Listing ─────────────────────────────────────────────────────────────────

  list(): ReadonlyArray<ServiceInfo> {
    return Array.from(this.services.values()).map((e) => this.toServiceInfo(e));
  }

  listByStatus(status: ServiceStatus): ReadonlyArray<ServiceInfo> {
    return Array.from(this.services.values())
      .filter((e) => e.status === status)
      .map((e) => this.toServiceInfo(e));
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  clear(): void {
    const count = this.services.size;
    this.services.clear();
    this.logger.warn('ServiceRegistry: all services cleared', { clearedCount: count });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private addEntry<T>(serviceId: string, displayName: string, instance: T): void {
    const now = new Date().toISOString();
    const entry: MutableEntry<T> = {
      serviceId,
      displayName,
      instance,
      status: 'registered',
      registeredAt: now,
      statusChangedAt: now,
    };
    this.services.set(serviceId, entry as MutableEntry);
    this.logger.debug('ServiceRegistry: service registered', {
      serviceId,
      displayName,
      status: 'registered',
    });
  }

  private requireEntry(serviceId: string): MutableEntry {
    const entry = this.services.get(serviceId);
    if (entry === undefined) {
      throw new RegistryError(
        `Service "${serviceId}" is not registered.`,
        { serviceId, registered: this.registeredIds() }
      );
    }
    return entry;
  }

  private toServiceInfo(entry: MutableEntry): ServiceInfo {
    const base: ServiceInfo = {
      serviceId:       entry.serviceId,
      displayName:     entry.displayName,
      status:          entry.status,
      registeredAt:    entry.registeredAt,
      statusChangedAt: entry.statusChangedAt,
    };

    // Use spread to conditionally include optional lifecycle timestamps.
    // This pattern satisfies exactOptionalPropertyTypes: no field is set to undefined.
    return {
      ...base,
      ...(entry.initializedAt !== undefined ? { initializedAt: entry.initializedAt } : {}),
      ...(entry.startedAt     !== undefined ? { startedAt:     entry.startedAt     } : {}),
      ...(entry.stoppedAt     !== undefined ? { stoppedAt:     entry.stoppedAt     } : {}),
    };
  }

  private registeredIds(): string[] {
    return Array.from(this.services.keys());
  }
}
