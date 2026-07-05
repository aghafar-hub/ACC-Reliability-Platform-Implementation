# ACC Reliability Platform
# 001_PLATFORM_SHELL_BLUEPRINT.md

## Document Control

| Item | Value |
|---|---|
| Blueprint ID | UIBP-001 |
| Title | Platform Shell Blueprint |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Governs Under | 099–129 (Approved Design System) — this blueprint introduces no new philosophy or rule; it is a reproducible specification derived from that system |
| Applies To | Every module's outer shell — this blueprint is inherited, never re-implemented, per module |
| Scope Note | This is a product/design specification — the "how it is built," not the "why" (already covered in 099–129) or the "how it is coded" (out of scope). Measurements given here are design-level specifications, not CSS. |

---

## Purpose

To specify the ACC Reliability Platform's shell precisely enough that a designer can reproduce it exactly, screen after screen, module after module, without needing a visual mockup. Every module inherits this shell unchanged (100 §3, 100 §9).

## How to Read This Blueprint

Every element below is specified with the same eleven attributes: **Purpose, Position, Priority, Information Hierarchy, Allowed Content, Forbidden Content, Behavior, Desktop, Mobile, Accessibility, Future Scalability.** Where an attribute genuinely does not apply to a cross-cutting behavior rather than a placed element, it is marked N/A rather than forced.

---

# A. Shell Regions

## 1. Platform Frame

- **Purpose:** The outermost container holding every other shell region; the constant identity frame every screen shares (100 §3).
- **Position:** Fills the entire viewport. Children stack: Top Navigation → (Left Navigation beside Content Container) → Footer.
- **Priority:** Structural only; carries no data of its own.
- **Information Hierarchy:** N/A.
- **Allowed Content:** Top Navigation, Left Navigation, Content Container, Footer — nothing else docks directly to the Frame.
- **Forbidden Content:** A module rendering its own competing top bar or side rail inside the Frame (105, 112 §2).
- **Behavior:** Persists unchanged across every route change; only the Content Container's contents swap.
- **Desktop:** Left Navigation and Content Container sit side by side.
- **Mobile:** Left Navigation collapses to an overlay/drawer; Content Container takes full width.
- **Accessibility:** Provides landmark regions (banner / navigation / main / contentinfo) so assistive tech can jump directly to each region.
- **Future Scalability:** New shell-level regions (e.g., a future right-hand AI panel) dock as a named Frame child, never nested inside Content Container.

## 2. Top Navigation Bar

- **Purpose:** Carries platform-global utilities only (104 §2) — never module navigation.
- **Position:** Fixed at the top of the Frame, full width.
- **Priority:** Always visible; never scrolls away.
- **Information Hierarchy:** ACC identity mark (left) → Global Search (center-left) → Notification Center, Language Selector, Theme Selector, Profile Menu (right, in that order).
- **Allowed Content:** ACC logo/mark, Global Search entry point, Notification bell, Language Selector, Theme Selector, Profile Menu.
- **Forbidden Content:** Module names, breadcrumbs, KPIs, or any module-specific control.
- **Behavior:** Sticky; height constant across every screen and breakpoint.
- **Desktop:** Height 56px; all utilities visible inline.
- **Mobile:** Height 48px; Global Search, Language, and Theme collapse into an overflow menu; Notification bell and Profile Menu stay visible.
- **Accessibility:** Every icon-only control carries a text-equivalent label (103 §9); tab order follows left-to-right visual order.
- **Future Scalability:** Future Command Palette (§27) and AI Assistant (§25) entry points dock here, immediately left of the Profile Menu.

## 3. Left Navigation (Sidebar)

- **Purpose:** The platform's persistent module and in-module navigation (104 §2, 105).
- **Position:** Fixed to the left edge of the Frame, beneath the Top Navigation, full remaining height.
- **Priority:** Always present; expanded/collapsed state persists per user across sessions.
- **Information Hierarchy:** Module Switcher (top) → current module's screen list (105) → pinned/quick-access items (bottom, optional).
- **Allowed Content:** Module Switcher, current module's screen links, active-item indicator.
- **Forbidden Content:** Search, notifications, KPIs, or any Top Navigation utility.
- **Behavior:** Expanded width 260px; collapsed width 72px (icons only, label on hover/tooltip). Toggle control at the bottom of the Sidebar.
- **Desktop:** User-togglable expanded/collapsed; default expanded.
- **Mobile:** Hidden by default; opens as a full-height overlay drawer over the Content Container, dismissed by an explicit close control or by selecting a destination.
- **Accessibility:** Current screen's nav item marked programmatically, never by color alone (101 §8); collapsed icons retain accessible labels.
- **Future Scalability:** New modules append to the Module Switcher in registration order (105); existing modules are never reordered to accommodate a new one.

## 4. Module Switcher

- **Purpose:** Move between platform modules (105).
- **Position:** Top of the Left Navigation, above the current module's screen list.
- **Priority:** Always visible whenever the Sidebar is visible.
- **Information Hierarchy:** Current module shown first/highlighted; other modules listed beneath in fixed, registration-based order.
- **Allowed Content:** Module icon (103 §4) + module name; current-module highlight.
- **Forbidden Content:** Screen-level links from other modules.
- **Behavior:** Selecting a module navigates to that module's default screen (its Dashboard, 111).
- **Desktop:** Icon + label when Sidebar expanded; icon-only when collapsed.
- **Mobile:** Same list, inside the Sidebar drawer.
- **Accessibility:** Current module announced as the current page to assistive tech.
- **Future Scalability:** A future tenth module appears in this same list with no structural change.

## 5. Equipment Quick Search

- **Purpose:** The fastest path from anywhere in the platform to a specific `Equipment_ID` (114, 119).
- **Position:** A distinct mode of Global Search — activated by an adjacent icon or automatically when a typed query matches an equipment-identifier pattern.
- **Priority:** High — equipment resolution is the platform's single most common navigation action (099 §3).
- **Information Hierarchy:** Equipment results rank first in any combined result set (108, 119).
- **Allowed Content:** `Equipment_ID`, Equipment Name, Area, a Condition Status indicator per result row.
- **Forbidden Content:** Non-equipment results mixed in without clear grouping.
- **Behavior:** Fuzzy-tolerant (119); selecting a result navigates directly to that Equipment page (114).
- **Desktop:** Inline dropdown results beneath the field as the user types.
- **Mobile:** Full-screen search takeover (109, 119).
- **Accessibility:** Result count and top result type announced to screen readers.
- **Future Scalability:** AI-assisted natural-language equipment lookup resolves through this same entry point.

## 6. Global Search

- **Purpose:** The platform's one universal search experience (105, 119).
- **Position:** Top Navigation, left-of-center.
- **Priority:** Always accessible from any screen.
- **Information Hierarchy:** Equipment → Record → Action (108).
- **Allowed Content:** A single search input; a grouped, ranked result list.
- **Forbidden Content:** A second, differently-behaved search box anywhere else in the shell.
- **Behavior:** Search-as-you-type on desktop; explicit submit acceptable on mobile for performance.
- **Desktop:** Inline expanding field with live dropdown results.
- **Mobile:** Icon-triggered; opens full-screen.
- **Accessibility:** Keyboard-reachable via a consistent shortcut (130, once defined).
- **Future Scalability:** Natural-language/AI search augments, never replaces, this entry point.

## 7. Notification Center

- **Purpose:** The persistent, reviewable list of platform notifications (104 §7, 123).
- **Position:** Top Navigation, right side; opens as a dropdown panel (desktop) or full-screen view (mobile).
- **Priority:** Unread count always visible on the bell icon.
- **Information Hierarchy:** Unread first, then by priority (Alert > Caution > Information, 101 §4), then recency.
- **Allowed Content:** Priority indicator, subject, timestamp, deep-link.
- **Forbidden Content:** Editable content — notifications are read-only entries that link elsewhere.
- **Behavior:** Opening the panel does not bulk-mark as read; each entry marks read individually (123's grouping rule still applies).
- **Desktop:** Dropdown panel, max height with internal scroll, anchored below the bell icon.
- **Mobile:** Full-screen list.
- **Accessibility:** Unread state exposed to screen readers, not by a color dot alone.
- **Future Scalability:** See §26 Future Notification Center Expansion.

## 8. Profile Menu

- **Purpose:** User identity, session, and account-level actions.
- **Position:** Top Navigation, far right.
- **Priority:** Always present.
- **Information Hierarchy:** User name/role first, then account actions.
- **Allowed Content:** User name, role/contractor scope (115), Settings link, Sign Out.
- **Forbidden Content:** Platform-wide settings unrelated to the individual user (those live in Administration, 111).
- **Behavior:** Opens as a dropdown on click; closes on outside click or selection.
- **Desktop:** Dropdown anchored below the avatar/name.
- **Mobile:** Full-width dropdown or drawer section.
- **Accessibility:** Keyboard-operable dropdown, focus trapped while open (104 §13).
- **Future Scalability:** A future "switch contractor view" entry for multi-scope users appends here.

## 9. Language Selector

- **Purpose:** Switch platform language (currently English/Arabic).
- **Position:** Top Navigation, grouped with Theme Selector.
- **Priority:** Always present; low-frequency interaction.
- **Information Hierarchy:** Current language shown as the control's label; alternate offered on open.
- **Allowed Content:** Language name in its own language ("English," "العربية").
- **Forbidden Content:** More languages than the platform currently supports.
- **Behavior:** Selecting a language immediately re-renders the interface, including RTL mirroring for Arabic (see §30 Arabic Layout).
- **Desktop:** Compact dropdown/toggle.
- **Mobile:** Collapses into the Top Navigation overflow menu.
- **Accessibility:** Control exposes its current state ("Language: English") to screen readers.
- **Future Scalability:** Additional languages append to the same control.

## 10. Theme Selector

- **Purpose:** Switch between light and dark theme (101 §9/§10).
- **Position:** Top Navigation, adjacent to Language Selector.
- **Priority:** Always present; low-frequency interaction.
- **Information Hierarchy:** Current theme shown as the control's icon state.
- **Allowed Content:** Light/Dark toggle (System-default optional).
- **Forbidden Content:** Per-module theme overrides (100 §9).
- **Behavior:** Instant switch, no reload; the platform's identity frame (Top Navigation, Sidebar) keeps its dark identity treatment in both themes, while canvas/panels invert.
- **Desktop:** Icon toggle.
- **Mobile:** Same control; collapses into overflow if space-constrained.
- **Accessibility:** State exposed as "Theme: Dark," etc.
- **Future Scalability:** None anticipated beyond light/dark/system.

## 11. Breadcrumb

- **Purpose:** Shows the hierarchical path back through the information architecture (105, 108).
- **Position:** Top of the Content Container, beneath the Top Navigation, above the Page Header.
- **Priority:** Present only when genuinely more than one level deep (105).
- **Information Hierarchy:** Module → Screen → Entity, matching 108's flow.
- **Allowed Content:** Text links for each ancestor level; current screen shown as plain, non-linked text.
- **Forbidden Content:** More than 4 levels shown at once — deeper paths collapse the middle behind an ellipsis.
- **Behavior:** Each ancestor level is clickable and navigates directly there.
- **Desktop:** Full path shown inline.
- **Mobile:** Collapses to "← Back to [immediate parent]" only.
- **Accessibility:** Marked as a navigation landmark; current page marked as such.
- **Future Scalability:** Future AI-generated views still resolve a real breadcrumb path, never a synthetic one.

## 12. Content Container

- **Purpose:** The scrollable work surface where every screen's actual content renders (104 §2).
- **Position:** Fills remaining space beside the Sidebar, beneath the Top Navigation, above the Footer.
- **Priority:** The primary region of every screen.
- **Information Hierarchy:** Page Header → Filters/KPIs (if present) → primary/secondary workspace → analytics/recent activity, per 112's fixed region order.
- **Allowed Content:** Exactly one screen's regions per 112_ACC_SCREEN_TEMPLATE_STANDARD.md.
- **Forbidden Content:** Shell-level controls (search, notifications, module switching) duplicated here.
- **Behavior:** Scrolls independently of the Sidebar and Top Navigation, both of which stay fixed.
- **Desktop:** Full density per 110.
- **Mobile:** Full width, single column, per 109.
- **Accessibility:** Marked as the `main` landmark; heading structure follows 102 §3.
- **Future Scalability:** A future right-hand AI panel (§25) docks beside, not inside, this container.

## 13. Footer

- **Purpose:** The quietest region on any screen — system information only (104 §2).
- **Position:** Bottom of the Frame, full width, beneath the Content Container.
- **Priority:** Lowest — never competes visually with anything above it.
- **Information Hierarchy:** System status text (left) → last-updated/system-time (right).
- **Allowed Content:** System-time note, last-updated timestamp, optional version/build identifier.
- **Forbidden Content:** Navigation links, marketing content, calls to action.
- **Behavior:** Persistent thin bar on desktop; on mobile, scrolls with content to conserve vertical space.
- **Desktop:** Persistent at viewport bottom.
- **Mobile:** Inline at the end of scrollable content.
- **Accessibility:** Marked as the `contentinfo` landmark.
- **Future Scalability:** None anticipated — intentionally the platform's most stable region.

---

# B. Cross-Cutting Shell Behaviors

## 14. Spacing & Margins

- **Purpose:** One fixed spacing rhythm platform-wide (113) so no screen invents its own.
- **Position:** N/A — applies globally.
- **Priority:** Foundational; every region's internal padding derives from this scale.
- **Information Hierarchy:** N/A.
- **Allowed Content:** Base unit 4px; step scale 4 / 8 / 12 / 16 / 20 / 24 / 32px.
- **Forbidden Content:** Ad hoc spacing values outside this scale.
- **Behavior:** Content Container gutter: 24px desktop, 16px tablet, 12px mobile. Inter-widget gap: 16px desktop, 12px mobile.
- **Desktop:** Full scale available.
- **Mobile:** Compressed to the smaller half of the scale (4/8/12/16px) to preserve density (109).
- **Accessibility:** Adequate spacing maintained around touch targets regardless of density (103 §8).
- **Future Scalability:** New regions are always built from this same scale.

## 15. Responsive Breakpoints

- **Purpose:** Define the three device contexts the shell adapts to (109, 110).
- **Position:** N/A.
- **Priority:** Foundational.
- **Information Hierarchy:** Desktop (primary, 110) → Tablet (intermediate) → Mobile (field, 109).
- **Allowed Content:** Desktop ≥1280px; Tablet 768–1279px; Mobile <768px.
- **Forbidden Content:** Device-specific behavior not traceable to one of these three tiers.
- **Behavior:** Sidebar and Content Container layout change exactly at these boundaries.
- **Desktop:** Sidebar + Content side by side, full density.
- **Mobile:** Sidebar becomes an overlay; single column throughout.
- **Accessibility:** Layout changes never alter reading order for assistive tech.
- **Future Scalability:** A future fourth tier (e.g., a large control-room display) extends, not replaces, this scale.

## 16. Multi-Monitor Behavior

- **Purpose:** Support the dual-monitor engineering workflow (110).
- **Position:** N/A.
- **Priority:** Desktop-only concern.
- **Information Hierarchy:** Each window/monitor is a fully independent shell instance.
- **Allowed Content:** A standard "open in new window" affordance on Equipment pages and Dashboards.
- **Forbidden Content:** Special cross-window state synchronization beyond what the underlying data already provides.
- **Behavior:** Each window authenticates and navigates independently; Deep Links (105) guarantee both reach the exact same screen.
- **Desktop:** Fully supported.
- **Mobile:** Not applicable.
- **Accessibility:** Standard window/tab accessibility applies.
- **Future Scalability:** A future "send to other monitor" action may be added without changing this independent-window model.

## 17. Window Resizing

- **Purpose:** Keep the shell usable as a desktop window is resized, not only at fixed breakpoints.
- **Position:** N/A.
- **Priority:** Continuous.
- **Information Hierarchy:** N/A.
- **Allowed Content:** Fluid reflow of Content Container width; Sidebar width stays fixed (260px/72px) until a breakpoint is crossed.
- **Forbidden Content:** Horizontal scrolling of the Frame itself (individual wide tables may scroll internally, per 116).
- **Behavior:** Crossing a breakpoint while resizing triggers the same layout change as loading at that width directly.
- **Desktop:** Smooth reflow.
- **Mobile:** N/A — viewport size fixed by device.
- **Accessibility:** Reflow never traps focus or hides reachable content.
- **Future Scalability:** None anticipated.

## 18. Scrolling Philosophy

- **Purpose:** Define what scrolls independently within the shell.
- **Position:** N/A.
- **Priority:** High — incorrect behavior breaks the always-visible-navigation expectation.
- **Information Hierarchy:** Top Navigation never scrolls; Sidebar scrolls independently only if its own content exceeds viewport height; Content Container is the primary scroll region.
- **Allowed Content:** N/A.
- **Forbidden Content:** The entire page scrolling as one unit (which would scroll Sidebar and Top Navigation out of view).
- **Behavior:** Sticky elements (§19) remain pinned during Content Container scroll.
- **Desktop:** Up to three independent scroll regions (Sidebar, Content, an internal table per 116).
- **Mobile:** Content Container is the only scroll region; Sidebar is an overlay, not a persistent rail.
- **Accessibility:** Scroll position is never the only way to reveal critical content (099 §7).
- **Future Scalability:** A future right-hand AI panel (§25) scrolls independently, matching this model.

## 19. Sticky Elements

- **Purpose:** Define which shell elements remain pinned during scroll.
- **Position:** N/A.
- **Priority:** High.
- **Information Hierarchy:** Top Navigation (always sticky) → condensed Page Header (sticky within Content Container on long screens) → table headers (116, sticky within their own table).
- **Allowed Content:** N/A.
- **Forbidden Content:** More than one competing sticky layer stacking up and consuming excessive vertical space.
- **Behavior:** On a long screen, only Top Navigation and, optionally, a condensed Page Header stay visible; everything else scrolls normally.
- **Desktop:** As above.
- **Mobile:** Only Top Navigation stays sticky; Page Header scrolls away to maximize content space (109).
- **Accessibility:** Sticky elements never obscure focused content during keyboard navigation.
- **Future Scalability:** None anticipated.

## 20. Page Transitions

- **Purpose:** Define how Content Container changes when navigating between screens.
- **Position:** N/A.
- **Priority:** Low — functional, not decorative (099 §6).
- **Information Hierarchy:** N/A.
- **Allowed Content:** A brief, functional loading indicator (§22) if the next screen's data isn't immediately ready; otherwise an instant swap.
- **Forbidden Content:** Decorative transition animation (slides/fades used purely for visual flourish).
- **Behavior:** The Frame (Top Navigation, Sidebar) never re-renders on navigation — only Content Container swaps.
- **Desktop:** Instant swap once data is ready.
- **Mobile:** Same, with more tolerance for a brief Skeleton given field connectivity (109).
- **Accessibility:** Focus moves to the new screen's Page Header on navigation.
- **Future Scalability:** None anticipated.

## 21. Navigation Behavior

- **Purpose:** Define how selecting a nav item, breadcrumb, or link behaves.
- **Position:** N/A.
- **Priority:** High.
- **Information Hierarchy:** N/A.
- **Allowed Content:** Standard forward navigation; Back Navigation (105) always returns to the logical parent, not merely browser history.
- **Forbidden Content:** A navigation action leaving the Sidebar's active-item indicator out of sync with the screen actually shown.
- **Behavior:** Selecting the current screen's own nav item is a no-op.
- **Desktop:** Mouse click or keyboard activation.
- **Mobile:** Tap; Sidebar drawer closes automatically after selection.
- **Accessibility:** Full keyboard operability (104 §13).
- **Future Scalability:** A future Command Palette (§27) triggers the same navigation behavior as clicking a nav item.

## 22. Loading Behavior (Shell-Level)

- **Purpose:** Define the shell's own loading states, distinct from a screen's internal loading (127).
- **Position:** N/A.
- **Priority:** High — must never be confused with a failure.
- **Information Hierarchy:** Full-platform Loading screen (111) precedes the Frame's first render; subsequent navigation uses only Content-Container-scoped loading (127).
- **Allowed Content:** A minimal, branded loading indicator at first load; Skeleton states within Content Container thereafter.
- **Forbidden Content:** A full-screen loading block on every navigation once the shell is already loaded.
- **Behavior:** Per 127 — determinate/indeterminate/Skeleton, never a bare blank screen.
- **Desktop:** Rarely visible given stable connectivity (110).
- **Mobile:** More frequent; must never be indistinguishable from a frozen screen (109, 127).
- **Accessibility:** Loading state announced to screen readers.
- **Future Scalability:** An AI Assistant response (§25) uses this same loading vocabulary, never a bespoke "thinking" animation.

## 23. Error Behavior (Shell-Level)

- **Purpose:** Define platform-wide failure handling, distinct from a screen's localized errors (126).
- **Position:** Full-screen Error screen (111) when the failure prevents any normal use.
- **Priority:** High.
- **Information Hierarchy:** What failed → path forward (retry/contact), per 126.
- **Allowed Content:** Plain-language failure statement, retry action, contact/support path.
- **Forbidden Content:** A raw technical error with no plain-language explanation.
- **Behavior:** Localized failures (one widget, one table) never escalate to a shell-level Error screen — only genuinely platform-wide failures do.
- **Desktop:** Centered message within the Content Container (or full viewport if the Frame cannot render).
- **Mobile:** Same, full width.
- **Accessibility:** Error announced immediately to screen readers.
- **Future Scalability:** None anticipated.

## 24. Offline Indication

- **Purpose:** Make connectivity state honest and visible (109, 103 §5).
- **Position:** A persistent, small indicator in the Top Navigation, near the Notification Center, when offline or sync-pending.
- **Priority:** High for field/mobile use (109); rare on desktop (110).
- **Information Hierarchy:** Online (no indicator) → Offline (visible) → Syncing/Not Synced (visible, detail on click).
- **Allowed Content:** The Offline/Not Synced status icon (103 §5) plus a short label.
- **Forbidden Content:** Silent failure to sync with no indicator at all (109).
- **Behavior:** Clicking the indicator shows what is queued/not yet synced.
- **Desktop:** Rare; same treatment when it occurs.
- **Mobile:** Common and expected; calm, not alarming, for a normal field condition.
- **Accessibility:** State exposed as text, not icon/color alone.
- **Future Scalability:** A future offline-first PWA mode (109) surfaces more detail from this same indicator, not a separate UI.

---

# C. Future Extension Points

## 25. Future AI Assistant Entry Point

- **Purpose:** Reserve the shell location for a future AI Assistant module (100 §11).
- **Position:** Top Navigation, immediately left of the Profile Menu.
- **Priority:** Future — not active in this blueprint.
- **Information Hierarchy:** When active, ranks alongside other Top Navigation utilities, never above Global Search or Notifications.
- **Allowed Content (when active):** An icon entry point opening a panel/drawer; content follows 104 §3 AI Insight Card rules and 129's vocabulary.
- **Forbidden Content:** An entry point that bypasses equipment-centric navigation (114) or introduces a separate AI-only screen (111).
- **Behavior:** Opens a Drawer (104 §8) from the right edge of the Frame, alongside — not inside — Content Container.
- **Desktop:** Drawer panel, resizable width in a future iteration.
- **Mobile:** Full-screen takeover, consistent with other mobile drawer patterns.
- **Accessibility:** Same standards as any other Dialog/Drawer (104 §13).
- **Future Scalability:** This section is itself the reservation.

## 26. Future Notification Center Expansion

- **Purpose:** Reserve room for richer notification behavior (grouping, escalation, per 123) beyond a simple list.
- **Position:** Same as §7 Notification Center.
- **Priority:** Future.
- **Information Hierarchy:** Unchanged from §7 — priority and recency remain the ranking rule as features expand.
- **Allowed Content (future):** Inline quick-actions (e.g., "Approve" directly from the panel) — must still deep-link to the full record for anything beyond trivial acknowledgment.
- **Forbidden Content:** A parallel, differently-behaved notification surface elsewhere in the shell.
- **Behavior:** Any expansion extends the existing panel; never relocates or duplicates it.
- **Desktop:** Panel may grow in width/height as features are added.
- **Mobile:** Full-screen view absorbs the same features.
- **Accessibility:** Any new inline action remains fully keyboard- and screen-reader-operable.
- **Future Scalability:** This section is itself the reservation.

## 27. Future Command Palette

- **Purpose:** Reserve a fast, keyboard-driven "jump to anything" pattern for expert desktop users (110).
- **Position:** A modal overlay, invoked by a global keyboard shortcut (exact key reserved for a future Keyboard Shortcut Standard, 130) — not a persistent visible element.
- **Priority:** Future; desktop-only.
- **Information Hierarchy:** Same Equipment → Record → Action ranking as Global Search (108, 119), plus direct navigation/action commands.
- **Allowed Content:** A single input; ranked results mixing navigation destinations and quick actions.
- **Forbidden Content:** Any capability not already reachable through normal navigation (104 §11 — never the only way to reach a function).
- **Behavior:** Opens as a centered Modal (104 §8); closes on selection or Escape.
- **Desktop:** Primary use case.
- **Mobile:** Not applicable — mobile relies on Global Search and direct navigation instead.
- **Accessibility:** Full keyboard operability by definition; results also screen-reader-navigable.
- **Future Scalability:** This section is itself the reservation.

---

## Cross References

- 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md — §3, §6, §7
- 100_ACC_BRAND_IDENTITY.md — §3, §9, §11
- 101_ACC_COLOR_SYSTEM.md — §4, §8, §9, §10
- 102_ACC_TYPOGRAPHY_STANDARD.md — §3
- 103_ACC_ICONOGRAPHY_STANDARD.md — §4, §5, §8, §9
- 104_ACC_COMPONENT_AND_INTERACTION_LANGUAGE.md — §2, §7, §8, §11, §13
- 105_ACC_NAVIGATION_ARCHITECTURE.md — governs all navigation elements in this blueprint
- 108_ACC_INFORMATION_ARCHITECTURE.md
- 109_ACC_MOBILE_DESIGN_STANDARD.md / 110_ACC_DESKTOP_WORKSTATION_STANDARD.md
- 111_ACC_UI_SCREEN_CATALOG.md
- 112_ACC_SCREEN_TEMPLATE_STANDARD.md — §2
- 113_ACC_PAGE_LAYOUT_STANDARD.md
- 114_ACC_EQUIPMENT_CENTRIC_DESIGN_STANDARD.md
- 119_ACC_SEARCH_STANDARD.md
- 123_ACC_NOTIFICATION_STANDARD.md
- 126_ACC_ERROR_STATE_STANDARD.md
- 127_ACC_LOADING_STATE_STANDARD.md
- 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-06 | Initial draft — full Platform Shell blueprint, 27 specified elements/behaviors. Pending approval. |
