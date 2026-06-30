// platform/sdk/src/impl/notification-management-client-impl.ts
// SDK bridge from INotificationManagementClient → INotificationManagementService.

import type {
  INotificationManagementService,
  NotificationRuleRecord,
  NotificationRuleId,
  NotificationObjectType,
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
  NotificationRuleListQuery,
  NotificationRuleListResult,
  NotificationManagementSummary,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { INotificationManagementClient } from '../clients/notification-management-client';

export class NotificationManagementClientImpl implements INotificationManagementClient {
  constructor(
    private readonly service: INotificationManagementService,
    private readonly context: SdkContext,
  ) {}

  create(request: CreateNotificationRuleRequest): NotificationRuleRecord {
    return this.service.create(request, this.actor());
  }

  findById(id: NotificationRuleId): NotificationRuleRecord | null {
    return this.service.findById(id);
  }

  findByKey(objectType: NotificationObjectType, ruleKey: string): NotificationRuleRecord | null {
    return this.service.findByKey(objectType, ruleKey);
  }

  list(query?: NotificationRuleListQuery): NotificationRuleListResult {
    return this.service.list(query);
  }

  update(id: NotificationRuleId, request: UpdateNotificationRuleRequest): NotificationRuleRecord {
    return this.service.update(id, request, this.actor());
  }

  enable(id: NotificationRuleId): NotificationRuleRecord {
    return this.service.enable(id, this.actor());
  }

  disable(id: NotificationRuleId, reason: string): NotificationRuleRecord {
    return this.service.disable(id, reason, this.actor());
  }

  archive(id: NotificationRuleId, reason: string): NotificationRuleRecord {
    return this.service.archive(id, reason, this.actor());
  }

  restore(id: NotificationRuleId): NotificationRuleRecord {
    return this.service.restore(id, this.actor());
  }

  getSummary(): NotificationManagementSummary {
    return this.service.getSummary();
  }

  private actor() {
    return {
      userId:       this.context.currentUser.userId,
      contractorId: this.context.currentUser.contractorId,
    };
  }
}
