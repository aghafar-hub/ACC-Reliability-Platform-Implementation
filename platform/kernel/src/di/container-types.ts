// platform/kernel/src/di/container-types.ts
//
// Public types for the ACC Reliability Platform DI container.

import type { Token } from './token';

// ── Registration kinds ─────────────────────────────────────────────────────────

/**
 * How a dependency is instantiated and cached.
 *
 *   singleton       — A pre-built instance registered directly. Returned as-is on every resolve.
 *   lazy-singleton  — A factory called once on first resolve; the result is cached and reused.
 *   transient       — A factory called fresh on every resolve; nothing is cached.
 */
export type RegistrationKind = 'singleton' | 'lazy-singleton' | 'transient';

// ── Factory function ───────────────────────────────────────────────────────────

/**
 * A factory function that creates a dependency of type T.
 * Receives the container so it can resolve its own dependencies.
 *
 * Example:
 *   container.registerLazySingleton(MY_SERVICE_TOKEN, (c) => {
 *     const logger = c.resolve(LOGGER_TOKEN);
 *     return new MyService(logger);
 *   });
 */
export type Factory<T> = (container: IContainer) => T;

// ── Public registration info ───────────────────────────────────────────────────

/**
 * Metadata about a registered dependency — safe to expose publicly.
 * Neither the factory function nor the cached instance is included.
 */
export interface ContainerRegistrationInfo {
  /** The token name this registration is keyed under. */
  readonly tokenName: string;
  /** How this dependency is instantiated. */
  readonly kind: RegistrationKind;
  /** ISO 8601 timestamp of when this token was registered. */
  readonly registeredAt: string;
  /** ISO 8601 timestamp of when this token was first successfully resolved. Set for singletons and lazy-singletons after first resolve. */
  readonly resolvedAt?: string;
}

// ── Container interface ────────────────────────────────────────────────────────

export interface IContainer {
  /**
   * Registers a pre-built instance as a singleton.
   * The same instance is returned on every resolve().
   * Throws ContainerError if the token is already registered.
   */
  registerSingleton<T>(token: Token<T>, instance: T): void;

  /**
   * Registers a factory that produces a singleton.
   * The factory is called exactly once, on the first resolve().
   * Subsequent resolves return the cached result.
   * Throws ContainerError if the token is already registered.
   */
  registerLazySingleton<T>(token: Token<T>, factory: Factory<T>): void;

  /**
   * Registers a transient factory.
   * The factory is called fresh on every resolve() — nothing is cached.
   * Throws ContainerError if the token is already registered.
   */
  registerFactory<T>(token: Token<T>, factory: Factory<T>): void;

  /**
   * Resolves a dependency by token.
   * Throws ContainerError if the token is not registered.
   * Throws ContainerError if a circular dependency is detected.
   */
  resolve<T>(token: Token<T>): T;

  /** Returns true if a registration exists for this token. */
  has<T>(token: Token<T>): boolean;

  /**
   * Returns public metadata for all registered tokens.
   * Factory functions and cached instances are never included.
   */
  list(): ReadonlyArray<ContainerRegistrationInfo>;

  /**
   * Removes all registrations and clears all caches.
   * Intended for test teardown and hot-reload scenarios.
   */
  reset(): void;
}
