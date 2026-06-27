// platform/kernel/src/config/config-validator.ts
//
// Validates an assembled AppConfig before it is cached and returned.
// Raises ConfigurationError with all detected errors collected.

import { ConfigurationError } from '../errors';
import type { AppConfig, PlatformEnvironment, StorageProvider } from './config-types';

// ── Valid value sets ──────────────────────────────────────────────────────────

const VALID_ENVIRONMENTS: ReadonlySet<PlatformEnvironment> = new Set([
  'development',
  'test',
  'staging',
  'production',
] as const);

const VALID_STORAGE_PROVIDERS: ReadonlySet<StorageProvider> = new Set([
  'GoogleSheets',
  'SQLServer',
  'PostgreSQL',
  'SQLite',
  'Mock',
] as const);

// ── Public types ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}

// ── Validator ─────────────────────────────────────────────────────────────────

/**
 * ConfigValidator inspects a fully assembled AppConfig and returns a
 * ValidationResult listing every detected problem. Call assertValid() to
 * throw a ConfigurationError on the first failure pass.
 *
 * Always produces a complete list of errors rather than failing fast,
 * so operators can correct all problems in one pass.
 */
export class ConfigValidator {
  /**
   * Validates the entire config and returns the result.
   * Does not throw.
   */
  validate(config: AppConfig): ValidationResult {
    const errors: string[] = [];

    this.validatePlatform(config, errors);
    this.validateStorage(config, errors);
    this.validateRuntime(config, errors);

    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  /**
   * Validates the config and throws ConfigurationError if invalid.
   * The error carries the full list of problems in its context.
   */
  assertValid(config: AppConfig): void {
    const result = this.validate(config);
    if (!result.valid) {
      throw new ConfigurationError(
        `Platform configuration is invalid (${result.errors.length} error${result.errors.length === 1 ? '' : 's'})`,
        { errors: result.errors as string[] }
      );
    }
  }

  // ── Group validators ────────────────────────────────────────────────────────

  private validatePlatform(config: AppConfig, errors: string[]): void {
    const { platform } = config;

    if (!platform.name || platform.name.trim() === '') {
      errors.push('platform.name is required and must not be empty');
    }

    if (!platform.version || platform.version.trim() === '') {
      errors.push('platform.version is required and must not be empty');
    } else if (!/^\d+\.\d+\.\d+/.test(platform.version.trim())) {
      errors.push(
        `platform.version "${platform.version}" does not look like a semantic version (expected X.Y.Z)`
      );
    }

    if (!VALID_ENVIRONMENTS.has(platform.environment)) {
      errors.push(
        `platform.environment "${platform.environment}" is not valid. ` +
        `Allowed: ${[...VALID_ENVIRONMENTS].join(', ')}`
      );
    }
  }

  private validateStorage(config: AppConfig, errors: string[]): void {
    const { storage } = config;

    if (!VALID_STORAGE_PROVIDERS.has(storage.provider)) {
      errors.push(
        `storage.provider "${storage.provider}" is not valid. ` +
        `Allowed: ${[...VALID_STORAGE_PROVIDERS].join(', ')}`
      );
    }

    if (storage.connectionTimeoutMs <= 0) {
      errors.push('storage.connectionTimeoutMs must be greater than 0');
    }

    if (storage.queryTimeoutMs <= 0) {
      errors.push('storage.queryTimeoutMs must be greater than 0');
    }

    if (storage.maxRetries < 0) {
      errors.push('storage.maxRetries must be 0 or greater');
    }
  }

  private validateRuntime(config: AppConfig, errors: string[]): void {
    const { runtime } = config;

    if (runtime.requestTimeoutMs <= 0) {
      errors.push('runtime.requestTimeoutMs must be greater than 0');
    }

    if (runtime.maxConcurrentRequests <= 0) {
      errors.push('runtime.maxConcurrentRequests must be greater than 0');
    }

    if (runtime.healthCheckIntervalMs <= 0) {
      errors.push('runtime.healthCheckIntervalMs must be greater than 0');
    }
  }
}
