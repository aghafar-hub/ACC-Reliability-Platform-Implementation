# MODULE_DEVELOPMENT_GUIDE.md

# ACC Reliability Platform — Module Development Guide

Version: 1.0  
Status: Active

---

## What Is a Module

A business module encapsulates all logic for a single reliability engineering domain (e.g., oil lubrication, vibration analysis). Each module is:

- **Independently deployable** — has its own `package.json` and build configuration
- **Self-contained** — all domain logic lives inside the module
- **Platform-consuming** — depends on the Platform SDK, never on platform internals
- **Isolated** — never imports from another business module

---

## Module Location

All modules live under `modules/`:

```
modules/
  oil-lubrication/
  oil-analysis/
  vibration-analysis/
  reliability-measurements/
  compressors/
```

---

## Standard Module Structure

```
modules/<domain>/
  package.json          — name: @acc-reliability/<domain>
  tsconfig.json         — extends root, strict mode
  src/
    index.ts            — public API surface (exports only)
    types.ts            — domain-specific TypeScript types and interfaces
    errors.ts           — domain error classes extending PlatformError
    <domain>.service.ts — main domain service (business logic)
    <domain>.repository.ts — storage access via Storage Abstraction
    <subdomain>/        — sub-domain folders if needed
```

Only what is exported from `src/index.ts` is part of the module's public API. Internal files are implementation details.

---

## Module Dependencies

A module's `package.json` dependencies must follow this pattern:

```json
{
  "dependencies": {
    "@acc-reliability/sdk": "*",
    "@acc-reliability/shared-types": "*"
  },
  "peerDependencies": {
    "@acc-reliability/shared-ui": "*"
  }
}
```

Modules must **not** list `@acc-reliability/kernel`, `@acc-reliability/services`, or `@acc-reliability/storage` as direct dependencies. Access to these is provided through the SDK.

---

## Registering a Module

Every module must register itself with the `ModuleRegistry` during platform initialization:

```typescript
import type { PlatformContext } from '@acc-reliability/kernel';

export function registerOilLubricationModule(context: PlatformContext): void {
  context.modules.register(
    'oil-lubrication',       // moduleId — kebab-case, unique
    'Oil Lubrication',       // displayName — human readable
    '1.0.0'                  // version — semver
  );
  context.modules.enable('oil-lubrication');
}
```

The `PlatformContext` is always passed in — never imported as a global.

---

## Business Logic Rules

- Business logic lives in **service classes**, not in repositories, components, or routers.
- Services receive their dependencies (logger, repositories, other services) via **constructor injection**.
- Services must never call `bootstrapPlatform()` or access the kernel directly.

```typescript
import type { ILogger } from '@acc-reliability/kernel';
import type { IOilLubricationRepository } from './oil-lubrication.repository';

export class OilLubricationService {
  constructor(
    private readonly repo: IOilLubricationRepository,
    private readonly logger: ILogger
  ) {}

  async getEquipmentRecord(equipmentId: string): Promise<OilRecord> {
    this.logger.debug('Fetching oil record', { equipmentId });
    // domain logic here
    return this.repo.findByEquipmentId(equipmentId);
  }
}
```

---

## Module Communication Rule

Modules **never call each other directly**. If Module A needs data owned by Module B:

1. **Today**: route through a Platform Service that both modules consume.
2. **Future (Event Bus)**: publish a domain event; Module B subscribes. Write event-ready domain logic now but do not implement the bus.

---

## Equipment Identifier

Every repository method and service method that works with equipment must use `Equipment_ID` as the primary key. Never create an alternative identifier for equipment.

---

## Contractor Isolation

Every data record must carry a contractor identifier. Repository queries must filter by contractor. Never return cross-contractor data in a single query result.

---

## UI Layer

If a module exposes UI components, they must live in a dedicated `ui/` subdirectory and contain only presentational concerns. Business rules must not appear inside React components.

```
src/
  ui/
    OilRecordTable.tsx    — presentational only
    OilRecordForm.tsx     — presentational only
```

---

## Related Documents

- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) — layer model and dependency rules
- [PLATFORM_KERNEL_REFERENCE.md](./PLATFORM_KERNEL_REFERENCE.md) — PlatformContext and registries
- [STORAGE_ABSTRACTION_GUIDE.md](./STORAGE_ABSTRACTION_GUIDE.md) — how to write repositories
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) — TypeScript and naming conventions
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — domain error types
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules

---

*End of document.*
