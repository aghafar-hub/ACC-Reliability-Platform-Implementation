// platform/sdk/src/impl/reporting-client-impl.ts
// SDK bridge from IReportingClient → IReportingService.

import type {
  IReportingService,
  ReportRecord,
  ReportId,
  ReportObjectType,
  CreateReportRequest,
  UpdateReportRequest,
  ReportListQuery,
  ReportListResult,
  ReportingSummary,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { IReportingClient } from '../clients/reporting-client';

export class ReportingClientImpl implements IReportingClient {
  constructor(
    private readonly service: IReportingService,
    private readonly context: SdkContext,
  ) {}

  create(request: CreateReportRequest): ReportRecord {
    return this.service.create(request, this.actor());
  }

  findById(id: ReportId): ReportRecord | null {
    return this.service.findById(id);
  }

  findByKey(objectType: ReportObjectType, reportKey: string): ReportRecord | null {
    return this.service.findByKey(objectType, reportKey);
  }

  list(query?: ReportListQuery): ReportListResult {
    return this.service.list(query);
  }

  update(id: ReportId, request: UpdateReportRequest): ReportRecord {
    return this.service.update(id, request, this.actor());
  }

  enable(id: ReportId): ReportRecord {
    return this.service.enable(id, this.actor());
  }

  disable(id: ReportId, reason: string): ReportRecord {
    return this.service.disable(id, reason, this.actor());
  }

  archive(id: ReportId, reason: string): ReportRecord {
    return this.service.archive(id, reason, this.actor());
  }

  restore(id: ReportId): ReportRecord {
    return this.service.restore(id, this.actor());
  }

  getSummary(): ReportingSummary {
    return this.service.getSummary();
  }

  private actor() {
    return {
      userId:       this.context.currentUser.userId,
      contractorId: this.context.currentUser.contractorId,
    };
  }
}
