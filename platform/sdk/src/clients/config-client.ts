// platform/sdk/src/clients/config-client.ts
// SDK configuration/settings client interface.
//
// Business modules retrieve platform and module configuration exclusively
// through this client (PS-114 §7).  Modules must not read configuration
// storage directly or hardcode values that can be driven by configuration.

/** Primitive data types exposed for configuration entries. */
export type ConfigDataType = 'string' | 'number' | 'boolean';

/**
 * A single flattened configuration entry with metadata for display and comparison.
 */
export interface ConfigEntry {
  /** Fully-qualified dotted key (e.g. `'platform.name'`). */
  readonly key: string;
  /** Top-level configuration group (first path segment). */
  readonly group: string;
  /** Current resolved value from the loaded configuration. */
  readonly currentValue: string | number | boolean;
  /** Static default value when available; `undefined` for keys without defaults. */
  readonly defaultValue: string | number | boolean | undefined;
  /** Whether the current value differs from the static default. */
  readonly isModified: boolean;
  /** Runtime data type of the value. */
  readonly dataType: ConfigDataType;
  /** Whether the configuration layer supports in-place updates for this key. */
  readonly editable: boolean;
}

/**
 * Aggregate counts for the platform configuration overview.
 */
export interface ConfigSummary {
  /** Total number of flattened configuration keys. */
  readonly totalKeys: number;
  /** Keys whose current value differs from the static default. */
  readonly modifiedCount: number;
  /** Keys whose current value matches the static default. */
  readonly defaultCount: number;
  /** Number of distinct top-level configuration groups. */
  readonly groupCount: number;
}

/**
 * SDK configuration client.
 *
 * Provides read access to platform settings and module-specific configuration.
 * All configuration is pre-loaded by the platform at startup and served from
 * the Settings Service cache; modules do not trigger storage reads per call.
 *
 * Covered configuration examples (PS-114 §7):
 *  - Refresh intervals
 *  - Default threshold values
 *  - Feature configuration
 *  - Localization settings
 *  - Theme configuration
 *  - Module-specific operational defaults
 */
export interface IConfigClient {
  /**
   * Returns the value for `key`, cast to type `T`, or `undefined` when the
   * key is not present in the configuration store.
   *
   * @typeParam T Expected value type.  The caller is responsible for
   *   supplying the correct type; no runtime type check is performed.
   * @param key Fully-qualified setting key (e.g. `'platform.session.timeoutMs'`,
   *   `'oil-lubrication.refreshIntervalMs'`).
   */
  getSetting<T>(key: string): T | undefined;

  /**
   * Returns all settings whose keys start with `prefix`, as a flat
   * `Record<string, unknown>`.
   *
   * When `prefix` is omitted or empty, all available settings are returned.
   * Keys in the returned map are the full key strings (not stripped of the prefix).
   *
   * @param prefix Optional key prefix to filter results.
   */
  getSettings(prefix?: string): Record<string, unknown>;

  /**
   * Returns all flattened configuration entries with metadata for display.
   * Read-only — no audit records are created.
   */
  listEntries(): readonly ConfigEntry[];

  /**
   * Returns aggregate configuration counts for summary cards.
   * Read-only — no audit records are created.
   */
  getSummary(): ConfigSummary;

  /**
   * Reloads configuration from defaults, provider, and environment overrides.
   * Read-only refresh — no audit records are created.
   */
  reload(): Promise<void>;
}
