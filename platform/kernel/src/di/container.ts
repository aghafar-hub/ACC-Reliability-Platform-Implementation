// platform/kernel/src/di/container.ts
//
// Production-ready DI container for the ACC Reliability Platform.
//
// Design principles:
//   - Token-based, no decorators, no reflect-metadata
//   - Three registration kinds: singleton, lazy-singleton, transient
//   - Circular dependency detection via a per-resolve stack
//   - Required-dependency errors with full context
//   - Logger integration for observability
//   - reset() for test teardown

import { ContainerError } from '../errors';
import type { ILogger } from '../logger';
import type { Token } from './token';
import type {
  ContainerRegistrationInfo,
  Factory,
  IContainer,
  RegistrationKind,
} from './container-types';

// ── Internal mutable registration record ──────────────────────────────────────

interface MutableRegistration<T = unknown> {
  tokenName: string;
  kind: RegistrationKind;
  factory: Factory<T>;
  registeredAt: string;
  resolvedAt?: string;
  /** Present once the factory has been called (singleton / lazy-singleton only). */
  cachedInstance?: T;
}

// ── Container ─────────────────────────────────────────────────────────────────

/**
 * Container is the platform DI container.
 *
 * It is intentionally independent of ServiceRegistry.
 * ServiceRegistry provides runtime lifecycle management for platform services.
 * Container provides type-safe dependency composition for application code.
 *
 * Typical usage:
 *
 *   const container = new Container(logger);
 *
 *   // Register
 *   container.registerSingleton(LOGGER_TOKEN, platformLogger);
 *   container.registerLazySingleton(MY_SERVICE_TOKEN, (c) => {
 *     return new MyService(c.resolve(LOGGER_TOKEN));
 *   });
 *
 *   // Resolve
 *   const svc = container.resolve(MY_SERVICE_TOKEN);
 */
export class Container implements IContainer {
  private readonly registrations = new Map<string, MutableRegistration>();

  /**
   * Tracks the in-progress token resolution chain for a single resolve() call.
   * Used to detect circular dependencies.
   * This is reset after each top-level resolve() completes or throws.
   */
  private readonly resolutionStack: string[] = [];

  constructor(private readonly logger: ILogger) {}

  // ── Registration ─────────────────────────────────────────────────────────────

  registerSingleton<T>(token: Token<T>, instance: T): void {
    this.assertNotRegistered(token);

    const registration: MutableRegistration<T> = {
      tokenName:    token.name,
      kind:         'singleton',
      factory:      () => instance,
      registeredAt: new Date().toISOString(),
      // Pre-populate cache: the instance is ready immediately
      cachedInstance: instance,
      resolvedAt:     new Date().toISOString(),
    };

    this.registrations.set(token.name, registration as MutableRegistration);
    this.logger.debug('Container: singleton registered', { token: token.name });
  }

  registerLazySingleton<T>(token: Token<T>, factory: Factory<T>): void {
    this.assertNotRegistered(token);

    const registration: MutableRegistration<T> = {
      tokenName:    token.name,
      kind:         'lazy-singleton',
      factory,
      registeredAt: new Date().toISOString(),
    };

    this.registrations.set(token.name, registration as MutableRegistration);
    this.logger.debug('Container: lazy-singleton registered', { token: token.name });
  }

  registerFactory<T>(token: Token<T>, factory: Factory<T>): void {
    this.assertNotRegistered(token);

    const registration: MutableRegistration<T> = {
      tokenName:    token.name,
      kind:         'transient',
      factory,
      registeredAt: new Date().toISOString(),
    };

    this.registrations.set(token.name, registration as MutableRegistration);
    this.logger.debug('Container: transient factory registered', { token: token.name });
  }

  // ── Resolution ────────────────────────────────────────────────────────────────

  resolve<T>(token: Token<T>): T {
    const isTopLevel = this.resolutionStack.length === 0;

    try {
      return this.resolveInternal<T>(token);
    } finally {
      // Always reset the stack when returning to the top-level caller,
      // even if an error was thrown mid-chain.
      if (isTopLevel) {
        this.resolutionStack.length = 0;
      }
    }
  }

  has<T>(token: Token<T>): boolean {
    return this.registrations.has(token.name);
  }

  // ── Listing ───────────────────────────────────────────────────────────────────

  list(): ReadonlyArray<ContainerRegistrationInfo> {
    return Array.from(this.registrations.values()).map((r) =>
      this.toPublicInfo(r)
    );
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────

  reset(): void {
    const count = this.registrations.size;
    this.registrations.clear();
    this.resolutionStack.length = 0;
    this.logger.warn('Container: all registrations cleared', { clearedCount: count });
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private resolveInternal<T>(token: Token<T>): T {
    // Guard: missing registration
    const registration = this.registrations.get(token.name);
    if (registration === undefined) {
      throw new ContainerError(
        `Dependency "${token.name}" is not registered. ` +
        `Register it before resolving.`,
        {
          token:      token.name,
          registered: Array.from(this.registrations.keys()),
          stack:      [...this.resolutionStack],
        }
      );
    }

    // Guard: circular dependency
    if (this.resolutionStack.includes(token.name)) {
      const cycle = [...this.resolutionStack, token.name].join(' → ');
      throw new ContainerError(
        `Circular dependency detected: ${cycle}`,
        { token: token.name, cycle }
      );
    }

    // Singleton — always return the pre-cached instance
    if (registration.kind === 'singleton') {
      return registration.cachedInstance as T;
    }

    // Lazy-singleton — return cached instance if available, else create once
    if (registration.kind === 'lazy-singleton') {
      if (registration.cachedInstance !== undefined) {
        return registration.cachedInstance as T;
      }

      this.resolutionStack.push(token.name);
      const instance = registration.factory(this) as T;
      registration.cachedInstance = instance;
      registration.resolvedAt = new Date().toISOString();
      this.resolutionStack.pop();

      this.logger.debug('Container: lazy-singleton resolved', { token: token.name });
      return instance;
    }

    // Transient — create a fresh instance every time
    this.resolutionStack.push(token.name);
    const instance = registration.factory(this) as T;
    this.resolutionStack.pop();

    this.logger.debug('Container: transient resolved', { token: token.name });
    return instance;
  }

  private assertNotRegistered<T>(token: Token<T>): void {
    if (this.registrations.has(token.name)) {
      const existing = this.registrations.get(token.name);
      throw new ContainerError(
        `Token "${token.name}" is already registered. ` +
        `Each token may only be registered once per container instance.`,
        {
          token:        token.name,
          existingKind: existing?.kind,
        }
      );
    }
  }

  private toPublicInfo(r: MutableRegistration): ContainerRegistrationInfo {
    const base: ContainerRegistrationInfo = {
      tokenName:    r.tokenName,
      kind:         r.kind,
      registeredAt: r.registeredAt,
    };

    // Conditionally include resolvedAt to satisfy exactOptionalPropertyTypes
    return r.resolvedAt !== undefined
      ? { ...base, resolvedAt: r.resolvedAt }
      : base;
  }
}
