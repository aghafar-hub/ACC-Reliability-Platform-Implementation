// platform/sdk/src/sdk-context.ts
// Runtime context injected into every business module by the platform.
//
// SdkContext provides the module with the current user, the active contractor
// scope, and an optional correlation id for tracing.  Modules never construct
// this object; it is created and managed by the platform SDK runtime.

import type { UserContext } from '@acc-reliability/services';
import type { ContractorScopeFilter } from '@acc-reliability/storage';

/**
 * Immutable runtime context supplied to every business module.
 *
 * The platform creates a fresh `SdkContext` when the user session is
 * established and passes it to each module's initialization function.
 *
 * Design constraints:
 *  - `currentUser` is the authoritative user identity; modules must not cache
 *    or derive their own user state.
 *  - `scope` drives all storage isolation; modules must not perform contractor
 *    filtering themselves.
 *  - `correlationId` is optional; it is set when the module is invoked as part
 *    of a larger traced operation.  When absent, the SDK generates one for
 *    audit records originating from this module.
 */
export interface SdkContext {
  /**
   * Authenticated user for the current session.
   *
   * All permission checks and audit records are automatically associated
   * with this user.
   */
  readonly currentUser: UserContext;

  /**
   * Contractor scope determining data visibility for the current session.
   *
   *  - `GLOBAL`     — ACC AppOwner; cross-contractor data is visible.
   *  - `CONTRACTOR` — Single contractor; data is strictly isolated.
   *  - `DENY`       — No access; all storage and service calls are blocked.
   */
  readonly scope: ContractorScopeFilter;

  /**
   * Correlation id linking SDK operations to a broader traced business process.
   *
   * When present, audit records and log entries created by the module are
   * tagged with this id so the full operation chain can be reconstructed.
   */
  readonly correlationId?: string | undefined;
}
