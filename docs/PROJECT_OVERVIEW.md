# PROJECT_OVERVIEW.md

# ACC Reliability Platform — Project Overview

Version: 1.0  
Status: Active

---

## What This Platform Is

The ACC Reliability Platform is an enterprise engineering platform built to manage industrial equipment reliability operations across multiple contractor organizations. It is expected to operate for **more than 10 years** and must prioritize maintainability, reliability, scalability, and extensibility over any short-term convenience.

This is not a prototype or internal tool. Every engineering decision must favor long-term quality.

---

## Business Domain

The platform supports reliability engineering disciplines including:

| Domain | Module |
|---|---|
| Oil Lubrication | `modules/oil-lubrication` |
| Oil Analysis | `modules/oil-analysis` |
| Vibration Analysis | `modules/vibration-analysis` |
| Reliability Measurements | `modules/reliability-measurements` |
| Compressors | `modules/compressors` |

---

## Contractor Organizations

The platform operates under strict **contractor isolation**. Each contractor manages their own equipment data independently. Current contractors:

- **ACC** — primary operator
- **RHI** — contractor
- **ASEC** — contractor

Future contractors must be supported without architectural redesign. Contractor identity is a first-class concern in every data model, storage operation, and access control decision.

---

## Applications

| Application | Purpose | Package |
|---|---|---|
| Owner Center | ACC internal operations | `apps/owner-center` |
| Contractor Portal | Contractor-facing interface | `apps/contractor-portal` |
| Mobile | Field access | `apps/mobile` |

---

## Equipment Identifier

`Equipment_ID` is the **single master identifier** for equipment across the entire platform. No alternative equipment keys shall be introduced. Every module, service, and storage record that references equipment must use `Equipment_ID`.

---

## Long-Term Roadmap

Current implementation priorities in order:

1. Platform Kernel
2. Platform Services
3. Storage Abstraction
4. Platform SDK
5. App — Owner Control Center
6. Existing Module Migration
7. Event Bus
8. AI Integration
9. External Integrations
10. SQL Migration

The codebase must be written to accommodate future stages without requiring rewrites of earlier work.

---

## Related Documents

- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules for all contributors
- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) — layered architecture and package structure
- [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md) — how to build business modules
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) — per-milestone process

---

*End of document.*
