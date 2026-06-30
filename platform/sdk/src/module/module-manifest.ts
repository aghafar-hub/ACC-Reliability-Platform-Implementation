// platform/sdk/src/module/module-manifest.ts
// Module registration descriptor for the ACC Reliability Platform.
//
// Every business module must supply a ModuleManifest when registering with
// the platform (PS-114 §16).  The Module Manager validates version
// compatibility and dependency availability before allowing the module to start.
//
// Sprint 03: Extended with navigation, route, health, settings, and lifecycle
// declarations so the platform shell can generate dynamic routes and navigation
// from registered manifests without manual AppRouter or AppLayout edits.

/**
 * Static descriptor a business module provides at registration time.
 *
 * The Module Manager reads this manifest during platform startup to:
 *  - Validate SDK and platform version compatibility (PS-114 §18).
 *  - Resolve and load declared dependencies in correct order.
 *  - Register the module in the Module Registry.
 *  - Determine the module's classification for access control purposes.
 *  - Generate dynamic routes and navigation without AppRouter/AppLayout edits.
 *
 * A manifest must be a plain object literal — no runtime dependencies,
 * no class instances.  It is safe to serialize to JSON.
 */
export interface ModuleManifest {
  // ── Identity ──────────────────────────────────────────────────────────────

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

  // ── Classification ────────────────────────────────────────────────────────

  /**
   * Icon identifier resolved by the platform shell's icon registry.
   * Maps to a {@link NavIcon} id (e.g. `'droplet'`, `'users'`, `'activity'`).
   */
  readonly icon?: string | undefined;

  /**
   * Module category for grouping in the admin catalog.
   * Common values: `'Core'`, `'Platform'`, `'Operations'`, `'Analytics'`.
   */
  readonly category?: string | undefined;

  // ── Navigation declaration ────────────────────────────────────────────────

  /**
   * Bilingual navigation label for the sidebar entry.
   * When omitted the module produces no navigation item.
   */
  readonly navigationLabel?: { readonly en: string; readonly ar: string } | undefined;

  /**
   * Optional badge shown on the navigation entry (e.g. unread-notification dot).
   */
  readonly navigationBadge?: 'notification' | undefined;

  // ── Route declaration ─────────────────────────────────────────────────────

  /**
   * Absolute path for the module's primary route (e.g. `'/oil-lubrication'`).
   * Leading slash is required.  When omitted the module contributes no route.
   */
  readonly routePath?: string | undefined;

  /**
   * When `true`, the route and navigation require Owner Center administration
   * access (`contractorScope:'all'`).  Only `AppOwner` users satisfy this.
   */
  readonly adminOnly?: boolean | undefined;

  // ── Platform capabilities ─────────────────────────────────────────────────

  /**
   * When `true`, the platform shell automatically registers a health check
   * component for this module derived from its Module Registry health status.
   * Only enabled and maintenance modules register health checks.
   */
  readonly hasHealthCheck?: boolean | undefined;

  /**
   * When `true`, this module exposes configuration settings that should
   * appear in the Platform Settings Center.
   */
  readonly hasSettings?: boolean | undefined;

  /**
   * Label for the module's section in the Platform Settings Center.
   * Defaults to `displayName` when omitted.
   */
  readonly settingsCategory?: string | undefined;

  // ── Registry alignment ────────────────────────────────────────────────────

  /**
   * The `moduleKey` used in the Module Registry for lifecycle state lookup.
   *
   * Set this when the manifest `moduleId` (permission check key) differs from
   * the Module Registry `moduleKey` (lifecycle key).
   *
   * Defaults to `moduleId` when omitted.
   *
   * @example
   * // Permission check uses 'users-roles'; registry entry uses 'user-management'
   * lifecycleKey: 'user-management'
   */
  readonly lifecycleKey?: string | undefined;
}
