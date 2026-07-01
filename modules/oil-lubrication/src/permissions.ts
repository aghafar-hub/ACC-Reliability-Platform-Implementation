// modules/oil-lubrication/src/permissions.ts
// Typed permission action constants for the Oil Lubrication module.
//
// Format: '<moduleId>:<domain>:<action>'
// All constants are consumed by platform `Can` / `PermissionRoute` components
// and `sdk.permissions` checks. No free-string permission codes anywhere.
//
// These constants are the single source of truth for permission action identifiers
// in this module. UI guards and service-level permission checks must reference
// only these constants.

/**
 * Typed permission action constants for the Oil Lubrication module.
 *
 * Consume in UI via `<Can action={OIL_LUBRICATION_PERMISSIONS.RECORD_OIL_CHANGE}>`.
 * Consume in service via `sdk.permissions.can(userId, OIL_LUBRICATION_PERMISSIONS.APPROVE_OIL_CHANGE)`.
 */
export const OIL_LUBRICATION_PERMISSIONS = {
  // ── Oil Change Record ────────────────────────────────────────────────────────

  /** View the oil change list and record details. */
  VIEW_OIL_CHANGE: 'oil-lubrication:oil-change:view',

  /** Record a new oil change event. */
  RECORD_OIL_CHANGE: 'oil-lubrication:oil-change:create',

  /** Update an existing oil change record. */
  UPDATE_OIL_CHANGE: 'oil-lubrication:oil-change:update',

  /** Cancel (void) an oil change record. Replaces hard delete. */
  CANCEL_OIL_CHANGE: 'oil-lubrication:oil-change:cancel',

  /** Approve a pending oil change submission. */
  APPROVE_OIL_CHANGE: 'oil-lubrication:oil-change:approve',

  // ── Lubrication Point ────────────────────────────────────────────────────────

  /** View lubrication points and the equipment explorer. */
  VIEW_LUBRICATION_POINT: 'oil-lubrication:lubrication-point:view',

  /** Create, update, and deactivate lubrication points. */
  MANAGE_LUBRICATION_POINT: 'oil-lubrication:lubrication-point:manage',

  // ── Schedule & Forecast ──────────────────────────────────────────────────────

  /** View computed schedules, next due dates, and overdue listings. */
  VIEW_SCHEDULE: 'oil-lubrication:schedule:view',

  /** View the forecast page (upcoming, overdue, severity ranking). */
  VIEW_FORECAST: 'oil-lubrication:forecast:view',

  // ── Routes ───────────────────────────────────────────────────────────────────

  /** View lubrication routes (list and detail). */
  VIEW_ROUTES: 'oil-lubrication:routes:view',

  /** Create and assign lubrication routes. */
  MANAGE_ROUTES: 'oil-lubrication:routes:manage',

  /** Execute an assigned route (field technician action). */
  EXECUTE_ROUTE: 'oil-lubrication:routes:execute',

  // ── Sampling ─────────────────────────────────────────────────────────────────

  /** View oil samples and lab results. */
  VIEW_SAMPLING: 'oil-lubrication:sampling:view',

  /** Create and submit oil samples. */
  MANAGE_SAMPLING: 'oil-lubrication:sampling:manage',

  /** Enter lab analysis results. */
  ENTER_LAB_RESULTS: 'oil-lubrication:sampling:enter-results',

  // ── Reports ──────────────────────────────────────────────────────────────────

  /** View and generate oil lubrication reports. */
  VIEW_REPORTS: 'oil-lubrication:reports:view',

  /** Export reports to CSV / XLSX. */
  EXPORT_REPORTS: 'oil-lubrication:reports:export',

  // ── Settings ─────────────────────────────────────────────────────────────────

  /** View and configure module settings. */
  MANAGE_SETTINGS: 'oil-lubrication:settings:manage',
} as const;

/** Union type of all valid Oil Lubrication permission action strings. */
export type OilLubricationPermission =
  (typeof OIL_LUBRICATION_PERMISSIONS)[keyof typeof OIL_LUBRICATION_PERMISSIONS];
