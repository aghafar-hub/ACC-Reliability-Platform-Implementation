// platform/services/src/health/health-service.ts
// In-memory implementation of IHealthService.
//
// Stores registrations and the most recent check result for each component.
// All check runs are isolated — an exception or timeout in one check never
// affects others.  checkAll() executes all checks in parallel.
//
// Service ID (Service Registry): `platform.health`
// No storage dependency.  No network calls.  No event publishing.

import {
  DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
  HEALTH_CATEGORIES,
  type HealthCheckFn,
  type HealthCheckOutcome,
  type HealthCheckResult,
  type HealthComponentCategory,
  type HealthComponentRegistration,
  type HealthComponentStatus,
  type HealthServiceOptions,
  type HealthStatus,
  type HealthSummary,
  type IHealthService,
} from './health-types';

import { HealthCheckTimeoutError, HealthComponentNotFoundError, HealthError } from '../errors';

// ── Severity order ────────────────────────────────────────────────────────────

/**
 * Numeric severity for each status.  Higher number = worse.
 * Used to compute the platform-wide `overallStatus`.
 */
const STATUS_SEVERITY: Record<HealthStatus, number> = {
  healthy:     0,
  maintenance: 1,
  warning:     2,
  degraded:    3,
  critical:    4,
  offline:     5,
};

function worstStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b;
}

// ── Internal stored state ─────────────────────────────────────────────────────

interface RegistrationEntry {
  readonly componentId: string;
  readonly componentName: string;
  readonly category: HealthComponentCategory;
  readonly check: HealthCheckFn;
  readonly timeoutMs: number;
  readonly registeredAt: string;
}

interface StoredResult {
  readonly lastResult: HealthCheckResult;
  readonly checkCount: number;
  readonly consecutiveFailures: number;
}

// ── HealthService ─────────────────────────────────────────────────────────────

/**
 * In-memory platform health service.
 *
 * Thread safety: JavaScript is single-threaded; concurrent async checks are
 * safe because Map mutations only happen after each `await`.
 *
 * Register this instance with the Service Registry under `platform.health`
 * after platform bootstrap.
 */
export class HealthService implements IHealthService {
  private readonly registrations = new Map<string, RegistrationEntry>();
  private readonly storedResults = new Map<string, StoredResult>();
  private readonly defaultTimeoutMs: number;

  constructor(options: HealthServiceOptions = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_HEALTH_CHECK_TIMEOUT_MS;
  }

  // ── Registration ────────────────────────────────────────────────────────────

  register(registration: HealthComponentRegistration): void {
    if (this.registrations.has(registration.componentId)) {
      throw new HealthError(
        `Health component '${registration.componentId}' is already registered`,
        'HEALTH_DUPLICATE_COMPONENT',
        { componentId: registration.componentId },
      );
    }

    const entry: RegistrationEntry = {
      componentId:  registration.componentId,
      componentName: registration.componentName,
      category:     registration.category,
      check:        registration.check,
      timeoutMs:    registration.timeoutMs ?? this.defaultTimeoutMs,
      registeredAt: new Date().toISOString(),
    };

    this.registrations.set(registration.componentId, entry);
  }

  unregister(componentId: string): void {
    this.registrations.delete(componentId);
    this.storedResults.delete(componentId);
  }

  // ── Active checks ────────────────────────────────────────────────────────────

  async check(componentId: string): Promise<HealthCheckResult> {
    const entry = this.registrations.get(componentId);
    if (entry === undefined) {
      throw new HealthComponentNotFoundError(componentId);
    }

    const result = await this.runCheck(entry);
    this.storeResult(componentId, result);
    return result;
  }

  async checkAll(): Promise<readonly HealthCheckResult[]> {
    const entries = Array.from(this.registrations.values());
    const settled = await Promise.allSettled(
      entries.map(entry => this.runCheck(entry)),
    );

    const results: HealthCheckResult[] = [];
    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      const entry = entries[i];
      if (outcome === undefined || entry === undefined) continue;

      let result: HealthCheckResult;
      if (outcome.status === 'fulfilled') {
        result = outcome.value;
      } else {
        result = this.buildErrorResult(entry, outcome.reason, false);
      }
      this.storeResult(entry.componentId, result);
      results.push(result);
    }
    return results;
  }

  // ── State queries ─────────────────────────────────────────────────────────

  getStatus(componentId: string): HealthComponentStatus | null {
    const entry = this.registrations.get(componentId);
    if (entry === undefined) return null;

    const stored = this.storedResults.get(componentId);
    if (stored === undefined) {
      return this.buildNeverCheckedStatus(entry);
    }
    return this.buildComponentStatus(entry, stored);
  }

  getSummary(): HealthSummary {
    const timestamp = new Date().toISOString();
    const components: HealthComponentStatus[] = [];

    for (const entry of this.registrations.values()) {
      const stored = this.storedResults.get(entry.componentId);
      const status = stored === undefined
        ? this.buildNeverCheckedStatus(entry)
        : this.buildComponentStatus(entry, stored);
      components.push(status);
    }

    const counts: Record<HealthStatus, number> = {
      healthy:     0,
      warning:     0,
      degraded:    0,
      critical:    0,
      offline:     0,
      maintenance: 0,
    };

    let overall: HealthStatus = 'healthy';
    for (const component of components) {
      counts[component.status]++;
      overall = worstStatus(overall, component.status);
    }

    return {
      overallStatus:    overall,
      timestamp,
      components:       Object.freeze(components),
      totalComponents:  components.length,
      healthyCount:     counts.healthy,
      warningCount:     counts.warning,
      degradedCount:    counts.degraded,
      criticalCount:    counts.critical,
      offlineCount:     counts.offline,
      maintenanceCount: counts.maintenance,
    };
  }

  isHealthy(): boolean {
    return this.getSummary().overallStatus === 'healthy';
  }

  listComponentIds(): readonly string[] {
    return Array.from(this.registrations.keys());
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async runCheck(entry: RegistrationEntry): Promise<HealthCheckResult> {
    const checkedAt = new Date().toISOString();
    const startTime = Date.now();

    let outcome: HealthCheckOutcome;
    let timedOut = false;
    let errorMsg: string | undefined;

    try {
      const checkPromise = Promise.resolve(entry.check());
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new HealthCheckTimeoutError(entry.componentId, entry.timeoutMs)),
          entry.timeoutMs,
        ),
      );
      outcome = await Promise.race([checkPromise, timeoutPromise]);
    } catch (err: unknown) {
      timedOut = err instanceof HealthCheckTimeoutError;
      errorMsg = err instanceof Error ? err.message : String(err);
      outcome = { status: 'offline' };
    }

    const durationMs = Date.now() - startTime;
    return this.buildResult(entry, outcome, checkedAt, durationMs, timedOut, errorMsg);
  }

  private buildResult(
    entry: RegistrationEntry,
    outcome: HealthCheckOutcome,
    checkedAt: string,
    durationMs: number,
    timedOut: boolean,
    error: string | undefined,
  ): HealthCheckResult {
    const base = {
      componentId:   entry.componentId,
      componentName: entry.componentName,
      category:      entry.category,
      status:        outcome.status,
      checkedAt,
      durationMs,
      timedOut,
    };

    // Build optional fields only when they have a value (exactOptionalPropertyTypes)
    return {
      ...base,
      ...(outcome.message !== undefined ? { message: outcome.message } : {}),
      ...(outcome.details  !== undefined ? { details:  outcome.details  } : {}),
      ...(error            !== undefined ? { error                       } : {}),
    };
  }

  private buildErrorResult(
    entry: RegistrationEntry,
    reason: unknown,
    timedOut: boolean,
  ): HealthCheckResult {
    const errorMsg = reason instanceof Error ? reason.message : String(reason);
    return {
      componentId:   entry.componentId,
      componentName: entry.componentName,
      category:      entry.category,
      status:        'offline',
      checkedAt:     new Date().toISOString(),
      durationMs:    0,
      timedOut,
      error:         errorMsg,
    };
  }

  private storeResult(componentId: string, result: HealthCheckResult): void {
    const prev = this.storedResults.get(componentId);
    const prevFailures = prev?.consecutiveFailures ?? 0;
    const isFailure = result.status !== 'healthy' && result.status !== 'maintenance';

    this.storedResults.set(componentId, {
      lastResult:          result,
      checkCount:          (prev?.checkCount ?? 0) + 1,
      consecutiveFailures: isFailure ? prevFailures + 1 : 0,
    });
  }

  private buildNeverCheckedStatus(entry: RegistrationEntry): HealthComponentStatus {
    return {
      componentId:          entry.componentId,
      componentName:        entry.componentName,
      category:             entry.category,
      status:               'offline',
      lastCheckedAt:        null,
      lastCheckDurationMs:  null,
      registeredAt:         entry.registeredAt,
      checkCount:           0,
      consecutiveFailures:  0,
    };
  }

  private buildComponentStatus(entry: RegistrationEntry, stored: StoredResult): HealthComponentStatus {
    const r = stored.lastResult;
    const base = {
      componentId:          entry.componentId,
      componentName:        entry.componentName,
      category:             entry.category,
      status:               r.status,
      lastCheckedAt:        r.checkedAt,
      lastCheckDurationMs:  r.durationMs,
      registeredAt:         entry.registeredAt,
      checkCount:           stored.checkCount,
      consecutiveFailures:  stored.consecutiveFailures,
    };
    return {
      ...base,
      ...(r.message !== undefined ? { lastMessage: r.message } : {}),
    };
  }
}

// ── Verify category coverage (compile-time) ───────────────────────────────────
// This block ensures HEALTH_CATEGORIES and STATUS_SEVERITY stay in sync
// with their respective types.  It produces no runtime overhead.

((): void => {
  const _categories: readonly KnownHealthCategory[] = HEALTH_CATEGORIES;
  void _categories;
  const _statuses: Record<HealthStatus, number> = STATUS_SEVERITY;
  void _statuses;
})();

// Re-export for consumers that only import from this file
import type { KnownHealthCategory } from './health-types';
