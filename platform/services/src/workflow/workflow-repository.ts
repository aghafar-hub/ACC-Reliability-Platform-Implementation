// platform/services/src/workflow/workflow-repository.ts
// In-memory implementation of IWorkflowRepository.

import { DuplicateEntityError, EntityNotFoundError } from '../errors';
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
} from './workflow-types';

const DEFAULT_LIST_LIMIT = 50;

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

export class InMemoryWorkflowRepository implements IWorkflowRepository {
  private readonly definitions = new Map<string, WorkflowDefinitionRecord>();
  private readonly keyIndex    = new Map<string, string>();
  private readonly instances   = new Map<string, WorkflowInstanceRecord>();

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
    return frozen;
  }

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
    return frozen;
  }

  findDefinitionById(id: WorkflowDefinitionId): WorkflowDefinitionRecord | null {
    return this.definitions.get(id) ?? null;
  }

  findDefinitionByKey(workflowKey: string): WorkflowDefinitionRecord | null {
    const id = this.keyIndex.get(workflowKey.toLowerCase());
    if (id === undefined) return null;
    return this.definitions.get(id) ?? null;
  }

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
      total: matched.length,
      offset,
      limit,
    };
  }

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

  findInstanceById(id: WorkflowInstanceId): WorkflowInstanceRecord | null {
    return this.instances.get(id) ?? null;
  }

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
      total: matched.length,
      offset,
      limit,
    };
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
