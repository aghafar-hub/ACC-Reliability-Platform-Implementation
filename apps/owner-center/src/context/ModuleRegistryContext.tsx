// apps/owner-center/src/context/ModuleRegistryContext.tsx
// Dynamic Module Platform — React context and provider.
//
// ModuleRegistryProvider is the engine of the Dynamic Module Platform.
//
// On mount it:
//   1. Validates all registered manifests (duplicate IDs, missing fields, etc.).
//   2. Queries the Module Registry via sdk.modules for lifecycle status.
//   3. Filters to manifests whose lifecycle is 'enabled' or 'maintenance'.
//   4. Derives navigation items from filtered manifests.
//   5. Registers health checks for enabled modules that declare hasHealthCheck.
//   6. Logs validation errors to the console without crashing the app.
//
// The context value is fully memoized — stable references across renders.
//
// Sprint 03 — Dynamic Module Platform.

import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { UIModuleManifest, ManifestValidationError, ModuleNavItem } from '../types/module-registry-types';
import { validateManifests } from '../registry/manifest-validation';
import { usePlatformSdk } from './SdkContext';

// ── Lifecycle helpers ─────────────────────────────────────────────────────────

type ModuleLifecycleStatus = 'enabled' | 'maintenance' | 'disabled' | 'retired';

/**
 * Returns the current lifecycle status of a manifest from the Module Registry.
 * Falls back to `'enabled'` when no matching module record is found, so manifests
 * without a registry entry are treated as always-enabled.
 */
function resolveLifecycleStatus(
  sdk: ReturnType<typeof usePlatformSdk>,
  manifest: UIModuleManifest,
): ModuleLifecycleStatus {
  if (manifest.alwaysVisible) return 'enabled';
  const registryKey = manifest.lifecycleKey ?? manifest.moduleId;
  const record = sdk.modules.findByKey(registryKey);
  if (!record) return 'enabled';
  return record.status as ModuleLifecycleStatus;
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface ModuleRegistryContextValue {
  /**
   * All manifests after validation (invalid manifests excluded).
   * Includes disabled and retired modules — use {@link enabledManifests} for routing.
   */
  readonly allManifests: readonly UIModuleManifest[];

  /**
   * Manifests whose lifecycle status is `'enabled'` or `'maintenance'`.
   * AppRouter uses this set to register dynamic routes.
   */
  readonly enabledManifests: readonly UIModuleManifest[];

  /**
   * Navigation items derived from enabled manifests, in manifest array order.
   * AppSidebar uses this to render links without any further filtering for
   * lifecycle state (already applied).  Permission filtering is applied by
   * AppSidebar using {@link usePermissions}.
   */
  readonly navItems: readonly ModuleNavItem[];

  /** Validation errors detected during bootstrap.  Empty when all manifests are valid. */
  readonly validationErrors: readonly ManifestValidationError[];
}

const ModuleRegistryReactContext = createContext<ModuleRegistryContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface ModuleRegistryProviderProps {
  readonly children: ReactNode;
  readonly manifests: readonly UIModuleManifest[];
}

/**
 * Provides the Dynamic Module Platform to the application tree.
 *
 * Must be rendered after {@link SdkProvider} (SDK must be ready) and
 * before {@link AppRouter} and {@link AppLayout} (they consume the context).
 *
 * ```tsx
 * <SdkProvider>
 *   <ModuleRegistryProvider manifests={PLATFORM_MODULE_MANIFESTS}>
 *     <AppRouter />
 *   </ModuleRegistryProvider>
 * </SdkProvider>
 * ```
 */
export function ModuleRegistryProvider({
  children,
  manifests,
}: ModuleRegistryProviderProps): ReactElement {
  const sdk = usePlatformSdk();

  // ── Step 1: Validate manifests ───────────────────────────────────────────
  const validationResult = useMemo(
    () => validateManifests(manifests),
    [manifests],
  );

  // Exclude manifests with fatal errors (duplicate moduleId, missing required fields).
  const allManifests = useMemo((): readonly UIModuleManifest[] => {
    if (validationResult.valid) return manifests;
    const fatalInvalidIds = new Set(
      validationResult.errors
        .filter(e => e.field === 'moduleId' && e.message.startsWith('Duplicate'))
        .map(e => e.moduleId),
    );
    return manifests.filter(m => !fatalInvalidIds.has(m.moduleId));
  }, [manifests, validationResult]);

  // ── Step 2: Filter by lifecycle ──────────────────────────────────────────
  const enabledManifests = useMemo((): readonly UIModuleManifest[] =>
    allManifests.filter(m => {
      const status = resolveLifecycleStatus(sdk, m);
      return status === 'enabled' || status === 'maintenance';
    }),
    [allManifests, sdk],
  );

  // ── Step 3: Derive navigation items ─────────────────────────────────────
  const navItems = useMemo((): readonly ModuleNavItem[] =>
    enabledManifests
      .filter(m => m.routePath !== undefined && m.navigationLabel !== undefined)
      .map((m): ModuleNavItem => ({
        path:          m.routePath!,
        icon:          m.icon ?? 'package',
        label:         m.navigationLabel!,
        end:           m.navigationEnd,
        moduleId:      m.alwaysVisible ? undefined : m.moduleId,
        adminOnly:     m.adminOnly,
        badge:         m.navigationBadge,
        alwaysVisible: m.alwaysVisible ?? false,
        inMaintenance: resolveLifecycleStatus(sdk, m) === 'maintenance',
      })),
    [enabledManifests, sdk],
  );

  // ── Step 4: Register module health checks ────────────────────────────────
  useEffect(() => {
    for (const m of enabledManifests) {
      if (!m.hasHealthCheck || !m.moduleId) continue;

      const componentId  = `module.${m.moduleId}`;
      const displayName  = m.displayName;
      const registryKey  = m.lifecycleKey ?? m.moduleId;

      // Guard against double-registration on hot-reload.
      if (sdk.health.getStatus(componentId) !== null) continue;

      try {
        sdk.health.register({
          componentId,
          componentName: displayName,
          category:      'module',
          check: () => {
            const record = sdk.modules.findByKey(registryKey);
            if (!record) {
              return { status: 'warning', message: `Module '${displayName}' not found in registry.` };
            }

            type DerivedStatus = 'healthy' | 'warning' | 'degraded' | 'critical' | 'offline' | 'maintenance';

            const healthStatusMap: Record<string, DerivedStatus> = {
              healthy:  'healthy',
              degraded: 'degraded',
              offline:  'offline',
              unknown:  'warning',
            };

            const lifecycleStatusMap: Record<string, DerivedStatus> = {
              enabled:     'healthy',
              maintenance: 'maintenance',
              disabled:    'offline',
              retired:     'offline',
            };

            const derivedStatus: DerivedStatus =
              record.status === 'maintenance'
                ? lifecycleStatusMap.maintenance
                : (healthStatusMap[record.healthStatus] ?? 'warning');

            return {
              status:  derivedStatus,
              message: `${displayName}: lifecycle=${record.status}, health=${record.healthStatus}`,
              details: {
                version:         record.version,
                lifecycleStatus: record.status,
                healthStatus:    record.healthStatus,
              },
            };
          },
        });
      } catch {
        // Component already registered (e.g. strict-mode double-invoke).
        // This is safe to ignore.
      }
    }
  }, [enabledManifests, sdk]);

  // ── Step 5: Log validation errors ────────────────────────────────────────
  useEffect(() => {
    if (!validationResult.valid) {
      console.error(
        '[ModuleRegistry] Manifest validation errors detected:',
        validationResult.errors,
      );
    }
  }, [validationResult]);

  // ── Context value ─────────────────────────────────────────────────────────
  const value = useMemo(
    (): ModuleRegistryContextValue => ({
      allManifests,
      enabledManifests,
      navItems,
      validationErrors: validationResult.errors,
    }),
    [allManifests, enabledManifests, navItems, validationResult.errors],
  );

  return (
    <ModuleRegistryReactContext.Provider value={value}>
      {children}
    </ModuleRegistryReactContext.Provider>
  );
}

// ── Public hook ───────────────────────────────────────────────────────────────

/**
 * Returns the Dynamic Module Platform context.
 *
 * Must be called inside {@link ModuleRegistryProvider}.  Throws when called
 * outside so misconfiguration is surfaced immediately at development time.
 */
export function useModuleRegistry(): ModuleRegistryContextValue {
  const ctx = useContext(ModuleRegistryReactContext);
  if (ctx === null) {
    throw new Error('useModuleRegistry() must be called inside <ModuleRegistryProvider>.');
  }
  return ctx;
}
