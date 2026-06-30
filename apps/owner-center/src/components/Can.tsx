// apps/owner-center/src/components/Can.tsx
// Reusable component-level authorization helpers for the Owner Center shell.
//
// Design constraints (Sprint 02):
//  - Every permission decision delegates to sdk.permissions — no role comparisons.
//  - `global` prop controls contractorScope:
//      true  → 'all'              (platform-administration operations; AppOwner only)
//      false → currentUser.contractorId  (business-module operations; role-based)
//  - Hidden by default when unauthorized; pass `fallback` to render a disabled
//    alternative instead.
//  - All checks are memoized on their deps to avoid redundant re-evaluations.

import React, { useMemo } from 'react';
import type { ModuleId, ActionType, ContractorScope } from '@acc-reliability/sdk';
import { useAuth } from '../context/AuthContext';
import { usePlatformSdk } from '../context/SdkContext';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CanProps {
  /** Platform module the action is performed against. */
  readonly moduleId: ModuleId;

  /** Action to authorise (read | create | update | delete | approve | export | …). */
  readonly action: ActionType;

  /**
   * Contractor scope for the permission check.
   *
   *  true  — `contractorScope:'all'`; used for platform-administration
   *           operations that span all contractors.  Only AppOwner passes.
   *  false — `contractorScope:currentUser.contractorId` (default).
   */
  readonly global?: boolean;

  /** Content rendered when the user is authorised. */
  readonly children: React.ReactNode;

  /**
   * Content rendered when the user is NOT authorised.
   * Omit (or pass `null`) to hide entirely.
   * Pass a disabled button to provide a contextual explanation.
   */
  readonly fallback?: React.ReactNode;
}

// ── Core component ────────────────────────────────────────────────────────────

/**
 * Conditionally renders `children` when the current user holds the required
 * permission; renders `fallback` (default: nothing) otherwise.
 *
 * All permission evaluation is synchronous and flows through the Platform SDK.
 * No role names are compared directly.
 *
 * @example Hide a delete button for non-AppOwner users:
 * ```tsx
 * <Can moduleId="users-roles" action="delete" global>
 *   <button onClick={handleDelete}>Delete User</button>
 * </Can>
 * ```
 *
 * @example Disable a create button with an explanation:
 * ```tsx
 * <CanCreate
 *   moduleId="oil-lubrication"
 *   fallback={<button disabled title="Insufficient permissions">Add Record</button>}
 * >
 *   <button onClick={handleCreate}>Add Record</button>
 * </CanCreate>
 * ```
 */
export function Can({
  moduleId,
  action,
  global: isGlobal = false,
  children,
  fallback = null,
}: CanProps): React.ReactElement {
  const sdk         = usePlatformSdk();
  const { status }  = useAuth();

  const allowed = useMemo((): boolean => {
    if (status !== 'authenticated') return false;

    const contractorScope: ContractorScope = isGlobal
      ? 'all'
      : sdk.context.currentUser.contractorId;

    return sdk.permissions.hasPermission({ moduleId, action, contractorScope });
  }, [sdk, status, moduleId, action, isGlobal]);

  return <>{allowed ? children : fallback}</>;
}

// ── Specialised action helpers ────────────────────────────────────────────────

/** Short-hand props — action is fixed; all other CanProps still apply. */
export type CanActionProps = Omit<CanProps, 'action'>;

/** Renders children when the user may **read** the given module. */
export function CanView(props: CanActionProps): React.ReactElement {
  return <Can {...props} action="read" />;
}

/** Renders children when the user may **create** in the given module. */
export function CanCreate(props: CanActionProps): React.ReactElement {
  return <Can {...props} action="create" />;
}

/** Renders children when the user may **update** in the given module. */
export function CanUpdate(props: CanActionProps): React.ReactElement {
  return <Can {...props} action="update" />;
}

/** Renders children when the user may **delete** in the given module. */
export function CanDelete(props: CanActionProps): React.ReactElement {
  return <Can {...props} action="delete" />;
}

/** Renders children when the user may **approve** in the given module. */
export function CanApprove(props: CanActionProps): React.ReactElement {
  return <Can {...props} action="approve" />;
}

/** Renders children when the user may **export** from the given module. */
export function CanExport(props: CanActionProps): React.ReactElement {
  return <Can {...props} action="export" />;
}
