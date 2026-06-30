// platform/services/src/reporting/reporting-event-tokens.ts
// Typed EventToken constants for the Reporting domain.

import { EventToken } from '@acc-reliability/kernel';

import type {
  ReportCreatedPayload,
  ReportUpdatedPayload,
  ReportEnabledPayload,
  ReportDisabledPayload,
  ReportArchivedPayload,
  ReportRestoredPayload,
} from '../contracts/platform-events';

export const REPORT_CREATED_TOKEN =
  new EventToken<ReportCreatedPayload>('platform.reporting.report.created');

export const REPORT_UPDATED_TOKEN =
  new EventToken<ReportUpdatedPayload>('platform.reporting.report.updated');

export const REPORT_ENABLED_TOKEN =
  new EventToken<ReportEnabledPayload>('platform.reporting.report.enabled');

export const REPORT_DISABLED_TOKEN =
  new EventToken<ReportDisabledPayload>('platform.reporting.report.disabled');

export const REPORT_ARCHIVED_TOKEN =
  new EventToken<ReportArchivedPayload>('platform.reporting.report.archived');

export const REPORT_RESTORED_TOKEN =
  new EventToken<ReportRestoredPayload>('platform.reporting.report.restored');
