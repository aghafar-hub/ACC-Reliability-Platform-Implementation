// platform/kernel/src/config/config-manager.ts
//
// Production-ready Platform Configuration Manager.
//
// Responsibilities:
//   1. Assemble AppConfig from static defaults, async provider, and env vars
//   2. Validate the assembled configuration
//   3. Cache the result as a frozen, immutable object
//   4. Support reload() for runtime config refresh
//   5. Expose IConfigProvider for future remote/async config sources

import type { ILogger } from '../logger';
import { ConfigurationError } from '../errors';
import type { AppConfig } from './config-types';
import { DEFAULT_CONFIG } from './default-config';
import { applyEnvironmentOverrides } from './environment';
import { ConfigValidator } from './config-validator';

// ── Provider interface ────────────────────────────────────────────────────────

/**
 * IConfigProvider defines the contract for async configuration sources.
 *
 * Current usage: not required (ConfigManager works without one).
 * Future usage: remote config service, GAS PropertiesService, secrets manager.
 *
 * Implement this interface and pass an instance to ConfigManager to layer
 * provider values between static defaults and environment variable overrides.
 */
export interface IConfigProvider {
  /** Returns a partial config that will be merged on top of static defaults. */
  load(): Promise<Partial<AppConfig>>;
}

// ── Manager interface ─────────────────────────────────────────────────────────

export interface IConfigManager {
  /**
   * Assembles, validates, and caches the configuration.
   * Idempotent — returns the cached config on subsequent calls.
   */
  load(): Promise<Readonly<AppConfig>>;

  /**
   * Returns the cached configuration.
   * Throws ConfigurationError if load() has not been called yet.
   */
  get(): Readonly<AppConfig>;

  /**
   * Clears the cache and reloads from scratch.
   * Use when a live config change needs to be picked up at runtime.
   */
  reload(): Promise<Readonly<AppConfig>>;

  /** Returns true once load() has completed at least once successfully. */
  isLoaded(): boolean;
}

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * ConfigManager is the single point of authority for all platform configuration.
 *
 * Loading order (later layers override earlier ones):
 *   1. Static defaults (default-config.ts)
 *   2. Async provider overrides (optional, e.g. remote config service)
 *   3. ACC_* environment variable overrides (environment.ts)
 *
 * After assembly the config is validated and frozen. Call load() once during
 * bootstrapPlatform() and then get() everywhere else.
 */
export class ConfigManager implements IConfigManager {
  private cache: Readonly<AppConfig> | null = null;
  private readonly validator: ConfigValidator;

  constructor(
    private readonly logger: ILogger,
    private readonly provider?: IConfigProvider
  ) {
    this.validator = new ConfigValidator();
  }

  async load(): Promise<Readonly<AppConfig>> {
    if (this.cache !== null) {
      this.logger.debug('ConfigManager: returning cached configuration');
      return this.cache;
    }
    return this.assemble();
  }

  get(): Readonly<AppConfig> {
    if (this.cache === null) {
      throw new ConfigurationError(
        'Configuration has not been loaded. Call load() before get().',
        { hint: 'Ensure bootstrapPlatform() has completed before accessing platform configuration.' }
      );
    }
    return this.cache;
  }

  async reload(): Promise<Readonly<AppConfig>> {
    this.logger.info('ConfigManager: reloading configuration');
    this.cache = null;
    return this.assemble();
  }

  isLoaded(): boolean {
    return this.cache !== null;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async assemble(): Promise<Readonly<AppConfig>> {
    this.logger.debug('ConfigManager: assembling configuration…');

    // Layer 1 — static defaults
    let config: AppConfig = this.shallowClone(DEFAULT_CONFIG);
    this.logger.debug('ConfigManager: static defaults applied');

    // Layer 2 — async provider (optional)
    if (this.provider !== undefined) {
      this.logger.debug('ConfigManager: applying config provider overrides…');
      let overrides: Partial<AppConfig>;
      try {
        overrides = await this.provider.load();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new ConfigurationError('Config provider failed to load', { originalMessage: msg });
      }
      config = this.mergePartial(config, overrides);
      this.logger.debug('ConfigManager: config provider overrides applied');
    }

    // Layer 3 — environment variable overrides
    config = applyEnvironmentOverrides(config);
    this.logger.debug('ConfigManager: environment variable overrides applied');

    // Validate
    this.validator.assertValid(config);
    this.logger.debug('ConfigManager: validation passed');

    // Freeze and cache
    const frozen = Object.freeze(config);
    this.cache = frozen;

    this.logger.info('ConfigManager: configuration loaded', {
      platformName:    config.platform.name,
      version:         config.platform.version,
      environment:     config.platform.environment,
      storageProvider: config.storage.provider,
      logLevel:        config.logging.level,
      configSource:    config.build.configSource,
    });

    return frozen;
  }

  /**
   * Shallow-clones the top-level AppConfig so environment.ts can safely
   * spread each group into a new object without touching DEFAULT_CONFIG.
   */
  private shallowClone(source: Readonly<AppConfig>): AppConfig {
    return {
      platform:       { ...source.platform },
      security:       { ...source.security },
      storage:        { ...source.storage },
      logging:        { ...source.logging },
      features:       { ...source.features },
      runtime:        { ...source.runtime },
      build:          { ...source.build },
      moduleDefaults: { ...source.moduleDefaults },
    };
  }

  /**
   * Merges a Partial<AppConfig> on top of a full AppConfig, group by group.
   * Only defined groups in the override are merged; the rest pass through.
   */
  private mergePartial(base: AppConfig, overrides: Partial<AppConfig>): AppConfig {
    return {
      platform:       overrides.platform       ? { ...base.platform,       ...overrides.platform       } : base.platform,
      security:       overrides.security       ? { ...base.security,       ...overrides.security       } : base.security,
      storage:        overrides.storage        ? { ...base.storage,        ...overrides.storage        } : base.storage,
      logging:        overrides.logging        ? { ...base.logging,        ...overrides.logging        } : base.logging,
      features:       overrides.features       ? { ...base.features,       ...overrides.features       } : base.features,
      runtime:        overrides.runtime        ? { ...base.runtime,        ...overrides.runtime        } : base.runtime,
      build:          overrides.build          ? { ...base.build,          ...overrides.build          } : base.build,
      moduleDefaults: overrides.moduleDefaults ? { ...base.moduleDefaults, ...overrides.moduleDefaults } : base.moduleDefaults,
    };
  }
}
