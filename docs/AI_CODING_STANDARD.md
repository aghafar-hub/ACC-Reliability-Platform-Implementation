# AI_CODING_STANDARD.md

# ACC Reliability Platform — AI Coding Standard

Version: 1.0  
Status: Active

---

## Purpose

This document is the quick-reference coding standard for AI agents working on this codebase. Read it before writing any code. For full detail on each topic see [CODING_STANDARDS.md](./CODING_STANDARDS.md).

---

## Non-Negotiable Rules

1. **TypeScript strict mode always.** `tsc --noEmit` must pass with zero errors before a milestone is complete.
2. **No `any`.** Implicit or explicit `any` is prohibited unless annotated with an explanation.
3. **No swallowed exceptions.** Every `catch` block must rethrow, wrap, or log-then-rethrow.
4. **No hardcoded secrets.** Passwords, tokens, API keys must never appear in source.
5. **No direct module-to-module imports.**
6. **No direct storage access from modules.** All storage flows through repository interfaces.
7. **`Equipment_ID` is the only equipment key.**
8. **Every data operation requires `contractorId`.**

---

## File Naming

| Type | Convention | Example |
|---|---|---|
| TypeScript source | kebab-case | `config-manager.ts` |
| React component | PascalCase | `OilRecordTable.tsx` |
| Test file | `<name>.test.ts` | `config-manager.test.ts` |
| Barrel | `index.ts` | — |

Barrel files (`index.ts`) re-export only — no logic inside them.

---

## Naming

| Concept | Convention |
|---|---|
| Interfaces | `I` prefix (`ILogger`, `IConfigManager`) |
| Classes | PascalCase |
| Types / Union types | PascalCase |
| Functions | camelCase |
| Constants (module-level, immutable) | SCREAMING_SNAKE |
| Packages | `@acc-reliability/<name>` |
| Service IDs | dot-namespaced (`platform.logger`) |
| Module IDs | kebab-case (`oil-lubrication`) |
| Env vars | `ACC_<GROUP>_<FIELD>` |

---

## Dependency Injection

All dependencies are injected through constructors. Never instantiate infrastructure inside a class body.

```typescript
// Correct
class MyService {
  constructor(
    private readonly logger: ILogger,       // injected
    private readonly repo: IMyRepository    // injected
  ) {}
}

// Wrong
class MyService {
  private readonly logger = new PlatformLogger();  // hidden instantiation
}
```

---

## Interfaces Before Implementations

Always define a public interface before writing a class:

```typescript
export interface IConfigManager {
  load(): Promise<Readonly<AppConfig>>;
  get(): Readonly<AppConfig>;
  reload(): Promise<Readonly<AppConfig>>;
  isLoaded(): boolean;
}

export class ConfigManager implements IConfigManager { ... }
```

Consumers depend on `IConfigManager`, not `ConfigManager`.

---

## Error Handling

```typescript
// Correct
try {
  return await this.repo.find(id, contractorId);
} catch (error) {
  this.logger.error('Failed to retrieve record', { id, error: String(error) });
  throw new DomainError('Record retrieval failed', 'DOMAIN_RECORD_NOT_FOUND', { id });
}

// Wrong — do not do this
try {
  return await this.repo.find(id, contractorId);
} catch (_) { }
```

Use domain-specific error classes. Every error must have a code in SCREAMING_SNAKE format.

---

## Comments

Write comments that explain *why*, not *what*:

```typescript
// Correct — explains a constraint
// Preserve prototype chain when transpiling to ES5
Object.setPrototypeOf(this, new.target.prototype);

// Wrong — restates the obvious
// Set the name property
this.name = 'Error';
```

---

## Immutability

- Mark all interface properties `readonly`.
- Use `Object.freeze()` on objects that must be immutable at runtime.
- When using `Object.freeze<T>()`, always provide the explicit type parameter to prevent TypeScript from widening string literals.

```typescript
// Correct — type parameter prevents literal widening
Object.freeze<StorageGroup>({ provider: 'GoogleSheets', ... });

// Wrong — 'GoogleSheets' gets widened to string
Object.freeze({ provider: 'GoogleSheets', ... });
```

---

## Imports

```typescript
// Correct
import type { ILogger, LogLevel } from '../logger';    // type-only import
import { PlatformLogger } from '../logger';             // value import

// Wrong — mixing type and value in a plain import when only types are needed
import { ILogger, PlatformLogger } from '../logger';
```

Group order: external packages → platform packages → local.

---

## Async

Always `async/await`. Never mix `.then()/.catch()` chains with `async/await` in the same function.

---

## File Size

Keep files under ~200 lines. If a file is growing, split by responsibility. One class per file (except trivially small related classes).

---

## What Not to Build in This Milestone

Always confirm scope. Common mistakes:
- Do not add UI code to platform packages.
- Do not implement Event Bus logic (roadmap item 7).
- Do not implement actual storage adapters (only interfaces/config).
- Do not implement auth logic in modules (platform service responsibility).

---

## Related Documents

- [CODING_STANDARDS.md](./CODING_STANDARDS.md) — full engineering standards
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — error patterns
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) — per-milestone checklist
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — master engineering rules

---

*End of document.*
