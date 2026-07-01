# Oil Lubrication v2 — Old App Business Reference Inspection
## Sprint 03 Pre-requisite Analysis

**Prepared:** 2026-07-01  
**Purpose:** Business reference only — no code copied, no architecture migrated.  
**Reference:** `reference/old-oil-lubrication-app` (68 files, ~17,000 lines)  
**Compare with:** `apps/owner-center/src/pages/OilLubricationPage.tsx`, `modules/oil-lubrication/`, `docs/modules/OIL_LUBRICATION_V2_ASSESSMENT.md`

---

## Table of Contents

1. [Old App Business Workflow Summary](#1-old-app-business-workflow-summary)
2. [Complete Field Inventory](#2-complete-field-inventory)
3. [Feature Comparison: Old vs v2](#3-feature-comparison-old-vs-v2)
4. [Features to Keep](#4-features-to-keep)
5. [Bad Patterns to Avoid](#5-bad-patterns-to-avoid)
6. [Missing Fields Before Sprint 03](#6-missing-fields-before-sprint-03)
7. [Recommended Redesign Before Sprint 03](#7-recommended-redesign-before-sprint-03)
8. [Final Sprint 03 Scope](#8-final-sprint-03-scope)

---

## 1. Old App Business Workflow Summary

### 1.1 Application Architecture

The old app was a standalone React 19 + Vite SPA backed entirely by Google Apps Script
acting as a REST-shaped API over two Google Sheets workbooks. No database — all
persistence in spreadsheet rows. Authentication via HMAC-salted passwords on a Users tab
with signed session tokens. Single deployment unit.

### 1.2 Screens & Navigation (16 screens)

| # | Screen | Route | Purpose |
|---|--------|-------|---------|
| 1 | Login | `/login` | Credential entry, remember-me toggle |
| 2 | Dashboard | `/dashboard` | KPI overview, charts, contractor filter |
| 3 | Explorer | `/explorer` | Tree-view of all lubrication points |
| 4 | LP Details | `/explorer/:id` | Single LP full history and sampling |
| 5 | Oil Change Center | `/oil-change` | 3-step wizard to record oil changes |
| 6 | Route Center | `/routes` | Create, assign, execute lubrication routes |
| 7 | Sampling Center (new) | `/sampling` | Collect samples, link lab PDFs |
| 8 | Oil Sample Center (legacy) | `/oil-samples` | Legacy sample list with parameter grids |
| 9 | Pending Approvals | `/approvals` | Approve/reject submissions and skips |
| 10 | Action Plans | `/action-plans` | Track corrective and preventive actions |
| 11 | Notifications | `/notifications` | In-app notification inbox |
| 12 | Lubrication Timeline | `/timeline` | Multi-LP calendar/list timeline |
| 13 | Plant Feed | `/plant-feed` | Org-wide activity feed |
| 14 | Oil Management | `/oil-management` | Oil inventory, purchase log, forecasting |
| 15 | Reports | `/reports` | Compliance, overdue, sample, route reports |
| 16 | Settings | `/settings` | Users, roles, notification routing, audit |

**Navigation rule:** Sidebar items are shown/hidden per user's `screenAccess` map
(permission template per role). Badges show LP overdue count, pending approvals, open
action plans, and unread notifications.

### 1.3 Core User Workflow Chain

```
Login
  → Dashboard (see KPIs filtered by contractor)
    → Explorer (browse LP tree by area / contractor)
      → LP Details (view history, oil samples, action plans)
        → Oil Change Center (3-step: select → review → record)
          → Pending Approvals (engineer/manager approves)
            → Action Plans (auto-created on repeated rejection)
              → Notifications (triggered at every state change)
                → Timeline (calendar view of all change history)
                  → Reports (compliance, overdue, route completion)
                    → Settings (users, permissions, notification routing)
```

### 1.4 Route Center Workflow

```
Manager/Engineer creates route
  → Selects: contractor, area, oil type filter, LP multi-select, frequency, due date, technician
    → Route status: Draft → Assigned
      → Technician executes field tasks one by one
        → Each LP: Complete (record oil change data) | Skip (9 reasons + Other)
          → Skip → SKIP_PENDING → Engineer approves (SKIP_APPROVED) | Rejects (back to PENDING)
            → On all LPs complete → Route status: Completed
              → Recurrence: if not One Time → auto-generate next route from prior due + frequency
```

**Contractor rule:** A single route cannot mix RHI and ASEC lubrication points. ACC
selects the contractor at route creation and only LPs from that contractor appear.

### 1.5 Approval Workflow

```
Technician submits oil change record → Status: PENDING_APPROVAL
  → Engineer/Manager reviews in Pending Approvals screen
    → Approve → Status: APPROVED → updates LP's effective lastChangeDate
    → Reject → Status: REJECTED → rejection reason stored → notification sent
      → If rejection count ≥ threshold (default 3) → Auto Action Plan: "Repeated Rejection"
```

### 1.6 Oil Sampling Workflow

```
Sampling due (OA Interval from LP master) → Status: Due
  → Technician collects sample → Status: Collected
    → Sample submitted with Lab Sample ID → Status: Waiting Lab Result
      → Engineer uploads lab PDF and enters parameter values → Status: Analysis Available
        → Manager reviews and closes → Status: Closed
```

### 1.7 Notification Triggers

| Trigger | Recipients | Priority |
|---------|------------|----------|
| Oil change pending approval | Engineer, Manager | High |
| Quantity deviation > threshold (default 20%) | Manager | High |
| Oil type changed from standard | Manager | High |
| Approval rejected | Technician | High |
| Repeated rejection threshold reached | Manager | Critical |
| Route due / overdue | Assigned technician, Manager | High |
| Skip request submitted | Engineer, Manager | Medium |
| Skip approved | Technician | Medium |
| Skip rejected + action plan | Technician | High |
| Oil sample overdue | Engineer | Medium |

### 1.8 Dashboard KPIs (full set from old app)

| KPI | Definition |
|-----|------------|
| `totalLubricationPoints` | All LP_IDs in system |
| `overdue` | LPs past next due date |
| `dueToday` | LPs due on current date |
| `dueThisWeek` | LPs due within 7 days |
| `dueThisMonth` | LPs due within current calendar month |
| `ok` | LPs with valid upcoming schedule |
| `noHistory` | LPs that have never been serviced |
| `compliancePct` | (total − overdue) / total × 100 |
| `conditionMonitoringPoints` | LPs under oil analysis monitoring |
| `oilSamplesOverdue` | Samples past OA interval |
| `oilSamplesDueThisMonth` | Samples due in current month |
| `pendingApproval` | Records awaiting approval |
| `completedThisMonth` | Approved records this calendar month |
| `openActionPlans` | Action plans not closed |
| `overdueActionPlans` | Action plans past due date |

ACC users see contractor filter (RHI / ASEC / ALL). Contractor users see own org only.

### 1.9 Reports (6 types)

| Report | Content |
|--------|---------|
| Compliance | Route adherence, missed tasks by equipment/period |
| Overdue | Assets past due with severity ranking |
| Oil Samples | Sample history, lab findings, anomalies |
| Route Completion | Completeness rates by technician/period |
| Action Plans | Open, closed, overdue action plan summary |
| Contractor Comparison | RHI vs ASEC compliance (ACC only) |

Reports computed on-read from sheet data. CSV export not implemented (501 returned).

### 1.10 Mobile / Offline Behavior

- **No true offline:** no service worker, IndexedDB, or sync queue
- Mobile: longer token TTL (30 days vs 8 hours desktop), session in `localStorage` vs `sessionStorage`
- Screen state persisted in `sessionStorage` (filters, active tabs, scroll position)
- In-memory GET cache with TTL — stale-while-revalidate on tab refocus
- `START_ACC_OIL_MOBILE.bat` opens Chrome devtools for mobile testing

### 1.11 Settings & Configuration

| Setting Key | Default | Effect |
|-------------|---------|--------|
| `drive.oilChangePhotosFolderId` | — | Google Drive folder for oil change photos |
| `drive.pdfFolderUrl` | — | Google Drive folder for lab PDFs |
| `deviation.quantity_threshold_pct` | 20 | Trigger notification if quantity deviates > 20% |
| `repeated_rejection.threshold` | 3 | Auto-create action plan after N rejections |

Settings tabs: Users & Roles, Permission Templates (16 screens), Notification Routing,
Audit Log, General, Appearance (13 themes).

---

## 2. Complete Field Inventory

### 2.1 Lubrication Point (LP Master) Fields

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `LP ID` | String | Sheet col A | Business key (LP_ID), immutable |
| `Equipment Code` | String | Sheet col B | Equipment_ID, master key |
| `Equipment Name` | String | Sheet col C | Display name |
| `Area` | String | Sheet col D | Plant area / zone |
| `Contractor` | String | Sheet col E | RHI / ASEC / ACC |
| `Point Description` | String | Sheet col F | Human-readable LP name |
| `Point Code` | String | Sheet col G | Internal code |
| `Position` | String | Sheet col H | Physical location on equipment |
| `Lubricant Type` | String | Sheet col I | Lubricant grade / spec |
| `Standard Qty (L)` | Number | Sheet col J | Expected volume in litres |
| `Frequency Type` | String | Sheet col K | Calendar / OH Hours / Condition |
| `Frequency Label` | String | Sheet col L | Human label (e.g. "Monthly") |
| `Frequency Interval (days)` | Number | Sheet col M | Calendar days between changes |
| `OH Hours Reference` | Number | Sheet col N | Operating hours trigger |
| `Oil Analysis Required` | Boolean | Sheet col O | Whether oil sampling applies |
| `Last Oil Sample Date` | Date | Sheet col P | Derived from sample history |
| `OA Interval (days)` | Number | Sheet col Q | Sampling frequency |
| `OA Interval Label` | String | Sheet col R | Human label for sampling interval |
| `Remarks` | String | Sheet col S | Free text |
| `isActive` | Boolean | Derived | Soft-delete flag |
| `lastChangeDateCache` | Date | Derived | Derived from latest APPROVED history row |
| `nextDue` | Date | Derived | lastChangeDateCache + frequencyInterval |
| `status` | Enum | Derived | OVERDUE / DUE_TODAY / DUE_THIS_WEEK / DUE_THIS_MONTH / OK / NO_HISTORY / CONDITION_MONITORING |
| `oaStatus` | Enum | Derived | Same buckets for sampling schedule |
| `gearboxBrand` | String | Equipment join | Brand of gearbox (equipment detail) |
| `opTempC` | Number | Equipment join | Operating temperature |
| `annualRhActual` | Number | Equipment join | Annual running hours actual |

**LP status buckets (old app):**
- `OVERDUE` — past next due date
- `DUE_TODAY` — next due = today
- `DUE_THIS_WEEK` — due within 7 days
- `DUE_THIS_MONTH` — due within calendar month
- `OK` — scheduled, not yet due
- `NO_HISTORY` — never serviced
- `CONDITION_MONITORING` — frequency type is condition-based

### 2.2 Oil Change Form Fields

**Step 1 — Select:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Equipment ID | Searchable select | Yes | Filters LP list |
| Lubrication Point | Select | Yes | Filtered by equipment |

**Step 2 — Current Info (read-only display):**
| Field | Displayed |
|-------|-----------|
| LP description | Yes |
| Lubricant type | Yes |
| Standard quantity | Yes |
| Last change date | Yes |
| Next due date | Yes |
| Current status | Yes (color-coded) |

**Step 3 — Record:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `lubricationDate` | Date picker | Yes | Not future |
| `formOilGrade` | Text / select | Yes | Oil grade / type |
| `formOilBrand` | Text | No | Brand name |
| `formQty` | Number (litres) | No | > 0 if provided; triggers notification if deviates > 20% from standard |
| `formFilterChanged` | Boolean (Yes/No) | No | Filter replacement flag |
| `formBreatherService` | Boolean (Yes/No) | No | Breather service flag |
| `formRunningHours` | Number | No | Equipment running hours at time of service |
| `formTechnician` | Text / user select | No | Who performed the service |
| `formRemarks` | Textarea | No | Free text notes |
| `formPhotoUrl` | URL text input | No | Google Drive link (pasted, not uploaded) |

**Photo naming convention:** `EquipmentID_LPID_YYYYMMDD_HHMMSS.jpg`

**POST payload to backend:**
```
lpId, lubricationDate, quantityUsedL, runningHours, remarks, oilTypeUsedId, photoUrl
```

### 2.3 Oil Change History Record (after approval)

| Field | Notes |
|-------|-------|
| Record ID | Unique |
| LP ID | FK |
| Equipment ID | FK |
| Date Performed | |
| Quantity Used (L) | |
| Oil Type Used | |
| Filter Changed | Boolean |
| Breather Serviced | Boolean |
| Running Hours | |
| Technician | |
| Remarks | |
| Photo URL | Drive link |
| Photo File ID | Drive file ID |
| Status | PENDING_APPROVAL / APPROVED / REJECTED |
| Rejection Reason | |
| Submitted By | |
| Submitted At | |
| Approved/Rejected By | |
| Approved/Rejected At | |

### 2.4 Sampling / Lab Fields

**Sample Collection Form:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `lpId` | Select | Yes | Which LP was sampled |
| `sampledDate` | Date | Yes | Collection date |
| `sampleIdLab` | Text | Yes | Lab tracking number |
| `runningHours` | Number | No | Hours at collection |
| `collectedBy` | User | Yes | Technician |
| `remarks` | Text | No | Field notes |
| `collectPhotoUrl` | URL | No | Photo of collection |
| `sourcePdfUrl` | URL | No | Lab PDF link |

**Oil Samples Sheet columns:**
`Lab Sample ID`, `LP ID`, `Equipment`, `Sampled Date`, `Report Status`,
`Recommendations`, `Source PDF URL`, `Uploaded By`, `Uploaded At`

**Sample Status Flow:**
`Due → Collected → Waiting Lab Result → Analysis Available → Closed`

**Oil Sample Parameter catalog (per sample):**

| Group | Parameters |
|-------|-----------|
| Wear Metals | Ag, Al, Cr, Cu, Fe, Mo, Ni, Pb, Sn |
| Contaminants | K, Na, Si |
| Additives | B, Ba, Ca, Mg, P, Zn |
| Physical | Visc40, Visc100, ViscIndex, TAN, Water, PQIndex |

Each parameter stored as: `Lab Sample ID`, `Parameter Group`, `Parameter Key`,
`Parameter Label`, `Unit`, `Value`, `Status` (Normal / Warning / Critical).

### 2.5 Route Center Fields

**Route Create Form:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Contractor | Select | Yes | RHI or ASEC (ACC selects) |
| Area | Select | No | Filter LPs by area |
| Oil Type Filter | Select | No | Filter LPs by lubricant type |
| LP Multi-Select | Multi-select | Yes | At least 1 LP required |
| Frequency | Select | Yes | One Time / Daily / Weekly / Monthly / Quarterly / Semi-Annual / Annual |
| Due Date | Date | Yes | Target completion date |
| Technician | User select | Yes | Assigned field technician |
| Route Name | Text | Auto | Auto-generated or custom |

**Route record fields:**
`routeId`, `routeName`, `contractorId`, `areaFilter`, `oilTypeFilter`, `lpIds[]`,
`frequencyType`, `dueDate`, `assignedTo`, `assignedBy`, `status`, `createdAt`,
`completedAt`, `nextRouteId` (for recurrence chain)

**Route statuses:**
`Draft → Assigned → In Progress → Completed` (also: `Pending Approval`, `Cancelled`)

**Route Item (per LP in route):**
`routeItemId`, `routeId`, `lpId`, `status` (`Pending / Complete / Skip_Pending / Skip_Approved`),
`completedAt`, `skipReason`, `skipNotes`, `oilChangeRecordId` (linked when complete)

**Skip Reasons (9 predefined):**
1. Equipment Stopped
2. Safety Restriction
3. No Access
4. Lubrication Point Damaged
5. Lubricant Unavailable
6. Route Assigned Incorrectly
7. Sampling Not Possible
8. Technician Absent
9. Other (free text)

### 2.6 Action Plan Fields

| Field | Type | Notes |
|-------|------|-------|
| Action Plan ID | String | Unique |
| Type | Enum | Corrective / Preventive / Repeated Rejection |
| Equipment / LP | FK | Linked asset |
| Description | Text | Problem description |
| Root Cause | Text | Analysis |
| Action Required | Text | What must be done |
| Assigned To | User | Responsible person |
| Due Date | Date | Target close date |
| Status | Enum | Open / In Progress / Closed / Overdue |
| Priority | Enum | Low / Medium / High / Critical |
| Closed By | User | |
| Closed At | Date | |
| Closure Notes | Text | |

### 2.7 Notification Record Fields

| Field | Notes |
|-------|-------|
| Notification ID | Unique |
| Type | From Notification Types sheet |
| Priority | LOW / MEDIUM / HIGH / CRITICAL |
| Title | |
| Body | |
| Recipient | User ID |
| Read | Boolean |
| Archived | Boolean |
| Related Entity | LP ID / Route ID / Record ID |
| Created At | |

**Notification recipient tokens (resolved server-side):**
`OWN_ORG_ENGINEER`, `OWN_ORG_MANAGER`, `ACC_MANAGER`, `SUPER_ADMIN`,
`ASSIGNED_TECHNICIAN`, `RECORD_SUBMITTER`

### 2.8 Settings / Configuration Fields

**Users & Roles:**
`userId`, `name`, `email`, `titleId`, `titleName`, `organizationId`, `organizationName`,
`dataScope` (OWN_ORG / ALL_ORGS), `screenAccess{}`, `capabilities{}`, `languagePref`,
`isActive`, `lastLogin`

**Permission Template:**
Per role, per screen: `canView`, `canCreate`, `canEdit`, `canDelete`, `canApprove`,
`canExport`; plus capability flags: `submit`, `approve`, `reject`, `manageRoutes`,
`editData`, `closeActions`, `manageUsers`, `viewAudit`

**16 permission screens:**
`dashboard`, `lubrication_explorer`, `route_center`, `oil_sample_center`,
`pending_approvals`, `lubrication_timeline`, `oil_management_center`,
`action_plan_center`, `notification_center`, `reports_center`, `settings`,
`plant_feed`, `sampling_center`, `oil_change_center`, `action_plans`, `audit_log`

---

## 3. Feature Comparison: Old vs v2

| Feature | Old App Status | v2 Current Status | Decision | Reason |
|---------|---------------|-------------------|----------|--------|
| **Lubrication Point Explorer** | Full — tree, search, filter, detail | Partial — table + CRUD in localStorage; no area/contractor grouping | Keep + Redesign | Good concept; needs platform SDK wiring, real filters |
| **LP Status Buckets (7)** | OVERDUE / DUE_TODAY / DUE_THIS_WEEK / DUE_THIS_MONTH / OK / NO_HISTORY / CONDITION_MONITORING | 4 buckets: overdue / due-soon / active / inactive | Keep — expand to 7 | Old granularity was business-correct; v2 simplified too much |
| **LP Detail view (full history)** | Full — history, samples, action plans in one place | Not yet implemented | Keep | Critical for technician and engineer context |
| **Oil Change 3-step wizard** | Full — select → review → record | Placeholder only | Keep + Redesign | 3-step UX was good; needs platform workflow, audit, notifications |
| **Oil grade / brand separation** | Yes (separate fields) | Single `oilType` string | Redesign | Old had `formOilGrade` + `formOilBrand` as separate fields; v2 collapses to one `oilType` — may be acceptable |
| **Filter changed flag** | Yes (`formFilterChanged` boolean) | Not in domain model | Missing | Must add — important maintenance record |
| **Breather service flag** | Yes (`formBreatherService` boolean) | Not in domain model | Missing | Must add — common ancillary task |
| **Running hours field** | Yes (`formRunningHours`) | Not in domain model | Missing | Required for OH-based scheduling |
| **Technician field on form** | Yes (`formTechnician`) | `completedBy` (UserId) | Keep — extend | `completedBy` is the right field; UI should default to logged-in user |
| **Photo attachment** | Optional URL paste | Not in domain model | Missing | `AttachmentReference` value object required per assessment |
| **Quantity deviation alert** | Yes (> 20% triggers notification) | Not implemented | Keep | Business-critical safety signal |
| **Oil type change alert** | Yes (if oil type ≠ standard type for LP) | Not implemented | Keep | Compliance check |
| **Approval workflow** | Full — PENDING → APPROVED / REJECTED → notifications | Not implemented | Keep | Core compliance feature |
| **Repeated rejection action plan** | Auto-creates after N rejections | Not planned in Sprint 03 | Keep — Sprint 07+ | Good pattern; defer to approvals sprint |
| **Route Center** | Full — create, assign, execute, skip, recurrence | Placeholder | Keep | Core operational workflow |
| **Route contractor isolation** | Yes — cannot mix RHI + ASEC LPs | Not implemented | Keep | Business rule critical |
| **Route recurrence** | Yes — auto-generates next route | Not implemented | Keep — Sprint 04 | Good pattern; platform-native |
| **Skip with reason (9 reasons)** | Full | Not implemented | Keep | Field reality — technicians skip for valid reasons |
| **Bulk approve skips** | Yes | Not implemented | Keep — Sprint 05 | Operational efficiency |
| **Sampling Center** | Full — collect, lab ref, PDF link, parameters | Placeholder | Keep + Redesign | Parameter grids from lab are valuable; PDF link is sufficient for v2 |
| **Oil Sample Parameters grid** | 24 parameters across 4 groups | Not implemented | Keep — Sprint 06 | Important for oil analysis module integration |
| **Dashboard KPIs (15)** | 15 KPIs + charts + contractor comparison | 0 (all hardcoded to "0") | Keep — Sprint 09 | Old KPI set was comprehensive and correct |
| **Compliance % calculation** | (total − overdue) / total × 100 | Not implemented | Keep | Standard reliability metric |
| **Reports (6 types)** | 6 computed on-read reports | Placeholder | Keep — Sprint 08 | Core for ACC oversight |
| **Contractor Comparison report** | ACC only | Not planned | Keep — Sprint 08 | Valuable for ACC managers |
| **Action Plans** | Full CRUD with priority, root cause, closure | Not implemented | Keep — Sprint 07+ | Operational continuity |
| **Notifications (10 triggers)** | In-app only | Not wired | Keep — Sprint 04+ | Platform `sdk.notifications` ready |
| **Lubrication Timeline** | Multi-LP calendar view | Not implemented | Keep — Sprint 08+ | Good visualization; complex UI |
| **Plant Feed** | Org-wide activity stream | Not implemented | Redesign — defer | Platform audit log serves this; avoid duplication |
| **Oil Management / Inventory** | Oil stock, purchase log, forecast | Not implemented | Redesign — defer | Out of Sprint 03 scope; plan separately |
| **13 visual themes** | Yes | Platform handles theming | Drop | Platform shell owns theming |
| **Google Sheets as DB** | Yes — two workbooks | No — platform repository abstraction | Drop | Architecture replaced by platform storage layer |
| **Apps Script backend** | Yes — single /exec URL | No — platform SDK | Drop | Architecture fully replaced |
| **i18n (EN/AR)** | Yes | Yes (Owner Center shell) | Keep | Module must use `useLanguage()` |
| **Offline / mobile** | In-memory cache only; no true offline | Not implemented | Redesign — stub | Platform has no offline infra; queue stub required |
| **Session state persistence** | `sessionStorage` per tab | Not implemented | Keep | Good UX pattern; use `useSessionState` pattern |
| **Permission-gated sidebar** | Yes — per screenAccess map | Platform `Can` components | Keep — native | Platform does this better via `Can`/`PermissionRoute` |
| **Hard delete** | Not available (soft delete only) | Hard delete in `OilLubricationService` | Drop | Must replace with `cancelRecord()` |
| **Audit log** | Full audit on all mutations | Not wired to `sdk.audit` | Keep | Every mutation must call `sdk.audit.log()` |

---

## 4. Features to Keep

These features from the old app carry direct business value and must be in v2:

### 4.1 Mandatory for Sprint 03 (Oil Change Core)

1. **3-step oil change wizard UX** — Select equipment + LP → Review current info → Record service
2. **LP status granularity (7 buckets)** — The old 7-way split is more useful than v2's current 4-way; expand to at least: `overdue`, `due-today`, `due-soon`, `ok`, `no-history`, `inactive`
3. **Quantity deviation alert** — Notify if quantity used deviates > threshold from LP standard quantity
4. **Oil type change alert** — Notify if recorded oil type differs from LP's `lubricantSpec`
5. **Running hours on form** — Required for OH-based scheduling; feeds ForecastingService
6. **Filter changed flag** — Ancillary maintenance boolean; part of the service record
7. **Breather service flag** — Ancillary maintenance boolean; part of the service record
8. **Photo attachment reference** — URI string; user pastes Drive link; stored on record
9. **Approval workflow** — PENDING → APPROVED / REJECTED with reason; updates LP's effective last change date only on APPROVED
10. **Soft-delete (cancelRecord)** — Never hard-delete oil change records; preserve audit trail

### 4.2 Sprint 04+ Features (reference now, build later)

11. **Route Center** — Create, assign, execute, complete, skip with reason, recurrence
12. **Contractor isolation on routes** — Cannot mix contractors in a single route
13. **Skip reasons (9 predefined + Other)** — Field-realistic reason codes
14. **Route recurrence** — Auto-generate next route on completion (non-one-time routes)
15. **Bulk skip approval** — Operational efficiency for managers
16. **Oil Sampling** — Collection → Lab ref → Parameters → Close workflow
17. **24-parameter lab grid** — Required for downstream oil-analysis module integration
18. **Compliance % KPI** — Standard reliability metric; must drive dashboard
19. **Contractor comparison report** — ACC oversight of RHI vs ASEC performance
20. **Quantity deviation and oil type change notifications** — Already listed for Sprint 03

---

## 5. Bad Patterns to Avoid

### 5.1 Architecture Anti-Patterns (old app)

| Pattern | Problem | v2 Replacement |
|---------|---------|----------------|
| Google Sheets as database | No relational integrity, no transactions, 2-second cell read latency | Platform `IRepository<T>` via `sdk.storage` |
| Single Apps Script endpoint (`/exec?fn=...`) | No type safety, no error codes, all calls serialized | Platform service layer with typed `ServiceResult<T>` |
| Salted HMAC passwords on spreadsheet rows | Not enterprise-grade; no SSO | Platform `sdk.auth` |
| No offline support despite field use | Data loss when connectivity drops | Offline queue stub (Sprint 05); document gap |
| PDF text extraction returning 501 | Never finished; documented as "not implemented" | Manual entry approach is correct for v2 |
| CSV export returning 501 | Same pattern | Use `sdk.reporting` export in Sprint 08 |
| Two separate Oil Sample Center screens | Legacy vs new — confusing UX, data duplication | Single Sampling center in v2 |

### 5.2 Data Model Anti-Patterns

| Pattern | Problem | v2 Approach |
|---------|---------|-------------|
| Compliance math only for calendar-frequency LPs | Condition-monitoring LPs excluded from compliance | Track compliance separately for calendar vs OH-based LPs |
| `lastChangeDateCache` derived column on Sheets | Fragile; breaks if history rows reordered | Domain: compute from latest APPROVED `OilChangeRecord.performedAt` |
| Oil type stored as free text only | No normalization; "ISO VG 46" vs "iso vg46" treated as different | v2 should provide a lubricant type lookup; enforce on LP master |
| Hard-coded 20% deviation and 3 rejection thresholds | No admin UI to change | Store in `sdk.config` module settings; expose in Settings page |
| No `workOrderId` linkage on routes | Route items not linked to CMMS work orders | Sprint 03: `workOrderId?` field on oil change record (already in domain types) |
| Token-based notification recipients | Fragile string resolution, impossible to debug | Platform `sdk.notifications` with proper user targeting |

### 5.3 UX Anti-Patterns

| Pattern | Problem | v2 Approach |
|---------|---------|-------------|
| Plant Feed as separate screen | Duplicates audit log; low value | Platform audit log serves this; drop |
| 13 visual themes in Settings | No business value; maintenance burden | Platform shell owns theming; drop |
| Legacy Oil Sample Center alongside new Sampling Center | Two UIs for same domain; confusing | Single center in v2 |
| Drive photo URL pasted manually in form | No validation possible | Keep URL paste; add `AttachmentReference` component with basic URL validation |
| In-memory GET cache with manual TTL | Stale data shown silently | Use React `useMemo`/`useCallback` with explicit invalidation; no silent staleness |

### 5.4 Code Patterns (do not replicate)

- `var FUNCTION_MAP` flat dispatch table for API routing — correct for Apps Script, not for platform
- `sessionStorage` JSON stringification for all filter state — keep the concept but use a typed `useSessionState` hook
- Unchecked `JSON.parse` on localStorage without schema validation — v2 services handle types correctly
- `deleteRecord()` hard delete — replaced by `cancelRecord()` with audit
- Free string error codes in service returns — use typed error constants from `errors.ts`

---

## 6. Missing Fields Before Sprint 03

The current v2 domain model (`modules/oil-lubrication/src/types.ts`) is missing the
following fields required before Sprint 03 (Oil Change Center) can be built correctly.

### 6.1 Missing on `OilChangeRecord`

| Field | Type | Priority | Business Reason |
|-------|------|----------|-----------------|
| `filterChanged` | `boolean \| undefined` | **Must** | Ancillary maintenance record; required for compliance audit |
| `breatherServiced` | `boolean \| undefined` | **Must** | Ancillary maintenance; common field across all LP types |
| `runningHours` | `number \| undefined` | **Must** | OH-based scheduling; feeds ForecastingService; compliance reporting |
| `technicianName` | `string \| undefined` | **Should** | Recorded performer (may differ from `completedBy` user account) |
| `attachmentUri` | `string \| undefined` | **Must** | Photo evidence URI (Drive link); required per assessment Section 3.10 |
| `lubricationPointId` | `LubricationPointId \| undefined` | Already exists | Good |
| `quantityDeviationPct` | `number \| undefined` | **Should** | Store computed deviation for reporting; needed for deviation alert |
| `routeItemId` | `string \| undefined` | **Should** | Link record to route execution; needed for Sprint 04+ |

### 6.2 Missing on `LubricationPoint`

| Field | Type | Priority | Business Reason |
|-------|------|----------|-----------------|
| `pointCode` | `string \| undefined` | **Should** | Internal code distinct from LP_ID name |
| `position` | `string \| undefined` | **Should** | Physical position on equipment (old: `Position` column) |
| `standardQuantityL` | `number \| undefined` | **Must** | Required for quantity deviation alert; must be stored on LP |
| `ohHoursReference` | `number \| undefined` | **Should** | Operating hours threshold for OH-based scheduling |
| `oilAnalysisRequired` | `boolean` | **Should** | Whether sampling is required on this LP |
| `oaIntervalDays` | `number \| undefined` | **Should** | Sampling frequency in days |
| `areaId` / `areaName` | `string \| undefined` | **Must** | Plant area; required for route filtering and dashboard grouping |
| `status` | Derived / `LpStatus` | **Must** | Status bucket computed from schedule; needed for dashboard and explorer |

> **Note on `areaName`:** The current UI `LpExplorerRow` has `area` as a flat string but the
> domain `LubricationPoint` has only `location` (physical position description). These are
> different concepts. `area` = plant zone; `location` = physical position on equipment.
> Both are needed.

### 6.3 Missing on `OilChangeRecordCreateRequest`

| Field | Must add |
|-------|----------|
| `filterChanged` | Yes |
| `breatherServiced` | Yes |
| `runningHours` | Yes |
| `technicianName` | Yes |
| `attachmentUri` | Yes |

### 6.4 Missing on `OilChangeRecordUpdateRequest`

| Field | Must add |
|-------|----------|
| `filterChanged` | Yes |
| `breatherServiced` | Yes |
| `runningHours` | Yes |
| `technicianName` | Yes |
| `attachmentUri` | Yes |

### 6.5 Missing Types (new for Sprint 03)

| Type | Purpose |
|------|---------|
| `AttachmentReference` | Value object: `{ uri: string; uploadedAt: IsoTimestamp; label?: string }` |
| `OilChangeApproval` | Approval record: `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason` |
| `LpStatusBucket` | Enum: `overdue \| due-today \| due-soon \| ok \| no-history \| condition-monitoring \| inactive` |
| `QuantityDeviationAlert` | Value: `{ expected: number; actual: number; deviationPct: number; threshold: number }` |
| `OilTypeChangeAlert` | Value: `{ expected: string; actual: string }` |

### 6.6 Missing Validation Rules

| Rule | Field | Logic |
|------|-------|-------|
| Date not in future | `lubricationDate` / `performedAt` | `performedAt <= today()` |
| Quantity > 0 | `quantityLitres` | If provided, must be > 0 |
| Quantity deviation alert | `quantityLitres` vs `LP.standardQuantityL` | Notify if `abs(actual - expected) / expected > threshold (default 20%)` |
| Oil type change alert | `oilType` vs `LP.lubricantSpec` | Notify if recorded type ≠ LP spec |
| LP must be active | `lubricationPointId` | Cannot submit oil change for inactive LP |
| Running hours non-negative | `runningHours` | If provided, must be ≥ 0 |
| URI format | `attachmentUri` | Basic URL validation if provided |
| Duplicate LP_ID | `lubricationPointId` on create | Must not conflict with existing LP_ID |

---

## 7. Recommended Redesign Before Sprint 03

### 7.1 Extend `types.ts` — Add Missing Fields

Add the 5 missing fields to `OilChangeRecord` and its create/update requests:
`filterChanged`, `breatherServiced`, `runningHours`, `technicianName`, `attachmentUri`.

Add the missing fields to `LubricationPoint`:
`standardQuantityL`, `areaName`, `pointCode`, `position`, `ohHoursReference`,
`oilAnalysisRequired`, `oaIntervalDays`.

Add new value objects: `AttachmentReference`, `LpStatusBucket`.

### 7.2 Align UI `LpExplorerRow` with Domain `LubricationPoint`

The current UI model and the domain model have diverged:

| UI field (`LpExplorerRow`) | Domain field (`LubricationPoint`) | Action |
|---------------------------|-----------------------------------|--------|
| `area` | Missing | Add `areaName` to domain |
| `oilType` | `lubricantSpec` | Rename domain field to `lubricantType` or add alias |
| `frequencyDays` | `frequency.intervalDays` | Flatten in view model |
| `lastChangeDate` | Not on LP (on record) | Compute from latest approved record |
| `nextDueDate` | Not on LP | Derive: `lastChangeDate + frequency.intervalDays` |

**Recommendation:** Keep the UI `LpExplorerRow` as a separate view model (correct
architecture) but ensure the mapping layer covers all fields. Do not put derived fields
on the `LubricationPoint` entity itself — keep them in the view model.

### 7.3 Replace `deleteRecord()` with `cancelRecord()`

Before Sprint 03 ships any oil change UI, ensure the service method is correct.
The old app never allowed hard deletion of lubrication history — this is the right
business rule for a reliability platform.

### 7.4 Establish `OIL_LUBRICATION_PERMISSIONS` Constants

Before any permission-gated UI can be built in Sprint 03, the permission action constants
must exist in `modules/oil-lubrication/src/permissions.ts`. The minimum set needed for
Sprint 03:

```typescript
export const OIL_LUBRICATION_PERMISSIONS = {
  VIEW_OIL_CHANGE: 'oil-lubrication:oil-change:view',
  RECORD_OIL_CHANGE: 'oil-lubrication:oil-change:create',
  APPROVE_OIL_CHANGE: 'oil-lubrication:oil-change:approve',
  CANCEL_OIL_CHANGE: 'oil-lubrication:oil-change:cancel',
  VIEW_LUBRICATION_POINT: 'oil-lubrication:lubrication-point:view',
  MANAGE_LUBRICATION_POINT: 'oil-lubrication:lubrication-point:manage',
} as const;
```

### 7.5 Establish `ENTITY_TYPES` Constants

```typescript
export const OIL_LUBRICATION_ENTITY_TYPES = {
  OIL_CHANGE_RECORD: 'oilChangeRecord',
  LUBRICATION_POINT: 'lubricationPoint',
} as const;
```

### 7.6 Add `SchedulingService` Stub

The overdue detection logic needed for Sprint 03 must calculate `nextDue` from
`lastChangeDate + frequency.intervalDays` and classify into status buckets. Create
`src/scheduling.service.ts` with:
- `computeNextDueDate(lastChange: IsoTimestamp, frequency: OilChangeFrequency): IsoTimestamp`
- `computeLpStatusBucket(nextDue: IsoTimestamp | null, isActive: boolean): LpStatusBucket`
- `detectOverdueRecords(records: OilChangeRecord[], points: LubricationPoint[]): OilChangeRecord[]`

### 7.7 Wire `LubricationPointService` to Platform SDK

The domain `LubricationPointService` in `modules/oil-lubrication/src/lubrication-point.service.ts`
exists but the repository adapter (`LubricationPointRepository`) does not. Before Sprint 03,
the LP lookup service must work so the oil change form can:
- Populate the equipment selector
- Load LP details for the review step
- Validate that the LP is active before submission

The Owner Center UI currently uses a separate `localStorage` service
(`apps/owner-center/src/modules/oil-lubrication/lubrication-point.service.ts`).
Sprint 03 should unify these — the UI should call the domain module's service, not
the local UI-layer service.

---

## 8. Final Sprint 03 Scope

### 8.1 What Sprint 03 Delivers

Sprint 03 = **Oil Change Core: Records, Scheduling, Overdue Detection, Approval UI**

Based on the old app reference and v2 gap analysis, Sprint 03 must deliver:

#### Domain Layer (`modules/oil-lubrication/src/`)

| Deliverable | Notes |
|-------------|-------|
| Extended `OilChangeRecord` type — add 5 missing fields | `filterChanged`, `breatherServiced`, `runningHours`, `technicianName`, `attachmentUri` |
| Extended `LubricationPoint` type — add 4 missing fields | `standardQuantityL`, `areaName`, `pointCode`, `position` |
| `AttachmentReference` value object | URI + label + uploadedAt |
| `LpStatusBucket` enum | 6 states: overdue / due-today / due-soon / ok / no-history / inactive |
| `OIL_LUBRICATION_PERMISSIONS` constants | Sprint 03 actions minimum |
| `OIL_LUBRICATION_ENTITY_TYPES` constants | `oilChangeRecord`, `lubricationPoint` |
| `LubricationPointRepository` adapter | Implements `ILubricationPointRepository` via `sdk.storage` |
| `SchedulingService` | `computeNextDueDate`, `computeLpStatusBucket`, `detectOverdue` |
| `OilLubricationService` — extended | Add `cancelRecord()`, remove `deleteRecord()`, add overdue detection, add deviation alert logic, add audit logging |
| Notification calls on: oil change submitted, overdue detected, deviation alert | Via `sdk.notifications` |
| Audit logging on all mutations | Via `sdk.audit` |

#### UI Layer (`apps/owner-center/src/pages/oil-lubrication/` or module `src/ui/`)

| Deliverable | Route |
|-------------|-------|
| Oil Change list page — filterable by status, equipment, date range | `/oil-lubrication/oil-change` |
| Oil Change create form — 3 steps: Select → Review → Record | `/oil-lubrication/oil-change/new` |
| Oil Change detail page — full record view with approval state | `/oil-lubrication/oil-change/:id` |
| Equipment history view — all oil changes for an equipment | `/oil-lubrication/oil-change?equipment=:id` |
| Oil Change status chip variants — all 5 `OilChangeStatus` values | Shared component |
| `AttachmentReference` component — URI input + clickable link display | Shared |
| Pending approvals panel — within oil change list or dashboard | `/oil-lubrication/oil-change` |
| Approve / Reject form — with reason field on rejection | Modal in list/detail |

### 8.2 Sprint 03 Exclusions (confirm out of scope)

| Item | Why excluded |
|------|-------------|
| Route Center | Sprint 04 |
| Sampling | Sprint 06 |
| Forecasting page | Sprint 07 |
| Repeated rejection action plans | Sprint 07+ |
| Dashboard live KPIs | Sprint 09 |
| Reporting | Sprint 08 |
| Notification rule configuration UI | Sprint 10 |
| Offline queue | Sprint 05 (stub) |
| Oil Management / inventory | Separate planning required |

### 8.3 Sprint 03 Definition of Done

- [ ] All TypeScript compiles with `strict: true`, zero errors
- [ ] All service methods return `ServiceResult<T>`
- [ ] All data mutations call `sdk.audit.log()`
- [ ] All permission-gated UI wrapped in `Can` / `PermissionRoute`
- [ ] All UI text is bilingual (EN + AR via `useLanguage()`)
- [ ] `filterChanged`, `breatherServiced`, `runningHours`, `attachmentUri` present on oil change record
- [ ] `standardQuantityL` present on LubricationPoint
- [ ] Quantity deviation alert fires when qty deviates > 20% from LP standard
- [ ] Oil type change alert fires when recorded type ≠ LP spec
- [ ] `cancelRecord()` replaces `deleteRecord()` — no hard deletes
- [ ] Approval workflow: PENDING → APPROVED / REJECTED with reason, notification, audit
- [ ] Overdue detection elevates scheduled records past due date
- [ ] `LubricationPointRepository` adapter wired; UI uses domain service (not localStorage)
- [ ] Module health check passes in `/system-health`
- [ ] No direct imports from `@acc-reliability/kernel`, `@acc-reliability/services`, or `@acc-reliability/storage`
- [ ] `ContractorTechnician` cannot approve (permission denied)
- [ ] `ContractorEngineer` can approve (permission passes)

### 8.4 Fields Required on Oil Change Form (Sprint 03)

This is the complete field list for the oil change create form, derived from the old app
reference and v2 domain alignment:

**Step 1 — Select**
- Equipment ID (searchable select from LP repository)
- Lubrication Point (select, filtered by equipment, active only)

**Step 2 — Review (read-only)**
- LP name, point code, position
- Lubricant spec (expected oil type)
- Standard quantity (L) — shows expected volume
- Last change date
- Next due date
- Current status (color-coded status chip)

**Step 3 — Record**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Date performed | Date picker | Yes | ≤ today |
| Oil type / grade | Text + spec reference | Yes | Alert if ≠ LP spec |
| Oil brand | Text | No | Free text |
| Quantity used (L) | Number | No | > 0; alert if deviates > 20% from standard |
| Filter changed | Yes / No toggle | No | Boolean |
| Breather serviced | Yes / No toggle | No | Boolean |
| Running hours | Number | No | ≥ 0 |
| Technician name | Text | No | Defaults to logged-in user name |
| Work order ID | Text | No | Link to CMMS |
| Notes / remarks | Textarea | No | Free text |
| Photo / attachment | URL input | No | Basic URL format validation |
| Source | Hidden/auto | Auto | `manual` by default |

---

## Appendix A: LP Status Mapping (Old → v2)

| Old `StatusBucket` | v2 `LpStatus` (current) | Recommended v2 `LpStatusBucket` |
|-------------------|------------------------|--------------------------------|
| `OVERDUE` | `overdue` | `overdue` |
| `DUE_TODAY` | `due-soon` (7-day window) | `due-today` (separate bucket) |
| `DUE_THIS_WEEK` | `due-soon` | `due-soon` |
| `DUE_THIS_MONTH` | `active` | `ok` (separate from due-soon) |
| `OK` | `active` | `ok` |
| `NO_HISTORY` | `active` (incorrectly) | `no-history` |
| `CONDITION_MONITORING` | Not modeled | Defer — complex; use `ok` for now |
| — | `inactive` | `inactive` |

**Action:** Sprint 03 should expand status bucket to at least 6 values.
`CONDITION_MONITORING` can be deferred to Sprint 06+ (sampling integration).

---

## Appendix B: Old App Skip Reasons (for Sprint 04+ reference)

```
1. Equipment Stopped
2. Safety Restriction
3. No Access
4. Lubrication Point Damaged
5. Lubricant Unavailable
6. Route Assigned Incorrectly
7. Sampling Not Possible
8. Technician Absent
9. Other
```

---

## Appendix C: Old App Notification Routing Token System (for Sprint 04+ reference)

Recipients were resolved server-side from these tokens:
- `OWN_ORG_ENGINEER` → all engineers in the LP's contractor org
- `OWN_ORG_MANAGER` → all managers in the LP's contractor org
- `ACC_MANAGER` → ACC org managers
- `SUPER_ADMIN` → platform superadmins
- `ASSIGNED_TECHNICIAN` → technician assigned to the route
- `RECORD_SUBMITTER` → user who submitted the pending record

**v2 approach:** Platform `sdk.notifications` with `userId` targeting. The module
resolves recipients from the workflow context and user/org data via `sdk.users` and
`sdk.contractors`.

---

*End of document.*  
*Repository: ACC-Reliability-Platform-Implementation*  
*Prepared for: Sprint 03 planning — Oil Change Center*  
*Reference inspection: 2026-07-01*
