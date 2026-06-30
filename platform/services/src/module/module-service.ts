// platform/services/src/module/module-service.ts
// ModuleService — the authoritative Module Registry domain service.
//
// Responsibilities:
//   - Full module lifecycle: register, update, enable, disable,
//     startMaintenance, endMaintenance, retire, restore.
//   - Audit trail: every mutation records an AuditEntry via IAuditService.
//   - Domain events: every mutation publishes an event via IEventBus.
//     (NullEventBus is a no-op in Phase 1; real delivery arrives in Phase 9.)
//
// Non-responsibilities:
//   - Authentication — delegated to the identity provider
//   - Permission enforcement — delegated to IPermissionService (future milestone)
//   - Durable persistence — InMemoryModuleRepository is the current backing store
//
// Service id: platform.modules

import type { IEventBus } from '@acc-reliability/kernel';

import type { IAuditService, AuditActor } from '../audit/audit-types';
import { createCorrelationId } from '../contracts/correlation';
import {
  ModuleNotFoundError,
  ModuleDuplicateError,
  ModuleLifecycleError,
} from '../errors';

import { generateModuleRecordId } from './module-types';
import type {
  ModuleRecord,
  ModuleRecordId,
  ModuleStatus,
  ActorRef,
  RegisterModuleRequest,
  UpdateModuleRequest,
  ModuleListQuery,
  ModuleListResult,
  IModuleRepository,
  IModuleService,
  ModuleHealthStatus,
  ModuleConfigStatus,
  ModuleLocalizationStatus,
  ModuleLearningStatus,
  ModuleSearchStatus,
  ModuleVisibility,
} from './module-types';

import {
  MODULE_REGISTERED_TOKEN,
  MODULE_UPDATED_TOKEN,
  MODULE_ENABLED_TOKEN,
  MODULE_DISABLED_TOKEN,
  MODULE_MAINTENANCE_STARTED_TOKEN,
  MODULE_MAINTENANCE_ENDED_TOKEN,
  MODULE_RETIRED_TOKEN,
  MODULE_RESTORED_TOKEN,
} from './module-event-tokens';

// ── ModuleService ─────────────────────────────────────────────────────────────

/**
 * Concrete implementation of the platform Module Registry Service.
 *
 * Constructor dependencies:
 * ```ts
 * const modules = new ModuleService(repository, auditService, eventBus);
 * ```
 *
 * All mutating methods:
 *  1. Validate pre-conditions and throw typed errors on failure.
 *  2. Produce an updated `ModuleRecord` (immutable — never mutate in place).
 *  3. Persist via the repository.
 *  4. Write an audit entry (never throws — errors absorbed by AuditService).
 *  5. Publish a domain event (no-op while `NullEventBus` is active).
 */
export class ModuleService implements IModuleService {
  constructor(
    private readonly repository: IModuleRepository,
    private readonly auditService: IAuditService,
    private readonly eventBus: IEventBus,
  ) {}

  // ── Registration & CRUD ───────────────────────────────────────────────────

  register(request: RegisterModuleRequest, actor: ActorRef): ModuleRecord {
    const existing = this.repository.findByKey(request.moduleKey);
    if (existing !== null) {
      throw new ModuleDuplicateError(request.moduleKey);
    }

    const now = new Date().toISOString();
    const id  = request.id ?? generateModuleRecordId();

    const record: ModuleRecord = Object.freeze({
      id,
      moduleKey:           request.moduleKey,
      name:                request.name,
      version:             request.version,
      category:            request.category,
      status:              'enabled' as ModuleStatus,
      healthStatus:        request.healthStatus        ?? ('unknown'       as ModuleHealthStatus),
      configStatus:        request.configStatus        ?? ('unconfigured'  as ModuleConfigStatus),
      localizationStatus:  request.localizationStatus  ?? ('none'          as ModuleLocalizationStatus),
      learningStatus:      request.learningStatus      ?? ('none'          as ModuleLearningStatus),
      searchStatus:        request.searchStatus        ?? ('none'          as ModuleSearchStatus),
      visibility:          request.visibility          ?? ('visible'       as ModuleVisibility),
      maintenanceMode:     false,
      dependencies:        Object.freeze(request.dependencies ?? []),
      installedDate:       now,
      createdAt:           now,
      createdBy:           actor.userId,
      updatedAt:           now,
      updatedBy:           actor.userId,
      enabledAt:           now,
      enabledBy:           actor.userId,
    });

    const saved = this.repository.save(record);

    this.recordAudit(actor, 'create', 'success', saved.id, {
      description: `Module '${saved.name}' (${saved.moduleKey}) registered`,
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(MODULE_REGISTERED_TOKEN, {
      id:         saved.id,
      moduleKey:  saved.moduleKey,
      name:       saved.name,
      version:    saved.version,
      category:   saved.category,
      registeredBy: actor.userId,
      registeredAt: now,
    });

    return saved;
  }

  findById(id: ModuleRecordId): ModuleRecord | null {
    return this.repository.findById(id);
  }

  findByKey(moduleKey: string): ModuleRecord | null {
    return this.repository.findByKey(moduleKey);
  }

  list(query?: ModuleListQuery): ModuleListResult {
    return this.repository.list(query);
  }

  update(id: ModuleRecordId, request: UpdateModuleRequest, actor: ActorRef): ModuleRecord {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString();
    const changedFields: string[] = [];

    let updated: ModuleRecord = existing;

    if (request.name !== undefined && request.name !== existing.name) {
      changedFields.push('name');
      updated = { ...updated, name: request.name };
    }
    if (request.version !== undefined && request.version !== existing.version) {
      changedFields.push('version');
      updated = { ...updated, version: request.version };
    }
    if (request.category !== undefined && request.category !== existing.category) {
      changedFields.push('category');
      updated = { ...updated, category: request.category };
    }
    if (request.healthStatus !== undefined && request.healthStatus !== existing.healthStatus) {
      changedFields.push('healthStatus');
      updated = { ...updated, healthStatus: request.healthStatus };
    }
    if (request.configStatus !== undefined && request.configStatus !== existing.configStatus) {
      changedFields.push('configStatus');
      updated = { ...updated, configStatus: request.configStatus };
    }
    if (request.localizationStatus !== undefined && request.localizationStatus !== existing.localizationStatus) {
      changedFields.push('localizationStatus');
      updated = { ...updated, localizationStatus: request.localizationStatus };
    }
    if (request.learningStatus !== undefined && request.learningStatus !== existing.learningStatus) {
      changedFields.push('learningStatus');
      updated = { ...updated, learningStatus: request.learningStatus };
    }
    if (request.searchStatus !== undefined && request.searchStatus !== existing.searchStatus) {
      changedFields.push('searchStatus');
      updated = { ...updated, searchStatus: request.searchStatus };
    }
    if (request.visibility !== undefined && request.visibility !== existing.visibility) {
      changedFields.push('visibility');
      updated = { ...updated, visibility: request.visibility };
    }
    if (request.dependencies !== undefined) {
      changedFields.push('dependencies');
      updated = { ...updated, dependencies: Object.freeze([...request.dependencies]) };
    }

    if (changedFields.length === 0) {
      return existing;
    }

    updated = Object.freeze({ ...updated, updatedAt: now, updatedBy: actor.userId });
    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description:   `Module '${saved.name}' (${saved.moduleKey}) updated (${changedFields.join(', ')})`,
      beforeValue:   this.sanitize(existing),
      afterValue:    this.sanitize(saved),
    });

    this.eventBus.publish(MODULE_UPDATED_TOKEN, {
      id:           saved.id,
      moduleKey:    saved.moduleKey,
      changedFields,
      updatedBy:    actor.userId,
      updatedAt:    now,
    });

    return saved;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  enable(id: ModuleRecordId, actor: ActorRef): ModuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'disabled') {
      throw new ModuleLifecycleError(id, existing.status, 'enable');
    }

    const now = new Date().toISOString();
    const updated: ModuleRecord = Object.freeze({
      ...existing,
      status:    'enabled' as ModuleStatus,
      enabledAt: now,
      enabledBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Module '${saved.name}' (${saved.moduleKey}) enabled`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(MODULE_ENABLED_TOKEN, {
      id:        saved.id,
      moduleKey: saved.moduleKey,
      enabledBy: actor.userId,
      enabledAt: now,
    });

    return saved;
  }

  disable(id: ModuleRecordId, reason: string, actor: ActorRef): ModuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'retired') {
      throw new ModuleLifecycleError(id, existing.status, 'disable');
    }
    if (existing.status === 'disabled') {
      throw new ModuleLifecycleError(id, existing.status, 'disable');
    }

    const now = new Date().toISOString();
    const updated: ModuleRecord = Object.freeze({
      ...existing,
      status:         'disabled' as ModuleStatus,
      disabledAt:     now,
      disabledBy:     actor.userId,
      disabledReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Module '${saved.name}' (${saved.moduleKey}) disabled. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(MODULE_DISABLED_TOKEN, {
      id:         saved.id,
      moduleKey:  saved.moduleKey,
      disabledBy: actor.userId,
      disabledAt: now,
      reason,
    });

    return saved;
  }

  startMaintenance(id: ModuleRecordId, actor: ActorRef): ModuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'enabled') {
      throw new ModuleLifecycleError(id, existing.status, 'startMaintenance');
    }

    const now = new Date().toISOString();
    const updated: ModuleRecord = Object.freeze({
      ...existing,
      status:                'maintenance' as ModuleStatus,
      maintenanceMode:       true,
      maintenanceStartedAt:  now,
      maintenanceStartedBy:  actor.userId,
      updatedAt:             now,
      updatedBy:             actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Module '${saved.name}' (${saved.moduleKey}) entered maintenance mode`,
      severity:    'medium',
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(MODULE_MAINTENANCE_STARTED_TOKEN, {
      id:                   saved.id,
      moduleKey:            saved.moduleKey,
      maintenanceStartedBy: actor.userId,
      maintenanceStartedAt: now,
    });

    return saved;
  }

  endMaintenance(id: ModuleRecordId, actor: ActorRef): ModuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'maintenance') {
      throw new ModuleLifecycleError(id, existing.status, 'endMaintenance');
    }

    const now = new Date().toISOString();
    const updated: ModuleRecord = Object.freeze({
      ...existing,
      status:              'enabled' as ModuleStatus,
      maintenanceMode:     false,
      maintenanceEndedAt:  now,
      maintenanceEndedBy:  actor.userId,
      updatedAt:           now,
      updatedBy:           actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Module '${saved.name}' (${saved.moduleKey}) exited maintenance mode`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(MODULE_MAINTENANCE_ENDED_TOKEN, {
      id:                 saved.id,
      moduleKey:          saved.moduleKey,
      maintenanceEndedBy: actor.userId,
      maintenanceEndedAt: now,
    });

    return saved;
  }

  retire(id: ModuleRecordId, reason: string, actor: ActorRef): ModuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'retired') {
      throw new ModuleLifecycleError(id, existing.status, 'retire');
    }

    const now = new Date().toISOString();
    const updated: ModuleRecord = Object.freeze({
      ...existing,
      status:        'retired' as ModuleStatus,
      retiredAt:     now,
      retiredBy:     actor.userId,
      retiredReason: reason,
      updatedAt:     now,
      updatedBy:     actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Module '${saved.name}' (${saved.moduleKey}) retired. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(MODULE_RETIRED_TOKEN, {
      id:        saved.id,
      moduleKey: saved.moduleKey,
      retiredBy: actor.userId,
      retiredAt: now,
      reason,
    });

    return saved;
  }

  restore(id: ModuleRecordId, actor: ActorRef): ModuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'retired') {
      throw new ModuleLifecycleError(id, existing.status, 'restore');
    }

    const now = new Date().toISOString();
    const updated: ModuleRecord = Object.freeze({
      ...existing,
      status:     'enabled' as ModuleStatus,
      restoredAt: now,
      restoredBy: actor.userId,
      updatedAt:  now,
      updatedBy:  actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Module '${saved.name}' (${saved.moduleKey}) restored to enabled`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(MODULE_RESTORED_TOKEN, {
      id:         saved.id,
      moduleKey:  saved.moduleKey,
      restoredBy: actor.userId,
      restoredAt: now,
    });

    return saved;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private getOrThrow(id: ModuleRecordId): ModuleRecord {
    const record = this.repository.findById(id);
    if (record === null) {
      throw new ModuleNotFoundError(id);
    }
    return record;
  }

  private recordAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    entityId: ModuleRecordId,
    opts: {
      description?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      reason?: string;
      beforeValue?: unknown;
      afterValue?: unknown;
    } = {},
  ): void {
    const auditActor: AuditActor = {
      userId:       actor.userId,
      contractorId: actor.contractorId,
    };

    this.auditService.record({
      category:  'data',
      action,
      outcome,
      actor:     auditActor,
      resource:  {
        module:     'owner-center',
        entityType: 'Module',
        entityId,
      },
      clientType: 'system',
      ...(opts.description !== undefined ? { description: opts.description } : {}),
      ...(opts.severity    !== undefined ? { severity:    opts.severity    } : {}),
      ...(opts.reason      !== undefined ? { reason:      opts.reason      } : {}),
      ...(opts.beforeValue !== undefined ? { beforeValue: opts.beforeValue } : {}),
      ...(opts.afterValue  !== undefined ? { afterValue:  opts.afterValue  } : {}),
      correlationId: this.newCorrelationId(),
    });
  }

  private newCorrelationId() {
    return createCorrelationId(`mod-op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  }

  private sanitize(record: ModuleRecord): Record<string, unknown> {
    return {
      id:        record.id,
      moduleKey: record.moduleKey,
      name:      record.name,
      version:   record.version,
      category:  record.category,
      status:    record.status,
    };
  }
}
