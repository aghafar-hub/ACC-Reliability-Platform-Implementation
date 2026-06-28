// backend/src/index.ts
// Public API surface for @acc-reliability/backend.
//
// Only types and interfaces that transport adapters, middleware, and the
// Apps Script entry point legitimately consume are exported here.

// ── Wire envelopes ────────────────────────────────────────────────────────────
export type {
  BackendTokenAuthContext,
  BackendSessionAuthContext,
  BackendAuthContext,
  BackendRequestEnvelope,
  BackendErrorDetail,
  BackendResponseEnvelope,
} from './backend-envelope-types';

// ── Backend context ───────────────────────────────────────────────────────────
export type {
  BackendRuntimeKind,
  BackendContext,
} from './backend-context';

// ── Route dispatch ────────────────────────────────────────────────────────────
export type {
  IEnvelopeMapper,
  IResponseMapper,
  IRouteDispatcher,
} from './backend-dispatch';

// ── Auth / permission middleware ────────────────────────────────────────────────
export type {
  AuthSessionResult,
  PermissionResult,
  IAuthSessionMiddleware,
  IPermissionMiddleware,
} from './backend-auth-middleware';

// ── GAS doPost adapter ────────────────────────────────────────────────────────
export type {
  GasPostEvent,
  GasPostOutput,
  IGasDoPostAdapter,
  IGasDoPostHandler,
} from './gas-do-post-adapter';

// ── Errors ────────────────────────────────────────────────────────────────────
export {
  BackendError,
  EnvelopeValidationError,
  BackendAuthError,
  BackendDispatchError,
} from './backend-errors';
