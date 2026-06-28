// platform/sdk/src/module/module-manifest.ts
// Module registration descriptor for the ACC Reliability Platform.
//
// Every business module must supply a ModuleManifest when registering with
// the platform (PS-114 §16).  The Module Manager validates version
// compatibility and dependency availability before allowing the module to start.

/**
 * Static descriptor a business module provides at registration time.
 *
 * The Module Manager reads this manifest during platform startup to:
 *  - Validate SDK and platform version compatibility (PS-114 §18).
 *  - Resolve and load declared dependencies in correct order.
 *  - Register the module in the Module Registry.
 *  - Determine the module's classification for access control purposes.
 *
 * A manifest must be a plain object literal — no runtime dependencies,
 * no class instances.  It is safe to serialize to JSON.
 */
export interface ModuleManifest {
  /**
   * Stable module identifier.  Must be unique across the platform.
   * Use kebab-case (e.g. `'oil-lubrication'`, `'vibration-analysis'`).
   *
   * This value is used as the primary key in the Module Registry and in
   * permission checks; changing it after deployment is a breaking change.
   */
  readonly moduleId: string;

  /** Human-readable name displayed in the platform shell and admin UI. */
  readonly displayName: string;

  /** Semantic version string of this module release (e.g. `'1.0.0'`). */
  readonly version: string;

  /**
   * Minimum platform kernel version required by this module.
   * The Module Manager rejects the module if the running platform version
   * is lower than this value.
   */
  readonly requiredPlatformVersion: string;

  /**
   * Minimum SDK version required by this module.
   * The Module Manager rejects the module if the running SDK version is
   * lower than this value.
   */
  readonly requiredSdkVersion: string;

  /**
   * Module identifiers this module depends on.
   *
   * The Module Manager ensures all declared dependencies are loaded and
   * healthy before this module is initialized.  Circular dependencies
   * are rejected at registration time.
   */
  readonly dependencies?: readonly string[] | undefined;

  /**
   * Optional free-text description displayed in the admin module catalog.
   */
  readonly description?: string | undefined;
}
