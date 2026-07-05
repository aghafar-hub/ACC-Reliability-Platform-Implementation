# ACC Reliability Platform
# 099_ACC_PLATFORM_DESIGN_PRINCIPLES.md

## Document Control

| Item | Value |
|---|---|
| Document ID | BRAND-099 |
| Title | ACC Platform Design Principles — The Constitution |
| Version | 1.0 |
| Status | Draft — Pending Approval |
| Owner | ACC Reliability Department |
| Applies To | Every current and future module, screen, and feature |
| Relationship | Sits alongside 100_ACC_BRAND_IDENTITY.md as the platform's highest governing documents. Every design system, component standard, and module UI freeze must comply with this document before implementation begins. |

---

## Purpose

The ACC Reliability Platform exists so that Arabian Cement Company can see the true condition of its assets and act on that truth before failure occurs.

It exists to serve one person at the moment of decision: the engineer or reliability authority deciding what must happen next to a piece of equipment. Every capability the platform will ever have — today or in ten years — is in service of that single moment.

This document does not describe how the platform looks. It describes what the platform must always *be*, regardless of how it is built. It is the constitution every future design and implementation decision must be checked against.

---

## 1. Purpose

The platform exists to give ACC continuous command over the reliability of its physical assets. It is not a records archive, not a reporting formality, and not a convenience tool for contractors. It is the instrument through which ACC exercises its responsibility as asset owner and Reliability Authority.

If a capability does not help see true equipment condition or act on it, it does not belong in the platform.

---

## 2. Platform Before Module

The user must always feel they are using **one** ACC Reliability Platform — never a collection of separate applications that happen to share a login.

Modules — Oil Analysis, Lubrication, Vibration, Reliability, Route Center, and every module still to come — are **capabilities** of the one platform, not products in their own right. A module may add a new kind of data or workflow, but it may never introduce a different platform experience, a different set of values, or a different relationship with the user.

No module owns its own identity. Every module borrows the platform's.

---

## 3. Equipment Before Everything

`Equipment_ID` is the digital twin of the physical asset. It is the one identity every module, every sample, every route, every action, and every report must ultimately connect back to.

Every workflow — no matter how it starts (a sample, a route stop, a vibration reading, a work order) — must eventually return to Equipment Details. If a piece of data cannot be traced back to a specific piece of equipment, its place in the platform must be questioned.

The equipment is the subject. Everything else — contractor, contract, sample, report — is context that explains the equipment's condition.

---

## 4. Decision Before Information

Every screen must help the engineer make a decision. Information that does not change what someone would do next has no value in the platform, no matter how accurate or well-organized it is.

A screen is not complete when all the data is present — it is complete when the decision is obvious. If a user must gather, cross-reference, or interpret before acting, the screen has not done its job.

---

## 5. Owner Before Executor

ACC supervises. Contractors execute.

This relationship must be visible in every part of the platform's design and structure, always:

- ACC is never presented as a peer of, or compared alongside, the contractors it oversees.
- Contractors are measured against each other and held accountable to ACC — never the reverse.
- Any party that performs work on ACC's behalf — present or future, contractor or service function — is subject to this same relationship. ACC evaluates; it is never evaluated as one of them.

---

## 6. Engineering Before Marketing

This is professional engineering software before it is anything else.

- No decorative widgets that exist only to fill space.
- No animation that does not communicate a real state change.
- No empty visual elements — an element with nothing to show does not get a placeholder for its own sake; it simply is not shown, or is shown compactly as absent.
- Every screen must look and behave like control-room instrumentation, not like a marketing site or a generic business dashboard.

If a design choice would help a product screenshot more than it would help an engineer, it does not belong.

---

## 7. Progressive Disclosure

Show only what is needed for the decision in front of the user right now. Everything else is one deliberate step away, never zero steps (cluttering the primary view) and never more than a few steps (buried and effectively lost).

Depth of investigation is always available — through drill-down, not through more information crammed onto the first screen. The first view answers "what needs attention"; each step after that answers "why," in as much depth as the user chooses to go.

---

## 8. One Platform — One Language

Navigation, terminology, color meaning, spacing, interaction patterns, and behavior must remain identical across every module.

A word, a color, or an interaction must mean the same thing everywhere it appears. "Alert" cannot mean one thing in Oil Analysis and another in Vibration. A red indicator cannot mean "alert" in one module and "informational" in another. Once the platform has established a pattern, no module may reinvent it for its own convenience.

Consistency is not a visual nicety here — it is what allows a user's trust and trained instincts to transfer from one module to the next without relearning anything.

---

## 9. Every Widget Has a Purpose

Every widget on every screen must answer exactly one engineering question. If it cannot be stated as a question it answers, it should not exist.

Every KPI must lead somewhere — clicking or acting on it must take the user closer to a decision or a detailed view. A KPI that only displays a number and goes nowhere is a dead end, and dead ends are not permitted.

No widget exists to be looked at. Every widget exists to be acted on.

---

## 10. Truth Before Beauty

The platform never invents data, never fabricates a KPI to fill a layout, and never hides an inconvenient engineering fact to make a screen look better or more complete.

If the true answer is "no data," the platform says "no data" — compactly, honestly, and without disguising the gap as something else. A confident-looking screen built on invented or softened facts is a failure of the platform's core purpose, regardless of how polished it appears.

---

## 11. Future Expansion

The platform must support future modules and capabilities without requiring a redesign of what already exists. Examples of what must be absorbed without disruption:

- Oil Analysis
- Lubrication
- Vibration
- Reliability
- Route Center
- AI Insights
- ERP Integration
- Mobile
- Offline

A new module is a proof that the platform's principles are sound, not an occasion to bend them. If adding a module requires rewriting the platform's foundation, the foundation was never truly platform-level to begin with.

---

## 12. Longevity

Every design decision must still make sense ten years from now.

This means favoring principles over trends, clarity over cleverness, and structure over decoration. A decision justified only by "this is currently fashionable" does not belong here. A decision justified by "this is what an engineer needs to see to act correctly" will still be correct in ten years, regardless of what technology or visual style surrounds it by then.

---

## 13. Definition of Success

The ACC Reliability Platform succeeds when:

- An engineer can open any module and know, within moments, what requires attention and what to do about it.
- ACC can see, at any time, the true reliability state of its assets and the true performance of the contractors executing work on them — without needing to reconcile or interpret.
- No screen, in any module, ever has to be explained twice because its language, behavior, or meaning differed from the rest of the platform.
- The platform, unchanged in principle, is still the trusted instrument of ACC's Reliability Authority a decade from now — having absorbed new modules, new contractors, and new technology without losing what it fundamentally is.

Success is not a screenshot. Success is a correct decision made faster because the platform existed.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-05 | Initial draft — the 13 founding principles established as the platform's constitution. Pending approval. |
| 1.1 | 2026-07-06 | Terminology synchronization pass: example wording updated "Critical"→"Alert" per 129_ACC_ENGINEERING_VOCABULARY_STANDARD.md. No philosophy, rule, or content added/removed. |
