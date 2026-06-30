// platform/sdk/src/clients/reporting-client.ts
// SDK Reporting client interface.

import type {
  ReportRecord,
  ReportObjectType,
  ReportStatus,
  ReportId,
  ReportSettings,
  ExportFormat,
  CreateReportRequest,
  UpdateReportRequest,
  ReportListQuery,
  ReportListResult,
  ReportingSummary,
} from '@acc-reliability/services';

export type {
  ReportRecord,
  ReportObjectType,
  ReportStatus,
  ReportId,
  ReportSettings,
  ExportFormat,
  CreateReportRequest,
  UpdateReportRequest,
  ReportListQuery,
  ReportListResult,
  ReportingSummary,
};

/**
 * SDK Reporting client.
 *
 * Manages reporting configuration (definitions, categories, templates,
 * export profiles, schedule profiles).  Does not execute reports.
 */
export interface IReportingClient {
  create(request: CreateReportRequest): ReportRecord;
  findById(id: ReportId): ReportRecord | null;
  findByKey(objectType: ReportObjectType, reportKey: string): ReportRecord | null;
  list(query?: ReportListQuery): ReportListResult;
  update(id: ReportId, request: UpdateReportRequest): ReportRecord;
  enable(id: ReportId): ReportRecord;
  disable(id: ReportId, reason: string): ReportRecord;
  archive(id: ReportId, reason: string): ReportRecord;
  restore(id: ReportId): ReportRecord;
  getSummary(): ReportingSummary;
}
