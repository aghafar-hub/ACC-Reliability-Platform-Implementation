// platform/services/src/reporting/reporting-service.ts
// ReportingService — the authoritative Reporting & Analytics domain service.
//
// Service id: platform.reporting

import type { IEventBus } from '@acc-reliability/kernel';

import type { IAuditService, AuditActor } from '../audit/audit-types';
import { createCorrelationId } from '../contracts/correlation';
import {
  ReportNotFoundError,
  ReportDuplicateError,
  ReportLifecycleError,
} from '../errors';

import { generateReportId } from './reporting-types';
import type {
  ReportRecord,
  ReportId,
  ReportStatus,
  ReportObjectType,
  ActorRef,
  CreateReportRequest,
  UpdateReportRequest,
  ReportListQuery,
  ReportListResult,
  ReportingSummary,
  IReportingRepository,
  IReportingService,
  ReportSettings,
  ExportFormat,
} from './reporting-types';

import {
  REPORT_CREATED_TOKEN,
  REPORT_UPDATED_TOKEN,
  REPORT_ENABLED_TOKEN,
  REPORT_DISABLED_TOKEN,
  REPORT_ARCHIVED_TOKEN,
  REPORT_RESTORED_TOKEN,
} from './reporting-event-tokens';

export class ReportingService implements IReportingService {
  constructor(
    private readonly repository: IReportingRepository,
    private readonly auditService: IAuditService,
    private readonly eventBus: IEventBus,
  ) {}

  create(request: CreateReportRequest, actor: ActorRef): ReportRecord {
    const existing = this.repository.findByKey(request.objectType, request.reportKey);
    if (existing !== null) {
      throw new ReportDuplicateError(request.objectType, request.reportKey);
    }

    const now = new Date().toISOString();
    const id  = request.id ?? generateReportId();
    const settings = freezeSettings(request.settings ?? {});

    const record: ReportRecord = Object.freeze({
      id,
      objectType: request.objectType,
      reportKey:  request.reportKey,
      name:       request.name,
      ...(request.description !== undefined ? { description: request.description } : {}),
      status:     'enabled' as ReportStatus,
      ...(request.category !== undefined ? { category: request.category } : {}),
      ...(request.exportFormats !== undefined
        ? { exportFormats: freezeFormats(request.exportFormats) }
        : {}),
      ...(request.scheduleEnabled !== undefined ? { scheduleEnabled: request.scheduleEnabled } : {}),
      ...(request.owner !== undefined ? { owner: request.owner } : {}),
      settings,
      createdAt:  now,
      createdBy:  actor.userId,
      updatedAt:  now,
      updatedBy:  actor.userId,
      enabledAt:  now,
      enabledBy:  actor.userId,
    });

    const saved = this.repository.save(record);

    this.recordAudit(actor, 'create', 'success', saved.id, saved.objectType, {
      description: `Report ${saved.objectType} '${saved.name}' (${saved.reportKey}) created`,
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(REPORT_CREATED_TOKEN, {
      id:         saved.id,
      objectType: saved.objectType,
      reportKey:  saved.reportKey,
      name:       saved.name,
      createdBy:  actor.userId,
      createdAt:  now,
    });

    return saved;
  }

  findById(id: ReportId): ReportRecord | null {
    return this.repository.findById(id);
  }

  findByKey(objectType: ReportObjectType, reportKey: string): ReportRecord | null {
    return this.repository.findByKey(objectType, reportKey);
  }

  list(query?: ReportListQuery): ReportListResult {
    return this.repository.list(query);
  }

  update(id: ReportId, request: UpdateReportRequest, actor: ActorRef): ReportRecord {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString();
    const changedFields: string[] = [];

    let updated: ReportRecord = existing;

    if (request.name !== undefined && request.name !== existing.name) {
      changedFields.push('name');
      updated = { ...updated, name: request.name };
    }
    if (request.description !== undefined && request.description !== existing.description) {
      changedFields.push('description');
      updated = { ...updated, description: request.description };
    }
    if (request.category !== undefined && request.category !== existing.category) {
      changedFields.push('category');
      updated = { ...updated, category: request.category };
    }
    if (request.exportFormats !== undefined) {
      changedFields.push('exportFormats');
      updated = { ...updated, exportFormats: freezeFormats(request.exportFormats) };
    }
    if (request.scheduleEnabled !== undefined && request.scheduleEnabled !== existing.scheduleEnabled) {
      changedFields.push('scheduleEnabled');
      updated = { ...updated, scheduleEnabled: request.scheduleEnabled };
    }
    if (request.owner !== undefined && request.owner !== existing.owner) {
      changedFields.push('owner');
      updated = { ...updated, owner: request.owner };
    }
    if (request.settings !== undefined) {
      changedFields.push('settings');
      updated = { ...updated, settings: freezeSettings(request.settings) };
    }

    if (changedFields.length === 0) {
      return existing;
    }

    updated = Object.freeze({ ...updated, updatedAt: now, updatedBy: actor.userId });
    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Report ${saved.objectType} '${saved.name}' (${saved.reportKey}) updated (${changedFields.join(', ')})`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(REPORT_UPDATED_TOKEN, {
      id:            saved.id,
      objectType:    saved.objectType,
      reportKey:     saved.reportKey,
      changedFields,
      updatedBy:     actor.userId,
      updatedAt:     now,
    });

    return saved;
  }

  enable(id: ReportId, actor: ActorRef): ReportRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'disabled') {
      throw new ReportLifecycleError(id, existing.status, 'enable');
    }

    const now = new Date().toISOString();
    const updated: ReportRecord = Object.freeze({
      ...existing,
      status:    'enabled' as ReportStatus,
      enabledAt: now,
      enabledBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Report ${saved.objectType} '${saved.name}' (${saved.reportKey}) enabled`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(REPORT_ENABLED_TOKEN, {
      id:        saved.id,
      objectType: saved.objectType,
      reportKey: saved.reportKey,
      enabledBy: actor.userId,
      enabledAt: now,
    });

    return saved;
  }

  disable(id: ReportId, reason: string, actor: ActorRef): ReportRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'archived') {
      throw new ReportLifecycleError(id, existing.status, 'disable');
    }
    if (existing.status === 'disabled') {
      throw new ReportLifecycleError(id, existing.status, 'disable');
    }

    const now = new Date().toISOString();
    const updated: ReportRecord = Object.freeze({
      ...existing,
      status:         'disabled' as ReportStatus,
      disabledAt:     now,
      disabledBy:     actor.userId,
      disabledReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Report ${saved.objectType} '${saved.name}' (${saved.reportKey}) disabled. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(REPORT_DISABLED_TOKEN, {
      id:         saved.id,
      objectType: saved.objectType,
      reportKey:  saved.reportKey,
      disabledBy: actor.userId,
      disabledAt: now,
      reason,
    });

    return saved;
  }

  archive(id: ReportId, reason: string, actor: ActorRef): ReportRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'archived') {
      throw new ReportLifecycleError(id, existing.status, 'archive');
    }

    const now = new Date().toISOString();
    const updated: ReportRecord = Object.freeze({
      ...existing,
      status:         'archived' as ReportStatus,
      archivedAt:     now,
      archivedBy:     actor.userId,
      archivedReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Report ${saved.objectType} '${saved.name}' (${saved.reportKey}) archived. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(REPORT_ARCHIVED_TOKEN, {
      id:         saved.id,
      objectType: saved.objectType,
      reportKey:  saved.reportKey,
      archivedBy: actor.userId,
      archivedAt: now,
      reason,
    });

    return saved;
  }

  restore(id: ReportId, actor: ActorRef): ReportRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'archived') {
      throw new ReportLifecycleError(id, existing.status, 'restore');
    }

    const now = new Date().toISOString();
    const updated: ReportRecord = Object.freeze({
      ...existing,
      status:     'enabled' as ReportStatus,
      restoredAt: now,
      restoredBy: actor.userId,
      enabledAt:  now,
      enabledBy:  actor.userId,
      updatedAt:  now,
      updatedBy:  actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Report ${saved.objectType} '${saved.name}' (${saved.reportKey}) restored to enabled`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(REPORT_RESTORED_TOKEN, {
      id:         saved.id,
      objectType: saved.objectType,
      reportKey:  saved.reportKey,
      restoredBy: actor.userId,
      restoredAt: now,
    });

    return saved;
  }

  getSummary(): ReportingSummary {
    let totalReports = 0;
    let enabled      = 0;
    let scheduled    = 0;
    let archived     = 0;

    const all = this.repository.list({ limit: 10_000 });
    for (const record of all.reports) {
      if (record.objectType !== 'definition') continue;

      if (record.status === 'archived') {
        archived += 1;
        continue;
      }

      totalReports += 1;

      if (record.status === 'enabled') {
        enabled += 1;
        if (record.scheduleEnabled === true) {
          scheduled += 1;
        }
      }
    }

    return Object.freeze({
      totalReports,
      enabled,
      scheduled,
      archived,
      capturedAt: new Date().toISOString(),
    });
  }

  private getOrThrow(id: ReportId): ReportRecord {
    const record = this.repository.findById(id);
    if (record === null) {
      throw new ReportNotFoundError(id);
    }
    return record;
  }

  private recordAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    entityId: ReportId,
    objectType: ReportObjectType,
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
        entityType: `Report:${objectType}`,
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
    return createCorrelationId(`rpt-op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  }

  private sanitize(record: ReportRecord): Record<string, unknown> {
    return {
      id:              record.id,
      objectType:      record.objectType,
      reportKey:       record.reportKey,
      name:            record.name,
      status:          record.status,
      category:        record.category,
      exportFormats:   record.exportFormats,
      scheduleEnabled: record.scheduleEnabled,
      owner:           record.owner,
    };
  }
}

function freezeSettings(settings: ReportSettings): ReportSettings {
  return Object.freeze({
    ...settings,
    ...(settings.allowedFormats !== undefined
      ? { allowedFormats: freezeFormats(settings.allowedFormats) }
      : {}),
    ...(settings.recipientRoles !== undefined
      ? { recipientRoles: Object.freeze([...settings.recipientRoles]) }
      : {}),
  });
}

function freezeFormats(formats: readonly ExportFormat[]): readonly ExportFormat[] {
  return Object.freeze([...formats]);
}
