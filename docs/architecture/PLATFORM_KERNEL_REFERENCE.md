# PLATFORM_KERNEL_REFERENCE.md

# ACC Reliability Platform — Platform Kernel Reference

Version: 1.0  
Status: Active  
Package: `@acc-reliability/kernel` (`platform/kernel`)

---

## Purpose

The kernel is the lowest-level platform package. It is responsible for:

- Loading configuration
- Constructing the `PlatformContext`
- Providing the `ServiceRegistry` and `ModuleRegistry`
- Supplying the `PlatformLogger`
- Defining the base error hierarchy

The kernel has **no runtime dependencies** on any other platform package. Every other package depends on the kernel, not the other way around.

---

## Bootstrap

Call `bootstrapPlatform()` exactly once at application startup. It is async and must be awaited.

```typescript
import { bootstrapPlatform } from '@acc-reliability/kernel';

const { context, durationMs } = await bootstrapPlatform();
// context is a frozen, read-only PlatformContext
```

Bootstrap sequence:
1. Create an early logger (pre-config defaults)
2. Load `PlatformConfig` (static defaults + `ACC_*` env var overrides)
3. Create the production logger using the resolved config
4. Initialize `ServiceRegistry` and `ModuleRegistry`
5. Register `platform.logger` and `platform.config` as the first services
6. Construct and freeze the `PlatformContext`

On failure, `bootstrapPlatform()` throws a `PlatformError` (or subclass). It never returns a partial context.

---

## PlatformContext

`PlatformContext` is the single runtime snapshot produced after bootstrap. It is frozen (`Object.freeze`) and must be passed via dependency injection — never accessed through a global singleton.

```typescript
interface PlatformContext {
  readonly platformName: string;
  readonly version: string;
  readonly environment: 'development' | 'staging' | 'production';
  readonly initializedAt: string;   // ISO 8601
  readonly correlationId: string;   // unique per bootstrap session
  readonly services: IServiceRegistry;
  readonly modules: IModuleRegistry;
}
```

---

## ServiceRegistry

Stores named platform services. Services are registered once; duplicate registration throws `RegistryError`.

```typescript
// Register
context.services.register('my.service', 'My Service', serviceInstance);

// Resolve
const svc = context.services.get<MyService>('my.service');

// Check
context.services.has('my.service');  // boolean

// List (excludes instances)
context.services.list();  // ReadonlyArray<{ serviceId, displayName, registeredAt }>
```

Pre-registered kernel services:

| Service ID | Type | Description |
|---|---|---|
| `platform.logger` | `ILogger` | The platform logger |
| `platform.config` | `PlatformConfig` | Loaded configuration |

---

## ModuleRegistry

Tracks business module lifecycle. Each module transitions through `registered → enabled → disabled / maintenance / failed`.

```typescript
// Register
context.modules.register('oil-lubrication', 'Oil Lubrication', '1.0.0');

// Enable / disable
context.modules.enable('oil-lubrication');
context.modules.disable('oil-lubrication');

// Custom status
context.modules.setStatus('oil-lubrication', 'maintenance');

// Query
context.modules.getStatus('oil-lubrication');  // ModuleStatus
context.modules.get('oil-lubrication');         // Readonly<ModuleDescriptor>
context.modules.list();                         // ReadonlyArray<Readonly<ModuleDescriptor>>
```

A module in `failed` status can only transition to `disabled`.

---

## PlatformLogger / ILogger

```typescript
interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
```

Log output format: `{ISO timestamp} {prefix} [{LEVEL}] {message} {JSON context?}`

Construct a scoped logger for any subsystem:

```typescript
import { PlatformLogger } from '@acc-reliability/kernel';

const logger = new PlatformLogger({ prefix: '[OilLubrication]', minLevel: 'info' });
```

The `kernelLogger` singleton is available for bootstrap-time use only. Production code should resolve the logger from the `ServiceRegistry`.

---

## Configuration

`PlatformConfig` is loaded by `loadPlatformConfig()`. Defaults are static; override with environment variables at runtime:

| Variable | Config Field | Default |
|---|---|---|
| `ACC_PLATFORM_NAME` | `platformName` | `'ACC Reliability Platform'` |
| `ACC_VERSION` | `version` | `'0.1.0'` |
| `ACC_ENVIRONMENT` | `environment` | `'development'` |
| `ACC_LOG_LEVEL` | `logLevel` | `'info'` |

`configSource` will progress from `'static'` → `'environment'` → `'remote'` as the platform matures. The interface does not change.

---

## Error Types

See [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) for the full error hierarchy and usage patterns. Kernel exports:

| Class | Code | When thrown |
|---|---|---|
| `PlatformError` | `PLATFORM_ERROR` | Base; unexpected failures |
| `ConfigurationError` | `CONFIGURATION_ERROR` | Missing or invalid config |
| `RegistryError` | `REGISTRY_ERROR` | Service/module registry violations |
| `ModuleError` | `MODULE_ERROR` | Module lifecycle failures |

---

## Public API Surface (`index.ts`)

```typescript
// Bootstrap
export { bootstrapPlatform }
export type { BootstrapResult }

// Context
export { createPlatformContext }
export type { PlatformContext }

// Config
export { loadPlatformConfig }
export type { PlatformConfig, PlatformEnvironment }

// Logger
export { PlatformLogger, kernelLogger }
export type { ILogger, LogLevel, LogEntry, LoggerOptions }

// Registries
export { ServiceRegistry }
export type { IServiceRegistry, ServiceDescriptor }
export { ModuleRegistry }
export type { IModuleRegistry, ModuleDescriptor, ModuleStatus }

// Errors
export { PlatformError, ConfigurationError, RegistryError, ModuleError }
```

---

## Related Documents

- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) — where the kernel fits in the layer model
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — error hierarchy and patterns
- [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md) — how modules use the kernel
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules

---

*End of document.*
