// platform/services/src/contractor/contractor-service.ts
// ContractorService — the authoritative Contractor Management domain service.
//
// Responsibilities:
//   - Full contractor lifecycle: create, update, activate, deactivate, archive, restore.
//   - Audit trail: every mutation records an AuditEntry via IAuditService.
//   - Domain events: every mutation publishes an event via IEventBus.
//     (NullEventBus is a no-op in Phase 1; real delivery arrives in Phase 9.)
//
// Non-responsibilities:
//   - Authentication — delegated to the identity provider
//   - Permission enforcement — delegated to IPermissionService (future milestone)
//   - Durable persistence — InMemoryContractorRepository is the current backing store
//
// Service id: platform.contractors

import type { IEventBus } from '@acc-reliability/kernel';

import type { ContractorId } from '../auth/auth-types';
import type { IAuditService, AuditActor } from '../audit/audit-types';
import { createCorrelationId } from '../contracts/correlation';
import {
  ContractorNotFoundError,
  ContractorDuplicateError,
  ContractorLifecycleError,
} from '../errors';

import { generateContractorRecordId } from './contractor-types';
import type {
  ContractorRecord,
  ContractorRecordId,
  ContractorStatus,
  ActorRef,
  CreateContractorRequest,
  UpdateContractorRequest,
  ContractorListQuery,
  ContractorListResult,
  IContractorRepository,
  IContractorService,
  EquipmentScope,
} from './contractor-types';

import {
  CONTRACTOR_CREATED_TOKEN,
  CONTRACTOR_UPDATED_TOKEN,
  CONTRACTOR_ARCHIVED_TOKEN,
  CONTRACTOR_RESTORED_TOKEN,
  CONTRACTOR_ACTIVATED_TOKEN,
  CONTRACTOR_DEACTIVATED_TOKEN,
} from './contractor-event-tokens';

// ── ContractorService ─────────────────────────────────────────────────────────

/**
 * Concrete implementation of the platform Contractor Management Service.
 *
 * Constructor dependencies:
 * ```ts
 * const contractors = new ContractorService(repository, auditService, eventBus);
 * ```
 *
 * All mutating methods:
 *  1. Validate pre-conditions and throw typed errors on failure.
 *  2. Produce an updated `ContractorRecord` (immutable — never mutate in place).
 *  3. Persist via the repository.
 *  4. Write an audit entry (never throws — errors absorbed by AuditService).
 *  5. Publish a domain event (no-op while `NullEventBus` is active).
 */
export class ContractorService implements IContractorService {
  constructor(
    private readonly repository: IContractorRepository,
    private readonly auditService: IAuditService,
    private readonly eventBus: IEventBus,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  create(request: CreateContractorRequest, actor: ActorRef): ContractorRecord {
    const existing = this.repository.findByCode(request.contractorCode);
    if (existing !== null) {
      throw new ContractorDuplicateError(request.contractorCode);
    }

    const now = new Date().toISOString();
    const id  = request.id ?? generateContractorRecordId();

    const defaultScope: EquipmentScope = Object.freeze({ categories: Object.freeze([]) });

    const record: ContractorRecord = Object.freeze({
      id,
      contractorCode:  request.contractorCode,
      name:            request.name,
      shortName:       request.shortName,
      status:          'active' as ContractorStatus,
      email:           request.email,
      ...(request.phone         !== undefined ? { phone:         request.phone         } : {}),
      ...(request.contactPerson !== undefined ? { contactPerson: request.contactPerson } : {}),
      areasOwned:     Object.freeze(request.areasOwned ?? []),
      equipmentScope: Object.freeze(request.equipmentScope ?? defaultScope),
      createdAt:      now,
      createdBy:      actor.userId,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.save(record);

    this.recordAudit(actor, 'create', 'success', saved.id, {
      description: `Contractor '${saved.name}' (${saved.contractorCode}) created`,
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(CONTRACTOR_CREATED_TOKEN, {
      id:             saved.id,
      contractorCode: saved.contractorCode,
      name:           saved.name,
      shortName:      saved.shortName,
      email:          saved.email,
      createdBy:      actor.userId,
      createdAt:      now,
    });

    return saved;
  }

  findById(id: ContractorRecordId): ContractorRecord | null {
    return this.repository.findById(id);
  }

  findByCode(contractorCode: ContractorId): ContractorRecord | null {
    return this.repository.findByCode(contractorCode);
  }

  list(query?: ContractorListQuery): ContractorListResult {
    return this.repository.list(query);
  }

  update(id: ContractorRecordId, request: UpdateContractorRequest, actor: ActorRef): ContractorRecord {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString();
    const changedFields: string[] = [];

    let updated: ContractorRecord = existing;

    if (request.name !== undefined && request.name !== existing.name) {
      changedFields.push('name');
      updated = { ...updated, name: request.name };
    }
    if (request.shortName !== undefined && request.shortName !== existing.shortName) {
      changedFields.push('shortName');
      updated = { ...updated, shortName: request.shortName };
    }
    if (request.email !== undefined && request.email !== existing.email) {
      changedFields.push('email');
      updated = { ...updated, email: request.email };
    }
    if (request.phone !== undefined && request.phone !== existing.phone) {
      changedFields.push('phone');
      updated = { ...updated, phone: request.phone };
    }
    if (request.contactPerson !== undefined && request.contactPerson !== existing.contactPerson) {
      changedFields.push('contactPerson');
      updated = { ...updated, contactPerson: request.contactPerson };
    }
    if (request.areasOwned !== undefined) {
      changedFields.push('areasOwned');
      updated = { ...updated, areasOwned: Object.freeze([...request.areasOwned]) };
    }
    if (request.equipmentScope !== undefined) {
      changedFields.push('equipmentScope');
      updated = { ...updated, equipmentScope: Object.freeze(request.equipmentScope) };
    }

    if (changedFields.length === 0) {
      return existing;
    }

    updated = Object.freeze({ ...updated, updatedAt: now, updatedBy: actor.userId });
    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description:   `Contractor '${saved.name}' (${saved.contractorCode}) updated (${changedFields.join(', ')})`,
      beforeValue:   this.sanitize(existing),
      afterValue:    this.sanitize(saved),
    });

    this.eventBus.publish(CONTRACTOR_UPDATED_TOKEN, {
      id:             saved.id,
      contractorCode: saved.contractorCode,
      changedFields,
      updatedBy:      actor.userId,
      updatedAt:      now,
    });

    return saved;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  archive(id: ContractorRecordId, reason: string, actor: ActorRef): ContractorRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'archived') {
      throw new ContractorLifecycleError(id, existing.status, 'archive');
    }

    const now = new Date().toISOString();
    const updated: ContractorRecord = Object.freeze({
      ...existing,
      status:         'archived' as ContractorStatus,
      archivedAt:     now,
      archivedBy:     actor.userId,
      archivedReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Contractor '${saved.name}' (${saved.contractorCode}) archived. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(CONTRACTOR_ARCHIVED_TOKEN, {
      id:             saved.id,
      contractorCode: saved.contractorCode,
      archivedBy:     actor.userId,
      archivedAt:     now,
      reason,
    });

    return saved;
  }

  restore(id: ContractorRecordId, actor: ActorRef): ContractorRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'archived') {
      throw new ContractorLifecycleError(id, existing.status, 'restore');
    }

    const now = new Date().toISOString();
    const updated: ContractorRecord = Object.freeze({
      ...existing,
      status:     'active' as ContractorStatus,
      restoredAt: now,
      restoredBy: actor.userId,
      updatedAt:  now,
      updatedBy:  actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Contractor '${saved.name}' (${saved.contractorCode}) restored to active`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(CONTRACTOR_RESTORED_TOKEN, {
      id:             saved.id,
      contractorCode: saved.contractorCode,
      restoredBy:     actor.userId,
      restoredAt:     now,
    });

    return saved;
  }

  activate(id: ContractorRecordId, actor: ActorRef): ContractorRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'inactive') {
      throw new ContractorLifecycleError(id, existing.status, 'activate');
    }

    const now = new Date().toISOString();
    const updated: ContractorRecord = Object.freeze({
      ...existing,
      status:      'active' as ContractorStatus,
      activatedAt: now,
      activatedBy: actor.userId,
      updatedAt:   now,
      updatedBy:   actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Contractor '${saved.name}' (${saved.contractorCode}) activated`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(CONTRACTOR_ACTIVATED_TOKEN, {
      id:             saved.id,
      contractorCode: saved.contractorCode,
      activatedBy:    actor.userId,
      activatedAt:    now,
    });

    return saved;
  }

  deactivate(id: ContractorRecordId, reason: string, actor: ActorRef): ContractorRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'archived') {
      throw new ContractorLifecycleError(id, existing.status, 'deactivate');
    }
    if (existing.status === 'inactive') {
      throw new ContractorLifecycleError(id, existing.status, 'deactivate');
    }

    const now = new Date().toISOString();
    const updated: ContractorRecord = Object.freeze({
      ...existing,
      status:           'inactive' as ContractorStatus,
      deactivatedAt:    now,
      deactivatedBy:    actor.userId,
      deactivatedReason: reason,
      updatedAt:        now,
      updatedBy:        actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `Contractor '${saved.name}' (${saved.contractorCode}) deactivated. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(CONTRACTOR_DEACTIVATED_TOKEN, {
      id:             saved.id,
      contractorCode: saved.contractorCode,
      deactivatedBy:  actor.userId,
      deactivatedAt:  now,
      reason,
    });

    return saved;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private getOrThrow(id: ContractorRecordId): ContractorRecord {
    const record = this.repository.findById(id);
    if (record === null) {
      throw new ContractorNotFoundError(id);
    }
    return record;
  }

  private recordAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    entityId: ContractorRecordId,
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
        entityType: 'Contractor',
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
    return createCorrelationId(`ctr-op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  }

  private sanitize(record: ContractorRecord): Record<string, unknown> {
    return {
      id:             record.id,
      contractorCode: record.contractorCode,
      name:           record.name,
      shortName:      record.shortName,
      status:         record.status,
      email:          record.email,
    };
  }
}
