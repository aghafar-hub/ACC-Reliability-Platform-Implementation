// platform/sdk/src/impl/local-storage-notification-management-repository.ts
// localStorage-backed implementation of INotificationManagementRepository.
//
// Responsibilities:
//   - Persist all NotificationRuleRecord state to browser localStorage so
//     channel/template/rule/reminder/escalation configuration survives refresh.
//   - Mirror the same Map-based index structure used by
//     InMemoryNotificationManagementRepository so the interface contract is identical.
//   - Gracefully degrade when localStorage is unavailable (quota exceeded,
//     private mode, SSR) — operations continue in-memory only.
//
// Storage key: platform.notification-management.registry
//   Value: JSON array of NotificationRuleRecord objects.
//
// This is a temporary persistence layer bridging Phase 1 (in-memory) and the
// planned Google Sheets provider (future sprint).
// The INotificationManagementRepository interface is unchanged; swapping
// providers requires only a bootstrap.ts change.

import { DuplicateEntityError, EntityNotFoundError } from '@acc-reliability/services';
import type {
  NotificationRuleRecord,
  NotificationRuleId,
  NotificationObjectType,
  NotificationRuleListQuery,
  NotificationRuleListResult,
  INotificationManagementRepository,
} from '@acc-reliability/services';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY        = 'platform.notification-management.registry';
const DEFAULT_LIST_LIMIT = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function compositeKey(objectType: NotificationObjectType, ruleKey: string): string {
  return `${objectType}::${ruleKey.toLowerCase()}`;
}

// ── LocalStorageNotificationManagementRepository ──────────────────────────────

/**
 * localStorage-backed implementation of the notification management repository.
 *
 * Storage format:
 *  - Primary store: `Map<id, NotificationRuleRecord>` (in-memory, rebuilt from localStorage on init).
 *  - Key index:     `Map<"objectType::ruleKey", id>` for O(1) lookup.
 *  - Persistence:   localStorage JSON array, written through on every mutation.
 *
 * All stored records are frozen with `Object.freeze` at write time (same as
 * InMemoryNotificationManagementRepository).
 *
 * Next provider: GoogleSheetsNotificationManagementRepository — replace this class in
 * bootstrap.ts once the Google Sheets adapter credentials are available.
 */
export class LocalStorageNotificationManagementRepository implements INotificationManagementRepository {
  private readonly store    = new Map<string, NotificationRuleRecord>();
  private readonly keyIndex = new Map<string, string>();

  constructor() {
    this.hydrate();
  }

  // ── save ──────────────────────────────────────────────────────────────────

  save(rule: NotificationRuleRecord): NotificationRuleRecord {
    if (this.store.has(rule.id)) {
      throw new DuplicateEntityError(
        `Notification rule record '${rule.id}' already exists`,
        { id: rule.id },
      );
    }

    const key = compositeKey(rule.objectType, rule.ruleKey);
    if (this.keyIndex.has(key)) {
      throw new DuplicateEntityError(
        `Notification configuration '${rule.objectType}/${rule.ruleKey}' already exists`,
        { objectType: rule.objectType, ruleKey: rule.ruleKey },
      );
    }

    const frozen = Object.freeze({ ...rule, settings: Object.freeze({ ...rule.settings }) });
    this.store.set(rule.id, frozen);
    this.keyIndex.set(key, rule.id);
    this.persist();
    return frozen;
  }

  // ── update ────────────────────────────────────────────────────────────────

  update(rule: NotificationRuleRecord): NotificationRuleRecord {
    const existing = this.store.get(rule.id);
    if (existing === undefined) {
      throw new EntityNotFoundError(
        `Notification rule record '${rule.id}' not found`,
        { id: rule.id },
      );
    }

    if (existing.objectType !== rule.objectType || existing.ruleKey !== rule.ruleKey) {
      const oldKey = compositeKey(existing.objectType, existing.ruleKey);
      const newKey = compositeKey(rule.objectType, rule.ruleKey);

      if (this.keyIndex.has(newKey) && this.keyIndex.get(newKey) !== rule.id) {
        throw new DuplicateEntityError(
          `Notification configuration '${rule.objectType}/${rule.ruleKey}' already exists`,
          { objectType: rule.objectType, ruleKey: rule.ruleKey },
        );
      }

      this.keyIndex.delete(oldKey);
      this.keyIndex.set(newKey, rule.id);
    }

    const frozen = Object.freeze({ ...rule, settings: Object.freeze({ ...rule.settings }) });
    this.store.set(rule.id, frozen);
    this.persist();
    return frozen;
  }

  // ── findById ──────────────────────────────────────────────────────────────

  findById(id: NotificationRuleId): NotificationRuleRecord | null {
    return this.store.get(id) ?? null;
  }

  // ── findByKey ─────────────────────────────────────────────────────────────

  findByKey(objectType: NotificationObjectType, ruleKey: string): NotificationRuleRecord | null {
    const id = this.keyIndex.get(compositeKey(objectType, ruleKey));
    if (id === undefined) return null;
    return this.store.get(id) ?? null;
  }

  // ── list ──────────────────────────────────────────────────────────────────

  list(query?: NotificationRuleListQuery): NotificationRuleListResult {
    const offset = query?.offset ?? 0;
    const limit  = query?.limit  ?? DEFAULT_LIST_LIMIT;
    const matched: NotificationRuleRecord[] = [];

    for (const record of this.store.values()) {
      if (!this.matchesQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort(byCreatedAtAscending);

    return {
      rules: matched.slice(offset, offset + limit),
      total: matched.length,
      offset,
      limit,
    };
  }

  // ── count ─────────────────────────────────────────────────────────────────

  count(): number {
    return this.store.size;
  }

  // ── remove ────────────────────────────────────────────────────────────────

  remove(id: NotificationRuleId): boolean {
    const existing = this.store.get(id);
    if (existing === undefined) return false;

    this.keyIndex.delete(compositeKey(existing.objectType, existing.ruleKey));
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

      const records = JSON.parse(raw) as NotificationRuleRecord[];
      if (!Array.isArray(records)) return;

      for (const record of records) {
        if (!record || typeof record.id !== 'string' || typeof record.ruleKey !== 'string') {
          continue;
        }
        const frozen = Object.freeze({ ...record, settings: Object.freeze({ ...record.settings }) });
        this.store.set(record.id, frozen);
        this.keyIndex.set(compositeKey(record.objectType, record.ruleKey), record.id);
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

  private matchesQuery(record: NotificationRuleRecord, query?: NotificationRuleListQuery): boolean {
    if (query === undefined) return true;

    if (query.objectType !== undefined && record.objectType !== query.objectType) {
      return false;
    }

    if (query.status !== undefined && record.status !== query.status) {
      return false;
    }

    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle = query.searchText.toLowerCase();
      const inName = record.name.toLowerCase().includes(needle);
      const inKey  = record.ruleKey.toLowerCase().includes(needle);
      const inDesc = (record.description ?? '').toLowerCase().includes(needle);
      if (!inName && !inKey && !inDesc) return false;
    }

    return true;
  }
}

// ── Sorting helper ────────────────────────────────────────────────────────────

function byCreatedAtAscending(a: NotificationRuleRecord, b: NotificationRuleRecord): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}
