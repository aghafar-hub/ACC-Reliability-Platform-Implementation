// platform/services/src/reporting/reporting-repository.ts
// In-memory implementation of IReportingRepository.

import { DuplicateEntityError, EntityNotFoundError } from '../errors';
import type {
  ReportRecord,
  ReportId,
  ReportObjectType,
  ReportListQuery,
  ReportListResult,
  IReportingRepository,
} from './reporting-types';

const DEFAULT_LIST_LIMIT = 50;

function compositeKey(objectType: ReportObjectType, reportKey: string): string {
  return `${objectType}::${reportKey.toLowerCase()}`;
}

export class InMemoryReportingRepository implements IReportingRepository {
  private readonly store    = new Map<string, ReportRecord>();
  private readonly keyIndex = new Map<string, string>();

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
    return frozen;
  }

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
    return frozen;
  }

  findById(id: ReportId): ReportRecord | null {
    return this.store.get(id) ?? null;
  }

  findByKey(objectType: ReportObjectType, reportKey: string): ReportRecord | null {
    const id = this.keyIndex.get(compositeKey(objectType, reportKey));
    if (id === undefined) return null;
    return this.store.get(id) ?? null;
  }

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
      total: matched.length,
      offset,
      limit,
    };
  }

  count(): number {
    return this.store.size;
  }

  remove(id: ReportId): boolean {
    const existing = this.store.get(id);
    if (existing === undefined) return false;

    this.keyIndex.delete(compositeKey(existing.objectType, existing.reportKey));
    this.store.delete(id);
    return true;
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

function byCreatedAtAscending(a: ReportRecord, b: ReportRecord): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}
