// platform/services/src/lubrication-point/lubrication-point-service.ts
// LubricationPointService — platform LP Master domain service.
// Service id: platform.lubrication-points

import type { IEventBus } from '@acc-reliability/kernel';

import type { IAuditService, AuditActor } from '../audit/audit-types';
import { createCorrelationId } from '../contracts/correlation';
import {
  LubricationPointNotFoundError,
  LubricationPointDuplicateError,
} from '../errors';

import {
  generateLubricationPointRecordId,
} from './lubrication-point-types';
import type {
  LubricationPointRecord,
  LubricationPointRecordId,
  LpStatus,
  ActorRef,
  CreateLubricationPointRequest,
  UpdateLubricationPointRequest,
  LubricationPointListQuery,
  LubricationPointListResult,
  ILubricationPointRepository,
  ILubricationPointService,
} from './lubrication-point-types';

import {
  LP_UPDATED_TOKEN,
  LP_DEACTIVATED_TOKEN,
} from './lubrication-point-event-tokens';

export class LubricationPointService implements ILubricationPointService {
  constructor(
    private readonly repository: ILubricationPointRepository,
    private readonly auditService: IAuditService,
    private readonly eventBus: IEventBus,
  ) {}

  create(request: CreateLubricationPointRequest, actor: ActorRef): LubricationPointRecord {
    const existingLp = this.repository.findByLpId(request.lpId);
    if (existingLp !== null) {
      throw new LubricationPointDuplicateError(request.lpId);
    }

    const now = new Date().toISOString();
    const id = request.id ?? generateLubricationPointRecordId();

    const record: LubricationPointRecord = Object.freeze({
      id,
      lpId: request.lpId.trim(),
      equipmentId: request.equipmentId,
      lubricant: request.lubricant,
      frequencyDays: request.frequencyDays,
      oaRequired: request.oaRequired ?? false,
      samplingIntervalDays: request.samplingIntervalDays ?? null,
      status: request.status ?? 'active',
      area: request.area,
      contractorId: request.contractorId,
      name: request.name,
      lastChangeDate: request.lastChangeDate ?? null,
      nextDueDate: request.nextDueDate ?? null,
      createdAt: now,
      createdBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.save(record);

    this.recordAudit(actor, 'create', 'success', saved.id, {
      description: `LP '${saved.lpId}' (${saved.name}) created`,
      afterValue: this.sanitize(saved),
    });

    this.eventBus.publish(LP_UPDATED_TOKEN, {
      id: saved.id,
      lpId: saved.lpId,
      equipmentId: saved.equipmentId,
      changedFields: ['created'],
      updatedBy: actor.userId,
      updatedAt: now,
    });

    return saved;
  }

  findById(id: LubricationPointRecordId): LubricationPointRecord | null {
    return this.repository.findById(id);
  }

  findByLpId(lpId: string): LubricationPointRecord | null {
    return this.repository.findByLpId(lpId);
  }

  list(query?: LubricationPointListQuery): LubricationPointListResult {
    return this.repository.list(query);
  }

  update(id: LubricationPointRecordId, request: UpdateLubricationPointRequest, actor: ActorRef): LubricationPointRecord {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString();
    const changedFields: string[] = [];

    let updated: LubricationPointRecord = existing;

    const fields: Array<keyof UpdateLubricationPointRequest> = [
      'lubricant', 'frequencyDays', 'oaRequired', 'samplingIntervalDays',
      'area', 'contractorId', 'name', 'lastChangeDate', 'nextDueDate', 'status',
    ];

    for (const field of fields) {
      const value = request[field];
      if (value !== undefined && value !== existing[field]) {
        changedFields.push(field);
        updated = { ...updated, [field]: value };
      }
    }

    if (changedFields.length === 0) return existing;

    updated = Object.freeze({ ...updated, updatedAt: now, updatedBy: actor.userId });
    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `LP '${saved.lpId}' updated (${changedFields.join(', ')})`,
      beforeValue: this.sanitize(existing),
      afterValue: this.sanitize(saved),
    });

    this.eventBus.publish(LP_UPDATED_TOKEN, {
      id: saved.id,
      lpId: saved.lpId,
      equipmentId: saved.equipmentId,
      changedFields,
      updatedBy: actor.userId,
      updatedAt: now,
    });

    return saved;
  }

  deactivate(id: LubricationPointRecordId, actor: ActorRef): LubricationPointRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'inactive') return existing;

    const now = new Date().toISOString();
    const updated: LubricationPointRecord = Object.freeze({
      ...existing,
      status: 'inactive' as LpStatus,
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, {
      description: `LP '${saved.lpId}' deactivated`,
      beforeValue: this.sanitize(existing),
      afterValue: this.sanitize(saved),
    });

    this.eventBus.publish(LP_DEACTIVATED_TOKEN, {
      id: saved.id,
      lpId: saved.lpId,
      equipmentId: saved.equipmentId,
      deactivatedBy: actor.userId,
      deactivatedAt: now,
    });

    return saved;
  }

  private getOrThrow(id: LubricationPointRecordId): LubricationPointRecord {
    const record = this.repository.findById(id);
    if (record === null) throw new LubricationPointNotFoundError(id);
    return record;
  }

  private recordAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    entityId: LubricationPointRecordId,
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
        entityType: 'LubricationPoint',
        entityId,
      },
      clientType: 'system',
      ...(opts.description !== undefined ? { description: opts.description } : {}),
      ...(opts.beforeValue !== undefined ? { beforeValue: opts.beforeValue } : {}),
      ...(opts.afterValue !== undefined ? { afterValue: opts.afterValue } : {}),
      correlationId: createCorrelationId(`lp-op-${Date.now().toString(36)}`),
    });
  }

  private sanitize(record: LubricationPointRecord): Record<string, unknown> {
    return {
      id: record.id,
      lpId: record.lpId,
      equipmentId: record.equipmentId,
      name: record.name,
      status: record.status,
      oaRequired: record.oaRequired,
    };
  }
}
