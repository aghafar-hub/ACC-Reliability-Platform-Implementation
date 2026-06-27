# STORAGE_ABSTRACTION_GUIDE.md

# ACC Reliability Platform — Storage Abstraction Guide

Version: 1.0  
Status: Active  
Package: `@acc-reliability/storage` (`platform/storage`) — *planned*

---

## Core Rule

Business modules must **never** communicate directly with Google Sheets, any spreadsheet API, or any other storage technology.

All storage access flows through the **Storage Abstraction layer**. This ensures that the planned future migration to SQL requires zero rewrites inside business modules.

---

## Design Model

The storage layer is built on the **Repository pattern**:

```
Business Module
  └─ calls → IEquipmentRepository (interface, in shared-types)
                └─ implemented by → GoogleSheetsEquipmentRepository (in platform/storage)
                └─ implemented by → SqlEquipmentRepository (future)
```

Modules depend only on the **interface**. The concrete implementation is injected via the Platform SDK at runtime. Swapping the storage backend is a platform concern, not a module concern.

---

## Repository Interface Convention

Define a repository interface in `platform/shared-types` (or within the module's `src/types.ts` if it is domain-specific):

```typescript
export interface IOilRecordRepository {
  findByEquipmentId(
    equipmentId: string,
    contractorId: ContractorId
  ): Promise<OilRecord | null>;

  findAll(
    contractorId: ContractorId,
    options?: QueryOptions
  ): Promise<OilRecord[]>;

  save(record: OilRecord): Promise<void>;

  delete(recordId: string, contractorId: ContractorId): Promise<void>;
}
```

Rules:
- Every read method accepts `contractorId` — **contractor isolation is mandatory**.
- Every write method accepts `contractorId` — never write cross-contractor data.
- Methods are async and return typed results, never raw sheet values.
- Use `Equipment_ID` as the primary equipment key in all methods.

---

## QueryOptions

Repositories should accept a standard `QueryOptions` object for pagination and filtering:

```typescript
export interface QueryOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}
```

This interface will remain stable across the Google Sheets and SQL implementations.

---

## Current Implementation: Google Sheets

The current storage backend uses the Google Sheets API / Google Apps Script PropertiesService. Key constraints:

- Sheets are accessed via batch read/write operations to minimize API calls.
- No direct cell manipulation — always read and write complete row objects.
- Sheet names correspond to domain entities (e.g., `OilRecords`, `Equipment`).
- Row-to-entity mapping is handled inside the repository implementation, not in business services.

---

## Performance Rules for Storage

- **Batch reads**: read all required rows in one API call, not row-by-row.
- **Caching**: cache frequently accessed reference data (equipment lists, contractor lists) with a short TTL.
- **Lazy loading**: do not pre-fetch data that may not be needed.
- **Minimal API calls**: aggregate queries before calling the storage layer.

---

## Future: SQL Migration

When the platform migrates to SQL:

1. A new `SqlXxxRepository` class is created in `platform/storage`.
2. It implements the same interface as the Sheets version.
3. The Platform SDK's dependency injection swaps the implementation.
4. **Business modules require no changes.**

This migration path is only valid if every module follows the repository interface pattern without exception.

---

## What Never Belongs in a Module

| Prohibited in a module | Correct location |
|---|---|
| `SpreadsheetApp.openById(…)` | `platform/storage` implementation |
| `sheet.getRange(…)` | `platform/storage` implementation |
| SQL queries | `platform/storage` implementation |
| Connection strings | Platform configuration / environment variables |
| Raw sheet row arrays | `platform/storage` (map before returning) |

---

## Related Documents

- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) — layer model
- [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md) — how modules use repositories
- [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) — credential and secret handling
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules

---

*End of document.*
