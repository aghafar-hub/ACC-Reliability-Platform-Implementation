// apps/owner-center/src/types/tour-types.ts
// Guide Tour foundation types for the Owner Center shell.
//
// Tours are module-owned sequences of steps that highlight UI elements.
// No real overlay is implemented yet — this captures the intended data model
// so the TourContext can be wired when the guided-overlay milestone arrives.

import type { LocalizedContent } from './learning-types';

// ── Identifiers ───────────────────────────────────────────────────────────────

/** Stable identifier for a single tour step. */
export type TourStepId = string & { readonly __brand: 'TourStepId' };

/** Stable identifier for a complete guided tour. */
export type GuideTourId = string & { readonly __brand: 'GuideTourId' };

// ── Tour step ─────────────────────────────────────────────────────────────────

/**
 * A single step in a guided tour.
 *
 * The shell uses `targetSelector` to locate the element to highlight.
 * When the guided overlay is implemented, the tooltip is positioned relative
 * to the matched element.
 */
export interface TourStep {
  /** Stable id for this step within the tour. */
  readonly id: TourStepId;
  /**
   * CSS selector of the element this step points to.
   * Empty string means the step is a full-screen modal (no anchor element).
   */
  readonly targetSelector: string;
  /** Step title in supported locales. */
  readonly title: LocalizedContent<string>;
  /** Explanatory body text in supported locales. */
  readonly body: LocalizedContent<string>;
  /** Display order within the tour (ascending). */
  readonly order: number;
}

// ── Guide tour ────────────────────────────────────────────────────────────────

/**
 * A named guided tour composed of ordered steps.
 * Owned by the platform module that registered it.
 */
export interface GuideTour {
  /** Stable tour id (e.g. 'oil-lube:record-first-change'). */
  readonly id: GuideTourId;
  /** Human-readable name (English only — used in dev/admin tooling). */
  readonly name: string;
  /** Platform module that owns this tour. */
  readonly moduleId: string;
  /** Ordered list of steps. */
  readonly steps: readonly TourStep[];
}

// ── Tour runtime state ────────────────────────────────────────────────────────

/**
 * Runtime state held in TourContext.
 *
 * `isActive` is false until a tour is started via `startTour()`.
 * The guided overlay reads `currentStepIndex` to determine which step to show.
 */
export interface TourState {
  /** Id of the tour currently running; null when no tour is active. */
  readonly activeTourId: GuideTourId | null;
  /** Zero-based index of the step currently being shown. */
  readonly currentStepIndex: number;
  /** Whether a tour is currently in progress. */
  readonly isActive: boolean;
}

/** Default state — no tour active. */
export const INITIAL_TOUR_STATE: TourState = {
  activeTourId: null,
  currentStepIndex: 0,
  isActive: false,
} as const;
