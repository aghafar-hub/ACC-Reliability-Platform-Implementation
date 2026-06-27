# ARCHITECTURE_OVERVIEW.md

# ACC Reliability Platform — Architecture Overview

Version: 1.0  
Status: Active

---

## Guiding Principle

The architecture repository (`../ACC-Reliability-Platform-Architecture`) is the **source of truth**. Implementation must never contradict the approved architecture. If a conflict is discovered: stop, report, and do not invent a solution.

---

## Layer Model

The platform is organized into three distinct layers. Dependencies only flow **downward** — upper layers consume lower layers; lower layers never depend on upper ones.

```
┌─────────────────────────────────────────┐
│              apps/                       │  Applications (UI shells)
│  owner-center  contractor-portal  mobile │
└───────────────────┬─────────────────────┘
                    │ consume
┌───────────────────▼─────────────────────┐
│              modules/                    │  Business Logic
│  oil-lubrication   oil-analysis          │
│  vibration-analysis   compressors  …     │
└───────────────────┬─────────────────────┘
                    │ consume
┌───────────────────▼─────────────────────┐
│              platform/                   │  Platform Infrastructure
│  kernel  services  sdk  storage          │
│  shared-types  shared-ui                 │
└─────────────────────────────────────────┘
```

---

## Package Responsibilities

### `platform/kernel`
Bootstrap, configuration loading, `PlatformContext`, `ServiceRegistry`, `ModuleRegistry`, `PlatformLogger`, and platform error types. This is the lowest-level package — it has **no runtime dependencies** on other platform packages.

See [PLATFORM_KERNEL_REFERENCE.md](./PLATFORM_KERNEL_REFERENCE.md) for the full API.

### `platform/services`
Cross-cutting platform capabilities: authentication, authorization, notifications, audit logging, and any other concern shared across multiple modules. Services are registered in the kernel's `ServiceRegistry` and consumed by modules via dependency injection.

### `platform/sdk`
The public API surface that business modules use to interact with the platform. Modules must consume the SDK — not import platform internals directly.

### `platform/storage`
Storage abstraction layer. Provides a repository interface that currently persists to Google Sheets, but is designed for future SQL migration without requiring module changes.

See [STORAGE_ABSTRACTION_GUIDE.md](./STORAGE_ABSTRACTION_GUIDE.md) for the full design.

### `platform/shared-types`
TypeScript types and interfaces shared across all layers (e.g., `Equipment_ID`, contractor enums, common result types). No runtime code.

### `platform/shared-ui`
Reusable React component library shared across applications. Contains presentational components only — no business logic.

### `modules/*`
Self-contained business domain modules. Each module is independently deployable, has its own `package.json`, and contains only domain-specific logic. See [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md).

### `apps/*`
Application shells that compose modules and platform UI into deployable products. Routing, layout, and shell-level concerns live here.

---

## Dependency Rules

| From | To | Allowed? |
|---|---|---|
| `apps/*` | `modules/*` | Yes |
| `apps/*` | `platform/*` | Yes |
| `modules/*` | `platform/sdk` | Yes |
| `modules/*` | `platform/shared-types` | Yes |
| `modules/*` | `platform/shared-ui` | Yes |
| `modules/*` | `modules/*` | **No** |
| `modules/*` | `platform/kernel` (internal) | **No** — use SDK |
| `platform/*` | `modules/*` | **No** |
| `platform/kernel` | `platform/services` | **No** |

---

## Module Communication

Direct module-to-module calls are **prohibited**. Current approach: shared state flows through Platform Services. Future approach: an Event Bus (roadmap item 7). Write code that is event-ready but do not implement the bus yet.

---

## Monorepo Tooling

The repository is an npm workspaces monorepo accelerated by **Turborepo** (`turbo.json`). Build tasks declare dependencies with `"dependsOn": ["^build"]` so the build graph is computed automatically.

Package naming convention: `@acc-reliability/<package-name>`.

---

## Related Documents

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) — platform goals and domain context
- [PLATFORM_KERNEL_REFERENCE.md](./PLATFORM_KERNEL_REFERENCE.md) — kernel API
- [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md) — module structure
- [STORAGE_ABSTRACTION_GUIDE.md](./STORAGE_ABSTRACTION_GUIDE.md) — storage layer
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules

---

*End of document.*
