# AI_MILESTONE_TRACKER.md

# ACC Reliability Platform — Milestone Tracker

Version: 1.7  
Last Updated: 2026-06-27  
Updated By: AI Agent (Milestone 4.7)

---

## How to Read This Document

Each milestone is one deliverable that compiles, passes type-check, and is independently reviewable. Milestones are numbered by phase (Phase.Milestone). Status values: `✅ Done` · `🔄 In Progress` · `⏳ Planned` · `🚫 Blocked`.

---

## Phase 1 — Platform Kernel

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 1.1 | Workspace setup (npm workspaces + Turborepo) | ✅ Done | 2026-06 | `package.json`, `turbo.json` |
| 3.1 | Kernel Bootstrap | ✅ Done | 2026-06 | PlatformContext, ServiceRegistry, ModuleRegistry, PlatformLogger, PlatformError |
| 3.2 | Platform Configuration Manager | ✅ Done | 2026-06-27 | 8-group AppConfig, ConfigManager, ConfigValidator, env overrides, feature flags |
| 3.3 | Service Registry Hardening | ✅ Done | 2026-06-27 | ServiceStatus, lifecycle timestamps, tryRegister, getRequired, setStatus, listByStatus, clear |
| 3.4 | Dependency Injection Container | ✅ Done | 2026-06-27 | Token<T>, Container (singleton/lazy-singleton/transient), circular-dep detection, ContainerError |
| 3.5 | Platform Event Bus Interfaces | ✅ Done | 2026-06-27 | EventToken<T>, IEventBus, IEventHandler<T>, EventSubscription, NullEventBus, EventBusError |
| 3.6 | Platform Lifecycle Manager | ✅ Done | 2026-06-27 | LifecycleManager, ILifecycleComponent, 9 lifecycle states, dependency-ordered init, graceful shutdown, restart, health transitions, LifecycleError |

---

## Phase 2 — Platform Services

> **Sequencing note:** Storage Abstraction Contracts (4.3) and Communication Contracts (4.4) are intentionally prioritised before any business-module migration work. All modules must consume platform abstractions; those contracts must be stable first.  
> **Event Bus:** A real in-process Event Bus implementation is a Future Phase item (Phase 9). Do not implement it in Phase 2. The `NullEventBus` registered in Phase 1 is the only event-bus artifact in scope for this phase.

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 4.1 | Authentication Contracts | ✅ Done | 2026-06-27 | ContractorId, UserId, SessionId (branded), UserContext, SessionInfo, AuthCredentials (discriminated union), IAuthService, AuthError/AuthenticationError/SessionExpiredError |
| 4.2 | Authorization and Permission Contracts | ✅ Done | 2026-06-27 | AppRole (6 roles), ContractorScope, ModuleId (5 modules), ActionType (7 actions), PermissionEntry, PermissionRequest, IPermissionService, AuthorizationError, PermissionDeniedError |
| 4.3 | Storage Abstraction Contracts | ✅ Done | 2026-06-27 | FilterExpression (field/composite), QueryOptions (filter+sort+page), PageRequest, PageResult, PagedQueryOptions, SortClause, Entity, IRepository<T>, ITransaction, IStorageProvider, StorageProviderConfig (5 providers), StorageHealthStatus, StorageError hierarchy (6 classes) |
| 4.4 | Communication Contracts | ✅ Done | 2026-06-27 | CorrelationId/MessageId/RequestId/EventId/TraceId/OperationId, EquipmentId, PlatformModule (9), MessageMetadata, PlatformEvent\<T\>/PlatformMessage\<T\>, 13 domain events, 2 command messages, AnyPlatformEvent union |
| 4.5 | Health Service | ✅ Done | 2026-06-27 | IHealthService, HealthService (in-memory), 6 health states, 5 categories, HealthCheckResult, HealthComponentStatus, HealthSummary, parallel checkAll, per-check timeout, HealthError hierarchy (3 classes) |
| 4.6 | Metrics Service | ✅ Done | 2026-06-27 | IMetricsService, MetricsService (in-memory), 6 metric kinds, 10 categories, MetricDefinition, MetricSample, MetricSnapshot, MetricSummary, startTimer, flush, reset/resetAll, MetricsError hierarchy (3 classes) |
| 4.7 | Notification Service | ✅ Done | 2026-06-27 | INotificationService, NotificationService (in-memory), 6 notification types, 3 channels, 6 statuses, NotificationRecipient (contractor-isolated), NotificationRecord, NotificationSummary, dismiss, pruneExpired, sendBatch, NotificationError hierarchy (3 classes) |
| 4.8 | Action Service | ⏳ Planned | — | IActionService, ActionRequest, ActionResult contracts |
| 4.9 | Audit Service | ⏳ Planned | — | IAuditService, AuditEntry, write-only audit trail contracts |
| 4.10 | Platform SDK | ⏳ Planned | — | `@acc-reliability/sdk` public API surface, module registration helpers, typed service resolution |

---

## Phase 3 — Storage Abstraction

> **Superseded by Phase 2 resequencing.** Storage Abstraction Contracts are now delivered as Milestone 4.3 within Phase 2, ensuring the contract is in place before business modules are migrated. This phase heading is retained for historical reference only.

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 5.1 | Repository base interfaces | ↪ Moved to 4.3 | — | Absorbed into Phase 2 — Storage Abstraction Contracts |
| 5.2 | Equipment repository interface | ↪ Moved to 4.3 | — | Absorbed into Phase 2 — Storage Abstraction Contracts |
| 5.3 | Google Sheets adapter scaffold | ↪ Moved to 4.3 | — | Absorbed into Phase 2 — Storage Abstraction Contracts |

---

## Phase 4 — Platform SDK

> **Superseded by Phase 2 resequencing.** Platform SDK is now delivered as Milestone 4.10 within Phase 2. This phase heading is retained for historical reference only.

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 6.1 | SDK public API surface | ↪ Moved to 4.10 | — | Absorbed into Phase 2 — Platform SDK |
| 6.2 | SDK module registration helpers | ↪ Moved to 4.10 | — | Absorbed into Phase 2 — Platform SDK |
| 6.3 | SDK service access helpers | ↪ Moved to 4.10 | — | Absorbed into Phase 2 — Platform SDK |

---

## Phase 5 — Owner Control Center

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 7.1 | App shell setup | ⏳ Planned | — | React app scaffold, routing |
| 7.2 | Equipment dashboard | ⏳ Planned | — | Equipment list, contractor filter |

---

## Phase 6 — Module Migration

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 8.1 | Oil Lubrication module scaffold | ⏳ Planned | — | Module structure, service/repo interfaces |
| 8.2 | Vibration Analysis module scaffold | ⏳ Planned | — | |
| 8.3 | Oil Analysis module scaffold | ⏳ Planned | — | |
| 8.4 | Compressors module scaffold | ⏳ Planned | — | |
| 8.5 | Reliability Measurements module scaffold | ⏳ Planned | — | |

---

## Future Phases

| Phase | Description | Roadmap Item |
|---|---|---|
| 9 | Event Bus | Item 7 |
| 10 | AI Integration | Item 8 |
| 11 | External Integrations | Item 9 |
| 12 | SQL Migration | Item 10 |

---

## Milestone 3.2 Detail — Platform Configuration Manager

**Date:** 2026-06-27  
**Package:** `@acc-reliability/kernel`

### Files Created

| File | Purpose |
|---|---|
| `platform/kernel/src/config/config-types.ts` | All config interfaces and union types |
| `platform/kernel/src/config/default-config.ts` | Static defaults for all 8 groups |
| `platform/kernel/src/config/environment.ts` | `applyEnvironmentOverrides()` — reads `ACC_*` env vars |
| `platform/kernel/src/config/config-validator.ts` | `ConfigValidator` — validates required fields, enum values |
| `platform/kernel/src/config/config-manager.ts` | `ConfigManager` — load, cache, validate, reload, `IConfigProvider` |

### Files Modified

| File | Change |
|---|---|
| `platform/kernel/src/bootstrap.ts` | Uses `ConfigManager` instead of `loadPlatformConfig()` |
| `platform/kernel/src/platform-context.ts` | Import `PlatformEnvironment` from `./config/config-types` |
| `platform/kernel/src/index.ts` | Exports new config types and classes; removed `config-loader` exports |

### Files Deleted

| File | Reason |
|---|---|
| `platform/kernel/src/config-loader.ts` | Replaced by `platform/kernel/src/config/` sub-module |

### Configuration Groups

| Group | Interface | ENV Var Prefix |
|---|---|---|
| Platform | `PlatformGroup` | `ACC_PLATFORM_*`, `ACC_VERSION`, `ACC_ENVIRONMENT` |
| Security | `SecurityGroup` | `ACC_SECURITY_*` |
| Storage | `StorageGroup` | `ACC_STORAGE_*` |
| Logging | `LoggingGroup` | `ACC_LOG_*` |
| Feature Flags | `FeatureFlags` | `ACC_FEATURE_*` |
| Runtime | `RuntimeGroup` | `ACC_RUNTIME_*` |
| Build | `BuildGroup` | `ACC_CONFIG_SOURCE`, `ACC_COMMIT_HASH` |
| Module Defaults | `ModuleDefaultsGroup` | `ACC_MODULE_*` |

### Storage Providers Supported (config only, no implementation)

`GoogleSheets` · `SQLServer` · `PostgreSQL` · `SQLite` · `Mock`

### Feature Flags

| Flag | Default |
|---|---|
| `authentication` | `false` |
| `notifications` | `false` |
| `audit` | `false` |
| `offlineMode` | `false` |
| `aiAssistant` | `false` |
| `developerTools` | `true` |

---

## Milestone 3.4 Detail — Dependency Injection Container

**Date:** 2026-06-27  
**Package:** `@acc-reliability/kernel`

### Files Created

| File | Purpose |
|---|---|
| `platform/kernel/src/di/token.ts` | `Token<T>` — phantom-typed dependency handle keyed by name string |
| `platform/kernel/src/di/container-types.ts` | `RegistrationKind`, `Factory<T>`, `ContainerRegistrationInfo`, `IContainer` interface |
| `platform/kernel/src/di/container.ts` | `Container` — full implementation with circular-dep detection |

### Files Modified

| File | Change |
|---|---|
| `platform/kernel/src/errors.ts` | Added `ContainerError extends PlatformError` (code: `CONTAINER_ERROR`) |
| `platform/kernel/src/index.ts` | Added DI exports: `Token`, `Container`, `IContainer`, `Factory`, `RegistrationKind`, `ContainerRegistrationInfo`, `ContainerError` |

### Container API

| Method | Description |
|---|---|
| `registerSingleton(token, instance)` | Registers a pre-built instance; returned as-is on every resolve |
| `registerLazySingleton(token, factory)` | Factory called once on first resolve; result cached for all subsequent resolves |
| `registerFactory(token, factory)` | Factory called fresh on every resolve; nothing is cached |
| `resolve(token)` | Returns the dependency; throws `ContainerError` if not registered or if circular |
| `has(token)` | Returns `true` if the token is registered |
| `list()` | Returns `ContainerRegistrationInfo[]` — no factory refs or instances exposed |
| `reset()` | Clears all registrations and caches (tests / hot-reload) |

### ServiceRegistry Integration

None. `Container` and `ServiceRegistry` are intentionally independent:
- `ServiceRegistry` — runtime lifecycle management, string IDs, status tracking
- `Container` — compile-time-typed dependency composition for application code

### Bootstrap

`bootstrap.ts` was not modified. The `Container` is available for use by the Platform SDK and application code in future milestones.

---

## Milestone 3.3 Detail — Service Registry Hardening

**Date:** 2026-06-27  
**Package:** `@acc-reliability/kernel`

### Files Modified

| File | Change |
|---|---|
| `platform/kernel/src/service-registry.ts` | Full rewrite — see API additions below |
| `platform/kernel/src/bootstrap.ts` | Step 7 added: core services transitioned to `running` after context creation |
| `platform/kernel/src/index.ts` | Added exports: `ServiceStatus`, `ServiceInfo` |

### New API Surface

| Addition | Kind | Description |
|---|---|---|
| `ServiceStatus` | `type` | `registered \| initialized \| running \| degraded \| failed \| stopped` |
| `ServiceInfo` | `type` | `Omit<ServiceDescriptor, 'instance'>` — public descriptor without the live instance |
| `ServiceDescriptor.status` | field | Current lifecycle status |
| `ServiceDescriptor.statusChangedAt` | field | ISO 8601 timestamp of the last status transition |
| `ServiceDescriptor.initializedAt?` | field | Set when status → `initialized` |
| `ServiceDescriptor.startedAt?` | field | Set when status → `running` |
| `ServiceDescriptor.stoppedAt?` | field | Set when status → `stopped` |
| `IServiceRegistry.tryRegister()` | method | Duplicate-safe: returns `boolean`, never throws for duplicates |
| `IServiceRegistry.getRequired()` | method | Assert-style get: stronger error message for unconditional dependencies |
| `IServiceRegistry.setStatus()` | method | Transitions a service to a new `ServiceStatus` |
| `IServiceRegistry.getStatus()` | method | Returns current `ServiceStatus` for a service |
| `IServiceRegistry.listByStatus()` | method | Returns `ServiceInfo[]` filtered by status |
| `IServiceRegistry.clear()` | method | Removes all services — for test teardown only |

### Backward Compatibility

`register()`, `get()`, `has()`, and `list()` signatures are unchanged. Existing callers compile without modification. `list()` now returns objects with additional fields (`status`, `statusChangedAt`, optional lifecycle timestamps).

---

## Milestone 3.5 Detail — Platform Event Bus Interfaces

**Date:** 2026-06-27  
**Package:** `@acc-reliability/kernel`

Satisfies the AI_DEVELOPMENT_GUIDE requirement: *"Prepare code for future event-driven architecture but do not implement it yet."*  
The kernel now exposes the full event bus contract. Phase 9 replaces `NullEventBus` with a real in-process implementation without touching any caller code.

### Files Created

| File | Purpose |
|---|---|
| `platform/kernel/src/events/event-token.ts` | `EventToken<T>` — phantom-typed event channel handle keyed by name string |
| `platform/kernel/src/events/event-bus-types.ts` | `IEventBus`, `IEventHandler<T>`, `EventSubscription`, `EventChannelInfo` interfaces |
| `platform/kernel/src/events/null-event-bus.ts` | `NullEventBus` — no-op Phase 1 implementation; all methods are safe stubs |

### Files Modified

| File | Change |
|---|---|
| `platform/kernel/src/errors.ts` | Added `EventBusError extends PlatformError` (code: `EVENT_BUS_ERROR`) |
| `platform/kernel/src/bootstrap.ts` | Imports `NullEventBus`; registers `platform.eventBus`; marks it `running` in Step 7 |
| `platform/kernel/src/index.ts` | Added event bus exports: `EventToken`, `NullEventBus`, `IEventBus`, `IEventHandler`, `EventSubscription`, `EventChannelInfo`, `EventBusError` |

### Event Bus API

| Member | Kind | Description |
|---|---|---|
| `EventToken<T>` | class | Phantom-typed channel handle; two instances with the same name address the same channel |
| `IEventHandler<T>` | type | `(payload: T) => void` — synchronous event handler contract |
| `EventSubscription` | interface | Handle returned by `subscribe()`; call `unsubscribe()` to deregister |
| `EventChannelInfo` | interface | Public metadata for a channel (name, subscriber count, firstSubscribedAt) — no handlers exposed |
| `IEventBus.publish<T>` | method | Publishes to all current subscribers; no-op if no subscribers exist |
| `IEventBus.subscribe<T>` | method | Registers a handler; returns `EventSubscription` |
| `IEventBus.unsubscribeAll<T>` | method | Removes all subscriptions for a channel (module teardown) |
| `IEventBus.listChannels` | method | Returns `EventChannelInfo[]` for diagnostics |
| `IEventBus.reset` | method | Clears all subscriptions (test teardown) |
| `NullEventBus` | class | No-op implementation for Phase 1 development |
| `EventBusError` | class | Thrown when event bus operations fail |

### Design Decisions

- `NullEventBus` is registered as `platform.eventBus` in `bootstrap.ts` — callers resolve it by service id, so Phase 9 swaps in the real bus transparently.
- `publish()` is defined as synchronous — handlers run inline, in subscription order. One failing handler must not silence others (enforced in the real Phase 9 implementation via try/catch per handler).
- No persistence, no replay — events are ephemeral by design.
- Module-to-module direct publishing is prohibited; cross-module events must route through Platform Services (enforced by policy, not by the bus itself).

### Bootstrap Services After Milestone 3.5

| Service ID | Display Name | Status |
|---|---|---|
| `platform.logger` | Platform Logger | `running` |
| `platform.config` | Platform Config | `running` |
| `platform.configManager` | Platform Config Manager | `running` |
| `platform.eventBus` | Platform Event Bus (Null Phase 1) | `running` |

---

## Milestone 3.6 Detail — Platform Lifecycle Manager

**Date:** 2026-06-27  
**Package:** `@acc-reliability/kernel`

### Files Created

| File | Purpose |
|---|---|
| `platform/kernel/src/lifecycle/lifecycle-types.ts` | `LifecycleState` (9 states), `ManagerState`, `ILifecycleComponent`, `ComponentStatus`, `LifecycleStatus`, `ILifecycleManager` |
| `platform/kernel/src/lifecycle/lifecycle-state.ts` | `isTransitionAllowed()`, `allowedTransitionsFrom()` — pure state-transition guards |
| `platform/kernel/src/lifecycle/lifecycle-manager.ts` | `LifecycleManager` implementation, `LifecycleManagerOptions` |

### Files Modified

| File | Change |
|---|---|
| `platform/kernel/src/errors.ts` | Added `LifecycleError extends PlatformError` (code: `LIFECYCLE_ERROR`) |
| `platform/kernel/src/bootstrap.ts` | Creates `LifecycleManager`; registers `platform.lifecycle`; marks it `running` |
| `platform/kernel/src/index.ts` | Exports: `LifecycleManager`, `LifecycleManagerOptions`, `ILifecycleManager`, `ILifecycleComponent`, `ComponentStatus`, `LifecycleStatus`, `LifecycleState`, `ManagerState`, `isTransitionAllowed`, `allowedTransitionsFrom`, `LifecycleError` |

### Lifecycle States

| State | Description |
|---|---|
| `Created` | Component object exists; not yet registered |
| `Registered` | Registered with the manager; awaiting initialization |
| `Initializing` | `initialize()` in progress |
| `Running` | Fully operational |
| `Degraded` | Operational but with reduced capability |
| `Maintenance` | Intentionally paused; not accepting work |
| `Stopping` | `shutdown()` in progress |
| `Stopped` | Orderly shutdown complete |
| `Failed` | Unrecoverable error; terminal until restarted |

### Manager API

| Method | Description |
|---|---|
| `register(component)` | Registers a component before `initializeAll()`. Throws on duplicate or late call |
| `initializeAll()` | Topological sort → initializes all components in dependency order. One-shot |
| `shutdownAll()` | Reverse-order graceful shutdown. Component errors are logged, not re-thrown |
| `restart(componentId)` | Stops then re-initializes a single component |
| `setDegraded(id, reason)` | Transitions `Running` → `Degraded` |
| `enterMaintenance(id)` | Transitions `Running`/`Degraded` → `Maintenance` |
| `exitMaintenance(id)` | Transitions `Maintenance` → `Running` |
| `getStatus()` | Returns frozen `LifecycleStatus` snapshot |
| `getComponentStatus(id)` | Returns frozen `ComponentStatus` for one component |
| `hasComponent(id)` | Returns `true` if component ID is registered |

### Design Decisions

- Dependency ordering: depth-first topological sort; circular dependencies throw `LifecycleError` with the full cycle path.
- `initializeAll()` fails fast on the first component error; remaining components stay `Registered`.
- `shutdownAll()` continues through failures; each shutdown error is logged individually.
- `restart()` verifies all dependencies are `Running` before re-initializing.
- `ServiceRegistry` sync is optional and best-effort; sync failures are logged and never propagated.
- All public status objects are frozen. No component instance references are exposed outside the manager.

### Bootstrap Services After Milestone 3.6

| Service ID | Display Name | Status |
|---|---|---|
| `platform.logger` | Platform Logger | `running` |
| `platform.config` | Platform Config | `running` |
| `platform.configManager` | Platform Config Manager | `running` |
| `platform.eventBus` | Platform Event Bus (Null Phase 1) | `running` |
| `platform.lifecycle` | Platform Lifecycle Manager | `running` |

---

## Milestone 4.1 Detail — Authentication Service Interface

**Date:** 2026-06-27  
**Package:** `@acc-reliability/services` (new package)

### Package Bootstrap

| File | Purpose |
|---|---|
| `platform/services/package.json` | `@acc-reliability/services` v0.1.0; depends on `@acc-reliability/kernel` |
| `platform/services/tsconfig.json` | Strict TypeScript; `composite: true`; project reference to `../kernel` |

### Files Created

| File | Purpose |
|---|---|
| `platform/services/src/auth/auth-types.ts` | All authentication types, branded type factories, `IAuthService` interface |
| `platform/services/src/errors.ts` | `AuthError`, `AuthenticationError`, `SessionExpiredError` |
| `platform/services/src/index.ts` | Public barrel — all exported symbols |

### Files Modified

| File | Change |
|---|---|
| `platform/kernel/tsconfig.json` | Added `"composite": true` to enable TypeScript project references |
| `package.json` (root) | Added `services:build`, `services:check`, `services:clean` workspace scripts |

### Public API Surface

| Export | Kind | Description |
|---|---|---|
| `ContractorId` | `type` | Branded string — contractor identity; first-class isolation primitive |
| `UserId` | `type` | Branded string — platform user identity |
| `SessionId` | `type` | Branded string — authentication session handle |
| `KnownContractorCode` | `type` | `'ACC' \| 'RHI' \| 'ASEC'` — currently registered contractors |
| `KNOWN_CONTRACTORS` | `const` | `readonly ['ACC', 'RHI', 'ASEC']` |
| `UserRole` | `type` | Open string union of known platform and contractor roles |
| `UserContext` | `interface` | Immutable snapshot of the authenticated user; no methods |
| `SessionInfo` | `interface` | Session metadata; safe to log; no credential material |
| `AuthCredentials` | `type` | Discriminated union: `PasswordCredentials \| TokenCredentials` |
| `PasswordCredentials` | `interface` | `kind: 'password'`, `username`, `password` |
| `TokenCredentials` | `interface` | `kind: 'token'`, `token` |
| `IAuthService` | `interface` | Authentication service contract consumed by business modules |
| `createContractorId` | `function` | Factory for `ContractorId`; normalises to uppercase, rejects blank |
| `createUserId` | `function` | Factory for `UserId`; rejects blank |
| `createSessionId` | `function` | Factory for `SessionId`; rejects blank |
| `AuthError` | `class` | Base error for all auth failures (`AUTH_ERROR`) |
| `AuthenticationError` | `class` | Not authenticated or bad credentials (`AUTH_UNAUTHENTICATED`) |
| `SessionExpiredError` | `class` | Session has lapsed (`AUTH_SESSION_EXPIRED`) |

### IAuthService Contract

| Method | Return | Throws |
|---|---|---|
| `getCurrentUser()` | `UserContext \| null` | — |
| `isAuthenticated()` | `boolean` | — |
| `signIn(credentials)` | `Promise<UserContext>` | `AuthenticationError`, `AuthError` |
| `signOut()` | `Promise<void>` | — (no-op if no session) |
| `refreshSession()` | `Promise<UserContext>` | `SessionExpiredError`, `AuthenticationError` |
| `getSessionInfo()` | `SessionInfo \| null` | — |

### Design Decisions

- `ContractorId` is a branded type enforced at compile time. All contractor-scoped queries must carry it; accidental mixing of contractor data is a type error.
- `UserContext` is a pure data snapshot with no methods. Services receive it as an argument; they do not query it for behaviour.
- `AuthCredentials` is a discriminated union so new credential kinds (OAuth, SAML, certificate) extend the type without breaking any existing switch/if-else in callers.
- `IAuthService` is interface-only in this milestone. No implementation class is created; the concrete implementation belongs to a future milestone once an identity provider is selected.
- The service id `platform.auth` is reserved for registration in the `ServiceRegistry`. No registration occurs in this milestone (no implementation exists).
- `AuthError` extends `PlatformError` via a protected `code` parameter so sub-classes supply their specific code through the constructor chain without mutating readonly fields.
- Future Event Bus: when Phase 9 is active, `signIn` and `signOut` will publish to `platform.events.auth.signed-in` and `platform.events.auth.signed-out`. Callers of `IAuthService` need no changes.

### Compile Verification

```
kernel:  tsc --build platform/kernel/tsconfig.json   → exit 0
services: tsc --project platform/services/tsconfig.json → exit 0
dist files emitted: 12 (index.js, index.d.ts, auth/auth-types.js, auth/auth-types.d.ts, errors.js, errors.d.ts + maps)
```

---

## Milestone 4.3 Detail — Storage Abstraction Contracts

**Date:** 2026-06-27  
**Package:** `@acc-reliability/services` (new sub-module `src/storage/`)

### Files Created

| File | Purpose |
|---|---|
| `platform/services/src/storage/query-types.ts` | Filtering, sorting, paging types and `QueryOptions<T>` |
| `platform/services/src/storage/storage-types.ts` | Provider configs, `Entity`, `ITransaction`, `IRepository<T>`, `IStorageProvider` |

### Files Modified

| File | Change |
|---|---|
| `platform/services/src/errors.ts` | Added `StorageError` hierarchy: 6 error classes |
| `platform/services/src/index.ts` | Added all storage type exports and storage error exports |

### Provider Architecture

| Provider | Config Type | Transaction Support | Notes |
|---|---|---|---|
| `GoogleSheets` | `GoogleSheetsProviderConfig` | ❌ Must throw `TransactionError` | Current production source |
| `SQLServer` | `SqlServerProviderConfig` | ✅ Full ACID | Future migration target (on-premise) |
| `PostgreSQL` | `PostgreSQLProviderConfig` | ✅ Full ACID | Future migration target (cloud) |
| `SQLite` | `SQLiteProviderConfig` | ✅ Full ACID | Dev and CI |
| `Mock` | `MockStorageProviderConfig` | ✅ (simulated) | Unit tests |

### Filtering Model

| Type | Kind discriminant | Purpose |
|---|---|---|
| `FieldFilter<T>` | `'field'` | Single field predicate |
| `CompositeFilter<T>` | `'composite'` | `and` / `or` tree of child expressions |
| `FilterExpression<T>` | — | Union: `FieldFilter<T> \| CompositeFilter<T>` |

Supported operators: `eq` · `ne` · `gt` · `gte` · `lt` · `lte` · `contains` · `startsWith` · `endsWith` · `in` · `notIn` · `isNull` · `isNotNull`

### IRepository<T> Contract

| Method | Return | Throws |
|---|---|---|
| `findById(id)` | `T \| null` | `StorageError` |
| `findAll(options?)` | `readonly T[]` | `QueryError`, `StorageError` |
| `findPaged(options)` | `PageResult<T>` | `QueryError`, `StorageError` |
| `findOne(filter)` | `T \| null` | `QueryError`, `StorageError` |
| `create(data)` | `T` | `DuplicateEntityError`, `StorageError` |
| `update(id, changes)` | `T` | `EntityNotFoundError`, `StorageError` |
| `delete(id)` | `void` | `EntityNotFoundError`, `StorageError` |
| `count(filter?)` | `number` | `QueryError`, `StorageError` |
| `exists(id)` | `boolean` | `StorageError` |

Instances are contractor-scoped at creation time via `IStorageProvider.getRepository(entityType, contractorId)`.

### StorageError Hierarchy

| Class | Code | HTTP equiv | When thrown |
|---|---|---|---|
| `StorageError` | `STORAGE_ERROR` | 500 | Base; provider-level catch-all |
| `ConnectionError` | `STORAGE_CONNECTION_ERROR` | 503 | Backend unreachable |
| `QueryError` | `STORAGE_QUERY_ERROR` | 400 | Invalid query or unsupported operator |
| `EntityNotFoundError` | `STORAGE_NOT_FOUND` | 404 | Entity absent in contractor scope |
| `DuplicateEntityError` | `STORAGE_DUPLICATE` | 409 | Unique constraint violated |
| `TransactionError` | `STORAGE_TRANSACTION_ERROR` | 500 | TX unsupported or failed |

### Design Decisions

- `IRepository<T>` is contractor-scoped at construction. The `ContractorId` is bound when the provider creates the repository via `getRepository(entityType, contractorId)`. Individual method calls carry no contractor parameter — it cannot be forgotten or bypassed.
- `ITransaction` is defined completely even though Google Sheets cannot support it. Providers that lack transaction support throw `TransactionError` from `beginTransaction()`. Business modules that opt into transactional workflows compile against the interface and are transparent to the backend swap during SQL migration.
- `PagedQueryOptions<T>` extends `QueryOptions<T>` making `page` required. `findPaged` accepts only this type so it is impossible to call it without pagination parameters.
- `FilterExpression<T>` is recursive — `CompositeFilter<T>.filters` contains `FilterExpression<T>[]` — allowing arbitrarily deep predicate trees.
- `StorageProviderConfig` is a discriminated union on `kind`. Switch/narrowing on `config.kind` is exhaustive and required; adding a new provider is a single-point change.
- `withTransaction` is a convenience wrapper over `beginTransaction`/`commit`/`rollback` to prevent resource leaks when the caller's operation throws.

---

## Milestone 4.2 Detail — Authorization and Permission Contracts

**Date:** 2026-06-27  
**Package:** `@acc-reliability/services` (new sub-module `src/authz/`)

### Files Created

| File | Purpose |
|---|---|
| `platform/services/src/authz/authz-types.ts` | All authorization types, permission structures, and `IPermissionService` interface |

### Files Modified

| File | Change |
|---|---|
| `platform/services/src/errors.ts` | Added `AuthorizationError` (code: `AUTHZ_ERROR`) and `PermissionDeniedError` (code: `AUTHZ_PERMISSION_DENIED`) |
| `platform/services/src/index.ts` | Added authorization type exports and const exports |

### Role Model

| Role | Authority level | Scope |
|---|---|---|
| `AppOwner` | Full platform access | Cross-contractor (`'all'`) |
| `Manager` | Read, write, approve | Own contractor |
| `Engineer` | Read, write | Own contractor |
| `ContractorManager` | Manage users and data | Single contractor boundary |
| `ContractorEngineer` | Engineer rights | Own contractor only |
| `Viewer` | Read-only | Permitted modules |

### Module Registry

| Module ID | Description |
|---|---|
| `oil-lubrication` | Oil lubrication module |
| `oil-analysis` | Oil analysis module |
| `vibration-analysis` | Vibration analysis module |
| `compressors` | Compressors module |
| `reliability-measurements` | Reliability measurements module |

### Action Types

`read` · `create` · `update` · `delete` · `approve` · `export` · `configure`

All types are open unions (`string & Record<never, never>` extension); module-specific actions can be added without a platform-wide change.

### IPermissionService Contract

| Method | Return | Description |
|---|---|---|
| `hasRole(user, role)` | `boolean` | Tests if the user holds the given role |
| `hasPermission(user, request)` | `boolean` | Tests module + action + contractor scope; enforces contractor isolation |
| `getGrantedPermissions(user)` | `readonly PermissionEntry[]` | Returns all effective permission grants for the user |
| `canAccessModule(user, moduleId)` | `boolean` | Coarse-grained module access check |
| `getRoles(user)` | `readonly AppRole[]` | Returns the user's normalised role list |

### Error Codes

| Class | Code | HTTP |
|---|---|---|
| `AuthorizationError` | `AUTHZ_ERROR` | 403 |
| `PermissionDeniedError` | `AUTHZ_PERMISSION_DENIED` | 403 |

### Design Decisions

- `ContractorScope = ContractorId | 'all'` — `'all'` is reserved for `AppOwner` users only. Implementations must enforce this invariant; the type alone does not prevent misuse.
- `hasPermission()` returns `false` (not an error) for cross-contractor requests from non-AppOwner users. Throwing would leak information about whether a resource exists.
- `IPermissionService` methods are synchronous — permission checks are on the hot path of every module operation. Implementations cache the effective permission set when the session is established.
- The service id `platform.permissions` is reserved. No registration in this milestone.
- Future Event Bus: when Phase 9 is active, role changes will publish to `platform.events.permissions.roles-changed` so dependent services can invalidate caches without polling. Callers of `IPermissionService` need no changes.

---

## Milestone 4.4 Detail — Communication Contracts

**Date:** 2026-06-27  
**Package:** `@acc-reliability/services` (new sub-module `src/contracts/`)

Satisfies the AI_DEVELOPMENT_GUIDE requirement: *"Prepare code for future event-driven architecture but do not implement it yet."*  
All contracts are transport-independent and storage-independent. They will be reused without modification when the Event Bus is introduced in Phase 9.

### Files Created

| File | Purpose |
|---|---|
| `platform/services/src/contracts/correlation.ts` | 6 branded identifier types (CorrelationId, MessageId, RequestId, EventId, TraceId, OperationId) + factories |
| `platform/services/src/contracts/communication-types.ts` | EquipmentId, PlatformModule (9 modules), MessagePriority, ContractVersion, MessageMetadata, PlatformEvent\<T\>, PlatformMessage\<T\> |
| `platform/services/src/contracts/platform-events.ts` | 13 domain events with typed payloads, discriminants, version constants, AnyPlatformEvent union |
| `platform/services/src/contracts/platform-messages.ts` | 2 command messages with typed payloads, discriminants, version constants, AnyPlatformMessage union |

### Files Modified

| File | Change |
|---|---|
| `platform/services/src/index.ts` | Added all contract type exports, value exports, and version constant exports |

### Identifier Types (correlation.ts)

| Type | Brand | Purpose |
|---|---|---|
| `CorrelationId` | `'CorrelationId'` | Links all messages produced by one user action |
| `MessageId` | `'MessageId'` | Unique id for a single message envelope |
| `RequestId` | `'RequestId'` | Matches request to response in future request-reply patterns |
| `EventId` | `'EventId'` | Unique id for a single event envelope |
| `TraceId` | `'TraceId'` | Distributed trace across all hops (OpenTelemetry-compatible) |
| `OperationId` | `'OperationId'` | Single named step within a larger trace |

### Platform Modules (communication-types.ts)

`oil-lubrication` · `oil-analysis` · `vibration-analysis` · `reliability-measurements` · `compressors` · `owner-center` · `contractor-portal` · `notification-service` · `action-service`

All are open-union extensible via `PlatformModule`.

### Domain Events (platform-events.ts)

| Event | Source Module | Key Payload Fields |
|---|---|---|
| `OilChangeCompleted` | `oil-lubrication` | equipmentId, completedBy, oilType, quantityLitres |
| `OilAnalysisCompleted` | `oil-analysis` | sampleId, parameters\[\], overallCondition |
| `OilAnalysisCritical` | `oil-analysis` | sampleId, criticalParameters\[\], severity, finding |
| `ResampleRequired` | `oil-analysis` | originalSampleId, requiredBy, urgency |
| `ActionCreated` | `action-service` | actionId, actionType, assignedTo, dueDate, priority |
| `ActionCompleted` | `action-service` | actionId, completedBy, outcome, completedOnTime |
| `EquipmentStatusChanged` | any module | equipmentId, previousStatus, newStatus, reason |
| `RouteAssigned` | `oil-lubrication` | routeId, assignedTo, equipmentIds\[\], scheduledDate |
| `RouteCompleted` | `oil-lubrication` | routeId, completedBy, completedItems, totalItems |
| `HealthStatusChanged` | platform infra | componentId, previousStatus, newStatus, reason |
| `UserCreated` | platform identity | userId, contractorId, roles\[\] |
| `UserUpdated` | platform identity | userId, changedFields\[\] (no PII values) |
| `PermissionChanged` | platform authz | userId, changes\[\] (grant/revoke per module+action) |

### Command Messages (platform-messages.ts)

| Message | Target Module | Key Payload Fields |
|---|---|---|
| `OilChangeRequested` | `oil-lubrication` | equipmentId, requestedBy, requiredBy, reason, oilType? |
| `NotificationRequested` | `notification-service` | recipients\[\], subject, body, priority, category |

### Design Decisions

- `MessageMetadata` is the single shared header for all contracts. Transport adapters (direct call today, Event Bus in Phase 9) attach this header; business payloads never carry routing concerns.
- Every event and message has a `type` string literal discriminant. `AnyPlatformEvent` and `AnyPlatformMessage` are discriminated unions — exhaustive switch/narrowing is supported by the TypeScript compiler.
- `UserUpdatedEvent` intentionally omits new field values from the payload to prevent PII leakage in the event stream. Consumers that need current values must query the auth service.
- `EquipmentId` is now the canonical branded type for equipment identity in contracts, replacing raw strings. Consistent with the AI_DEVELOPMENT_GUIDE: "Equipment_ID is the master equipment identifier across the entire platform."
- All version constants follow the `"major.minor"` format. Consumers must tolerate unknown minor versions within the same major.

### Compile Verification

```
kernel:   tsc --build platform/kernel/tsconfig.json       → exit 0
services: tsc --noEmit platform/services/tsconfig.json    → exit 0
```

---

## Milestone 4.5 Detail — Health Service

**Date:** 2026-06-27  
**Package:** `@acc-reliability/services` (new sub-module `src/health/`)

### Files Created

| File | Purpose |
|---|---|
| `platform/services/src/health/health-types.ts` | All health types, `IHealthService` interface, `HealthCheckFn`, options |
| `platform/services/src/health/health-service.ts` | `HealthService` — in-memory implementation |

### Files Modified

| File | Change |
|---|---|
| `platform/services/src/errors.ts` | Added `HealthError`, `HealthCheckTimeoutError`, `HealthComponentNotFoundError` |
| `platform/services/src/index.ts` | Added all health type exports, `HealthService` class export, and health error exports |

### Health States

| Status | Severity | Meaning |
|---|---|---|
| `offline` | 5 (worst) | Unreachable or check could not run |
| `critical` | 4 | Running but in unacceptable state; immediate action required |
| `degraded` | 3 | Running with reduced capability |
| `warning` | 2 | Running normally but a condition warrants attention |
| `maintenance` | 1 | Intentionally paused; not a failure |
| `healthy` | 0 (best) | Fully operational |

`overallStatus` = worst status across all components. All-maintenance → `maintenance`. No components → `healthy`.

### Component Categories

`kernel` · `service` · `storage` · `module` · `communication`

All are open-union extensible via `HealthComponentCategory`.

### IHealthService Contract

| Method | Description |
|---|---|
| `register(registration)` | Registers a component; throws `HealthError` on duplicate `componentId` |
| `unregister(componentId)` | Removes component and its stored result (no-op if not found) |
| `check(componentId)` | Runs check fresh; throws `HealthComponentNotFoundError` if not registered |
| `checkAll()` | Runs all checks in parallel via `Promise.allSettled`; no check can abort others |
| `getStatus(componentId)` | Returns last known `HealthComponentStatus` or `null` if not registered |
| `getSummary()` | Returns `HealthSummary` from cached statuses — does NOT trigger new checks |
| `isHealthy()` | Shorthand: `getSummary().overallStatus === 'healthy'` |
| `listComponentIds()` | Returns all registered component IDs |

### HealthError Hierarchy

| Class | Code | When thrown |
|---|---|---|
| `HealthError` | `HEALTH_ERROR` | Base; duplicate component registration |
| `HealthCheckTimeoutError` | `HEALTH_CHECK_TIMEOUT` | Check exceeded `timeoutMs` |
| `HealthComponentNotFoundError` | `HEALTH_COMPONENT_NOT_FOUND` | `check()` called for unregistered component |

### Design Decisions

- `HealthCheckFn` returns only `HealthCheckOutcome` (status + message + details). The service is responsible for timing, timeout, and metadata — check functions stay simple.
- `checkAll()` uses `Promise.allSettled` so one failing check never silences the others. Rejected promises are caught and recorded as `offline`.
- Per-check timeout is enforced via `Promise.race` against a `setTimeout` reject. `HealthCheckTimeoutError` is thrown internally; the result is recorded as `status: 'offline', timedOut: true`.
- `consecutiveFailures` is tracked per component. It resets to `0` on any `healthy` or `maintenance` result. Future milestone (escalation logic) can use this for auto-action creation.
- `getSummary()` is a pure read of cached state. It never triggers new checks — callers that need fresh data must call `checkAll()` first.
- Service id `platform.health` is reserved. Bootstrap registration is deferred to the SDK milestone when all platform services are wired together.

### Compile Verification

```
services: tsc --noEmit platform/services/tsconfig.json → exit 0
```

---

## Milestone 4.6 Detail — Metrics Service

**Date:** 2026-06-27  
**Package:** `@acc-reliability/services` (new sub-module `src/metrics/`)

### Files Created

| File | Purpose |
|---|---|
| `platform/services/src/metrics/metrics-types.ts` | All metric types, `IMetricsService` interface, `createMetricId` factory, `METRIC_CATEGORIES` constant |
| `platform/services/src/metrics/metrics-service.ts` | `MetricsService` — in-memory implementation |

### Files Modified

| File | Change |
|---|---|
| `platform/services/src/errors.ts` | Added `MetricsError` hierarchy: 3 error classes |
| `platform/services/src/index.ts` | Added all metrics type exports, `MetricsService` class export, and metrics error exports |

### Metric Kinds

| Kind | Semantic | Recording method | Current value |
|---|---|---|---|
| `counter` | Monotonically increasing total | `increment(id, delta)` | `snapshot.sum` |
| `gauge` | Instantaneous reading | `set(id, value)` | `snapshot.lastSample.value` |
| `histogram` | Value distribution | `record(id, value)` | `min` / `max` / `sum/sampleCount` |
| `timer` | Latency distribution (ms) | `timing(id, ms)` or `startTimer(id)` | `min` / `max` / average |
| `duration` | Single elapsed-time observation | `timing(id, ms)` | `snapshot.lastSample.value` |
| `rate` | Events/second (future aggregation) | `increment(id, delta)` | `snapshot.sum` |

### Metric Categories

`platform` · `kernel` · `storage` · `communication` · `health` · `module` · `security` · `performance` · `business` · `custom`

All are open-union extensible via `MetricCategory`.

### IMetricsService Contract

| Group | Method | Description |
|---|---|---|
| Registration | `register(definition)` | Register a metric; throws `MetricAlreadyRegisteredError` on duplicate |
| Registration | `unregister(metricId)` | Remove metric and its samples; no-op if not found |
| Recording | `record(id, value, tags?)` | Raw observation; throws `MetricNotFoundError` if not registered |
| Recording | `increment(id, amount?)` | Record positive delta (default 1) |
| Recording | `decrement(id, amount?)` | Record negative delta (default 1) |
| Recording | `set(id, value)` | Record absolute value (gauge assignment) |
| Recording | `timing(id, durationMs)` | Record elapsed time in ms |
| Timer | `startTimer(id)` | Start timer; returns `stop()` closure that records duration and returns ms |
| Query | `getSnapshot(id)` | Frozen snapshot or `null` if not registered |
| Query | `getAllSnapshots()` | All snapshots in insertion order |
| Query | `getSnapshotsByCategory(cat)` | Snapshots filtered by category |
| Query | `getSummary()` | Frozen platform-wide aggregate |
| Lifecycle | `listMetricIds()` | All registered ids |
| Lifecycle | `isRegistered(id)` | Existence check |
| Export | `flush()` | Drain and return all buffered samples (clears buffer; keeps aggregates) |
| Reset | `reset(id)` | Clear all state for one metric; throws if not registered |
| Reset | `resetAll()` | Clear all state for every metric |

### MetricsError Hierarchy

| Class | Code | HTTP equiv | When thrown |
|---|---|---|---|
| `MetricsError` | `METRICS_ERROR` | 500 | Base; catch-all |
| `MetricNotFoundError` | `METRICS_NOT_FOUND` | 404 | record/increment/set/timing/startTimer/reset on unregistered id |
| `MetricAlreadyRegisteredError` | `METRICS_ALREADY_REGISTERED` | 409 | register() called with duplicate id |

### Pre-wired Metric IDs (reserved for future platform services)

The following metric ids are **not yet registered** — they are reserved for wiring in the SDK milestone and future service milestones:

| Metric ID | Kind | Category | What it measures |
|---|---|---|---|
| `platform.startup.duration` | `duration` | `platform` | Platform startup time |
| `platform.shutdown.duration` | `duration` | `platform` | Platform shutdown time |
| `storage.operation.duration` | `timer` | `storage` | Storage operation latency |
| `repository.operation.duration` | `timer` | `storage` | Repository method latency |
| `communication.duration` | `timer` | `communication` | Communication round-trip latency |
| `health.check.duration` | `timer` | `health` | Health check execution time |
| `module.execution.duration` | `timer` | `module` | Module operation latency |

### Design Decisions

- `increment()` and `decrement()` always record the delta as a sample. `sum` is the running total for counters. For gauge "current value" use `lastSample.value`; for absolute assignment use `set()`.
- `startTimer()` verifies the metric exists at call time (not in the stop closure). If the metric is unregistered between start and stop, the stop closure throws `MetricNotFoundError` — this fails loudly rather than silently discarding the observation.
- `flush()` drains per-metric rolling buffers (bounded by `maxSamplesPerMetric`, default 100). The aggregate state (`sampleCount`, `sum`, `min`, `max`) is not cleared by flush — only by `reset()`.
- All `MetricSample` objects are frozen at creation. All `MetricSnapshot` and `MetricSummary` objects are frozen before return. No copies are needed on read.
- `MetricState` is an internal mutable interface; its mutable fields are never exposed through the public API.
- Service id `platform.metrics` is reserved. Bootstrap registration is deferred to the SDK milestone.
- Future Event Bus: when Phase 9 is active, metric samples above `MetricLevel.warning` may publish to `platform.events.metrics.threshold-exceeded`. Callers of `IMetricsService` need no changes.

### Compile Verification

```
services: tsc --noEmit platform/services/tsconfig.json → exit 0
```

---

## Milestone 4.7 Detail — Notification Service

**Date:** 2026-06-27  
**Package:** `@acc-reliability/services` (new sub-module `src/notification/`)

### Files Created

| File | Purpose |
|---|---|
| `platform/services/src/notification/notification-types.ts` | All notification types, `INotificationService` interface, branded id factories, constants |
| `platform/services/src/notification/notification-service.ts` | `NotificationService` — in-memory implementation |

### Files Modified

| File | Change |
|---|---|
| `platform/services/src/errors.ts` | Added `NotificationError` hierarchy: 3 error classes |
| `platform/services/src/index.ts` | Added all notification type exports, `NotificationService` class export, and notification error exports; removed `NotificationChannel` and `NotificationRecipient` re-exports from `platform-messages` (superseded by notification-types) |

### Notification Types

| Type | Kind | Values / Shape |
|---|---|---|
| `NotificationType` | union | `info` · `warning` · `alert` · `critical` · `reminder` · `system` |
| `NotificationChannel` | open union | `inApp` · `email` · `mobilePush` · `(string)` |
| `NotificationStatus` | union | `pending` · `queued` · `sent` · `failed` · `dismissed` · `expired` |

### INotificationService Contract

| Group | Method | Description |
|---|---|---|
| Dispatch | `send(request)` | Submit one notification; returns frozen `NotificationRecord` with status `sent` |
| Dispatch | `sendBatch(requests)` | Submit multiple notifications independently; failures are recorded, not thrown |
| Query | `getRecord(id)` | Returns record or `null` — does not throw |
| Query | `getRecordsForRecipient(userId, contractorId)` | Contractor-scoped recipient query |
| Query | `getRecordsByStatus(status)` | Filter by lifecycle status |
| Query | `getRecordsByModule(module)` | Filter by requesting module |
| Lifecycle | `dismiss(id, userId)` | Transition record to `dismissed`; throws `NotificationNotFoundError` if not found |
| Lifecycle | `pruneExpired()` | Transition all past-`expiresAt` records to `expired`; returns count |
| Summary | `getSummary()` | Frozen summary: totalRecords, byStatus, byType, capturedAt |
| Summary | `listIds()` | All record ids in insertion order |

### NotificationError Hierarchy

| Class | Code | HTTP equiv | When thrown |
|---|---|---|---|
| `NotificationError` | `NOTIFICATION_ERROR` | 500 | Base; catch-all |
| `NotificationNotFoundError` | `NOTIFICATION_NOT_FOUND` | 404 | `dismiss()` with unknown id |
| `NotificationRecipientError` | `NOTIFICATION_RECIPIENT` | 400 | `send()` / `sendBatch()` with empty recipient list |

### Contractor Isolation

- `NotificationRecipient` carries both `userId` and `contractorId`.
- `getRecordsForRecipient(userId, contractorId)` returns only records where both values match a recipient entry.
- A caller cannot retrieve records belonging to a different contractor without supplying that contractor's `ContractorId`.

### Breaking Changes to Existing Exports

| Removed export | From | Replaced by |
|---|---|---|
| `NotificationChannel` | `./contracts/platform-messages` | `NotificationChannel` from `./notification/notification-types` |
| `NotificationRecipient` | `./contracts/platform-messages` | `NotificationRecipient` from `./notification/notification-types` |

The types removed from `platform-messages` re-exports remain as file-internal types used by `NotificationRequestedPayload`. Callers that previously imported them directly should switch to the notification-types versions.

### Design Decisions

- `send()` is `async` to allow future adapters (SMTP, FCM, etc.) to be dropped in without changing the contract signature. The in-memory implementation resolves immediately.
- `sendBatch()` catches `NotificationError` per-request so one bad request never silences the rest. Non-notification errors are re-thrown.
- `NotificationRecord` is frozen at creation and on every status transition. The internal Map always holds the latest frozen state for each id.
- FIFO eviction: when `maxRecordsInMemory` is reached the oldest record (first in Map insertion order) is removed. This prevents unbounded memory growth in long-running processes.
- `pruneExpired()` uses ISO 8601 string comparison (`expiresAt < now`). Both strings are UTC ISO 8601, so lexicographic ordering is chronologically correct.
- `dismiss()` accepts `_userId` but does not currently verify the caller is a recipient. The parameter is present to communicate intent and to allow enforcement in a future implementation without changing the contract signature.
- Service id `platform.notifications` is reserved. Bootstrap registration is deferred to the SDK milestone.
- Future Event Bus: when Phase 9 is active, `send()` will publish `NotificationDeliveredEvent` or `NotificationFailedEvent`. Callers of `INotificationService` need no changes.

### Compile Verification

```
services: tsc --noEmit -p platform/services/tsconfig.json → exit 0
```

---

*End of document.*
