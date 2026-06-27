# IMPLEMENTATION_CHECKLIST.md

# ACC Reliability Platform — Implementation Checklist

Version: 1.0  
Status: Active

---

## Purpose

This document defines the mandatory process for every implementation milestone on the ACC Reliability Platform. Follow this checklist for every piece of work — no exceptions.

---

## Before Starting

- [ ] Read [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) if this is a new session.
- [ ] Identify the single capability this milestone delivers.
- [ ] Confirm the work does not contradict the approved architecture (`../ACC-Reliability-Platform-Architecture`).
- [ ] Confirm the work fits within a single layer (platform, module, or app) without mixing concerns.
- [ ] If uncertain about scope or approach: **ask, do not guess**.

---

## During Implementation

### Architecture
- [ ] Dependencies flow in the correct direction (apps → modules → platform).
- [ ] No business module imports from another business module.
- [ ] No module directly accesses storage — all access via repository interfaces.
- [ ] No secrets, API keys, or tokens are hardcoded.
- [ ] `Equipment_ID` is used as the sole equipment identifier.
- [ ] Every data operation includes `contractorId` for isolation.

### TypeScript
- [ ] TypeScript strict mode is satisfied (`tsc --noEmit` passes with zero errors).
- [ ] No `any` types (implicit or explicit) without documented justification.
- [ ] No `@ts-ignore` or `@ts-expect-error` without explanation comment.
- [ ] All public interfaces are defined before implementations.
- [ ] `import type { … }` used for type-only imports.

### Code Quality
- [ ] Every class has a single, clear responsibility.
- [ ] Dependencies are injected via constructors — no hidden singletons.
- [ ] Interfaces are preferred over concrete types in function signatures.
- [ ] File sizes are reasonable (target < 200 lines per file).
- [ ] Meaningful names used for all identifiers — no abbreviations or single letters.

### Error Handling
- [ ] No `catch` block is empty or swallows exceptions silently.
- [ ] Errors extend `PlatformError` with a meaningful code and context.
- [ ] `Object.setPrototypeOf(this, new.target.prototype)` in every custom error constructor.
- [ ] Errors are logged with structured context before rethrowing.

### Logging
- [ ] Significant operations emit `info` log entries.
- [ ] Debug information emits `debug` log entries.
- [ ] Log context objects do not contain secrets or credentials.
- [ ] `correlationId` is passed through wherever available.

### UI (if applicable)
- [ ] Business logic is absent from React components.
- [ ] Components receive data via props or a dedicated state management layer.
- [ ] No direct repository or service calls inside components.

---

## Before Completing the Milestone

- [ ] `npm run build` (or `kernel:build`) succeeds with zero errors.
- [ ] `npm run type-check` (or `kernel:check`) passes with zero errors.
- [ ] The change delivers exactly one capability — unrelated work is not mixed in.
- [ ] No files outside `docs/` were created for documentation-only milestones.
- [ ] No existing code was modified without explicit instruction.

---

## Response Format

When reporting completion of a milestone, return only:

```
## Summary
<one or two sentences>

## Files Created
- path/to/file.ts

## Files Modified
- path/to/other.ts

## Commands to Run
npm run kernel:build

## Manual Testing Steps
1. ...

## Assumptions
- ...
```

Do not print entire source files unless specifically requested.

---

## When to Stop and Ask

Stop immediately and ask for clarification when:

- The required change would contradict the approved architecture.
- The scope of the milestone is unclear.
- Two valid approaches exist with significantly different trade-offs.
- A dependency would need to be added that was not anticipated.
- Existing code needs modification that was not explicitly requested.

**Never silently change architecture. Never guess.**

---

## Related Documents

- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — master engineering rules
- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) — layer model and dependency rules
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) — TypeScript and naming conventions
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) — error patterns
- [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) — security rules

---

*End of document.*
