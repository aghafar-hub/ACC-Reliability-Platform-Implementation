// platform/services/src/equipment/equipment-service.ts
// EquipmentService — platform Equipment Master domain service.
// Service id: platform.equipment

import type { IEventBus } from '@acc-reliability/kernel';

import type { EquipmentId } from '../contracts/communication-types';
import type { IAuditService, AuditActor } from '../audit/audit-types';
import { createCorrelationId } from '../contracts/correlation';
import {
  EquipmentNotFoundError,
  EquipmentDuplicateError,
} from '../errors';

import type {
  EquipmentRecord,
  EquipmentStatus,
  ActorRef,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentListQuery,
  EquipmentListResult,
  IEquipmentRepository,
  IEquipmentService,
} from './equipment-types';

import { EQUIPMENT_UPDATED_TOKEN } from './equipment-event-tokens';

export class EquipmentService implements IEquipmentService {
  constructor(
    private readonly repository: IEquipmentRepository,
    private readonly auditService: IAuditService,
    private readonly eventBus: IEventBus,
  ) {}

  create(request: CreateEquipmentRequest, actor: ActorRef): EquipmentRecord {
    const existing = this.repository.findById(request.equipmentId);
    if (existing !== null) {
      throw new EquipmentDuplicateError(request.equipmentId);
    }

    const now = new Date().toISOString();
    const record: EquipmentRecord = Object.freeze({
      equipmentId: request.equipmentId,
      name: request.name,
      area: request.area,
      contractorId: request.contractorId,
      status: request.status ?? 'active',
      createdAt: now,
      createdBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.save(record);

    this.recordAudit(actor, 'create', 'success', saved.equipmentId, {
      description: `Equipment '${saved.name}' (${saved.equipmentId}) created`,
      afterValue: this.sanitize(saved),
    });

    this.eventBus.publish(EQUIPMENT_UPDATED_TOKEN, {
      equipmentId: saved.equipmentId,
      name: saved.name,
      area: saved.area,
      contractorId: saved.contractorId,
      status: saved.status,
      changedFields: ['created'],
      updatedBy: actor.userId,
      updatedAt: now,
    });

    return saved;
  }

  findById(equipmentId: EquipmentId): EquipmentRecord | null {
    return this.repository.findById(equipmentId);
  }

  list(query?: EquipmentListQuery): EquipmentListResult {
    return this.repository.list(query);
  }

  update(equipmentId: EquipmentId, request: UpdateEquipmentRequest, actor: ActorRef): EquipmentRecord {
    const existing = this.getOrThrow(equipmentId);
    const now = new Date().toISOString();
    const changedFields: string[] = [];

    let updated: EquipmentRecord = existing;

    if (request.name !== undefined && request.name !== existing.name) {
      changedFields.push('name');
      updated = { ...updated, name: request.name };
    }
    if (request.area !== undefined && request.area !== existing.area) {
      changedFields.push('area');
      updated = { ...updated, area: request.area };
    }
    if (request.contractorId !== undefined && request.contractorId !== existing.contractorId) {
      changedFields.push('contractorId');
      updated = { ...updated, contractorId: request.contractorId };
    }
    if (request.status !== undefined && request.status !== existing.status) {
      changedFields.push('status');
      updated = { ...updated, status: request.status as EquipmentStatus };
    }

    if (changedFields.length === 0) return existing;

    updated = Object.freeze({ ...updated, updatedAt: now, updatedBy: actor.userId });
    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.equipmentId, {
      description: `Equipment '${saved.name}' (${saved.equipmentId}) updated (${changedFields.join(', ')})`,
      beforeValue: this.sanitize(existing),
      afterValue: this.sanitize(saved),
    });

    this.eventBus.publish(EQUIPMENT_UPDATED_TOKEN, {
      equipmentId: saved.equipmentId,
      name: saved.name,
      area: saved.area,
      contractorId: saved.contractorId,
      status: saved.status,
      changedFields,
      updatedBy: actor.userId,
      updatedAt: now,
    });

    return saved;
  }

  private getOrThrow(equipmentId: EquipmentId): EquipmentRecord {
    const record = this.repository.findById(equipmentId);
    if (record === null) throw new EquipmentNotFoundError(equipmentId);
    return record;
  }

  private recordAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    entityId: EquipmentId,
    opts: {
      description?: string;
      beforeValue?: unknown;
      afterValue?: unknown;
    } = {},
  ): void {
    const auditActor: AuditActor = {
      userId: actor.userId,
      contractorId: actor.contractorId,
    };

    this.auditService.record({
      category: 'data',
      action,
      outcome,
      actor: auditActor,
      resource: {
        module: 'owner-center',
        entityType: 'Equipment',
        entityId,
      },
      clientType: 'system',
      ...(opts.description !== undefined ? { description: opts.description } : {}),
      ...(opts.beforeValue !== undefined ? { beforeValue: opts.beforeValue } : {}),
      ...(opts.afterValue !== undefined ? { afterValue: opts.afterValue } : {}),
      correlationId: createCorrelationId(`eq-op-${Date.now().toString(36)}`),
    });
  }

  private sanitize(record: EquipmentRecord): Record<string, unknown> {
    return {
      equipmentId: record.equipmentId,
      name: record.name,
      area: record.area,
      contractorId: record.contractorId,
      status: record.status,
    };
  }
}
