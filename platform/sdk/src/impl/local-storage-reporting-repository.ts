// platform/sdk/src/impl/local-storage-reporting-repository.ts
// localStorage-backed implementation of IReportingRepository.
//
// Responsibilities:
//   - Persist all ReportRecord state to browser localStorage so reporting
//     categories, templates, export profiles, schedule profiles, and
//     definitions survive page refresh.
//   - Mirror the same Map-based index structure used by InMemoryReportingRepository
//     so the interface contract is identical.
//   - Gracefully degrade when localStorage is unavailable (quota exceeded,
//     private mode, SSR) — operations continue in-memory only.
//
// Storage key: platform.reporting.registry
//   Value: JSON array of ReportRecord objects.
//
// This is a temporary persistence layer bridging Phase 1 (in-memory) and the
// planned Google Sheets provider (GoogleSheetsReportingRepository — future sprint).
// The IReportingRepository interface is unchanged; swapping providers requires
// only a bootstrap.ts change.

import { DuplicateEntityError, EntityNotFoundError } from '@acc-reliability/services';
import type {
  ReportRecord,
  ReportId,
  ReportObjectType,
  ReportListQuery,
  ReportListResult,
  IReportingRepository,
} from '@acc-reliability/services';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY        = 'platform.reporting.registry';
const DEFAULT_LIST_LIMIT = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function compositeKey(objectType: ReportObjectType, reportKey: string): string {
  return `${objectType}::${reportKey.toLowerCase()}`;
}

// ── LocalStorageReportingRepository ──────────────────────────────────────────

/**
 * localStorage-backed implementation of the reporting repository.
 *
 * Storage format:
 *  - Primary store: `Map<id, ReportRecord>` (in-memory, rebuilt from localStorage on init).
 *  - Key index:     `Map<"objectType::reportKey", id>` for O(1) lookup.
 *  - Persistence:   localStorage JSON array, written through on every mutation.
 *
 * All stored records are frozen with `Object.freeze` at write time (same as
 * InMemoryReportingRepository).
 *
 * Next provider: GoogleSheetsReportingRepository — replace this class in
 * bootstrap.ts once the Google Sheets adapter credentials are available.
 */
export class LocalStorageReportingRepository implements IReportingRepository {
  private readonly store    = new Map<string, ReportRecord>();
  private readonly keyIndex = new Map<string, string>();

  constructor() {
    this.hydrate();
  }

  // ── save ──────────────────────────────────────────────────────────────────

  save(report: ReportRecord): ReportRecord {
    if (this.store.has(report.id)) {
      throw new DuplicateEntityError(
        `Report record '${report.id}' already exists`,
        { id: report.id },
      );
    }

    const key = compositeKey(report.objectType, report.reportKey);
    if (this.keyIndex.has(key)) {
      throw new DuplicateEntityError(
        `Reporting configuration '${report.objectType}/${report.reportKey}' already exists`,
        { objectType: report.objectType, reportKey: report.reportKey },
      );
    }

    const frozen = Object.freeze({ ...report, settings: Object.freeze({ ...report.settings }) });
    this.store.set(report.id, frozen);
    this.keyIndex.set(key, report.id);
    this.persist();
    return frozen;
  }

  // ── update ────────────────────────────────────────────────────────────────

  update(report: ReportRecord): ReportRecord {
    const existing = this.store.get(report.id);
    if (existing === undefined) {
      throw new EntityNotFoundError(
        `Report record '${report.id}' not found`,
        { id: report.id },
      );
    }

    if (existing.objectType !== report.objectType || existing.reportKey !== report.reportKey) {
      const oldKey = compositeKey(existing.objectType, existing.reportKey);
      const newKey = compositeKey(report.objectType, report.reportKey);

      if (this.keyIndex.has(newKey) && this.keyIndex.get(newKey) !== report.id) {
        throw new DuplicateEntityError(
          `Reporting configuration '${report.objectType}/${report.reportKey}' already exists`,
          { objectType: report.objectType, reportKey: report.reportKey },
        );
      }

      this.keyIndex.delete(oldKey);
      this.keyIndex.set(newKey, report.id);
    }

    const frozen = Object.freeze({ ...report, settings: Object.freeze({ ...report.settings }) });
    this.store.set(report.id, frozen);
    this.persist();
    return frozen;
  }

  // ── findById ──────────────────────────────────────────────────────────────

  findById(id: ReportId): ReportRecord | null {
    return this.store.get(id) ?? null;
  }

  // ── findByKey ─────────────────────────────────────────────────────────────

  findByKey(objectType: ReportObjectType, reportKey: string): ReportRecord | null {
    const id = this.keyIndex.get(compositeKey(objectType, reportKey));
    if (id === undefined) return null;
    return this.store.get(id) ?? null;
  }

  // ── list ──────────────────────────────────────────────────────────────────

  list(query?: ReportListQuery): ReportListResult {
    const offset = query?.offset ?? 0;
    const limit  = query?.limit  ?? DEFAULT_LIST_LIMIT;
    const matched: ReportRecord[] = [];

    for (const record of this.store.values()) {
      if (!this.matchesQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort(byCreatedAtAscending);

    return {
      reports: matched.slice(offset, offset + limit),
      total:   matched.length,
      offset,
      limit,
    };
  }

  // ── count ─────────────────────────────────────────────────────────────────

  count(): number {
    return this.store.size;
  }

  // ── remove ────────────────────────────────────────────────────────────────

  remove(id: ReportId): boolean {
    const existing = this.store.get(id);
    if (existing === undefined) return false;

    this.keyIndex.delete(compositeKey(existing.objectType, existing.reportKey));
    this.store.delete(id);
    this.persist();
    return true;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Reads the persisted JSON array from localStorage and populates the
   * in-memory Maps.  Called once in the constructor.
   *
   * Silently ignores malformed JSON or localStorage access errors so the
   * application still starts cleanly in private mode or when storage is full.
   */
  private hydrate(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return;

      const records = JSON.parse(raw) as ReportRecord[];
      if (!Array.isArray(records)) return;

      for (const record of records) {
        if (!record || typeof record.id !== 'string' || typeof record.reportKey !== 'string') {
          continue;
        }
        const frozen = Object.freeze({ ...record, settings: Object.freeze({ ...record.settings }) });
        this.store.set(record.id, frozen);
        this.keyIndex.set(compositeKey(record.objectType, record.reportKey), record.id);
      }
    } catch {
      // localStorage unavailable or corrupted — start empty, seed will populate.
    }
  }

  /**
   * Serialises the current store to localStorage.
   * Silently ignores write failures (quota exceeded, private mode).
   */
  private persist(): void {
    try {
      const records = Array.from(this.store.values());
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Quota exceeded or access blocked — state is still correct in-memory.
    }
  }

  private matchesQuery(record: ReportRecord, query?: ReportListQuery): boolean {
    if (query === undefined) return true;

    if (query.objectType !== undefined && record.objectType !== query.objectType) {
      return false;
    }

    if (query.status !== undefined && record.status !== query.status) {
      return false;
    }

    if (query.category !== undefined && record.category !== query.category) {
      return false;
    }

    if (query.scheduleEnabled !== undefined && record.scheduleEnabled !== query.scheduleEnabled) {
      return false;
    }

    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle = query.searchText.toLowerCase();
      const inName = record.name.toLowerCase().includes(needle);
      const inKey  = record.reportKey.toLowerCase().includes(needle);
      const inDesc = (record.description ?? '').toLowerCase().includes(needle);
      const inCat  = (record.category ?? '').toLowerCase().includes(needle);
      if (!inName && !inKey && !inDesc && !inCat) return false;
    }

    return true;
  }
}

// ── Sorting helper ────────────────────────────────────────────────────────────

function byCreatedAtAscending(a: ReportRecord, b: ReportRecord): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}
