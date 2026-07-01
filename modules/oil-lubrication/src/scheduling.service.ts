// modules/oil-lubrication/src/scheduling.service.ts
// Pure business logic for oil change scheduling, status classification,
// and overdue detection.
//
// SchedulingService has no external dependencies (no SDK, no repository).
// It operates on domain value objects only and is safe to unit-test without
// any platform infrastructure.
//
// Sprint 03 scope:
//   computeNextDueDate()    — derive next due date from last change + frequency
//   computeStatusBucket()   — classify a lubrication point into a status bucket
//   detectOverdue()         — identify scheduled records that are past their due date
//
// Future sprints will add operating-hours-based scheduling when a running
// hours data feed becomes available from the platform.

import type { IsoTimestamp } from '@acc-reliability/shared-types';
import type { OilChangeFrequency, LpStatusBucket, OilChangeRecord, LubricationPoint } from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/** Number of days within which a lubrication point is classified as 'due-soon'. */
const DUE_SOON_THRESHOLD_DAYS = 7;

// ── SchedulingService ─────────────────────────────────────────────────────────

/**
 * Pure scheduling and status computation service for Oil Lubrication.
 *
 * All methods are deterministic and side-effect free. Pass the current date
 * explicitly to enable reliable unit testing without mocking `Date.now()`.
 *
 * @example
 * const svc = new SchedulingService();
 * const nextDue = svc.computeNextDueDate(record.performedAt, point.frequency);
 * const bucket  = svc.computeStatusBucket(nextDue, point.isActive);
 */
export class SchedulingService {

  // ── computeNextDueDate ────────────────────────────────────────────────────

  /**
   * Derives the next oil change due date from the last change timestamp and
   * the lubrication point's frequency configuration.
   *
   * Rules:
   * - Returns `null` when `lastChangeIso` is `null` (point has never been serviced).
   * - Returns `null` when `frequency` is undefined or has no scheduling interval.
   * - Calendar-based scheduling: `lastChangeDate + intervalDays`.
   * - Operating-hours scheduling: not yet implemented (hook point for Sprint 07+).
   *   When `intervalOperatingHours` is set without `intervalDays`, returns `null`
   *   until a running-hours feed is available.
   * - When both `intervalDays` and `intervalOperatingHours` are set, calendar
   *   scheduling governs until operating-hours telemetry is integrated.
   *
   * @param lastChangeIso  ISO 8601 UTC timestamp of the last completed oil change,
   *                       or `null` if the point has never been serviced.
   * @param frequency      OilChangeFrequency value object from the LubricationPoint.
   * @param now            Reference timestamp for calculations (defaults to current time).
   * @returns              ISO 8601 UTC timestamp of the next due date, or `null`.
   */
  computeNextDueDate(
    lastChangeIso: IsoTimestamp | null,
    frequency: OilChangeFrequency | null | undefined,
    now: Date = new Date()
  ): IsoTimestamp | null {
    void now;

    if (lastChangeIso === null) return null;
    if (!frequency) return null;
    if (!frequency.intervalDays) return null;

    const lastChange = new Date(lastChangeIso);
    if (isNaN(lastChange.getTime())) return null;

    const nextDue = new Date(lastChange.getTime() + frequency.intervalDays * MS_PER_DAY);
    return nextDue.toISOString() as IsoTimestamp;
  }

  // ── computeStatusBucket ───────────────────────────────────────────────────

  /**
   * Classifies a lubrication point into a status bucket based on its next due
   * date and active flag.
   *
   * Classification priority (highest first):
   * 1. `inactive`   — point is deactivated; skips all other checks
   * 2. `no-history` — active, but `nextDue` is `null` (never serviced or no frequency)
   * 3. `overdue`    — `nextDue` is in the past relative to `now`
   * 4. `due-today`  — `nextDue` is today (same calendar day as `now`)
   * 5. `due-soon`   — `nextDue` is within {@link DUE_SOON_THRESHOLD_DAYS} days of `now`
   * 6. `ok`         — `nextDue` is more than {@link DUE_SOON_THRESHOLD_DAYS} days away
   *
   * @param nextDueIso  ISO 8601 UTC timestamp of the computed next due date, or `null`.
   * @param isActive    Whether the lubrication point is active.
   * @param now         Reference timestamp for date comparisons (defaults to current time).
   * @returns           {@link LpStatusBucket} classification.
   */
  computeStatusBucket(
    nextDueIso: IsoTimestamp | null,
    isActive: boolean,
    now: Date = new Date()
  ): LpStatusBucket {
    if (!isActive) return 'inactive';
    if (nextDueIso === null) return 'no-history';

    const nextDue = new Date(nextDueIso);
    if (isNaN(nextDue.getTime())) return 'no-history';

    const todayStart = startOfDay(now);
    const tomorrowStart = new Date(todayStart.getTime() + MS_PER_DAY);
    const dueSoonEnd = new Date(todayStart.getTime() + DUE_SOON_THRESHOLD_DAYS * MS_PER_DAY);

    if (nextDue < todayStart) return 'overdue';
    if (nextDue < tomorrowStart) return 'due-today';
    if (nextDue < dueSoonEnd) return 'due-soon';
    return 'ok';
  }

  // ── detectOverdue ─────────────────────────────────────────────────────────

  /**
   * Identifies oil change records that are in `scheduled` status but have
   * passed their expected completion date based on their linked lubrication
   * point's frequency.
   *
   * A record is overdue when:
   * - Its status is `scheduled` (not yet completed, cancelled, or in-progress)
   * - Its linked lubrication point has a frequency defined
   * - The computed next due date (from `performedAt` of the prior record, or
   *   `record.performedAt` itself as a reference) has elapsed
   *
   * Simplified approach for Sprint 03:
   * - Uses each `scheduled` record's own `performedAt` as the reference point
   *   (the date the record was intended to be performed) and checks if it is
   *   in the past relative to `now`.
   *
   * @param records  All oil change records to inspect (contractor-scoped).
   * @param points   Lubrication points providing frequency data (contractor-scoped).
   * @param now      Reference timestamp (defaults to current time).
   * @returns        Subset of `records` that are overdue.
   */
  detectOverdue(
    records: readonly OilChangeRecord[],
    points: readonly LubricationPoint[],
    now: Date = new Date()
  ): OilChangeRecord[] {
    const pointMap = new Map<string, LubricationPoint>(
      points.map((p) => [p.lubricationPointId as string, p])
    );

    return records.filter((record) => {
      if (record.status !== 'scheduled') return false;

      const performedDate = new Date(record.performedAt);
      if (isNaN(performedDate.getTime())) return false;

      if (performedDate < now) {
        return true;
      }

      if (record.lubricationPointId !== undefined) {
        const point = pointMap.get(record.lubricationPointId as string);
        if (point?.frequency?.intervalDays) {
          const nextDue = this.computeNextDueDate(record.performedAt, point.frequency, now);
          if (nextDue !== null && new Date(nextDue) < now) return true;
        }
      }

      return false;
    });
  }

  // ── computeComplianceRate ─────────────────────────────────────────────────

  /**
   * Computes the lubrication compliance rate as a percentage.
   *
   * Formula: (total active points − overdue points) / total active points × 100
   *
   * Returns 100 when there are no active points (no denominator risk).
   *
   * @param totalActive   Total number of active lubrication points.
   * @param overdueCount  Number of active points classified as overdue.
   * @returns             Compliance rate (0–100), rounded to one decimal place.
   */
  computeComplianceRate(totalActive: number, overdueCount: number): number {
    if (totalActive === 0) return 100;
    const rate = ((totalActive - overdueCount) / totalActive) * 100;
    return Math.round(rate * 10) / 10;
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/** Returns midnight (00:00:00.000) of the given date in local time. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
