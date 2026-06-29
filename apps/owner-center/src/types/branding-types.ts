// apps/owner-center/src/types/branding-types.ts
// Branding model for the Owner Center shell.
//
// ACC branding is always present.
// Contractor branding is optional and rendered beneath the ACC logo.
// Push notification config is a placeholder foundation — no service worker yet.

// ── ACC platform brand ────────────────────────────────────────────────────────

/**
 * Static ACC platform branding shown in the top-left of the shell header.
 * Both fields are optional to support headless / embedded deployments.
 */
export interface AccBrandConfig {
  /** Path or URL to the ACC logo image. */
  readonly logoSrc?: string | undefined;
  /** Display name shown beside or below the logo. */
  readonly appName?: string | undefined;
}

// ── Contractor brand ──────────────────────────────────────────────────────────

/**
 * Contractor-specific branding rendered beneath the ACC logo.
 * Populated after authentication when the contractor profile is loaded.
 */
export interface ContractorBrandConfig {
  /** Path or URL to the contractor's own logo image. */
  readonly logoSrc?: string | undefined;
  /** Contractor's human-readable display name. */
  readonly displayName?: string | undefined;
}

// ── Combined branding config ──────────────────────────────────────────────────

/** Full branding configuration for the shell. */
export interface BrandingConfig {
  readonly acc: AccBrandConfig;
  /** Absent until the authenticated contractor's profile is loaded. */
  readonly contractor?: ContractorBrandConfig | undefined;
}

/** Default branding — ACC placeholder only, no contractor branding yet. */
export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  acc: {
    appName: 'Owner Center',
  },
} as const;

// ── Push notification foundation ──────────────────────────────────────────────

/**
 * Foundation placeholder for Web Push configuration.
 *
 * No service worker is registered yet.  This type captures the intended
 * shape so it can be wired when the push milestone is implemented.
 */
export interface PushNotificationConfig {
  /** Whether push notifications are enabled for this session. */
  readonly isEnabled: boolean;
  /** VAPID public key provided by the backend push service. */
  readonly vapidPublicKey?: string | undefined;
}

/** Default push config — disabled until service worker milestone. */
export const DEFAULT_PUSH_CONFIG: PushNotificationConfig = {
  isEnabled: false,
} as const;
