// platform/services/src/authz/permission-service.ts
// In-memory PermissionService — Phase 1B Authorization Domain foundation.
//
// Design:
//  - UserRole (auth layer: 'platform.admin', 'contractor.engineer', …) is
//    mapped to AppRole (authz layer: 'AppOwner', 'Engineer', …) before
//    permission expansion.  The two role vocabularies are intentionally
//    separated so the auth provider can change without touching authz policy.
//  - Effective permissions are derived by unioning all role-based grants;
//    the most permissive role wins (additive model).
//  - Contractor isolation is enforced on every hasPermission call.  Only
//    AppOwner users may satisfy 'all'-scoped or cross-contractor requests.
//  - Suspended / archived users are denied all permissions when an optional
//    IUserService is provided for status lookup.  Without it the service
//    trusts that only active sessions reach this layer.
//  - Deny-path events are audited.  Successful read checks are not recorded
//    to avoid flooding the audit trail on the hot path.
//
// Service id: platform.permissions
// TODO: Phase N — invalidate(userId): void — evict cached permission set on
//       role change once a real cache (e.g. Map keyed by UserId) is introduced.

import type { UserContext } from '../auth/auth-types';
import type { IAuditService } from '../audit/audit-types';
import type { IUserService } from '../user/user-types';
import type {
  AppRole,
  ContractorScope,
  ModuleId,
  ActionType,
  PermissionEntry,
  PermissionRequest,
  IPermissionService,
} from './authz-types';
import { KNOWN_MODULES, KNOWN_ACTIONS } from './authz-types';

// ── Role permission rules ──────────────────────────────────────────────────────

type RoleRule = {
  /** Actions granted by this role across all modules. */
  readonly actions: readonly ActionType[];
  /**
   * 'own'  — permission scoped to the user's own ContractorId.
   * 'all'  — cross-contractor permission (AppOwner only).
   */
  readonly contractorScope: 'own' | 'all';
};

/**
 * Canonical authz grants per AppRole.
 *
 * All known modules are covered by every role; action sets differentiate
 * authority levels.  Unknown or future roles produce no grants.
 */
const ROLE_RULES: Readonly<Partial<Record<string, RoleRule>>> = {
  AppOwner: {
    actions: [...KNOWN_ACTIONS],
    contractorScope: 'all',
  },
  Manager: {
    actions: ['read', 'create', 'update', 'delete', 'approve', 'export'],
    contractorScope: 'own',
  },
  Engineer: {
    actions: ['read', 'create', 'update', 'export'],
    contractorScope: 'own',
  },
  ContractorManager: {
    actions: ['read', 'create', 'update', 'delete'],
    contractorScope: 'own',
  },
  ContractorEngineer: {
    actions: ['read', 'create', 'update'],
    contractorScope: 'own',
  },
  Viewer: {
    actions: ['read'],
    contractorScope: 'own',
  },
} as const;

// ── UserRole → AppRole bridge ──────────────────────────────────────────────────

/**
 * Maps an auth-layer {@link UserRole} literal to the corresponding authz-layer
 * {@link AppRole}.  Returns `null` for unrecognised strings so they are
 * silently dropped; the auth provider may carry roles the authz layer does
 * not yet know about.
 */
function mapUserRoleToAppRole(role: string): AppRole | null {
  switch (role) {
    case 'platform.admin':        return 'AppOwner';
    case 'platform.viewer':       return 'Viewer';
    case 'contractor.admin':      return 'ContractorManager';
    case 'contractor.engineer':   return 'ContractorEngineer';
    case 'contractor.technician': return 'Engineer';
    case 'contractor.viewer':     return 'Viewer';
    default:                      return null;
  }
}

// ── PermissionService ─────────────────────────────────────────────────────────

/**
 * In-memory implementation of {@link IPermissionService}.
 *
 * Constructor:
 * @param auditService  Required for deny-path audit recording.
 * @param userService   Optional.  When provided, `findById` is called to check
 *                      `UserRecord.status`; suspended or archived accounts are
 *                      denied all permissions regardless of their role set.
 *                      Omit if user lifecycle enforcement happens upstream (e.g.
 *                      at the auth boundary or session layer).
 *
 * Registered at service id `platform.permissions` by the SDK bootstrap.
 */
export class PermissionService implements IPermissionService {
  constructor(
    private readonly auditService: IAuditService,
    private readonly userService?: Pick<IUserService, 'findById'>,
  ) {}

  // ── IPermissionService ────────────────────────────────────────────────────

  getRoles(user: UserContext): readonly AppRole[] {
    const seen = new Set<AppRole>();
    const result: AppRole[] = [];
    for (const role of user.roles) {
      const appRole = mapUserRoleToAppRole(role);
      if (appRole !== null && !seen.has(appRole)) {
        seen.add(appRole);
        result.push(appRole);
      }
    }
    return result;
  }

  hasRole(user: UserContext, role: AppRole): boolean {
    return this.getRoles(user).includes(role);
  }

  getGrantedPermissions(user: UserContext): readonly PermissionEntry[] {
    if (!this.isUserActive(user)) return [];

    const roles = this.getRoles(user);
    // Use a composite key to deduplicate identical entries produced by
    // multiple overlapping roles (e.g. Manager + Engineer both grant 'read').
    const index = new Map<string, PermissionEntry>();

    for (const appRole of roles) {
      const rule = ROLE_RULES[appRole];
      if (rule === undefined) continue;

      const scope: ContractorScope =
        rule.contractorScope === 'all' ? 'all' : user.contractorId;

      for (const moduleId of KNOWN_MODULES) {
        for (const action of rule.actions) {
          const key = `${moduleId}\x00${action}\x00${String(scope)}`;
          if (!index.has(key)) {
            index.set(key, { moduleId, action, contractorScope: scope });
          }
        }
      }
    }

    return Array.from(index.values());
  }

  hasPermission(user: UserContext, request: PermissionRequest): boolean {
    if (!this.isUserActive(user)) {
      this.recordDenial(user, request, 'user-inactive');
      return false;
    }

    const isAppOwner = this.hasRole(user, 'AppOwner');

    // 'all'-scoped requests are exclusively for AppOwner.
    if (request.contractorScope === 'all' && !isAppOwner) {
      this.recordDenial(user, request, 'cross-contractor-not-permitted');
      return false;
    }

    // Cross-contractor requests (specific other contractor) require AppOwner.
    if (
      request.contractorScope !== 'all' &&
      request.contractorScope !== user.contractorId &&
      !isAppOwner
    ) {
      this.recordDenial(user, request, 'contractor-scope-violation');
      return false;
    }

    const granted = this.getGrantedPermissions(user);
    const allowed = granted.some(
      (e) =>
        e.moduleId === request.moduleId &&
        e.action === request.action &&
        (e.contractorScope === 'all' || e.contractorScope === request.contractorScope),
    );

    if (!allowed) {
      this.recordDenial(user, request, 'insufficient-permissions');
    }

    return allowed;
  }

  canAccessModule(user: UserContext, moduleId: ModuleId): boolean {
    // Coarse module gate: any 'read' permission within the user's own scope.
    return this.hasPermission(user, {
      moduleId,
      action:          'read',
      contractorScope: user.contractorId,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Returns `true` when the user is allowed to proceed.
   *
   * When {@link userService} is not injected, the method returns `true`
   * unconditionally — status enforcement is assumed to happen at the session
   * or auth boundary upstream.
   */
  private isUserActive(user: UserContext): boolean {
    if (this.userService !== undefined) {
      const record = this.userService.findById(user.userId);
      if (record !== null && record.status !== 'active') {
        return false;
      }
    }
    return true;
  }

  /**
   * Records a single deny-path audit entry.
   *
   * Uses 'medium' severity — permission denials are security-relevant but
   * routine; 'high'/'critical' severities are reserved for confirmed breaches
   * or destructive operations (which require a mandatory reason string).
   *
   * Never throws: IAuditService.record() absorbs internal failures.
   */
  private recordDenial(
    user: UserContext,
    request: PermissionRequest,
    denyReason: string,
  ): void {
    this.auditService.record({
      category: 'security',
      action:   'deny',
      outcome:  'denied',
      severity: 'medium',
      actor: {
        userId:       user.userId,
        contractorId: user.contractorId,
      },
      resource: {
        module:     'owner-center',
        entityType: 'Permission',
        entityId:   `${request.moduleId}:${request.action}`,
      },
      reason: `Access denied — ${denyReason}`,
      metadata: {
        moduleId:        request.moduleId,
        action:          request.action,
        contractorScope: String(request.contractorScope),
        denyReason,
      },
    });
  }
}
