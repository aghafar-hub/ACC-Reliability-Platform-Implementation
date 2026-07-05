# ACC Reliability Platform
# 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md

## 1. Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-129 |
| Title | ACC Reliability Platform — Engineering Vocabulary Standard |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, report, notification, email, API display name, database display name, AI-generated content, and piece of documentation |
| Governs Under | 099–128 (this document is the single source of truth for terminology across all of them) |
| Scope Note | This document defines engineering *language* only — no code, CSS, React, or database schema. Where this document's canonical terms differ from wording already used in 099–128, those documents are not modified here; the conflict is recorded in §13 and the Summary for future correction. |

---

## 2. Purpose

To eliminate ambiguity in every word the platform uses to describe equipment, condition, people, and process — so that UI, reports, notifications, emails, dashboards, mobile screens, documentation, APIs, database display names, and AI-generated content all say the same thing, the same way, everywhere.

---

## 3. Engineering Language Philosophy

Words are part of the platform's design, not an afterthought applied after the screens are built. A platform that shows the right data with the wrong word has still failed the engineer reading it (099 §9, §10). Where two words could mean the same thing, this document picks exactly one — the other becomes forbidden, not merely discouraged.

---

## 4. Naming Principles

- **One concept, one term.** If a concept already has an official term, no module, report, or AI response may introduce a synonym for it.
- **Plain over clever.** A term is chosen for clarity to a working engineer, never for how sophisticated it sounds.
- **Stable over trendy.** Terms are chosen to still make sense in ten years (099 §12), not because they are currently fashionable.
- **Precision over familiarity.** Where a common industry word is ambiguous in this platform's context (e.g., "Asset," "Alarm"), a more precise term is chosen even if it is less colloquial.
- **Defined before used.** A term with no entry in this document does not yet exist for platform purposes — see §12 Future Governance.

---

## 5. Equipment Terminology

| Term | Official Definition |
|---|---|
| **Equipment** | The physical asset itself — the platform's central subject (099 §3). Never "Machine" (§11). |
| **Equipment_ID** | The canonical, unique identifier for one Equipment record (100 §6, 108). Always underscore-joined; always Monospace in any presentation (102 §4). |
| **Equipment Name** | The human-readable label for an `Equipment_ID` — descriptive, not unique on its own; uniqueness is `Equipment_ID`'s job alone. |
| **Equipment Type** | The category of equipment (Pump, Fan, Gearbox, etc.), per 103 §6's Engineering Icons vocabulary — used for iconography and grouping, never as a substitute for `Equipment_ID`. |
| **Area** | The platform's data field for an equipment's locational grouping (used in tables/filters, 116/118). |
| **Production Area** | A named operational zone within the plant, typically the descriptive value an `Area` field holds — not a separate data concept from Area. |
| **Production Line** | A specific manufacturing line within a Production Area, used descriptively unless a future module models it as its own field. |
| **Module** | A capability of the platform (099 §2, 100 §3) — Oil Analysis, Lubrication, etc. Never "app" or "product." |
| **Lubrication Point (LP / `LP_ID`)** | A specific point on an equipment where lubricant is sampled or applied. One equipment may have many LPs; an LP always belongs to exactly one `Equipment_ID` (108). |
| **Oil Sample** | A single physical sample taken at one Lubrication Point, tied to one `LP_ID` and one `Equipment_ID`. |
| **Oil Analysis** | The module/discipline assessing oil condition via Oil Samples; also the Module's proper name. |
| **Laboratory Report** | The external source document received from a lab (e.g., an imported PDF) — the raw input. |
| **Oil Report** | The platform's own rendered, derived presentation of an Oil Sample's results (a Report per 108/128) — distinct from the Laboratory Report it is built from. |
| **Inspection** | A manual, human-performed check of equipment condition — distinct from a Measurement, which is instrument- or lab-derived. |
| **Measurement** | A recorded, instrument-derived value (e.g., a vibration reading) — a specific kind of Record (108). |
| **Condition** | The current engineering state of an equipment or record, expressed using Condition Status vocabulary (§7): Normal / Caution / Alert. |
| **Health** | The synthesized, cross-module view of Condition for one equipment (114's Equipment Health) — Condition is one module's assessment; Health is the aggregate across all of them. |
| **Reliability** | The discipline/module concerned with long-term failure risk and asset performance trends, distinct from day-to-day Condition. |
| **Timeline** | The chronological, presented view of an entity's Records and Actions (104 §4, 114). |
| **History** | The complete, unabridged data a Timeline presents (108) — History is the data; Timeline is the view. |
| **Engineering Action** | A task raised in response to a Condition or Record requiring follow-through (104 §3, 108). |
| **Corrective Action** | An Engineering Action taken in response to an existing finding — after the fact. |
| **Preventive Action** | An Engineering Action taken to prevent an anticipated future issue — before the fact. Corrective and Preventive differ only by timing/intent; both are Engineering Actions. |
| **Notification** | A platform-delivered message alerting a user to something requiring awareness (104 §7, 123). Never a synonym for "Alert" — a Notification may be *about* an Alert-condition equipment, but the two words are not interchangeable. |
| **Alert** | The highest level of Condition Status (§7) — never used to mean Equipment Criticality, and never used as a synonym for Notification. |
| **Caution** | The middle level of Condition Status (§7). |
| **Normal** | The lowest-risk level of Condition Status (§7) — replaces "Healthy," which is retired by this document (see §13 conflicts). |
| **Equipment Criticality** | A fixed or slowly-changing ranking of how much it matters to the business if this equipment fails: Critical / Important / Standard (§7) — independent of today's Condition. |
| **Contractor** | An external party executing work under ACC's supervision (100 §5, 115) — currently RHI, ASEC. |
| **Owner** | ACC itself, in its role as asset owner and Reliability Authority (100 §1, 115) — "Owner" and "ACC" are interchangeable as a role name; never used to describe a Contractor. |
| **Approval** | A formal, logged sign-off decision (104 §8, 108). |
| **Review** | An in-progress evaluation step prior to an Approval decision (104 §8) — sequential and distinct from Approval. |
| **Verification** | Confirming a Record's data is accurate and complete — typically a human act, part of Review. |
| **Validation** | Confirming a Record or value meets defined engineering rules/thresholds — typically automated (104 §10). Verification and Validation are never used interchangeably. |
| **Route** | A defined sequence of stops/inspections for field work (Route Center module). |
| **Task** | A general unit of work. When tied to engineering follow-through, the canonical term is **Engineering Action**, not "Task" — "Task" is reserved for describing a Route stop's unit of work specifically. |
| **Assignment** | Designating a person or team responsible for an Engineering Action or Route Task (104 §8 Assign dialog). |
| **Dashboard** | A decision surface (106) — never a report, archive, or status wall. |
| **Command Center** | A descriptive, identity-level term for the platform's overall experience — not a distinct screen category; every actual screen is still classified under 111 (usually as a Dashboard), never as a separate "Command Center" type. |
| **Report** | A derived, read-only, point-in-time document (108, 128) — never confused with a Dashboard. |
| **Analytics** | Interactive, cross-entity exploration (107, 111) — distinct from both Dashboard and Report. |
| **Forecast** | A projection of a metric forward using defined, rule-based logic (e.g., a 30/60/90-day sampling forecast) — always labeled as a forecast, never presented as a measured fact. |
| **Prediction** | Reserved specifically for AI/ML-derived projections (100 §11) — never used for a rule-based Forecast, so a reader can tell from the word alone whether a number came from a formula or a model. |
| **Recommendation** | An AI- or rule-engine-suggested action (104 §3 AI Insight Card) — always distinguished from a human-raised Engineering Action until a human accepts it. |

---

## 6. Canonical Vocabulary Table

| Concept | Official Term | Allowed Alternatives | Forbidden Terms | Reason | Example |
|---|---|---|---|---|---|
| Physical asset | Equipment | — | Machine, Asset (non-financial), Unit | 099 §3 makes Equipment the platform's one canonical subject | "Equipment EQ-4021 requires attention," never "Machine EQ-4021" |
| Unique identifier | `Equipment_ID` | — | Equipment Code, Asset Tag, Equipment No. | One identifier, one name, everywhere (108) | "Equipment_ID: EQ-4021" |
| Worst condition level | Alert | — | Critical, Danger, Alarm, Urgent | Reserves "Critical" exclusively for Equipment Criticality (§7) | "Condition: Alert" |
| Equipment importance ranking | Equipment Criticality | Criticality | Priority, Importance Level, Risk Class | Distinguishes a fixed ranking from a changing condition (§7) | "Equipment Criticality: Critical" |
| Engineering follow-through | Engineering Action | Action | Task, Ticket, Work Order (unless referencing an external system) | "Task" is reserved for Route stops; "Ticket" implies a support-desk system this platform is not | "3 open Engineering Actions" |
| Formal sign-off | Approval | — | Sign-off, Confirmation (as a noun for this step) | Keeps one word tied to the logged, authoritative decision (104 §8) | "Pending Approval" |
| Platform-delivered alert message | Notification | — | Alert (as a noun for the message itself), Message, Ping | Prevents confusing "a message about a condition" with "the condition itself" | "New Notification: Sample overdue" |
| Asset-owning authority | Owner / ACC | ACC Owner | Client, Customer, Admin (for this role) | Owner is a supervisory role, not a customer relationship (100 §5) | "Visible to Owner only" |
| Executing party | Contractor | — | Vendor, Supplier, Partner | Contractor specifically reflects the supervised-execution relationship (099 §5) | "Contractor: RHI" |
| Live decision surface | Dashboard | — | Command Center (as a screen type), Home, Overview | Command Center is identity language, not a screen category (111) | "Oil Analysis Dashboard" |
| Frozen, derived document | Report | — | Export, Summary Document | Keeps Report distinct from Dashboard/Analytics (106, 128) | "Monthly Reliability Report" |
| Rule-based forward projection | Forecast | — | Prediction (reserved for AI), Estimate | Lets a reader distinguish formula-derived from model-derived numbers | "Sampling Forecast: 14 due in 30 days" |
| AI-derived forward projection | Prediction | — | Forecast (reserved for rule-based) | See above | "AI Prediction: elevated wear risk" |
| One equipment's chronological data | History | — | Log (as a synonym for History), Audit Trail (unless referring to a system log specifically) | Keeps History as the data and Timeline as its view (108) | "Full History for EQ-4021" |
| Lubrication sampling point | Lubrication Point / `LP_ID` | LP | Sampling Point, Test Point | One term, consistently abbreviated the same way | "LP_ID: LP-114" |

---

## 7. Severity Terminology (Mandatory)

This section resolves two concepts that must never be confused: **Condition Status** and **Equipment Criticality**.

**Condition Status** answers: *what is this specific record or equipment's current engineering state, right now?* It changes frequently, tied to the latest sample, reading, or inspection. Its three official levels are:

- **Normal** — within acceptable engineering parameters.
- **Caution** — trending toward risk; should be monitored.
- **Alert** — immediate engineering risk; requires urgent attention.

**Equipment Criticality** answers a completely different question: *how much does it matter to the business if this equipment fails, regardless of how it is doing today?* It is set once, or reviewed periodically, based on the equipment's role in production, safety, and cost of downtime. Its three official levels are:

- **Critical** — failure would cause severe production, safety, or cost impact.
- **Important** — failure would cause meaningful but recoverable impact.
- **Standard** — failure has limited broader impact.

**These are independent dimensions.** A piece of equipment can be any combination of the two:

- A **Standard**-criticality piece of equipment can be in **Alert** condition today — it needs urgent attention right now, but the business impact if it fully failed would be limited.
- A **Critical**-criticality piece of equipment can be in **Normal** condition today — it is fine right now, but if it ever fails, the impact is severe, which is why it warrants closer monitoring even while healthy.

**Resolution rule:** "Alert" is never used to describe Equipment Criticality. "Critical" is never used to describe Condition Status. Any future combination of the two (e.g., a Risk Score weighting condition by criticality, as discussed in 106/114) must display both terms explicitly and separately — never merge them into one ambiguous word or number.

---

## 8. Owner vs Contractor Language

| Role | Definition | Never Confused With |
|---|---|---|
| **ACC / Owner** | The asset-owning Reliability Authority (100 §1, §5) | A Contractor, a Customer |
| **Engineer** | Works inside the detail layer (Equipment, Records, Actions); may or may not hold Approval authority (115) | Technician |
| **Contractor** | An external party executing work under ACC's supervision (currently RHI, ASEC) | Owner, Vendor |
| **Technician** | An individual (ACC or Contractor) performing hands-on field work | Engineer — a Technician executes; an Engineer judges/reviews |
| **Reviewer** | A role performing Review (104 §8) — may be an Engineer or Manager depending on workflow | Approver |
| **Approver** | A role holding Approval authority (115) — a distinct permission from Reviewer, never assumed from visibility alone | Reviewer |
| **Administrator** | Platform/module configuration and governance (111, 115) | Owner's reliability-oversight authority — Administration is a governance capability, never conflated with ACC's supervisory role |
| **Manager** | Typically ACC-side oversight, scoped to a business unit or area (115) | Owner (fleet-wide) |

Responsibilities are never blended: a Contractor is never described using Owner-authority language ("approves," "supervises"), and an Administrator's configuration access is never described as reliability oversight.

---

## 9. Module Vocabulary

Every module — Oil Analysis, Lubrication, Vibration, Reliability, Route Center, Reports, and any future AI module — uses the terms defined in §5–§8 exactly as defined. A module must never invent a local synonym (e.g., Vibration calling a Measurement a "reading event," or Route Center calling an Engineering Action a "job"). Where a module has a genuinely new concept with no existing term, §12 Future Governance applies before it is used anywhere.

---

## 10. Writing Style

- **Engineering writing** — precise, technical, canonical terms used exactly, no hedging language.
- **Executive writing** — the same vocabulary, with fewer technical details; leads with Condition, Criticality, and the Decision at hand.
- **Notifications** — the shortest correct phrasing; canonical terms only; no invented abbreviation that creates ambiguity.
- **Mobile** — identical vocabulary to desktop; terms are never shortened into new slang to save space (109, extending 102 §7's "never recategorize" rule to wording).
- **Reports** — formal; full terms on first use, consistent with 102 §8.
- **Emails** — professional tone, canonical terms, always includes the `Equipment_ID` and its current Condition/Criticality context.
- **AI responses** — restricted to this document's vocabulary; a Forecast is never called a Prediction or vice versa; AI must never invent a new term for an existing concept (100 §11 discipline extended to language).

---

## 11. Forbidden Language

| Forbidden | Use Instead | Why |
|---|---|---|
| Machine | Equipment | 099 §3 — Equipment is the platform's one canonical subject |
| Asset (outside financial context) | Equipment | "Asset" is correct only in genuine accounting/financial contexts (e.g., asset register value); otherwise ambiguous with Equipment |
| Problem | Condition or Finding | Vague and alarmist; doesn't map to a defined vocabulary term |
| Fix | Corrective Action | Casual; doesn't reflect the formal, logged nature of an Engineering Action |
| Danger | Alert (Condition Status) | Not a defined semantic term; implies a safety-system meaning outside this platform's scope |
| Urgent | High Priority, or the specific Condition Status | Subjective and unmeasurable; the platform uses its fixed vocabulary instead |
| Broken | Alert condition, or a specific Finding | Too informal and non-specific to be actionable |
| ASAP | High Priority, or a stated due date | Vague, not measurable, and not tied to any workflow field |
| Issue | Finding or Condition | A generic catch-all that leaves the reader unsure whether it is a data problem or an equipment condition |
| Alarm | Alert (condition) or Notification (message) | "Alarm" implies a physical/SCADA alarm system this platform must not be confused with |
| Critical (meaning Condition Status) | Alert | Reserved exclusively for Equipment Criticality (§7) |
| Healthy (meaning Condition Status) | Normal | Retired by this document in favor of Normal (§7; see conflict noted in §13) |

---

## 12. Future Governance

No developer, module, or AI feature may introduce a new engineering term without adding it here first — the same governance discipline already established for components (104 §15). A proposed term must state: the concept it names, why no existing term already covers it, and its exact definition. Approval rests with the ACC Reliability Department. Once approved, the new term is added to §5 or §6 and becomes mandatory platform-wide from that point forward.

---

## 13. Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §3 Equipment Before Everything, §9, §10, §12
- 100_ACC_BRAND_IDENTITY.md — §1, §5 Owner vs Contractor, §6 Equipment-Centric, §11 Future AI Readiness
- 101_ACC_COLOR_SYSTEM.md — §4 Semantic Colors, §6 Status Color Rules — **terminology conflict**: 101 currently names the condition levels "Critical, Caution, Healthy"; this document supersedes that wording with "Alert, Caution, Normal" and reserves "Critical" for Equipment Criticality. 101 is not modified by this document; it requires a future update pass.
- 102_ACC_TYPOGRAPHY_STANDARD.md — §4 Engineering Numbers (`Equipment_ID` Monospace rule)
- 103_ACC_ICONOGRAPHY_STANDARD.md — §5 Status Icons, §6 Engineering Icons — same terminology conflict as 101; status icon names require future alignment
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §3 AI Insight Card, §7 Notification, §8 Approval/Review/Assign dialogs
- 105_ACC_NAVIGATION_ARCHITECTURE.md — Notification navigation, deep-link rules
- 106_ACC_DASHBOARD_PHILOSOPHY.md — Dashboard vs. Report distinction, KPI/widget philosophy
- 108_ACC_INFORMATION_ARCHITECTURE.md — Record/Action/History/Report/Decision vocabulary
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md — Equipment Health, Equipment Criticality (previously an unnamed placeholder field; formally defined here for the first time)
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md — role definitions in §8
- 120_ACC_KPI_STANDARD.md — **terminology conflict identified in prior audit**: 120 §10's example ("Alert Equipment... colored Critical... Alert status") mixed both vocabularies in one sentence; this document resolves the underlying ambiguity, though 120's own wording still requires a future correction pass
- 123_ACC_NOTIFICATION_STANDARD.md — Notification vs. Alert distinction
- 128_ACC_REPORT_STANDARD.md — Report vs. Dashboard distinction

---

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-06 | Initial draft — full engineering vocabulary established; Condition Status vs. Equipment Criticality formally resolved as distinct concepts. Pending approval. |
