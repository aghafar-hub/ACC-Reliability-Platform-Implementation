// apps/owner-center/src/registry/manifest-validation.ts
// Manifest validation for the Dynamic Module Platform.
//
// Validates a collection of UIModuleManifest instances, checking for:
//   - Missing required fields (moduleId, displayName, version)
//   - Duplicate module IDs
//   - Duplicate route paths
//   - Duplicate navigation paths (routePath + navigationLabel conflict)
//   - Navigation declared without a routePath
//   - Duplicate lifecycleKey references
//
// The validator is non-throwing: it collects all errors and returns them
// together so operators see the full problem set in one pass.
//
// Sprint 03 — Dynamic Module Platform.

import type {
  UIModuleManifest,
  ManifestValidationError,
  ManifestValidationResult,
} from '../types/module-registry-types';

/**
 * Validates a collection of module manifests for the Dynamic Module Platform.
 *
 * Call once during {@link ModuleRegistryProvider} mount, before generating
 * routes or navigation.  Manifests that fail required-field or duplicate-id
 * checks are excluded from the registry; all other errors are reported but
 * do not remove the manifest.
 *
 * The application continues with the valid subset — validation failures are
 * non-fatal so a single bad manifest does not take down the whole shell.
 *
 * @param manifests All manifests to validate, including always-visible entries.
 * @returns A {@link ManifestValidationResult} describing every error found.
 */
export function validateManifests(
  manifests: readonly UIModuleManifest[],
): ManifestValidationResult {
  const errors: ManifestValidationError[] = [];

  const seenModuleIds     = new Map<string, number>();  // moduleId   → array index
  const seenRoutePaths    = new Map<string, string>();   // path       → moduleId
  const seenNavPaths      = new Map<string, string>();   // path       → moduleId (nav)
  const seenLifecycleKeys = new Map<string, string>();   // key        → moduleId

  manifests.forEach((m, index) => {
    const mid = (m.moduleId ?? '').trim();

    // ── Required: moduleId ────────────────────────────────────────────────
    if (mid.length === 0) {
      errors.push({
        moduleId: `(manifest[${index}])`,
        field:    'moduleId',
        message:  `Manifest at index ${index} has no moduleId.`,
      });
      return; // Cannot continue checks without an id
    }

    // ── Required: displayName ─────────────────────────────────────────────
    if (!m.displayName || m.displayName.trim().length === 0) {
      errors.push({
        moduleId: mid,
        field:    'displayName',
        message:  `Module '${mid}' is missing a displayName.`,
      });
    }

    // ── Required: version ─────────────────────────────────────────────────
    if (!m.version || m.version.trim().length === 0) {
      errors.push({
        moduleId: mid,
        field:    'version',
        message:  `Module '${mid}' is missing a version string.`,
      });
    }

    // ── Duplicate moduleId ────────────────────────────────────────────────
    const prevIndex = seenModuleIds.get(mid);
    if (prevIndex !== undefined) {
      errors.push({
        moduleId: mid,
        field:    'moduleId',
        message:  `Duplicate moduleId '${mid}' at index ${index} (first at index ${prevIndex}).`,
      });
    } else {
      seenModuleIds.set(mid, index);
    }

    // ── Duplicate routePath ───────────────────────────────────────────────
    if (m.routePath) {
      const existingMid = seenRoutePaths.get(m.routePath);
      if (existingMid !== undefined) {
        errors.push({
          moduleId: mid,
          field:    'routePath',
          message:  `Duplicate routePath '${m.routePath}' — already declared by '${existingMid}'.`,
        });
      } else {
        seenRoutePaths.set(m.routePath, mid);
      }
    }

    // ── Navigation requires routePath ─────────────────────────────────────
    if (m.navigationLabel && !m.routePath) {
      errors.push({
        moduleId: mid,
        field:    'routePath',
        message:  `Module '${mid}' declares a navigationLabel but has no routePath.`,
      });
    }

    // ── Duplicate navigation paths ────────────────────────────────────────
    if (m.routePath && m.navigationLabel) {
      const existingMid = seenNavPaths.get(m.routePath);
      if (existingMid !== undefined) {
        errors.push({
          moduleId: mid,
          field:    'navigationLabel',
          message:  `Duplicate navigation entry for path '${m.routePath}' — already declared by '${existingMid}'.`,
        });
      } else {
        seenNavPaths.set(m.routePath, mid);
      }
    }

    // ── Duplicate lifecycleKey (module-registry-backed entries only) ──────
    if (m.lifecycleKey && !m.alwaysVisible) {
      const existingMid = seenLifecycleKeys.get(m.lifecycleKey);
      if (existingMid !== undefined) {
        errors.push({
          moduleId: mid,
          field:    'lifecycleKey',
          message:  `Duplicate lifecycleKey '${m.lifecycleKey}' — already used by '${existingMid}'.`,
        });
      } else {
        seenLifecycleKeys.set(m.lifecycleKey, mid);
      }
    }

    // ── Health check requires moduleId (already guaranteed above) ─────────
    // Retained as a guard for future callers that bypass the id check.
    if (m.hasHealthCheck && mid.length === 0) {
      errors.push({
        moduleId: mid,
        field:    'hasHealthCheck',
        message:  `Module at index ${index} declares hasHealthCheck but has no moduleId.`,
      });
    }
  });

  return {
    valid:  errors.length === 0,
    errors: Object.freeze(errors),
  };
}
