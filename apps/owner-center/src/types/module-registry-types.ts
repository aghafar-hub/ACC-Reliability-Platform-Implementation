// apps/owner-center/src/types/module-registry-types.ts
// Owner Center shell manifest types for the Dynamic Module Platform.
//
// UIModuleManifest extends the platform SDK ModuleManifest with:
//  - A React lazy component reference for the module's page.
//  - Shell-specific display flags (alwaysVisible, navigationEnd).
//
// All component references must be created at module level with React.lazy()
// to guarantee stable lazy instances and correct code splitting.
//
// Sprint 03 — Dynamic Module Platform.

import type { ComponentType, LazyExoticComponent } from 'react';
import type { ModuleManifest } from '@acc-reliability/sdk';

// ── UIModuleManifest ──────────────────────────────────────────────────────────

/**
 * Owner Center shell manifest descriptor.
 *
 * Extends {@link ModuleManifest} with a React component reference and
 * shell-specific flags.
 *
 * Business modules export one `UIModuleManifest` and include it in the
 * `PLATFORM_MODULE_MANIFESTS` array in `platform-manifests.ts`.  No
 * modifications to AppRouter or AppLayout are required — the platform shell
 * reads manifests and generates routes and navigation automatically.
 *
 * @example
 * ```ts
 * export const MY_MODULE_MANIFEST: UIModuleManifest = {
 *   moduleId:        'my-module',
 *   displayName:     'My Module',
 *   version:         '1.0.0',
 *   requiredPlatformVersion: '0.1.0',
 *   requiredSdkVersion:      '0.1.0',
 *   icon:            'package',
 *   category:        'Operations',
 *   routePath:       '/my-module',
 *   navigationLabel: { en: 'My Module', ar: 'وحدتي' },
 *   lifecycleKey:    'my-module',
 *   component:       React.lazy(() => import('./pages/MyModulePage')),
 * };
 * ```
 */
export interface UIModuleManifest extends ModuleManifest {
  /**
   * React lazy-loaded component for the module's primary page.
   *
   * Must be created at module level:
   * ```ts
   * const MyPage = React.lazy(() => import('./MyPage'));
   * ```
   * This ensures the lazy component is stable (not recreated on re-render)
   * and that the bundle is code-split into a separate chunk.
   *
   * Omit for entries that only contribute navigation without a dedicated
   * page component (e.g. the Home sentinel entry).
   */
  readonly component?: LazyExoticComponent<ComponentType<object>> | undefined;

  /**
   * When `true`, this navigation entry is always visible regardless of
   * the authenticated user's permissions or the module's lifecycle state
   * in the Module Registry.
   *
   * Use for platform-level items that require no permission check:
   * Home, Notifications, Learning Center, Settings.
   */
  readonly alwaysVisible?: boolean | undefined;

  /**
   * Maps to the React Router `<NavLink end>` prop.
   * Set to `true` for the Home route (`/`) so the Home link is only
   * active when the path is exactly `/`, not on nested routes.
   */
  readonly navigationEnd?: boolean | undefined;
}

// ── Validation types ──────────────────────────────────────────────────────────

/**
 * A single manifest validation failure detected during bootstrap.
 */
export interface ManifestValidationError {
  /** The `moduleId` of the manifest that triggered the error. */
  readonly moduleId: string;
  /** The specific manifest field that is invalid or missing. */
  readonly field: string;
  /** Human-readable description of the validation failure. */
  readonly message: string;
}

/**
 * Result returned by {@link validateManifests}.
 */
export interface ManifestValidationResult {
  /** `true` when no errors were found. */
  readonly valid: boolean;
  /** All detected errors, in detection order. */
  readonly errors: readonly ManifestValidationError[];
}

// ── Derived navigation item ───────────────────────────────────────────────────

/**
 * Navigation item derived from a {@link UIModuleManifest} by the
 * {@link ModuleRegistryContext}.
 *
 * Consumed by `AppSidebar` to render the navigation links.  Replacing
 * the former static `RouteMetadata` entries in `NAV_ITEMS`.
 */
export interface ModuleNavItem {
  /** Route path, e.g. `'/oil-lubrication'`. */
  readonly path: string;
  /** Icon identifier for {@link NavIcon}. */
  readonly icon: string;
  /** Bilingual navigation label. */
  readonly label: { readonly en: string; readonly ar: string };
  /** When `true`, the NavLink is only active on exact path match. */
  readonly end?: boolean;
  /**
   * Platform module id for permission checks.
   * `undefined` for always-visible platform items (no permission required).
   */
  readonly moduleId?: string;
  /** When `true`, requires Owner Center admin access to view. */
  readonly adminOnly?: boolean;
  /** Optional visual badge on the nav entry. */
  readonly badge?: 'notification';
  /** When `true`, skips lifecycle and permission filtering. */
  readonly alwaysVisible: boolean;
  /** When `true`, the module is in maintenance mode (drives optional CSS class). */
  readonly inMaintenance: boolean;
}
