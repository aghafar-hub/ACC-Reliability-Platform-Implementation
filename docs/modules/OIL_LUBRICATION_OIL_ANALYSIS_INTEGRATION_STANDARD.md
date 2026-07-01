# Oil Lubrication ↔ Oil Analysis Integration Standard

**Document ID:** `OIL_LUBRICATION_OIL_ANALYSIS_INTEGRATION_STANDARD`  
**Repository:** `ACC-Reliability-Platform-Implementation`  
**Module:** `@acc-reliability/oil-lubrication` + `@acc-reliability/oil-analysis` (planned)  
**Status:** Authoritative — Engineering Standard  
**Date:** 2026-07-01  
**Author:** Platform Engineering  
**Related Docs:**
- [`OIL_LUBRICATION_V2_ASSESSMENT.md`](./OIL_LUBRICATION_V2_ASSESSMENT.md)
- [`OIL_LUBRICATION_SPRINT03_PREREQ.md`](./OIL_LUBRICATION_SPRINT03_PREREQ.md)
- [`reference/ENGINEERING_DECISIONS.md`](../../reference/ENGINEERING_DECISIONS.md)

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Identity Standards](#2-identity-standards)
   - 2.1 [Equipment_ID](#21-equipment_id)
   - 2.2 [LP_ID (Lubrication Point ID)](#22-lp_id-lubrication-point-id)
   - 2.3 [Sample_ID](#23-sample_id)
3. [Sampling-Point Rule](#3-sampling-point-rule)
4. [Equipment-to-LP Mapping](#4-equipment-to-lp-mapping)
5. [Oil Analysis Import Status Flow](#5-oil-analysis-import-status-flow)
6. [PDF / OCR Future Workflow](#6-pdf--ocr-future-workflow)
7. [Cross-Module Links](#7-cross-module-links)
8. [Module Ownership Boundaries](#8-module-ownership-boundaries)
   - 8.1 [What Belongs to Oil Lubrication](#81-what-belongs-to-oil-lubrication)
   - 8.2 [What Belongs to Oil Analysis](#82-what-belongs-to-oil-analysis)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Appendix: Reference Mapping](#10-appendix-reference-mapping)

---

## 1. Purpose

This document establishes the authoritative integration standard between two platform modules:

| Module | Scope |
|---|---|
| **Oil Lubrication** (`@acc-reliability/oil-lubrication`) | Lubrication scheduling, oil changes, LP management, routes, compliance |
| **Oil Analysis** (`@acc-reliability/oil-analysis`, planned) | Lab sample intake, result storage, alert routing, trend analysis |

These modules share equipment assets but have distinct responsibilities. Without a formal boundary definition, cross-module data linkage — particularly around sample records, LP assignment, and PDF/lab imports — will be implemented inconsistently.

**This standard defines:**
- The canonical identity keys used by both modules
- How oil analysis records attach to lubrication points
- The correct status lifecycle for imported analysis records
- What data each module owns
- The implementation sequence for integration features

---

## 2. Identity Standards

### 2.1 Equipment_ID

**Definition:** The platform-level identifier for a physical asset (motor, pump, gearbox, conveyor, etc.).

**Characteristics:**
- Assigned and owned by the **platform equipment registry**, not by any individual module
- Follows the existing ACC equipment coding convention (e.g., `531.LQ110`, `321.HY110`)
- Present on all records in both Oil Lubrication and Oil Analysis
- The minimum required identifier for any oil analysis import

**Platform type:**
```typescript
type EquipmentId = string & { readonly _brand: 'EquipmentId' };
```

**Rules:**
- An oil analysis record MUST always carry `Equipment_ID`
- An oil change record MUST always carry `Equipment_ID`
- A lubrication point MUST always carry `Equipment_ID`
- `Equipment_ID` alone is insufficient to uniquely identify a lubrication task — `LP_ID` is required for that

**Source in legacy system:**  
Old oil lubrication app: `equipmentIdCode` on `Lubrication Points` sheet and `Equipment` config sheet.  
Old oil analysis app: Column A (`Code`) on `Data_Entry`, `Oil Change Log`, and `Equipment Registry` sheets.

---

### 2.2 LP_ID (Lubrication Point ID)

**Definition:** The platform identifier for a specific lubrication point on a piece of equipment.

**Characteristics:**
- Owned by the **Oil Lubrication** module
- Uniquely identifies the exact application point (e.g., motor drive-end bearing, gearbox input shaft)
- One equipment can have multiple lubrication points
- Carries additional point-level metadata: `pointCode`, `position`, `lubricantSpec`, `standardQuantityL`, `frequency`

**Platform type:**
```typescript
type LubricationPointId = string & { readonly _brand: 'LubricationPointId' };
```

**Rules:**
- An oil change record MAY carry `LP_ID` (required for scheduled maintenance; optional for ad-hoc or imported records pending review)
- An oil analysis sample SHOULD carry `LP_ID` when the sampling point corresponds to a defined lubrication point
- `LP_ID` assignment on an oil analysis record is confirmed by an engineer, never inferred automatically
- A lubrication point MAY be flagged `oaRequired: true` to indicate that oil analysis is part of its maintenance strategy

**Source in legacy system:**  
Old lubrication app: `lpIdCode` on `Lubrication Points` sheet (e.g., `LP-001`).  
Old oil analysis app: No direct LP concept — samples were recorded per `Equipment_ID` only.

---

### 2.3 Sample_ID

**Definition:** The identifier for a specific oil analysis sample submission.

**Characteristics:**
- Owned by the **Oil Analysis** module
- Globally unique within the platform
- Created at the point of sample intake (field submission or PDF import)
- Carries the lab reference ID, sample date, result status, and import source

**Platform type (planned):**
```typescript
type OilSampleId = string & { readonly _brand: 'OilSampleId' };
```

**Minimum required fields at creation:**

| Field | Required | Notes |
|---|---|---|
| `sampleId` | Yes | System-generated |
| `equipmentId` | Yes | Always required |
| `sampledAt` | Yes | Date of physical sampling |
| `importSource` | Yes | `manual`, `pdf-import`, `lab-api` |
| `status` | Yes | See §5 for lifecycle |
| `lubricationPointId` | No | Set after engineer confirmation |
| `labReferenceId` | No | Lab's own tracking number |
| `resultStatus` | No | `normal`, `caution`, `alert` |

**Rule:** A `Sample_ID` may be created with `Equipment_ID` only. `LP_ID` is populated after engineer review.

---

## 3. Sampling-Point Rule

**Not all lubrication points are sampling points.**

This is a core business rule inherited from the old lubrication system (`oaRequired` field on LP) and must be preserved in the platform:

```
LubricationPoint.oaRequired = true  →  This LP is a designated sampling point.
LubricationPoint.oaRequired = false →  This LP uses calendar/condition frequency only.
```

**Implications:**

| Scenario | Allowed? |
|---|---|
| Oil sample linked to an LP with `oaRequired: true` | Yes — standard |
| Oil sample linked to an LP with `oaRequired: false` | Permitted but flagged as non-standard; requires engineer note |
| Oil sample with `Equipment_ID` only, LP not yet confirmed | Yes — `Imported / Needs LP Mapping` status (see §5) |
| Oil sample auto-linked to LP without engineer review | Never allowed |

**Frequency-type interaction:**

When an LP has `frequencyType: oil_analysis`, its `nextDue` date is governed by the oil analysis interval (`oaIntervalDays`), not a fixed calendar. In this case, the oil analysis record drives scheduling — the modules are tightly coupled and the integration link is mandatory, not optional.

---

## 4. Equipment-to-LP Mapping

An equipment asset may have zero, one, or many lubrication points.

```
Equipment (platform-owned)
  └── LubricationPoint 1  (oil-lubrication-owned)   e.g., Motor DE Bearing
  └── LubricationPoint 2                             e.g., Motor NDE Bearing
  └── LubricationPoint 3                             e.g., Gearbox Input Shaft
```

**Mapping rules:**

1. Equipment is registered in the platform equipment registry before any LP is created.
2. A lubrication point is created in the Oil Lubrication module and references `Equipment_ID`.
3. Oil analysis records reference `Equipment_ID` at creation; `LP_ID` is added after engineer review.
4. Multiple LPs may exist for one equipment but only those with `oaRequired: true` are valid sampling targets.
5. A single oil analysis sample is linked to at most one `LP_ID`.

**Lookup direction:**

| Query | Answered by |
|---|---|
| "What LPs does equipment `531.LQ110` have?" | Oil Lubrication module |
| "What samples exist for equipment `531.LQ110`?" | Oil Analysis module |
| "Which LP does sample `OA-2026-0041` belong to?" | Oil Analysis record (after LP mapping confirmed) |
| "Is this LP a sampling point?" | `LubricationPoint.oaRequired` in Oil Lubrication |

---

## 5. Oil Analysis Import Status Flow

All oil analysis records — whether entered manually, imported from a PDF, or received via lab API — follow this status lifecycle:

```
┌─────────────────────────────────────────────────────────────┐
│                    OIL ANALYSIS STATUS FLOW                  │
└─────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
    PDF / Manual Entry ──►   IMPORTED   │  Equipment_ID only.
                         │ Needs LP     │  LP_ID not yet set.
                         │  Mapping     │  Awaits engineer review.
                         └──────┬───────┘
                                │
               Engineer reviews and confirms LP_ID
                                │
                    ┌───────────▼──────────┐
                    │       LINKED         │  LP_ID assigned.
                    │   / Needs Review     │  Result status pending.
                    └───────────┬──────────┘
                                │
               Lab results entered or confirmed
                                │
                    ┌───────────▼──────────┐
                    │       ANALYSED       │  Full record.
                    │                      │  Result: Normal / Caution / Alert
                    └───────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
       ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
       │   NORMAL    │  │   CAUTION    │  │    ALERT     │
       │  No action  │  │ Monitor / AP │  │ Action Plan  │
       └─────────────┘  └──────────────┘  │  Required    │
                                           └─────────────-┘
```

### Status Definitions

| Status | `LP_ID` Present | Result Present | Description |
|---|---|---|---|
| `imported` | No | No | Record created from PDF/manual with Equipment_ID only. Engineer action required. |
| `needs-lp-mapping` | No | No | Alias for `imported`. Used when equipment is known but sampling point not confirmed. |
| `linked` | Yes | No | Engineer has confirmed the LP_ID. Lab results not yet entered. |
| `analysed` | Yes | Yes | Results entered and confirmed. |
| `normal` | Yes | Yes | Result sub-status: no action required. |
| `caution` | Yes | Yes | Result sub-status: monitoring increased; action plan recommended. |
| `alert` | Yes | Yes | Result sub-status: action plan required immediately. |
| `cancelled` | — | — | Record voided. No hard delete. Audit trail preserved. |

### Transition Rules

| Transition | Trigger | Actor |
|---|---|---|
| `imported` → `linked` | Engineer confirms LP_ID on review screen | Engineer / Reliability Manager |
| `linked` → `analysed` | Lab results entered and saved | Engineer / Lab Technician |
| `analysed` → `caution` / `alert` / `normal` | Result status evaluated | System (on result save) |
| Any → `cancelled` | Record voided | Engineer / Admin |

**Invariants:**
- A record may NEVER skip `imported` when created via PDF import — engineer confirmation is mandatory
- The system MUST NOT auto-assign `LP_ID` based on equipment matching alone
- The system MUST NOT transition to `analysed` without an `LP_ID`
- Hard deletion is prohibited; use `cancelled` status

---

## 6. PDF / OCR Future Workflow

PDF lab report import is an anticipated feature. The following workflow defines the required implementation pattern.

### Phase 1: PDF Intake (Sprint TBD)

```
Lab PDF received
      │
      ▼
Platform receives file (upload or email trigger)
      │
      ▼
OCR engine extracts fields:
  - Equipment code (text match against equipment registry)
  - Sample date
  - Lab reference number
  - Result values (viscosity, metals, contamination, etc.)
  - Result classification (Normal / Caution / Alert)
      │
      ▼
System creates OilSample record:
  status = "imported"
  equipmentId = (matched from OCR output)
  lubricationPointId = null
  ocrConfidence = <float 0–1>
  rawOcrOutput = <stored for audit>
  importSource = "pdf-import"
      │
      ▼
Review screen presented to engineer
```

### Phase 2: Engineer Review Screen (mandatory)

The review screen MUST display:

1. **OCR extraction summary** — what was read and with what confidence
2. **Equipment confirmation** — engineer verifies the matched equipment is correct
3. **LP selection** — engineer selects the specific lubrication point from the equipment's LP list (only LPs with `oaRequired: true` shown by default; full list available via toggle)
4. **Field correction** — engineer can edit any OCR-extracted field before saving
5. **Accept / Reject** — engineer accepts (transitions to `linked`) or rejects (record stays `imported` with rejection note)

**Never auto-save OCR output as final without engineer confirmation.** This is a hard rule from `ENGINEERING_DECISIONS.md`.

### Phase 3: Post-Review (after confirmation)

```
Engineer confirms
      │
      ▼
status = "linked"
lubricationPointId = <selected LP>
reviewedBy = <engineer userId>
reviewedAt = <timestamp>
      │
      ▼
If result values also confirmed:
  status = "analysed"
  resultStatus = normal | caution | alert
      │
      ▼
If alert or caution:
  Notification dispatched to:
    - OWN_ORG_ENGINEER
    - OWN_ORG_MANAGER
    - ACC_MANAGER (if alert)
      │
      ▼
If LP.frequencyType = "oil_analysis":
  nextDue recalculated using oaIntervalDays from this sample date
```

### OCR Confidence Thresholds (recommended)

| Field | Auto-populate threshold | Manual required below |
|---|---|---|
| Equipment code | ≥ 0.95 | < 0.95 |
| Sample date | ≥ 0.90 | < 0.90 |
| Result classification | ≥ 0.90 | < 0.90 |
| Numeric result values | ≥ 0.85 | < 0.85 |

Fields below threshold are highlighted in the review screen as requiring manual confirmation. Fields above threshold are pre-populated but remain editable.

---

## 7. Cross-Module Links

### Event Flow (Platform Events — Sprint 11 stub)

| Event | Producer | Consumer | Payload |
|---|---|---|---|
| `OilChangeCompleted` | Oil Lubrication | Oil Analysis | `{ equipmentId, lubricationPointId, completedAt, oilType }` |
| `OilSampleLinked` | Oil Analysis | Oil Lubrication | `{ sampleId, equipmentId, lubricationPointId, sampledAt }` |
| `OilAnalysisAlert` | Oil Analysis | Oil Lubrication, Notifications | `{ sampleId, equipmentId, lubricationPointId, resultStatus, actionRequired }` |
| `LpDeactivated` | Oil Lubrication | Oil Analysis | `{ lubricationPointId, equipmentId }` — warn if pending samples exist |

> **Note:** Platform event bus is not implemented in RC1. Events are defined as stubs in Sprint 11. Cross-module communication before Sprint 11 uses direct repository reads with read-only cross-module permissions.

### Shared Read Access (pre-event-bus)

| Consumer | Reads from | Purpose |
|---|---|---|
| Oil Analysis | Oil Lubrication LP list | Populate LP selector on review screen |
| Oil Analysis | Oil Lubrication LP `oaRequired` | Filter valid sampling points |
| Oil Lubrication | Oil Analysis last sample date | Display on LP detail view |
| Oil Lubrication | Oil Analysis result status | Show `CONDITION_MONITORING` bucket for `oil_analysis` frequency LPs |

### UI Cross-Links

| From | To | Link type |
|---|---|---|
| LP Detail page | Oil Analysis sample list for that LP | Navigation link |
| Oil Analysis record | LP Detail page | Navigation link |
| Oil Analysis alert | Action Plan creation (Oil Lubrication or standalone) | Action button |
| Equipment summary | Both LP list and sample history | Tabbed panel |

---

## 8. Module Ownership Boundaries

### 8.1 What Belongs to Oil Lubrication

The Oil Lubrication module (`@acc-reliability/oil-lubrication`) owns:

| Domain Object | Entity Type | Notes |
|---|---|---|
| `LubricationPoint` | `lubricationPoint` | Master LP registry, `oaRequired` flag |
| `OilChangeRecord` | `oilChangeRecord` | Execution history, approval workflow |
| `LubricationRoute` | `lubricationRoute` (Sprint 05) | Route planning and execution |
| `OilChangeSchedule` | Computed | Next due date, overdue detection |
| LP status buckets | Computed | `overdue`, `due-today`, `due-soon`, `ok`, `no-history`, `inactive` |
| Compliance metrics | Computed | `(totalCalendar - overdue) / totalCalendar × 100` |
| Quantity deviation alerts | Business rule | Triggered when quantity deviates > 20% from `standardQuantityL` |
| Oil type change alerts | Business rule | Triggered when `oilType` differs from `lubricantSpec` |
| Oil purchase log | `oilPurchaseLog` (Sprint 08) | Oil inventory and procurement tracking |
| Oil forecast | Computed (Sprint 08) | Consumption-based forecasting |

**Permissions prefix:** `oil-lubrication:`

**Does NOT own:**
- Equipment registry (platform-owned)
- Oil analysis lab results
- Sample intake or OCR processing
- Lab reference IDs

---

### 8.2 What Belongs to Oil Analysis

The Oil Analysis module (`@acc-reliability/oil-analysis`, planned) owns:

| Domain Object | Entity Type | Notes |
|---|---|---|
| `OilSample` | `oilSample` | Sample record with lifecycle from import to analysis |
| `OilSampleResult` | `oilSampleResult` | Lab result values per parameter (viscosity, metals, etc.) |
| `OilSampleParameter` | `oilSampleParameter` | Parameter definitions (configurable per equipment type) |
| `OilAnalysisActionPlan` | `oilAnalysisActionPlan` | Actions triggered by caution/alert results |
| PDF import records | `pdfImport` | Raw import with OCR output and confidence scores |
| Sample tracker | Computed | Monthly compliance view by equipment |
| Result trend | Computed | Parameter trend over sample history |
| Notification dispatch | Business rule | Alert → engineer + manager notifications |

**Permissions prefix (planned):** `oil-analysis:`

**Does NOT own:**
- Lubrication point definitions
- Oil change scheduling
- Route execution
- Compliance metrics for oil changes

**References (read-only) from Oil Lubrication:**
- `LubricationPoint.lubricationPointId` — to link samples
- `LubricationPoint.oaRequired` — to validate sampling point
- `LubricationPoint.equipmentId` — to confirm equipment link

---

## 9. Implementation Roadmap

This roadmap extends the Oil Lubrication v2 sprint plan with the integration and Oil Analysis milestones. Oil Lubrication sprint numbering follows `OIL_LUBRICATION_V2_ASSESSMENT.md`.

### Phase 1 — Oil Lubrication Foundation (Sprints 01–04, Active)

| Sprint | Deliverable | Integration Impact |
|---|---|---|
| Sprint 01 | Module scaffold, SDK wiring, permissions | Establishes `oil-lubrication:` permission namespace |
| Sprint 02 | LP management (create, edit, deactivate) | `oaRequired` flag available; LP registry ready |
| Sprint 03 | Oil change core (3-step wizard, approval) | `OilChangeRecord` schema finalized |
| Sprint 04 | Scheduling and status buckets | `CONDITION_MONITORING` bucket available for `oil_analysis` LPs |

### Phase 2 — Oil Lubrication Core Workflows (Sprints 05–07)

| Sprint | Deliverable | Integration Impact |
|---|---|---|
| Sprint 05 | Route management and execution | No direct integration impact |
| Sprint 06 | Oil sampling center (within Oil Lubrication scope) | `OilSample` stub entity; sets schema foundation for Oil Analysis module |
| Sprint 07 | Reports: compliance, history, overdue | Cross-module report surface defined |

### Phase 3 — Integration and Oil Analysis Module (Sprints 08–11+)

| Sprint | Deliverable | Integration Impact |
|---|---|---|
| Sprint 08 | Oil management: purchase log, forecast | Shared equipment context |
| Sprint 09 | Oil Analysis module scaffold | `oil-analysis:` permission namespace, `OilSample` entity types |
| Sprint 10 | Oil Analysis manual intake | Status flow: `imported` → `linked` → `analysed` live |
| Sprint 11 | PDF / OCR import + review screen | Full import workflow per §6; engineer review mandatory |
| Sprint 12 | Event bus integration stubs | `OilChangeCompleted`, `OilSampleLinked`, `OilAnalysisAlert` events |
| Sprint 13 | Cross-module UI links | LP Detail ↔ Sample history; alert → action plan |
| Sprint 14 | Oil Analysis action plans | `OilAnalysisActionPlan` entity; caution/alert triggers |
| Sprint 15 | Trend analysis and reporting | Parameter trend views, lab compliance reports |

### Pre-conditions for Oil Analysis Module (Sprint 09)

Before the Oil Analysis module can be scaffolded, the following must exist in Oil Lubrication:

- [x] `LubricationPoint.oaRequired` field defined and persisted (`types.ts` Sprint 03)
- [x] `LubricationPoint.oaIntervalDays` field available
- [ ] LP repository read-access exposed for cross-module use
- [ ] `CONDITION_MONITORING` LP status bucket implemented (Sprint 04)
- [ ] Platform equipment registry stable and queryable

### Integration Test Milestones

| Milestone | Condition |
|---|---|
| **IT-01** | Create oil sample with `Equipment_ID` only; verify status = `imported` |
| **IT-02** | Engineer assigns `LP_ID`; verify status transitions to `linked` |
| **IT-03** | Enter results; verify status transitions to `analysed` with correct `resultStatus` |
| **IT-04** | `alert` result: verify notification dispatched to engineer and manager |
| **IT-05** | LP with `frequencyType: oil_analysis`: verify `nextDue` recalculated from sample date |
| **IT-06** | PDF import: verify OCR record created, engineer review screen shown, no auto-save |
| **IT-07** | LP deactivated: verify warning shown if pending samples exist |
| **IT-08** | Oil change completed: verify `OilChangeCompleted` event stub fires (Sprint 12) |

---

## 10. Appendix: Reference Mapping

### Legacy Field → Platform Field

| Legacy (Lubrication) | Platform |
|---|---|
| `lpIdCode` | `LubricationPoint.lubricationPointId` |
| `equipmentIdCode` | `LubricationPoint.equipmentId` |
| `oaRequired` | `LubricationPoint.oaRequired` |
| `oaIntervalDays` | `LubricationPoint.frequency.oaIntervalDays` |
| `standardQuantityL` | `LubricationPoint.standardQuantityL` |
| `pointCode` | `LubricationPoint.pointCode` |
| `position` | `LubricationPoint.position` |
| `lubricantType` | `LubricationPoint.lubricantSpec` |
| `frequencyType` | `LubricationPoint.frequency.type` |
| `frequencyIntervalDays` | `LubricationPoint.frequency.intervalDays` |
| `lastChangeDateCache` | Computed from latest `APPROVED` `OilChangeRecord` |

| Legacy (Oil Analysis) | Platform |
|---|---|
| `Data_Entry` col A | `OilSample.equipmentId` |
| `Data_Entry` col D | `OilSample.sampledAt` |
| `Data_Entry` col E | `OilSample.resultStatus` |
| `Equipment Registry` col A | `Equipment.equipmentId` (platform registry) |
| `Equipment Registry` col C | `Equipment.assetId` |
| `Oil Change Log` col L | `OilSample.status` (`Overdue` → `overdue`) |
| Lab PDF URL | `OilSample.attachmentReference.uri` |

### Status Mapping

| Legacy Status | Platform Status |
|---|---|
| *(no status — appended directly)* | `imported` |
| `Alert` | `alert` |
| `Caution` / `Warning` | `caution` |
| *(no alert flag)* | `normal` |
| `PENDING_APPROVAL` (lubrication) | `in-progress` |
| `APPROVED` (lubrication) | `completed` |
| `REJECTED` (lubrication) | `cancelled` |
| `Overdue` (oil change log) | `overdue` (LP status bucket) |

### Permission Keys Reference

| Action | Permission Key |
|---|---|
| View lubrication point | `oil-lubrication:lubrication-point:view` |
| Manage lubrication point | `oil-lubrication:lubrication-point:manage` |
| View sampling | `oil-lubrication:sampling:view` |
| Manage sampling | `oil-lubrication:sampling:manage` |
| Enter lab results | `oil-lubrication:sampling:enter-results` |
| View oil analysis sample (planned) | `oil-analysis:sample:view` |
| Import oil analysis sample (planned) | `oil-analysis:sample:import` |
| Confirm LP mapping (planned) | `oil-analysis:sample:confirm-lp` |
| Enter lab results (planned) | `oil-analysis:sample:enter-results` |
| View analysis reports (planned) | `oil-analysis:reports:view` |
