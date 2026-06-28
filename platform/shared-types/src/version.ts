// platform/shared-types/src/version.ts
// Semantic version primitives for the ACC Reliability Platform.
//
// Used by the SDK module registration contract (PS-114 §18): every business
// module must declare the required SDK and platform version at registration.

/** Branded string representing a semantic version (e.g. "1.0.0"). */
export type SemVer = string & { readonly __brand: 'SemVer' };

/**
 * Creates a {@link SemVer} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createSemVer(value: string): SemVer {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('SemVer cannot be empty');
  return trimmed as SemVer;
}

/**
 * Version compatibility requirement declared by a business module at
 * registration time.  The Module Manager validates these before allowing
 * a module to start (PS-114 §18).
 */
export interface PlatformVersion {
  /** Minimum required platform kernel version. */
  readonly platform: SemVer;
  /** Minimum required SDK version. */
  readonly sdk: SemVer;
}
