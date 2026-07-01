// platform/sdk/src/impl/local-storage-workflow-repository.ts
// localStorage-backed implementation of IWorkflowRepository.
//
// Responsibilities:
//   - Persist all WorkflowDefinitionRecord state to browser localStorage so
//     workflow definition creation, editing, publishing, and archival survive
//     page refresh.
//   - WorkflowInstanceRecord state is kept in-memory only — instances are
//     runtime data and not considered configuration.
//   - Mirror the same Map-based index structure used by InMemoryWorkflowRepository
//     so the interface contract is identical.
//   - Gracefully degrade when localStorage is unavailable (quota exceeded,
//     private mode, SSR) — operations continue in-memory only.
//
// Storage key: platform.workflows.definitions
//   Value: JSON array of WorkflowDefinitionRecord objects.
//
// This is a temporary persistence layer bridging Phase 1 (in-memory) and the
// planned Google Sheets provider (GoogleSheetsWorkflowRepository — future sprint).
// The IWorkflowRepository interface is unchanged; swapping providers requires
// only a bootstrap.ts change.

import { DuplicateEntityError, EntityNotFoundError } from '@acc-reliability/services';
import type {
  WorkflowDefinitionRecord,
  WorkflowDefinitionId,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionListResult,
  WorkflowInstanceRecord,
  WorkflowInstanceId,
  WorkflowInstanceListQuery,
  WorkflowInstanceListResult,
  IWorkflowRepository,
} from '@acc-reliability/services';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY        = 'platform.workflows.definitions';
const DEFAULT_LIST_LIMIT = 50;

// ── Freeze helpers ────────────────────────────────────────────────────────────

function freezeDefinition(def: WorkflowDefinitionRecord): WorkflowDefinitionRecord {
  return Object.freeze({
    ...def,
    steps:           Object.freeze(def.steps.map((s) => Object.freeze({ ...s }))),
    approvalRules:   Object.freeze(def.approvalRules.map((r) => Object.freeze({ ...r, approverRoles: Object.freeze([...r.approverRoles]) }))),
    escalationRules: Object.freeze(def.escalationRules.map((r) => Object.freeze({ ...r, escalateToRoles: Object.freeze([...r.escalateToRoles]) }))),
    slaRules:        Object.freeze(def.slaRules.map((r) => Object.freeze({ ...r }))),
    conditionRules:  Object.freeze(def.conditionRules.map((r) => Object.freeze({ ...r }))),
    versions:        Object.freeze(def.versions.map((v) => Object.freeze({
      ...v,
      steps:           Object.freeze(v.steps.map((s) => Object.freeze({ ...s }))),
      approvalRules:   Object.freeze(v.approvalRules.map((r) => Object.freeze({ ...r, approverRoles: Object.freeze([...r.approverRoles]) }))),
      escalationRules: Object.freeze(v.escalationRules.map((r) => Object.freeze({ ...r, escalateToRoles: Object.freeze([...r.escalateToRoles]) }))),
      slaRules:        Object.freeze(v.slaRules.map((r) => Object.freeze({ ...r }))),
      conditionRules:  Object.freeze(v.conditionRules.map((r) => Object.freeze({ ...r }))),
    }))),
  });
}

function freezeInstance(inst: WorkflowInstanceRecord): WorkflowInstanceRecord {
  return Object.freeze({
    ...inst,
    stepStates: Object.freeze(inst.stepStates.map((s) => Object.freeze({ ...s }))),
  });
}

// ── LocalStorageWorkflowRepository ───────────────────────────────────────────

/**
 * localStorage-backed implementation of the workflow repository.
 *
 * Storage format:
 *  - Definitions: `Map<id, WorkflowDefinitionRecord>` (in-memory, rebuilt from localStorage on init).
 *  - Key index:   `Map<workflowKey.toLowerCase(), id>` for O(1) lookup.
 *  - Instances:   `Map<id, WorkflowInstanceRecord>` — in-memory only (runtime state).
 *  - Persistence: localStorage JSON array of definitions, written through on every mutation.
 *
 * All stored records are frozen with `Object.freeze` at write time (same as
 * InMemoryWorkflowRepository).
 *
 * Next provider: GoogleSheetsWorkflowRepository — replace this class in
 * bootstrap.ts once the Google Sheets adapter credentials are available.
 */
export class LocalStorageWorkflowRepository implements IWorkflowRepository {
  private readonly definitions = new Map<string, WorkflowDefinitionRecord>();
  private readonly keyIndex    = new Map<string, string>();
  private readonly instances   = new Map<string, WorkflowInstanceRecord>();

  constructor() {
    this.hydrate();
  }

  // ── saveDefinition ────────────────────────────────────────────────────────

  saveDefinition(definition: WorkflowDefinitionRecord): WorkflowDefinitionRecord {
    if (this.definitions.has(definition.id)) {
      throw new DuplicateEntityError(
        `Workflow definition '${definition.id}' already exists`,
        { id: definition.id },
      );
    }

    const key = definition.workflowKey.toLowerCase();
    if (this.keyIndex.has(key)) {
      throw new DuplicateEntityError(
        `Workflow definition with key '${definition.workflowKey}' already exists`,
        { workflowKey: definition.workflowKey },
      );
    }

    const frozen = freezeDefinition(definition);
    this.definitions.set(definition.id, frozen);
    this.keyIndex.set(key, definition.id);
    this.persist();
    return frozen;
  }

  // ── updateDefinition ──────────────────────────────────────────────────────

  updateDefinition(definition: WorkflowDefinitionRecord): WorkflowDefinitionRecord {
    const existing = this.definitions.get(definition.id);
    if (existing === undefined) {
      throw new EntityNotFoundError(
        `Workflow definition '${definition.id}' not found`,
        { id: definition.id },
      );
    }

    if (existing.workflowKey !== definition.workflowKey) {
      const oldKey = existing.workflowKey.toLowerCase();
      const newKey = definition.workflowKey.toLowerCase();

      if (this.keyIndex.has(newKey) && this.keyIndex.get(newKey) !== definition.id) {
        throw new DuplicateEntityError(
          `Workflow definition with key '${definition.workflowKey}' already exists`,
          { workflowKey: definition.workflowKey },
        );
      }

      this.keyIndex.delete(oldKey);
      this.keyIndex.set(newKey, definition.id);
    }

    const frozen = freezeDefinition(definition);
    this.definitions.set(definition.id, frozen);
    this.persist();
    return frozen;
  }

  // ── findDefinitionById ────────────────────────────────────────────────────

  findDefinitionById(id: WorkflowDefinitionId): WorkflowDefinitionRecord | null {
    return this.definitions.get(id) ?? null;
  }

  // ── findDefinitionByKey ───────────────────────────────────────────────────

  findDefinitionByKey(workflowKey: string): WorkflowDefinitionRecord | null {
    const id = this.keyIndex.get(workflowKey.toLowerCase());
    if (id === undefined) return null;
    return this.definitions.get(id) ?? null;
  }

  // ── listDefinitions ───────────────────────────────────────────────────────

  listDefinitions(query?: WorkflowDefinitionListQuery): WorkflowDefinitionListResult {
    const offset = query?.offset ?? 0;
    const limit  = query?.limit  ?? DEFAULT_LIST_LIMIT;
    const matched: WorkflowDefinitionRecord[] = [];

    for (const record of this.definitions.values()) {
      if (!this.matchesDefinitionQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort(byUpdatedAtDescending);

    return {
      definitions: matched.slice(offset, offset + limit),
      total:       matched.length,
      offset,
      limit,
    };
  }

  // ── saveInstance ──────────────────────────────────────────────────────────

  saveInstance(instance: WorkflowInstanceRecord): WorkflowInstanceRecord {
    if (this.instances.has(instance.id)) {
      throw new DuplicateEntityError(
        `Workflow instance '${instance.id}' already exists`,
        { id: instance.id },
      );
    }

    const frozen = freezeInstance(instance);
    this.instances.set(instance.id, frozen);
    return frozen;
  }

  // ── updateInstance ────────────────────────────────────────────────────────

  updateInstance(instance: WorkflowInstanceRecord): WorkflowInstanceRecord {
    if (!this.instances.has(instance.id)) {
      throw new EntityNotFoundError(
        `Workflow instance '${instance.id}' not found`,
        { id: instance.id },
      );
    }

    const frozen = freezeInstance(instance);
    this.instances.set(instance.id, frozen);
    return frozen;
  }

  // ── findInstanceById ──────────────────────────────────────────────────────

  findInstanceById(id: WorkflowInstanceId): WorkflowInstanceRecord | null {
    return this.instances.get(id) ?? null;
  }

  // ── listInstances ─────────────────────────────────────────────────────────

  listInstances(query?: WorkflowInstanceListQuery): WorkflowInstanceListResult {
    const offset = query?.offset ?? 0;
    const limit  = query?.limit  ?? DEFAULT_LIST_LIMIT;
    const matched: WorkflowInstanceRecord[] = [];

    for (const record of this.instances.values()) {
      if (!this.matchesInstanceQuery(record, query)) continue;
      matched.push(record);
    }

    matched.sort(byStartedAtDescending);

    return {
      instances: matched.slice(offset, offset + limit),
      total:     matched.length,
      offset,
      limit,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Reads the persisted JSON array of workflow definitions from localStorage
   * and populates the in-memory Maps.  Called once in the constructor.
   *
   * Silently ignores malformed JSON or localStorage access errors so the
   * application still starts cleanly in private mode or when storage is full.
   */
  private hydrate(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return;

      const records = JSON.parse(raw) as WorkflowDefinitionRecord[];
      if (!Array.isArray(records)) return;

      for (const record of records) {
        if (!record || typeof record.id !== 'string' || typeof record.workflowKey !== 'string') {
          continue;
        }
        const frozen = freezeDefinition(record);
        this.definitions.set(record.id, frozen);
        this.keyIndex.set(record.workflowKey.toLowerCase(), record.id);
      }
    } catch {
      // localStorage unavailable or corrupted — start empty, seed will populate.
    }
  }

  /**
   * Serialises the current definitions store to localStorage.
   * Instances are not persisted (runtime state only).
   * Silently ignores write failures (quota exceeded, private mode).
   */
  private persist(): void {
    try {
      const records = Array.from(this.definitions.values());
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Quota exceeded or access blocked — state is still correct in-memory.
    }
  }

  private matchesDefinitionQuery(record: WorkflowDefinitionRecord, query?: WorkflowDefinitionListQuery): boolean {
    if (query === undefined) return true;

    if (query.status !== undefined && record.status !== query.status) return false;
    if (query.workflowType !== undefined && record.workflowType !== query.workflowType) return false;

    if (query.searchText !== undefined && query.searchText.trim().length > 0) {
      const needle = query.searchText.toLowerCase();
      const inName = record.name.toLowerCase().includes(needle);
      const inKey  = record.workflowKey.toLowerCase().includes(needle);
      const inDesc = (record.description ?? '').toLowerCase().includes(needle);
      if (!inName && !inKey && !inDesc) return false;
    }

    return true;
  }

  private matchesInstanceQuery(record: WorkflowInstanceRecord, query?: WorkflowInstanceListQuery): boolean {
    if (query === undefined) return true;

    if (query.definitionId !== undefined && record.definitionId !== query.definitionId) return false;
    if (query.status !== undefined && record.status !== query.status) return false;

    return true;
  }
}

// ── Sorting helpers ───────────────────────────────────────────────────────────

function byUpdatedAtDescending(a: WorkflowDefinitionRecord, b: WorkflowDefinitionRecord): number {
  if (a.updatedAt > b.updatedAt) return -1;
  if (a.updatedAt < b.updatedAt) return 1;
  return 0;
}

function byStartedAtDescending(a: WorkflowInstanceRecord, b: WorkflowInstanceRecord): number {
  if (a.startedAt > b.startedAt) return -1;
  if (a.startedAt < b.startedAt) return 1;
  return 0;
}
