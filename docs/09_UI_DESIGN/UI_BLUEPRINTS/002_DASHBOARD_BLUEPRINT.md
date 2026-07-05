# ACC Reliability Platform
# 002_DASHBOARD_BLUEPRINT.md

## Document Control

| Item | Value |
|---|---|
| Blueprint ID | UIBP-002 |
| Title | Master Dashboard Blueprint |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Governs Under | 099–129 (Approved Design System) — this blueprint introduces no new philosophy or rule; it is a reproducible specification derived from that system |
| Applies To | Every module's Dashboard screen (111) — this is the master; every module dashboard (Oil Analysis, Lubrication, Vibration, Reliability, Route Center, and beyond) inherits it unchanged |
| Scope Note | This is the master specification, not a specific module's dashboard. Measurements given here are design-level specifications, not CSS. |

---

## Purpose

To specify one Dashboard blueprint that every module inherits, so that a Reliability Engineer, a Manager, or a Contractor recognizes the same structure and behavior the moment they open any module's dashboard — Oil Analysis today, Vibration or Reliability Engineering tomorrow.

## How to Read This Blueprint

Every section below uses the same eleven attributes: **Purpose, Position, Priority, Information Hierarchy, Allowed Content, Forbidden Content, Behavior, Desktop, Mobile, Accessibility, Future Scalability.** Where an attribute genuinely does not apply, it is marked N/A rather than forced.

---

# A. Core Regions

## 1. Header

- **Purpose:** States which module's dashboard this is and its immediate context (112).
- **Position:** Top of Content Container, beneath the Breadcrumb (if present, Shell Blueprint §11).
- **Priority:** Always present, exactly once.
- **Information Hierarchy:** Module identity (eyebrow) → Dashboard title → optional live clock/date.
- **Allowed Content:** Module eyebrow label, title, optional system-time display.
- **Forbidden Content:** KPIs, filters, or any data widget — Header is identity only.
- **Behavior:** Static; does not change with filter/data changes.
- **Desktop:** Full-width single row.
- **Mobile:** Title stacks above any secondary text; system-time may be dropped for space.
- **Accessibility:** Rendered as the screen's top-level heading (102 §3).
- **Future Scalability:** A future mode indicator (Executive/Engineering, §34–§35) may be added here without altering this region's core identity role.

## 2. Summary Strip

- **Purpose:** A single-line, fleet-condition statement answering "what's the state of things right now," before individual numbers are read (106).
- **Position:** Immediately beneath Header, above KPI Strip.
- **Priority:** Optional per module — included only where a one-line synthesis adds value beyond the KPI Strip.
- **Information Hierarchy:** Most severe condition first (Alert, then Caution, then Overdue), per 100 §7.
- **Allowed Content:** Condition counts in plain text/inline chips; a single most-urgent highlight.
- **Forbidden Content:** A greeting, salutation, or any decorative/conversational text (106, 099 §6).
- **Behavior:** Recomputes with the active Filter Area state.
- **Desktop:** One line, full width.
- **Mobile:** Wraps to two lines maximum; never silently truncated.
- **Accessibility:** Read as plain text, not solely via color-coded chips (101 §8).
- **Future Scalability:** A Future AI Summary Panel (§31) may replace or augment this strip's synthesis — see that section for the boundary rule.

## 3. KPI Strip

- **Purpose:** The dashboard's headline facts, each answering one question and each actionable (106, 120).
- **Position:** Beneath Summary Strip (or Header, if none), above Filter Area or Primary Workspace.
- **Priority:** Always present on a Module Dashboard (111); every tile clickable (120).
- **Information Hierarchy:** Left-to-right order follows 100 §7 — condition/urgency KPIs first, workflow-state KPIs (pending review/approval) next, volume/throughput KPIs last.
- **Allowed Content:** KPI Tiles only (104 §3, 120) — value, label, severity rail, optional trend.
- **Forbidden Content:** A tile with no drill-down destination (120); decorative icons with no data behind them.
- **Behavior:** Every tile filters the Primary Workspace and/or navigates to a scoped list, per 120.
- **Desktop:** Single row, all tiles visible without scrolling.
- **Mobile:** Horizontally scrollable strip, same tiles, same click behavior (109).
- **Accessibility:** Value and label read as one unit; severity never color-only (101 §8).
- **Future Scalability:** Future Predictive Widgets (§32) may add a forecast-flavored tile, always visually distinguished as a Prediction (129) from a measured KPI.

## 4. Filter Area

- **Purpose:** Owns all filter state affecting the dashboard's data-driven regions (118).
- **Position:** Beneath KPI Strip, above Primary Workspace.
- **Priority:** Present on any Module Dashboard whose Primary Workspace is a filterable table/list.
- **Information Hierarchy:** Search first, then quick filters (status/area/contractor), then date range, then Reset (118).
- **Allowed Content:** Search input, quick-filter controls, active-filter chips, Reset.
- **Forbidden Content:** A second, redundant filter control duplicated inside Primary Workspace (116, 118).
- **Behavior:** Any change recomputes KPI Strip, Summary Strip, Primary Workspace, and Analytics Area together.
- **Desktop:** Single row.
- **Mobile:** Collapses into a single "Filters" entry point with a badge count (109, 118).
- **Accessibility:** Active-filter count announced to screen readers.
- **Future Scalability:** An AI-suggested filter (118) appears as a distinct, dismissible suggestion chip, never a silent pre-filter.

## 5. Primary Workspace

- **Purpose:** The dashboard's single dominant, decision-driving region — the module's Alert Equipment table or equivalent (106, 112).
- **Position:** Left column of the main two-column Split (113), or full width if no Secondary Workspace exists.
- **Priority:** The most important region after the KPI Strip — renders above the fold on desktop.
- **Information Hierarchy:** Rows ranked by severity/urgency first (116); identity columns leading, actions trailing.
- **Allowed Content:** One Engineering Table (116) or equivalent list, scoped by the active Filter Area.
- **Forbidden Content:** More than one competing "primary" table on the same dashboard.
- **Behavior:** Row click navigates to the relevant Equipment/Record page (114); no in-place editing.
- **Desktop:** Dominant column width (approx. 2.2fr of a 2.2fr : 1fr split with Secondary Workspace).
- **Mobile:** Table becomes a stacked card list, same field order and severity indicator (104 §12, 109).
- **Accessibility:** Table semantics per 104 §13; severity never color-only.
- **Future Scalability:** Future Digital Twin Widgets (§33) may add a visual equipment-state indicator per row without changing the table's column contract.

## 6. Secondary Workspace

- **Purpose:** Supporting, subordinate context beside the Primary Workspace — action queues, review/approval summaries, forecasts (106, 112).
- **Position:** Right column of the main two-column Split (113).
- **Priority:** Always visually subordinate to Primary Workspace.
- **Information Hierarchy:** Today's-action content first, status/queue summaries second, forward-looking (forecast) content last.
- **Allowed Content:** A small number of compact panels (2–4), each answering one question (099 §9).
- **Forbidden Content:** A table as dense as Primary Workspace's — content here stays compact/summarized.
- **Behavior:** Each panel's items are independently clickable/navigable; no panel duplicates Primary Workspace's data wholesale.
- **Desktop:** Stacked panels in the narrower column.
- **Mobile:** Each panel becomes its own collapsible accordion (104 §12, 109), collapsed by default; Primary Workspace never collapses.
- **Accessibility:** Each panel independently reachable and labeled.
- **Future Scalability:** A Future AI Summary Panel (§31) may occupy one slot here, subject to the same subordination rule.

## 7. Analytics Area

- **Purpose:** Interactive, cross-entity chart exploration — only where a genuine decision question exists (107, 121).
- **Position:** Beneath the Primary/Secondary Workspace split, above Recent Activity.
- **Priority:** Secondary to Primary/Secondary Workspace; may collapse first on mobile.
- **Information Hierarchy:** Comparison chart → distribution chart → trend chart (107/121's ordering — comparison and distribution answer more urgent questions than a slow trend).
- **Allowed Content:** Up to 3 charts, each conforming to 121's allow/forbid rules; none without a stated question.
- **Forbidden Content:** A chart included merely because "dashboards have charts" (121); decorative multi-color palettes.
- **Behavior:** Recomputes with Filter Area state; each chart may link to a filtered Primary Workspace view.
- **Desktop:** 3-column row.
- **Mobile:** Collapses into an "Analytics" accordion (109), never open by default.
- **Accessibility:** Each chart has a text-equivalent summary or adjacent data (101 §8, 121 §9).
- **Future Scalability:** Future Predictive Widgets (§32) may add a fourth, clearly-labeled forecast/prediction chart under the same rules.

## 8. Recent Activity

- **Purpose:** A dense, chronological feed of what just happened, for situational awareness (104 §4 Activity Feed).
- **Position:** Beneath Analytics Area, above Footer.
- **Priority:** Lowest data-bearing region — informational, not decision-driving.
- **Information Hierarchy:** Most recent first, capped (e.g., 8 entries), no "load more" — a glance, not an archive (108's History is the archive).
- **Allowed Content:** Entry kind tag, title, subtitle, timestamp, optional deep-link.
- **Forbidden Content:** Editable content; more than a single capped list.
- **Behavior:** Entries with a link are clickable; entries without a natural destination are plain text.
- **Desktop:** Compact list, internal scroll if it exceeds its allotted height.
- **Mobile:** Collapsible accordion (109), collapsed by default.
- **Accessibility:** List semantics; each entry's kind/timestamp read as structured text.
- **Future Scalability:** None anticipated beyond richer entry kinds as new modules contribute events.

## 9. Footer

- **Purpose:** System-time/last-updated note, per the Platform Shell Footer (001 §13), scoped to this screen's own data freshness.
- **Position:** Bottom of the screen's content, beneath Recent Activity.
- **Priority:** Lowest.
- **Information Hierarchy:** System-time note (left) → last-updated timestamp for this dashboard's data (right).
- **Allowed Content:** Plain text only.
- **Forbidden Content:** Navigation, actions, or branding beyond what the Shell Footer already provides.
- **Behavior:** Timestamp updates on each data refresh (§28 Refresh Behavior).
- **Desktop / Mobile:** Identical treatment to Shell Footer (001 §13).
- **Accessibility:** Marked as supplementary text, not a landmark of its own (the Shell's Footer already is one).
- **Future Scalability:** None anticipated.

---

# B. Dashboard States

## 10. Empty Dashboard

- **Purpose:** Handle the case where filters/data legitimately produce nothing to show (104 §9, 125).
- **Position:** Applies per-region, not the whole dashboard — KPI Strip still shows zeros; Primary Workspace, Secondary panels, Analytics, and Recent Activity each show their own compact empty state.
- **Priority:** Never a single full-page empty illustration — each region's emptiness is independently, honestly stated (125).
- **Information Hierarchy:** Why empty → what to do next, per region.
- **Allowed Content:** One-line statement + one next action per empty region (125).
- **Forbidden Content:** A decorative full-dashboard illustration; silence (an empty region with nothing shown at all).
- **Behavior:** A region becomes non-empty automatically the moment matching data/filters change.
- **Desktop / Mobile:** Same compact treatment; no illustration on either.
- **Accessibility:** Empty-state text is real, readable text, not an image with alt-text only.
- **Future Scalability:** None anticipated.

## 11. Loading Dashboard

- **Purpose:** Handle initial and refresh loading without blocking already-ready regions (127).
- **Position:** Applies per-region.
- **Priority:** KPI Strip and Primary Workspace resolve first (progressive loading, 099 §7, 127); Analytics and Recent Activity may resolve after.
- **Information Hierarchy:** Skeleton shapes match each region's real content shape (127).
- **Allowed Content:** Skeleton placeholders, per region.
- **Forbidden Content:** One full-dashboard spinner blocking already-available KPI/table data.
- **Behavior:** Each region transitions independently from Skeleton to real content or to its own Empty state.
- **Desktop:** Rarely visible beyond first load (110).
- **Mobile:** More frequent given field connectivity (109); never indistinguishable from a frozen screen.
- **Accessibility:** Loading state announced per region as it resolves.
- **Future Scalability:** A Future AI Summary Panel (§31) uses this same per-region loading vocabulary, never a bespoke "thinking" treatment.

## 12. Mobile Dashboard

- **Purpose:** Preserve the exact same information hierarchy as desktop, adapted structurally, never diluted (109).
- **Position:** Single-column stack, fixed order: Header → Summary Strip → KPI Strip (scrollable) → Primary Workspace (always expanded) → Secondary Workspace (accordions, collapsed) → Analytics (accordion, collapsed) → Recent Activity (accordion, collapsed) → Footer.
- **Priority:** Primary Workspace is the only data region guaranteed open by default besides KPIs — everything else defaults collapsed (104 §12).
- **Information Hierarchy:** Identical to desktop; only presentation collapses, never the order.
- **Allowed Content:** The same widgets as desktop, restructured.
- **Forbidden Content:** A "simplified" mobile dashboard that drops a region entirely — every region exists on mobile, just collapsed/restructured (109).
- **Behavior:** Accordions expand independently; expanding one does not collapse another.
- **Desktop:** N/A — this section is the mobile specification.
- **Mobile:** As described above.
- **Accessibility:** Accordion expand/collapse state exposed to screen readers.
- **Future Scalability:** Future Executive/Engineering/Contractor modes (§34–§36) apply identically on mobile — no mode is desktop-only.

## 13. Desktop Dashboard

- **Purpose:** The dashboard's primary, full-density presentation (110).
- **Position:** Two-column main Split (Primary + Secondary Workspace) beneath the KPI Strip; full-width Analytics row beneath that; full-width Recent Activity beneath that.
- **Priority:** Every region visible without interaction; no region defaults collapsed.
- **Information Hierarchy:** Identical to the fixed order in §1–§9 above.
- **Allowed Content:** All regions expanded simultaneously.
- **Forbidden Content:** Forcing a desktop user to click to reveal a region that fits on screen (099 §7 — progressive disclosure is for depth, not for hiding the standard view).
- **Behavior:** Regions render side by side/stacked per §5/§6's Split proportions.
- **Desktop:** As described.
- **Mobile:** N/A — this section is the desktop specification.
- **Accessibility:** Full region set exposed in reading order matching visual order.
- **Future Scalability:** A future Command Palette (Shell Blueprint §27) may act on any dashboard region without altering this layout.

---

# C. Widget System

## 14. Widget Spacing

- **Purpose:** One consistent gap between every widget/panel on a dashboard (113, Shell Blueprint §14).
- **Position:** N/A. **Priority:** Foundational. **Information Hierarchy:** N/A.
- **Allowed Content:** 16px desktop gap, 12px mobile gap, applied uniformly between KPI tiles, Secondary Workspace panels, and Analytics charts.
- **Forbidden Content:** A dashboard-specific spacing value diverging from the Shell's scale.
- **Behavior:** Fixed regardless of widget count.
- **Desktop / Mobile:** As stated.
- **Accessibility:** Spacing preserved around touch targets on mobile (103 §8).
- **Future Scalability:** None anticipated.

## 15. Widget Priority

- **Purpose:** Fix the order in which widgets compete for a user's attention (100 §7, 106).
- **Position:** N/A. **Priority:** This section defines priority itself. 
- **Information Hierarchy:** KPI Strip > Primary Workspace > Secondary Workspace > Analytics > Recent Activity — fixed, platform-wide, never reordered per module.
- **Allowed Content:** A module may omit a region it has no content for; it may never reorder the regions it does include.
- **Forbidden Content:** A module promoting Analytics or Recent Activity above Primary Workspace.
- **Behavior:** N/A.
- **Desktop / Mobile:** This ordering holds in both; mobile only changes what's collapsed, never the order.
- **Accessibility:** Reading order for assistive tech matches this priority order.
- **Future Scalability:** Executive Mode (§34) may re-weight visual size within this order but never the order itself.

## 16. Maximum Widgets

- **Purpose:** Prevent a dashboard from accumulating more than a user can act on at a glance (099 §9).
- **Position:** N/A. **Priority:** A ceiling, not a target. **Information Hierarchy:** N/A.
- **Allowed Content:** Up to 9 KPI tiles, up to 4 Secondary Workspace panels, up to 3 Analytics charts, 1 Primary Workspace table, 1 Recent Activity feed.
- **Forbidden Content:** Adding a widget beyond these ceilings "because there's room" — if a module needs more, split scope into a second screen (Analytics, 111), not the Dashboard.
- **Behavior:** N/A.
- **Desktop / Mobile:** Same ceiling; mobile's accordion collapsing does not raise it.
- **Accessibility:** N/A.
- **Future Scalability:** A Future AI Summary Panel/Predictive Widget consumes an existing slot — it does not raise the ceiling.

## 17. Minimum Widgets

- **Purpose:** Ensure a dashboard is never so sparse it fails to be a decision surface (106).
- **Position:** N/A. **Priority:** A floor. **Information Hierarchy:** N/A.
- **Allowed Content:** At minimum, a Header, a KPI Strip, and a Primary Workspace — anything less is not a valid Module Dashboard (111).
- **Forbidden Content:** A "dashboard" of only charts with no KPI Strip or Primary Workspace (106).
- **Behavior:** N/A.
- **Desktop / Mobile:** Same floor on both.
- **Accessibility:** N/A.
- **Future Scalability:** None anticipated.

## 18. Widget Grouping

- **Purpose:** Ensure related widgets are visually and structurally grouped, never scattered (104 §1).
- **Position:** N/A. **Priority:** Structural.
- **Information Hierarchy:** Grouping follows function — all "today's work" content groups in Secondary Workspace; all "explore a pattern" content groups in Analytics; nothing straddles both.
- **Allowed Content:** A panel may contain multiple related stat-chips (e.g., Review/Approval counts) as one group.
- **Forbidden Content:** Splitting one logical concept across two different regions.
- **Behavior:** N/A.
- **Desktop / Mobile:** Same grouping logic; only presentation (accordion vs. open panel) differs.
- **Accessibility:** Grouped content shares a labeled container.
- **Future Scalability:** None anticipated.

## 19. Widget Interactions

- **Purpose:** Define the baseline interaction every widget supports.
- **Position:** N/A. **Priority:** High — an interaction-less widget is a defect (099 §9). **Information Hierarchy:** N/A.
- **Allowed Content:** Click/tap navigates or filters; hover (desktop only) previews additional context where relevant (104 §11).
- **Forbidden Content:** A widget whose only interaction is decorative hover with no click destination.
- **Behavior:** Every widget's primary interaction is consistent with its component type (120 for KPIs, 121 for charts, 116 for tables).
- **Desktop:** Hover affordances available.
- **Mobile:** Tap-only; a visible pressed state substitutes for hover.
- **Accessibility:** Every interactive widget keyboard-operable (104 §13).
- **Future Scalability:** None anticipated beyond what §31–§36 introduce for their specific widget types.

## 20. KPI Interactions

- **Purpose:** Every KPI tile must drill down (120).
- **Position:** N/A — applies to every tile in the KPI Strip. **Priority:** Mandatory, no exceptions. **Information Hierarchy:** N/A.
- **Allowed Content:** Click filters Primary Workspace in place (preferred) or navigates to a scoped list/screen when no in-page filter applies.
- **Forbidden Content:** A KPI tile with no click handler at all.
- **Behavior:** Clicking a condition/urgency KPI filters Primary Workspace and scrolls it into view if below the fold.
- **Desktop:** As above.
- **Mobile:** Same behavior; scroll accounts for the collapsed Secondary Workspace above it.
- **Accessibility:** Tile exposes its action to screen readers (as a button, not a static figure).
- **Future Scalability:** A Predictive KPI (§32) still drills down, into a Forecast/Analytics view rather than a live-data filter.

## 21. Charts

- **Purpose:** Restate 121's allow/forbid rule as it applies inside a Dashboard's Analytics Area.
- **Position:** Inside Analytics Area only (§7) — never inside Primary/Secondary Workspace.
- **Priority:** Subordinate to KPI Strip and Primary Workspace (§15).
- **Information Hierarchy:** Per 107/121 — semantic colors first, brand color fallback second, never decorative.
- **Allowed Content:** Donut (distribution), Bar/Stacked Bar (comparison), Line (trend) — per 107's table.
- **Forbidden Content:** Any chart type not in 107's approved set; more than 3 per dashboard (§16).
- **Behavior:** Each chart may link to a filtered Primary Workspace view.
- **Desktop:** 3-column row.
- **Mobile:** Collapsed into the Analytics accordion.
- **Accessibility:** Text-equivalent summary or adjacent data table (121 §9).
- **Future Scalability:** A 4th, clearly-labeled Prediction chart (§32) is the only sanctioned exception to the 3-chart ceiling, and only when it replaces, not adds to, a slot.

## 22. Tables

- **Purpose:** Restate 116's rules as they apply to the Dashboard's Primary Workspace.
- **Position:** Primary Workspace only (§5) — Secondary Workspace never contains a full Engineering Table.
- **Priority:** The dashboard's dominant region (§15).
- **Information Hierarchy:** Severity-first row order; identity columns leading, actions trailing (116).
- **Allowed Content:** One Engineering Table (116), scoped by Filter Area.
- **Forbidden Content:** A second full table anywhere else on the same dashboard.
- **Behavior:** Row click navigates to Equipment/Record (114); no inline editing.
- **Desktop:** Full column set, sticky header, frozen identity column (116).
- **Mobile:** Table-to-card transform (104 §12, 109).
- **Accessibility:** Full table semantics (104 §13).
- **Future Scalability:** Digital Twin Widgets (§33) may add a per-row visual indicator without changing the column contract.

---

# D. Behavior

## 23. Sidebar Behavior (Dashboard Secondary Workspace)

- **Purpose:** Clarify that "Sidebar" in dashboard context means the Secondary Workspace column (§6), distinct from the Platform Shell's Left Navigation (Shell Blueprint §3).
- **Position:** Right column of the main Split. **Priority:** Subordinate, per §15.
- **Information Hierarchy:** Today's-action content first, per §6.
- **Allowed Content:** Compact panels only (§6).
- **Forbidden Content:** Confusing this region with the Shell's navigation Sidebar — unrelated components sharing a colloquial name.
- **Behavior:** Independently scrollable if content exceeds the viewport (Shell Blueprint §18).
- **Desktop:** Persistent, all panels open.
- **Mobile:** Collapses to accordions (§6, 109).
- **Accessibility:** Each panel independently labeled.
- **Future Scalability:** None anticipated beyond §6's own future note.

## 24. Scrolling

- **Purpose:** Define the dashboard's own internal scroll behavior within the Shell's Content Container (Shell Blueprint §18).
- **Position:** N/A. **Priority:** High.
- **Information Hierarchy:** The dashboard scrolls as one continuous column beneath the Page Header; KPI Strip is not separately sticky by default.
- **Allowed Content:** Internal scroll within Recent Activity or a long Secondary Workspace panel if it exceeds a set max-height.
- **Forbidden Content:** Nested scroll regions inside Primary Workspace beyond the table's own sticky-header behavior (116).
- **Behavior:** Standard vertical scroll; no horizontal scroll of the dashboard as a whole.
- **Desktop:** As above.
- **Mobile:** Same; accordions add/remove scrollable height as they expand/collapse.
- **Accessibility:** Scroll never required to reach KPI Strip or Primary Workspace on first view.
- **Future Scalability:** None anticipated.

## 25. Refresh Behavior

- **Purpose:** Define how the dashboard's data becomes current.
- **Position:** N/A. **Priority:** High — a stale "all clear" dashboard is a Truth-Before-Beauty violation (099 §10).
- **Information Hierarchy:** N/A.
- **Allowed Content:** An explicit manual refresh control (near the Footer, §9) and/or a defined automatic refresh interval.
- **Forbidden Content:** A dashboard that never updates without a full page reload, or that silently goes stale with no "last updated" indication.
- **Behavior:** Refresh recomputes every region from the current Filter Area state; it does not reset user-applied filters.
- **Desktop:** May refresh automatically on an interval, or on window refocus.
- **Mobile:** Manual refresh preferred, given field connectivity cost of frequent polling (109).
- **Accessibility:** A refresh-in-progress state is announced, distinct from initial Loading (§11).
- **Future Scalability:** Live Data Behavior (§26) formalizes push-based refresh once available.

## 26. Live Data Behavior

- **Purpose:** Define the future-ready behavior when data can push-update without manual/interval refresh.
- **Position:** N/A. **Priority:** Future-facing; not required for the current baseline (§25).
- **Information Hierarchy:** A live-updated region shows a subtle "updated" indicator rather than silently changing values under the user's eyes.
- **Allowed Content:** A small, dismissible "New data available — refresh" affordance in place of silent auto-replacement.
- **Forbidden Content:** Numbers changing silently under a user's cursor/focus, especially inside Primary Workspace while reviewing a row.
- **Behavior:** KPI Strip may update live more readily than Primary Workspace, since a disappearing row is more disruptive than a ticking number.
- **Desktop:** Live updates more feasible given stable connectivity (110).
- **Mobile:** Deferred to manual refresh by default (109).
- **Accessibility:** Live updates announced politely (non-interrupting), never silently.
- **Future Scalability:** This section is itself the forward-looking specification.

---

# E. Accessibility & Language

## 27. Accessibility

- **Purpose:** Consolidate the dashboard-level accessibility commitments stated per region above.
- **Position:** N/A. **Priority:** Non-negotiable across every region.
- **Information Hierarchy:** Heading structure follows 102 §3; landmark regions follow Shell Blueprint §1.
- **Allowed Content:** N/A.
- **Forbidden Content:** Any region relying on color alone for meaning (101 §8); any interactive widget unreachable by keyboard (104 §13).
- **Behavior:** Focus order follows the fixed Widget Priority order (§15).
- **Desktop:** Full keyboard operability, visible focus indicators.
- **Mobile:** Full touch-target sizing (103 §8).
- **Accessibility:** Self-referential — see all attributes above.
- **Future Scalability:** Any future mode (§31–§36) inherits every accessibility commitment on this list without exception.

## 28. Multi-Language Behavior

- **Purpose:** Ensure the dashboard reads correctly in every supported platform language.
- **Position:** N/A. **Priority:** High — the platform serves English- and Arabic-reading users natively (Shell Blueprint §9).
- **Information Hierarchy:** Widget Priority order (§15) is identical regardless of language; only text direction and alignment mirror.
- **Allowed Content:** Full translation of every label, KPI name, and widget title.
- **Forbidden Content:** Partial translation (some widgets translated, others not) on the same screen.
- **Behavior:** Switching language re-renders the dashboard in place, preserving all active filters.
- **Desktop / Mobile:** Identical behavior on both.
- **Accessibility:** Document language attribute updates so screen readers switch pronunciation rules correctly.
- **Future Scalability:** Additional future languages follow this same rule with no dashboard-specific change required.

## 29. Arabic Layout

- **Purpose:** Specify the dashboard's mirrored (RTL) presentation.
- **Position:** N/A. **Priority:** Equal in quality and completeness to the English (LTR) layout — never a lesser experience.
- **Information Hierarchy:** Same Widget Priority order (§15), mirrored spatially: Primary Workspace moves right, Secondary Workspace left; KPI Strip reads right-to-left.
- **Allowed Content:** Full mirroring of layout direction; numerals and `Equipment_ID`/`LP_ID` values remain LTR within an RTL sentence (standard bidi handling, consistent with 102 §4's Monospace rule).
- **Forbidden Content:** A "translated but not mirrored" hybrid layout; charts left un-mirrored while surrounding text is RTL.
- **Behavior:** Mirroring is a full layout transform, not a text-only translation.
- **Desktop / Mobile:** Both fully mirrored.
- **Accessibility:** Reading order for assistive tech follows the mirrored visual order.
- **Future Scalability:** None anticipated — RTL is a first-class, permanent layout mode, not a future consideration.

## 30. English Layout

- **Purpose:** The platform's default, left-to-right presentation — the reference layout every other section of this blueprint describes.
- **Position:** N/A. **Priority:** Default.
- **Information Hierarchy:** As specified throughout §1–§9 and §15.
- **Allowed / Forbidden Content:** N/A. **Behavior:** N/A.
- **Desktop / Mobile:** As specified throughout this document.
- **Accessibility:** As specified throughout this document.
- **Future Scalability:** None anticipated.

---

# F. Future Extensions

## 31. Future AI Summary Panel

- **Purpose:** Reserve a Secondary-Workspace or Summary-Strip slot for an AI-generated fleet-condition synthesis (100 §11, 104 §3).
- **Position:** One Secondary Workspace panel slot (§6), or an augmentation of the Summary Strip (§2) — never both at once.
- **Priority:** Future; when active, ranked no higher than the Secondary Workspace panel it replaces.
- **Information Hierarchy:** Presented as an AI Insight Card (104 §3) — clearly labeled AI-generated, with its basis stated.
- **Allowed Content:** A short narrative summary plus links back to the specific data it references (108, 128).
- **Forbidden Content:** Replacing the KPI Strip or Primary Workspace; presenting its content with the same visual confidence as verified data without the AI label.
- **Behavior:** User-dismissible; dismissal does not affect underlying data.
- **Desktop:** Panel form.
- **Mobile:** Same panel, inside its accordion.
- **Accessibility:** Same as any Information/Decision Card (104 §3, §13).
- **Future Scalability:** This section is itself the reservation.

## 32. Future Predictive Widgets

- **Purpose:** Reserve room for Forecast/Prediction-driven widgets beyond the current rule-based Sampling Forecast pattern.
- **Position:** A Secondary Workspace panel slot (§6) or a 4th Analytics chart slot (§7/§21), never inside Primary Workspace.
- **Priority:** Future; always subordinate to live, measured KPIs.
- **Information Hierarchy:** A Prediction (AI/ML-derived, 129) is always visually distinguished from a Forecast (rule-based, 129) — never interchangeable.
- **Allowed Content:** A clearly labeled projected value/trend with its confidence or basis stated.
- **Forbidden Content:** A predictive figure presented with the same weight/certainty as a measured KPI (099 §10).
- **Behavior:** Click-through leads to the Analytics or Report screen substantiating the projection, never a dead end.
- **Desktop / Mobile:** Same labeling rules apply identically.
- **Accessibility:** The word "Prediction" or "Forecast" is present in accessible text, not implied by icon alone.
- **Future Scalability:** This section is itself the reservation.

## 33. Future Digital Twin Widgets

- **Purpose:** Reserve room for a visual, equipment-state representation tied to `Equipment_ID` (114's Digital Twin compatibility note).
- **Position:** A per-row indicator within Primary Workspace, or a dedicated Secondary Workspace panel — never a replacement for the table's existing data columns.
- **Priority:** Future; purely supplementary to the verified Condition Status/Criticality data already shown.
- **Information Hierarchy:** Visual representation always secondary to, and consistent with, the row's actual semantic status (101 §4) — never contradicting the row's stated Condition Status.
- **Allowed Content:** A compact visual/icon state per equipment, consistent with 103's Engineering Icons vocabulary.
- **Forbidden Content:** A visualization requiring the user to leave the Dashboard to interpret it, or that introduces a new, undocumented status vocabulary.
- **Behavior:** Click navigates to the Equipment page (114), same as any other row interaction.
- **Desktop / Mobile:** Same representation, scaled appropriately.
- **Accessibility:** Text-equivalent status always present alongside the visual.
- **Future Scalability:** This section is itself the reservation.

## 34. Future Executive Mode

- **Purpose:** Reserve a presentation mode favoring Statistics Panel/KPI Tile density over raw tables, per 106's Executive dashboard definition.
- **Position:** A toggle affecting the same regions defined above — not a separate screen.
- **Priority:** Future; Widget Priority (§15) is unchanged, only relative visual weight shifts.
- **Information Hierarchy:** Identical region order; Executive Mode increases KPI/Summary prominence and reduces the default row-count shown in Primary Workspace.
- **Allowed Content:** A mode toggle (location TBD — likely Profile Menu or Header); condensed Primary Workspace (e.g., top 5 rows + "View All").
- **Forbidden Content:** A genuinely different screen/URL for Executive Mode — it is a display variant of the same Dashboard (106).
- **Behavior:** Toggling mode does not change underlying data or filters.
- **Desktop / Mobile:** Available on both.
- **Accessibility:** Mode state announced; toggling preserves keyboard focus context.
- **Future Scalability:** This section is itself the reservation.

## 35. Future Engineering Mode

- **Purpose:** Reserve the inverse of Executive Mode — maximum density, full Primary Workspace, all Analytics visible by default, per 106's Engineering dashboard definition.
- **Position:** Same toggle mechanism as Future Executive Mode.
- **Priority:** Future; close to the current default Desktop Dashboard behavior (§13), potentially formalized as that same default once Executive Mode exists as its counterpart.
- **Information Hierarchy:** Identical region order; maximum rows/columns shown, Analytics expanded by default even on mobile (an explicit, reserved exception to §12's default-collapsed rule).
- **Allowed Content:** Full Primary Workspace row count, all Secondary/Analytics panels expanded.
- **Forbidden Content:** Introducing new widgets not already defined elsewhere in this blueprint.
- **Behavior:** Toggling mode does not change underlying data or filters.
- **Desktop / Mobile:** Available on both, though most valuable on Desktop (110).
- **Accessibility:** Same commitments as baseline Dashboard.
- **Future Scalability:** This section is itself the reservation.

## 36. Future Contractor Mode

- **Purpose:** Formalize the Contractor-scoped presentation already defined behaviorally in 115, as an explicit mode of this same blueprint rather than a separate dashboard design.
- **Position:** Applies automatically based on the logged-in user's role (115) — not a user-toggle like Executive/Engineering Mode.
- **Priority:** Partially active today (contractor data-scoping per 115); this section reserves the remaining refinement (e.g., omitting the Contractor Comparison chart entirely rather than showing it empty).
- **Information Hierarchy:** Identical region order and Widget Priority; the Contractor Comparison chart (§21) and any Owner-only KPI are omitted entirely for this mode, never shown empty or disabled (115).
- **Allowed Content:** The same regions, scoped to the Contractor's own data only.
- **Forbidden Content:** Showing an Owner-only widget in a disabled/greyed state to a Contractor — it must be absent, not visibly restricted.
- **Behavior:** Automatic based on role; no manual toggle.
- **Desktop / Mobile:** Identical scoping on both.
- **Accessibility:** No widget that "would have been there" leaves an empty gap that confuses a screen-reader user's sense of page structure.
- **Future Scalability:** This section is itself the reservation; further contractor-specific widgets (e.g., an SLA tracker) would extend this same mode definition.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §6, §7, §9, §10
- 100_ACC_BRAND_IDENTITY.md — §7, §11
- 101_ACC_COLOR_SYSTEM.md — §4, §8
- 102_ACC_TYPOGRAPHY_STANDARD.md — §3, §4
- 103_ACC_ICONOGRAPHY_STANDARD.md — §5, §8
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §1, §3, §4, §11, §12, §13
- 106_ACC_DASHBOARD_PHILOSOPHY.md — the philosophy this blueprint operationalizes
- 107_ACC_DATA_VISUALIZATION_STANDARD.md / 121_ACC_CHART_STANDARD.md
- 108_ACC_INFORMATION_ARCHITECTURE.md
- 109_ACC_MOBILE_DESIGN_STANDARD.md / 110_ACC_DESKTOP_WORKSTATION_STANDARD.md
- 111_ACC_UI_SCREEN_CATALOG.md — Module Dashboard category
- 112_ACC_SCREEN_TEMPLATE_STANDARD.md / 113_ACC_PAGE_LAYOUT_STANDARD.md
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md
- 115_ACC_OWNER_CONTRACTOR_UX_STANDARD.md
- 116_ACC_TABLE_STANDARD.md / 118_ACC_FILTER_STANDARD.md / 120_ACC_KPI_STANDARD.md
- 125_ACC_EMPTY_STATE_STANDARD.md / 127_ACC_LOADING_STATE_STANDARD.md
- 128_ACC_REPORT_STANDARD.md
- 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md
- 001_PLATFORM_SHELL_BLUEPRINT.md — the shell this dashboard renders inside

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-06 | Initial draft — Master Dashboard blueprint, 36 specified regions/behaviors/states/modes, module-agnostic. Pending approval. |
