# Oil Lubrication Module v2 — Assessment & Master Implementation Roadmap

**Document Status:** Active  
**Prepared:** 2026-07-01  
**Repository:** ACC-Reliability-Platform-Implementation  
**Platform Baseline:** Core RC1 (PAT Passed — Architecture Frozen)  
**Module Target:** `@acc-reliability/oil-lubrication` v2.0.0  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Capability Assessment](#2-platform-capability-assessment)
3. [Business Reference Extraction](#3-business-reference-extraction)
4. [Reuse Assessment](#4-reuse-assessment)
5. [What Must Be Implemented](#5-what-must-be-implemented)
6. [What Should Be Redesigned](#6-what-should-be-redesigned)
7. [What Should NOT Be Carried Forward](#7-what-should-not-be-carried-forward)
8. [Master Implementation Roadmap](#8-master-implementation-roadmap)
9. [Sprint Breakdown](#9-sprint-breakdown)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Dependencies](#11-dependencies)
12. [Recommendations](#12-recommendations)

---

## 1. Executive Summary

The ACC Reliability Platform Core RC1 is complete and frozen. It provides a mature, layered infrastructure — kernel, services, SDK facade, dynamic shell, permission system, repository pattern, and all cross-cutting integrations — that fully supports native business module development without further modification.

The existing `modules/oil-lubrication` package is a **domain scaffold only**: typed entities, one repository adapter, and minimal CRUD service for oil change records. No UI workflows, no lubrication point implementation, no route management, no sampling, no forecasting, no reporting, and no platform integrations are wired. The Owner Center shell already declares the module's navigation structure with seven sub-routes — all rendering the same placeholder page.

**Oil Lubrication Module v2** will be built ground-up as a native platform module, using the scaffold types and the platform SDK exclusively. All business logic will be derived from the business reference contained in the platform contracts, manifest declarations, seeded report definitions, and the existing domain model — not from any legacy codebase.

The module divides naturally into **11 independently testable sprints** across three phases:

| Phase | Sprints | Focus |
|-------|---------|-------|
| Foundation | 01–02 | Module scaffold, domain layer, LP management |
| Core Workflows | 03–07 | Oil Change, Routes, Technician, Sampling, Forecasting |
| Integration & Delivery | 08–11 | Reporting, Dashboard, Settings, Platform integration |

---

## 2. Platform Capability Assessment

### 2.1 SDK Clients Available to Modules

All platform capabilities are accessed exclusively through `@acc-reliability/sdk`. The following clients are available and tested (RC1):

| Client | `sdk.*` | Capability |
|--------|---------|------------|
| Auth | `sdk.auth` | Session, current user, login/logout |
| Permissions | `sdk.permissions` | Role-based and resource-based checks |
| Storage | `sdk.storage` | `getRepository<T>(entityType)` — contractor-scoped repositories |
| Notifications | `sdk.notifications` | Send, list, mark-read; typed notification records |
| Notification Management | `sdk.notificationManagement` | Rule configuration per module |
| Audit | `sdk.audit` | Emit structured audit entries |
| Workflow | `sdk.workflow` / `sdk.workflows` | Submit approvals, check workflow state |
| Reporting | `sdk.reporting` | Register report definitions, export |
| Health | `sdk.health` | Register/report module health |
| Metrics | `sdk.metrics` | Emit custom telemetry |
| Users | `sdk.users` | Resolve user profiles |
| Contractors | `sdk.contractors` | Contractor metadata |
| Modules | `sdk.modules` | Module Registry state |
| Config | `sdk.config` | Runtime feature flags and settings |

### 2.2 Shell Capabilities (Owner Center)

| Capability | Status | Mechanism |
|------------|--------|-----------|
| Dynamic routing | Active | `UIModuleManifest.routePath` + `AppRouter` |
| Dynamic sidebar navigation | Active | `UIModuleManifest.moduleNavItems` |
| Sub-module navigation | Active | `moduleNavItems[]` in manifest |
| Permission guards (UI) | Active | `Can`, `CanView`, `CanCreate`, `CanUpdate`, `CanDelete`, `CanApprove`, `CanExport` |
| Route permission gates | Active | `PermissionRoute`, `ProtectedRoute` |
| Notification bell | Active | `NotificationBell`, `useNotifications()` |
| Module lifecycle management | Active | `ModuleRegistryContext`, lifecycle states |
| Health check registration | Active | `hasHealthCheck: true` + lifecycle key |
| Bilingual navigation (EN/AR) | Active | `navigationLabel: { en, ar }` |
| Breadcrumbs | Active | `Breadcrumb` component |
| Status chips | Active | `StatusChip` component |
| Summary cards | Active | `SummaryCard`, `SectionCard` |
| Error boundaries | Active | `ErrorBoundary` |
| Command palette search | Active | `CommandPalette` |

### 2.3 Platform Services in Scope for This Module

| Service | Integration Point | Module Use |
|---------|------------------|------------|
| Notification Service | `sdk.notifications` | Alert on overdue, route assignment, sampling due |
| Audit Service | `sdk.audit` | Log all data mutations and approvals |
| Workflow Service | `sdk.workflows` | Approval flows for route sign-off, record corrections |
| Reporting Service | `sdk.reporting` | Lubrication compliance report, oil history report |
| Health Service | `sdk.health` | Module health derived from data freshness and overdue rates |
| Permission Service | `sdk.permissions` | Technician vs. Engineer vs. Manager access control |
| Metrics Service | `sdk.metrics` | Overdue count, compliance rate, route completion KPIs |

### 2.4 Storage Abstraction

The storage layer provides `IRepository<T>` via `sdk.storage.getRepository<T>(entityType)`. Contractor isolation is embedded at repository creation time — no `contractorId` parameter is needed on individual queries. The local-storage dev stack is ready. Google Sheets and SQL adapters are platform concerns, not module concerns.

### 2.5 Platform Events System (Current State)

The event bus is **not yet implemented** in the platform (planned, Phase 9). Platform contracts for oil-lubrication events exist as typed interfaces only:

| Event / Message | Type | Direction | Planned Consumer |
|-----------------|------|-----------|-----------------|
| `OilChangeCompleted` | Event | Published by module | `oil-analysis`, `action-service` |
| `RouteAssigned` | Event | Published by module | `contractor-portal`, `notification-service` |
| `RouteCompleted` | Event | Published by module | `owner-center`, `reliability-measurements`, `action-service` |
| `OilChangeRequested` | Message | Consumed by module | Triggers scheduling |

**Decision for v2:** Implement domain logic as event-ready but defer bus wiring to Sprint 11 (integration sprint), consistent with platform roadmap.

---

## 3. Business Reference Extraction

This section consolidates all business knowledge from the platform scaffold, contracts, seeded data, and manifest declarations. This is the authoritative business reference for v2 implementation — no external legacy codebase.

### 3.1 Core Domain Entities

#### Equipment (Platform-Managed)
- Identified by `EquipmentId` (master Equipment_ID)
- Owned by a contractor
- The oil lubrication module does not own equipment; it references equipment by Equipment_ID
- Every lubrication operation is scoped to `(equipmentId, contractorId)`

#### LubricationPoint (LP_ID Record)
A named physical location on equipment where lubrication is applied.

| Field | Type | Notes |
|-------|------|-------|
| `lubricationPointId` | `LubricationPointId` | LP_ID business key, immutable |
| `equipmentId` | `EquipmentId` | One equipment, many points |
| `contractorId` | `ContractorId` | Contractor isolation, immutable |
| `name` | `string` | e.g. "Main Bearing" |
| `location` | `string?` | Physical description |
| `lubricantSpec` | `string?` | e.g. "ISO VG 46" |
| `frequency` | `OilChangeFrequency?` | Scheduling interval |
| `isActive` | `boolean` | Soft-delete only, history preserved |
| `createdAt` / `updatedAt` | `IsoTimestamp` | Audit timestamps |

**Business rules:**
- One equipment → many lubrication points
- Hard delete is prohibited; use `deactivate()` (sets `isActive = false`)
- Identity fields are immutable after creation

#### OilChangeRecord
A single oil change event performed on equipment.

| Field | Type | Notes |
|-------|------|-------|
| `equipmentId` | `EquipmentId` | Required |
| `contractorId` | `ContractorId` | Required, immutable |
| `lubricationPointId` | `LubricationPointId?` | When equipment has named LP_IDs |
| `status` | `OilChangeStatus` | Lifecycle |
| `source` | `OilChangeSource` | Trigger type |
| `oilType` | `string` | Specification |
| `quantityLitres` | `number` | Volume |
| `performedAt` | `IsoTimestamp` | Field execution time |
| `completedBy` | `UserId` | Technician who recorded |
| `workOrderId` | `string?` | Maintenance work order link |
| `notes` | `string?` | Field notes |

**Status lifecycle:** `scheduled` → `in-progress` → `completed` | `cancelled`; overdue detection elevates `scheduled` → `overdue` when past due date.

**Source types:** `manual`, `work-order`, `preventive-maintenance`, `inspection`

#### OilChangeFrequency (Value Object)
Scheduling interval: `intervalDays` (calendar), `intervalOperatingHours` (usage-based), or both (whichever is sooner governs).

### 3.2 Inferred Business Entities (v2 New)

The following entities are implied by the platform contracts, navigation stubs, and planned events but do not yet exist as types in the module:

#### LubricationRoute
A named collection of lubrication points across one or more equipment units, assigned to a technician for field execution.

| Key Fields | Notes |
|------------|-------|
| `routeId` | Stable route identifier |
| `routeName` | Descriptive name |
| `contractorId` | Contractor scoped |
| `assignedTo` | `UserId` of technician |
| `assignedBy` | `UserId` of manager/engineer |
| `scheduledDate` | Date route must be executed |
| `equipmentIds[]` | Equipment in scope |
| `status` | `draft` / `assigned` / `in-progress` / `completed` / `cancelled` |

#### RouteItem
Individual task within a route (one per lubrication point or equipment).

#### OilSample
Oil sample taken from equipment, submitted for laboratory analysis.

| Key Fields | Notes |
|------------|-------|
| `sampleId` | Unique sample ID |
| `equipmentId` / `lubricationPointId?` | Source |
| `sampledAt` | Field collection time |
| `sampledBy` | Technician |
| `labReferenceId?` | Lab tracking number |
| `status` | `collected` / `submitted` / `in-lab` / `results-ready` |
| `triggeringSampleId` | For follow-up samples |

#### OilChangeSchedule
Forecasted next service date for a lubrication point, derived from frequency + last change + operating hours.

### 3.3 Business Workflows

#### Workflow 1: Oil Change Recording
1. Technician selects equipment and lubrication point
2. Records oil type, quantity, date performed
3. Optionally links to work order
4. System marks record `completed`, publishes `OilChangeCompleted` event
5. Notification sent to manager/engineer on completion

#### Workflow 2: Lubrication Point Registration
1. Engineer or ContractorAdmin registers LP_ID for equipment
2. Assigns lubricant specification and change frequency
3. System begins tracking scheduling for that point
4. Points can be deactivated (never hard-deleted)

#### Workflow 3: Route Management
1. Manager or Engineer creates a lubrication route (list of equipment/LP_IDs)
2. Route is assigned to a technician with a scheduled date
3. Platform publishes `RouteAssigned` event → notification to technician
4. Technician executes route in field, marking items complete
5. On all items complete, route moves to `completed`, `RouteCompleted` event published

#### Workflow 4: Technician Route Execution
1. Technician opens assigned routes from dashboard
2. Views route items in priority/location order
3. For each item: records oil change data, quantity, notes
4. Photo attachment supported (linked asset reference)
5. Marks item complete; progress tracked in real time

#### Workflow 5: Oil Sampling
1. Sampling request created (manual or triggered by `OilChangeCompleted`)
2. Technician collects physical sample, records details
3. Sample submitted with lab reference number
4. Lab results entered when received
5. Results linked to equipment history; anomalies trigger notifications

#### Workflow 6: Forecasting & Scheduling
1. System calculates next oil change date from frequency + last completed change
2. Operating hours-based forecasting when hours data available
3. Overdue records auto-elevated in status
4. Forecast dashboard shows upcoming, overdue, and critical assets
5. `OilChangeRequested` message triggers scheduling workflow

#### Workflow 7: Approval Workflows
- Record corrections require manager approval (platform workflow service)
- Route sign-off by engineer after completion review
- Oil type specification deviations require engineer sign-off

### 3.4 User Roles & Permissions Matrix

| Action | AppOwner | ContractorAdmin | ContractorManager | ContractorEngineer | ContractorTechnician | ExternalContractor |
|--------|----------|-----------------|-------------------|--------------------|----------------------|--------------------|
| View dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (own routes) |
| View equipment history | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (own) |
| Record oil change | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/edit lubrication points | ✓ | ✓ | ✓ | ✓ | — | — |
| Create routes | ✓ | ✓ | ✓ | ✓ | — | — |
| Assign routes | ✓ | ✓ | ✓ | ✓ | — | — |
| Execute routes | — | — | — | — | ✓ | ✓ |
| Request samples | — | ✓ | ✓ | ✓ | ✓ | — |
| Enter lab results | — | ✓ | ✓ | ✓ | — | — |
| View forecasts | ✓ | ✓ | ✓ | ✓ | ✓ (limited) | — |
| View reports | ✓ | ✓ | ✓ | ✓ | — | — |
| Export reports | ✓ | ✓ | ✓ | ✓ | — | — |
| Configure settings | ✓ | ✓ | ✓ | — | — | — |
| Approve corrections | ✓ | ✓ | ✓ | ✓ | — | — |

### 3.5 Reports

| Report Key | Name | Content |
|------------|------|---------|
| `lubrication-compliance` | Lubrication Compliance | Route adherence, missed tasks by equipment/period |
| `oil-change-history` | Oil Change History | Full chronological record per equipment/LP_ID |
| `overdue-lubrication` | Overdue Lubrication | Assets past due date with severity ranking |
| `oil-sampling-results` | Oil Sampling Results | Sample history, lab findings, anomalies |
| `route-completion-summary` | Route Completion Summary | Route completeness rates by technician/period |

### 3.6 KPIs & Dashboard Metrics

| KPI | Definition |
|-----|------------|
| Lubrication Compliance Rate | (Completed on-time / Total scheduled) × 100 |
| Overdue Count | Active records in `overdue` status |
| Active Routes | Routes in `assigned` or `in-progress` |
| Oil Changes This Month | Count of completed records in current month |
| Upcoming (7 days) | Lubrication points due within 7 days |
| Pending Samples | Samples in `collected` or `in-lab` status |

### 3.7 Notifications

| Trigger | Recipients | Priority |
|---------|------------|----------|
| Route assigned | Technician | High |
| Oil change overdue | Manager, Engineer | High |
| Route completed | Manager, Engineer | Medium |
| Oil change completed | Engineer | Low |
| Sample results ready | Engineer, Manager | Medium |
| Upcoming oil change (7 days) | Technician | Low |
| Record correction approval requested | Manager | High |

### 3.8 Bilingual Requirements (EN/AR)

All UI text, navigation labels, form labels, error messages, status labels, and report headings must support English and Arabic. The `LanguageContext` from the platform shell provides the active locale. RTL layout is handled by the shell CSS — module UI must be RTL-compatible.

### 3.9 Offline Requirements

Technicians may operate in environments with limited connectivity. The module must:
- Queue oil change records for sync when offline
- Display last-sync indicator
- Prevent data loss on connectivity interruption
- Not block route execution pending network response

**Platform status:** No offline/sync infrastructure exists in Platform RC1. This must be addressed in the module or deferred with a documented risk.

### 3.10 Photo / Attachment Requirements

Oil change records and route items should support photo attachments (equipment condition, oil samples, work evidence). The platform has no file storage abstraction in RC1. Photos are referenced as external URIs (Google Drive or similar). A thin attachment-reference model is sufficient for v2.

### 3.11 Google Drive & Google Sheets

- **Google Drive:** Photo attachments stored in Drive folders, referenced by URI in records. No direct Drive API calls in the module — URI provided by user input or future platform storage service.
- **Google Sheets:** All data persistence flows through `IRepository<T>` via the storage abstraction. The module never calls Sheets APIs directly.

---

## 4. Reuse Assessment

### 4.1 Platform Assets — Reuse Directly (No Changes)

| Asset | Package | Usage in Module |
|-------|---------|----------------|
| `IPlatformSdk` | `@acc-reliability/sdk` | Sole dependency injection point |
| `IRepository<T>` | `@acc-reliability/sdk` | All entity persistence |
| `ServiceResult<T>`, `ok()`, `err()` | `@acc-reliability/shared-types` | All service returns |
| `IsoTimestamp`, `nowIso()` | `@acc-reliability/shared-types` | All timestamp fields |
| `PlatformError` hierarchy | `@acc-reliability/sdk` | Domain error base classes |
| `ContractorId`, `UserId`, `EquipmentId`, `Entity` | `@acc-reliability/sdk` | Domain type imports |
| `QueryOptions`, `PagedQueryOptions`, `PageResult` | `@acc-reliability/sdk` | All repository query signatures |
| `INotificationsClient` | `@acc-reliability/sdk` | Notification publishing |
| `IAuditClient` | `@acc-reliability/sdk` | Audit logging |
| `IWorkflowsClient` | `@acc-reliability/sdk` | Approval workflows |
| `IReportingClient` | `@acc-reliability/sdk` | Report registration |
| `IHealthClient` | `@acc-reliability/sdk` | Health reporting |
| `IMetricsClient` | `@acc-reliability/sdk` | KPI telemetry |
| `ModuleManifest` | `@acc-reliability/sdk` | Backend manifest contract |

### 4.2 Owner Center Shell — Reuse Directly (No Changes)

| Component / Hook | Usage |
|-----------------|-------|
| `Can`, `CanView`, `CanCreate`, `CanUpdate`, `CanDelete`, `CanApprove`, `CanExport` | All permission-gated UI |
| `PermissionRoute` | Sub-route guards |
| `usePermissions()` | Programmatic permission checks |
| `SummaryCard` | Dashboard KPI cards |
| `SectionCard` | Module section containers |
| `StatusChip` | Record status badges |
| `ErrorBoundary` | All sub-page wrappers |
| `usePlatformSdk()` | SDK access in React components |
| `useAuth()` | Current user context |
| `useLanguage()` | EN/AR locale |
| `useNotifications()` | Notification state |
| `NotificationBell` | Shell-level (no module action needed) |

### 4.3 Existing Module Scaffold — Reuse with Extension

| Existing Asset | Reuse Decision | Notes |
|---------------|---------------|-------|
| `OilChangeRecord` (types.ts) | **Reuse as-is** | Well-designed; all fields correct |
| `LubricationPoint` (types.ts) | **Reuse as-is** | Well-designed; all fields correct |
| `OilChangeFrequency` (types.ts) | **Reuse as-is** | Correct value object |
| `OilChangeStatus` (types.ts) | **Reuse as-is** | All lifecycle states correct |
| `OilChangeSource` (types.ts) | **Reuse as-is** | All trigger types correct |
| `IOilChangeRecordRepository` (types.ts) | **Reuse as-is** | Interface is complete |
| `ILubricationPointRepository` (types.ts) | **Reuse as-is** | Interface is complete |
| `OilLubricationRepository` | **Reuse as base** | Extend with paged queries |
| `OilLubricationService` | **Extend** | Add scheduling, overdue, audit, notification |
| `OilLubricationError` hierarchy | **Extend** | Add domain-specific error codes |
| `OIL_LUBRICATION_MANIFEST` (manifest.ts) | **Extend** | Add dependencies, icon, category |
| `createOilLubricationService` factory | **Extend** | Wire additional services |
| `platform-manifests.ts` entry | **Extend sub-nav** | Already declared; routes need components |

### 4.4 Platform Manifests.ts — Existing Oil Lubrication Entry

The `platform-manifests.ts` already declares:

```
moduleId:    'oil-lubrication'
routePath:   '/oil-lubrication'
lifecycleKey: 'oil-lubrication'
moduleNavItems: [Dashboard, Oil Change, Sampling, Routes, Forecast, Reports, Settings]
```

**Action:** Replace `OilLubricationPage` (placeholder) with the module's real component tree. No changes to manifest structure needed. Sub-route components will be added.

---

## 5. What Must Be Implemented

### 5.1 Domain Layer (Module Package)

| Component | Type | Priority |
|-----------|------|----------|
| `LubricationRoute` entity + types | New entity | Must |
| `RouteItem` entity + types | New entity | Must |
| `OilSample` entity + types | New entity | Must |
| `OilChangeSchedule` entity + types | New entity | Must |
| `AttachmentReference` value object | New type | Must |
| `LubricationPointRepository` adapter | New class | Must |
| `LubricationRouteRepository` adapter | New class | Must |
| `OilSampleRepository` adapter | New class | Must |
| `LubricationPointService` | New class | Must |
| `LubricationRouteService` | New class | Must |
| `OilSampleService` | New class | Must |
| `ForecastingService` | New class | Must |
| Overdue detection logic | In service | Must |
| Scheduling calculations | In service | Must |
| Permission declarations (`OIL_LUBRICATION_PERMISSIONS`) | Constants | Must |
| Entity type constants (all new entities) | Constants | Must |
| Extended error codes | Extend existing | Must |
| Extended `createOilLubricationService` factory | Extend | Must |
| Module settings service | New class | Should |
| Event publication stubs (`OilChangeCompleted`, etc.) | Stubs | Should |
| Message consumption stub (`OilChangeRequested`) | Stub | Should |

### 5.2 UI Layer (Owner Center Pages)

| Page / Component | Route | Priority |
|-----------------|-------|----------|
| Module entry component (router) | `/oil-lubrication` | Must |
| Dashboard page | `/oil-lubrication` | Must |
| Oil Change list page | `/oil-lubrication/oil-change` | Must |
| Oil Change detail page | `/oil-lubrication/oil-change/:id` | Must |
| Oil Change create form | `/oil-lubrication/oil-change/new` | Must |
| Equipment selector component | shared | Must |
| Lubrication point selector | shared | Must |
| Equipment history view | `/oil-lubrication/oil-change?equipment=:id` | Must |
| Routes list page | `/oil-lubrication/routes` | Must |
| Route detail page | `/oil-lubrication/routes/:id` | Must |
| Route create form | `/oil-lubrication/routes/new` | Must |
| Route assignment form | `/oil-lubrication/routes/:id/assign` | Must |
| Technician route execution view | `/oil-lubrication/routes/:id/execute` | Must |
| Sampling list page | `/oil-lubrication/sampling` | Must |
| Sample create form | `/oil-lubrication/sampling/new` | Must |
| Sample detail / results page | `/oil-lubrication/sampling/:id` | Must |
| Forecast page | `/oil-lubrication/forecast` | Must |
| Overdue assets list | within forecast | Must |
| Upcoming schedule calendar/list | within forecast | Must |
| Reports page | `/oil-lubrication/reports` | Must |
| Settings page | `/oil-lubrication/settings` | Must |
| Lubrication point management | within settings | Must |
| Status chip variants for new statuses | shared component | Must |
| Attachment reference component | shared | Should |

### 5.3 Platform Integrations

| Integration | Service | Sprint |
|-------------|---------|--------|
| Audit logging — all mutations | `sdk.audit` | 03+ |
| Notifications — overdue, route assigned, etc. | `sdk.notifications` | 04 |
| Notification rules registration | `sdk.notificationManagement` | 10 |
| Workflow — record correction approval | `sdk.workflows` | 07 |
| Workflow — route sign-off | `sdk.workflows` | 07 |
| Reporting — lubrication-compliance | `sdk.reporting` | 08 |
| Reporting — additional reports | `sdk.reporting` | 08 |
| Health check — advanced (data freshness) | `sdk.health` | 10 |
| Metrics — KPI telemetry | `sdk.metrics` | 09 |
| Event publishing stubs | platform contracts | 11 |
| Message consumption stub | platform contracts | 11 |

---

## 6. What Should Be Redesigned

### 6.1 OilChangeService — Hard Delete

The current `deleteRecord()` performs a hard delete. For a reliability platform tracking equipment history, hard deletion of oil change records breaks audit trails and compliance reporting.

**Redesign:** Replace hard delete with status-based archival (`cancelled` status) with an audit entry. Provide `cancelRecord()` instead of `deleteRecord()`. If physical purge is required (data governance), restrict it to `AppOwner` role with mandatory audit justification.

### 6.2 Error Handling — Domain Errors vs. String Codes

The service returns string error codes (`'OIL_RECORD_NOT_FOUND'`) while the error class hierarchy (`OilRecordNotFoundError`) exists but is unused. This inconsistency will compound across six services if not resolved.

**Redesign:** Services use the `ServiceResult` pattern (keep) but error codes are defined as typed constants in `errors.ts`, not free strings. Domain error classes are used in boundary contexts (controller/gateway layer when that exists).

### 6.3 Module Backend Manifest — Minimal Declaration

The current `OIL_LUBRICATION_MANIFEST` lacks dependencies, icon, and category declarations that the Module Manager uses.

**Redesign:** Extend manifest to include:
- `dependencies: ['workflow-engine', 'contractor-management']`
- `icon: 'droplet'`
- `category: 'Operations'`

### 6.4 Service Factory — Single-Service Wiring

`createOilLubricationService` only wires the oil change record service. For v2 with six+ services, a structured module initialization pattern is needed.

**Redesign:** Create a `OilLubricationModule` class (or `createOilLubricationModule()` factory) that initializes and exposes all domain services as a cohesive unit, injected once at module startup.

### 6.5 OilLubricationPage — Wholesale Replacement

The current placeholder is a single file rendering static text. It cannot be extended into a multi-route application.

**Redesign:** Replace with a module router component that composes `<Routes>` for all seven sub-paths, each backed by a real page component.

---

## 7. What Should NOT Be Carried Forward

| Item | Reason |
|------|--------|
| `deleteRecord()` (hard delete) | Destroys audit trail; replace with `cancelRecord()` |
| Placeholder `OilLubricationPage.tsx` content | Wholesale replacement; no code salvage |
| Free-string error codes in service | Replace with typed error code constants |
| Single-service factory pattern | Too narrow for a multi-service module |
| Mock/placeholder notifications in `useNotifications.ts` | Platform hook will use real notification data |
| `navigation-types.ts` `NAV_ITEMS` legacy array | Already superseded by manifest system; module must not add to it |
| Any direct module-to-module calls | Architecture rule violation |
| Any direct platform kernel/services imports in module | Architecture rule violation — SDK only |

---

## 8. Master Implementation Roadmap

### Phasing Strategy

```
Phase 1 — Foundation (Sprints 01–02)
  │
  ├─ Sprint 01: Module Scaffold & Domain Foundation
  └─ Sprint 02: Lubrication Point Domain & Equipment Explorer

Phase 2 — Core Workflows (Sprints 03–07)
  │
  ├─ Sprint 03: Oil Change Core (Records, Scheduling, Overdue)
  ├─ Sprint 04: Route Center (Creation, Assignment, Management)
  ├─ Sprint 05: Technician Workflow (Execution, Field Forms)
  ├─ Sprint 06: Oil Sampling (Collection, Lab Results)
  └─ Sprint 07: Forecasting & Approvals

Phase 3 — Integration & Delivery (Sprints 08–11)
  │
  ├─ Sprint 08: Reporting & Analytics
  ├─ Sprint 09: Module Dashboard & KPIs
  ├─ Sprint 10: Settings, Notifications & Health
  └─ Sprint 11: Platform Integration & Hardening
```

### Acceptance Criteria (per sprint)

Each sprint is considered complete when:
1. All TypeScript types compile with `strict: true`
2. All new service methods return `ServiceResult<T>`
3. All new UI is bilingual (EN + AR)
4. All data mutations call `sdk.audit.log()`
5. All permission checks use `Can`/`PermissionRoute`/`sdk.permissions`
6. Module health check passes in Owner Center System Health page
7. No direct imports from `@acc-reliability/kernel`, `@acc-reliability/services`, or `@acc-reliability/storage`

---

## 9. Sprint Breakdown

---

### Sprint 01 — Module Scaffold & Domain Foundation

**Goal:** Establish the complete module package structure, domain error hierarchy, permission declarations, extended manifest, and module initialization pattern. The module registers successfully in the platform and appears in the sidebar.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| Package structure aligned to MODULE_DEVELOPMENT_GUIDE | `modules/oil-lubrication/` |
| Extended `errors.ts` — all domain error codes as typed constants | `src/errors.ts` |
| Permission constants (`OIL_LUBRICATION_PERMISSIONS`) | `src/permissions.ts` |
| Entity type constants for all new entities | `src/entity-types.ts` |
| `OilLubricationModule` class / factory | `src/oil-lubrication.module.ts` |
| Extended `OIL_LUBRICATION_MANIFEST` (deps, icon, category) | `src/manifest.ts` |
| Module router component wired in Owner Center | `pages/OilLubricationPage.tsx` replacement |
| Placeholder sub-route pages (all seven routes render skeletons) | `pages/oil-lubrication/` |
| Updated `platform-manifests.ts` — point to new router component | Owner Center |
| Updated public API (`src/index.ts`) | `src/index.ts` |

**Testable Outcome:**
- Navigate to `/oil-lubrication` → renders module dashboard skeleton
- Navigate to `/oil-lubrication/oil-change` → renders oil change skeleton
- All seven sub-nav links are active and navigate correctly
- Module appears healthy in `/system-health`
- No TypeScript errors

---

### Sprint 02 — Lubrication Point Domain & Equipment Explorer

**Goal:** Implement full LubricationPoint domain (repository, service, UI). Engineers can register, view, update, and deactivate LP_ID records. Equipment can be browsed to view their lubrication points.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| `LubricationPointRepository` adapter (implements `ILubricationPointRepository`) | `src/lubrication-point.repository.ts` |
| `LubricationPointService` (full CRUD + deactivate; audit logging; ServiceResult) | `src/lubrication-point.service.ts` |
| Wire `LubricationPointService` into `OilLubricationModule` | `src/oil-lubrication.module.ts` |
| Equipment selector component | `src/ui/EquipmentSelector.tsx` |
| Lubrication point list component | `src/ui/LubricationPointList.tsx` |
| Lubrication point create/edit form | `src/ui/LubricationPointForm.tsx` |
| Equipment explorer view (equipment list + LP_IDs per equipment) | `src/ui/EquipmentExplorer.tsx` |
| Permission guards on LP create/edit/deactivate (`CanCreate`, `CanUpdate`) | In UI |
| Audit log entries on all LP mutations | In service |

**Testable Outcome:**
- ContractorEngineer can register a lubrication point for equipment
- LP_ID appears in equipment explorer
- Deactivated LP_IDs are retained in history (not deleted)
- ContractorTechnician cannot create/edit LP_IDs (permission denied)
- All audit operations logged in `/audit-activity`

---

### Sprint 03 — Oil Change Core (Records, Scheduling, Overdue)

**Goal:** Complete the oil change record domain with scheduling, overdue detection, status lifecycle, and full UI for recording, viewing, and managing oil changes. Replace minimal scaffold service.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| Extended `OilLubricationService` — scheduling, overdue detection, `cancelRecord()` | `src/oil-lubrication.service.ts` |
| Remove `deleteRecord()` — replace with `cancelRecord()` | `src/oil-lubrication.service.ts` |
| Overdue detection service (elevates scheduled → overdue based on frequency) | `src/scheduling.service.ts` |
| `OilChangeFrequency` scheduling calculations | `src/scheduling.service.ts` |
| Notification on oil change completed | In service via `sdk.notifications` |
| Audit logging on all oil change mutations | In service |
| Oil change list page (filterable by status, equipment, date) | `src/ui/OilChangePage.tsx` |
| Oil change detail page | `src/ui/OilChangeDetail.tsx` |
| Oil change create form (equipment, LP_ID, oil type, quantity, date, notes) | `src/ui/OilChangeForm.tsx` |
| Equipment oil change history view | `src/ui/EquipmentHistory.tsx` |
| Status chip variants for all OilChangeStatus values | `src/ui/OilChangeStatusChip.tsx` |
| Attachment reference component (URI input + display) | `src/ui/AttachmentReference.tsx` |
| `AttachmentReference` value object type | `src/types.ts` |
| Work order linkage field on create/edit form | In form |

**Testable Outcome:**
- Technician can record an oil change for a specific equipment + LP_ID
- System correctly detects overdue records based on LubricationPoint frequency
- Manager sees overdue notification in notification bell
- Cancelled records preserved in history (not deleted)
- Equipment history shows full chronological oil change timeline
- All mutations appear in audit log

---

### Sprint 04 — Route Center (Creation, Assignment, Management)

**Goal:** Implement the full route management domain — create lubrication routes, assign to technicians, track assignment lifecycle. Manager/Engineer workflows.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| `LubricationRoute` entity types + `RouteItem` types | `src/types.ts` |
| `LubricationRouteRepository` adapter | `src/lubrication-route.repository.ts` |
| `LubricationRouteService` (create, assign, update, complete, cancel) | `src/lubrication-route.service.ts` |
| Route status lifecycle transitions | In service |
| Notification on route assigned (to technician) | In service |
| Audit logging on all route mutations | In service |
| Wire `LubricationRouteService` into module | `src/oil-lubrication.module.ts` |
| Routes list page (filterable by status, technician, date) | `src/ui/RoutesPage.tsx` |
| Route detail page (route metadata + item list) | `src/ui/RouteDetail.tsx` |
| Route create form (name, equipment selection, scheduled date) | `src/ui/RouteForm.tsx` |
| Route assignment form (select technician, confirm date) | `src/ui/RouteAssignForm.tsx` |
| Route item list component (LP_ID + equipment per item) | `src/ui/RouteItemList.tsx` |
| Event stubs: `RouteAssigned`, `RouteCompleted` | `src/events.ts` |

**Testable Outcome:**
- Engineer creates a route with multiple equipment LP_IDs
- Manager assigns route to technician → technician receives notification
- Route status transitions correctly (draft → assigned → in-progress → completed)
- Unassigned routes visible to manager; assigned routes visible to assigned technician
- Route completion triggers notification to manager/engineer

---

### Sprint 05 — Technician Workflow (Field Execution)

**Goal:** Implement the technician-facing route execution experience. Technicians open assigned routes, work through items sequentially, record oil change data per item, and mark items complete.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| Technician route queue view (my assigned routes) | `src/ui/TechnicianRoutes.tsx` |
| Route execution view (item-by-item workflow) | `src/ui/RouteExecution.tsx` |
| Route item completion form (inline oil change recording) | `src/ui/RouteItemForm.tsx` |
| Progress indicator (items completed / total) | `src/ui/RouteProgress.tsx` |
| Skip item with reason | In execution view |
| Photo attachment input (URI capture) | Extend `AttachmentReference` |
| Offline state indicator | `src/ui/OfflineIndicator.tsx` |
| Offline queue stub (records queued locally, synced on reconnect) | `src/offline-queue.ts` (stub) |
| Route execution — auto-advances to next item on completion | In execution view |
| Route summary on completion (all items reviewed) | `src/ui/RouteCompletionSummary.tsx` |
| Audit log on each item completion | In service |

**Testable Outcome:**
- Technician sees only their assigned routes
- Can work through route items sequentially
- Each item completion records an oil change record (linked to route)
- Route auto-transitions to `completed` when all items are done
- Skipped items recorded with reason
- Progress visible in route detail for manager/engineer

---

### Sprint 06 — Oil Sampling

**Goal:** Implement the oil sampling domain. Technicians collect samples; engineers record lab results. Sampling is linked to equipment and lubrication points, and integrates with oil change history.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| `OilSample` entity types | `src/types.ts` |
| `OilSampleRepository` adapter | `src/oil-sample.repository.ts` |
| `OilSampleService` (request, collect, submit, record results) | `src/oil-sample.service.ts` |
| Sample status lifecycle | In service |
| Notification on results ready | In service |
| Audit logging on all sample mutations | In service |
| Wire `OilSampleService` into module | `src/oil-lubrication.module.ts` |
| Sampling list page (filterable by status, equipment, date) | `src/ui/SamplingPage.tsx` |
| Sample create form (equipment, LP_ID, collection date, notes) | `src/ui/SampleForm.tsx` |
| Sample detail page (metadata + lab results) | `src/ui/SampleDetail.tsx` |
| Lab results entry form | `src/ui/LabResultsForm.tsx` |
| Sample status chip | `src/ui/SampleStatusChip.tsx` |
| Link sample to oil change history | In service + UI |
| `OilChangeCompleted` event stub → auto-suggest sampling | `src/events.ts` |

**Testable Outcome:**
- Technician creates a sample collection record
- Engineer enters lab reference number and marks submitted
- Engineer enters results → notification sent to manager
- Sample appears in equipment history alongside oil change records
- Engineer can view all pending samples in sampling list

---

### Sprint 07 — Forecasting & Approvals

**Goal:** Implement the forecasting service (next service prediction, overdue ranking) and wire platform approval workflows for record corrections and route sign-off.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| `OilChangeSchedule` / forecast entity types | `src/types.ts` |
| `ForecastingService` (calculate next service dates, severity ranking) | `src/forecasting.service.ts` |
| Calendar-based forecast (last change date + `intervalDays`) | In service |
| Operating-hours-based forecast (hook point for future hours feed) | In service (stub for hours) |
| Overdue severity ranking (days overdue → low/medium/high/critical) | In service |
| Wire `ForecastingService` into module | `src/oil-lubrication.module.ts` |
| Forecast page (upcoming, overdue, critical assets) | `src/ui/ForecastPage.tsx` |
| Overdue asset list (sorted by severity) | `src/ui/OverdueList.tsx` |
| Upcoming schedule list (next 7, 14, 30 days) | `src/ui/UpcomingSchedule.tsx` |
| Record correction approval workflow (via `sdk.workflows`) | In service |
| Route sign-off approval (via `sdk.workflows`) | In service |
| Approval pending state in record/route detail | In UI |
| Notification on approval decision | In service |
| Audit on approval actions | In service |

**Testable Outcome:**
- Forecast page shows equipment due within 7/14/30 days
- Overdue assets ranked by severity (critical first)
- Manager can request record correction → engineer receives approval request
- Engineer approves/rejects → manager notified
- Approved corrections update record with audit trail
- Route sign-off workflow functional end-to-end

---

### Sprint 08 — Reporting & Analytics

**Goal:** Implement all oil lubrication report definitions, wire them into the platform reporting service, and build the module reporting page that surfaces platform-generated reports.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| Report definition registrations (all 5 reports) | `src/reporting.ts` |
| `lubrication-compliance` report data provider | In reporting service |
| `oil-change-history` report data provider | In reporting service |
| `overdue-lubrication` report data provider | In reporting service |
| `oil-sampling-results` report data provider | In reporting service |
| `route-completion-summary` report data provider | In reporting service |
| Wire report registrations into module initialization | `src/oil-lubrication.module.ts` |
| Reports page (list of available reports, filter by date/equipment) | `src/ui/ReportsPage.tsx` |
| Report viewer component (integrates with `sdk.reporting`) | `src/ui/ReportViewer.tsx` |
| Export action (CSV/XLSX) wired via `sdk.reporting` | In UI |
| Permission guard on export (`CanExport`) | In UI |

**Testable Outcome:**
- Lubrication compliance report renders in `/oil-lubrication/reports`
- Reports can be filtered by date range and equipment
- Export to CSV/XLSX functional
- ContractorTechnician cannot export (permission denied)
- Platform reporting center (`/reporting-analytics`) lists oil lubrication reports

---

### Sprint 09 — Module Dashboard & KPIs

**Goal:** Implement the module dashboard as the landing page for `/oil-lubrication`. Shows all key metrics, recent activity, quick actions, and links to sub-sections.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| Dashboard page component | `src/ui/DashboardPage.tsx` |
| KPI cards (compliance rate, overdue count, active routes, monthly changes, pending samples) | `src/ui/DashboardKPIs.tsx` |
| Recent activity feed (latest oil changes, route assignments, samples) | `src/ui/RecentActivity.tsx` |
| Quick action buttons (Record Change, View Overdue, Open Routes) | In dashboard |
| Overdue alert banner (if any overdue assets) | `src/ui/OverdueBanner.tsx` |
| Upcoming tasks widget (next 7 days) | `src/ui/UpcomingTasks.tsx` |
| Metrics emission to `sdk.metrics` (compliance rate, overdue count) | In service |
| Dashboard data service / hooks | `src/ui/hooks/useDashboard.ts` |
| Role-adapted dashboard (technician sees routes; manager sees compliance) | In dashboard |

**Testable Outcome:**
- Dashboard shows real data (oil change count, overdue count)
- KPI cards link to respective sub-sections
- Technician dashboard emphasizes assigned routes
- Manager/Engineer dashboard emphasizes compliance and overdue
- Metrics visible in platform System Health

---

### Sprint 10 — Settings, Notifications & Health

**Goal:** Implement the module settings page (LP_ID management, notification rule configuration, module configuration), and wire advanced health check based on data freshness and compliance state.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| Settings page component | `src/ui/SettingsPage.tsx` |
| Lubrication point management tab (full CRUD in settings context) | `src/ui/LPManagementTab.tsx` |
| Notification rules configuration (via `sdk.notificationManagement`) | `src/ui/NotificationRulesTab.tsx` |
| Module configuration tab (overdue thresholds, default frequencies) | `src/ui/ModuleConfigTab.tsx` |
| Module settings service (read/write via `sdk.config`) | `src/module-settings.service.ts` |
| Advanced health check (data freshness, overdue rate threshold) | `src/health.ts` |
| Wire health check into module initialization | `src/oil-lubrication.module.ts` |
| Notification rule definitions (all 7 notification types) | `src/notifications.ts` |
| Register notification rules with `sdk.notificationManagement` | In module init |
| Permission guards on settings sections | In UI |

**Testable Outcome:**
- ContractorAdmin can access full settings
- ContractorEngineer can manage LP_IDs in settings
- ContractorManager can configure notification rules
- Module health goes `degraded` when overdue rate exceeds threshold
- Module health goes `unhealthy` when data is stale beyond threshold
- Notification rules configurable without code changes

---

### Sprint 11 — Platform Integration & Hardening

**Goal:** Wire platform event stubs into real integration points (or documented deferral), validate full end-to-end flows, harden bilingual support across all components, and conduct final module acceptance testing.

**Deliverables:**

| Deliverable | File(s) |
|-------------|---------|
| `OilChangeCompleted` event publication (via platform event bus when available, stub until then) | `src/events.ts` |
| `RouteAssigned` event publication | `src/events.ts` |
| `RouteCompleted` event publication | `src/events.ts` |
| `OilChangeRequested` message handler stub | `src/events.ts` |
| Oil analysis module integration hook (dependency downstream) | `src/events.ts` |
| Full bilingual audit — all UI strings verified in AR | All UI files |
| RTL layout verification for all module pages | CSS/layout |
| Loading states on all data-fetching components | All UI files |
| Error states (empty, error, no-permission) for all lists and pages | All UI files |
| Comprehensive input validation on all forms | All form files |
| Module manifest version bump to `2.0.0` | `src/manifest.ts` |
| Updated module registry seed in bootstrap (v2.0.0) | `platform/sdk/src/bootstrap.ts` |
| End-to-end workflow validation (all 7 workflows) | Manual test plan |
| Performance check (list pages with large data sets) | Manual test |

**Testable Outcome:**
- All seven business workflows execute end-to-end without errors
- All pages render correctly in both EN and AR
- All permission boundaries enforced for all six roles
- Module health correctly reflects real data state
- No TypeScript errors (`npm run type-check`)
- Event stubs confirmed ready for bus wiring in Phase 9

---

## 10. Risks & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R01 | Offline support requires infrastructure not in Platform RC1 | High | High | Implement local-storage queue stub in Sprint 05; flag as deferred to platform Phase 9. Document clearly in settings as "Sync pending connectivity." |
| R02 | Operating hours data not available from platform | High | Medium | Forecast service uses calendar-based calculation as primary; hours-based is a hook point with a TODO. Doesn't block feature. |
| R03 | Google Drive photo upload not abstracted by platform | High | Medium | Module stores photo as URI string only. User inputs Drive link manually. Full Drive integration deferred to platform storage service. |
| R04 | Platform event bus not implemented (Phase 9 dependency) | High | Low | Events implemented as stub publish calls that log intent. No runtime blocking. Fully ready for bus wiring when available. |
| R05 | Equipment master data not owned by module | Medium | High | Module references Equipment_ID only. Equipment list is assumed available via `sdk.contractors` or future `sdk.equipment`. Sprint 02 must confirm the mechanism to list equipment. If not available, use manual Equipment_ID entry in forms. |
| R06 | Approval workflow types in SDK may not support oil-lubrication-specific fields | Medium | Medium | Use generic workflow service with `contextPayload`. Review `IWorkflowsClient` in Sprint 07 before implementing approval forms. |
| R07 | `sdk.reporting` data provider contract not fully documented | Medium | Medium | Review `IReportingClient` in Sprint 08. If raw data push is not supported, wrap report data in a reporting context service. |
| R08 | Bilingual (AR) content for all form labels and messages | Low | Medium | Maintain a `translations.ts` file per sprint. Never hard-code strings. Validate AR in Sprint 11. |
| R09 | LubricationPoint entity type constant missing from platform bootstrap | Low | Low | Add `LUBRICATION_POINT_ENTITY_TYPE` constant in Sprint 02 alongside repository creation. |
| R10 | `IPermissionsClient` `moduleId` for oil-lubrication not enforced in RC1 | Low | Low | Permissions module already lists `oil-lubrication` in `KNOWN_MODULES`. Sprint 01 declares action constants; enforcement is in UI via `Can` components. |

---

## 11. Dependencies

### Internal Platform Dependencies

| Dependency | Module Registry Key | Sprint First Used | Status |
|------------|--------------------|--------------------|--------|
| `workflow-engine` | `workflow-engine` | Sprint 07 | Seeded in bootstrap; service available |
| `contractor-management` | `contractor-management` | Sprint 01 | Seeded; `sdk.contractors` available |
| `user-management` | `user-management` | Sprint 01 | Seeded; `sdk.users` available |
| `notification-management` | `notification-management` | Sprint 10 | Seeded; `sdk.notificationManagement` available |
| `reporting-center` | `reporting-center` | Sprint 08 | Seeded; `sdk.reporting` available |
| `audit-service` | `audit-service` | Sprint 03 | Seeded; `sdk.audit` available |
| `health-monitor` | `health-monitor` | Sprint 01 | Seeded; `sdk.health` available |

### Downstream Module Dependencies (Do Not Block)

| Module | Depends On | Integration Point |
|--------|-----------|-------------------|
| `oil-analysis` | `oil-lubrication` | `OilChangeCompleted` event (Sprint 11 stub) |

### External Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| Equipment master data source | Data | Medium — see R05 |
| Google Drive (photo storage) | Service | Low — URI-only in v2 |
| Laboratory systems (sample tracking) | External | Low — manual entry in v2 |
| Operating hours telemetry | Data | Medium — calendar fallback available |

---

## 12. Recommendations

### Immediate (Before Sprint 01)

1. **Confirm equipment listing mechanism.** Determine how the module's UI will populate equipment selectors. If `sdk.contractors` does not expose equipment lists, plan for manual Equipment_ID entry in Sprint 02 forms and file an issue against the platform for `sdk.equipment`.

2. **Confirm `IWorkflowsClient` approval API surface.** Review the approval workflow contract before Sprint 07 begins to confirm context payload support.

3. **Establish a module translations file pattern.** Define `src/ui/translations.ts` (or `src/ui/i18n.ts`) in Sprint 01 as the central store for all bilingual strings. Enforce this in coding standards for this module.

4. **Establish Sprint Definition of Done.** Before Sprint 01, confirm the acceptance criteria matrix above with all stakeholders, particularly the audit and permission requirements that apply to every sprint.

### Architecture

5. **One module package, multiple services.** Do not split oil-lubrication into multiple packages. The module development guide is clear: one `@acc-reliability/oil-lubrication` package, multiple services within.

6. **UI lives in the module, not the Owner Center shell.** All oil-lubrication page components belong in `modules/oil-lubrication/src/ui/`. The Owner Center shell (`apps/owner-center/src/pages/OilLubricationPage.tsx`) is a thin adapter that renders the module's router component.

7. **Do not add a `shared-ui` dependency until that package is published.** The `MODULE_DEVELOPMENT_GUIDE` lists `@acc-reliability/shared-ui` as a peer dependency. Use Owner Center shell components where needed by importing from paths only available in the shell. Module components that need to be standalone must implement their own presentational primitives or wait for `shared-ui`.

### Development Velocity

8. **Sprint 01 is a blocker for everything.** The module router, permission constants, and `OilLubricationModule` factory are foundational. No sprint beyond 01 can begin until the scaffold compiles and registers cleanly.

9. **Sprints 02 and 03 are the highest-value sprints.** LubricationPoint management and Oil Change core are the most critical business workflows. All other features build on these.

10. **Defer offline queue implementation.** The offline stub in Sprint 05 is sufficient for v2. Full offline sync requires platform-level service worker or sync infrastructure. Document the gap, do not block field technician UI on it.

11. **Sprints can overlap for an experienced team.** Sprints 04 and 06 (Routes, Sampling) are largely independent once the foundational entities (Sprint 02) and oil change service (Sprint 03) are complete. A two-stream team can run them in parallel.

### Quality

12. **Every service mutation must call `sdk.audit`.** This is non-negotiable for a reliability platform operating in regulated industrial environments. Enforce in code review from Sprint 02 onward.

13. **Test with all six role types.** Permission boundaries are complex. Test each workflow with the least-privileged role expected to access it and the next-higher role expected to be denied.

14. **Register a `lubrication-compliance` KPI target.** Agree on a baseline compliance rate (e.g. 85%) below which the module health degrades. Wire this into Sprint 10's health check so operations teams see degradation in the platform health dashboard automatically.

---

*End of document.*  
*Prepared for: ACC Reliability Platform — Oil Lubrication Module v2*  
*Document version: 1.0 | 2026-07-01*
