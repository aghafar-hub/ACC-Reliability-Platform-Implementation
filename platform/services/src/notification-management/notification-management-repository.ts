// platform/services/src/notification-management/notification-management-repository.ts
// In-memory implementation of INotificationManagementRepository.

import { DuplicateEntityError, EntityNotFoundError } from '../errors';
import type {
  NotificationRuleRecord,
  NotificationRuleId,
  NotificationObjectType,
  NotificationRuleListQuery,
  NotificationRuleListResult,
  INotificationManagementRepository,
} from './notification-management-types';

const DEFAULT_LIST_LIMIT = 50;

function compositeKey(objectType: NotificationObjectType, ruleKey: string): string {
  return `${objectType}::${ruleKey.toLowerCase()}`;
}

export class InMemoryNotificationManagementRepository implements INotificationManagementRepository {
  private readonly store    = new Map<string, NotificationRuleRecord>();
  private readonly keyIndex = new Map<string, string>();

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
    return frozen;
  }

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
    return frozen;
  }

  findById(id: NotificationRuleId): NotificationRuleRecord | null {
    return this.store.get(id) ?? null;
  }

  findByKey(objectType: NotificationObjectType, ruleKey: string): NotificationRuleRecord | null {
    const id = this.keyIndex.get(compositeKey(objectType, ruleKey));
    if (id === undefined) return null;
    return this.store.get(id) ?? null;
  }

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

  count(): number {
    return this.store.size;
  }

  remove(id: NotificationRuleId): boolean {
    const existing = this.store.get(id);
    if (existing === undefined) return false;

    this.keyIndex.delete(compositeKey(existing.objectType, existing.ruleKey));
    this.store.delete(id);
    return true;
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

function byCreatedAtAscending(a: NotificationRuleRecord, b: NotificationRuleRecord): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}
