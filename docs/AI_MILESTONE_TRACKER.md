# AI_MILESTONE_TRACKER.md

# ACC Reliability Platform — Milestone Tracker

Version: 1.0  
Last Updated: 2026-06-27  
Updated By: AI Agent (Milestone 3.5)

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

---

## Phase 2 — Platform Services

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 4.1 | Authentication Service interface | ⏳ Planned | — | IAuthService, UserContext, ContractorId |
| 4.2 | Authorization / RBAC interface | ⏳ Planned | — | IAuthorizationService, permission checking |
| 4.3 | Notification Service interface | ⏳ Planned | — | INotificationService |
| 4.4 | Audit Log Service interface | ⏳ Planned | — | IAuditService, AuditEntry |

---

## Phase 3 — Storage Abstraction

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 5.1 | Repository base interfaces | ⏳ Planned | — | IRepository<T>, QueryOptions, contractor isolation patterns |
| 5.2 | Equipment repository interface | ⏳ Planned | — | IEquipmentRepository, Equipment_ID type |
| 5.3 | Google Sheets adapter scaffold | ⏳ Planned | — | GoogleSheetsAdapter, batch read/write patterns |

---

## Phase 4 — Platform SDK

| ID | Milestone | Status | Completed | Notes |
|---|---|---|---|---|
| 6.1 | SDK public API surface | ⏳ Planned | — | `@acc-reliability/sdk` package |
| 6.2 | SDK module registration helpers | ⏳ Planned | — | Wrappers for ModuleRegistry |
| 6.3 | SDK service access helpers | ⏳ Planned | — | Typed service resolution |

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

*End of document.*
