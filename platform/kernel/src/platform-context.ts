// platform/kernel/src/platform-context.ts

import type { PlatformEnvironment } from './config/config-types';
import type { IServiceRegistry } from './service-registry';
import type { IModuleRegistry } from './module-registry';

/**
 * The PlatformContext is the single authoritative runtime snapshot
 * of the platform after successful bootstrap.
 *
 * It is read-only after creation. Consumers receive it via dependency
 * injection — never by import-time singleton.
 */
export interface PlatformContext {
  readonly platformName: string;
  readonly version: string;
  readonly environment: PlatformEnvironment;
  /** ISO 8601 timestamp of when bootstrapPlatform() completed. */
  readonly initializedAt: string;
  /**
   * Unique ID for this bootstrap session.
   * Useful for correlating logs across a single platform startup.
   */
  readonly correlationId: string;
  readonly services: IServiceRegistry;
  readonly modules: IModuleRegistry;
}

/** Minimal factory — constructs a frozen PlatformContext. */
export function createPlatformContext(
  params: Omit<PlatformContext, 'initializedAt' | 'correlationId'> & {
    initializedAt?: string;
    correlationId?: string;
  }
): Readonly<PlatformContext> {
  const context: PlatformContext = {
    platformName: params.platformName,
    version: params.version,
    environment: params.environment,
    initializedAt: params.initializedAt ?? new Date().toISOString(),
    correlationId: params.correlationId ?? generateCorrelationId(),
    services: params.services,
    modules: params.modules,
  };

  return Object.freeze(context);
}

function generateCorrelationId(): string {
  // Lightweight ID without external dependencies.
  // Replace with crypto.randomUUID() when targeting Node ≥ 19 or browser.
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  return `${ts}-${rand}`;
}
