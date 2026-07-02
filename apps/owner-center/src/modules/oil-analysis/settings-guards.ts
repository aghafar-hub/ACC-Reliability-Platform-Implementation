// apps/owner-center/src/modules/oil-analysis/settings-guards.ts
// Oil Analysis settings guards — read from oilAnalysisSettingsService only.

import { oilAnalysisSettingsService } from './settings.service';
import type { OilAnalysisParameterId } from './settings-types';
import { isApprovalWorkflowEnabled } from './approval-workflow';
import { OIL_TREND_PARAMETERS } from './trend.service';
import type { OilTrendParameterDef } from './trend.service';
import type { ModuleSubNavItem } from '../../types/module-registry-types';

export const SETTINGS_GUARD_COPY = {
  manualEntryDisabled: {
    en: 'Manual entry is disabled by module settings',
    ar: 'الإدخال اليدوي معطّل بإعدادات الوحدة',
  },
  pdfImportDisabled: {
    en: 'PDF import is disabled by module settings',
    ar: 'استيراد PDF معطّل بإعدادات الوحدة',
  },
  trendEngineDisabled: {
    en: 'Trend analysis is disabled by module settings',
    ar: 'تحليل الاتجاهات معطّل بإعدادات الوحدة',
  },
  approvalWorkflowDisabled: {
    en: 'Engineer approval workflow is disabled by module settings',
    ar: 'سير موافقة المهندس معطّل بإعدادات الوحدة',
  },
} as const;

export function isManualEntryEnabled(): boolean {
  return oilAnalysisSettingsService.getSettings().general.enableManualEntry;
}

export function isPdfImportEnabled(): boolean {
  return oilAnalysisSettingsService.getSettings().general.enablePdfImport;
}

export function isTrendEngineEnabled(): boolean {
  return oilAnalysisSettingsService.getSettings().general.enableTrendEngine;
}

export { isApprovalWorkflowEnabled } from './approval-workflow';

export function isCsvExportEnabled(): boolean {
  return oilAnalysisSettingsService.getSettings().general.enableCsvExport;
}

export function isJsonExportEnabled(): boolean {
  return oilAnalysisSettingsService.getSettings().general.enableJsonExport;
}

export function isLabParameterVisible(id: OilAnalysisParameterId): boolean {
  return oilAnalysisSettingsService.isParameterEnabled(id);
}

export function getEnabledTrendParameters(): readonly OilTrendParameterDef[] {
  const enabled = new Set(oilAnalysisSettingsService.getEnabledParameterIds());
  return OIL_TREND_PARAMETERS.filter((p) => enabled.has(p.id));
}

/** Hide PDF Import and Trends sub-nav when disabled in module settings. */
export function filterOilAnalysisSubNav(
  items: readonly ModuleSubNavItem[],
): readonly ModuleSubNavItem[] {
  return items.filter((item) => {
    if (item.path === '/oil-analysis/pdf-import') return isPdfImportEnabled();
    if (item.path === '/oil-analysis/trends') return isTrendEngineEnabled();
    if (item.path === '/oil-analysis/review') return isApprovalWorkflowEnabled();
    return true;
  });
}

export interface LabReportParamColumn {
  readonly id: OilAnalysisParameterId;
}

export const LAB_REPORT_PARAM_COLUMNS: readonly LabReportParamColumn[] = [
  { id: 'iron' },
  { id: 'copper' },
  { id: 'silicon' },
  { id: 'water' },
  { id: 'pqIndex' },
  { id: 'viscosity' },
  { id: 'tan' },
  { id: 'oxidation' },
  { id: 'particleCount' },
] as const;

export function getVisibleLabReportParamColumns(): readonly LabReportParamColumn[] {
  return LAB_REPORT_PARAM_COLUMNS.filter((col) => isLabParameterVisible(col.id));
}
