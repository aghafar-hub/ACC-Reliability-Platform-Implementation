// platform/services/src/notification-management/notification-management-service.ts
// NotificationManagementService — the authoritative Notification Management domain service.
//
// Service id: platform.notification-management

import type { IEventBus } from '@acc-reliability/kernel';

import type { IAuditService, AuditActor } from '../audit/audit-types';
import { createCorrelationId } from '../contracts/correlation';
import {
  NotificationRuleNotFoundError,
  NotificationRuleDuplicateError,
  NotificationRuleLifecycleError,
} from '../errors';

import { generateNotificationRuleId } from './notification-management-types';
import type {
  NotificationRuleRecord,
  NotificationRuleId,
  NotificationRuleStatus,
  NotificationObjectType,
  ActorRef,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
  NotificationRuleListQuery,
  NotificationRuleListResult,
  NotificationManagementSummary,
  INotificationManagementRepository,
  INotificationManagementService,
  NotificationRuleSettings,
} from './notification-management-types';

import {
  NOTIFICATION_RULE_CREATED_TOKEN,
  NOTIFICATION_RULE_UPDATED_TOKEN,
  NOTIFICATION_RULE_ENABLED_TOKEN,
  NOTIFICATION_RULE_DISABLED_TOKEN,
  NOTIFICATION_RULE_ARCHIVED_TOKEN,
  NOTIFICATION_RULE_RESTORED_TOKEN,
} from './notification-management-event-tokens';

export class NotificationManagementService implements INotificationManagementService {
  constructor(
    private readonly repository: INotificationManagementRepository,
    private readonly auditService: IAuditService,
    private readonly eventBus: IEventBus,
  ) {}

  create(request: CreateNotificationRuleRequest, actor: ActorRef): NotificationRuleRecord {
    const existing = this.repository.findByKey(request.objectType, request.ruleKey);
    if (existing !== null) {
      throw new NotificationRuleDuplicateError(request.objectType, request.ruleKey);
    }

    const now = new Date().toISOString();
    const id  = request.id ?? generateNotificationRuleId();
    const settings = freezeSettings(request.settings ?? {});

    const record: NotificationRuleRecord = Object.freeze({
      id,
      objectType:  request.objectType,
      ruleKey:     request.ruleKey,
      name:        request.name,
      ...(request.description !== undefined ? { description: request.description } : {}),
      status:      'enabled' as NotificationRuleStatus,
      settings,
      createdAt:   now,
      createdBy:   actor.userId,
      updatedAt:   now,
      updatedBy:   actor.userId,
      enabledAt:   now,
      enabledBy:   actor.userId,
    });

    const saved = this.repository.save(record);

    this.recordAudit(actor, 'create', 'success', saved.id, saved.objectType, {
      description: `Notification ${saved.objectType} '${saved.name}' (${saved.ruleKey}) created`,
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(NOTIFICATION_RULE_CREATED_TOKEN, {
      id:         saved.id,
      objectType: saved.objectType,
      ruleKey:    saved.ruleKey,
      name:       saved.name,
      createdBy:  actor.userId,
      createdAt:  now,
    });

    return saved;
  }

  findById(id: NotificationRuleId): NotificationRuleRecord | null {
    return this.repository.findById(id);
  }

  findByKey(objectType: NotificationObjectType, ruleKey: string): NotificationRuleRecord | null {
    return this.repository.findByKey(objectType, ruleKey);
  }

  list(query?: NotificationRuleListQuery): NotificationRuleListResult {
    return this.repository.list(query);
  }

  update(id: NotificationRuleId, request: UpdateNotificationRuleRequest, actor: ActorRef): NotificationRuleRecord {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString();
    const changedFields: string[] = [];

    let updated: NotificationRuleRecord = existing;

    if (request.name !== undefined && request.name !== existing.name) {
      changedFields.push('name');
      updated = { ...updated, name: request.name };
    }
    if (request.description !== undefined && request.description !== existing.description) {
      changedFields.push('description');
      updated = { ...updated, description: request.description };
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
      description: `Notification ${saved.objectType} '${saved.name}' (${saved.ruleKey}) updated (${changedFields.join(', ')})`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(NOTIFICATION_RULE_UPDATED_TOKEN, {
      id:            saved.id,
      objectType:    saved.objectType,
      ruleKey:       saved.ruleKey,
      changedFields,
      updatedBy:     actor.userId,
      updatedAt:     now,
    });

    return saved;
  }

  enable(id: NotificationRuleId, actor: ActorRef): NotificationRuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'disabled') {
      throw new NotificationRuleLifecycleError(id, existing.status, 'enable');
    }

    const now = new Date().toISOString();
    const updated: NotificationRuleRecord = Object.freeze({
      ...existing,
      status:    'enabled' as NotificationRuleStatus,
      enabledAt: now,
      enabledBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Notification ${saved.objectType} '${saved.name}' (${saved.ruleKey}) enabled`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(NOTIFICATION_RULE_ENABLED_TOKEN, {
      id:        saved.id,
      objectType: saved.objectType,
      ruleKey:   saved.ruleKey,
      enabledBy: actor.userId,
      enabledAt: now,
    });

    return saved;
  }

  disable(id: NotificationRuleId, reason: string, actor: ActorRef): NotificationRuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'archived') {
      throw new NotificationRuleLifecycleError(id, existing.status, 'disable');
    }
    if (existing.status === 'disabled') {
      throw new NotificationRuleLifecycleError(id, existing.status, 'disable');
    }

    const now = new Date().toISOString();
    const updated: NotificationRuleRecord = Object.freeze({
      ...existing,
      status:         'disabled' as NotificationRuleStatus,
      disabledAt:     now,
      disabledBy:     actor.userId,
      disabledReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Notification ${saved.objectType} '${saved.name}' (${saved.ruleKey}) disabled. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(NOTIFICATION_RULE_DISABLED_TOKEN, {
      id:         saved.id,
      objectType: saved.objectType,
      ruleKey:    saved.ruleKey,
      disabledBy: actor.userId,
      disabledAt: now,
      reason,
    });

    return saved;
  }

  archive(id: NotificationRuleId, reason: string, actor: ActorRef): NotificationRuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status === 'archived') {
      throw new NotificationRuleLifecycleError(id, existing.status, 'archive');
    }

    const now = new Date().toISOString();
    const updated: NotificationRuleRecord = Object.freeze({
      ...existing,
      status:         'archived' as NotificationRuleStatus,
      archivedAt:     now,
      archivedBy:     actor.userId,
      archivedReason: reason,
      updatedAt:      now,
      updatedBy:      actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Notification ${saved.objectType} '${saved.name}' (${saved.ruleKey}) archived. Reason: ${reason}`,
      severity:    'high',
      reason,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(NOTIFICATION_RULE_ARCHIVED_TOKEN, {
      id:         saved.id,
      objectType: saved.objectType,
      ruleKey:    saved.ruleKey,
      archivedBy: actor.userId,
      archivedAt: now,
      reason,
    });

    return saved;
  }

  restore(id: NotificationRuleId, actor: ActorRef): NotificationRuleRecord {
    const existing = this.getOrThrow(id);
    if (existing.status !== 'archived') {
      throw new NotificationRuleLifecycleError(id, existing.status, 'restore');
    }

    const now = new Date().toISOString();
    const updated: NotificationRuleRecord = Object.freeze({
      ...existing,
      status:     'enabled' as NotificationRuleStatus,
      restoredAt: now,
      restoredBy: actor.userId,
      enabledAt:  now,
      enabledBy:  actor.userId,
      updatedAt:  now,
      updatedBy:  actor.userId,
    });

    const saved = this.repository.update(updated);

    this.recordAudit(actor, 'update', 'success', saved.id, saved.objectType, {
      description: `Notification ${saved.objectType} '${saved.name}' (${saved.ruleKey}) restored to enabled`,
      beforeValue: this.sanitize(existing),
      afterValue:  this.sanitize(saved),
    });

    this.eventBus.publish(NOTIFICATION_RULE_RESTORED_TOKEN, {
      id:         saved.id,
      objectType: saved.objectType,
      ruleKey:    saved.ruleKey,
      restoredBy: actor.userId,
      restoredAt: now,
    });

    return saved;
  }

  getSummary(): NotificationManagementSummary {
    let activeRules = 0;
    let templates   = 0;
    let channels    = 0;
    let escalations = 0;

    const all = this.repository.list({ limit: 10_000 });
    for (const record of all.rules) {
      if (record.status === 'archived') continue;

      switch (record.objectType) {
        case 'rule':
          if (record.status === 'enabled') activeRules += 1;
          break;
        case 'template':
          templates += 1;
          break;
        case 'channel':
          channels += 1;
          break;
        case 'escalation':
          escalations += 1;
          break;
        default:
          break;
      }
    }

    return Object.freeze({
      activeRules,
      templates,
      channels,
      escalations,
      capturedAt: new Date().toISOString(),
    });
  }

  private getOrThrow(id: NotificationRuleId): NotificationRuleRecord {
    const record = this.repository.findById(id);
    if (record === null) {
      throw new NotificationRuleNotFoundError(id);
    }
    return record;
  }

  private recordAudit(
    actor: ActorRef,
    action: string,
    outcome: 'success' | 'failure' | 'denied',
    entityId: NotificationRuleId,
    objectType: NotificationObjectType,
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
        entityType: `NotificationRule:${objectType}`,
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
    return createCorrelationId(`nfm-op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  }

  private sanitize(record: NotificationRuleRecord): Record<string, unknown> {
    return {
      id:         record.id,
      objectType: record.objectType,
      ruleKey:    record.ruleKey,
      name:       record.name,
      status:     record.status,
    };
  }
}

function freezeSettings(settings: NotificationRuleSettings): NotificationRuleSettings {
  return Object.freeze({
    ...settings,
    ...(settings.escalateToRoles !== undefined
      ? { escalateToRoles: Object.freeze([...settings.escalateToRoles]) }
      : {}),
    ...(settings.channelKeys !== undefined
      ? { channelKeys: Object.freeze([...settings.channelKeys]) }
      : {}),
    ...(settings.recipientRoles !== undefined
      ? { recipientRoles: Object.freeze([...settings.recipientRoles]) }
      : {}),
  });
}
