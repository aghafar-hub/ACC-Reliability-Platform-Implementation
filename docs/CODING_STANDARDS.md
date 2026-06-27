# CODING_STANDARDS.md

# ACC Reliability Platform — Coding Standards

Version: 1.0  
Status: Active

---

## TypeScript Configuration

All packages use TypeScript in **strict mode**. The following compiler options are mandatory:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Never disable compiler checks with `@ts-ignore` or `@ts-expect-error` unless accompanied by a detailed comment explaining why it is unavoidable.

---

## Naming Conventions

| Concept | Convention | Example |
|---|---|---|
| Interfaces | `I` prefix | `ILogger`, `IServiceRegistry` |
| Classes | PascalCase | `ServiceRegistry`, `PlatformLogger` |
| Types / Enums | PascalCase | `LogLevel`, `ModuleStatus` |
| Functions | camelCase | `bootstrapPlatform`, `loadPlatformConfig` |
| Constants | SCREAMING_SNAKE | `LOG_LEVEL_PRIORITY` |
| Files | kebab-case | `service-registry.ts`, `config-loader.ts` |
| Packages | `@acc-reliability/<name>` | `@acc-reliability/kernel` |
| Module IDs | kebab-case | `'oil-lubrication'` |
| Service IDs | dot-namespaced | `'platform.logger'`, `'platform.config'` |

---

## File Size and Focus

- Keep files small and focused on a single responsibility.
- If a file exceeds ~200 lines, consider splitting it.
- One class or one cohesive set of related functions per file.
- The `index.ts` of any package is a re-export barrel only — no logic.

---

## Design Principles

### Clean Architecture
Business logic lives in the domain layer (services, entities). Infrastructure concerns (storage, HTTP, logging output) live in outer layers. Dependencies point inward.

### SOLID
- **S** — each class has one reason to change
- **O** — extend via new implementations, not modification
- **L** — subtypes fulfill their base contract without surprises
- **I** — small, focused interfaces over large general ones
- **D** — depend on abstractions (`ILogger`, `IServiceRegistry`), not concretes

### Dependency Injection
Pass dependencies into constructors. Never instantiate infrastructure inside business logic. Never use module-level singletons except for bootstrap-phase utilities (e.g., `kernelLogger`).

### Composition Over Inheritance
Prefer interface composition. Use inheritance only when there is a genuine is-a relationship (e.g., `ConfigurationError extends PlatformError`).

---

## Interfaces Over Concrete Types

Consume interfaces in business code:

```typescript
// Good — depends on abstraction
constructor(private readonly logger: ILogger) {}

// Bad — depends on concrete class
constructor(private readonly logger: PlatformLogger) {}
```

---

## Immutability

Use `readonly` on class properties and interface members wherever the value should not change after construction. Use `Object.freeze()` for runtime-immutable objects (e.g., `PlatformContext`).

---

## No Magic Strings

Extract repeated literal values to named constants. Use TypeScript union types and enums instead of raw string literals where the set of valid values is finite.

```typescript
// Good
type PlatformEnvironment = 'development' | 'staging' | 'production';

// Bad
function isProduction(env: string): boolean {
  return env === 'production';
}
```

---

## Async / Await

Use `async/await` for all asynchronous code. Do not mix Promise chains (`.then/.catch`) with async/await in the same function. Wrap all async entry points in try/catch that produces meaningful errors.

---

## Comments

Write comments that explain **why**, not what. Avoid restating what the code already says.

```typescript
// Good — explains a non-obvious constraint
// Preserve prototype chain in transpiled environments
Object.setPrototypeOf(this, new.target.prototype);

// Bad — narrates the obvious
// Set the name property
this.name = 'PlatformError';
```

---

## Imports

- Use named exports; avoid default exports.
- Import types using `import type { … }` to prevent accidental value imports.
- Group imports: external packages → platform packages → local files.
- No circular imports. If a circular dependency appears, the responsibility boundary is wrong.

---

## React Components (UI)

- Components are presentational — they receive data and callbacks via props.
- No business logic inside components.
- No direct service or repository calls inside components.
- State management follows the pattern established in `shared-ui`.

---

## Related Documents

- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — error class conventions
- [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md) — module file structure
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules

---

*End of document.*
