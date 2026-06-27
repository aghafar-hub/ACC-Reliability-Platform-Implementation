# ERROR_HANDLING_GUIDE.md

# ACC Reliability Platform — Error Handling Guide

Version: 1.0  
Status: Active

---

## Fundamental Rules

- **Never swallow exceptions.** Every `catch` block must either rethrow, wrap, or log and rethrow.
- **Create meaningful error types.** Use specific subclasses instead of generic `Error`.
- **Include context.** Every error must carry enough information to diagnose the failure without reading code.
- **Log before rethrowing** at the point where context is richest.

---

## Error Hierarchy

All platform errors extend `PlatformError`. Domain errors extend `PlatformError` (or an appropriate subclass) with a domain-specific code.

```
Error (built-in)
└── PlatformError                  code: 'PLATFORM_ERROR'
    ├── ConfigurationError         code: 'CONFIGURATION_ERROR'
    ├── RegistryError              code: 'REGISTRY_ERROR'
    ├── ModuleError                code: 'MODULE_ERROR'
    └── <DomainError>              code: 'OIL_LUBRICATION_ERROR' (example)
```

---

## PlatformError

Every platform error carries:

| Property | Type | Purpose |
|---|---|---|
| `message` | `string` | Human-readable description |
| `code` | `string` | Machine-readable error code (SCREAMING_SNAKE) |
| `context` | `Record<string, unknown>` | Diagnostic key-value pairs |
| `timestamp` | `string` | ISO 8601 timestamp of when the error was created |

```typescript
import { PlatformError } from '@acc-reliability/kernel';

throw new PlatformError(
  'Platform bootstrap failed',
  'BOOTSTRAP_FAILURE',
  { durationMs, environment }
);
```

---

## Creating Domain Error Classes

Each business module should define its own error class. Extend `PlatformError` directly:

```typescript
import { PlatformError } from '@acc-reliability/kernel';

export class OilLubricationError extends PlatformError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'OIL_LUBRICATION_ERROR', context);
    this.name = 'OilLubricationError';
    // Required to preserve prototype chain when transpiling to ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

Use more specific subclasses for distinct failure modes:

```typescript
export class OilRecordNotFoundError extends OilLubricationError {
  constructor(equipmentId: string, contractorId: string) {
    super(
      `Oil record not found for equipment ${equipmentId}`,
      'OIL_RECORD_NOT_FOUND',
      { equipmentId, contractorId }
    );
    this.name = 'OilRecordNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

---

## Error Codes

Error codes must be:
- SCREAMING_SNAKE_CASE
- Globally unique within the platform
- Prefixed with the originating layer or domain

| Prefix | Layer |
|---|---|
| `PLATFORM_` | Kernel / platform-level |
| `CONFIGURATION_` | Config loading |
| `REGISTRY_` | Service or module registry |
| `MODULE_` | Module lifecycle |
| `STORAGE_` | Storage abstraction layer |
| `OIL_LUBRICATION_` | Oil Lubrication module |
| `VIBRATION_` | Vibration Analysis module |

---

## Catching and Wrapping

When catching errors from lower layers, wrap them to add context:

```typescript
try {
  const record = await this.repo.findByEquipmentId(id, contractorId);
  return record;
} catch (error) {
  if (error instanceof OilRecordNotFoundError) {
    throw error;  // Re-throw known, already-contextualized errors as-is
  }
  throw new OilLubricationError(
    'Unexpected failure retrieving oil record',
    'OIL_RECORD_FETCH_FAILURE',
    {
      equipmentId: id,
      contractorId,
      originalMessage: error instanceof Error ? error.message : String(error),
    }
  );
}
```

---

## Logging Errors

Always log errors with context before rethrowing at the service boundary:

```typescript
this.logger.error('Oil record fetch failed', {
  equipmentId: id,
  contractorId,
  error: error instanceof PlatformError ? error.toJSON() : String(error),
});
```

Use `PlatformError.toJSON()` to serialize structured error data into log context.

---

## Error Serialization

`PlatformError.toJSON()` produces:

```json
{
  "name": "OilLubricationError",
  "code": "OIL_RECORD_NOT_FOUND",
  "message": "Oil record not found for equipment EQ-001",
  "timestamp": "2026-06-27T03:43:00.000Z",
  "context": {
    "equipmentId": "EQ-001",
    "contractorId": "ACC"
  }
}
```

Use `toJSON()` when passing error details to loggers or API responses. Never expose raw stack traces to clients.

---

## What Not to Do

```typescript
// Bad — swallows the error
try {
  await doSomething();
} catch (_) { }

// Bad — loses the original error
catch (error) {
  throw new Error('Something went wrong');
}

// Bad — no context
throw new PlatformError('Failed', 'FAILED');

// Bad — wrong base class
throw new Error('Registry service not found');  // should be RegistryError
```

---

## Related Documents

- [PLATFORM_KERNEL_REFERENCE.md](./PLATFORM_KERNEL_REFERENCE.md) — kernel error types
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) — naming and class conventions
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules

---

*End of document.*
