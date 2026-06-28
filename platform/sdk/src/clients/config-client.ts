// platform/sdk/src/clients/config-client.ts
// SDK configuration/settings client interface.
//
// Business modules retrieve platform and module configuration exclusively
// through this client (PS-114 §7).  Modules must not read configuration
// storage directly or hardcode values that can be driven by configuration.

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
}
