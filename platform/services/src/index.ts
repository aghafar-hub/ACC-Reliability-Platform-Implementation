// platform/services/src/index.ts
// Public API surface for @acc-reliability/services
//
// Only types and interfaces that business modules legitimately consume are
// exported here.  Internal implementation details remain private.

// ── Authentication — Types ────────────────────────────────────────────────────
export type {
  ContractorId,
  UserId,
  SessionId,
  KnownContractorCode,
  UserRole,
  UserContext,
  SessionInfo,
  AuthCredentials,
  PasswordCredentials,
  TokenCredentials,
  IAuthService,
} from './auth/auth-types';

export {
  KNOWN_CONTRACTORS,
  createContractorId,
  createUserId,
  createSessionId,
} from './auth/auth-types';

// ── Authorization — Types ─────────────────────────────────────────────────────
export type {
  AppRole,
  KnownAppRole,
  ContractorScope,
  ModuleId,
  KnownModuleId,
  ActionType,
  KnownActionType,
  PermissionEntry,
  PermissionRequest,
  IPermissionService,
} from './authz/authz-types';

export {
  PLATFORM_ROLES,
  KNOWN_MODULES,
  KNOWN_ACTIONS,
} from './authz/authz-types';

// ── Errors ────────────────────────────────────────────────────────────────────
export {
  AuthError,
  AuthenticationError,
  SessionExpiredError,
  AuthorizationError,
  PermissionDeniedError,
} from './errors';
